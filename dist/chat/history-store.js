"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHistoryStore = void 0;
/**
 * Bounded in-process history window fed by the chat hub.
 */
class ChatHistoryStore {
    constructor(limit) {
        this.limit = limit;
        this.messages = [];
    }
    append(message) {
        this.messages.push(message);
        if (this.messages.length > this.limit) {
            this.messages.splice(0, this.messages.length - this.limit);
        }
    }
    list(options) {
        const limit = Math.min(Math.max(1, options.limit ?? 100), this.limit);
        let filtered = this.messages.filter((message) => message.room === options.room);
        if (options.since) {
            const sinceMs = Date.parse(options.since);
            if (!Number.isNaN(sinceMs)) {
                filtered = filtered.filter((message) => Date.parse(message.createdAt) > sinceMs);
            }
        }
        if (filtered.length > limit) {
            return filtered.slice(filtered.length - limit);
        }
        return filtered;
    }
    clear() {
        this.messages.length = 0;
    }
}
exports.ChatHistoryStore = ChatHistoryStore;
