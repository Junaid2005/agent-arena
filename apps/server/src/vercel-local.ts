import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { RedisGame, arenaHealth, redisUrl, statePrefix } from './redis-game.ts';
import { attachWebSocket } from './websocket-peer.ts';

export function localArena(url = redisUrl(), prefix = statePrefix()) {
  const game = new RedisGame(url, prefix);
  const server = createServer((_req, res) => {
    void arenaHealth(url, prefix)
      .then((health) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(health));
      })
      .catch(() => {
        res.statusCode = 503;
        res.end('Arena state unavailable.');
      });
  });
  const sockets = new WebSocketServer({ server, maxPayload: 4096 });
  sockets.on('connection', (ws) => attachWebSocket(game, ws));
  return {
    server,
    game,
    async close() {
      for (const ws of sockets.clients) ws.terminate();
      await game.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      sockets.close();
    },
  };
}
if (process.argv[1]?.endsWith('vercel-local.ts')) {
  const arena = localArena();
  arena.server.listen(Number(process.env.PORT || 3002), '0.0.0.0', () =>
    console.log('Redis-backed arena ready.'),
  );
  process.on('SIGTERM', () => {
    void arena.close().then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    void arena.close().then(() => process.exit(0));
  });
}
