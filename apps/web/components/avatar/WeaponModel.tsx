import { WEAPONS, type WeaponId } from '../../../../packages/shared/src/weapons';

// Small toy-like silhouettes: long scope, rocket tube, disco coils and a stink tank.
export function WeaponModel({ weapon }: { weapon: WeaponId }) {
  const w = WEAPONS[weapon];
  const long = weapon === 'sniper', rocket = weapon === 'rpg', fart = weapon === 'fart';
  const length = long ? 0.95 : rocket ? 0.8 : weapon === 'pistol' ? 0.3 : 0.55;
  return (
    <group position={[0.52, 1.08, -0.18]}>
      <mesh position={[0, 0, -0.18]}>
        <boxGeometry args={[0.18, 0.2, 0.4]} /><meshStandardMaterial color={w.color} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.15, -0.05]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.12, 0.23, 0.12]} /><meshStandardMaterial color="#20342f" />
      </mesh>
      <mesh position={[0, 0.03, -0.3 - length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rocket || fart ? 0.14 : 0.045, rocket || fart ? 0.14 : 0.06, length, 10]} />
        <meshStandardMaterial color={rocket || fart ? w.color : '#243b35'} metalness={0.3} roughness={0.4} />
      </mesh>
      {long && <mesh position={[0, 0.22, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.36, 10]} /><meshStandardMaterial color="#182923" />
      </mesh>}
      {rocket && <mesh position={[0, 0.03, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.13, 0.25, 8]} /><meshStandardMaterial color="#ffe35e" />
      </mesh>}
      {fart && <mesh position={[0, 0.21, -0.15]}>
        <sphereGeometry args={[0.19, 10, 8]} /><meshStandardMaterial color="#b9fa44" transparent opacity={0.75} />
      </mesh>}
      {weapon === 'laser' && [0, 1, 2].map((i) => <mesh key={i} position={[0, 0.03, -0.4 - i * 0.15]}>
        <torusGeometry args={[0.085, 0.022, 6, 12]} /><meshBasicMaterial color={w.color} />
      </mesh>)}
      {weapon === 'confetti' && <mesh position={[0, 0.17, -0.2]}>
        <sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#ff70ad" />
      </mesh>}
      {weapon === 'smg' && <mesh position={[0, -0.22, -0.25]}>
        <boxGeometry args={[0.1, 0.28, 0.12]} /><meshStandardMaterial color={w.color} />
      </mesh>}
    </group>
  );
}
