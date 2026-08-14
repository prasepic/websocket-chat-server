import type { Server as HttpServer } from 'http';
import { loadChatConfig } from './config';
import { ChatHub } from './hub';
import type { ChatConfig } from './types';

export type {
  ChatClientFrame,
  ChatConfig,
  ChatMessage,
  ChatServerFrame,
  ListChatMessagesOptions,
  PublishChatMessageInput,
} from './types';

export { loadChatConfig } from './config';
export { ChatHistoryStore } from './history-store';
export { ChatHub } from './hub';

let hubSingleton: ChatHub | null = null;

/**
 * Lazily create the in-process chat hub (history + WebSocket fan-out).
 */
export function getChatHub(config: ChatConfig = loadChatConfig()): ChatHub {
  if (!hubSingleton) {
    hubSingleton = new ChatHub(config);
  }
  return hubSingleton;
}

/**
 * Mount the WebSocket server on the given HTTP server.
 */
export function attachChatWebSocket(
  server: HttpServer,
  config: ChatConfig = loadChatConfig(),
): ChatHub {
  const hub = getChatHub(config);
  hub.attach(server);
  return hub;
}

export async function closeChatHub(): Promise<void> {
  if (hubSingleton) {
    await hubSingleton.close();
    hubSingleton = null;
  }
}
