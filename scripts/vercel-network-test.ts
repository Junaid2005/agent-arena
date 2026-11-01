import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import type { Input, Snapshot, Shot } from '../packages/shared/src/types.ts';
import type { JoinReply } from '../packages/shared/src/protocol.ts';
import type { ServerPacket } from '../packages/shared/src/websocket.ts';

const origin = process.env.TEST_VERCEL_URL;
if (!origin) throw new Error('Set TEST_VERCEL_URL to the candidate deployment URL.');
const bypassHeaders: Record<string, string> = process.env.TEST_VERCEL_BYPASS
  ? { 'x-vercel-protection-bypass': process.env.TEST_VERCEL_BYPASS }
  : {};
const address = new URL('/api/arena', origin).href.replace(/^http/, 'ws');
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(check: () => boolean, label: string, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (check()) return;
    await pause(25);
  }
  throw new Error(label);
}
class PlayerClient {
  ws: WebSocket;
  state?: Snapshot;
  identity?: Extract<JoinReply, { ok: true }>;
  error?: string;
  shots: Shot[] = [];
  seq = 0;
  lastInput = Date.now();
  heartbeat: ReturnType<typeof setInterval>;
  constructor(name: string, token?: string) {
    this.ws = new WebSocket(address, { origin, headers: bypassHeaders, handshakeTimeout: 20_000 });
    this.heartbeat = setInterval(() => {
      if (
        this.identity &&
        this.ws.readyState === WebSocket.OPEN &&
        Date.now() - this.lastInput > 120
      )
        this.input();
    }, 100);
    this.ws.on('open', () =>
      this.ws.send(JSON.stringify({ event: 'join', data: { name, token, pet: 'codex' } })),
    );
    this.ws.on('close', () => clearInterval(this.heartbeat));
    this.ws.on('error', (e) => {
      this.error = e.message;
    });
    this.ws.on('message', (raw) => {
      const packet = JSON.parse(String(raw)) as ServerPacket;
      if (packet.event === 'joined') {
        if (packet.data.ok) {
          this.identity = packet.data;
          this.state = packet.data.snapshot;
          this.seq = this.me!.seq + 1;
        } else this.error = packet.data.error;
      } else if (packet.event === 'snapshot') this.state = packet.data;
      else if (packet.event === 'shot') this.shots.push(packet.data);
      else if (packet.event === 'error') this.error = packet.data;
    });
  }
  get me() {
    return this.state?.players.find((p) => p.id === this.identity?.id);
  }
  async ready() {
    await wait(() => !!this.identity || !!this.error, 'join did not complete', 25_000);
    assert.ok(this.identity, this.error);
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
  async move(x: number, z: number) {
    const end = Date.now() + 20_000;
    while (Date.now() < end) {
      const p = this.me!;
      if (p.hp === 0) throw new Error('Eliminated while navigating.');
      const dx = x - p.position.x,
        dz = z - p.position.z;
      if (Math.hypot(dx, dz) < 0.2) {
        this.input();
        return;
      }
      const len = Math.max(1, Math.hypot(dx, dz));
      this.input({ x: Math.abs(dx) < 0.1 ? 0 : dx / len, z: Math.abs(dz) < 0.1 ? 0 : dz / len });
      await pause(40);
    }
    throw new Error(`Movement stalled at ${JSON.stringify(this.me?.position)} toward ${x},${z}`);
  }
  stop() {
    clearInterval(this.heartbeat);
    this.ws.terminate();
  }
}
const clients: PlayerClient[] = [];
async function join(name: string, token?: string) {
  const client = new PlayerClient(name, token);
  clients.push(client);
  return client.ready();
}
try {
  const health = await fetch(new URL('/api/health', origin), { headers: bypassHeaders });
  assert.equal(health.status, 200);
  const metadata = (await health.json()) as { hosting: string; players: number };
  assert.equal(metadata.hosting, 'vercel');
  assert.equal(metadata.players, 0, 'Only run combat fixtures in an empty candidate deployment.');
  const alice = await join('Migration Alice'),
    bob = await join('Migration Bob');
  await wait(
    () => alice.state?.players.length === 2 && bob.state?.players.length === 2,
    'split rooms',
  );
  if (process.env.TEST_MVP_SMOKE === '1') {
    const before = alice.me!.position.x;
    for (let i = 0; i < 12; i++) {
      alice.input({ x: 1 });
      await pause(40);
    }
    alice.input();
    await wait(
      () =>
        (bob.state?.players.find((p) => p.id === alice.identity!.id)?.position.x || 0) >
        before + 0.5,
      'remote client did not observe movement',
    );
    const since = Date.now();
    alice.input({ fire: true });
    await wait(
      () => bob.shots.some((s) => s.shooter === alice.identity!.id && !s.pet && s.at >= since),
      'remote client did not observe firing',
    );
    alice.input();
    const saved = alice.identity!,
      score = alice.me!.score;
    alice.stop();
    const resumed = await join('Migration Alice', saved.token);
    assert.equal(resumed.identity!.id, saved.id);
    assert.equal(resumed.me!.score, score);
    console.log(
      'PASS: MVP public Vercel health, two-player movement, firing and reconnect identity',
    );
  } else {
    await alice.move(11, 14);
    await alice.move(11, 12);
    await bob.move(-11, 6.8);
    await bob.move(-4, 6.8);
    await bob.move(-4, 8.7);
    await bob.move(11, 8.7);
    await bob.move(11.65, 10);
    await wait(() => alice.me!.deaths + bob.me!.deaths > 0, 'combat did not synchronize', 8_000);
    const victim = alice.me!.deaths ? alice : bob;
    assert.ok(alice.shots.some((s) => s.hit === victim.identity!.id && s.killed));
    assert.equal(alice.state!.feed[0].id, bob.state!.feed[0].id);
    await wait(() => victim.me?.hp === 3, 'respawn did not synchronize', 5_000);
    const since = Date.now();
    alice.input({ fire: true });
    await wait(
      () => alice.shots.some((s) => s.shooter === alice.identity!.id && !s.pet && s.at >= since),
      'manual shooting failed',
    );
    alice.input();
    console.log(
      'PASS: public Vercel health, shared movement, firing, elimination, score and respawn',
    );
    const saved = alice.identity!,
      score = alice.me!.score;
    alice.stop();
    const resumed = await join('Migration Alice', saved.token);
    assert.equal(resumed.identity!.id, saved.id);
    assert.equal(resumed.me!.score, score);
    for (let i = 0; i < 6; i++) await join(`Migration ${i}`);
    await wait(() => resumed.state?.players.length === 8, 'eight-client room failed');
    console.log('PASS: public Vercel reconnect preserves identity and eight clients see one arena');
    const invalidOrigin = new WebSocket(address, {
      origin: 'https://unrelated.example',
      handshakeTimeout: 5_000,
    });
    const rejected = await new Promise<boolean>((resolve) => {
      invalidOrigin.on('unexpected-response', (_request, response) => {
        response.resume();
        resolve(response.statusCode === 403);
      });
      invalidOrigin.on('error', () => resolve(true));
      invalidOrigin.on('open', () => resolve(false));
    });
    invalidOrigin.terminate();
    assert.ok(rejected, 'cross-origin socket was accepted');
    console.log('PASS: cross-origin WebSocket upgrades rejected');
  }
} finally {
  for (const client of clients) client.stop();
}
