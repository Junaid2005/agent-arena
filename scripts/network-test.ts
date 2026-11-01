import assert from 'node:assert/strict';
import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, JoinReply } from '../packages/shared/src/protocol.ts';
import { isWeaponId } from '../packages/shared/src/weapons.ts';
import { PETS, type PetId } from '../packages/shared/src/pets.ts';
import type { Snapshot, Input } from '../packages/shared/src/types.ts';
import { planToWorld } from '../packages/shared/src/venue.ts';
const url = process.env.TEST_SERVER_URL || 'http://localhost:3001';
const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clients: Socket<ServerEvents, ClientEvents>[] = [];
const snapshots = new Map<string, Snapshot>();
async function connect(name: string, room?: string, token?: string, pet: PetId = 'codex') {
  const s: Socket<ServerEvents, ClientEvents> = io(url, {
    transports: process.env.TEST_TRANSPORT === 'polling' ? ['polling'] : ['websocket'],
    extraHeaders: { Origin: origin },
    reconnection: false,
    timeout: 20000,
  });
  clients.push(s);
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', reject);
  });
  s.on('snapshot', (snap) => snapshots.set(s.id!, snap));
  const result = await new Promise<JoinReply>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('join timeout')), 20000);
    s.emit('join', { name, room, token, pet }, (r) => {
      clearTimeout(t);
      resolve(r);
    });
  });
  assert.ok(result.ok, result.ok ? '' : result.error);
  assert.equal(result.snapshot.players.find((p) => p.id === result.id)?.pet, pet);
  assert.ok(isWeaponId(result.snapshot.players.find((p) => p.id === result.id)?.weapon));
  snapshots.set(s.id!, result.snapshot);
  return { s, id: result.id, room: result.snapshot.room, token: result.token };
}
let seq = 0;
const command = (s: Socket<ServerEvents, ClientEvents>, changes: Partial<Input> = {}) =>
  s.emit('input', {
    seq: ++seq,
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    jump: false,
    dive: false,
    stumble: false,
    fire: false,
    ...changes,
  });
