'use client';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOM_TWO_FURNITURE, type FurnitureItem } from '../../../../packages/shared/src/roomTwoDetails';
import { planToWorld, type PlanPoint } from '../../../../packages/shared/src/venue';

function Pole({ from, to, radius = 0.016 }: { from: number[]; to: number[]; radius?: number }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  return <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={q}>
    <cylinderGeometry args={[radius, radius, delta.length(), 6]} />
    <meshStandardMaterial color="#373a3b" metalness={0.55} roughness={0.6} />
  </mesh>;
}
const chairs = ROOM_TWO_FURNITURE.filter((item) => item.type === 'chair');
function ChairInstances() {
  const seats = useRef<THREE.InstancedMesh>(null), frames = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const parts = [new THREE.BoxGeometry(0.44, 0.055, 0.42).translate(0, 0.45, 0),
      new THREE.BoxGeometry(0.45, 0.3, 0.045).rotateX(-0.1).translate(0, 0.66, 0.21)];
    const rods: THREE.BufferGeometry[] = [];
    const rod = (from: number[], to: number[]) => {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      rods.push(new THREE.CylinderGeometry(0.016, 0.016, d.length(), 6).applyQuaternion(q).translate(...a.add(b).multiplyScalar(0.5).toArray()));
    };
    for (const side of [-1, 1]) {
      rod([side * 0.205, 0.025, -0.25], [side * 0.205, 0.77, 0.2]);
      rod([side * 0.205, 0.025, 0.27], [side * 0.205, 0.43, -0.2]);
    }
    rod([-0.205, 0.12, 0.21], [0.205, 0.12, 0.21]);
    const result = { seat: mergeGeometries(parts)!, frame: mergeGeometries(rods)! };
    [...parts, ...rods].forEach((g) => g.dispose()); return result;
  }, []);
  useEffect(() => () => { geometry.seat.dispose(); geometry.frame.dispose(); }, [geometry]);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
    chairs.forEach((item, i) => {
      const [x, z] = planToWorld(item.point);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.yaw);
      matrix.compose(new THREE.Vector3(x, 0, z), rotation, new THREE.Vector3(1, 1, 1));
      seats.current!.setMatrixAt(i, matrix); frames.current!.setMatrixAt(i, matrix);
    });
    seats.current!.instanceMatrix.needsUpdate = true; frames.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return <group>
    <instancedMesh ref={seats} args={[geometry.seat, undefined, chairs.length]} frustumCulled={false}><meshStandardMaterial color="#2d302e" roughness={0.85} /></instancedMesh>
    <instancedMesh ref={frames} args={[geometry.frame, undefined, chairs.length]} frustumCulled={false}><meshStandardMaterial color="#373a3b" metalness={0.55} roughness={0.6} /></instancedMesh>
  </group>;
}
function Table({ item }: { item: FurnitureItem }) {
  const black = item.type === 'registration';
  return <group>
    <mesh position={[0, item.height - 0.025, 0]}><boxGeometry args={[item.width, 0.05, item.depth]} />
      <meshStandardMaterial color={black ? '#1f2121' : '#a97741'} roughness={0.85} /></mesh>
    {[-1, 1].flatMap((side) => [
      <Pole key={`a-${side}`} from={[side * (item.width / 2 - 0.3), 0, -item.depth * 0.42]} to={[side * (item.width / 2 - 0.3), item.height - 0.05, item.depth * 0.38]} radius={0.02} />,
      <Pole key={`b-${side}`} from={[side * (item.width / 2 - 0.3), 0, item.depth * 0.42]} to={[side * (item.width / 2 - 0.3), item.height - 0.05, -item.depth * 0.38]} radius={0.02} />,
    ])}
    {black && <mesh position={[0, item.height / 2, item.depth / 2]}><boxGeometry args={[item.width, item.height, 0.02]} /><meshStandardMaterial color="#191b1b" roughness={1} /></mesh>}
  </group>;
}
function Sofa({ item }: { item: FurnitureItem }) {
  return <group>
    <mesh position={[0, 0.25, 0]}><boxGeometry args={[item.width, 0.35, item.depth]} /><meshStandardMaterial color="#88572e" roughness={0.7} /></mesh>
    <mesh position={[0, 0.65, 0.37]}><boxGeometry args={[item.width, 0.42, 0.16]} /><meshStandardMaterial color="#915c30" roughness={0.65} /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * (item.width / 2 - 0.1), 0.55, 0]}><boxGeometry args={[0.2, 0.35, item.depth]} /><meshStandardMaterial color="#915c30" roughness={0.65} /></mesh>)}
  </group>;
}
export function RoomTwoFurniture() {
  return <group><ChairInstances />{ROOM_TWO_FURNITURE.filter((item) => item.type !== 'chair').map((item) => {
    const [x, z] = planToWorld(item.point);
    return <group key={item.id} position={[x, 0, z]} rotation={[0, item.yaw, 0]}>
      {item.type === 'sofa' ? <Sofa item={item} /> : <Table item={item} />}
    </group>;
  })}</group>;
}
function Backdrop() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#eeeae5'; ctx.fillRect(0, 0, 1400, 800);
    const colors = ['#8074b1', '#70a7d1', '#ea8c47', '#74a16c'];
    for (let i = 0; i < 12; i++) {
      const x = (i % 6) * 270 - 70 + (i > 5 ? 120 : 0), y = i < 6 ? 470 : 720;
      ctx.fillStyle = colors[i % colors.length]; ctx.beginPath(); ctx.ellipse(x, y, 105, 115, (i % 3 - 1) * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e2b34'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(['> <', '+ +', 'O', '^ ^'][i % 4], x, y + 17);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = '#26262b'; ctx.font = 'bold 44px sans-serif'; ctx.fillText('OpenAI', 35, 90);
    ctx.font = 'bold 48px sans-serif'; ctx.fillText('DevDay Exchange', 675, 85); ctx.fillText('Community Hackathon', 675, 145);
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const [x, z] = planToWorld([572, 592]);
  return <group position={[x, 1.2, z]}>
    <mesh><boxGeometry args={[4.3, 2.4, 0.07]} /><meshStandardMaterial color="#e8e5df" roughness={1} /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[0, 0, side * 0.041]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
      <planeGeometry args={[4.3, 2.4]} /><meshStandardMaterial map={texture} roughness={1} />
    </mesh>)}
  </group>;
}
function RedPanel() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(); shape.moveTo(-0.85, 0); shape.lineTo(0.85, 0); shape.lineTo(0.85, 1.86);
    shape.quadraticCurveTo(0, 2.55, -0.85, 1.86); shape.closePath(); return new THREE.ShapeGeometry(shape);
  }, []);
  const [x, z] = planToWorld([633, 628]);
  return <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}><group rotation={[-0.06, 0, 0]}>
    <mesh geometry={geometry}><meshStandardMaterial color="#844c4b" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    {[-0.68, -0.34, 0, 0.34, 0.68].map((v) => <mesh key={v} position={[v, 1.02, 0.025]}><boxGeometry args={[0.025, 2.04, 0.025]} /><meshStandardMaterial color="#a5a9a6" /></mesh>)}
    {[0.08, 0.92, 1.25].map((y) => <mesh key={y} position={[0, y, 0.025]}><boxGeometry args={[1.55, 0.025, 0.025]} /><meshStandardMaterial color="#a5a9a6" /></mesh>)}
  </group></group>;
}
function Beam({ a, b, y, width = 0.12, depth = 0.16, color = '#303737' }: { a: PlanPoint; b: PlanPoint; y: number; width?: number; depth?: number; color?: string }) {
  const [x1, z1] = planToWorld(a), [x2, z2] = planToWorld(b);
  return <mesh position={[(x1 + x2) / 2, y, (z1 + z2) / 2]} rotation={[0, -Math.atan2(z2 - z1, x2 - x1), 0]}>
    <boxGeometry args={[Math.hypot(x2 - x1, z2 - z1), depth, width]} /><meshStandardMaterial color={color} roughness={0.9} />
  </mesh>;
}
export function RoomTwoFeatures() {
  return <group>
    <Backdrop /><RedPanel />
    <Beam a={[378, 377]} b={[526, 371]} y={5.25} width={0.24} depth={0.36} color="#99998b" />
    <Beam a={[384, 485]} b={[527, 478]} y={5.25} width={0.24} depth={0.36} color="#99998b" />
    {[378, 444, 527].map((x) => <Beam key={x} a={[x, 350]} b={[x, 575]} y={5.35} />)}
    {([[378, 377], [384, 485], [444, 483], [527, 478], [526, 371], [589, 577]] as PlanPoint[]).map((p, i) => {
      const [x, z] = planToWorld(p);
      return <group key={i} position={[x, 5.1, z]}>
        <mesh position={[0, 0, 0.16]} rotation={[0.4, 0, 0]}><boxGeometry args={[0.09, 0.12, 0.07]} /><meshStandardMaterial color="#282b2d" /></mesh>
        <pointLight position={[0, -0.2, 0.3]} color={i % 2 ? '#6b66ff' : '#35b9df'} intensity={0.7} distance={2.5} />
      </group>;
    })}
  </group>;
}
