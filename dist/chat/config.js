"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadChatConfig = loadChatConfig;
function loadChatConfig(env = process.env) {
    return {
        defaultRoom: env.CHAT_DEFAULT_ROOM || 'common',
        historyLimit: Math.max(50, Number(env.CHAT_HISTORY_LIMIT) || 200),
        wsPath: env.CHAT_WS_PATH || '/ws/chat',
    };
}
