import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atriumPoint, atriumRoofHeight, ROOM_FIVE } from '../../../packages/shared/src/roomFive.ts';
import { planToWorld, VENUE_ROOMS } from '../../../packages/shared/src/venue.ts';
import { walkTour } from '../../../packages/shared/src/tour.ts';

test('Atrium roof uses the existing plan corners and rises above both eaves', () => {
  const room = VENUE_ROOMS.find((r) => r.id === 'atrium')!;
  for (const [i, u, v] of [[0, 0, 0], [1, 1, 0], [2, 1, 1], [3, 0, 1]]) {
    const [x, , z] = atriumPoint(u, v);
    assert.deepEqual([x, z], planToWorld(room.outline[i]));
  }
  assert.equal(atriumRoofHeight(0), ROOM_FIVE.eaveHeight);
  assert.equal(atriumRoofHeight(1), ROOM_FIVE.eaveHeight);
  assert.ok(atriumRoofHeight(0.5) > atriumRoofHeight(0.2));
  assert.ok(atriumRoofHeight(0.2) > atriumRoofHeight(0));
  assert.equal(atriumRoofHeight(0.25), atriumRoofHeight(0.75));
});

test('Atrium central aisle stays walkable with solid room-5 furniture', () => {
  const [x, , z] = atriumPoint(0.04, 0.4), p = { x, y: 0, z };
  const end = atriumPoint(0.96, 0.4), yaw = Math.atan2(-(end[0] - x), -(end[2] - z));
  for (let i = 0; i < 900; i++) walkTour(p, 0, -1, yaw, 1 / 60, false, true);
  assert.ok(Math.abs(Math.hypot(p.x - x, p.z - z) - 21) < 1e-6, 'tables, sofas and chairs leave an end-to-end central route');
  assert.equal(p.y, 0);
});