async function navigate(client: Awaited<ReturnType<typeof connect>>, x: number, z: number) {
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    const p = snapshots.get(client.s.id!)!.players.find((p) => p.id === client.id)!;
    const dx = x - p.position.x,
      dz = z - p.position.z;
    if (Math.hypot(dx, dz) < 0.16) {
      command(client.s);
      return;
    }
    const length = Math.max(1, Math.hypot(dx, dz));
    command(client.s, {
      x: Math.abs(dx) < 0.08 ? 0 : dx / length,
      z: Math.abs(dz) < 0.08 ? 0 : dz / length,
    });
    await pause(40);
  }
  const p = snapshots.get(client.s.id!)!.players.find((p) => p.id === client.id)!;
  throw new Error(`Navigation stuck at ${JSON.stringify(p.position)} heading to ${x},${z}`);
}
try {
  const pets = Object.keys(PETS) as PetId[];
  const a = await connect('Alice', undefined, undefined, 'fireball'),
    b = await connect('Bob', a.room, undefined, 'dewey');
  for (const pet of pets.filter((p) => p !== 'fireball' && p !== 'dewey'))
    await connect('Guest ' + pet, a.room, undefined, pet);
  for (let i = 0; i < 50 && (snapshots.get(a.s.id!)?.players.length || 0) < pets.length; i++)
    await pause(100);
  assert.ok(snapshots.get(a.s.id!)!.players.length >= pets.length);
  assert.equal(snapshots.get(b.s.id!)!.room, a.room);
  assert.deepEqual(new Set(snapshots.get(a.s.id!)!.players.map((p) => p.pet)), new Set(pets));
  console.log('PASS: all nine pet selections are distinct and visible in the shared arena');
  // Navigate through the venue using only input commands, never position writes.
  const visit = async (client: typeof a, x: number, z: number) => {
    const [wx, wz] = planToWorld([x, z]); await navigate(client, wx, wz);
  };
  await visit(a, 840, 706);
  for (const [x, z] of [[463, 525], [463, 520], [544, 520], [544, 550], [549, 550], [549, 560], [554, 560], [554, 565], [624, 565], [624, 610], [629, 610], [629, 676], [634, 676], [634, 681], [785, 681], [785, 686], [795, 686], [795, 691], [810, 691], [810, 696], [840, 696], [840, 706]]) await visit(b, x, z);
  const [ax] = planToWorld([840, 706]);
  const [, bz] = planToWorld([840, 665]);
  await navigate(b, ax + 0.65, bz);
  await pause(300);
  const before = snapshots.get(b.s.id!)!.players.find((p) => p.id === b.id)!;
  assert.equal(before.hp, 3);
  let shotEvents = 0;
  a.s.on('shot', () => shotEvents++);
  const originalWeapon = snapshots.get(a.s.id!)!.players.find((p) => p.id === a.id)!.weapon;
  const victimWeapon = before.weapon;
  const shootUntil = Date.now() + 5000;
  while (Date.now() < shootUntil && snapshots.get(b.s.id!)!.players.find((p) => p.id === b.id)!.hp > 0) {
    command(a.s, { fire: true });
    await pause(40);
  }
  command(a.s);
  await pause(200);
  const snapA = snapshots.get(a.s.id!)!,
    snapB = snapshots.get(b.s.id!)!;
  assert.equal(snapA.players.find((p) => p.id === a.id)!.score, 1);
  assert.equal(snapB.players.find((p) => p.id === b.id)!.hp, 0);
  assert.equal(snapB.feed[0].victim, 'Bob');
  assert.ok(shotEvents >= 1);
  const nextWeapon = snapA.players.find((p) => p.id === a.id)!.weapon;
  assert.notEqual(nextWeapon, originalWeapon);
  assert.equal(snapB.players.find((p) => p.id === a.id)!.weapon, nextWeapon);
  console.log(
    'PASS: movement through venue doors, validated weapon damage, elimination, score and synchronized weapon shuffle',
  );
  await pause(3200);
  assert.equal(snapshots.get(b.s.id!)!.players.find((p) => p.id === b.id)!.hp, 3);
  assert.equal(snapshots.get(a.s.id!)!.players.find((p) => p.id === b.id)!.pet, 'dewey');
  assert.equal(snapshots.get(b.s.id!)!.players.find((p) => p.id === b.id)!.weapon, victimWeapon);
  console.log('PASS: respawn preserves the selected pet and current weapon for other clients');
  const prior = snapshots.get(a.s.id!)!.players.find((p) => p.id === a.id)!.position;
  a.s.emit('input', {
    seq: 1e9,
    x: 999,
    z: 0,
    yaw: 0,
    pitch: 0,
    jump: false,
    dive: false,
    stumble: false,
    fire: false,
  });
  await pause(200);
  const after = snapshots.get(a.s.id!)!.players.find((p) => p.id === a.id)!.position;
  assert.ok(Math.hypot(after.x - prior.x, after.z - prior.z) < 0.05);
  command(a.s);
  const saved = { id: b.id, token: b.token };
  b.s.disconnect();
  await pause(150);
  const rejoined = await connect('Bob', a.room, saved.token, 'rocky');
  assert.equal(rejoined.id, saved.id);
  assert.equal(snapshots.get(rejoined.s.id!)!.players.find((p) => p.id === b.id)!.weapon, victimWeapon);
  const takeover = await connect('Bob', a.room, saved.token, 'rocky');
  assert.equal(takeover.id, saved.id);
  await pause(100);
  assert.equal(rejoined.s.connected, false);
  console.log(
    'PASS: invalid input rejected; reconnect and half-open takeover preserve identity and update the selected character',
  );
  const other = await connect('Isolated');
  assert.equal(other.room, a.room);
  assert.ok(snapshots.get(other.s.id!)!.players.length >= pets.length);
  console.log('PASS: all entrants share the same perpetual public arena');
} finally {
  for (const s of clients) s.disconnect();
}
