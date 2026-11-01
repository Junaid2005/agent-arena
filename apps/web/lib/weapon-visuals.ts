import type { WeaponId } from '../../../packages/shared/src/weapons';

// Shared by the held models, muzzle flashes, projectile models and HUD art.
export const WEAPON_ART = {
  pistol: { muzzle: -0.62, ammo: 'PAINT ROUND', radius: 0.035, length: 0.13, flash: '#ffe7a1' },
  ar: { muzzle: -0.94, ammo: 'RIFLE ROUND', radius: 0.027, length: 0.19, flash: '#ffcf72' },
  smg: { muzzle: -0.66, ammo: 'MICRO ROUND', radius: 0.026, length: 0.1, flash: '#ffb7d7' },
  sniper: { muzzle: -1.38, ammo: 'HEAVY SLUG', radius: 0.035, length: 0.28, flash: '#d7edff' },
  rpg: { muzzle: -0.98, ammo: 'PARTY ROCKET', radius: 0.1, length: 0.52, flash: '#ffb94c' },
  laser: { muzzle: -0.81, ammo: 'DISCO CELL', radius: 0.045, length: 0.38, flash: '#a1fff5' },
  fart: { muzzle: -0.68, ammo: 'STINK CAPSULE', radius: 0.18, length: 0.22, flash: '#d2ff75' },
  confetti: { muzzle: -0.8, ammo: 'CONFETTI SHELL', radius: 0.045, length: 0.08, flash: '#ff9de7' },
} as const satisfies Record<WeaponId, unknown>;
export const CONFETTI_COLOURS = ['#ff70ad', '#ffe35e', '#65fff2', '#df9dff', '#b9fa44'];
