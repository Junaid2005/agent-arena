'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VenueModel } from '../game/Arena';
import {
  TOUR,
  TOUR_STOPS,
  TOUR_FURNITURE_SOLIDS,
  tourPosition,
  tourRoom,
  walkTour,
} from '../../../../packages/shared/src/tour';
import { VENUE_CALIBRATION } from '../../../../packages/shared/src/venue';
import { circleBoxOverlap } from '../../../../packages/shared/src/geometry';
import { ROOM_ONE } from '../../../../packages/shared/src/roomOne';
import { ROOM_FIVE } from '../../../../packages/shared/src/roomFive';
import { ROOM_THREE } from '../../../../packages/shared/src/roomThree';
import './tour.css';

type Navigation = {
  position: ReturnType<typeof tourPosition>;
  yaw: number;
  pitch: number;
  keys: Set<string>;
  touchX: number;
  touchZ: number;
  active: boolean;
  locked: boolean;
  solidFurniture: boolean;
};
function Walker({ nav, report }: { nav: Navigation; report: (text: string) => void }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (nav.active)
      walkTour(
        nav.position,
        Number(nav.keys.has('KeyD') || nav.keys.has('ArrowRight')) -
          Number(nav.keys.has('KeyA') || nav.keys.has('ArrowLeft')) +
          nav.touchX,
        Number(nav.keys.has('KeyS') || nav.keys.has('ArrowDown')) -
          Number(nav.keys.has('KeyW') || nav.keys.has('ArrowUp')) +
          nav.touchZ,
        nav.yaw,
        dt,
        nav.keys.has('ShiftLeft') || nav.keys.has('ShiftRight'),
        nav.solidFurniture,
      );
    camera.position.set(nav.position.x, nav.position.y + TOUR.eyeHeight, nav.position.z);
    camera.rotation.set(nav.pitch, nav.yaw, 0, 'YXZ');
    elapsed.current += dt;
    if (elapsed.current > 0.15) {
      elapsed.current = 0;
      const room = tourRoom(nav.position);
      report(room?.name.replace(/^\d+ \/ /, '') ?? 'CIRCULATION');
    }
  });
  return null;
}
export default function VenueTour() {
  const nav = useRef<Navigation>({
    position: tourPosition(),
    yaw: TOUR_STOPS[0].yaw ?? 0,
    pitch: 0,
    keys: new Set(),
    touchX: 0,
    touchZ: 0,
    active: false,
    locked: false,
    solidFurniture: false,
  }).current;
  const [started, setStarted] = useState(false),
    [locked, setLocked] = useState(false);
  const [room, setRoom] = useState('ENTRANCE / CIRCULATION');
  const [stop, setStop] = useState(0),
    [touch, setTouch] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [lookError, setLookError] = useState('');
  const [furniture, setFurniture] = useState(true),
    [solidFurniture, setSolidFurniture] = useState(false);
  const [furnitureMessage, setFurnitureMessage] = useState('');
  const resetInput = useCallback(() => {
    nav.keys.clear();
    nav.touchX = 0;
    nav.touchZ = 0;
    drag.current = null;
  }, [nav]);
  useEffect(() => {
    setTouch(matchMedia('(pointer: coarse)').matches);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (document.pointerLockElement) document.exitPointerLock();
        resetInput();
        return;
      }
      if ((e.target as HTMLElement)?.closest('button, select, a, input')) return;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'ShiftLeft',
          'ShiftRight',
        ].includes(e.code)
      ) {
        e.preventDefault();
        if (nav.active) nav.keys.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => nav.keys.delete(e.code);
    const change = () => {
      nav.locked = !!document.pointerLockElement;
      setLocked(nav.locked);
      if (!nav.locked) resetInput();
    };
    const move = (e: MouseEvent) => {
      if (!nav.active || !nav.locked) return;
      nav.yaw -= e.movementX * 0.002;
      nav.pitch = THREE.MathUtils.clamp(nav.pitch - e.movementY * 0.002, -1.45, 1.45);
    };
    const blur = () => resetInput();
    const visibility = () => {
      if (document.hidden) resetInput();
    };
    const failure = () => setLookError('Mouse capture unavailable. Drag the view to look around.');
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointerlockchange', change);
    document.addEventListener('mousemove', move);
    document.addEventListener('pointerlockerror', failure);
    return () => {
      resetInput();
      nav.active = false;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerlockchange', change);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('pointerlockerror', failure);
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [nav, resetInput]);
  const capture = () => {
    if (touch) return;
    try {
      surface.current
        ?.requestPointerLock()
        ?.catch(() => setLookError('Drag the view to look around.'));
    } catch {
      setLookError('Drag the view to look around.');
    }
  };
  const begin = () => {
    nav.active = true;
    setStarted(true);
    (document.activeElement as HTMLElement)?.blur();
    capture();
  };
  const goTo = (index: number) => {
    resetInput();
    nav.position = tourPosition(index);
    nav.yaw = TOUR_STOPS[index].yaw ?? 0;
    nav.pitch = TOUR_STOPS[index].pitch ?? 0;
    setStop(index);
    setRoom(TOUR_STOPS[index].name.toUpperCase());
  };
  const pad = (label: string, x: number, z: number) => (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        nav.touchX = x;
        nav.touchZ = z;
      }}
      onPointerUp={() => {
        nav.touchX = 0;
        nav.touchZ = 0;
      }}
      onPointerCancel={() => {
        nav.touchX = 0;
        nav.touchZ = 0;
      }}
      onLostPointerCapture={() => {
        nav.touchX = 0;
        nav.touchZ = 0;
      }}
    >
      {label === 'Walk forward' ? '↑' : label === 'Walk backward' ? '↓' : x < 0 ? '←' : '→'}
    </button>
  );
  return (
    <main className="tour-shell">
      <div
        className="tour-world"
        ref={surface}
        aria-label="First-person Hoxton Docks tour"
        onClick={() => {
          if (started && !locked && !touch && !lookError) capture();
        }}
        onPointerDown={(e) => {
          if (nav.active && !nav.locked) {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId || nav.locked) return;
          nav.yaw -= (e.clientX - d.x) * 0.004;
          nav.pitch = THREE.MathUtils.clamp(nav.pitch - (e.clientY - d.y) * 0.004, -1.45, 1.45);
          d.x = e.clientX;
          d.y = e.clientY;
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <Canvas
          camera={{ fov: 65, near: 0.05, far: 160 }}
          dpr={[1, 1.7]}
          fallback={<p className="tour-no-webgl">This tour needs a browser with WebGL enabled.</p>}
        >
          <color attach="background" args={['#cddce5']} />
          <ambientLight intensity={1.1} />
          <hemisphereLight args={['#ffffff', '#8d928b', 0.95]} />
          <directionalLight position={[-10, 25, 10]} intensity={1.1} />
          <VenueModel ceilings labels={false} eventSetup furniture={furniture} />
          <Walker nav={nav} report={setRoom} />
        </Canvas>
      </div>
      <header className="tour-header">
        <a className="tour-brand" href="/tour">
          HOXTON DOCKS <span>SPATIAL SIMULATOR</span>
        </a>
        <a className="tour-plan-link" href="/venue">
          Floor plan
        </a>
      </header>
      <section className="tour-location" aria-live="polite">
        <span>YOU ARE IN</span>
        <h1>{room}</h1>
        <p>1 unit = 1 metre · Eye level {TOUR.eyeHeight.toFixed(2)} m</p>
        {room.includes('HIGH BAY') && (
          <p>Upper roof {ROOM_ONE.upperRoofHeight.toFixed(1)} m · provisional photo estimate</p>
        )}
        {room.includes('ATRIUM') && (
          <p>
            Eaves {ROOM_FIVE.eaveHeight.toFixed(1)} m / ridge {ROOM_FIVE.ridgeHeight.toFixed(1)} m ·
            estimates
          </p>
        )}
        {room.includes('CANAL') && (
          <p>Ceiling {ROOM_THREE.ceilingHeight.toFixed(1)} m · photo estimate</p>
        )}
      </section>
      {started && (
        <>
          <div className="tour-reticle" aria-hidden="true" />
          <div className="tour-controls">
            <label>
              Go to a space
              <select
                aria-label="Go to a space"
                value={stop}
                onChange={(e) => goTo(Number(e.target.value))}
              >
                {TOUR_STOPS.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                goTo(0);
                (document.activeElement as HTMLElement)?.blur();
              }}
            >
              Return to entrance
            </button>
            <div className="tour-furniture-options">
              <label>
                <input
                  type="checkbox"
                  checked={furniture}
                  onChange={(e) => {
                    setFurniture(e.target.checked);
                    setFurnitureMessage('');
                    if (!e.target.checked) {
                      nav.solidFurniture = false;
                      setSolidFurniture(false);
                    }
                  }}
                />{' '}
                Show furniture
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={solidFurniture}
                  disabled={!furniture}
                  onChange={(e) => {
                    if (
                      e.target.checked &&
                      TOUR_FURNITURE_SOLIDS.some((b) =>
                        circleBoxOverlap(nav.position, TOUR.radius, b),
                      )
                    ) {
                      setFurnitureMessage('Step clear of furniture before enabling collisions.');
                      return;
                    }
                    nav.solidFurniture = e.target.checked;
                    setSolidFurniture(e.target.checked);
                    setFurnitureMessage('');
                  }}
                />{' '}
                Solid furniture
              </label>
              <small aria-live="polite">
                {furnitureMessage ||
                  (solidFurniture
                    ? 'Furniture blocks walking.'
                    : 'Walk through furniture for inspection.')}
              </small>
            </div>
          </div>
          <div className="tour-walk-pad" aria-label="Walking controls">
            {pad('Walk forward', 0, -1)}
            <div>
              {pad('Walk left', -1, 0)}
              {pad('Walk backward', 0, 1)}
              {pad('Walk right', 1, 0)}
            </div>
          </div>
          <p className="tour-help">
            {lookError ||
              (touch
                ? 'Use arrows to walk · drag the view to look'
                : locked
                  ? 'WASD / arrows to walk · mouse to look · Shift to walk faster · Esc for menu'
                  : 'Click the view to look around · WASD / arrows to walk')}
          </p>
        </>
      )}
      <footer className="tour-scale">
        <b>HEIGHT REFERENCE / {VENUE_CALIBRATION.wallHeight.toFixed(1)} m</b>
        <span>
          Hall reference 5.5 m (drawing 5.6 m). Timber bay roof{' '}
          {ROOM_ONE.upperRoofHeight.toFixed(1)} m is provisional; heights await measurement.
        </span>
        <span>
          Floor plan: 1:200 at A3 · horizontal dimensions follow the illustrative venue drawing.
        </span>
        <span>
          Atrium ridge {ROOM_FIVE.ridgeHeight.toFixed(1)} m is estimated · photo-supported features;
          furniture and member dimensions remain provisional.
        </span>
      </footer>
      {!started && (
        <div className="tour-entry">
          <section>
            <span className="tour-kicker">55 LABURNUM STREET, LONDON</span>
            <h2>
              Walk the space.
              <br />
              At human scale.
            </h2>
            <p>
              Tour Hoxton Docks from a {TOUR.eyeHeight.toFixed(2)} m eye level, with life-size rooms
              and warehouse-height ceilings. Walk at {TOUR.walkSpeed} m/s through the traced
              doorways.
            </p>
            <button onClick={begin}>Enter the venue →</button>
            <p className="tour-entry-note">
              {touch
                ? 'Touch arrows to walk. Drag to look.'
                : 'WASD or arrow keys to walk. Mouse to look. Esc releases the mouse.'}{' '}
              Rooms 1, 2, 3, 5 and 11 include photo-informed details. Rooms 4, 7, 8 (WC) and 10 are
              locked. Unmeasured dimensions remain estimates.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
