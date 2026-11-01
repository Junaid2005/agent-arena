import { test } from 'node:test';
import assert from 'node:assert/strict';
import { petFrame } from './pet-animation';
import { PETS, PET_SHEET, isPetId } from '../../../packages/shared/src/pets';
const idle = { hp: 3, grounded: true, moving: false, knockUntil: 0, diveUntil: 0 };
test('only built-in pet IDs are accepted, including every selectable character', () => {
  for (const pet of Object.keys(PETS)) assert.equal(isPetId(pet), true);
  for (const pet of ['toString', '__proto__', 'constructor', '', null, 1]) assert.equal(isPetId(pet), false);
  assert.equal(new Set(Object.values(PETS).map((p) => p.sprite)).size, 9);
});
test('pet animations use valid populated cells in the actual 8 by 9 sheets', () => {
  assert.deepEqual(PET_SHEET, { columns: 8, rows: 9 });
  for (let time = 0; time < 30; time += 0.07) {
    for (const state of [idle, { ...idle, moving: true }, { ...idle, grounded: false },
      { ...idle, knockUntil: 200 }, { ...idle, diveUntil: 200 }, { ...idle, hp: 0 }]) {
      const { row, column } = petFrame(state, 100, time, false);
      assert.ok(row >= 0 && row < PET_SHEET.rows);
      const frames = [6, 8, 8, 4, 5, 8, 6, 6, 6][row];
      assert.ok(column >= 0 && column < frames);
    }
  }
});
test('animation follows movement, facing, airborne, knockdown and elimination state', () => {
  assert.equal(petFrame(idle, 100, 0, false).row, 0);
  assert.equal(petFrame({ ...idle, moving: true }, 100, 0, false).row, 1);
  assert.equal(petFrame({ ...idle, moving: true }, 100, 0, true).row, 2);
  assert.equal(petFrame({ ...idle, grounded: false }, 100, 0, false).row, 4);
  assert.equal(petFrame({ ...idle, knockUntil: 200 }, 100, 0, false).row, 5);
  assert.deepEqual(petFrame({ ...idle, hp: 0 }, 100, 10, false), { row: 5, column: 2 });
});
