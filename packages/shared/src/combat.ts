import { ARENA, RESPAWN_MS } from './constants.ts';
import type { Player, Shot, Vec3 } from './types.ts';
import { WEAPONS, rollWeapon } from './weapons.ts';
import { rayOrientedBox } from './geometry.ts';

export function rayBox(o: Vec3, d: Vec3, min: Vec3, max: Vec3): number | null {
  let near = 0, far = 80;
  for (const a of ['x', 'y', 'z'] as const) {
    if (Math.abs(d[a]) < 1e-8) {
      if (o[a] < min[a] || o[a] > max[a]) return null;
      continue;
    }
    let t1 = (min[a] - o[a]) / d[a], t2 = (max[a] - o[a]) / d[a];
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1); far = Math.min(far, t2);
    if (near > far) return null;
  }
  return near;
}
function worldDistance(from: Vec3, d: Vec3, range: number) {
  let distance = range;
  for (const b of ARENA) {
    const t = rayOrientedBox(from, d, b);
    if (t !== null && t < distance) distance = t;
  }
  if (d.y < 0) distance = Math.min(distance, Math.max(0, -from.y / d.y));
  return distance;
}
const point = (o: Vec3, d: Vec3, t: number): Vec3 => ({ x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t });
function clearLine(from: Vec3, to: Vec3) {
  const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  if (length < 0.1) return true;
  const d = { x: (to.x - from.x) / length, y: (to.y - from.y) / length, z: (to.z - from.z) / length };
  return worldDistance(from, d, length) >= length - 0.03;
}
function hurt(p: Player, victim: Player, damage: number, shot: Shot, now: number) {
  if (victim.hp <= 0 || now < victim.protectedUntil) return;
  victim.hp = Math.max(0, victim.hp - damage);
  shot.hit ??= victim.id;
  if (!shot.hits!.includes(victim.id)) shot.hits!.push(victim.id);
  if (victim.hp === 0) {
    shot.killed = true;
    shot.kills!.push(victim.id);
    victim.deaths++;
    victim.respawnAt = now + RESPAWN_MS;
    p.score++;
    // Roll only on a confirmed server-owned elimination, never a hit or client request.
    p.weapon = rollWeapon(p.weapon);
  }
}
export function explode(flight: Shot, owner: Player, players: Player[], now: number): Shot {
  const shot: Shot = { ...flight, id: `${flight.id}:impact`, at: now, impact: true, travelMs: 0, hits: [], kills: [] };
  for (const q of players) {
    if (q.id === owner.id || q.hp <= 0 || now < q.protectedUntil) continue;
    const centre = { ...q.position, y: q.position.y + 0.9 };
    const distance = Math.hypot(centre.x - shot.to.x, centre.y - shot.to.y, centre.z - shot.to.z);
    if (distance <= 4 && clearLine(shot.to, centre)) hurt(owner, q, distance <= 2 ? 3 : 2, shot, now);
  }
  return shot;
}
export function shoot(p: Player, players: Player[], now: number, lastShot: number, random = Math.random): Shot | null {
  const weaponId = p.weapon, weapon = WEAPONS[weaponId];
  if (p.hp <= 0 || now - lastShot < weapon.interval || now < p.knockUntil) return null;
  const from = { x: p.position.x + Math.cos(p.yaw) * 0.65, y: p.position.y + 1.35, z: p.position.z - Math.sin(p.yaw) * 0.65 };
  const direction = (yaw: number, pitch: number) => ({ x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) });
  const aim = direction(p.yaw, p.pitch);
  const shot: Shot = { id: crypto.randomUUID(), shooter: p.id, from, to: from, weapon: weaponId, color: weapon.color, at: now, hits: [], kills: [], trails: [] };
  if (weaponId === 'fart') {
    shot.to = point(from, aim, worldDistance(from, aim, weapon.range));
    for (const q of players) {
      if (q.id === p.id || q.hp <= 0 || now < q.protectedUntil) continue;
      const centre = { ...q.position, y: q.position.y + 1 };
      const delta = { x: centre.x - from.x, y: centre.y - from.y, z: centre.z - from.z };
      const length = Math.hypot(delta.x, delta.y, delta.z);
      const facing = (delta.x * aim.x + delta.y * aim.y + delta.z * aim.z) / Math.max(length, 0.001);
      if (length <= weapon.range && facing >= 0.8 && clearLine(from, centre)) hurt(p, q, weapon.damage, shot, now);
    }
    return shot;
  }
  for (let i = 0; i < weapon.pellets; i++) {
    const d = direction(p.yaw + (i === 0 ? 0 : random() * 2 - 1) * weapon.spread,
      p.pitch + (i === 0 ? 0 : random() * 2 - 1) * weapon.spread);
    // Automatic weapons have a small spread even when emitting one round.
    const ray = weapon.pellets === 1 && weapon.spread > 0
      ? direction(p.yaw + (random() * 2 - 1) * weapon.spread, p.pitch + (random() * 2 - 1) * weapon.spread) : d;
    let distance = worldDistance(from, ray, weapon.range), hit: Player | undefined;
    for (const q of players) {
      if (q.id === p.id || q.hp <= 0 || now < q.protectedUntil) continue;
      const v = q.position;
      const t = rayBox(from, ray, { x: v.x - 0.38, y: v.y + 0.05, z: v.z - 0.38 }, { x: v.x + 0.38, y: v.y + 1.75, z: v.z + 0.38 });
      if (t !== null && t < distance) { distance = t; hit = q; }
    }
    const to = point(from, ray, weaponId === 'rpg' ? Math.max(0, distance - 0.06) : distance);
    shot.trails!.push(to);
    if (i === 0) shot.to = to;
    if (weaponId === 'rpg') {
      shot.travelMs = Math.max(80, distance / 20 * 1000);
      shot.blastRadius = 4;
    } else if (hit) hurt(p, hit, weapon.damage, shot, now);
  }
  return shot;
}
