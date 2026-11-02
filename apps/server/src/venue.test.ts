import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA, DT, HEIGHT, RADIUS } from '../../../packages/shared/src/constants.ts';
import {
  PLAN_WALLS,
  VENUE_CALIBRATION,
  VENUE_ROOMS,
  planToWorld,
  polygonArea,
} from '../../../packages/shared/src/venue.ts';
import {
  boxLocal,
  circleBoxOverlap,
  rayOrientedBox,
} from '../../../packages/shared/src/geometry.ts';
import { movePlayer } from '../../../packages/shared/src/movement.ts';
import { newPlayer } from './players.ts';
import { idleInput } from './rooms.ts';

test('uniform calibration preserves source proportions and the published A3 / 1:200 scale', () => {
  const scale = VENUE_CALIBRATION.metresPerPixel;
  assert.equal(VENUE_CALIBRATION.status, 'published-drawing-scale');
  assert.ok(Math.abs(scale * 1406 - 84) < 1e-8);
  const atriumArea = polygonArea(VENUE_ROOMS.find((r) => r.id === 'atrium')!.outline) * scale ** 2;
  assert.ok(
    atriumArea > 200 && atriumArea < 250,
    'published drawing scale and rounded brochure areas are distinct',
  );
  const a = planToWorld([300, 400]),
    b = planToWorld([400, 500]);
  assert.equal(b[0] - a[0], b[1] - a[1]);
  for (const w of PLAN_WALLS) {
    let end = 0;
    for (const [from, to] of w.openings ?? []) {
      assert.ok(from >= end && to > from && to <= Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]));
      end = to;
    }
  }
});

test('every traced opening clears the player and remains a ray-passable gap below its lintel', () => {
  for (const wall of PLAN_WALLS.filter((w) => !w.gate)) {
    const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
    for (const [i, [from, to]] of (wall.openings ?? []).entries()) {
      if (wall.lockedOpenings?.includes(i)) continue;
      const t = (from + to) / 2 / length;
      const [x, z] = planToWorld([
        wall.a[0] + (wall.b[0] - wall.a[0]) * t,
        wall.a[1] + (wall.b[1] - wall.a[1]) * t,
      ]);
      const p = { x, y: 0, z };
      const blocking = ARENA.filter(
        (b) =>
          b.position[1] - b.size[1] / 2 < HEIGHT &&
          b.position[1] + b.size[1] / 2 > 0 &&
          circleBoxOverlap(p, RADIUS, b),
      );
      assert.deepEqual(
        blocking.map((b) => b.id),
        [],
        `${wall.id} opening ${i} is obstructed`,
      );
      const normal = {
        x: -(wall.b[1] - wall.a[1]) / length,
        y: 0,
        z: (wall.b[0] - wall.a[0]) / length,
      };
      const origin = { x: x - normal.x, y: 1.35, z: z - normal.z };
      for (const box of ARENA.filter((b) => b.id.startsWith(`${wall.id}-`))) {
        assert.equal(rayOrientedBox(origin, normal, box, 2), null, `shot blocked in ${wall.id}`);
      }
    }
  }
});

test('diagonal wall collision and hitscan use the wall face instead of its axis-aligned bounds', () => {
  const wall = ARENA.find((b) => b.id === 'club-diagonal-end')!;
  const angle = wall.rotation!,
    normal = { x: Math.sin(angle), y: 0, z: Math.cos(angle) };
  const centre = { x: wall.position[0], y: 0, z: wall.position[2] };
  const start = { x: centre.x + normal.x * 1.5, y: 0, z: centre.z + normal.z * 1.5 };
  const hit = rayOrientedBox({ ...start, y: 1.35 }, { x: -normal.x, y: 0, z: -normal.z }, wall);
  assert.ok(hit !== null && Math.abs(hit - (1.5 - wall.size[2] / 2)) < 1e-8);
  const p = newPlayer('trace', 'Trace', 0, 10000);
  p.position = start;
  for (let i = 0; i < 30; i++)
    movePlayer(p, { ...idleInput(), x: -normal.x, z: -normal.z }, DT, 10000 + i * 40);
  const local = boxLocal(p.position, wall);
  assert.ok(local.z >= wall.size[2] / 2 + RADIUS - 1e-6, 'cannot cross angled partition');
  assert.ok(!circleBoxOverlap(p.position, RADIUS, wall));
});

test('the former rectangular boundary no longer blocks a traced long-room route', () => {
  const p = newPlayer('long-room', 'Walker', 0, 10000);
  const [x, z] = planToWorld([960, 430]);
  p.position = { x, y: 0, z };
  for (let i = 0; i < 55; i++) movePlayer(p, { ...idleInput(), x: -1 }, DT, 10000 + i * 40);
  assert.ok(Math.abs(p.position.x - (x - 55 * 6 * DT)) < 1e-6);
});

test('jumping under a doorway stops at the shared lintel underside', () => {
  const lintel = ARENA.find((b) => b.id === 'canal-atrium-lintel-0')!;
  const p = newPlayer('door-headroom', 'Jumper', 0, 10000);
  p.position = { x: lintel.position[0], y: 0, z: lintel.position[2] };
  const bottom = lintel.position[1] - lintel.size[1] / 2;
  let highest = 0;
  for (let i = 0; i < 12; i++) {
    movePlayer(p, { ...idleInput(), jump: i === 0 }, DT, 10000 + i * 40);
    highest = Math.max(highest, p.position.y);
    assert.ok(p.position.y + HEIGHT <= bottom + 1e-8);
  }
  assert.ok(highest > 0 && highest <= bottom - HEIGHT + 1e-8);
});
