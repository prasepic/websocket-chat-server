import type { Server as HttpServer } from 'http';
import type { ChatConfig, ChatMessage, ListChatMessagesOptions, PublishChatMessageInput } from './types';
/**
 * In-process chat hub: history + WebSocket fan-out per room.
 */
export declare class ChatHub {
    private readonly config;
    private readonly history;
    private wss;
    private readonly sockets;
    private started;
    constructor(config: ChatConfig);
    get isStarted(): boolean;
    getDefaultRoom(): string;
    getWsPath(): string;
    /**
     * Attach a WebSocket server to an existing HTTP server.
     * Safe to call once during process bootstrap.
     */
    attach(server: HttpServer): void;
    list(options: ListChatMessagesOptions): ChatMessage[];
    publish(input: PublishChatMessageInput): ChatMessage;
    close(): Promise<void>;
    private onConnection;
    private onMessage;
    private handleJoin;
    private handleClientMessage;
    private onDisconnect;
    private broadcastSystem;
    private broadcast;
    private send;
}
