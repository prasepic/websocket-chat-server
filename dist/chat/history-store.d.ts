import type { ChatMessage, ListChatMessagesOptions } from './types';
/**
 * Bounded in-process history window fed by the chat hub.
 */
export declare class ChatHistoryStore {
    private readonly limit;
    private readonly messages;
    constructor(limit: number);
    append(message: ChatMessage): void;
    list(options: ListChatMessagesOptions): ChatMessage[];
    clear(): void;
}
