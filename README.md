# Chat Server

A standalone Node.js chat server built around the same in-memory WebSocket hub logic used by the main app.

## Features

- WebSocket chat rooms on `/ws/chat`
- In-memory message history with room filtering
- HTTP endpoints for health checks and history bootstrap
- No Express dependency required

## Local development

```bash
npm install
npm run dev
```

The server listens on:

- HTTP: `http://localhost:4001`
- WebSocket: `ws://localhost:4001/ws/chat`

## Health

```bash
curl http://localhost:4001/health
```

## Chat room metadata

```bash
curl http://localhost:4001/api/chat/room
```

## List messages

```bash
curl "http://localhost:4001/api/chat/messages?room=common&limit=20"
```

## Publish message over HTTP

```bash
curl -X POST http://localhost:4001/api/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","text":"hello","room":"common"}'
```

## Production build

```bash
npm run build
npm start
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4001` | HTTP port to bind |
| `CHAT_DEFAULT_ROOM` | `common` | Default room name |
| `CHAT_HISTORY_LIMIT` | `200` | Max messages to retain in memory |
| `CHAT_WS_PATH` | `/ws/chat` | WebSocket route |
