import type { Box } from './types.ts';
export const TICK_RATE = 25;
export const DT = 1 / TICK_RATE;
export const MATCH_MS = 180_000;
export const MAX_PLAYERS = 12;
export const MAX_HP = 3;
export const RESPAWN_MS = 3_000;
export const FIRE_INTERVAL = 180;
export const SPEED = 6;
export const RADIUS = 0.36;
export const HEIGHT = 1.7;
export const COLORS = [
  '#b9fa44',
  '#ff689c',
  '#6cddff',
  '#ffb74e',
  '#bb9dff',
  '#ffffff',
  '#ff7854',
  '#65efbf',
  '#ffe35e',
  '#c4b2ff',
  '#5fe8dc',
  '#f5a2c9',
];
// One source of truth for the client, authoritative movement and hitscan.
export { VENUE_SPAWNS as SPAWNS, VENUE_BOUNDS as MAP_BOUNDS } from './venue.ts';
import { VENUE_ROOMS, VENUE_SOLIDS, VENUE_WALLS, planToWorld } from './venue.ts';
export const ARENA: Box[] = [...VENUE_WALLS, ...VENUE_SOLIDS];
export const ZONES = VENUE_ROOMS.filter((r) => !r.access && r.id !== 'vestibule').map((r) => {
  const [x, z] = planToWorld(r.label);
  return { name: r.name, x, z, color: '#344952' };
});
