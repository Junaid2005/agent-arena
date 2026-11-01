'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { LOCKED_ROOM_DOORS } from '../../../../packages/shared/src/lockedRooms';

function signTexture(title: string) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eeede5'; ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = '#283537'; ctx.lineWidth = 9; ctx.strokeRect(8, 8, 752, 240);
  ctx.textAlign = 'center'; ctx.fillStyle = '#18282b';
  ctx.font = 'bold 55px sans-serif'; ctx.fillText(title, 384, 111, 710);
  ctx.font = 'bold 44px sans-serif'; ctx.fillText('LOCKED', 384, 190, 710);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function DoorDetails({ door }: { door: typeof LOCKED_ROOM_DOORS[number] }) {
  const texture = useMemo(() => signTexture(door.title), [door.title]);
  useEffect(() => () => texture.dispose(), [texture]);
  const { panel } = door, [width, height] = panel.size;
  return <group position={[panel.position[0], 0, panel.position[2]]} rotation={[0, panel.rotation ?? 0, 0]}>
    {[-1, 1].map((side) => <mesh key={`jamb-${side}`} position={[side * (width / 2 + 0.035), height / 2, 0]}>
      <boxGeometry args={[0.07, height, 0.18]} /><meshStandardMaterial color="#313d3d" roughness={0.85} />
    </mesh>)}
    <mesh position={[0, height + 0.025, 0]}><boxGeometry args={[width + 0.14, 0.07, 0.18]} /><meshStandardMaterial color="#313d3d" /></mesh>
    {[-1, 1].map((side) => <group key={`face-${side}`} rotation={[0, side === -1 ? Math.PI : 0, 0]}>
      <mesh position={[0, 1.55, 0.057]}><planeGeometry args={[Math.min(1.05, width - 0.1), 0.35]} /><meshBasicMaterial map={texture} /></mesh>
      <mesh position={[width * 0.34, 1.02, 0.09]}><boxGeometry args={[0.13, 0.035, 0.055]} /><meshStandardMaterial color="#b2b5ae" metalness={0.7} roughness={0.45} /></mesh>
      <mesh position={[width * 0.34, 0.95, 0.066]}><boxGeometry args={[0.025, 0.05, 0.025]} /><meshStandardMaterial color="#151f20" /></mesh>
    </group>)}
  </group>;
}

export function LockedRoomDoors() {
  return <group>{LOCKED_ROOM_DOORS.map((door) => <DoorDetails key={door.panel.id} door={door} />)}</group>;
}
