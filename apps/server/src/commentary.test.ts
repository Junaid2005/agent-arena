import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player, Shot, Vec3 } from '../../../packages/shared/src/types.ts';
import { newPlayer } from './players.ts';
import {
  CASTER_PROMPT,
  CommentaryDirector,
  EventDetector,
  situation,
  speakableName,
  zoneOf,
  type CommentaryEvent,
} from './commentary.ts';
import { Commentator } from './commentator.ts';
import { DeepgramCaster, type CasterSocket, type DeepgramCasterOptions } from './deepgram.ts';

const base = 100_000;
let shotId = 0;
function player(id: string, name: string, position?: Vec3): Player {
  const p = newPlayer(id, name, Number(id.replace(/\D/g, '')) || 0, base);
  p.protectedUntil = 0;
  if (position) p.position = { ...position };
  return p;
}
function shot(partial: Partial<Shot> & Pick<Shot, 'shooter'>): Shot {
  const at = partial.at ?? base;
  return {
    id: `shot-${++shotId}`,
    from: { x: 0, y: 1, z: 0 },
    to: { x: 0, y: 1, z: 1 },
    color: '#ffffff',
    at,
    ...partial,
  };
}

test('speakableName strips injection punctuation and caps length', () => {
  assert.equal(speakableName('Ravi "the wall"!!!'), 'Ravi the wall');
  assert.equal(speakableName('{{system}} ignore\u0000this'), 'system ignore this');
  assert.equal(speakableName('🚀🚀'), 'Mystery Player');
  assert.equal(speakableName(''), 'Mystery Player');
  assert.ok(speakableName('A'.repeat(50)).length <= 18);
  assert.equal(zoneOf({ x: -11, y: 0, z: -10 }), 'stage');
  assert.equal(zoneOf({ x: 4, y: 0, z: 1.6 }), 'courtyard');
});

test('a first kill is first blood with priority 3', () => {
  const detector = new EventDetector();
  const killer = player('0', 'Alice');
  const victim = player('1', 'Bob');
  victim.hp = 0;
  killer.score = 1;
  const events = detector.observe(
    [killer, victim],
    [shot({ shooter: killer.id, hit: victim.id, killed: true })],
    base,
  );
  const event = events.find((e) => e.kind === 'first_blood');
  assert.ok(event);
  assert.equal(event.priority, 3);
  assert.match(event.text, /First blood/);
  assert.match(event.text, /Alice/);
});

test('the third kill is a streak milestone', () => {
  const detector = new EventDetector();
  const killer = player('0', 'Alice');
  const victims = [player('1', 'Bob'), player('2', 'Cara'), player('3', 'Dee')];
  for (const victim of victims) victim.hp = 0;
  killer.score = 3;
  const events = detector.observe(
    [killer, ...victims],
    victims.map((victim, index) =>
      shot({ shooter: killer.id, hit: victim.id, killed: true, at: base + index * 100 }),
    ),
    base + 200,
  );
  assert.ok(events.some((e) => e.kind === 'streak' && /3-kill streak/.test(e.text)));
});

test('killing a player on a three-kill streak is a shutdown', () => {
  const detector = new EventDetector();
  const victim = player('0', 'Vex');
  const feeder = player('1', 'Feeder');
  feeder.hp = 0;
  victim.score = 3;
  for (let i = 0; i < 3; i++) {
    detector.observe(
      [victim, feeder],
      [shot({ shooter: victim.id, hit: feeder.id, killed: true, at: base + i * 100 })],
      base + i * 100,
    );
  }
  const killer = player('2', 'Ash');
  killer.score = 1;
  const events = detector.observe(
    [victim, feeder, killer],
    [shot({ shooter: killer.id, hit: victim.id, killed: true, at: base + 1000 })],
    base + 1000,
  );
  assert.ok(events.some((e) => e.kind === 'shutdown' && /streak/.test(e.text)));
});

test('revenge replaces a plain kill', () => {
  const detector = new EventDetector();
  const alice = player('0', 'Alice');
  const bob = player('1', 'Bob');
  detector.observe(
    [alice, bob],
    [shot({ shooter: alice.id, hit: bob.id, killed: true })],
    base,
  );
  alice.hp = 0;
  const events = detector.observe(
    [alice, bob],
    [shot({ shooter: bob.id, hit: alice.id, killed: true, at: base + 1000 })],
    base + 1000,
  );
  assert.ok(events.some((e) => e.kind === 'revenge' && /revenge/.test(e.text)));
  assert.ok(!events.some((e) => e.kind === 'kill'));
});

