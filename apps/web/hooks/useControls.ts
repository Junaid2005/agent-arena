'use client';
import { useEffect } from 'react';
import { controls, unlockAudio } from '../lib/store';
export function useControls(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const keys = new Set<string>();
    const update = () => {
      controls.x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      controls.z = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input,textarea')) return;
      if (['Space', 'Tab', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
      unlockAudio();
      keys.add(e.code);
      update();
      if (!e.repeat) {
        if (e.code === 'Space') controls.jump = true;
        if (e.code.startsWith('Shift')) controls.dive = true;
        if (e.code === 'KeyR') controls.stumble = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      update();
    };
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        controls.yaw -= e.movementX * 0.0024;
        controls.pitch = Math.max(-1.2, Math.min(1.2, controls.pitch - e.movementY * 0.0024));
      }
    };
    const press = (e: MouseEvent) => {
      if (
        e.button !== 0 ||
        !(e.target instanceof HTMLCanvasElement) ||
        matchMedia('(pointer: coarse)').matches
      )
        return;
      unlockAudio();
      if (!document.pointerLockElement) {
        void e.target.requestPointerLock()?.catch(() => {});
      } else controls.fire = true;
    };
    const release = () => {
      controls.fire = false;
    };
    const reset = () => {
      keys.clear();
      controls.x = 0;
      controls.z = 0;
      controls.fire = false;
    };
    const lock = () => {
      if (!document.pointerLockElement) reset();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', press);
    window.addEventListener('mouseup', release);
    window.addEventListener('blur', reset);
    document.addEventListener('pointerlockchange', lock);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', press);
      window.removeEventListener('mouseup', release);
      window.removeEventListener('blur', reset);
      document.removeEventListener('pointerlockchange', lock);
      reset();
    };
  }, [active]);
}
