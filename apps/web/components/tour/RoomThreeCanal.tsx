'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  ROOM_THREE,
  ROOM_THREE_FURNITURE,
  CANAL_BENCHES,
  CANAL_CATERING,
  CANAL_FRIDGE,
  HELP_DESK,
  canalPoint,
} from '../../../../packages/shared/src/roomThree';
import { planToWorld } from '../../../../packages/shared/src/venue';
import { FurnitureCollection } from './RoomTwoDetails';

type Point = [number, number, number];
function Beam({
  a,
  b,
  width = 0.08,
  color = '#252d30',
}: {
  a: Point;
  b: Point;
  width?: number;
  color?: string;
}) {
  const p = new THREE.Vector3(...a),
    q = new THREE.Vector3(...b),
    d = q.clone().sub(p);
  return (
    <mesh
      position={p.add(q).multiplyScalar(0.5)}
      quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        d.clone().normalize(),
      )}
    >
      <boxGeometry args={[width, d.length(), width]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.35} />
    </mesh>
  );
}
function Ceiling() {
  const geometry = useMemo(() => {
    const points = [
      canalPoint(0, 0, ROOM_THREE.ceilingHeight),
      canalPoint(1, 0, ROOM_THREE.ceilingHeight),
      canalPoint(1, 1, ROOM_THREE.ceilingHeight),
      canalPoint(0, 1, ROOM_THREE.ceilingHeight),
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 9, 0, 9, 3, 0, 5], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, []);
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#a6a69b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6500; i++) {
      const x = (i * 73.21) % 256,
        y = (i * 37.89) % 256;
      ctx.strokeStyle = i % 2 ? '#b8b7a9' : '#85877f';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(i) * 5, y + Math.cos(i * 0.7) * 5);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        map={texture}
        bumpMap={texture}
        bumpScale={0.015}
        roughness={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
function Window({ from, to, side }: { from: number; to: number; side: 0 | 1 }) {
  const a = canalPoint(from, side),
    b = canalPoint(to, side),
    width = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const height = 2.06,
    cols = Math.max(4, Math.round(width / 0.55));
  return (
    <group
      position={canalPoint((from + to) / 2, side ? 0.96 : 0.045, 2.04)}
      rotation={[0, -Math.atan2(b[2] - a[2], b[0] - a[0]), 0]}
    >
      <mesh>
        <boxGeometry args={[width + 0.16, height + 0.18, 0.08]} />
        <meshStandardMaterial color="#a9a99b" />
      </mesh>
      <mesh>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial
          color={side ? '#c4d2d0' : '#cedcde'}
          roughness={0.7}
          emissive="#b5c8cb"
          emissiveIntensity={0.28}
        />
      </mesh>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <mesh key={i} position={[-width / 2 + (width * i) / cols, 0, 0]}>
          <boxGeometry args={[0.032, height, 0.16]} />
          <meshStandardMaterial color="#354044" />
        </mesh>
      ))}
      {[-0.5, 0, 0.5].map((y) => (
        <mesh key={y} position={[0, y * height, 0]}>
          <boxGeometry args={[width, 0.032, 0.16]} />
          <meshStandardMaterial color="#354044" />
        </mesh>
      ))}
    </group>
  );
}
function CateringTable({
  green,
  width,
  depth,
  height,
}: {
  green: boolean;
  width: number;
  depth: number;
  height: number;
}) {
  const color = green ? '#3d9059' : '#22282a';
  const cloth = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, height);
    shape.lineTo(width / 2, height);
    shape.lineTo(width / 2 - 0.09, 0.04);
    shape.quadraticCurveTo(0, 0.6, -width / 2 + 0.09, 0.04);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [width, height]);
  useEffect(() => () => cloth.dispose(), [cloth]);
  return (
    <group>
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[width, 0.045, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={cloth} position={[0, 0, (side * depth) / 2]}>
          <meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.08, 0]}>
        <boxGeometry args={[0.45, 0.12, 0.3]} />
        <meshStandardMaterial color="#c2a878" />
      </mesh>
      <mesh position={[width * 0.3, height + 0.12, 0]}>
        <cylinderGeometry args={[0.08, 0.07, 0.24, 12]} />
        <meshStandardMaterial color="#e8e4d8" />
      </mesh>
    </group>
  );
}
export function RoomThreeCanal({
  roof = true,
  furniture = true,
}: {
  roof?: boolean;
  furniture?: boolean;
}) {
  return (
    <group>
      {roof && <Ceiling />}
      {ROOM_THREE.beams.map((u) => (
        <group key={u}>
          <Beam a={canalPoint(u, 0.01, 3.24)} b={canalPoint(u, 0.99, 3.24)} width={0.15} />
          <Beam
            a={canalPoint(u + 0.025, 0.05, 3.06)}
            b={canalPoint(u + 0.025, 0.95, 3.06)}
            width={0.035}
            color="#a8aeaa"
          />
        </group>
      ))}
      <Beam a={canalPoint(0.02, 0.25, 3.18)} b={canalPoint(0.98, 0.25, 3.18)} width={0.13} />
      <Beam
        a={canalPoint(0.02, 0.92, 3.12)}
        b={canalPoint(0.98, 0.92, 3.12)}
        width={0.035}
        color="#9a9c93"
      />
      {ROOM_THREE.northWindows.map(([from, to]) => (
        <Window key={from} from={from} to={to} side={0} />
      ))}
      {ROOM_THREE.southWindows.map(([from, to]) => (
        <Window key={from} from={from} to={to} side={1} />
      ))}
      {[0.08, 0.25, 0.42, 0.59, 0.76, 0.93].map((u) => (
        <group key={u} position={canalPoint(u, 0.94, 3.03)}>
          <mesh rotation={[0.25, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.07, 0.12, 8]} />
            <meshStandardMaterial color="#2b3030" />
          </mesh>
          <mesh position={[0, -0.07, -0.015]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color="#ffe5b0" emissive="#ffd18a" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}
      {/* Cabinet, conduit and extinguisher stay attached to the visible service wall. */}
      <group position={canalPoint(0.025, 0.77, 1.65)}>
        <mesh>
          <boxGeometry args={[0.1, 0.65, 0.42]} />
          <meshStandardMaterial color="#b6bbb3" />
        </mesh>
        <Beam a={[0.03, -1.55, 0.08]} b={[0.03, 1.55, 0.08]} width={0.024} color="#858f91" />
        <mesh position={[0.18, -1.02, 0.35]}>
          <cylinderGeometry args={[0.085, 0.085, 0.45, 12]} />
          <meshStandardMaterial color="#aeb5b6" metalness={0.8} roughness={0.35} />
        </mesh>
      </group>
      {furniture && (
        <>
          <FurnitureCollection items={ROOM_THREE_FURNITURE} />
          {CANAL_BENCHES.map((bench) => {
            const [x, z] = planToWorld(bench.point);
            return (
              <group key={bench.id} position={[x, 0, z]} rotation={[0, bench.yaw, 0]}>
                <mesh position={[0, 0.45, 0]}>
                  <boxGeometry args={[bench.width, 0.07, 0.45]} />
                  <meshStandardMaterial color="#725334" />
                </mesh>
                <mesh position={[0, 0.77, 0.2]} rotation={[0.12, 0, 0]}>
                  <boxGeometry args={[bench.width, 0.36, 0.055]} />
                  <meshStandardMaterial color="#765738" />
                </mesh>
                {[-1, 1].map((side) => (
                  <mesh key={side} position={[side * (bench.width / 2 - 0.18), 0.22, 0]}>
                    <boxGeometry args={[0.07, 0.44, 0.4]} />
                    <meshStandardMaterial color="#614a34" />
                  </mesh>
                ))}
              </group>
            );
          })}
          {CANAL_CATERING.map((item, i) => {
            const [x, z] = planToWorld(item.point);
            return (
              <group key={item.id} position={[x, 0, z]}>
                <CateringTable {...item} green={i === 0} />
              </group>
            );
          })}
          <group position={canalPoint(0.06, 0.36)}>
            <mesh position={[0, CANAL_FRIDGE.height / 2, 0]}>
              <boxGeometry args={[0.65, CANAL_FRIDGE.height, 0.65]} />
              <meshStandardMaterial color="#252b2a" />
            </mesh>
            <mesh position={[0, 0.57, 0.331]}>
              <planeGeometry args={[0.52, 0.94]} />
              <meshStandardMaterial color="#cacb82" emissive="#aeac45" emissiveIntensity={0.6} />
            </mesh>
            {[0.3, 0.6, 0.9].map((y) => (
              <mesh key={y} position={[0, y, 0.34]}>
                <boxGeometry args={[0.52, 0.018, 0.035]} />
                <meshStandardMaterial color="#c2c6a7" />
              </mesh>
            ))}
            <mesh position={[0.22, 0.65, 0.36]}>
              <boxGeometry args={[0.018, 0.3, 0.03]} />
              <meshStandardMaterial color="#272d28" />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}
export function RoomTwoHelpDesk({ furniture = true }: { furniture?: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f0eee0';
    ctx.fillRect(0, 0, 768, 256);
    ctx.fillStyle = '#262a28';
    ctx.font = '84px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HELP DESK', 384, 164);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const [x, z] = planToWorld(HELP_DESK.point);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.6, -0.5]}>
        <boxGeometry args={[2.3, 3.2, 0.06]} />
        <meshStandardMaterial color="#181d21" roughness={1} />
      </mesh>
      <Beam a={[-1, 0, 0]} b={[-1, 2.8, 0]} width={0.025} color="#92968d" />
      <Beam a={[1, 0, 0]} b={[1, 2.8, 0]} width={0.025} color="#92968d" />
      <Beam a={[-1, 2.8, 0]} b={[1, 2.8, 0]} width={0.025} color="#92968d" />
      <mesh position={[0, 2.37, 0.02]}>
        <planeGeometry args={[1.8, 0.64]} />
        <meshStandardMaterial map={texture} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {furniture && (
        <mesh position={[0, HELP_DESK.height / 2, 0]}>
          <boxGeometry args={[HELP_DESK.width, HELP_DESK.height, HELP_DESK.depth]} />
          <meshStandardMaterial color="#25292c" roughness={1} />
        </mesh>
      )}
    </group>
  );
}
