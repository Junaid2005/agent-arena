import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import type { Input, Snapshot, Shot } from '../../../packages/shared/src/types.ts';
import type { JoinReply } from '../../../packages/shared/src/protocol.ts';
import type { ServerPacket } from '../../../packages/shared/src/websocket.ts';
import { Commentator, type CommentatorOptions } from './commentator.ts';
import { localArena } from './vercel-local.ts';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, message: string, timeout = 8_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (check()) return;
    await delay(25);
  }
  throw new Error(message);
}
class Client {
  ws: WebSocket;
  snapshot?: Snapshot;
  reply?: Extract<JoinReply, { ok: true }>;
  failure?: string;
  shots: Shot[] = [];
  commentary: ServerPacket[] = [];
  seq = 0;
  lastInput = Date.now();
  heartbeat: ReturnType<typeof setInterval>;
  constructor(url: string, name: string, token?: string) {
    this.ws = new WebSocket(url);
    this.heartbeat = setInterval(() => {
      if (this.reply && this.ws.readyState === WebSocket.OPEN && Date.now() - this.lastInput > 120)
        this.input();
    }, 100);
    this.ws.on('close', () => clearInterval(this.heartbeat));
    this.ws.on('open', () =>
      this.ws.send(JSON.stringify({ event: 'join', data: { name, token } })),
    );
    this.ws.on('error', () => {});
    this.ws.on('message', (raw) => {
      const packet = JSON.parse(String(raw)) as ServerPacket;
      if (packet.event === 'joined') {
        if (packet.data.ok) {
          this.reply = packet.data;
          this.snapshot = packet.data.snapshot;
          this.seq = this.me?.seq || 0;
        } else this.failure = packet.data.error;
      } else if (packet.event === 'snapshot') this.snapshot = packet.data;
      else if (packet.event === 'shot') this.shots.push(packet.data);
      else if (packet.event === 'commentaryAudio' || packet.event === 'commentaryText')
        this.commentary.push(packet);
    });
  }
  get me() {
    return this.snapshot?.players.find((p) => p.id === this.reply?.id);
  }
  async ready() {
    await until(() => !!this.reply || !!this.failure, 'join timed out');
    assert.ok(this.reply, this.failure);
    return this;
  }
  input(changes: Partial<Input> = {}) {
    this.lastInput = Date.now();
    this.ws.send(
      JSON.stringify({
        event: 'input',
        data: {
          seq: ++this.seq,
          x: 0,
          z: 0,
          yaw: 0,
          pitch: 0,
          jump: false,
          dive: false,
          stumble: false,
          fire: false,
          ...changes,
        },
      }),
    );
  }
  async navigate(x: number, z: number) {
    const end = Date.now() + 15_000;
    while (Date.now() < end) {
      const p = this.me!;
      if (p.hp === 0) throw new Error('Player eliminated while navigating.');
      const dx = x - p.position.x,
        dz = z - p.position.z;
      if (Math.hypot(dx, dz) < 0.16) {
        this.input();
        return;
      }
      const length = Math.max(1, Math.hypot(dx, dz));
      this.input({
        x: Math.abs(dx) < 0.08 ? 0 : dx / length,
        z: Math.abs(dz) < 0.08 ? 0 : dz / length,
      });
      await delay(40);
    }
    throw new Error(
      `Navigation stuck at ${JSON.stringify(this.me?.position)} en route to ${x},${z}`,
    );
  }
}

