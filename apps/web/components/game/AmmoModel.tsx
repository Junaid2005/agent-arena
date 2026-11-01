import { AdditiveBlending } from 'three';
import { WEAPONS, type WeaponId } from '../../../../packages/shared/src/weapons';
import { CONFETTI_COLOURS, WEAPON_ART } from '../../lib/weapon-visuals';

// All models point down local -Z, like the held weapons. No texture fetches.
export function AmmoModel({ weapon, pellet = 0 }: { weapon: WeaponId; pellet?: number }) {
  const art = WEAPON_ART[weapon], color = WEAPONS[weapon].color;
  if (weapon === 'rpg') return <group name="ammo:rocket">
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.34, 8]} /><meshStandardMaterial color="#f2e4b4" /></mesh>
    <mesh position={[0, 0, -0.24]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.1, 0.2, 8]} /><meshStandardMaterial color={color} /></mesh>
    {[0, Math.PI / 2].map((angle) => <mesh key={angle} position={[0, 0, 0.14]} rotation={[0, 0, angle]}><boxGeometry args={[0.28, 0.025, 0.16]} /><meshStandardMaterial color={color} /></mesh>)}
    <mesh position={[0, 0, 0.34]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.07, 0.3, 6]} /><meshBasicMaterial color="#ffe35e" transparent opacity={0.8} /></mesh>
  </group>;
  if (weapon === 'laser') return <group name="ammo:laser-bolt">
    <mesh scale={[0.025, 0.025, 0.24]}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color="#e6fffc" /></mesh>
    <mesh scale={[0.065, 0.065, 0.3]}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial color={color} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} /></mesh>
  </group>;
  if (weapon === 'fart') return <group name="ammo:gas-puff">
    {[0, 1, 2].map((i) => <mesh key={i} position={[Math.sin(i * 2.3) * 0.17, Math.cos(i * 2.3) * 0.12, 0]}><sphereGeometry args={[0.23, 7, 5]} /><meshBasicMaterial color={i % 2 ? '#7caa3c' : color} transparent opacity={0.2} depthWrite={false} /></mesh>)}
  </group>;
  if (weapon === 'confetti') return <group name="ammo:confetti-pellet">
    <mesh><sphereGeometry args={[0.045, 5, 4]} /><meshBasicMaterial color={CONFETTI_COLOURS[pellet % CONFETTI_COLOURS.length]} /></mesh>
    <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.025, 0.008, 0.11]} /><meshBasicMaterial color={CONFETTI_COLOURS[(pellet + 1) % CONFETTI_COLOURS.length]} /></mesh>
  </group>;
  return <group name={`ammo:${weapon}`}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[art.radius, art.radius, art.length, 6]} /><meshBasicMaterial color={weapon === 'smg' ? '#ffe3ed' : '#e4be62'} /></mesh>
    <mesh position={[0, 0, -art.length / 2 - art.radius]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[art.radius, art.radius * 2, 6]} /><meshBasicMaterial color={color} /></mesh>
  </group>;
}
