import type { Box } from './types.ts';
export const TICK_RATE = 25;
export const DT = 1 / TICK_RATE;
export const COMMENTARY_SAMPLE_RATE = 16000;
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
export const SPAWNS: [number, number, number][] = [
  [7, 0, 14],
  [-11, 0, 5],
  [15, 0, -4],
  [-12, 0.64, -11],
  [1, 0, -11],
  [-5, 0, 5],
  [12, 0, 5],
  [10.5, 0, -2],
  [-15, 0, -3],
  [7, 0, -12],
  [-4, 0, -11],
  [1, 0, 8.5],
];
export const MAP_BOUNDS = { minX: -19, maxX: 19, minZ: -17, maxZ: 18 };
const wall = (id: string, position: Box['position'], size: Box['size']): Box => ({
  id,
  position,
  size,
  color: '#9e7660',
  kind: 'wall',
});
const table = (id: string, x: number, z: number, w = 3.6): Box => ({
  id,
  position: [x, 0.45, z],
  size: [w, 0.9, 1.25],
  color: '#c08b50',
  kind: 'table',
});
// Approximate metres, manually traced from hackathon-map-rev03.webp. No survey scale was supplied.
export const ARENA: Box[] = [
  wall('north', [0, 2.5, -17], [38, 5, 0.4]),
  wall('south', [0, 2.5, 18], [38, 5, 0.4]),
  wall('west', [-19, 2.5, 0.5], [0.4, 5, 35]),
  wall('east', [19, 2.5, 0.5], [0.4, 5, 35]),
  wall('offlimits-sw', [-13, 2.5, 13], [12, 5, 10]),
  wall('offlimits-stagebottom', [-4.5, 2.5, 14], [5, 5, 8]),
  wall('offlimits-se', [17, 2.5, 9], [4, 5, 18]),
  wall('offlimits-toilets', [0.5, 2.5, 14], [5, 5, 8]),
  wall('offlimits-nw', [-13, 2.5, -15.5], [12, 5, 3]),
  wall('offlimits-nw-side', [-18, 2.5, -11], [2, 5, 6]),
  wall('offlimits-ne', [14.5, 2.5, -12.5], [9, 5, 9]),
  // Main hall partition, with three genuinely passable doorways.
  wall('hall-divider-a', [-2, 2.5, -14.25], [0.35, 5, 5.5]),
  wall('hall-divider-b', [-2, 2.5, -7], [0.35, 5, 5]),
  wall('hall-divider-c', [-2, 2.5, 1.75], [0.35, 5, 8.5]),
  wall('food-divider-a', [1, 1.8, -8], [6, 3.6, 0.25]),
  wall('food-divider-b', [9, 1.8, -8], [2, 3.6, 0.25]),
  wall('courtyard-wall', [4, 1.3, 0.15], [12, 2.6, 0.3]),
  wall('judges-west', [-2, 1.7, 5.5], [0.25, 3.4, 4]),
  wall('judges-back', [0.5, 1.7, 3], [5, 3.4, 0.25]),
  wall('judges-east', [3.5, 1.7, 5.1], [0.25, 3.4, 4.2]),
  wall('crew-back', [6.8, 1.7, 3], [6.5, 3.4, 0.25]),
  wall('crew-east', [10, 1.7, 5], [0.25, 3.4, 4]),
  wall('judges-front', [0, 1.7, 7.5], [4, 3.4, 0.25]),
  wall('crew-front', [7.3, 1.7, 7.5], [5.4, 3.4, 0.25]),
  {
    id: 'stage',
    position: [-11, 0.32, -10.5],
    size: [10, 0.64, 4],
    color: '#302a37',
    kind: 'cover',
  },
  {
    id: 'stage-ramp',
    position: [-5, 0.32, -10.5],
    size: [2, 0.64, 4],
    color: '#5b5b62',
    kind: 'ramp',
  },
  table('hacking-a', 2, -5),
  table('hacking-b', 8, -5),
  table('hacking-c', 14, -5),
  table('hacking-d', 2, -2),
  table('hacking-e', 8, -2),
  table('hacking-f', 14, -2),
  table('food-buffet', 3.5, -15, 8),
  table('food-drinks', 8, -11, 2),
  table('welcome-desk', 11.5, 15, 3.5),
  table('judges-table', 0.5, 4.7, 2.8),
  table('crew-table', 6.5, 4.7, 2.7),
  ...[-6, -3, 0].flatMap((z, row) =>
    [-13, -8].map(
      (x, i): Box => ({
        id: `seats-${row}-${i}`,
        position: [x, 0.35, z],
        size: [3.2, 0.7, 0.8],
        color: '#3c3b42',
        kind: 'chairs',
      }),
    ),
  ),
  {
    id: 'demo-plinth',
    position: [-13, 0.65, 5],
    size: [2, 1.3, 2],
    color: '#a392bc',
    kind: 'cover',
  },
  {
    id: 'demo-plinth-b',
    position: [-7, 0.65, 4],
    size: [2, 1.3, 2],
    color: '#7f9f8a',
    kind: 'cover',
  },
  { id: 'plant', position: [13, 0.5, 10], size: [1, 1, 2], color: '#686e56', kind: 'planter' },
];
export const ZONES = [
  { name: '02 / STAGE', x: -11, z: -10.5, color: '#ba8aff' },
  { name: '03 / DEMOS', x: -11, z: 6.8, color: '#caa4ff' },
  { name: '05 / HACKING', x: 8, z: -0.7, color: '#81f1b0' },
  { name: '04 / FOOD', x: 3, z: -9, color: '#ffbd66' },
  { name: '01 / WELCOME', x: 8, z: 11.5, color: '#7cbaff' },
  { name: '06 / JUDGES', x: 0.5, z: 6.5, color: '#8fc3ff' },
  { name: '07 / CREW', x: 6.5, z: 6.5, color: '#ffbd66' },
  { name: 'COURTYARD', x: 4, z: 1.6, color: '#e0decc' },
];
