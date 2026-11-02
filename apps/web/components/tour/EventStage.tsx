'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  STAGE,
  STAGE_REGISTRATION,
  STAGE_LOCAL_SOLIDS,
} from '../../../../packages/shared/src/stage';
import { planToWorld } from '../../../../packages/shared/src/venue';

function Curtain() {
  const geometry = useMemo(() => {
    const mesh = new THREE.PlaneGeometry(STAGE.curtainWidth, STAGE.curtainHeight, 160, 1);
    const positions = mesh.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setZ(i, Math.sin(positions.getX(i) * Math.PI * 10) * 0.055);
    }
    mesh.computeVertexNormals();
    return mesh;
  }, []);
  return (
    <mesh geometry={geometry} position={[0, STAGE.curtainHeight / 2, -1.55]} receiveShadow>
      <meshStandardMaterial color="#111216" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}
function Banner({ side }: { side: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 672;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f3efe9';
    ctx.fillRect(0, 0, 256, 672);
    ctx.fillStyle = '#9b79c2';
    ctx.beginPath();
    ctx.arc(215, 100, 145, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#232029';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('OpenAI', 20, 440);
    ctx.font = 'bold 75px sans-serif';
    ctx.fillText('> <', 35, 130);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[side * 2.45, STAGE.bannerHeight / 2, -0.75]}>
      <mesh>
        <boxGeometry args={[STAGE.bannerWidth, STAGE.bannerHeight, 0.035]} />
        <meshStandardMaterial color="#e7e4df" />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[STAGE.bannerWidth, STAGE.bannerHeight]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
      <mesh position={[0, -STAGE.bannerHeight / 2 + 0.025, 0.02]}>
        <boxGeometry args={[0.84, 0.05, 0.3]} />
        <meshStandardMaterial color="#393b3d" />
      </mesh>
    </group>
  );
}
function Lectern() {
  const silver = '#bcc1c4';
  return (
    <group position={[-1.2, STAGE.height, 0.45]}>
      {[0, STAGE.lecternHeight - 0.04].map((y) => (
        <mesh key={y} position={[0, y + 0.02, 0]} rotation={[y ? -0.12 : 0, 0, 0]}>
          <boxGeometry args={[0.56, 0.04, 0.46]} />
          <meshStandardMaterial color={silver} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}-${z}`} position={[x * 0.18, STAGE.lecternHeight / 2, z * 0.13]}>
            <cylinderGeometry args={[0.019, 0.019, STAGE.lecternHeight, 8]} />
            <meshStandardMaterial color={silver} metalness={0.7} roughness={0.4} />
          </mesh>
        )),
      )}
      {[0.2, 0.5, 0.8].flatMap((y, row) =>
        [-1, 1].map((direction) => (
          <mesh
            key={`${row}-${direction}`}
            position={[0, y, 0.13]}
            rotation={[0, 0, direction * 0.9]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.46, 6]} />
            <meshStandardMaterial color={silver} metalness={0.65} roughness={0.4} />
          </mesh>
        )),
      )}
    </group>
  );
}
/** Standalone, photo-informed stage assembly. Furniture and people are not part of this asset. */
function EventStage() {
  const platform = STAGE_LOCAL_SOLIDS[0],
    screen = STAGE_LOCAL_SOLIDS[1];
  return (
    <group>
      <Curtain />
      <mesh position={platform.position} receiveShadow castShadow>
        <boxGeometry args={platform.size} />
        <meshStandardMaterial color="#25262a" roughness={1} />
      </mesh>
      {/* Dark skirting at the front; the top remains a continuous walkable deck once registered. */}
      {Array.from({ length: 32 }, (_, i) => (
        <mesh
          key={i}
          position={[(i / 31 - 0.5) * STAGE.width, STAGE.height / 2, STAGE.depth / 2 + 0.01]}
        >
          <boxGeometry args={[0.025, STAGE.height, 0.018]} />
          <meshStandardMaterial color="#1a1b1e" roughness={1} />
        </mesh>
      ))}
      <mesh position={screen.position} castShadow>
        <boxGeometry args={screen.size} />
        <meshStandardMaterial color={screen.color} roughness={0.9} />
      </mesh>
      <mesh position={[0, screen.position[1], screen.position[2] + 0.066]}>
        <planeGeometry args={[STAGE.screenWidth, STAGE.screenHeight]} />
        <meshStandardMaterial color="#e9e6dc" roughness={0.95} />
      </mesh>
      <Lectern />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 2.95, 0, -0.3]}>
          <mesh position={[0, 2.05, 0]} castShadow>
            <boxGeometry args={[0.48, 0.82, 0.38]} />
            <meshStandardMaterial color="#17191b" roughness={0.96} />
          </mesh>
          {[1.85, 2.23].map((y) => (
            <mesh key={y} position={[0, y, 0.195]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.008, 20]} />
              <meshStandardMaterial color="#24272a" />
            </mesh>
          ))}
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.018, 0.024, 1.7, 8]} />
            <meshStandardMaterial color="#303336" metalness={0.5} />
          </mesh>
          {[0, 1, 2].map((leg) => (
            <group key={leg} rotation={[0, (leg * Math.PI * 2) / 3, 0]}>
              <mesh position={[0, 0.16, 0.23]} rotation={[-0.85, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.018, 0.56, 6]} />
                <meshStandardMaterial color="#303336" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <Banner side={-1} />
      <Banner side={1} />
    </group>
  );
}
export function RegisteredEventStage() {
  if (!STAGE_REGISTRATION.anchor) return null;
  const [x, z] = planToWorld(STAGE_REGISTRATION.anchor);
  return (
    <group position={[x, 0, z]} rotation={[0, STAGE_REGISTRATION.yaw, 0]}>
      <EventStage />
    </group>
  );
}
