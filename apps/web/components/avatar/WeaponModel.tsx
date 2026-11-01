import { WEAPONS, type WeaponId } from '../../../../packages/shared/src/weapons';

type V3 = [number, number, number];
function Box({ at, size, color = '#243a35', rotation }: { at: V3; size: V3; color?: string; rotation?: V3 }) {
  return <mesh position={at} rotation={rotation}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.5} metalness={0.15} /></mesh>;
}
function Tube({ at, length, radius, color = '#243a35', glow = false }: { at: V3; length: number; radius: number; color?: string; glow?: boolean }) {
  return <mesh position={at} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius, length, 8]} />
    <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? 0.7 : 0} roughness={0.4} metalness={0.25} /></mesh>;
}
export function WeaponModel({ weapon }: { weapon: WeaponId }) {
  const color = WEAPONS[weapon].color;
  let parts;
  switch (weapon) {
    case 'pistol': parts = <>
      <Box at={[0, 0.04, -0.26]} size={[0.15, 0.15, 0.46]} color={color} />
      <Box at={[0, -0.14, -0.1]} size={[0.13, 0.28, 0.16]} rotation={[-0.2, 0, 0]} />
      <Tube at={[0, 0.04, -0.54]} length={0.16} radius={0.045} />
      <Box at={[0, 0.13, -0.44]} size={[0.04, 0.04, 0.04]} />
      <Box at={[0, -0.12, -0.25]} size={[0.13, 0.025, 0.18]} color={color} />
    </>; break;
    case 'ar': parts = <>
      <Box at={[0, 0, -0.28]} size={[0.16, 0.19, 0.44]} color={color} />
      <Box at={[0, 0.02, 0.08]} size={[0.13, 0.16, 0.26]} />
      <Box at={[0, -0.15, -0.14]} size={[0.1, 0.27, 0.13]} rotation={[0.3, 0, 0]} />
      <Box at={[0, -0.17, -0.36]} size={[0.12, 0.3, 0.17]} rotation={[-0.2, 0, 0]} color={color} />
      <Tube at={[0, 0.02, -0.7]} length={0.48} radius={0.045} />
      <Box at={[0, 0.13, -0.32]} size={[0.08, 0.05, 0.38]} />
      {[0, 1, 2].map((i) => <Box key={i} at={[0, 0.03, -0.52 - i * 0.08]} size={[0.19, 0.16, 0.025]} color={color} />)}
    </>; break;
    case 'smg': parts = <>
      <Box at={[0, 0.01, -0.24]} size={[0.17, 0.19, 0.4]} color={color} />
      <Box at={[0, -0.18, -0.12]} size={[0.12, 0.31, 0.15]} />
      <Box at={[0, -0.25, -0.3]} size={[0.11, 0.35, 0.12]} color={color} />
      <Tube at={[0, 0.03, -0.53]} length={0.26} radius={0.07} />
      <Box at={[0, 0.02, 0.07]} size={[0.08, 0.08, 0.24]} />
      <Box at={[0, 0.14, -0.22]} size={[0.08, 0.06, 0.13]} />
    </>; break;
    case 'sniper': parts = <>
      <Box at={[0, 0, -0.36]} size={[0.16, 0.17, 0.56]} color={color} />
      <Box at={[0, -0.01, 0.1]} size={[0.14, 0.2, 0.38]} />
      <Tube at={[0, 0.03, -0.98]} length={0.8} radius={0.04} />
      <Tube at={[0, 0.03, -1.28]} length={0.2} radius={0.065} />
      <Box at={[0, -0.16, -0.2]} size={[0.1, 0.24, 0.15]} />
      <Box at={[0, 0.14, -0.36]} size={[0.05, 0.12, 0.14]} />
      <Tube at={[0, 0.25, -0.38]} length={0.4} radius={0.075} />
      <Tube at={[0, 0.25, -0.59]} length={0.015} radius={0.06} color={color} glow />
      {[-1, 1].map((side) => <Box key={side} at={[side * 0.12, -0.17, -0.7]} size={[0.025, 0.35, 0.025]} rotation={[0, 0, side * 0.6]} />)}
    </>; break;
    case 'rpg': parts = <>
      <Tube at={[0, 0.05, -0.33]} length={1.05} radius={0.14} color={color} />
      <Tube at={[0, 0.05, 0.19]} length={0.06} radius={0.19} />
      <Tube at={[0, 0.05, -0.78]} length={0.08} radius={0.18} />
      <mesh position={[0, 0.05, -0.88]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.13, 0.2, 8]} /><meshStandardMaterial color="#ffe35e" /></mesh>
      <Box at={[0, -0.17, -0.25]} size={[0.12, 0.3, 0.14]} />
      <Box at={[0, 0.24, -0.25]} size={[0.05, 0.18, 0.12]} />
      <Box at={[0.06, 0.31, -0.25]} size={[0.17, 0.04, 0.08]} color="#ffe35e" />
    </>; break;
    case 'laser': parts = <>
      <Box at={[0, 0, -0.27]} size={[0.2, 0.2, 0.42]} color="#ecede0" />
      <Tube at={[0, 0.02, -0.6]} length={0.42} radius={0.055} color={color} glow />
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.02, -0.46 - i * 0.13]}><torusGeometry args={[0.11, 0.025, 5, 10]} /><meshBasicMaterial color={color} /></mesh>)}
      <Box at={[0, -0.15, -0.1]} size={[0.12, 0.24, 0.13]} />
      <Tube at={[0, 0.2, -0.23]} length={0.26} radius={0.075} color={color} glow />
    </>; break;
    case 'fart': parts = <>
      <Tube at={[0, 0.03, -0.26]} length={0.42} radius={0.19} color={color} />
      <Tube at={[0, 0.03, -0.54]} length={0.28} radius={0.12} color="#d9e5b0" />
      <Tube at={[0, 0.03, -0.68]} length={0.035} radius={0.18} />
      <mesh position={[0, 0.24, -0.2]}><sphereGeometry args={[0.2, 8, 6]} /><meshStandardMaterial color={color} transparent opacity={0.8} /></mesh>
      <Box at={[0, -0.17, -0.1]} size={[0.12, 0.25, 0.14]} />
      <Box at={[0, 0.43, -0.2]} size={[0.2, 0.035, 0.035]} color="#ff754c" />
      <Box at={[0.19, 0.03, -0.22]} size={[0.025, 0.11, 0.15]} color="#243a35" />
    </>; break;
    case 'confetti': parts = <>
      <Box at={[0, 0, -0.27]} size={[0.22, 0.18, 0.38]} color={color} />
      {[-0.065, 0.065].map((x) => <Tube key={x} at={[x, 0.03, -0.59]} length={0.42} radius={0.06} color="#ffdf79" />)}
      <Box at={[0, 0, 0.05]} size={[0.17, 0.2, 0.28]} color="#ff70ad" />
      <Box at={[0, -0.14, -0.18]} size={[0.12, 0.25, 0.13]} />
      <Box at={[0, -0.06, -0.53]} size={[0.24, 0.1, 0.13]} color="#65fff2" />
      {[0, 1, 2].map((i) => <Tube key={i} at={[0.14, -0.03, -0.15 - i * 0.08]} length={0.05} radius={0.035} color={['#ff70ad', '#ffe35e', '#65fff2'][i]} />)}
    </>; break;
  }
  return <group name={`weapon:${weapon}`} position={[0.52, 1.08, -0.18]}>{parts}</group>;
}
