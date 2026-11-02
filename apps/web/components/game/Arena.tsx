'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { ARENA, ARCHITECTURE, MAP_BOUNDS } from '../../../../packages/shared/src/constants';
import {
  VENUE_CALIBRATION,
  VENUE_ROOMS,
  planToWorld,
  type PlanPoint,
} from '../../../../packages/shared/src/venue';
import { concreteTexture, masonryTexture, metricBoxGeometry } from '../tour/roomTwoMaterials';
import { RegisteredEventStage } from '../tour/EventStage';
import { RoomTwoFeatures, RoomTwoFurniture } from '../tour/RoomTwoDetails';
import { RoomOneHighBay } from '../tour/RoomOneHighBay';
import { RoomFiveAtrium } from '../tour/RoomFiveAtrium';
import { RoomThreeCanal, RoomTwoHelpDesk } from '../tour/RoomThreeCanal';
import { LockedRoomDoors } from '../tour/LockedRoomDoors';
import { RoomElevenYard } from './RoomElevenYard';
import { EntranceFoyer } from '../tour/EntranceFoyer';
import {
  photographedMasonry,
  visibleInCurrentEvent,
} from '../../../../packages/shared/src/roomTwoDetails';
import { useGame } from '../../lib/store';
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
const footprint: PlanPoint[] = [
  [294, 48],
  [394, 45],
  [494, 230],
  [644, 257],
  [1057, 344],
  [1336, 388],
  [1388, 388],
  [1388, 898],
  [653, 898],
  [652, 882],
  [345, 891],
];
function Floor({
  outline,
  holes,
  color,
  y = 0,
  map,
}: {
  outline: PlanPoint[];
  holes?: PlanPoint[][];
  color: string;
  y?: number;
  map?: THREE.Texture;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    outline.forEach((p, i) => {
      const [x, z] = planToWorld(p);
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    for (const ring of holes ?? []) {
      const path = new THREE.Path();
      ring.forEach((p, i) => {
        const [x, z] = planToWorld(p);
        if (i === 0) path.moveTo(x, -z);
        else path.lineTo(x, -z);
      });
      path.closePath();
      shape.holes.push(path);
    }
    return new THREE.ShapeGeometry(shape);
  }, [outline, holes]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial
        color={color}
        map={map}
        bumpMap={map}
        bumpScale={map ? 0.018 : 0}
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
/** Architectural blockout; room 2 now has photo-informed surface finishes.
 * Door faces, roof steps and event objects await plan registration, rather than guessed placement. */
export function VenueModel({
  labels = true,
  ceilings = false,
  eventSetup = false,
  furniture = true,
}: {
  labels?: boolean;
  ceilings?: boolean;
  eventSetup?: boolean;
  furniture?: boolean;
}) {
  const materials = useMemo(
    () => ({
      floor: concreteTexture(true),
      column: concreteTexture(false),
      brick: masonryTexture(false),
      block: masonryTexture(true),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(materials).forEach((texture) => texture.dispose());
    },
    [materials],
  );
  const photographedHall = (id: string) => ['lightwell', 'boat', 'atrium', 'canal'].includes(id);
  return (
    <group>
      <Floor outline={footprint} color="#d5d8d5" y={-0.008} />
      {VENUE_ROOMS.map((room) => (
        <Floor
          key={room.id}
          outline={room.outline}
          holes={room.holes}
          color="#ffffff"
          map={materials.floor}
        />
      ))}
      {/* The raised roof now has its own photo-estimated assembly rather than a flat hall cap. */}
      {ceilings &&
        VENUE_ROOMS.filter(
          (room) =>
            room.access !== 'outdoor' &&
            room.id !== 'boat' &&
            (!eventSetup || !['atrium', 'canal', 'foyer'].includes(room.id)),
        ).map((room) => (
          <Floor
            key={`ceiling-${room.id}`}
            outline={room.outline}
            holes={room.holes}
            color={photographedHall(room.id) ? '#4a4e4b' : '#9a9b8e'}
            map={materials.column}
            y={VENUE_CALIBRATION.wallHeight}
          />
        ))}
      {ARCHITECTURE.filter((box) => !eventSetup || visibleInCurrentEvent(box)).map((box) => (
        <VenueBox key={box.id} box={box} materials={materials} />
      ))}
      {eventSetup && (
        <>
          <RoomOneHighBay roof={ceilings} />
          <RoomFiveAtrium roof={ceilings} furniture={furniture} />
          <RoomThreeCanal roof={ceilings} furniture={furniture} />
          <RoomElevenYard furniture={furniture} />
          <LockedRoomDoors />
          <EntranceFoyer roof={ceilings} furniture={furniture} />
          <RegisteredEventStage />
          <RoomTwoFeatures />
          <RoomTwoHelpDesk furniture={furniture} />
          {furniture && <RoomTwoFurniture />}
        </>
      )}
      {labels &&
        VENUE_ROOMS.filter((r) => r.id !== 'vestibule').map((room) => {
          const [x, z] = planToWorld(room.label);
          return <FloorLabel key={room.id} text={room.name} x={x} z={z} />;
        })}
    </group>
  );
}
function VenueBox({ box, materials }: { box: Box; materials: Record<string, THREE.Texture> }) {
  const closedPanel = /-gate-\d+$/.test(box.id);
  // User requested shared finishes in unphotographed spaces instead of blank white walls.
  const masonry =
    photographedMasonry(box.id) ??
    (box.kind === 'wall' &&
    !box.id.startsWith('column-') &&
    !closedPanel &&
    !box.id.includes('lintel')
      ? 'brick'
      : null);
  const geometry = useMemo(
    () =>
      masonry
        ? metricBoxGeometry(box.size, masonry === 'block' ? 0.9 : 0.6)
        : new THREE.BoxGeometry(...box.size),
    [box, masonry],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const concrete = /^column-[0-5]$/.test(box.id) || box.id.includes('lintel');
  const map = masonry ? materials[masonry] : concrete ? materials.column : undefined;
  const gate = box.id.startsWith('west-gate-gate-');
  return (
    <group position={box.position} rotation={[0, box.rotation ?? 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={map ? '#ffffff' : gate ? '#414b4f' : box.color}
          map={map}
          bumpMap={map}
          bumpScale={masonry ? 0.025 : 0.015}
          roughness={0.95}
        />
      </mesh>
      {gate && (
        <>
          <mesh position={[0, box.size[1] / 2 + 0.1, -0.14]}>
            <boxGeometry args={[box.size[0] + 0.65, 0.09, 0.1]} />
            <meshStandardMaterial color="#343d40" metalness={0.45} />
          </mesh>
          {[-0.75, -0.35, 0.05, 0.45, 0.85].map((y) => (
            <mesh key={y} position={[0, y, -box.size[2] / 2 - 0.02]}>
              <boxGeometry args={[box.size[0], 0.03, 0.035]} />
              <meshStandardMaterial color="#30393d" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
export function Arena() {
  const inGame = useGame((s) => s.screen === 'game');
  const { minX, maxX, minZ, maxZ } = MAP_BOUNDS;
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[(maxX - minX) / 2, 0.25, (maxZ - minZ) / 2]}
          position={[(minX + maxX) / 2, -0.25, (minZ + maxZ) / 2]}
        />
        {ARENA.map((box) => (
          <CuboidCollider
            key={box.id}
            position={box.position}
            rotation={[0, box.rotation ?? 0, 0]}
            args={[box.size[0] / 2, box.size[1] / 2, box.size[2] / 2]}
          />
        ))}
        <VenueModel eventSetup ceilings={inGame} />
      </RigidBody>
      {process.env.NEXT_PUBLIC_VENUE_URL && (
        <Suspense fallback={null}>
          <Venue />
        </Suspense>
      )}
    </group>
  );
}
function FloorLabel({ text, x, z }: { text: string; x: number; z: number }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#344952';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 512, 86);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, z]}>
      <planeGeometry args={[Math.max(2, text.length * 0.16), 0.45]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
