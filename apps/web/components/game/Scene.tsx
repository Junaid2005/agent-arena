'use client';
import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { rayOrientedBox } from '../../../../packages/shared/src/geometry';
import { VENUE_SPAWNS } from '../../../../packages/shared/src/venue';
import { ARENA } from '../../../../packages/shared/src/constants';
import type { Player } from '../../../../packages/shared/src/types';
import { controls, runtime, useGame } from '../../lib/store';
import { ShotEffect } from './ShotEffect';
import { Arena } from './Arena';
import { Character } from '../avatar/Character';
import { PETS } from '../../../../packages/shared/src/pets';

const showcase: Player = {
  id: 'showcase',
  name: 'Rookie',
  color: '#b9fa44',
  position: { x: VENUE_SPAWNS[0][0], y: 0, z: VENUE_SPAWNS[0][2] },
  vy: 0,
  yaw: -0.4,
  pitch: 0,
  hp: 3,
  score: 0,
  deaths: 0,
  seq: 0,
  moving: false,
  grounded: true,
  knockUntil: 0,
  diveUntil: 0,
  respawnAt: 0,
  protectedUntil: 0,
  pet: 'codex',
  weapon: 'pistol',
};
export default function Scene() {
  return (
    <div className="scene" aria-label="3D paintball arena">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [23, 20, 30], fov: 48, near: 0.08, far: 130 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#b6c2b2');
        }}
        fallback={
          <div className="webgl-error">
            WebGL is required to play. Try a browser with 3D graphics enabled.
          </div>
        }
      >
        <fog attach="fog" args={['#b6c2b2', 65, 145]} />
        <ambientLight intensity={1.05} />
        <hemisphereLight args={['#f4f8dd', '#536559', 1.8]} />
        <directionalLight
          position={[-10, 22, 10]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0003}
        />
        <Suspense fallback={null}>
          <Physics gravity={[0, -19, 0]} timeStep={1 / 60}>
            <World />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
function World() {
  const screen = useGame((s) => s.screen),
    snapshot = useGame((s) => s.snapshot),
    id = useGame((s) => s.id),
    shots = useGame((s) => s.shots),
    selectedPet = useGame((s) => s.selectedPet);
  return (
    <>
      <Arena />
      <CameraRig />
      {screen === 'lobby' ? (
        <Character
          player={{ ...showcase, pet: selectedPet, color: PETS[selectedPet].color }}
          lobby
        />
      ) : (
        snapshot?.players.map((p) => <Character key={p.id} player={p} local={p.id === id} />)
      )}
      {shots.map((s) => (
        <ShotEffect key={s.id} shot={s} />
      ))}
    </>
  );
}
function CameraRig() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const screen = useGame((s) => s.screen);
  useFrame(({ clock }, dt) => {
    if (screen === 'lobby') {
      initialized.current = false;
      const t = clock.elapsedTime * 0.025;
      camera.position.lerp(
        new THREE.Vector3(38 + Math.sin(t) * 3, 37, 46 + Math.cos(t) * 2),
        1 - Math.exp(-dt * 2),
      );
      camera.lookAt(0, 0, -2);
      return;
    }
    const p = runtime.local;
    if (!p) return;
    const eye = new THREE.Vector3(
      p.position.x + Math.cos(controls.yaw) * 0.65,
      p.position.y + 1.35,
      p.position.z - Math.sin(controls.yaw) * 0.65,
    );
    if (!initialized.current) {
      target.current.copy(eye);
      initialized.current = true;
    } else target.current.lerp(eye, 1 - Math.exp(-dt * 24));
    const direction = new THREE.Vector3(
      -Math.sin(controls.yaw) * Math.cos(controls.pitch),
      Math.sin(controls.pitch),
      -Math.cos(controls.yaw) * Math.cos(controls.pitch),
    );
    const back = direction.clone().negate();
    let distance = 4.5;
    for (const box of ARENA) {
      const hit = rayOrientedBox(target.current, back, box, distance);
      if (hit !== null) distance = Math.min(distance, Math.max(0.25, hit - 0.18));
    }
    camera.position.copy(target.current).addScaledVector(back, distance);
    camera.position.y = Math.max(0.25, camera.position.y);
    // Rotation tracks aim immediately; only translation is damped.
    camera.lookAt(target.current.clone().addScaledVector(direction, 40));
  });
  return null;
}
