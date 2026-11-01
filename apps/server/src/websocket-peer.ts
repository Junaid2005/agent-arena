import { randomUUID } from 'node:crypto';
import type { JoinRequest } from '../../../packages/shared/src/protocol.ts';
import { RedisGame } from './redis-game.ts';

// Compatible with ws and @vercel/functions' upgraded WebSocket.
export interface ArenaWebSocket {
  send(data: string): unknown;
  close(code?: number, reason?: string): unknown;
  on(event: 'message', listener: (data: unknown) => void): unknown;
  on(event: 'close' | 'error', listener: () => void): unknown;
}
export function attachWebSocket(game: RedisGame, ws: ArenaWebSocket) {
  const connection = randomUUID();
  let joining = false;
  const joinDeadline = setTimeout(() => ws.close(1008, 'Enter a name to join.'), 15_000);
  // Proactively reconnect before the function's five-minute duration, keeping identity in Redis.
  const recycle = setTimeout(() => ws.close(1012, 'Refreshing arena connection.'), 270_000);
  const dispose = () => {
    clearTimeout(joinDeadline);
    clearTimeout(recycle);
    game.detach(connection);
  };
  game.attach(connection, {
    send: (packet) => {
      try {
        ws.send(JSON.stringify(packet));
      } catch {
        dispose();
      }
    },
    close: (code, reason) => {
      try {
        ws.close(code, reason);
      } finally {
        dispose();
      }
    },
  });
  ws.on('message', (raw) => {
    const text = typeof raw === 'string' ? raw : String(raw);
    if (Buffer.byteLength(text) > 4_096) {
      ws.close(1009, 'Message too large.');
      return;
    }
    let packet: { event?: unknown; data?: unknown };
    try {
      packet = JSON.parse(text);
    } catch {
      ws.close(1008, 'Invalid message.');
      return;
    }
    if (!packet || typeof packet !== 'object') return;
    if (packet.event === 'join' && !joining) {
      joining = true;
      void game
        .join(connection, packet.data as JoinRequest)
        .then(() => {
          clearTimeout(joinDeadline);
        })
        .catch(() => {
          try {
            ws.send(
              JSON.stringify({ event: 'error', data: 'Arena is reconnecting. Please retry.' }),
            );
          } catch {}
          ws.close(1013, 'Arena temporarily unavailable.');
        });
    } else if (packet.event === 'input') game.input(connection, packet.data);
  });
  ws.on('close', dispose);
  ws.on('error', dispose);
}
