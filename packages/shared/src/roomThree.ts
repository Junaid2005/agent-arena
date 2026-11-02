import type { Box } from './types.ts';
import {
  CANAL_ROOM_HEIGHT,
  VENUE_CALIBRATION,
  VENUE_ROOMS,
  planToWorld,
  type PlanPoint,
} from './venue.ts';
import type { FurnitureItem } from './roomTwoDetails.ts';

const footprint = VENUE_ROOMS.find((room) => room.id === 'canal')!.outline;
export const ROOM_THREE = {
  status: 'photo-estimated',
  ceilingHeight: CANAL_ROOM_HEIGHT,
  beams: [0.06, 0.28, 0.5, 0.72, 0.94],
  northWindows: [
    [0.06, 0.25],
    [0.36, 0.56],
    [0.68, 0.87],
  ],
  // These match the two Atrium-side window groups on the shared wall.
  southWindows: [
    [0.08, 0.38],
    [0.48, 0.76],
  ],
} as const;
/** u west to east; v canal wall to Atrium wall. Heights/fixtures are unmeasured. */
export function canalPlan(u: number, v: number): PlanPoint {
  const [nw, ne, se, sw] = footprint;
  return [
    (nw[0] * (1 - u) + ne[0] * u) * (1 - v) + (sw[0] * (1 - u) + se[0] * u) * v,
    (nw[1] * (1 - u) + ne[1] * u) * (1 - v) + (sw[1] * (1 - u) + se[1] * u) * v,
  ];
}
export function canalPoint(u: number, v: number, y = 0): [number, number, number] {
  const [x, z] = planToWorld(canalPlan(u, v));
  return [x, y, z];
}
export function canalYaw(east = true) {
  const a = canalPoint(0, 0.5),
    b = canalPoint(1, 0.5);
  return Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])) + (east ? 0 : Math.PI);
}
export const ROOM_THREE_FURNITURE: FurnitureItem[] = [0.16, 0.37, 0.58].flatMap((u, i) => {
  const point = canalPlan(u, 0.48),
    scale = VENUE_CALIBRATION.metresPerPixel;
  return [
    {
      id: `canal-table-${i}`,
      type: 'table' as const,
      point,
      yaw: 0,
      width: 2.7,
      depth: 0.75,
      height: 0.75,
    },
    ...[-1, 1].map((side) => ({
      id: `canal-chair-${i}-${side}`,
      type: 'chair' as const,
      point: [point[0], point[1] + (side * 0.7) / scale] as PlanPoint,
      yaw: side > 0 ? 0 : Math.PI,
      width: 0.48,
      depth: 0.52,
      height: 0.82,
    })),
  ];
});
export const CANAL_CATERING = [
  {
    id: 'canal-green-catering',
    point: canalPlan(0.8, 0.4),
    width: 1.7,
    depth: 0.72,
    height: 0.9,
    color: '#3d9059',
  },
  {
    id: 'canal-black-catering',
    point: canalPlan(0.12, 0.25),
    width: 1.8,
    depth: 0.7,
    height: 0.9,
    color: '#23282a',
  },
];
export const CANAL_BENCHES = [0.2, 0.46, 0.71].flatMap((u, i) =>
  [0.07, 0.93].map((v) => ({
    id: `canal-bench-${i}-${v}`,
    point: canalPlan(u, v),
    width: 3.1,
    depth: 0.45,
    height: 0.95,
    yaw: v < 0.5 ? Math.PI + -Math.atan2(56, 256) : -Math.atan2(3, 255),
  })),
);
export const CANAL_FRIDGE = {
  id: 'canal-fridge',
  point: canalPlan(0.06, 0.36),
  width: 0.65,
  depth: 0.65,
  height: 1.12,
};
export const HELP_DESK = {
  id: 'hall-help-desk',
  point: [522, 291] as PlanPoint,
  width: 1.8,
  depth: 0.8,
  height: 0.95,
};
export const ROOM_THREE_FURNITURE_SOLIDS: Box[] = [
  ...ROOM_THREE_FURNITURE,
  ...CANAL_CATERING,
  ...CANAL_BENCHES,
  CANAL_FRIDGE,
  HELP_DESK,
].map((item) => {
  const [x, z] = planToWorld(item.point);
  return {
    id: item.id,
    position: [x, item.height / 2, z],
    size: [item.width, item.height, item.depth],
    rotation: 'yaw' in item && typeof item.yaw === 'number' ? item.yaw : 0,
    color: '#343638',
    kind: 'cover',
  };
});
