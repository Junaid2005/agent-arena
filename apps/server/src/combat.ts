import { ARENA, FIRE_INTERVAL, RESPAWN_MS } from '../../../packages/shared/src/constants.ts';
import type { Player, Shot, Vec3 } from '../../../packages/shared/src/types.ts';
import { rayOrientedBox } from '../../../packages/shared/src/geometry.ts';
import type { PetId } from '../../../packages/shared/src/pets.ts';
export function rayBox(o: Vec3, d: Vec3, min: Vec3, max: Vec3): number | null {
  let near = 0,
    far = 80;
  for (const a of ['x', 'y', 'z'] as const) {
    if (Math.abs(d[a]) < 1e-8) {
      if (o[a] < min[a] || o[a] > max[a]) return null;
      continue;
    }
    let t1 = (min[a] - o[a]) / d[a],
      t2 = (max[a] - o[a]) / d[a];
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far) return null;
  }
  return near;
}
export function shoot(p: Player, players: Player[], now: number, lastShot: number): Shot | null {
  if (p.hp <= 0 || now - lastShot < FIRE_INTERVAL || now < p.knockUntil) return null;
  const from = {
    x: p.position.x + Math.cos(p.yaw) * 0.65,
    y: p.position.y + 1.35,
    z: p.position.z - Math.sin(p.yaw) * 0.65,
  };
  const d = {
    x: -Math.sin(p.yaw) * Math.cos(p.pitch),
    y: Math.sin(p.pitch),
    z: -Math.cos(p.yaw) * Math.cos(p.pitch),
  };
  let distance = 65,
    hit: Player | undefined;
  // World geometry always occludes players. Ramps use conservative bounding boxes.
  for (const b of ARENA) {
    const t = rayOrientedBox(from, d, b);
    if (t !== null && t < distance) distance = t;
  }
  if (d.y < 0) {
    const t = -from.y / d.y;
    if (t > 0 && t < distance) distance = t;
  }
  for (const q of players) {
    if (q.id === p.id || q.hp <= 0 || now < q.protectedUntil) continue;
    const v = q.position;
    const t = rayBox(
      from,
      d,
      { x: v.x - 0.38, y: v.y + 0.05, z: v.z - 0.38 },
      { x: v.x + 0.38, y: v.y + 1.75, z: v.z + 0.38 },
    );
    if (t !== null && t < distance) {
      distance = t;
      hit = q;
    }
  }
  const shot: Shot = {
    id: crypto.randomUUID(),
    shooter: p.id,
    from,
    to: { x: from.x + d.x * distance, y: from.y + d.y * distance, z: from.z + d.z * distance },
    color: p.color,
    at: now,
  };
  if (hit) {
    hit.hp--;
    shot.hit = hit.id;
    if (hit.hp === 0) {
      shot.killed = true;
      hit.deaths++;
      hit.respawnAt = now + RESPAWN_MS;
      p.score++;
    }
  }
  return shot;
}

/** A deliberately slow, server-owned helper shot. Pets can only assist their living owner. */
export function petShoot(p: Player, players: Player[], now: number, lastShot: number): Shot | null {
  if (p.hp <= 0 || now - lastShot < 1750) return null;
  const target = players
    .filter((q) => q.id !== p.id && q.hp > 0 && now >= q.protectedUntil)
    .map((q) => ({ q, distance: Math.hypot(q.position.x - p.position.x, q.position.z - p.position.z) }))
    .filter(({ distance }) => distance < 18)
    .sort((a, b) => a.distance - b.distance)[0]?.q;
  if (!target) return null;
  const from = {
    x: p.position.x + Math.cos(p.yaw) * 0.78,
    y: p.position.y + 0.82,
    z: p.position.z + Math.sin(p.yaw) * 0.78,
  };
  const toTarget = {
    x: target.position.x - from.x,
    y: target.position.y + 0.95 - from.y,
    z: target.position.z - from.z,
  };
  const length = Math.hypot(toTarget.x, toTarget.y, toTarget.z);
  const d = { x: toTarget.x / length, y: toTarget.y / length, z: toTarget.z / length };
  let distance = Math.min(length, 22);
  for (const b of ARENA) {
    const t = rayOrientedBox(from, d, b);
    if (t !== null && t < distance) distance = t;
  }
  let hit: Player | undefined;
  for (const q of players) {
    if (q.id === p.id || q.hp <= 0 || now < q.protectedUntil) continue;
    const v = q.position;
    const t = rayBox(from, d, { x: v.x - 0.38, y: v.y + 0.05, z: v.z - 0.38 }, { x: v.x + 0.38, y: v.y + 1.75, z: v.z + 0.38 });
    if (t !== null && t < distance) {
      distance = t;
      hit = q;
    }
  }
  const shot: Shot = {
    id: crypto.randomUUID(), shooter: p.id, from,
    to: { x: from.x + d.x * distance, y: from.y + d.y * distance, z: from.z + d.z * distance },
    color: '#b9fa44', pet: p.pet as PetId, at: now,
  };
  if (hit) {
    hit.hp--;
    shot.hit = hit.id;
    if (hit.hp === 0) {
      shot.killed = true;
      hit.deaths++;
      hit.respawnAt = now + RESPAWN_MS;
      p.score++;
    }
  }
  return shot;
}
