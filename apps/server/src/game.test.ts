import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movePlayer } from '../../../packages/shared/src/movement.ts';
import { ARENA, DT, MATCH_MS, SPAWNS } from '../../../packages/shared/src/constants.ts';
import { newPlayer } from './players.ts';
import { idleInput, createRoom, rooms, type Member } from './rooms.ts';
import { shoot, rayBox } from './combat.ts';
import { simulate } from './simulation.ts';
import { validateInput } from './validation.ts';
const time = 10000;
function member(index = 0): Member {
  return {
    player: { ...newPlayer(String(index), 'Player ' + index, index, time), weapon: 'pistol' },
    token: 'token' + index,
    socketId: 'socket' + index,
    disconnectedAt: 0,
    input: idleInput(),
    lastInputAt: time,
    lastShot: 0,
    lastReceivedSeq: -1,
    rateStart: time,
    rateCount: 0,
  };
}
test('rejects impossible, nonfinite, malformed and stale-shaped inputs', () => {
  assert.ok(validateInput(idleInput()));
  for (const bad of [
    null,
    {},
    { ...idleInput(), x: 50 },
    { ...idleInput(), seq: NaN },
    { ...idleInput(), pitch: 9 },
    { ...idleInput(), fire: 'yes' },
  ])
    assert.equal(validateInput(bad), null);
});
test('authoritative movement has fixed speed, floor, jump, boundaries and solid walls', () => {
  const p = newPlayer('a', 'Alice', 0, time);
  p.position = { x: 12, y: 0, z: 13 };
  for (let i = 0; i < 25; i++) movePlayer(p, { ...idleInput(), z: -1 }, DT, time + i * 40);
  assert.ok(Math.abs(p.position.z - 7) < 0.001);
  assert.equal(p.position.y, 0);
  movePlayer(p, { ...idleInput(), jump: true }, DT, time + 1000);
  assert.ok(p.position.y > 0);
  assert.equal(p.grounded, false);
  for (let i = 0; i < 100; i++) movePlayer(p, idleInput(), DT, time + 1100 + i * 40);
  assert.equal(p.position.y, 0);
  assert.equal(p.grounded, true);
  p.position = { x: 14, y: 0, z: 12 };
  for (let i = 0; i < 200; i++) movePlayer(p, { ...idleInput(), x: 1 }, DT, time + i * 40);
  assert.ok(p.position.x <= 14.64 + 0.001, 'cannot penetrate the east off-limits wall');
});
test('every spawn is outside solid geometry and supports the player', () => {
  SPAWNS.forEach(([x, y, z], index) => {
    for (const b of ARENA) {
      if (b.kind === 'ramp') continue;
      const [bx, by, bz] = b.position,
        [sx, sy, sz] = b.size;
      const inside =
        Math.abs(x - bx) < sx / 2 + 0.36 &&
        Math.abs(z - bz) < sz / 2 + 0.36 &&
        y < by + sy / 2 - 0.01;
      assert.ok(!inside, `spawn ${index} inside ${b.id}`);
    }
  });
});
test('three server ray hits eliminate, award one score, then respawn after three seconds', () => {
  const r = createRoom(time),
    a = member(),
    b = member(1);
  r.members.set('0', a);
  r.members.set('1', b);
  a.player.position = { x: 11, y: 0, z: 12 };
  b.player.position = { x: 11.65, y: 0, z: 10 };
  a.player.yaw = 0;
  a.player.protectedUntil = 0;
  b.player.protectedUntil = 0;
  a.input = { ...idleInput(), fire: true };
  for (const t of [time, time + 300, time + 600]) {
    a.lastInputAt = t;
    simulate(r, t);
  }
  assert.equal(b.player.hp, 0);
  assert.equal(a.player.score, 1);
  assert.equal(b.player.deaths, 1);
  assert.equal(r.feed.length, 1);
  assert.equal(b.player.respawnAt, time + 3600);
  simulate(r, time + 3599);
  assert.equal(b.player.hp, 0);
  simulate(r, time + 3600);
  assert.equal(b.player.hp, 3);
  assert.ok(b.player.protectedUntil > time + 3600);
  rooms.delete(r.code);
});
test('walls occlude hits and cooldown blocks excessive shooting', () => {
  const a = newPlayer('a', 'Alice', 0, time),
    b = newPlayer('b', 'Bob', 1, time);
  a.position = { x: -4, y: 0, z: -7 };
  b.position = { x: 0, y: 0, z: -7 };
  a.yaw = -Math.PI / 2;
  b.protectedUntil = 0;
  const s = shoot(a, [a, b], time, 0);
  assert.ok(s);
  assert.equal(s.hit, undefined);
  assert.equal(b.hp, 3);
  assert.equal(shoot(a, [a, b], time, time - 50), null);
  assert.equal(
    rayBox({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 2, y: 2, z: 2 }, { x: 3, y: 3, z: 3 }),
    null,
  );
});
test('pet characters do not shoot without player input', () => {
  const r = createRoom(time), a = member(), b = member(1);
  a.player.pet = 'fireball';
  b.player.pet = 'dewey';
  a.player.position = { x: 11, y: 0, z: 12 };
  b.player.position = { x: 11.65, y: 0, z: 10 };
  a.player.protectedUntil = b.player.protectedUntil = 0;
  r.members.set('0', a);
  r.members.set('1', b);
  for (let i = 0; i < 100; i++) assert.deepEqual(simulate(r, time + i * 40), []);
  assert.equal(a.player.hp, 3);
  assert.equal(b.player.hp, 3);
  rooms.delete(r.code);
});
test('arena runs continuously without resetting scores; disconnect cleanup removes abandoned players', () => {
  const r = createRoom(time),
    m = member();
  r.members.set('0', m);
  m.player.score = 4;
  simulate(r, time + MATCH_MS);
  assert.equal(r.finishedAt, 0);
  simulate(r, time + MATCH_MS + 8000);
  assert.equal(r.round, 1);
  assert.equal(m.player.score, 4);
  m.socketId = null;
  m.disconnectedAt = time;
  simulate(r, time + MATCH_MS + 9000);
  assert.equal(r.members.size, 0);
  rooms.delete(r.code);
});
test('dive, stumble and ramps preserve controllability and recovery', () => {
  const p = newPlayer('p', 'Player', 0, time);
  p.position = { x: 12, y: 0, z: 13 };
  movePlayer(p, { ...idleInput(), dive: true }, DT, time);
  assert.ok(p.diveUntil > time);
  assert.ok(p.position.z < 13);
  movePlayer(p, { ...idleInput(), stumble: true }, DT, time + 2000);
  assert.ok(p.knockUntil > time + 2000);
  const before = p.position.z;
  movePlayer(p, { ...idleInput(), z: -1 }, DT, time + 3100);
  assert.ok(p.position.z < before);
  const ramp = ARENA.find((b) => b.kind === 'ramp')!;
  p.position = { x: ramp.position[0], y: 0, z: ramp.position[2] + ramp.size[2] / 2 + 0.1 };
  p.vy = 0;
  p.grounded = true;
  for (let i = 0; i < 16; i++) movePlayer(p, { ...idleInput(), z: -1 }, DT, time + 5000 + i * 40);
  assert.ok(p.position.y > 0.4, 'walk up the stage ramp');
});
