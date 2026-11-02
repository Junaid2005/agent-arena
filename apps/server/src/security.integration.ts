import assert from 'node:assert/strict';
import { test } from 'node:test';
import { io, type Socket } from 'socket.io-client';
import type { JoinReply } from '../../../packages/shared/src/protocol.ts';
const address = process.env.TEST_SERVER_URL!;
const origin = process.env.TEST_ORIGIN!;
async function connect(): Promise<Socket> {
  const socket = io(address, {
    transports: ['websocket'],
    extraHeaders: { Origin: origin },
    reconnection: false,
    timeout: 3000,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}
test('public HTTP boundaries reject foreign origins and avoid serving the Socket.IO client bundle', async () => {
  const health = await fetch(`${address}/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  const denied = await fetch(`${address}/socket.io/?EIO=4&transport=polling`, {
    headers: { Origin: 'https://attacker.invalid' },
  });
  assert.equal(denied.status, 403);
  assert.ok((await fetch(`${address}/socket.io/socket.io.js`)).status >= 400);
});
test('malformed resume tokens cannot create a player', async () => {
  const socket = await connect();
  try {
    const result = await new Promise<JoinReply>((resolve) =>
      socket.emit('join', { name: 'Invalid', token: 'x'.repeat(1000) }, resolve),
    );
    assert.equal(result.ok, false);
    const health = (await (await fetch(`${address}/health`)).json()) as { players: number };
    assert.equal(health.players, 0);
  } finally {
    socket.disconnect();
  }
});
test('oversized messages disconnect only the offending client', { timeout: 5000 }, async () => {
  const socket = await connect();
  try {
    const disconnected = new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
    socket.emit('input', { padding: 'x'.repeat(20_000) });
    await disconnected;
    assert.equal((await fetch(`${address}/health`)).status, 200);
  } finally {
    socket.disconnect();
  }
});
test('clients that connect without joining are disconnected', { timeout: 15_000 }, async () => {
  const socket = await connect();
  try {
    await new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
  } finally {
    socket.disconnect();
  }
});