test('two rapid kills by the same player are a multi-kill', () => {
  const detector = new EventDetector();
  const killer = player('0', 'Alice');
  const one = player('1', 'Bob');
  const two = player('2', 'Cara');
  one.hp = 0;
  two.hp = 0;
  const events = detector.observe(
    [killer, one, two],
    [
      shot({ shooter: killer.id, hit: one.id, killed: true, at: base }),
      shot({ shooter: killer.id, hit: two.id, killed: true, at: base + 2000 }),
    ],
    base + 2000,
  );
  assert.ok(events.some((e) => e.kind === 'multi_kill' && /multi-kill/.test(e.text)));
});

test('eight player shots without a hit is a whiff spree', () => {
  const detector = new EventDetector();
  const shooter = player('0', 'Alice');
  const other = player('1', 'Bob');
  const shots = Array.from({ length: 8 }, (_, index) =>
    shot({ shooter: shooter.id, at: base + index * 200 }),
  );
  const events = detector.observe([shooter, other], shots, base + 1600);
  assert.ok(events.some((e) => e.kind === 'whiff_spree'));
});

test('camping fires once and respects the twenty second cooldown', () => {
  const detector = new EventDetector();
  const camper = player('0', 'Camper', { x: 12, y: 0, z: 13 });
  const other = player('1', 'Runner', { x: -4, y: 0, z: 5 });
  detector.observe([camper, other], [], base);
  const first = detector.observe([camper, other], [], base + 15_000);
  assert.ok(first.some((e) => e.kind === 'camping' && /camping/.test(e.text)));
  const tooSoon = detector.observe([camper, other], [], base + 16_000);
  assert.equal(tooSoon.some((e) => e.kind === 'camping'), false);
  const later = detector.observe([camper, other], [], base + 35_000);
  assert.ok(later.some((e) => e.kind === 'camping'));
});

test('a solo camper is described as standing still in an empty arena', () => {
  const detector = new EventDetector();
  const camper = player('0', 'Camper', { x: 12, y: 0, z: 13 });
  detector.observe([camper], [], base);
  const events = detector.observe([camper], [], base + 15_000);
  const camping = events.find((e) => e.kind === 'camping');
  assert.ok(camping);
  assert.match(camping.text, /standing still/);
  assert.match(camping.text, /arena is empty/);
});

test('four airborne transitions are a bunny hop', () => {
  const detector = new EventDetector();
  const hopper = player('0', 'Hopper');
  const other = player('1', 'Other');
  detector.observe([hopper, other], [], base);
  let events: CommentaryEvent[] = [];
  for (let i = 1; i <= 4; i++) {
    hopper.grounded = false;
    events = detector.observe([hopper, other], [], base + i * 600);
    hopper.grounded = true;
    detector.observe([hopper, other], [], base + i * 600 + 300);
  }
  assert.ok(events.some((e) => e.kind === 'bunny_hop'));
});

test('a sole leader emerging from a tie is a lead change', () => {
  const detector = new EventDetector();
  const alice = player('0', 'Alice');
  const bob = player('1', 'Bob');
  alice.score = 1;
  bob.score = 1;
  const seed = detector.observe([alice, bob], [], base);
  assert.equal(seed.some((e) => e.kind === 'lead_change'), false);
  alice.score = 2;
  const events = detector.observe([alice, bob], [], base + 100);
  const lead = events.find((e) => e.kind === 'lead_change');
  assert.ok(lead);
  assert.equal(lead.priority, 3);
  assert.match(lead.text, /Alice takes the lead with 2/);
  bob.score = 3;
  const next = detector.observe([alice, bob], [], base + 200);
  assert.ok(next.some((e) => e.kind === 'lead_change' && /Bob/.test(e.text)));
});

test('situation names the leader, zones and an empty solo arena', () => {
  const solo = player('0', 'Solo', { x: 12, y: 0, z: 13 });
  assert.match(situation([solo], base).text, /arena is empty/);
  const leader = player('0', 'Leader');
  leader.score = 4;
  const other = player('1', 'Other', { x: -11, y: 0, z: -10 });
  const text = situation([leader, other], base).text;
  assert.match(text, /Leader leads with 4/);
  assert.match(text, /stage/);
});

