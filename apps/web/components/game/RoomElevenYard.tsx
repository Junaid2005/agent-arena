'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ROOM_ELEVEN, ROOM_ELEVEN_FURNITURE, type YardItem } from '../../../../packages/shared/src/roomEleven';
import { VENUE_ROOMS, VENUE_WALLS, planToWorld, type PlanPoint } from '../../../../packages/shared/src/venue';
import { metricBoxGeometry } from '../tour/roomTwoMaterials';

type Point = [number, number, number];
const p = (point: PlanPoint, y = 0): Point => { const [x, z] = planToWorld(point); return [x, y, z]; };
function Box({ at = [0, 0, 0], size, color = '#444745', map }: { at?: Point; size: Point; color?: string; map?: THREE.Texture }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} map={map} roughness={0.9} /></mesh>;
}
function Bar({ a, b, radius = 0.018, color = '#697273' }: { a: Point; b: Point; radius?: number; color?: string }) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  return <mesh position={start.add(end).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize())}>
    <cylinderGeometry args={[radius, radius, delta.length(), 6]} /><meshStandardMaterial color={color} metalness={0.55} roughness={0.65} />
  </mesh>;
}
function surfaceTexture(brick: boolean) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const ctx = c.getContext('2d')!;
  let seed = brick ? 37 : 83;
  const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = brick ? '#a49c86' : '#a49f8c'; ctx.fillRect(0, 0, c.width, c.height);
  if (brick) {
    for (let row = 0; row < 8; row++) for (let col = -1; col < 9; col++) {
      const x = col * 128 + (row % 2) * 64, y = row * 64;
      ctx.fillStyle = `hsl(${32 + rand() * 7} ${16 + rand() * 12}% ${37 + rand() * 17}%)`;
      ctx.fillRect(x + 3, y + 3, 122, 58);
    }
  }
  for (let i = 0; i < 40000; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,247,222,.16)' : 'rgba(38,34,26,.22)';
    ctx.fillRect(rand() * c.width, rand() * c.height, 1 + rand() * 3, 1 + rand() * 3);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  if (!brick) t.repeat.set(0.3, 0.3); t.anisotropy = 4; return t;
}
function YardFloor({ map }: { map: THREE.Texture }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    VENUE_ROOMS.find((r) => r.id === 'yard')!.outline.forEach((point, i) => {
      const [x, z] = planToWorld(point); if (!i) shape.moveTo(x, -z); else shape.lineTo(x, -z);
    }); shape.closePath();
    const hole = new THREE.Path();
    VENUE_ROOMS.find((r) => r.id === 'parking')!.outline.forEach((point, i) => {
      const [x, z] = planToWorld(point); if (!i) hole.moveTo(x, -z); else hole.lineTo(x, -z);
    }); hole.closePath(); shape.holes.push(hole); return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow><meshStandardMaterial map={map} bumpMap={map} bumpScale={0.018} roughness={1} side={THREE.DoubleSide} /></mesh>;
}
function FactoryWindow({ x }: { x: number }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 384; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#555a57'; ctx.fillRect(0, 0, c.width, c.height);
    for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) {
      ctx.fillStyle = (row + col) % 3 ? '#6b7673' : '#34413f'; ctx.fillRect(col * 64 + 3, row * 64 + 3, 58, 58);
      ctx.fillStyle = 'rgba(181,191,172,.17)'; ctx.fillRect(col * 64 + 9, row * 64 + 4, 9, 57);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return <group position={p([x, 714.2], 1.65)}>
    <Box size={[1.9, 2.62, 0.05]} color="#c1bca8" />
    <Box at={[0, 0, 0.04]} size={[1.64, 2.35, 0.05]} color="#ffffff" map={map} />
    <Box at={[0, -1.28, 0.13]} size={[2, 0.1, 0.28]} color="#afa68d" />
  </group>;
}
function TimberDoor() {
  return <group position={p(ROOM_ELEVEN.timberDoor, 0)}>
    <Box at={[0, 1.53, 0.13]} size={[2.7, 3.06, 0.08]} color="#b4ab90" />
    <Box at={[0, 1.48, 0.19]} size={[2.4, 2.96, 0.06]} color="#594438" />
    {Array.from({ length: 12 }, (_, i) => <Box key={i} at={[-1.1 + i * 0.2, 1.48, 0.23]} size={[0.016, 2.96, 0.017]} color={i % 3 ? '#423c31' : '#806b4d'} />)}
    <Box at={[0, 0.96, 0.25]} size={[2.35, 0.08, 0.04]} color="#594a37" />
    <Box at={[0.1, 1.12, 0.29]} size={[0.05, 0.16, 0.04]} color="#a6a69b" />
  </group>;
}
function Festoon({ a, b }: { a: PlanPoint; b: PlanPoint }) {
  const from = p(a, 3.45), to = p(b, 3.45);
  const at = (t: number): Point => [from[0] + (to[0] - from[0]) * t, 3.45 - Math.sin(t * Math.PI) * 0.45, from[2] + (to[2] - from[2]) * t];
  return <group>{Array.from({ length: 16 }, (_, i) => <Bar key={`wire-${i}`} a={at(i / 16)} b={at((i + 1) / 16)} radius={0.008} color="#282d2d" />)}
    {Array.from({ length: 12 }, (_, i) => <group key={i} position={at((i + 0.5) / 12)}>
      <Box at={[0, -0.06, 0]} size={[0.045, 0.1, 0.045]} color="#30322d" />
      <mesh position={[0, -0.15, 0]}><sphereGeometry args={[0.045, 8, 6]} /><meshStandardMaterial color="#ede2c2" emissive="#f9db99" emissiveIntensity={0.45} /></mesh>
    </group>)}
  </group>;
}
function Picnic() {
  return <group>
    {Array.from({ length: 5 }, (_, i) => <Box key={i} at={[0, 0.73, (i - 2) * 0.15]} size={[2, 0.065, 0.14]} color={i % 2 ? '#737571' : '#686d6a'} />)}
    {[-1, 1].flatMap((side) => [0, 1].map((i) => <Box key={`${side}-${i}`} at={[0, 0.43, side * 0.72 + (i ? 0.085 : -0.085)]} size={[2, 0.07, 0.16]} color="#666c69" />))}
    {[-0.72, 0.72].map((x) => <group key={x}><Box at={[x, 0.37, 0]} size={[0.08, 0.72, 0.08]} color="#242c29" /><Box at={[x, 0.22, 0]} size={[0.08, 0.08, 1.74]} color="#242c29" /></group>)}
  </group>;
}
function YardSofa() {
  return <group>
    <Box at={[0, 0.25, 0]} size={[2.4, 0.45, 0.85]} color="#777e78" />
    <Box at={[0, 0.64, -0.31]} size={[2.4, 0.43, 0.19]} color="#b4b6ad" />
    {[-0.77, 0, 0.77].map((x) => <group key={x}><Box at={[x, 0.49, 0.02]} size={[0.73, 0.13, 0.61]} color="#c7c6b9" /><Box at={[x, 0.66, -0.2]} size={[0.73, 0.32, 0.13]} color="#cac8bb" /></group>)}
    {[-1.13, 1.13].map((x) => <Box key={x} at={[x, 0.52, 0]} size={[0.14, 0.34, 0.85]} color="#9ea59d" />)}
  </group>;
}
function Planter() {
  return <group><Box at={[0, 0.3, 0]} size={[0.7, 0.6, 0.7]} color="#6d7167" />
    <Bar a={[0, 0.6, 0]} b={[0, 2.5, 0]} radius={0.028} color="#7e7052" />
    {[[-0.3, 1.8, 0.1], [0.24, 2.15, -0.1], [-0.1, 2.55, 0]].map(([x, y, z], i) => <group key={i}>
      <Bar a={[0, 0.9 + i * 0.3, 0]} b={[x, y, z]} radius={0.015} color="#7e7052" />
      <mesh position={[x, y, z]} scale={[0.42, 0.25, 0.34]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={i % 2 ? '#647044' : '#526342'} roughness={1} /></mesh>
    </group>)}
  </group>;
}
function Barrier() {
  return <group>
    {[-1.03, 1.03].map((x) => <group key={x}><Bar a={[x, 0.06, 0]} b={[x, 1.02, 0]} /><Bar a={[x, 0.03, -0.27]} b={[x, 0.03, 0.27]} /></group>)}
    {[0.25, 1.02].map((y) => <Bar key={y} a={[-1.03, y, 0]} b={[1.03, y, 0]} />)}
    {Array.from({ length: 12 }, (_, i) => <Bar key={i} a={[-0.94 + i * 0.17, 0.25, 0]} b={[-0.94 + i * 0.17, 1.02, 0]} radius={0.009} />)}
  </group>;
}
function YardFurniture({ item }: { item: YardItem }) {
  return <group position={p(item.point)} rotation={[0, item.yaw, 0]}>{item.type === 'picnic' ? <Picnic /> : item.type === 'sofa' ? <YardSofa /> : item.type === 'planter' ? <Planter /> : item.type === 'barrier' ? <Barrier /> : <>
    <Box at={[0, 0.33, 0]} size={[1.25, 0.07, 0.6]} color="#333b36" />
    {[-0.53, 0.53].map((x) => <Box key={x} at={[x, 0.15, 0]} size={[0.08, 0.3, 0.54]} color="#333b36" />)}
  </>}</group>;
}
function BrickFace({ box, map }: { box: typeof VENUE_WALLS[number]; map: THREE.Texture }) {
  const size: Point = [box.size[0] + 0.012, box.size[1], box.size[2] + 0.012];
  const geometry = useMemo(() => metricBoxGeometry(size), [box]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={box.position} rotation={[0, box.rotation ?? 0, 0]} receiveShadow><meshStandardMaterial map={map} bumpMap={map} bumpScale={0.018} roughness={1} /></mesh>;
}
/** Photo-informed yard dressing; original footprint/openings and structural collision stay authoritative. */
export function RoomElevenYard({ furniture = true }: { furniture?: boolean }) {
  const maps = useMemo(() => ({ gravel: surfaceTexture(false), brick: surfaceTexture(true) }), []);
  useEffect(() => () => Object.values(maps).forEach((map) => map.dispose()), [maps]);
  return <group>
    <YardFloor map={maps.gravel} />
    {VENUE_WALLS.filter((box) => /^(private-east-yard|yard-east|yard-gates)-/.test(box.id) && !box.id.includes('gate-') && !box.id.includes('lintel')).map((box) => <BrickFace key={box.id} box={box} map={maps.brick} />)}
    {VENUE_WALLS.filter((box) => box.id.startsWith('yard-gates-gate-')).map((box, i) => <group key={box.id} position={box.position} rotation={[0, box.rotation ?? 0, 0]}>
      <Box size={[box.size[0], box.size[1], box.size[2] + 0.02]} color={i ? '#343b3b' : '#67453f'} />
      {Array.from({ length: Math.max(3, Math.floor(box.size[0] / 0.22)) }, (_, j) => <Box key={j} at={[-box.size[0] / 2 + 0.1 + j * 0.22, 0, 0.075]} size={[0.045, box.size[1], 0.05]} color={i ? '#292f2f' : '#4b3430'} />)}
    </group>)}
    {ROOM_ELEVEN.facadeWindows.map((x) => <FactoryWindow key={x} x={x} />)}
    <TimberDoor /><Festoon a={[1000, 728]} b={[1260, 873]} /><Festoon a={[1040, 873]} b={[1295, 728]} />
    {furniture && ROOM_ELEVEN_FURNITURE.map((item) => <YardFurniture key={item.id} item={item} />)}
  </group>;
}
