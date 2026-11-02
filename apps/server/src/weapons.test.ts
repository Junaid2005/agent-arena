import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS,
  WEAPON_IDS,
  isWeaponId,
  rollWeapon,
  type WeaponId,
} from '../../../packages/shared/src/weapons.ts';
import { shoot, explode } from './combat.ts';
import { newPlayer, respawn } from './players.ts';
import { createRoom, idleInput, rooms, type Member } from './rooms.ts';
import { simulate } from './simulation.ts';
import { planToWorld } from '../../../packages/shared/src/venue.ts';
function at(x: number, z: number) {
  const p = planToWorld([x, z]);
  return { x: p[0], y: 0, z: p[1] };
}

const now = 10000;
function fixture(weapon: WeaponId) {
  const a = newPlayer('a', 'Alice', 0, now),
    b = newPlayer('b', 'Bob', 1, now);
  a.weapon = weapon;
  a.position = at(830, 450);
  a.yaw = 0;
  b.position = { x: a.position.x + 0.65, y: 0, z: a.position.z - 2 };
  b.protectedUntil = 0;
  return { a, b };
}
function member(player: ReturnType<typeof newPlayer>): Member {
  return {
    player,
    token: player.id,
    socketId: player.id,
    disconnectedAt: 0,
    input: idleInput(),
    lastInputAt: now,
    lastShot: 0,
    lastReceivedSeq: -1,
    rateStart: now,
    rateCount: 0,
  };
}
test('random rolls cover the arsenal and always exclude the previous gun', () => {
  for (const previous of WEAPON_IDS) {
    const rolls = Array.from({ length: 7 }, (_, i) => rollWeapon(previous, () => (i + 0.5) / 7));
    assert.equal(new Set(rolls).size, 7);
    assert.ok(!rolls.includes(previous));
  }
  assert.equal(isWeaponId('__proto__'), false);
  assert.equal(isWeaponId('constructor'), false);
  for (const weapon of WEAPON_IDS) assert.ok(isWeaponId(weapon));
});
test('each weapon enforces its own cooldown, with no firing while dead or knocked down', () => {
  for (const id of WEAPON_IDS) {
    const { a } = fixture(id),
      interval = WEAPONS[id].interval;
    assert.equal(shoot(a, [], now + interval - 1, now), null, id);
    assert.ok(shoot(a, [], now + interval, now), id);
    a.knockUntil = now + 10000;
    assert.equal(shoot(a, [], now, 0), null);
    a.knockUntil = 0;
    a.hp = 0;
    assert.equal(shoot(a, [], now, 0), null);
  }
});
test('hits keep the gun; a confirmed kill changes it once and retains original shot metadata', () => {
  const { a, b } = fixture('pistol');
  assert.equal(shoot(a, [a, b], now, 0)?.hit, b.id);
  assert.equal(a.weapon, 'pistol');
  assert.equal(a.score, 0);
  shoot(a, [a, b], now + 300, now);
  const killed = shoot(a, [a, b], now + 600, now + 300)!;
  assert.equal(a.score, 1);
  assert.notEqual(a.weapon, 'pistol');
  assert.equal(killed.weapon, 'pistol');
  assert.deepEqual(killed.kills, [b.id]);
  shoot(a, [a, b], now + 3000, 0);
  assert.equal(a.score, 1);
  assert.equal(b.deaths, 1);
});
test('sniper one-shots; shotgun emits seven pellets and credits every elimination', () => {
  const { a, b } = fixture('sniper');
  assert.equal(shoot(a, [a, b], now, 0)?.killed, true);
  assert.equal(b.hp, 0);
  const f = fixture('confetti'),
    c = newPlayer('c', 'Charlie', 2, now);
  c.position = { x: f.a.position.x + 0.65, y: 0, z: f.a.position.z - 4 };
  c.protectedUntil = 0;
  const shot = shoot(f.a, [f.a, f.b, c], now, 0, () => 0.5)!;
  assert.equal(shot.trails?.length, 7);
  assert.equal(f.a.score, 2);
  assert.deepEqual(shot.kills, [f.b.id, c.id]);
});
test('fart cannon damages a short forward cone, respects spawn protection and ignores enemies behind it', () => {
  const { a, b } = fixture('fart'),
    c = newPlayer('c', 'Behind', 2, now);
  c.position = { x: a.position.x + 0.65, y: 0, z: a.position.z + 2 };
  c.protectedUntil = 0;
  shoot(a, [a, b, c], now, 0);
  assert.equal(b.hp, 1);
  assert.equal(c.hp, 3);
  b.protectedUntil = now + 1000;
  shoot(a, [a, b], now + 700, 0);
  assert.equal(b.hp, 1);
  b.position.z = a.position.z - 8;
  b.protectedUntil = 0;
  shoot(a, [a, b], now + 2000, 0);
  assert.equal(b.hp, 1, 'outside the six-metre cone');
});
test('rockets fly before damaging, can be dodged, and detonate once on the server', () => {
  const { a, b } = fixture('rpg'),
    room = createRoom(now),
    ma = member(a);
  ma.input.fire = true;
  room.members.set(a.id, ma);
  room.members.set(b.id, member(b));
  const [flight] = simulate(room, now);
  assert.ok(flight.travelMs! > 0);
  assert.equal(b.hp, 3);
  assert.equal(room.projectiles.length, 1);
  ma.input.fire = false;
  assert.deepEqual(simulate(room, now + flight.travelMs! - 1), []);
  const impact = simulate(room, now + flight.travelMs! + 1);
  assert.equal(impact[0].impact, true);
  assert.equal(b.hp, 0);
  assert.equal(room.projectiles.length, 0);
  assert.equal(a.score, 1);
  assert.equal(room.feed[0].weapon, 'rpg');
  assert.deepEqual(simulate(room, now + 200), []);
  assert.equal(a.score, 1);
  rooms.delete(room.code);
  const other = fixture('rpg');
  const dodge = shoot(other.a, [other.a, other.b], now, 0)!;
  other.b.position.z += 8;
  assert.deepEqual(explode(dodge, other.a, [other.a, other.b], now + dodge.travelMs!).hits, []);
});
test('explosion splash and stink cones cannot pass through arena walls', () => {
  const { a, b } = fixture('rpg');
  b.position = at(690, 430);
  const flight = shoot(a, [], now, 0)!;
  flight.to = { ...at(642, 430), y: 1 };
  assert.deepEqual(explode(flight, a, [a, b], now + 1000).hits, []);
  a.weapon = 'fart';
  a.position = at(610, 430);
  a.yaw = -Math.PI / 2;
  assert.deepEqual(shoot(a, [a, b], now, 0)?.hits, []);
  assert.equal(b.hp, 3);
});
test('spawns get a valid random weapon and deaths/respawns do not reroll it', () => {
  const p = newPlayer('p', 'Pet', 0, now);
  assert.ok(isWeaponId(p.weapon));
  p.weapon = 'laser';
  p.hp = 0;
  respawn(p, [p], now + 3000);
  assert.equal(p.weapon, 'laser');
});