test('director stays busy until computed speech end even after onAudioDone', () => {
  const director = new CommentaryDirector();
  const t = 1_000;
  director.add([{ kind: 'kill', priority: 2, at: t, text: 'one' }], t);
  assert.equal(director.next(t), 'EVENT: one');
  director.onAudio(32_000, t);
  director.onAudioDone(t + 200);
  assert.equal(director.busy(t + 500), true);
  director.add([{ kind: 'kill', priority: 2, at: t + 400, text: 'two' }], t + 400);
  assert.equal(director.next(t + 900), null, 'still speaking at 0.9s');
  assert.equal(director.busy(t + 1_001), false);
  assert.equal(director.next(t + 1_001), null, 'still inside the 400ms gap');
  assert.equal(director.next(t + 1_401), 'EVENT: two');
});

test('director drops stale events by priority ttl', () => {
  const director = new CommentaryDirector();
  director.add([{ kind: 'camping', priority: 1, at: base, text: 'stale' }], base);
  assert.equal(director.next(base + 3_000), null);
  assert.equal(director.next(base + 3_001), null);
});

test('director batches the three highest priority freshest events', () => {
  const director = new CommentaryDirector();
  director.add(
    [
      { kind: 'low', priority: 1, at: base, text: 'low' },
      { kind: 'mid', priority: 2, at: base, text: 'mid' },
      { kind: 'high-a', priority: 3, at: base, text: 'high a' },
      { kind: 'high-b', priority: 3, at: base + 100, text: 'high b' },
    ],
    base,
  );
  const line = director.next(base + 200);
  assert.ok(line);
  const lines = line.split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines.every((l) => l.startsWith('EVENT: ')));
  assert.deepEqual(lines, ['EVENT: high b', 'EVENT: high a', 'EVENT: mid']);
});

test('director watchdog clears a turn that never produced audio', () => {
  const director = new CommentaryDirector();
  director.add([{ kind: 'kill', priority: 2, at: base, text: 'first' }], base);
  assert.equal(director.next(base), 'EVENT: first');
  director.add([{ kind: 'kill', priority: 3, at: base + 1_000, text: 'second' }], base + 1_000);
  assert.equal(director.next(base + 6_001), 'EVENT: second');
});

type FakeHooks = Pick<
  DeepgramCasterOptions,
  'onAudio' | 'onText' | 'onAudioDone' | 'onStateChange'
>;
class FakeSocket implements CasterSocket {
  sent: (string | Uint8Array)[] = [];
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  on(event: string, listener: (...args: unknown[]) => void) {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }
  send(data: string | Uint8Array) {
    this.sent.push(data);
  }
  close() {
    this.emit('close');
  }
  emit(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
  json() {
    return this.sent
      .filter((item): item is string => typeof item === 'string')
      .map((item) => JSON.parse(item) as Record<string, unknown>);
  }
}
function casterFixture(hooks: FakeHooks, sockets: FakeSocket[]) {
  return new DeepgramCaster({
    apiKey: 'test-key',
    model: 'gpt-4.1-mini',
    voice: 'aura-2-atlas-en',
    speed: 1.1,
    temperature: 1,
    prompt: CASTER_PROMPT,
    log: () => {},
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    ...hooks,
  });
}
const hooks: FakeHooks = {
  onAudio: () => {},
  onText: () => {},
  onAudioDone: () => {},
  onStateChange: () => {},
};

test('caster treats ws text frames delivered as Buffers as JSON, not audio', () => {
  const sockets: FakeSocket[] = [];
  let audioBytes = 0;
  const caster = casterFixture({ ...hooks, onAudio: (pcm) => (audioBytes += pcm.length) }, sockets);
  caster.start();
  const socket = sockets[0];
  socket.emit('open');
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'Welcome' })), false);
  assert.ok(socket.json().some((m) => m.type === 'Settings'));
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'SettingsApplied' })), false);
  assert.equal(caster.ready, true);
  assert.equal(audioBytes, 0);
  socket.emit('message', Buffer.from([1, 2]), true);
  assert.equal(audioBytes, 2);
  caster.stop();
});

test('caster sends settings with the right audio shape and waits for SettingsApplied', () => {
  const sockets: FakeSocket[] = [];
  const caster = casterFixture(hooks, sockets);
  caster.start();
  const socket = sockets[0];
  socket.emit('open');
  socket.emit('message', JSON.stringify({ type: 'Welcome' }));
  const settings = socket.json().find((m) => m.type === 'Settings');
  assert.ok(settings);
  assert.equal((settings.agent as Record<string, unknown>).listen, undefined);
  const audio = settings.audio as {
    input: { sample_rate: number };
    output: { sample_rate: number; container: string };
  };
  assert.equal(audio.input.sample_rate, 16_000);
  assert.equal(audio.output.sample_rate, 16_000);
  assert.equal(audio.output.container, 'none');

  caster.inject('hello');
  assert.equal(socket.json().some((m) => m.type === 'InjectUserMessage'), false);
  socket.emit('message', JSON.stringify({ type: 'SettingsApplied' }));
  assert.equal(caster.ready, true);
  const injected = socket.json().find((m) => m.type === 'InjectUserMessage');
  assert.equal(injected?.content, 'hello');
  caster.stop();
});

