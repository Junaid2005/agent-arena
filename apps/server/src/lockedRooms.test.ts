import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKED_ROOM_DOORS } from '../../../packages/shared/src/lockedRooms.ts';
import {
  boxLocal,
  circleBoxOverlap,
  rayOrientedBox,
} from '../../../packages/shared/src/geometry.ts';
import { ARENA, DT, RADIUS } from '../../../packages/shared/src/constants.ts';
import { movePlayer } from '../../../packages/shared/src/movement.ts';
import { newPlayer } from './players.ts';
import { idleInput } from './rooms.ts';

test('rooms 4, 7, 8 and 10 have visible shared panels that block entry from either side', () => {
  assert.deepEqual(
    [...new Set(LOCKED_ROOM_DOORS.map((door) => door.room))].sort((a, b) => a - b),
    [4, 7, 8, 10],
  );
  for (const { panel } of LOCKED_ROOM_DOORS) {
    assert.ok(ARENA.includes(panel), panel.id);
    const angle = panel.rotation ?? 0;
    const normal = { x: Math.sin(angle), y: 0, z: Math.cos(angle) };
    for (const side of [-1, 1]) {
      const start = {
        x: panel.position[0] + normal.x * side,
        y: 0,
        z: panel.position[2] + normal.z * side,
      };
      const direction = { x: -normal.x * side, y: 0, z: -normal.z * side };
      assert.notEqual(rayOrientedBox({ ...start, y: 1.35 }, direction, panel, 2), null, panel.id);
      const p = newPlayer(panel.id, 'Door check', 0, 10000);
      p.position = start;
      for (let i = 0; i < 20; i++)
        movePlayer(p, { ...idleInput(), x: direction.x, z: direction.z }, DT, 10000 + i * 40);
      const local = boxLocal(p.position, panel);
      assert.ok(local.z * side >= panel.size[2] / 2 + RADIUS - 1e-6, panel.id);
      assert.ok(!circleBoxOverlap(p.position, RADIUS, panel), panel.id);
    }
  }
});
