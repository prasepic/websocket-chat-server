/**
 * Chat domain types — transport-agnostic message shape plus
 * WebSocket protocol envelopes used by the hub.
 */

export interface ChatMessage {
  id: string;
  room: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface PublishChatMessageInput {
  room: string;
  username: string;
  text: string;
}

export interface ListChatMessagesOptions {
  room: string;
  /** Only messages strictly after this ISO timestamp. */
  since?: string;
  limit?: number;
}

export interface ChatConfig {
  /** Default IRC-style room name. */
  defaultRoom: string;
  /** Max messages retained in the in-process history window. */
  historyLimit: number;
  /** WebSocket path mounted on the HTTP server. */
  wsPath: string;
  /** Public application URL, used to build websocket links in production. */
  publicUrl: string;
}

/** Client → server frames */
export type ChatClientFrame =
  | { type: 'join'; username: string; room?: string }
  | { type: 'message'; text: string; room?: string }
  | { type: 'ping' };

/** Server → client frames */
export type ChatServerFrame =
  | {
      type: 'welcome';
      room: string;
      username: string;
      messages: ChatMessage[];
    }
  | { type: 'message'; message: ChatMessage }
  | { type: 'system'; room: string; text: string; createdAt: string }
  | { type: 'error'; error: string }
  | { type: 'pong' };
