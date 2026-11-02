import type { Box } from './types.ts';
import { planToWorld, VENUE_ROOMS, VENUE_CALIBRATION, type PlanPoint } from './venue.ts';
import type { FurnitureItem } from './roomTwoDetails.ts';

const footprint = VENUE_ROOMS.find((room) => room.id === 'atrium')!.outline;
export const ROOM_FIVE = {
  status: 'photo-estimated' as const,
  eaveHeight: 5.5,
  ridgeHeight: 7.5,
  heightBasis:
    'User accepted 5.5 m wall reference; 7.5 m ridge remains provisional. Atrium deck has no numeric height.',
  skylightBands: [
    [0.16, 0.3],
    [0.7, 0.84],
  ] as const,
  trussStations: [0.06, 0.23, 0.4, 0.57, 0.74, 0.91],
  factoryWindows: [
    [0.05, 0.24],
    [0.3, 0.48],
    [0.67, 0.94],
  ] as const,
  frostedPanels: [0.09, 0.18, 0.36, 0.45, 0.54, 0.9, 0.965],
};
/** u runs west (room-2 opening) to east (white wall); v runs canal side to courts. */
export function atriumPlan(u: number, v: number): PlanPoint {
  const [nw, ne, se, sw] = footprint;
  return [
    (nw[0] * (1 - u) + ne[0] * u) * (1 - v) + (sw[0] * (1 - u) + se[0] * u) * v,
    (nw[1] * (1 - u) + ne[1] * u) * (1 - v) + (sw[1] * (1 - u) + se[1] * u) * v,
  ];
}
export function atriumPoint(u: number, v: number, y = 0): [number, number, number] {
  const [x, z] = planToWorld(atriumPlan(u, v));
  return [x, y, z];
}
export function atriumRoofHeight(v: number) {
  return (
    ROOM_FIVE.eaveHeight +
    (1 - Math.abs(v - 0.5) * 2) * (ROOM_FIVE.ridgeHeight - ROOM_FIVE.eaveHeight)
  );
}
export function atriumYaw(east = true) {
  const a = atriumPoint(0, 0.5),
    b = atriumPoint(1, 0.5);
  return Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])) + (east ? 0 : Math.PI);
}
const scale = VENUE_CALIBRATION.metresPerPixel;
const offset = (p: PlanPoint, x: number, z: number): PlanPoint => [
  p[0] + x / scale,
  p[1] + z / scale,
];
export const ROOM_FIVE_FURNITURE: FurnitureItem[] = [];
// Photo-supported table/seat types; representative visible groups, not a verified crowd count.
for (const u of [0.14, 0.31, 0.48, 0.72, 0.89])
  for (const v of [0.23, 0.78]) {
    const point = atriumPlan(u, v),
      key = `${u}-${v}`;
    ROOM_FIVE_FURNITURE.push({
      id: `atrium-table-${key}`,
      type: 'table',
      point,
      yaw: 0,
      width: 2.4,
      depth: 0.8,
      height: 0.75,
    });
    for (const side of [-1, 1])
      for (const x of [-0.8, 0, 0.8]) {
        ROOM_FIVE_FURNITURE.push({
          id: `atrium-chair-${key}-${side}-${x}`,
          type: 'chair',
          point: offset(point, x, side * 0.84),
          yaw: side > 0 ? 0 : Math.PI,
          width: 0.48,
          depth: 0.52,
          height: 0.82,
        });
      }
  }
for (const [id, u, v, yaw, color, tufted] of [
  ['entry-white', 0.055, 0.24, 0, '#d6cfc0', false],
  ['entry-brown', 0.055, 0.79, Math.PI, '#967548', false],
  ['chesterfield-a', 0.56, 0.52, 0, '#743c38', true],
  ['chesterfield-b', 0.65, 0.52, Math.PI, '#743c38', true],
] as const) {
  ROOM_FIVE_FURNITURE.push({
    id: `atrium-sofa-${id}`,
    type: 'sofa',
    point: atriumPlan(u, v),
    yaw,
    width: 2.2,
    depth: 0.9,
    height: 0.86,
    color,
    tufted,
  });
}
export const ROOM_FIVE_FURNITURE_SOLIDS: Box[] = ROOM_FIVE_FURNITURE.map((item) => {
  const [x, z] = planToWorld(item.point);
  return {
    id: item.id,
    position: [x, item.height / 2, z],
    size: [item.width, item.height, item.depth],
    rotation: item.yaw,
    color: item.color ?? '#343638',
    kind: 'cover',
  };
});
