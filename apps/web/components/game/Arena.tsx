'use client';
import { Suspense, useMemo } from 'react';
import { RoundedBox, useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { ARENA, ZONES } from '../../../../packages/shared/src/constants';
import type { Box } from '../../../../packages/shared/src/types';

function Venue() {
  const { scene } = useGLTF(process.env.NEXT_PUBLIC_VENUE_URL!);
  const model = useMemo(() => scene.clone(true), [scene]);
  return (
    <primitive
      object={model}
      scale={Number(process.env.NEXT_PUBLIC_VENUE_SCALE || 1)}
      rotation={[0, Number(process.env.NEXT_PUBLIC_VENUE_ROTATION || 0), 0]}
    />
  );
}
export function Arena() {
  const brick = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#978c7c';
    ctx.fillRect(0, 0, 512, 256);
    let seed = 51;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 9; col++) {
        const x = col * 64 + (row % 2) * 32,
          y = row * 32;
        ctx.fillStyle = `hsl(${20 + rand() * 9} ${17 + rand() * 15}% ${40 + rand() * 16}%)`;
        ctx.fillRect(x + 2, y + 2, 60, 28);
        for (let k = 0; k < 15; k++) {
          ctx.fillStyle = `rgba(30,20,10,${rand() * 0.15})`;
          ctx.fillRect(x + rand() * 60, y + rand() * 28, 2 + rand() * 8, 2);
        }
      }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 2);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[20, 0.25, 18]} position={[0, -0.25, 0.5]} />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0.5]}>
          <planeGeometry args={[40, 36]} />
          <meshStandardMaterial color="#a4a49a" roughness={0.93} />
        </mesh>
        {ARENA.map((b) => (
          <ArenaObject key={b.id} box={b} brick={brick} />
        ))}
      </RigidBody>
      <gridHelper args={[40, 20, '#999f91', '#9a9f93']} position={[0, 0.004, 0]} />
      {ZONES.map((zone) => (
        <group key={zone.name} position={[zone.x, 0.012, zone.z]}>
          <FloorLabel text={zone.name} color={zone.color} />
        </group>
      ))}
      {/* West hall: tall steel-framed windows and RGB stage lighting from the video. */}
      {[-6, -1, 4].map((z) => (
        <group key={z} position={[-18.72, 3, z]} rotation={[0, Math.PI / 2, 0]}>
          <WindowPanel />
        </group>
      ))}
      {[-1, 1].map((side, i) => (
        <group key={side} position={[-11 + side * 5.6, 2.6, -12.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.25, 5.2, 0.25]} />
            <meshStandardMaterial color="#363a3b" metalness={0.5} />
          </mesh>
          <pointLight
            position={[0, 1.3, 0.9]}
            intensity={15}
            distance={6}
            color={i ? '#77aaff' : '#c67bff'}
          />
          <mesh position={[0, 1.8, 0.2]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 0.3, 10]} />
            <meshStandardMaterial color="#292b32" />
          </mesh>
        </group>
      ))}
      <group position={[-11, 3.2, -13.75]}>
        <Sign
          text="DEV DAY / LONDON"
          sub="COMMUNITY HACKATHON"
          color="#e0cfff"
          background="#332a41"
          width={8}
          height={2.3}
        />
      </group>
      <group position={[7.4, 2.3, 17.72]} rotation={[0, Math.PI, 0]}>
        <Sign
          text="WELCOME, BUILDERS."
          sub="01 / LABURNUM STREET"
          color="#e4efd5"
          background="#2e514a"
          width={8}
          height={2.2}
        />
      </group>
      <group position={[18.72, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]}>
        <Sign
          text="AGENT ARENA"
          sub="NO HARD FEELINGS. JUST PAINT."
          color="#cbf79b"
          background="#283e34"
          width={6}
          height={2}
        />
      </group>
      {/* Exposed industrial columns and roof trusses; deliberately open above for the lobby view. */}
      {[-16, -7, 2, 11].map((x) => (
        <group key={x} position={[x, 6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.15, 0.25, 34]} />
            <meshStandardMaterial color="#42494a" metalness={0.4} />
          </mesh>
          {[-7, 1, 8].map((z) => (
            <mesh key={z} position={[0, -0.2, z]}>
              <boxGeometry args={[0.3, 0.06, 3]} />
              <meshStandardMaterial color="#f9eed7" emissive="#fff4d6" emissiveIntensity={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.9, -6]} rotation={[0, 0, 0.16]}>
            <boxGeometry args={[0.08, 0.08, 17]} />
            <meshStandardMaterial color="#b5b8ad" />
          </mesh>
        </group>
      ))}
      {[-6, 3].map((z) => (
        <group key={z} position={[7, 6.8, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 3.8]} />
            <meshBasicMaterial color="#e6eddc" transparent opacity={0.22} side={THREE.DoubleSide} />
          </mesh>
          {[-8, -4, 0, 4, 8].map((x) => (
            <mesh key={x} position={[x, 0.01, 0]}>
              <boxGeometry args={[0.06, 0.08, 4]} />
              <meshStandardMaterial color="#b7b9a9" />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[4, 0.03, 1.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[11.5, 2.5]} />
          <meshStandardMaterial color="#b4b8a2" />
        </mesh>
      </group>
      {process.env.NEXT_PUBLIC_VENUE_URL && (
        <Suspense fallback={null}>
          <Venue />
        </Suspense>
      )}
    </group>
  );
}
function ArenaObject({ box: b, brick }: { box: Box; brick: THREE.Texture }) {
  const rampGeometry = useMemo(() => {
    if (b.kind !== 'ramp') return null;
    const [w, h, d] = b.size;
    const x = w / 2,
      z = d / 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -x,
          0,
          z,
          x,
          0,
          z,
          x,
          h,
          -z,
          -x,
          0,
          z,
          x,
          h,
          -z,
          -x,
          h,
          -z,
          -x,
          0,
          -z,
          x,
          0,
          -z,
          x,
          h,
          -z,
          -x,
          0,
          -z,
          x,
          h,
          -z,
          -x,
          h,
          -z,
          -x,
          0,
          z,
          -x,
          h,
          -z,
          -x,
          0,
          -z,
          x,
          0,
          z,
          x,
          0,
          -z,
          x,
          h,
          -z,
        ],
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  }, [b]);
  return (
    <group position={b.position}>
      {b.kind === 'ramp' ? (
        <>
          <mesh geometry={rampGeometry!} position={[0, -b.size[1] / 2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={b.color} side={THREE.DoubleSide} />
          </mesh>
          <CuboidCollider
            args={[b.size[0] / 2, 0.05, Math.hypot(b.size[2], b.size[1]) / 2]}
            rotation={[Math.atan(b.size[1] / b.size[2]), 0, 0]}
          />
        </>
      ) : (
        <>
          <CuboidCollider args={[b.size[0] / 2, b.size[1] / 2, b.size[2] / 2]} />
          {b.kind === 'table' ? (
            <>
              <RoundedBox
                args={[b.size[0], 0.12, b.size[2]]}
                radius={0.04}
                position={[0, 0.39, 0]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color={b.color} roughness={0.7} />
              </RoundedBox>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * (b.size[0] / 2 - 0.3), -0.05, 0]}>
                  <boxGeometry args={[0.08, 0.8, 0.9]} />
                  <meshStandardMaterial color="#454747" metalness={0.5} />
                </mesh>
              ))}
              {[-1, 1].map((side) => (
                <group key={side} position={[side * (b.size[0] / 2 - 0.65), 0.45, 0]}>
                  <mesh position={[0, 0.25, -0.1]} rotation={[-0.15, 0, 0]}>
                    <boxGeometry args={[0.58, 0.4, 0.035]} />
                    <meshStandardMaterial color="#2e3337" />
                  </mesh>
                  <mesh position={[0, 0.24, -0.076]} rotation={[-0.15, 0, 0]}>
                    <planeGeometry args={[0.51, 0.32]} />
                    <meshStandardMaterial
                      color="#799fa6"
                      emissive="#74a1ae"
                      emissiveIntensity={0.3}
                    />
                  </mesh>
                  <mesh position={[0, 0.02, 0.14]}>
                    <boxGeometry args={[0.6, 0.035, 0.42]} />
                    <meshStandardMaterial color="#5c6262" metalness={0.4} />
                  </mesh>
                  <mesh position={[0.45, 0.1, 0]}>
                    <cylinderGeometry args={[0.065, 0.055, 0.2, 8]} />
                    <meshStandardMaterial color="#eee4ca" />
                  </mesh>
                </group>
              ))}
            </>
          ) : b.kind === 'chairs' ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <group key={i} position={[(i - 1.5) * 0.79, 0, 0]}>
                  <RoundedBox args={[0.6, 0.11, 0.58]} radius={0.04} castShadow>
                    <meshStandardMaterial color="#33333a" />
                  </RoundedBox>
                  <mesh position={[0, 0.32, 0.27]} rotation={[0.1, 0, 0]} castShadow>
                    <boxGeometry args={[0.6, 0.52, 0.07]} />
                    <meshStandardMaterial color="#3d3d44" />
                  </mesh>
                  {[-1, 1].map((s) => (
                    <mesh key={s} position={[s * 0.24, -0.2, 0]} rotation={[0.2, 0, 0]}>
                      <boxGeometry args={[0.035, 0.4, 0.5]} />
                      <meshStandardMaterial color="#64666a" metalness={0.5} />
                    </mesh>
                  ))}
                </group>
              ))}
            </>
          ) : (
            <RoundedBox
              args={b.size}
              radius={b.kind === 'wall' ? 0.015 : 0.06}
              smoothness={2}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={b.kind === 'wall' ? '#e9d9c9' : b.color}
                map={b.kind === 'wall' ? brick : null}
                roughness={0.85}
              />
            </RoundedBox>
          )}
          {b.kind === 'cover' && b.id !== 'stage' && (
            <mesh position={[0, 0, b.size[2] / 2 + 0.006]}>
              <planeGeometry args={[b.size[0] * 0.7, 0.1]} />
              <meshStandardMaterial color="#d3ff90" />
            </mesh>
          )}
          {b.kind === 'planter' &&
            [0, 1, 2].map((i) => (
              <mesh
                key={i}
                position={[Math.sin(i * 2) * 0.15, 0.7 + i * 0.2, Math.cos(i * 2) * 0.3]}
                castShadow
              >
                <icosahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial color={i % 2 ? '#7b9468' : '#586d4c'} />
              </mesh>
            ))}
        </>
      )}
    </group>
  );
}
function WindowPanel() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[3.7, 2.8, 0.07]} />
        <meshStandardMaterial
          color="#cbded5"
          emissive="#c2dfce"
          emissiveIntensity={0.3}
          roughness={0.25}
        />
      </mesh>
      {[-1.7, 0, 1.7].map((x) => (
        <mesh key={x} position={[x, 0, 0.05]}>
          <boxGeometry args={[0.07, 2.9, 0.1]} />
          <meshStandardMaterial color="#44594e" />
        </mesh>
      ))}
      {[-1.3, 0, 1.3].map((y) => (
        <mesh key={y} position={[0, y, 0.05]}>
          <boxGeometry args={[3.7, 0.07, 0.1]} />
          <meshStandardMaterial color="#44594e" />
        </mesh>
      ))}
    </group>
  );
}
function Sign({
  text,
  sub,
  color,
  background,
  width,
  height,
}: {
  text: string;
  sub: string;
  color: string;
  background: string;
  width: number;
  height: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = color;
    ctx.font = '900 82px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 512, 125);
    ctx.font = '24px monospace';
    ctx.fillText(sub, 512, 190);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, sub, color, background]);
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}
function FloorLabel({ text, color }: { text: string; color: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 512, 90);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[Math.max(3, text.length * 0.32), 0.65]} />
      <meshBasicMaterial map={texture} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}
