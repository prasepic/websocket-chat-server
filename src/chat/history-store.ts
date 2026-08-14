import type { ChatMessage, ListChatMessagesOptions } from './types';

/**
 * Bounded in-process history window fed by the chat hub.
 */
export class ChatHistoryStore {
  private readonly messages: ChatMessage[] = [];

  constructor(private readonly limit: number) {}

  append(message: ChatMessage): void {
    this.messages.push(message);
    if (this.messages.length > this.limit) {
      this.messages.splice(0, this.messages.length - this.limit);
    }
  }

  list(options: ListChatMessagesOptions): ChatMessage[] {
    const limit = Math.min(
      Math.max(1, options.limit ?? 100),
      this.limit,
    );

    let filtered = this.messages.filter(
      (message) => message.room === options.room,
    );

    if (options.since) {
      const sinceMs = Date.parse(options.since);
      if (!Number.isNaN(sinceMs)) {
        filtered = filtered.filter(
          (message) => Date.parse(message.createdAt) > sinceMs,
        );
      }
    }

    if (filtered.length > limit) {
      return filtered.slice(filtered.length - limit);
    }

    return filtered;
  }

  clear(): void {
    this.messages.length = 0;
  }
}
