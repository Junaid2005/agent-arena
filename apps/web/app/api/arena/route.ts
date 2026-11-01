import { upgradeWebSocket, waitUntil } from '@vercel/functions';
import { RedisGame, redisUrl } from '../../../../server/src/redis-game';
import { attachWebSocket } from '../../../../server/src/websocket-peer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

let game: RedisGame | undefined;
export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response('Use the arena website to connect.', { status: 403 });
  }
  try {
    redisUrl();
  } catch {
    return Response.json({ error: 'Arena state is not configured.' }, { status: 503 });
  }
  return upgradeWebSocket(
    (ws) => {
      if (!game || game.closed) game = new RedisGame();
      const instance = game;
      attachWebSocket(instance, ws);
      ws.on('close', () => waitUntil(instance.closeIfIdle()));
    },
    { maxPayload: 4096 },
  );
}
