import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playSound, setAudioMuted, spatialMix, unlockAudio } from './audio';

const origin = { x: 0, y: 0, z: 0 };
test('remote sound fades to silence at 28 metres, including vertical distance', () => {
  assert.equal(spatialMix(origin, origin, 0).volume, 1);
  assert.equal(spatialMix({ x: 14, y: 0, z: 0 }, origin, 0).volume, 0.25);
  assert.equal(spatialMix({ x: 0, y: 28, z: 0 }, origin, 0).volume, 0);
  assert.equal(spatialMix({ x: 100, y: 0, z: 0 }, origin, 0).volume, 0);
});
test('stereo follows the listener yaw and leaves front/back sounds centered', () => {
  const right = { x: 10, y: 0, z: 0 };
  assert.equal(spatialMix(right, origin, 0).pan, 1);
  assert.equal(spatialMix(right, origin, Math.PI).pan, -1);
  assert.ok(Math.abs(spatialMix(right, origin, Math.PI / 2).pan) < 1e-10);
  assert.equal(spatialMix({ x: 0, y: 0, z: -10 }, origin, 0).pan, 0);
  assert.equal(spatialMix({ x: 0, y: 0, z: 10 }, origin, 0).pan, 0);
});
test('coincident sources have a finite, centered stereo mix', () => {
  assert.deepEqual(spatialMix(origin, origin, 1), { volume: 1, pan: 0 });
});
test('audio is optional during server rendering and before a user gesture', () => {
  assert.doesNotThrow(() => {
    unlockAudio();
    playSound('shot');
    setAudioMuted(true);
    playSound('out');
    setAudioMuted(false);
  });
});
