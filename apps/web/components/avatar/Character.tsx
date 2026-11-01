'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { Player } from '../../../../packages/shared/src/types';
import { PETS, isPetId, PET_SHEET } from '../../../../packages/shared/src/pets';
import { WeaponModel } from './WeaponModel';
import { isWeaponId } from '../../../../packages/shared/src/weapons';
import { WEAPON_ART } from '../../lib/weapon-visuals';
import { runtime, useGame } from '../../lib/store';
import { petFrame } from '../../lib/pet-animation';

export function Character({ player, local = false, lobby = false }: {
  player: Player; local?: boolean; lobby?: boolean;
}) {
  const pet = isPetId(player.pet) ? player.pet : 'codex';
  const image = useLoader(THREE.TextureLoader, PETS[pet].sprite);
  // Each player owns the UV transform; sharing it would synchronize different animations.
  const texture = useMemo(() => {
    const t = image.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.LinearFilter;
    t.repeat.set(1 / PET_SHEET.columns, 1 / PET_SHEET.rows);
    t.offset.set(0, 1 - 1 / PET_SHEET.rows);
    t.needsUpdate = true;
    return t;
  }, [image]);
  useEffect(() => () => texture.dispose(), [texture]);
  const root = useRef<THREE.Group>(null);
  const aim = useRef<THREE.Group>(null);
  const pitch = useRef<THREE.Group>(null);
  const sprite = useRef<THREE.Sprite>(null);
  const flash = useRef<THREE.Mesh>(null);
  const latest = useGame((s) => s.shots.findLast((shot) => shot.shooter === player.id && !shot.impact));
  const weapon = isWeaponId(player.weapon) ? player.weapon : 'pistol';
  const rigid = useRef<RapierRigidBody>(null);
  const pos = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  useFrame(({ clock, camera }, dt) => {
    const p = local ? runtime.local || player : player;
    if (!root.current || !sprite.current) return;
    const now = Date.now() + runtime.clockOffset;
    const target = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
    if (pos.current.distanceTo(target) > 4) pos.current.copy(target);
    else pos.current.lerp(target, 1 - Math.exp(-dt * (local ? 24 : 13)));
    root.current.position.copy(pos.current);
    if (aim.current) { aim.current.rotation.y = p.yaw; aim.current.visible = p.hp > 0; }
    const recoil = latest ? Math.max(0, 1 - (now - latest.at) / 140) : 0;
    if (pitch.current) {
      pitch.current.rotation.x = -p.pitch - recoil * 0.06;
      pitch.current.position.z = recoil * 0.06;
    }
    if (flash.current) { flash.current.visible = p.hp > 0 && recoil > 0.55; flash.current.scale.setScalar(0.7 + recoil * 0.4); }
    rigid.current?.setNextKinematicTranslation({ x: pos.current.x, y: pos.current.y + 0.85, z: pos.current.z });
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const facingLeft = -Math.sin(p.yaw) * cameraRight.x - Math.cos(p.yaw) * cameraRight.z < 0;
    const frame = petFrame(p, now, clock.elapsedTime, facingLeft);
    texture.offset.set(frame.column / PET_SHEET.columns, 1 - (frame.row + 1) / PET_SHEET.rows);
    const dead = p.hp <= 0, dive = now < p.diveUntil, knock = now < p.knockUntil;
    sprite.current.material.rotation = THREE.MathUtils.damp(
      sprite.current.material.rotation, dead ? -Math.PI / 2 : dive ? -0.65 : knock ? 0.5 : 0, 12, dt,
    );
    sprite.current.position.y = dead ? 0.4 : dive || knock ? 0.65 : 0.98;
    sprite.current.material.opacity = dead ? 0.45 : now < p.protectedUntil ? 0.65 + Math.sin(clock.elapsedTime * 12) * 0.2 : 1;
  });
  return (
    <>
      {!lobby && local && (
        <RigidBody ref={rigid} type="kinematicPosition" colliders={false}
          position={[player.position.x, player.position.y + 0.85, player.position.z]}
          enabledRotations={[false, false, false]}>
          <CapsuleCollider args={[0.49, 0.36]} />
        </RigidBody>
      )}
      <group ref={root} name={`pet-player:${player.id}:${pet}`} position={[player.position.x, player.position.y, player.position.z]}>
        <sprite ref={sprite} position={[0, 0.98, 0]} scale={[1.8, 1.95, 1]}>
          <spriteMaterial map={texture} transparent alphaTest={0.08} depthWrite={false} />
        </sprite>
        {!lobby && <group ref={aim}><group ref={pitch}>
          <WeaponModel weapon={weapon} />
          <mesh ref={flash} position={[0.52, 1.11, WEAPON_ART[weapon].muzzle - 0.18]} visible={false}>
            <octahedronGeometry args={[weapon === 'fart' ? 0.1 : 0.065, 0]} />
            <meshBasicMaterial color={WEAPON_ART[weapon].flash} transparent opacity={weapon === 'fart' ? 0.3 : 0.85} />
          </mesh>
        </group></group>}
        {!local && !lobby && (
          <Html center zIndexRange={[2, 0]} position={[0, 2.22, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
            <div className="player-tag">
              <i style={{ background: player.color }} />{player.name}<span>{'●'.repeat(player.hp)}</span>
            </div>
          </Html>
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.48, 0.53, 32]} />
          <meshBasicMaterial color={player.color} transparent opacity={0.65} />
        </mesh>
      </group>
    </>
  );
}
