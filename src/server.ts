import http from 'http';
import { URL } from 'url';
import { attachChatWebSocket, closeChatHub, getChatHub, loadChatConfig } from './chat';

const PORT = Number(process.env.PORT) || 4001;
const config = loadChatConfig();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        status: 'chat server running',
        room: config.defaultRoom,
        wsPath: config.wsPath,
      }),
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/chat/room') {
    const hub = getChatHub(config);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        room: hub.getDefaultRoom(),
        wsPath: hub.getWsPath(),
        description: 'IRC-style common room over WebSockets',
      }),
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/chat/messages') {
    const room = (url.searchParams.get('room') || config.defaultRoom).trim();
    const since = url.searchParams.get('since') || undefined;
    const limitRaw = url.searchParams.get('limit');
    const limit = limitRaw !== null ? Number(limitRaw) : undefined;
    const hub = getChatHub(config);

    try {
      const messages = hub.list({ room, since: since ?? undefined, limit });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ room, messages }));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list messages';
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
      return;
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/messages') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}') as {
          username?: string;
          text?: string;
          room?: string;
        };
        const hub = getChatHub(config);
        const message = hub.publish({
          room: payload.room || config.defaultRoom,
          username: payload.username || '',
          text: payload.text || '',
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(message));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send message';
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route not found' }));
});

async function bootstrap() {
  attachChatWebSocket(server, config);

  server.listen(PORT, () => {
    console.log(`Chat server listening on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}${config.wsPath}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down`);
    server.close();
    await closeChatHub();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void bootstrap();
