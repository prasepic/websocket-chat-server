"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHub = exports.ChatHistoryStore = exports.loadChatConfig = void 0;
exports.getChatHub = getChatHub;
exports.attachChatWebSocket = attachChatWebSocket;
exports.closeChatHub = closeChatHub;
const config_1 = require("./config");
const hub_1 = require("./hub");
var config_2 = require("./config");
Object.defineProperty(exports, "loadChatConfig", { enumerable: true, get: function () { return config_2.loadChatConfig; } });
var history_store_1 = require("./history-store");
Object.defineProperty(exports, "ChatHistoryStore", { enumerable: true, get: function () { return history_store_1.ChatHistoryStore; } });
var hub_2 = require("./hub");
Object.defineProperty(exports, "ChatHub", { enumerable: true, get: function () { return hub_2.ChatHub; } });
let hubSingleton = null;
/**
 * Lazily create the in-process chat hub (history + WebSocket fan-out).
 */
function getChatHub(config = (0, config_1.loadChatConfig)()) {
    if (!hubSingleton) {
        hubSingleton = new hub_1.ChatHub(config);
    }
    return hubSingleton;
}
/**
 * Mount the WebSocket server on the given HTTP server.
 */
function attachChatWebSocket(server, config = (0, config_1.loadChatConfig)()) {
    const hub = getChatHub(config);
    hub.attach(server);
    return hub;
}
async function closeChatHub() {
    if (hubSingleton) {
        await hubSingleton.close();
        hubSingleton = null;
    }
}
