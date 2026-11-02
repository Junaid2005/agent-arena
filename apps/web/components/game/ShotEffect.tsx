'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Shot } from '../../../../packages/shared/src/types';
import { runtime } from '../../lib/store';
import { CONFETTI_COLOURS } from '../../lib/weapon-visuals';
import { AmmoModel } from './AmmoModel';

// Bullet motion is a short cosmetic tracer over the server's instantaneous ray.
// Only rockets use travelMs for gameplay; their impact arrives as a separate event.
export function ShotEffect({ shot }: { shot: Shot }) {
  const trail = useRef<THREE.Group>(null),
    burst = useRef<THREE.Group>(null);
  const rounds = useRef<(THREE.Group | null)[]>([]);
  const from = useMemo(() => new THREE.Vector3(shot.from.x, shot.from.y, shot.from.z), [shot]);
  const paths = useMemo(
    () =>
      (shot.trails?.length ? shot.trails : [shot.to]).map((p) => {
        const to = new THREE.Vector3(p.x, p.y, p.z);
        const direction = to.clone().sub(from).normalize();
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          direction,
        );
        return { to, rotation };
      }),
    [shot, from],
  );
  const rocket = !!shot.travelMs,
    gas = shot.weapon === 'fart',
    laser = shot.weapon === 'laser';
  const roundCount = gas ? 7 : paths.length;
  useFrame(() => {
    const age = Date.now() + runtime.clockOffset - shot.at;
    const duration = rocket ? shot.travelMs! : gas ? 500 : laser ? 130 : 95;
    if (trail.current)
      trail.current.visible = !shot.impact && !rocket && !gas && age >= 0 && age < duration;
    for (let i = 0; i < rounds.current.length; i++) {
      const round = rounds.current[i];
      if (!round) continue;
      round.visible = !shot.impact && age >= 0 && age < duration;
      const path = paths[gas ? 0 : i];
      const progress = Math.max(0, Math.min(1, age / duration));
      round.position.copy(from).lerp(path.to, gas ? (progress * (i + 1)) / roundCount : progress);
      if (gas) {
        const spread = (progress * (i + 1)) / roundCount;
        round.position.x += Math.sin(i * 2.4) * spread * 0.7;
        round.position.y += Math.cos(i * 2.4) * spread * 0.4;
        round.scale.setScalar(0.5 + spread * 2);
      }
    }
    if (burst.current) {
      burst.current.visible =
        !rocket && !gas && age >= 0 && age < (laser ? 220 : shot.impact ? 650 : 350);
      for (const impact of burst.current.children) {
        impact.scale.setScalar(
          shot.impact ? Math.max(0.1, Math.min(1, age / 300)) : 0.4 + Math.min(age, 350) / 180,
        );
        if (shot.weapon === 'confetti') impact.rotation.y = age / 350;
      }
    }
  });
  return (
    <group name={`shot:${shot.weapon}`}>
      <group ref={trail} visible={false}>
        {paths.map(({ to }, i) => (
          <Line
            key={i}
            points={[from, to]}
            color={
              shot.weapon === 'confetti'
                ? CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]
                : shot.color
            }
            lineWidth={laser ? 3 : shot.weapon === 'sniper' ? 1.5 : 0.7}
            transparent
            opacity={laser ? 0.65 : 0.35}
          />
        ))}
      </group>
      {!shot.impact &&
        Array.from({ length: roundCount }, (_, i) => (
          <group
            key={i}
            ref={(node) => {
              rounds.current[i] = node;
            }}
            quaternion={paths[gas ? 0 : i].rotation}
            visible={false}
          >
            <AmmoModel weapon={shot.weapon} pellet={i} />
          </group>
        ))}
      <group ref={burst} visible={false}>
        {(shot.impact ? [paths[0]] : paths).map(({ to, rotation }, index) => (
          <group key={index} position={to}>
            {laser ? (
              <group quaternion={rotation}>
                <mesh>
                  <torusGeometry args={[0.12, 0.02, 4, 12]} />
                  <meshBasicMaterial color={shot.color} transparent opacity={0.8} />
                </mesh>
                <mesh>
                  <octahedronGeometry args={[0.07, 0]} />
                  <meshBasicMaterial color="#ecfffb" />
                </mesh>
              </group>
            ) : (
              Array.from({ length: shot.impact ? 7 : 4 }, (_, i) => (
                <mesh
                  key={i}
                  position={[
                    Math.sin(i * 5.1 + index) * 0.14,
                    Math.cos(i * 3.8) * 0.14,
                    Math.sin(i * 2.3) * 0.14,
                  ]}
                  rotation={[i * 0.8, index, i * 1.7]}
                >
                  {shot.weapon === 'confetti' ? (
                    <planeGeometry args={[0.09, 0.045]} />
                  ) : shot.impact ? (
                    <icosahedronGeometry args={[0.25, 0]} />
                  ) : (
                    <boxGeometry args={[0.025, 0.025, shot.weapon === 'sniper' ? 0.19 : 0.07]} />
                  )}
                  <meshBasicMaterial
                    color={
                      shot.weapon === 'confetti'
                        ? CONFETTI_COLOURS[(index + i) % CONFETTI_COLOURS.length]
                        : i % 2
                          ? '#ffe8a1'
                          : shot.color
                    }
                    side={THREE.DoubleSide}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              ))
            )}
            {shot.impact && (
              <>
                <mesh>
                  <sphereGeometry args={[shot.blastRadius || 4, 12, 8]} />
                  <meshBasicMaterial
                    color={shot.color}
                    transparent
                    opacity={0.09}
                    wireframe
                    depthWrite={false}
                  />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[(shot.blastRadius || 4) * 0.9, shot.blastRadius || 4, 24]} />
                  <meshBasicMaterial
                    color="#ffcf72"
                    transparent
                    opacity={0.25}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
