'use client';
import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react';
import { Html, RoundedBox, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Player } from '../../../../packages/shared/src/types';
import { runtime, useGame } from '../../lib/store';

class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function GeneratedModel({ url, moving }: { url: string; moving: boolean }) {
  const { scene, animations } = useGLTF(url);
  const { object, scale, offset } = useMemo(() => {
    const object = clone(scene);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const height = box.max.y - box.min.y,
      scale = 1.75 / Math.max(height, 0.01);
    object.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    return {
      object,
      scale,
      offset: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2] as [
        number,
        number,
        number,
      ],
    };
  }, [scene]);
  const ref = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, ref);
  const last = useRef('');
  useFrame(() => {
    const name = names.find((n) => (moving ? /walk|run/i.test(n) : /idle/i.test(n))) || names[0];
    if (name && name !== last.current) {
      actions[last.current]?.fadeOut(0.2);
      actions[name]?.reset().fadeIn(0.2).play();
      last.current = name;
    }
  });
  return (
    <group ref={ref} scale={scale}>
      <group position={offset}>
        <primitive object={object} />
      </group>
    </group>
  );
}
export function Character({
  player,
  local = false,
  lobby = false,
}: {
  player: Player;
  local?: boolean;
  lobby?: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null),
    leftLeg = useRef<THREE.Group>(null),
    rightLeg = useRef<THREE.Group>(null),
    gun = useRef<THREE.Group>(null),
    flash = useRef<THREE.Mesh>(null),
    rigid = useRef<RapierRigidBody>(null);
  const pos = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  const playerArt = useLoader(THREE.TextureLoader, '/characters/arena-player.png');
  const shots = useGame((s) => s.shots),
    latest = shots.filter((s) => s.shooter === player.id).at(-1);
  useFrame(({ clock }, dt) => {
    const p = local ? runtime.local || player : player;
    if (!root.current || !body.current) return;
    const now = Date.now() + runtime.clockOffset,
      t = clock.elapsedTime,
      moving = p.moving || lobby,
      dead = p.hp <= 0,
      knock = now < p.knockUntil,
      dive = now < p.diveUntil;
    const target = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
    if (pos.current.distanceTo(target) > 4) pos.current.copy(target);
    else pos.current.lerp(target, 1 - Math.exp(-dt * (local ? 24 : 13)));
    root.current.position.copy(pos.current);
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, p.yaw, 16, dt);
    rigid.current?.setNextKinematicTranslation({
      x: pos.current.x,
      y: pos.current.y + 0.85,
      z: pos.current.z,
    });
    const recoil = latest ? Math.max(0, 1 - (now - latest.at) / 160) : 0;
    const tumble = dead
      ? 1.45
      : knock
        ? Math.sin(((now - p.knockUntil + 900) / 900) * Math.PI) * 1.3
        : dive
          ? 1.15
          : 0;
    body.current.rotation.x = THREE.MathUtils.damp(
      body.current.rotation.x,
      tumble + (moving ? -0.12 : 0) + recoil * 0.12,
      12,
      dt,
    );
    body.current.rotation.z = THREE.MathUtils.damp(
      body.current.rotation.z,
      dead ? 0.3 : Math.sin(t * (moving ? 10 : 2)) * (moving ? 0.075 : 0.025),
      9,
      dt,
    );
    body.current.position.y = dead
      ? 0.2
      : Math.sin(t * (moving ? 18 : 2)) * (moving ? 0.035 : 0.015);
    body.current.scale.y = THREE.MathUtils.damp(
      body.current.scale.y,
      !p.grounded ? 0.94 : 1,
      12,
      dt,
    );
    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.damp(
        head.current.rotation.y,
        Math.sin(t * 1.8) * 0.07,
        4,
        dt,
      );
      head.current.rotation.x = -p.pitch * 0.5;
    }
    const stride = moving && !dead ? Math.sin(t * 11) * 0.6 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    if (gun.current) gun.current.rotation.x = -p.pitch - recoil * 0.18;
    if (flash.current) flash.current.visible = recoil > 0.65;
  });
  const defaultRig = (
    <>
      <group position={[0, 0.76, 0]} ref={leftLeg}>
        <Limb position={[-0.17, -0.2, 0]} color="#304340" />
        <RoundedBox
          args={[0.28, 0.18, 0.46]}
          radius={0.06}
          position={[-0.17, -0.65, -0.06]}
          castShadow
        >
          <meshStandardMaterial color="#24312f" />
        </RoundedBox>
      </group>
      <group position={[0, 0.76, 0]} ref={rightLeg}>
        <Limb position={[0.17, -0.2, 0]} color="#304340" />
        <RoundedBox
          args={[0.28, 0.18, 0.46]}
          radius={0.06}
          position={[0.17, -0.65, -0.06]}
          castShadow
        >
          <meshStandardMaterial color="#24312f" />
        </RoundedBox>
      </group>
      <RoundedBox
        args={[0.66, 0.68, 0.4]}
        radius={0.14}
        smoothness={3}
        position={[0, 1.02, 0]}
        castShadow
      >
        <meshStandardMaterial color={player.color} roughness={0.44} />
      </RoundedBox>
      <RoundedBox args={[0.4, 0.35, 0.09]} radius={0.045} position={[0, 1.02, -0.22]} castShadow>
        <meshStandardMaterial color="#334541" />
      </RoundedBox>
      <group ref={head} position={[0, 1.57, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.31, 20, 16]} />
          <meshStandardMaterial color={player.color} roughness={0.42} />
        </mesh>
        <RoundedBox
          args={[0.51, 0.22, 0.17]}
          radius={0.07}
          position={[0, 0.015, -0.235]}
          castShadow
        >
          <meshStandardMaterial color="#192a29" roughness={0.15} metalness={0.45} />
        </RoundedBox>
        <mesh position={[0.1, 0.06, -0.326]}>
          <planeGeometry args={[0.16, 0.025]} />
          <meshBasicMaterial color="#b5f7df" />
        </mesh>
        <RoundedBox args={[0.32, 0.12, 0.1]} radius={0.04} position={[0, -0.18, -0.24]}>
          <meshStandardMaterial color="#405550" />
        </RoundedBox>
      </group>
    </>
  );
  return (
    <>
      {!lobby && local && (
        <RigidBody
          ref={rigid}
          type="kinematicPosition"
          colliders={false}
          position={[player.position.x, player.position.y + 0.85, player.position.z]}
          enabledRotations={[false, false, false]}
        >
          <CapsuleCollider args={[0.49, 0.36]} />
        </RigidBody>
      )}
      <group ref={root} position={[player.position.x, player.position.y, player.position.z]}>
        <group ref={body}>
          {player.avatarUrl ? (
            <ModelBoundary fallback={defaultRig}>
              <Suspense fallback={defaultRig}>
                <GeneratedModel url={player.avatarUrl} moving={player.moving} />
              </Suspense>
            </ModelBoundary>
          ) : (
            <mesh position={[0, 1.03, 0]} castShadow>
              <planeGeometry args={[1.25, 2.04]} />
              <meshStandardMaterial map={playerArt} transparent alphaTest={0.04} side={THREE.DoubleSide} roughness={0.72} />
            </mesh>
          )}
          {player.avatarUrl && <group ref={gun} position={[0, 1.18, -0.18]}>
            <Limb position={[-0.38, -0.04, -0.13]} rotation={[0.8, 0, -0.2]} color={player.color} />
            <Limb position={[0.38, -0.04, -0.13]} rotation={[0.8, 0, 0.2]} color={player.color} />
            <RoundedBox
              args={[0.15, 0.18, 0.65]}
              radius={0.04}
              position={[0.26, -0.12, -0.48]}
              castShadow
            >
              <meshStandardMaterial color="#202f2d" metalness={0.25} roughness={0.35} />
            </RoundedBox>
            <mesh position={[0.26, -0.1, -0.93]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.047, 0.047, 0.35, 10]} />
              <meshStandardMaterial color="#52675d" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0.26, 0.1, -0.43]} castShadow>
              <sphereGeometry args={[0.15, 12, 10]} />
              <meshStandardMaterial color={player.color} />
            </mesh>
            <mesh ref={flash} position={[0.26, -0.1, -1.12]} visible={false}>
              <sphereGeometry args={[0.11, 8, 8]} />
              <meshBasicMaterial color="#e2ff7b" />
            </mesh>
          </group>}
          {player.hp < 3 && player.hp > 0 && (
            <mesh position={[-0.15, 1.15, -0.235]}>
              <circleGeometry args={[0.13, 9]} />
              <meshBasicMaterial color="#ff6b9a" />
            </mesh>
          )}
        </group>
        {!local && !lobby && (
          <Html
            center
            position={[0, 2.22, 0]}
            distanceFactor={14}
            style={{ pointerEvents: 'none' }}
          >
            <div className="player-tag">
              <i style={{ background: player.color }} />
              {player.name}
              <span>{'●'.repeat(player.hp)}</span>
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
function Limb({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}) {
  return (
    <RoundedBox
      args={[0.22, 0.43, 0.24]}
      radius={0.09}
      smoothness={2}
      position={position}
      rotation={rotation}
      castShadow
    >
      <meshStandardMaterial color={color} roughness={0.6} />
    </RoundedBox>
  );
}
