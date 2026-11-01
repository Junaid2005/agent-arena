'use client';
import { useRef, useState, type PointerEvent } from 'react';
import { ArrowUp, Crosshair, MoveDownRight, Zap } from 'lucide-react';
import { controls, unlockAudio } from '../../lib/store';
export function MobileControls() {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const moving = useRef<number | null>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (moving.current !== e.pointerId) return;
    const box = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - box.left - box.width / 2) / 42,
      y = (e.clientY - box.top - box.height / 2) / 42;
    const len = Math.max(1, Math.hypot(x, y));
    x /= len;
    y /= len;
    controls.x = x;
    controls.z = y;
    setStick({ x: x * 37, y: y * 37 });
  };
  const releaseMove = (e: PointerEvent<HTMLDivElement>) => {
    if (moving.current === e.pointerId) {
      moving.current = null;
      controls.x = 0;
      controls.z = 0;
      setStick({ x: 0, y: 0 });
    }
  };
  const releaseLook = (e: PointerEvent<HTMLDivElement>) => {
    if (look.current?.id === e.pointerId) look.current = null;
  };
  return (
    <div className="touch-controls">
      <div
        className="look-zone"
        aria-label="Drag to look and aim"
        onPointerDown={(e) => {
          unlockAudio();
          e.currentTarget.setPointerCapture(e.pointerId);
          look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const l = look.current;
          if (l?.id !== e.pointerId) return;
          controls.yaw -= (e.clientX - l.x) * 0.006;
          controls.pitch = Math.max(
            -1.2,
            Math.min(1.2, controls.pitch - (e.clientY - l.y) * 0.006),
          );
          l.x = e.clientX;
          l.y = e.clientY;
        }}
        onPointerUp={releaseLook}
        onPointerCancel={releaseLook}
      >
        <span>DRAG TO AIM</span>
      </div>
      <div
        className="joystick"
        role="slider"
        aria-label="Move joystick"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={stick.x / 37}
        onPointerDown={(e) => {
          unlockAudio();
          e.currentTarget.setPointerCapture(e.pointerId);
          moving.current = e.pointerId;
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={releaseMove}
        onPointerCancel={releaseMove}
      >
        <div className="joystick-ring" />
        <div
          className="joystick-thumb"
          style={{ transform: `translate(${stick.x}px,${stick.y}px)` }}
        >
          <span>✣</span>
        </div>
        <label>MOVE</label>
      </div>
      <button
        className="touch-fire"
        aria-label="Fire paintball"
        onPointerDown={(e) => {
          e.preventDefault();
          unlockAudio();
          e.currentTarget.setPointerCapture(e.pointerId);
          controls.fire = true;
        }}
        onPointerUp={() => (controls.fire = false)}
        onPointerCancel={() => (controls.fire = false)}
        onLostPointerCapture={() => (controls.fire = false)}
      >
        <Crosshair size={35} />
        <span>FIRE</span>
      </button>
      <button
        className="touch-action jump"
        aria-label="Jump"
        onPointerDown={() => {
          unlockAudio();
          controls.jump = true;
        }}
      >
        <ArrowUp />
        <small>JUMP</small>
      </button>
      <button
        className="touch-action dive"
        aria-label="Dive"
        onPointerDown={() => {
          unlockAudio();
          controls.dive = true;
        }}
      >
        <MoveDownRight />
        <small>DIVE</small>
      </button>
      <button
        className="touch-action stumble"
        aria-label="Stumble"
        onPointerDown={() => {
          unlockAudio();
          controls.stumble = true;
        }}
      >
        <Zap size={17} />
      </button>
    </div>
  );
}
