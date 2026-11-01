import type { Box } from './types.ts';
import { PLAN_WALLS, VENUE_CALIBRATION, planToWorld, type PlanPoint } from './venue.ts';

const wall = PLAN_WALLS.find((candidate) => candidate.id === 'foyer-yard')!;
const [from, to] = wall.openings![1];
const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
const centre = (from + to) / 2 / length;
export const ENTRANCE_FOYER = {
  status: 'photo-estimated' as const,
  point: [wall.a[0] + (wall.b[0] - wall.a[0]) * centre, wall.a[1] + (wall.b[1] - wall.a[1]) * centre] as PlanPoint,
  yaw: -Math.atan2(wall.b[1] - wall.a[1], wall.b[0] - wall.a[0]),
  width: (to - from) * VENUE_CALIBRATION.metresPerPixel,
  doorHeight: VENUE_CALIBRATION.doorHeight,
};
/** Local +Z faces the yard. Positioning preserves the existing public doorway. */
export function entranceLocalPlan(x: number, z: number): PlanPoint {
  const c = Math.cos(ENTRANCE_FOYER.yaw), s = Math.sin(ENTRANCE_FOYER.yaw);
  const scale = VENUE_CALIBRATION.metresPerPixel;
  return [ENTRANCE_FOYER.point[0] + (c * x + s * z) / scale,
    ENTRANCE_FOYER.point[1] + (-s * x + c * z) / scale];
}
export const ENTRANCE_SCALE_POINT = entranceLocalPlan(1.8, -1.5);
export const ENTRANCE_BANNERS = [
  { id: 'foyer-codex-banner', point: [827, 770] as PlanPoint, title: 'Codex', blue: true },
  { id: 'foyer-black-banner', point: [827, 750] as PlanPoint, title: 'OpenAI', blue: false },
];
export const ENTRANCE_VIEWS = {
  // The corridor turns north after the diagonal entrance; face along circulation.
  arrival: { point: entranceLocalPlan(0, -0.55), yaw: -0.2 },
  doorway: { point: [838, 746] as PlanPoint, yaw: 0 },
};
const [doorX, doorZ] = planToWorld(ENTRANCE_FOYER.point);
const [viewX, viewZ] = planToWorld(ENTRANCE_VIEWS.doorway.point);
ENTRANCE_VIEWS.doorway.yaw = Math.atan2(viewX - doorX, viewZ - doorZ);

export const ENTRANCE_FURNITURE_SOLIDS: Box[] = [
  { id: 'foyer-avery-scale', point: ENTRANCE_SCALE_POINT, width: 1.25, height: 2.3, depth: 0.52, yaw: ENTRANCE_FOYER.yaw },
  ...ENTRANCE_BANNERS.map((banner) => ({ id: banner.id, point: banner.point, width: 0.82, height: 2.05, depth: 0.22, yaw: Math.PI / 2 })),
].map((item) => {
  const [x, z] = planToWorld(item.point);
  return { id: item.id, position: [x, item.height / 2, z], size: [item.width, item.height, item.depth],
    rotation: item.yaw, color: '#783e38', kind: 'cover' };
});

/** Open timber leaves sit beyond the jambs in the yard; the traced aperture stays clear. */
export const ENTRANCE_DOOR_SOLIDS: Box[] = [-1, 1].map((side) => {
  const point = entranceLocalPlan(side * (ENTRANCE_FOYER.width / 2 + 0.08), 0.1 + ENTRANCE_FOYER.width / 4);
  const [x, z] = planToWorld(point);
  return { id: `foyer-open-door-${side}`, position: [x, ENTRANCE_FOYER.doorHeight / 2, z],
    size: [0.06, ENTRANCE_FOYER.doorHeight, ENTRANCE_FOYER.width / 2], rotation: ENTRANCE_FOYER.yaw,
    color: '#795936', kind: 'wall' };
});
