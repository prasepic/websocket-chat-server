import { randomUUID } from 'crypto';
import type { IncomingMessage, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { ChatHistoryStore } from './history-store';
import type {
  ChatClientFrame,
  ChatConfig,
  ChatMessage,
  ChatServerFrame,
  ListChatMessagesOptions,
  PublishChatMessageInput,
} from './types';

interface SocketState {
  username: string | null;
  room: string | null;
}

/**
 * In-process chat hub: history + WebSocket fan-out per room.
 */
export class ChatHub {
  private readonly history: ChatHistoryStore;
  private wss: WebSocketServer | null = null;
  private readonly sockets = new Map<WebSocket, SocketState>();
  private started = false;

  constructor(private readonly config: ChatConfig) {
    this.history = new ChatHistoryStore(config.historyLimit);
  }

  get isStarted(): boolean {
    return this.started;
  }

  getDefaultRoom(): string {
    return this.config.defaultRoom;
  }

  getWsPath(): string {
    return this.config.wsPath;
  }

  /**
   * Attach a WebSocket server to an existing HTTP server.
   * Safe to call once during process bootstrap.
   */
  attach(server: HttpServer): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server, path: this.config.wsPath });
    this.wss.on('connection', (socket, request) => {
      this.onConnection(socket, request);
    });
    this.wss.on('error', (error) => {
      console.error('[chat] WebSocket server error:', error);
    });

    this.started = true;
    console.log(
      `[chat] WebSocket hub ready at path ${this.config.wsPath} (default room=${this.config.defaultRoom})`,
    );
  }

  list(options: ListChatMessagesOptions): ChatMessage[] {
    return this.history.list(options);
  }

  publish(input: PublishChatMessageInput): ChatMessage {
    const message: ChatMessage = {
      id: randomUUID(),
      room: input.room,
      username: input.username,
      text: input.text,
      createdAt: new Date().toISOString(),
    };

    this.history.append(message);
    this.broadcast(input.room, { type: 'message', message });
    return message;
  }

  async close(): Promise<void> {
    for (const socket of this.sockets.keys()) {
      try {
        socket.close(1001, 'server shutting down');
      } catch {
        /* ignore */
      }
    }
    this.sockets.clear();

    await new Promise<void>((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => resolve());
    });

    this.wss = null;
    this.started = false;
    this.history.clear();
  }

  private onConnection(socket: WebSocket, _request: IncomingMessage): void {
    this.sockets.set(socket, { username: null, room: null });

    socket.on('message', (data) => {
      this.onMessage(socket, data);
    });

    socket.on('close', () => {
      this.onDisconnect(socket);
    });

    socket.on('error', (error) => {
      console.error('[chat] socket error:', error.message);
    });
  }

  private onMessage(socket: WebSocket, data: RawData): void {
    let frame: ChatClientFrame;

    try {
      frame = JSON.parse(rawDataToString(data)) as ChatClientFrame;
    } catch {
      this.send(socket, { type: 'error', error: 'Invalid JSON frame' });
      return;
    }

    if (!frame || typeof frame !== 'object' || !('type' in frame)) {
      this.send(socket, { type: 'error', error: 'Invalid frame shape' });
      return;
    }

    try {
      switch (frame.type) {
        case 'ping':
          this.send(socket, { type: 'pong' });
          return;
        case 'join':
          this.handleJoin(socket, frame.username, frame.room);
          return;
        case 'message':
          this.handleClientMessage(socket, frame.text, frame.room);
          return;
        default:
          this.send(socket, { type: 'error', error: 'Unknown frame type' });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to handle frame';
      this.send(socket, { type: 'error', error: message });
    }
  }

  private handleJoin(
    socket: WebSocket,
    rawUsername: string,
    rawRoom?: string,
  ): void {
    const username = normalizeUsername(rawUsername);
    if (!username) {
      throw new Error('username is required');
    }

    const room = normalizeRoom(rawRoom, this.config.defaultRoom);
    const state = this.sockets.get(socket);
    if (!state) return;

    const previousRoom = state.room;
    const previousUser = state.username;

    if (previousRoom && previousUser && previousRoom !== room) {
      this.broadcastSystem(
        previousRoom,
        `${previousUser} left #${previousRoom}`,
        socket,
      );
    }

    state.username = username;
    state.room = room;

    const messages = this.history.list({
      room,
      limit: this.config.historyLimit,
    });

    this.send(socket, {
      type: 'welcome',
      room,
      username,
      messages,
    });

    this.broadcastSystem(room, `${username} joined #${room}`, socket);
  }

  private handleClientMessage(
    socket: WebSocket,
    rawText: string,
    rawRoom?: string,
  ): void {
    const state = this.sockets.get(socket);
    if (!state?.username || !state.room) {
      throw new Error('Join a room before sending messages');
    }

    const text = normalizeText(rawText);
    if (!text) {
      throw new Error('text is required');
    }

    const room = rawRoom
      ? normalizeRoom(rawRoom, this.config.defaultRoom)
      : state.room;

    if (room !== state.room) {
      throw new Error('Switch rooms with a join frame first');
    }

    this.publish({
      room,
      username: state.username,
      text,
    });
  }

  private onDisconnect(socket: WebSocket): void {
    const state = this.sockets.get(socket);
    this.sockets.delete(socket);

    if (state?.username && state.room) {
      this.broadcastSystem(
        state.room,
        `${state.username} left #${state.room}`,
      );
    }
  }

  private broadcastSystem(
    room: string,
    text: string,
    except?: WebSocket,
  ): void {
    const frame: ChatServerFrame = {
      type: 'system',
      room,
      text,
      createdAt: new Date().toISOString(),
    };
    this.broadcast(room, frame, except);
  }

  private broadcast(
    room: string,
    frame: ChatServerFrame,
    except?: WebSocket,
  ): void {
    const payload = JSON.stringify(frame);
    for (const [socket, state] of this.sockets) {
      if (except && socket === except) continue;
      if (state.room !== room) continue;
      if (socket.readyState !== WebSocket.OPEN) continue;
      socket.send(payload);
    }
  }

  private send(socket: WebSocket, frame: ChatServerFrame): void {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(frame));
  }
}

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
}

function normalizeUsername(username: string): string {
  return String(username || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 32);
}

function normalizeText(text: string): string {
  return String(text || '')
    .trim()
    .slice(0, 1000);
}

function normalizeRoom(room: string | undefined, fallback: string): string {
  const value = (room || fallback).trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(value)) {
    throw new Error(
      'room must be 1–32 chars: lowercase letters, numbers, _ or -',
    );
  }
  return value;
}
