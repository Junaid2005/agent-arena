import { ARENA, HEIGHT, RADIUS, SPEED, MAP_BOUNDS } from './constants.ts';
import type { Input, Player } from './types.ts';
import { boxLocal, circleBoxOverlap, resolveCircleBox } from './geometry.ts';
export function floorAt(x: number, z: number, y: number) {
  let floor = 0;
  for (const b of ARENA) {
    const [, by] = b.position,
      [sx, sy, sz] = b.size;
    const local = boxLocal({ x, y, z }, b);
    if (Math.abs(local.x) < sx / 2 + RADIUS * 0.6 && Math.abs(local.z) < sz / 2 + RADIUS * 0.6) {
      const top =
        b.kind === 'ramp' ? Math.max(0, Math.min(sy, ((sz / 2 - local.z) / sz) * sy)) : by + sy / 2;
      if (top <= y + 0.24) floor = Math.max(floor, top);
    }
  }
  return floor;
}
export function movePlayer(p: Player, input: Input, dt: number, now: number) {
  if (p.hp <= 0) return;
  p.yaw = input.yaw;
  p.pitch = input.pitch;
  p.seq = input.seq;
  if (input.stumble && p.grounded && now > p.knockUntil + 1200) p.knockUntil = now + 900;
  if (input.dive && p.grounded && now > p.diveUntil + 1100) p.diveUntil = now + 500;
  const knock = now < p.knockUntil,
    dive = now < p.diveUntil;
  const len = Math.max(1, Math.hypot(input.x, input.z));
  let vx = ((input.x * Math.cos(input.yaw) + input.z * Math.sin(input.yaw)) / len) * SPEED;
  let vz = ((-input.x * Math.sin(input.yaw) + input.z * Math.cos(input.yaw)) / len) * SPEED;
  if (knock) {
    vx *= 0.12;
    vz *= 0.12;
  }
  if (dive) {
    vx = -Math.sin(input.yaw) * 11;
    vz = -Math.cos(input.yaw) * 11;
  }
  p.moving = Math.hypot(vx, vz) > 0.2;
  if (input.jump && p.grounded && !knock) {
    p.vy = 7;
    p.grounded = false;
  }
  p.vy -= 19 * dt;
  const oldY = p.position.y;
  p.position.y += p.vy * dt;
  if (p.vy > 0)
    for (const b of ARENA) {
      const bottom = b.position[1] - b.size[1] / 2;
      if (
        oldY + HEIGHT <= bottom &&
        p.position.y + HEIGHT > bottom &&
        circleBoxOverlap(p.position, RADIUS, b)
      ) {
        p.position.y = bottom - HEIGHT;
        p.vy = 0;
      }
    }
  // Substeps prevent fast dives from tunnelling through thin or diagonal walls.
  const steps = Math.max(1, Math.ceil((Math.hypot(vx, vz) * dt) / (RADIUS / 2)));
  for (let step = 0; step < steps; step++) {
    p.position.x += (vx * dt) / steps;
    p.position.z += (vz * dt) / steps;
    for (let pass = 0; pass < 3; pass++)
      for (const b of ARENA) {
        if (b.kind === 'ramp') continue;
        const top = b.position[1] + b.size[1] / 2;
        const bottom = b.position[1] - b.size[1] / 2;
        if (oldY >= top - 0.12 || p.position.y + HEIGHT <= bottom) continue;
        if (circleBoxOverlap(p.position, RADIUS, b)) resolveCircleBox(p.position, RADIUS, b);
      }
  }
  p.position.x = Math.max(MAP_BOUNDS.minX + 0.6, Math.min(MAP_BOUNDS.maxX - 0.6, p.position.x));
  p.position.z = Math.max(MAP_BOUNDS.minZ + 0.6, Math.min(MAP_BOUNDS.maxZ - 0.6, p.position.z));
  const floor = floorAt(p.position.x, p.position.z, Math.max(oldY, p.position.y));
  if (p.position.y <= floor && p.vy <= 0) {
    p.position.y = floor;
    p.vy = 0;
    p.grounded = true;
  } else p.grounded = false;
}
