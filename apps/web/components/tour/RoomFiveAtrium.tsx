'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ROOM_FIVE, ROOM_FIVE_FURNITURE, atriumPoint, atriumRoofHeight } from '../../../../packages/shared/src/roomFive';
import { FurnitureCollection } from './RoomTwoDetails';
import { concreteTexture, masonryTexture } from './roomTwoMaterials';

type Point = [number, number, number];
const EAVE = ROOM_FIVE.eaveHeight, RIDGE = ROOM_FIVE.ridgeHeight;
function Bar({ a, b, size = 0.065, color = '#b6beb8', glow = false }: { a: Point; b: Point; size?: number; color?: string; glow?: boolean }) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), d = to.clone().sub(from);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return <mesh position={from.add(to).multiplyScalar(0.5)} quaternion={q}>
    <boxGeometry args={[size, d.length(), size]} />
    <meshStandardMaterial color={color} metalness={glow ? 0 : 0.45} roughness={0.65} emissive={glow ? '#fff9e6' : '#000000'} emissiveIntensity={glow ? 0.7 : 0} />
  </mesh>;
}
function Quad({ points, map, color = '#b7b9b3', glass = false }: { points: Point[]; map?: THREE.Texture; color?: string; glass?: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 10, 0, 10, 2, 0, 2], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={color} map={map} roughness={glass ? 0.5 : 1}
    side={THREE.DoubleSide} emissive={glass ? '#e1f2f6' : '#000000'} emissiveIntensity={glass ? 0.55 : 0} /></mesh>;
}
function Roof() {
  const texture = useMemo(() => concreteTexture(false), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const bands = [0, 0.16, 0.3, 0.5, 0.7, 0.84, 1];
  return <group>{bands.slice(0, -1).flatMap((v, i) => {
    const next = bands[i + 1], glazed = i === 1 || i === 4;
    return [0, 0.03, 0.97].map((u, j) => {
      const end = [0.03, 0.97, 1][j];
      return <Quad key={`${i}-${j}`} points={[atriumPoint(u, v, atriumRoofHeight(v)), atriumPoint(end, v, atriumRoofHeight(v)),
        atriumPoint(end, next, atriumRoofHeight(next)), atriumPoint(u, next, atriumRoofHeight(next))]}
        map={glazed && j === 1 ? undefined : texture} glass={glazed && j === 1} color={glazed && j === 1 ? '#dcebef' : '#b3b5ae'} />;
    });
  })}
    {ROOM_FIVE.skylightBands.flatMap(([v1, v2], index) => [v1, v2].map((v) => <Bar key={`${index}-${v}`}
      a={atriumPoint(0.03, v, atriumRoofHeight(v) - 0.025)} b={atriumPoint(0.97, v, atriumRoofHeight(v) - 0.025)} size={0.045} color="#6c7b7c" />))}
    {Array.from({ length: 19 }, (_, i) => 0.03 + i * 0.94 / 18).flatMap((u, i) => ROOM_FIVE.skylightBands.map(([v1, v2], j) => <Bar key={`${i}-${j}`}
      a={atriumPoint(u, v1, atriumRoofHeight(v1) - 0.035)} b={atriumPoint(u, v2, atriumRoofHeight(v2) - 0.035)} size={0.025} color="#68797a" />))}
  </group>;
}
function Gable({ u }: { u: number }) {
  const texture = useMemo(() => masonryTexture(false), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([
      ...atriumPoint(u, 0, ROOM_FIVE.eaveHeight), ...atriumPoint(u, 1, ROOM_FIVE.eaveHeight), ...atriumPoint(u, 0.5, ROOM_FIVE.ridgeHeight)], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 5, 0, 2.5, 3], 2)); g.computeVertexNormals(); return g;
  }, [u]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={1} /></mesh>;
}
function Truss({ u }: { u: number }) {
  const p = (v: number, y: number) => atriumPoint(u, v, y);
  return <group>
    <Bar a={p(0.01, EAVE - 0.38)} b={p(0.99, EAVE - 0.38)} size={0.085} />
    <Bar a={p(0.01, EAVE - 0.05)} b={p(0.5, RIDGE - 0.12)} size={0.08} />
    <Bar a={p(0.5, RIDGE - 0.12)} b={p(0.99, EAVE - 0.05)} size={0.08} />
    {[0.25, 0.5, 0.75].map((v) => <Bar key={v} a={p(v, EAVE - 0.38)} b={p(0.5, RIDGE - 0.12)} size={0.05} />)}
    {[0.25, 0.75].map((v) => <Bar key={v} a={p(v, EAVE - 0.38)} b={p(v, atriumRoofHeight(v) - 0.12)} size={0.045} />)}
    {[0.25, 0.75].map((v) => <Bar key={`light-${v}`} a={p(v - 0.1, EAVE - 0.53)} b={p(v + 0.1, EAVE - 0.53)} size={0.06} color="#e9e7d9" glow />)}
  </group>;
}
function IBeam({ a, b }: { a: Point; b: Point }) {
  const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  return <group position={[(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2]} rotation={[0, -Math.atan2(d.z, d.x), 0]}>
    {[-0.13, 0.13].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[d.length(), 0.035, 0.25]} /><meshStandardMaterial color="#303b3e" metalness={0.5} /></mesh>)}
    <mesh><boxGeometry args={[d.length(), 0.24, 0.035]} /><meshStandardMaterial color="#303b3e" metalness={0.5} /></mesh>
  </group>;
}
function Hoist({ u, v }: { u: number; v: number }) {
  return <group position={atriumPoint(u, v, EAVE - 0.53)}>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.7, 16]} /><meshStandardMaterial color="#5b5443" roughness={0.9} metalness={0.4} /></mesh>
    <mesh position={[0.35, 0, 0]}><boxGeometry args={[0.28, 0.32, 0.38]} /><meshStandardMaterial color="#3f443e" metalness={0.4} /></mesh>
    <Bar a={[-0.07, -0.05, 0]} b={[-0.07, -0.7, 0]} size={0.015} color="#363a37" />
    <Bar a={[0.07, -0.05, 0]} b={[0.07, -0.7, 0]} size={0.015} color="#363a37" />
    <mesh position={[0, -0.73, 0]}><cylinderGeometry args={[0.11, 0.11, 0.12, 12]} /><meshStandardMaterial color="#3b3d36" metalness={0.6} /></mesh>
    <mesh position={[0.06, -0.94, 0]} rotation={[0, 0, -0.6]}><torusGeometry args={[0.105, 0.022, 6, 16, Math.PI * 1.6]} /><meshStandardMaterial color="#3e3d34" metalness={0.65} /></mesh>
  </group>;
}
function FactoryWindow({ from, to, side, narrow = false }: { from: number; to: number; side: 0 | 1; narrow?: boolean }) {
  const a = atriumPoint(from, side), b = atriumPoint(to, side), width = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const height = narrow ? 3.5 : 3.05, bottom = narrow ? 0.15 : 1.15, columns = narrow ? 1 : Math.max(4, Math.round(width / 0.55));
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = columns * 64; c.height = (narrow ? 4 : 6) * 64; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#343d3d'; ctx.fillRect(0, 0, c.width, c.height);
    for (let row = 0; row < (narrow ? 4 : 6); row++) for (let col = 0; col < columns; col++) {
      const light = 175 + (row * 17 + col * 11) % 40;
      ctx.fillStyle = `rgb(${light},${light + 2},${light - 6})`; ctx.fillRect(col * 64 + 3, row * 64 + 3, 58, 58);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [columns]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={atriumPoint((from + to) / 2, side ? 0.981 : 0.019, bottom + height / 2)} rotation={[0, -Math.atan2(b[2] - a[2], b[0] - a[0]), 0]}>
    <mesh><boxGeometry args={[width + 0.24, height + 0.25, 0.09]} /><meshStandardMaterial color="#a1a18e" roughness={1} /></mesh>
    <mesh><boxGeometry args={[width, height, 0.14]} /><meshStandardMaterial map={texture} roughness={0.65} /></mesh>
    <mesh position={[0, 0, 0]}><boxGeometry args={[0.045, height, 0.155]} /><meshStandardMaterial color="#303939" /></mesh>
  </group>;
}
function StandingBanner({ u, v, astra = false }: { u: number; v: number; astra?: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 672; const ctx = c.getContext('2d')!;
    ctx.fillStyle = astra ? '#11171d' : '#f0eee9'; ctx.fillRect(0, 0, 256, 672);
    if (astra) {
      ctx.fillStyle = '#b9d1dd';
      for (let i = 0; i < 130; i++) { const x = (i * 73 + 19) % 256, y = (i * i * 17) % 450; ctx.fillRect(x, y, 1 + i % 3, 1 + i % 3); }
      ctx.fillStyle = '#f3f1e8'; ctx.font = 'bold 49px sans-serif'; ctx.fillText('Astra', 17, 535); ctx.font = 'bold 40px sans-serif'; ctx.fillText('Commons', 17, 590);
    } else {
      ctx.fillStyle = '#a595c6'; ctx.beginPath(); ctx.arc(65, 260, 112, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#29252d'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('OpenAI', 20, 72); ctx.font = '70px sans-serif'; ctx.fillText('^', 150, 315);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [astra]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={atriumPoint(u, v, 1.05)} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.7, 2.1, 0.04]} /><meshStandardMaterial map={texture} roughness={1} /></mesh>;
}
export function RoomFiveAtrium({ roof = true, furniture = true }: { roof?: boolean; furniture?: boolean }) {
  return <group>
    {roof && <><Roof /><Gable u={0} /><Gable u={1} /></>}
    {ROOM_FIVE.trussStations.map((u) => <Truss key={u} u={u} />)}
    {[0.06, 0.94].map((v) => <IBeam key={v} a={atriumPoint(0.015, v, EAVE - 0.32)} b={atriumPoint(0.985, v, EAVE - 0.32)} />)}
    {[0.27, 0.7].map((u) => <IBeam key={u} a={atriumPoint(u, 0.06, EAVE - 0.5)} b={atriumPoint(u, 0.94, EAVE - 0.5)} />)}
    <Hoist u={0.27} v={0.09} /><Hoist u={0.7} v={0.91} />
    {ROOM_FIVE.factoryWindows.map(([from, to], i) => <FactoryWindow key={i} from={from} to={to} side={0} />)}
    {ROOM_FIVE.frostedPanels.map((u) => <FactoryWindow key={u} from={u - 0.018} to={u + 0.018} side={1} narrow />)}
    <group position={atriumPoint(0.57, 0.5, EAVE - 0.85)}>
      <Bar a={[0, 0, 0]} b={[0, 0.55, 0]} size={0.035} color="#b9bfbb" />
      <mesh><boxGeometry args={[0.47, 0.2, 0.34]} /><meshStandardMaterial color="#e0e4df" /></mesh>
      <mesh position={[0.243, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.065, 0.065, 0.025, 12]} /><meshStandardMaterial color="#223438" roughness={0.25} /></mesh>
    </group>
    {[0.1, 0.3, 0.5, 0.72, 0.9].flatMap((u, i) => [0.015, 0.985].map((v) => <group key={`${u}-${v}`} position={atriumPoint(u, v, EAVE - 0.65)}>
      <mesh><boxGeometry args={[0.08, 0.13, 0.07]} /><meshStandardMaterial color="#242c30" /></mesh>
      <mesh position={[0, -0.08, v < 0.5 ? 0.06 : -0.06]}><sphereGeometry args={[0.035, 6, 4]} /><meshStandardMaterial color={i % 2 ? '#66aaff' : '#b17bf1'} emissive={i % 2 ? '#66aaff' : '#b17bf1'} emissiveIntensity={1.2} /></mesh>
    </group>))}
    <StandingBanner u={0.04} v={0.61} astra /><StandingBanner u={0.35} v={0.91} /><StandingBanner u={0.78} v={0.07} />
    {furniture && <FurnitureCollection items={ROOM_FIVE_FURNITURE} />}
  </group>;
}
