import type { ChatConfig } from './types';

export function loadChatConfig(
  env: NodeJS.ProcessEnv = process.env,
): ChatConfig {
  const publicUrl = (env.APP_URL || env.RENDER_EXTERNAL_URL || env.PUBLIC_URL || 'http://localhost:4001').replace(/\/+$/, '');

  return {
    defaultRoom: env.CHAT_DEFAULT_ROOM || 'common',
    historyLimit: Math.max(50, Number(env.CHAT_HISTORY_LIMIT) || 200),
    wsPath: env.CHAT_WS_PATH || '/ws/chat',
    publicUrl,
  };
}
