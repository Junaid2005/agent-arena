import type { Box } from './types.ts';
import { planToWorld, VENUE_CALIBRATION, type PlanPoint } from './venue.ts';

/** Object types/materials are visible in the supplied overlapping photographs.
 * Dimensions, counts in occluded areas and plan registration remain estimates. */
export const ROOM_TWO_EVIDENCE = [
  { feature: 'Timber-top trestle tables / black folding chairs', evidence: 'Main-hall and reverse-stage views', precision: 'Photo-estimated sizes and arrangement; occluded counts unverified' },
  { feature: 'Exposed brick, concrete lintels and grey blockwork', evidence: 'Lounge, reverse-hall and raised-glazing views', precision: 'Observed materials; masonry face registration is provisional' },
  { feature: 'Large grey industrial sliding gate / overhead rail', evidence: 'Reverse-hall views and plan Haggerston gate', precision: 'Existing plan opening retained; visible detailing only' },
  { feature: 'Red arched panel leaning against blockwork', evidence: 'Repeated lounge views', precision: 'Decorative object, not a door; size/position estimated' },
  { feature: 'OpenAI / DevDay Exchange fabric backdrop', evidence: 'Registration and repeated lounge views', precision: 'Readable text reproduced; artwork and position approximate' },
  { feature: 'Brown lounge seating, roof members and column lights', evidence: 'Lounge, main-hall and upward views', precision: 'Observed types; member sections and furniture dimensions unmeasured' },
];
/** The 2025 drawing's stored-container/timber boxes are not established in the
 * current event photos. Keep them in the historical plan model, not the event tour. */
export function visibleInCurrentEvent(box: Box) {
  return box.id !== 'container' && box.id !== 'timber';
}
export type FurnitureItem = {
  id: string; type: 'table' | 'chair' | 'sofa' | 'registration'; point: PlanPoint; yaw: number;
  width: number; depth: number; height: number;
};
export const ROOM_TWO_FURNITURE: FurnitureItem[] = [];
const scale = VENUE_CALIBRATION.metresPerPixel;
function offset(point: PlanPoint, x: number, z: number): PlanPoint {
  return [point[0] + x / scale, point[1] + z / scale];
}
// A representative arrangement of the visibly occupied table areas, not a claim of an exact count.
const tables: PlanPoint[] = [[365, 420], [470, 425], [575, 420], [365, 535], [490, 550], [580, 535]];
tables.forEach((point, i) => {
  ROOM_TWO_FURNITURE.push({ id: `hall-table-${i}`, type: 'table', point, yaw: 0, width: 3.2, depth: 0.8, height: 0.75 });
  for (const side of [-1, 1]) for (const x of [-1.05, 0, 1.05]) {
    ROOM_TWO_FURNITURE.push({ id: `table-chair-${i}-${side}-${x}`, type: 'chair',
      point: offset(point, x, side * 0.83), yaw: side === 1 ? 0 : Math.PI,
      width: 0.48, depth: 0.52, height: 0.82 });
  }
});
// Two seating blocks leave a centre aisle toward the stage. Row count is approximate.
for (let row = 0; row < 5; row++) for (const x of [-2.7, -2.1, -1.5, -0.9, 0.9, 1.5, 2.1, 2.7]) {
  ROOM_TWO_FURNITURE.push({ id: `audience-${row}-${x}`, type: 'chair',
    point: offset([450, 270], x, 3.7 + row * 0.9), yaw: 0,
    width: 0.48, depth: 0.52, height: 0.82 });
}
for (const [i, point] of ([[568, 650], [568, 686]] as PlanPoint[]).entries()) {
  ROOM_TWO_FURNITURE.push({ id: `lounge-sofa-${i}`, type: 'sofa', point,
    yaw: i === 0 ? Math.PI : 0, width: 2.5, depth: 0.9, height: 0.86 });
}
ROOM_TWO_FURNITURE.push({ id: 'registration-table', type: 'registration', point: [572, 607], yaw: 0,
  width: 3, depth: 0.85, height: 0.75 });
export const FURNITURE_SOLIDS: Box[] = ROOM_TWO_FURNITURE.map((item) => {
  const [x, z] = planToWorld(item.point);
  return { id: item.id, position: [x, item.height / 2, z], size: [item.width, item.height, item.depth],
    rotation: item.yaw, color: item.type === 'table' ? '#a9753c' : '#343638', kind: 'cover' };
});
export function photographedMasonry(id: string): 'brick' | 'block' | null {
  if (id.startsWith('boat-bar-')) return 'block';
  if (id.includes('-gate-') || id.includes('lintel')) return null;
  return /^(west-north|west-gate|north-tip|north-diagonal|north-boat|boat-atrium|private-west-top|private-west-side)-/.test(id) ? 'brick' : null;
}
