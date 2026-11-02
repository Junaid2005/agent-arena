import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA,
  ARCHITECTURE,
  SPAWNS,
  HEIGHT,
  RADIUS,
} from '../../../packages/shared/src/constants.ts';
import { circleBoxOverlap } from '../../../packages/shared/src/geometry.ts';
import { tourRoom } from '../../../packages/shared/src/tour.ts';
import {
  FURNITURE_SOLIDS,
  visibleInCurrentEvent,
} from '../../../packages/shared/src/roomTwoDetails.ts';
import { registeredStageSolids } from '../../../packages/shared/src/stage.ts';
import {
  ENTRANCE_FURNITURE_SOLIDS,
  ENTRANCE_DOOR_SOLIDS,
} from '../../../packages/shared/src/entranceFoyer.ts';

test('all twelve game spawns are in public areas and clear of the furnished map', () => {
  assert.equal(SPAWNS.length, 12);
  for (const [index, [x, y, z]] of SPAWNS.entries()) {
    const position = { x, y, z },
      room = tourRoom(position);
    assert.ok(room, `spawn ${index} must lie within a room`);
    assert.ok(
      room.access !== 'private' && room.access !== 'storage',
      `spawn ${index} in ${room.id}`,
    );
    for (const b of ARENA) {
      if (b.position[1] - b.size[1] / 2 >= y + HEIGHT || b.position[1] + b.size[1] / 2 <= y)
        continue;
      assert.ok(!circleBoxOverlap(position, RADIUS, b), `spawn ${index} overlaps ${b.id}`);
    }
  }
});
test('rendered event fixtures share the authoritative collision set without duplicates', () => {
  const ids = new Set(ARENA.map((b) => b.id));
  assert.equal(ids.size, ARENA.length);
  for (const b of [
    ...ARCHITECTURE.filter(visibleInCurrentEvent),
    ...FURNITURE_SOLIDS,
    ...registeredStageSolids(),
    ...ENTRANCE_FURNITURE_SOLIDS,
    ...ENTRANCE_DOOR_SOLIDS,
  ]) {
    assert.ok(ids.has(b.id), b.id);
  }
  assert.ok(
    !ids.has('container') && !ids.has('timber'),
    'unrendered historical storage must not block play',
  );
});
