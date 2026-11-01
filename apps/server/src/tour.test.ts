import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR, TOUR_SOLIDS, TOUR_STOPS, tourPosition, tourRoom, walkTour } from '../../../packages/shared/src/tour.ts';
import { TIMBER_FACE } from '../../../packages/shared/src/roomOne.ts';
import { STAGE } from '../../../packages/shared/src/stage.ts';
import { FURNITURE_SOLIDS, ROOM_TWO_FURNITURE } from '../../../packages/shared/src/roomTwoDetails.ts';
import { circleBoxOverlap } from '../../../packages/shared/src/geometry.ts';
import { planToWorld, VENUE_CALIBRATION } from '../../../packages/shared/src/venue.ts';

test('tour walks in real metres per second with fixed human eye level and tall warehouse proportions', () => {
  const [x, z] = planToWorld([900, 450]);
  const p = { x, y: 0, z };
  for (let i = 0; i < 60; i++) walkTour(p, -1, 0, 0, 1 / 60);
  assert.ok(Math.abs(p.x - (x - 1.4)) < 1e-8);
  assert.equal(p.y, 0);
  assert.equal(TOUR.eyeHeight, 1.65);
  assert.equal(VENUE_CALIBRATION.wallHeight, 5.5);
  assert.ok(VENUE_CALIBRATION.wallHeight > TOUR.eyeHeight * 3);
  const diagonal = { x, y: 0, z };
  for (let i = 0; i < 60; i++) walkTour(diagonal, -1, -1, 0, 1 / 60);
  assert.ok(Math.abs(Math.hypot(diagonal.x - x, diagonal.z - z) - TOUR.walkSpeed) < 1e-8);
});

test('tour destinations are clear of geometry and identify the expected room', () => {
  const expected = ['foyer', 'boat', 'atrium', 'canal', 'bar', 'club', 'workshop', 'studio', 'recording', 'yard', 'lightwell', 'lightwell', 'lightwell', 'lightwell'];
  for (let i = 0; i < TOUR_STOPS.length; i++) {
    const p = tourPosition(i);
    assert.equal(tourRoom(p)?.id, expected[i]);
    for (const box of [...TOUR_SOLIDS, ...FURNITURE_SOLIDS].filter((b) => b.position[1] - b.size[1] / 2 < TOUR.bodyHeight))
      assert.ok(!circleBoxOverlap(p, TOUR.radius, box), `${TOUR_STOPS[i].name} overlaps ${box.id}`);
  }
});

test('tour cannot walk through partitions and caps movement after long frame stalls', () => {
  const [x, z] = planToWorld([680, 450]);
  const p = { x, y: 0, z };
  for (let i = 0; i < 600; i++) walkTour(p, -1, 0, 0, 1 / 60);
  assert.ok(p.x > planToWorld([650, 450])[0]);
  const before = tourPosition(); const after = { ...before };
  walkTour(after, 0, -1, 0, 10);
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) <= TOUR.walkSpeed * 0.1 + 1e-8);
});

test('tour steps onto the stage deck, stops at the screen, and returns to ground level', () => {
  const p = tourPosition(TOUR_STOPS.findIndex((stop) => stop.name === 'Stage / room 2'));
  for (let i = 0; i < 240; i++) walkTour(p, 0, -1, 0, 1 / 60);
  assert.equal(p.y, STAGE.height);
  const screen = TOUR_SOLIDS.find((box) => box.id === 'event-screen')!;
  assert.ok(p.z > screen.position[2] + screen.size[2] / 2, 'cannot walk through the projection screen');
  assert.ok(!circleBoxOverlap(p, TOUR.radius, screen));
  for (let i = 0; i < 240; i++) walkTour(p, 0, 1, 0, 1 / 60);
  assert.equal(p.y, 0, 'eye height returns to the ground-floor reference off the deck');
});

test('furniture can be inspected without obstruction or made physically solid', () => {
  const table = ROOM_TWO_FURNITURE.find((item) => item.type === 'table')!;
  const [x, z] = planToWorld(table.point);
  const free = { x, y: 0, z: z + 2 }, solid = { ...free };
  for (let i = 0; i < 120; i++) {
    walkTour(free, 0, -1, 0, 1 / 60, false, false);
    walkTour(solid, 0, -1, 0, 1 / 60, false, true);
  }
  assert.ok(Math.abs(free.z - (z + 2 - 2.8)) < 1e-8, 'inspection movement passes through furniture');
  assert.ok(solid.z - free.z > 1.5, 'solid mode stops at the visible seating/table arrangement');
  assert.equal(free.y, 0, 'tables do not become walkable stages');
});

test('the closed timber leaves stop walking at their visible face', () => {
  const front = { x: Math.sin(TIMBER_FACE.yaw), z: Math.cos(TIMBER_FACE.yaw) };
  const p = { x: TIMBER_FACE.x + front.x * 1.5, y: 0, z: TIMBER_FACE.z + front.z * 1.5 };
  for (let i = 0; i < 120; i++) walkTour(p, 0, -1, TIMBER_FACE.yaw, 1 / 60);
  const depth = front.x * (p.x - TIMBER_FACE.x) + front.z * (p.z - TIMBER_FACE.z);
  assert.ok(depth >= 0.18 + 0.06 + TOUR.radius - 0.002, 'cannot pass through the visible timber leaves');
});
