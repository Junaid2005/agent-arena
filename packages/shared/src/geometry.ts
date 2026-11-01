import type { Box, Vec3 } from './types.ts';

/** Three.js Y-rotation convention, shared by Rapier, movement, camera and rays. */
export function boxLocal(point: Vec3, box: Box, direction = false): Vec3 {
  const angle = box.rotation ?? 0, c = Math.cos(angle), s = Math.sin(angle);
  const x = point.x - (direction ? 0 : box.position[0]);
  const z = point.z - (direction ? 0 : box.position[2]);
  return { x: c * x - s * z, y: point.y - (direction ? 0 : box.position[1]), z: s * x + c * z };
}
export function circleBoxOverlap(point: Vec3, radius: number, box: Box) {
  const p = boxLocal(point, box);
  const dx = p.x - Math.max(-box.size[0] / 2, Math.min(box.size[0] / 2, p.x));
  const dz = p.z - Math.max(-box.size[2] / 2, Math.min(box.size[2] / 2, p.z));
  return dx * dx + dz * dz < radius * radius - 1e-10;
}
/** Resolve a horizontal capsule cross-section against an oriented rectangle. */
export function resolveCircleBox(point: Vec3, radius: number, box: Box) {
  const p = boxLocal(point, box), hx = box.size[0] / 2, hz = box.size[2] / 2;
  const qx = Math.max(-hx, Math.min(hx, p.x)), qz = Math.max(-hz, Math.min(hz, p.z));
  const dx = p.x - qx, dz = p.z - qz, distance = Math.hypot(dx, dz);
  if (distance >= radius) return;
  let pushX: number, pushZ: number;
  if (distance > 1e-8) {
    pushX = dx * (radius - distance) / distance;
    pushZ = dz * (radius - distance) / distance;
  } else if (hx - Math.abs(p.x) < hz - Math.abs(p.z)) {
    pushX = (p.x < 0 ? -1 : 1) * (hx - Math.abs(p.x) + radius); pushZ = 0;
  } else {
    pushX = 0; pushZ = (p.z < 0 ? -1 : 1) * (hz - Math.abs(p.z) + radius);
  }
  const c = Math.cos(box.rotation ?? 0), s = Math.sin(box.rotation ?? 0);
  point.x += c * pushX + s * pushZ;
  point.z += -s * pushX + c * pushZ;
}
/** Ray distance in metres; works for rotated walls, pillars and overhead lintels. */
export function rayOrientedBox(origin: Vec3, direction: Vec3, box: Box, maxDistance = 80): number | null {
  const o = boxLocal(origin, box), d = boxLocal(direction, box, true);
  let near = 0, far = maxDistance;
  for (const [axis, half] of [['x', box.size[0] / 2], ['y', box.size[1] / 2], ['z', box.size[2] / 2]] as const) {
    if (Math.abs(d[axis]) < 1e-8) {
      if (Math.abs(o[axis]) > half) return null;
      continue;
    }
    let a = (-half - o[axis]) / d[axis], b = (half - o[axis]) / d[axis];
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return null;
  }
  return near;
}