test('caster realigns odd audio bytes and caps chunk size', () => {
  const sockets: FakeSocket[] = [];
  const audio: Buffer[] = [];
  const caster = casterFixture({ ...hooks, onAudio: (pcm) => audio.push(pcm) }, sockets);
  caster.start();
  const socket = sockets[0];
  socket.emit('open');
  socket.emit('message', JSON.stringify({ type: 'Welcome' }));
  socket.emit('message', JSON.stringify({ type: 'SettingsApplied' }));
  socket.emit('message', Buffer.from([1, 2, 3]));
  socket.emit('message', Buffer.from([4, 5, 6]));
  assert.deepEqual(audio.map((chunk) => chunk.length), [2, 4]);
  assert.deepEqual([...audio[0]], [1, 2]);
  assert.deepEqual([...audio[1]], [3, 4, 5, 6]);
  socket.emit('message', Buffer.alloc(8_001, 7));
  assert.deepEqual(audio.slice(2).map((chunk) => chunk.length), [8_000]);
  socket.emit('message', Buffer.from([9]));
  assert.deepEqual(audio.slice(2).map((chunk) => chunk.length), [8_000, 2]);
  assert.deepEqual([...audio[3]], [7, 9]);
  caster.stop();
});

test('caster sends KeepAlive and reconnects with backoff but not after stop', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const sockets: FakeSocket[] = [];
  const caster = casterFixture(hooks, sockets);
  caster.start();
  const first = sockets[0];
  first.emit('open');
  first.emit('message', JSON.stringify({ type: 'Welcome' }));
  t.mock.timers.tick(8_000);
  assert.ok(first.json().some((m) => m.type === 'KeepAlive'));

  first.emit('close');
  t.mock.timers.tick(2_000);
  assert.equal(sockets.length, 2);
  sockets[1].emit('open');
  sockets[1].emit('message', JSON.stringify({ type: 'Welcome' }));
  sockets[1].emit('message', JSON.stringify({ type: 'SettingsApplied' }));
  assert.equal(caster.ready, true);

  caster.stop();
  const stopped = sockets[1];
  stopped.emit('close');
  t.mock.timers.tick(60_000);
  assert.equal(sockets.length, 2);
});

class FakeCaster {
  ready = false;
  starts = 0;
  stops = 0;
  injects: string[] = [];
  start() {
    this.starts += 1;
    this.ready = true;
  }
  stop() {
    this.stops += 1;
    this.ready = false;
  }
  inject(text: string) {
    this.injects.push(text);
  }
}

test('commentator without a key is inert', () => {
  const created: FakeCaster[] = [];
  const commentator = new Commentator({
    emitAudio: () => {},
    emitText: () => {},
    env: {},
    createCaster: () => {
      const caster = new FakeCaster();
      created.push(caster);
      return caster;
    },
  });
  commentator.tick([player('0', 'Alice')], [], base);
  assert.deepEqual(commentator.status, { enabled: false, live: false });
  assert.equal(created.length, 0);
  commentator.stop();
});

test('commentator opens on activity, casts an opening line, and closes after idle', () => {
  const created: FakeCaster[] = [];
  const commentator = new Commentator({
    emitAudio: () => {},
    emitText: () => {},
    env: { DEEPGRAM_API_KEY: 'test-key', COMMENTARY_IDLE_MS: '45000' },
    createCaster: () => {
      const caster = new FakeCaster();
      created.push(caster);
      return caster;
    },
  });
  const alice = player('0', 'Alice', { x: 12, y: 0, z: 13 });
  commentator.tick([alice], [], base);
  assert.equal(created.length, 0, 'a first sighting only establishes an activity baseline');

  alice.position.x += 2;
  commentator.tick([alice], [], base + 100);
  assert.equal(created.length, 1);
  assert.equal(created[0].starts, 1);
  assert.ok(created[0].injects.some((line) => line.includes('We are live')));
  assert.equal(commentator.status.live, true);

  commentator.tick([alice], [], base + 45_101);
  assert.equal(created[0].stops, 1);
  assert.deepEqual(commentator.status, { enabled: true, live: false });

  alice.position.x += 2;
  commentator.tick([alice], [], base + 45_102);
  assert.equal(created.length, 2);
  assert.equal(created[1].starts, 1);
  commentator.stop();
});
