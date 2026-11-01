const PET_ASSET_ROOT = 'https://cdn.openai.com/c6d7b0d0-3abf-40b5-9d0c-ecd2b9364692';
export const PET_SHEET = { columns: 8, rows: 9 } as const;
export const PETS = {
  codex: { name: 'Codex', role: 'Balanced co-pilot', color: '#b9fa44', sprite: `${PET_ASSET_ROOT}/codex-spritesheet-v4.webp` },
  dewey: { name: 'Dewey', role: 'Calm cover fire', color: '#8ed4ff', sprite: `${PET_ASSET_ROOT}/dewey-spritesheet-v4.webp` },
  fireball: { name: 'Fireball', role: 'Fast paint bursts', color: '#ff8c54', sprite: `${PET_ASSET_ROOT}/fireball-spritesheet-v4.webp` },
  hoots: { name: 'Hoots', role: 'Sharp-eyed spotter', color: '#e4c6ff', sprite: `${PET_ASSET_ROOT}/hoots-spritesheet-v4.webp` },
  rocky: { name: 'Rocky', role: 'Steady defender', color: '#c7ae8a', sprite: `${PET_ASSET_ROOT}/rocky-spritesheet-v4.webp` },
  seedy: { name: 'Seedy', role: 'Fresh ideas, fresh paint', color: '#a7e676', sprite: `${PET_ASSET_ROOT}/seedy-spritesheet-v4.webp` },
  stacky: { name: 'Stacky', role: 'Deep-work backup', color: '#ffdf79', sprite: `${PET_ASSET_ROOT}/stacky-spritesheet-v4.webp` },
  bsod: { name: 'BSOD', role: 'Tiny blue-screen gremlin', color: '#75a7ff', sprite: `${PET_ASSET_ROOT}/bsod-spritesheet-v4.webp` },
  'null-signal': { name: 'Null Signal', role: 'Quiet support from the void', color: '#d5b8ff', sprite: `${PET_ASSET_ROOT}/null-signal-spritesheet-v4.webp` },
} as const;

export type PetId = keyof typeof PETS;
export const isPetId = (value: unknown): value is PetId =>
  typeof value === 'string' && Object.hasOwn(PETS, value);