test(
  'separate Vercel-style instances share movement, combat, scores and identity through leader turnover',
  { timeout: 120_000 },
  async () => {
    const url = process.env.REDIS_URL || process.env.KV_URL || 'redis://127.0.0.1:6387';
    const prefix = `ghost-test:${randomUUID()}`;
    const redis = new Redis(url);
    let casters = 0;
    const createCommentator = (options: CommentatorOptions) =>
      new Commentator({
        ...options,
        env: { DEEPGRAM_API_KEY: 'test-key' },
        createCaster: (callbacks) => ({
          ready: true,
          start() {
            casters++;
          },
          stop() {
            casters--;
          },
          inject(text) {
            callbacks.onText(text);
            callbacks.onAudio(Buffer.from([0, 1, 2, 3]));
          },
        }),
      });
    const first = localArena(url, prefix, createCommentator),
      second = localArena(url, prefix, createCommentator);
    const clients: Client[] = [];
    const listen = async (arena: typeof first) => {
      await new Promise<void>((resolve) => arena.server.listen(0, '127.0.0.1', resolve));
      return `ws://127.0.0.1:${(arena.server.address() as AddressInfo).port}`;
    };
    const [one, two] = await Promise.all([listen(first), listen(second)]);
    const create = async (address: string, name: string, token?: string) => {
      const client = new Client(address, name, token);
      clients.push(client);
      return client.ready();
    };
    let firstClosed = false;
    try {
      const alice = await create(one, 'Alice');
      const bob = await create(two, 'Bob');
      await until(
        () => alice.snapshot?.players.length === 2 && bob.snapshot?.players.length === 2,
        'players split across instances',
      );
      assert.equal(alice.reply!.snapshot.room, bob.reply!.snapshot.room);
      console.log('PASS: clients on separate processes see one arena');
      await alice.navigate(11, 14);
      await alice.navigate(11, 12);
      await until(
        () => alice.commentary.length >= 2 && bob.commentary.length >= 2,
        'shared commentary missing',
      );
      assert.equal(casters, 1, 'only the simulation owner opens a commentator');
      assert.deepEqual(alice.commentary.slice(0, 2), bob.commentary.slice(0, 2));
      const audio = bob.commentary.find((p) => p.event === 'commentaryAudio');
      assert.ok(audio?.event === 'commentaryAudio');
      assert.deepEqual([...Buffer.from(audio.data.pcm, 'base64')], [0, 1, 2, 3]);
      console.log('PASS: one commentator broadcasts identical PCM and captions across instances');
      await bob.navigate(-11, 6.8);
      await bob.navigate(-4, 6.8);
      await bob.navigate(-4, 8.7);
      await bob.navigate(11, 8.7);
      await bob.navigate(11.65, 10);
      const deadline = Date.now() + 8000;
      while (bob.me!.deaths === 0 && Date.now() < deadline) {
        alice.input({ fire: true, yaw: 0, pitch: 0 });
        await delay(40);
      }
      alice.input();
      await until(() => bob.me!.deaths > 0, 'player firing did not eliminate target');
      const victim = alice.me!.deaths ? alice : bob;
      const killer = victim === alice ? bob : alice;
      assert.ok(killer.me!.score > 0);
      assert.ok(alice.shots.some((shot) => shot.hit === victim.reply!.id && shot.killed));
      assert.equal(alice.snapshot!.feed[0].id, bob.snapshot!.feed[0].id);
      await until(() => victim.me?.hp === 3, 'respawn did not reach the remote instance', 5_000);
      const since = Date.now();
      alice.input({ fire: true });
      await until(
        () =>
          alice.shots.some(
            (shot) => shot.at >= since && shot.shooter === alice.reply!.id && !shot.pet,
          ),
        'manual fire input did not produce a server-validated shot',
      );
      alice.input();
      console.log(
        'PASS: input navigation, player firing, combat, score and respawn cross instances',
      );

      const before = { ...alice.me!.position };
      alice.input({ x: 500 });
      await delay(250);
      assert.ok(
        Math.hypot(alice.me!.position.x - before.x, alice.me!.position.z - before.z) < 0.05,
      );
      const identity = alice.reply!;
      assert.equal(first.game.isLeader, true);
      await first.close();
      firstClosed = true;
      await until(() => second.game.isLeader, 'new instance did not acquire authority', 5_000);
      const resumed = await create(two, 'Alice', identity.token);
      assert.equal(casters, 0, 'retired owner closes the billed commentary session');
      assert.equal(resumed.reply!.id, identity.id);
      assert.equal(resumed.me!.score, alice.me!.score);
      console.log(
        'PASS: invalid input rejected; instance retirement preserves score and resume token',
      );
      for (let i = 0; i < 6; i++) await create(two, `Guest ${i}`);
      await until(
        () => resumed.snapshot?.players.length === 8,
        'eight players did not share the resumed arena',
      );
      const takeover = await create(two, 'Alice', identity.token);
      assert.equal(takeover.reply!.id, identity.id);
      await until(
        () => resumed.ws.readyState === WebSocket.CLOSED,
        'old connection was not replaced',
      );
      assert.equal(takeover.snapshot!.players.length, 8);
      console.log('PASS: eight clients remain in one arena and connection takeover keeps identity');
    } finally {
      for (const client of clients) {
        clearInterval(client.heartbeat);
        client.ws.terminate();
      }
      if (!firstClosed) await first.close();
      await second.close();
      await redis.del(`${prefix}:owner`, `${prefix}:state`);
      redis.disconnect();
    }
  },
);
