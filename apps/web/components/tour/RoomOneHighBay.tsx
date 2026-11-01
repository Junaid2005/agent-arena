'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ROOM_ONE, TIMBER_FACE, TIMBER_FACE_PARTS, UPPER_BAY_PARTS, type BayPart } from '../../../../packages/shared/src/roomOne';
import { HIGH_BAY_OUTLINE, planToWorld } from '../../../../packages/shared/src/venue';
import { masonryTexture, metricBoxGeometry } from './roomTwoMaterials';

function timberTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  let seed = 293;
  const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `hsl(${30 + rand() * 6} ${32 + rand() * 15}% ${39 + rand() * 14}%)`;
    ctx.fillRect(i * 57, 0, 57, 1024);
    ctx.fillStyle = '#69513b'; ctx.fillRect(i * 57, 0, 2, 1024);
  }
  for (let i = 0; i < 7000; i++) {
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(55,35,17,.12)' : 'rgba(244,210,140,.11)';
    const x = rand() * 512, y = rand() * 1024;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + rand() * 6, y + 15, x - rand() * 5, y + 40, x, y + 40 + rand() * 180); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; return texture;
}
function Part({ part, brick, wood }: { part: BayPart; brick: THREE.Texture; wood: THREE.Texture }) {
  const geometry = useMemo(() => part.surface === 'brick' ? metricBoxGeometry(part.size) : new THREE.BoxGeometry(...part.size), [part]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const map = part.surface === 'brick' ? brick : part.surface === 'wood' ? wood : undefined;
  return <mesh geometry={geometry} position={part.position} rotation={[0, part.rotation ?? 0, 0]} castShadow receiveShadow>
    {part.surface === 'glass' ? <meshPhysicalMaterial color="#a7bdc8" transparent opacity={0.45} roughness={0.18} metalness={0.05} side={THREE.DoubleSide} />
      : <meshStandardMaterial color={map ? '#ffffff' : part.color} map={map} bumpMap={map}
        bumpScale={part.surface === 'wood' ? 0.012 : 0.025} roughness={part.surface === 'steel' ? 0.7 : 0.94} />}
  </mesh>;
}
export function RoomOneHighBay({ roof = true }: { roof?: boolean }) {
  const textures = useMemo(() => ({ wood: timberTexture(), brick: masonryTexture(false) }), []);
  useEffect(() => () => { textures.wood.dispose(); textures.brick.dispose(); }, [textures]);
  const roofGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    HIGH_BAY_OUTLINE.forEach((p, i) => { const [x, z] = planToWorld(p); if (i) shape.lineTo(x, -z); else shape.moveTo(x, -z); });
    shape.closePath(); return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => roofGeometry.dispose(), [roofGeometry]);
  return <group>
    {[...TIMBER_FACE_PARTS, ...UPPER_BAY_PARTS].map((part) => <Part key={part.id} part={part} brick={textures.brick} wood={textures.wood} />)}
    {HIGH_BAY_OUTLINE.map((p, i) => {
      const [x, z] = planToWorld(p);
      return <mesh key={i} position={[x, 6.75, z]}><boxGeometry args={[0.2, 2.5, 0.2]} /><meshStandardMaterial color="#a5a394" roughness={0.95} /></mesh>;
    })}
    <group position={[TIMBER_FACE.x, 0, TIMBER_FACE.z]} rotation={[0, TIMBER_FACE.yaw, 0]}>
      {[-1, 1].flatMap((side) => [0.43, 1.53, 2.76].map((y) => <group key={`${side}-${y}`} position={[side * 0.755, y, 0.255]}>
        <mesh><boxGeometry args={[1.3, 0.09, 0.05]} /><meshStandardMaterial color="#917044" roughness={0.9} /></mesh>
        <mesh position={[side * 0.43, 0, 0.035]}><boxGeometry args={[0.35, 0.042, 0.025]} /><meshStandardMaterial color="#424342" metalness={0.4} /></mesh>
      </group>))}
      {[-0.045, 0.045].map((x) => <mesh key={x} position={[x, 1.5, 0.3]}><boxGeometry args={[0.025, 0.22, 0.04]} /><meshStandardMaterial color="#333b3e" metalness={0.45} /></mesh>)}
      <mesh position={[0, 6.77, 0.22]}><boxGeometry args={[0.045, 2.05, 0.04]} /><meshStandardMaterial color="#171e22" /></mesh>
      {[5.96, 6.37, 6.78, 7.19, 7.6].map((y) => <mesh key={y} position={[0, y, 0.22]}><boxGeometry args={[1.22, 0.045, 0.045]} /><meshStandardMaterial color="#20292e" /></mesh>)}
      {/* Linked hoist chain from the high header, visibly separate from the timber leaves. */}
      {Array.from({ length: 74 }, (_, i) => <mesh key={i} position={[0.12, 7.67 - i * 0.055, 0.42]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]}>
        <torusGeometry args={[0.043, 0.008, 5, 8]} /><meshStandardMaterial color="#3c3830" metalness={0.6} roughness={0.65} />
      </mesh>)}
    </group>
    {roof && <mesh geometry={roofGeometry} position={[0, ROOM_ONE.upperRoofHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#262d30" roughness={1} side={THREE.DoubleSide} />
    </mesh>}
  </group>;
}
