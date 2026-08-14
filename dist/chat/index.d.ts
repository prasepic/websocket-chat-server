import type { Server as HttpServer } from 'http';
import { ChatHub } from './hub';
import type { ChatConfig } from './types';
export type { ChatClientFrame, ChatConfig, ChatMessage, ChatServerFrame, ListChatMessagesOptions, PublishChatMessageInput, } from './types';
export { loadChatConfig } from './config';
export { ChatHistoryStore } from './history-store';
export { ChatHub } from './hub';
/**
 * Lazily create the in-process chat hub (history + WebSocket fan-out).
 */
export declare function getChatHub(config?: ChatConfig): ChatHub;
/**
 * Mount the WebSocket server on the given HTTP server.
 */
export declare function attachChatWebSocket(server: HttpServer, config?: ChatConfig): ChatHub;
export declare function closeChatHub(): Promise<void>;
