import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canalPoint, canalYaw } from '../../../packages/shared/src/roomThree.ts';
import { TOUR, TOUR_STOPS, tourPosition, tourRoom, walkTour } from '../../../packages/shared/src/tour.ts';

test('Canal Room retains a continuous aisle with all furniture solid', () => {
  const [x, , z] = canalPoint(0.06, 0.78), end = canalPoint(0.93, 0.78);
  const p = { x, y: 0, z }, distance = Math.hypot(end[0] - x, end[2] - z);
  const a = canalPoint(0, 0.78), b = canalPoint(1, 0.78);
  const yaw = Math.atan2(a[0] - b[0], a[2] - b[2]);
  for (let i = 0; i < Math.floor(distance / TOUR.walkSpeed * 60); i++) walkTour(p, 0, -1, yaw, 1 / 60, false, true);
  assert.ok(Math.hypot(p.x - end[0], p.z - end[2]) < 0.05, 'a full-size visitor can traverse the tapered room');
  assert.equal(tourRoom(p)?.id, 'canal');
  assert.ok(Number.isFinite(canalYaw()));
});

test('locked rooms have no tour shortcut that bypasses their doors', () => {
  for (let i = 0; i < TOUR_STOPS.length; i++) {
    assert.ok(!['kitchen', 'studio', 'toilets', 'recording'].includes(tourRoom(tourPosition(i))?.id ?? ''), TOUR_STOPS[i].name);
  }
});
