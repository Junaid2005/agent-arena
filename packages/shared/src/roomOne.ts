import { HIGH_BAY_OUTLINE, planToWorld, VENUE_CALIBRATION } from './venue.ts';
import type { Box } from './types.ts';

export const ROOM_ONE = {
  status: 'photo-estimated' as const,
  referenceHeight: VENUE_CALIBRATION.wallHeight,
  upperRoofHeight: 8, // Provisional visual reconstruction. No measured upper height supplied.
  doorWidth: 3,
  doorHeight: 3.5,
};
export type BayPart = Box & { surface: 'brick' | 'concrete' | 'steel' | 'wood' | 'glass' };
const [southWest, southEast] = [HIGH_BAY_OUTLINE[3], HIGH_BAY_OUTLINE[2]].map(planToWorld);
export const TIMBER_FACE = {
  x: (southWest[0] + southEast[0]) / 2,
  z: (southWest[1] + southEast[1]) / 2,
  width: Math.hypot(southEast[0] - southWest[0], southEast[1] - southWest[1]),
  // Local +Z faces north into the hall. This is the existing closed private-boundary face.
  yaw: -Math.atan2(southEast[1] - southWest[1], southEast[0] - southWest[0]) + Math.PI,
};
const colors = {
  brick: '#b68a65',
  concrete: '#a5a394',
  steel: '#30383b',
  wood: '#b1854c',
  glass: '#a7bec5',
};
function local(
  id: string,
  x: number,
  y: number,
  z: number,
  size: Box['size'],
  surface: BayPart['surface'],
): BayPart {
  const c = Math.cos(TIMBER_FACE.yaw),
    s = Math.sin(TIMBER_FACE.yaw);
  return {
    id,
    position: [TIMBER_FACE.x + c * x + s * z, y, TIMBER_FACE.z - s * x + c * z],
    size,
    rotation: TIMBER_FACE.yaw,
    surface,
    color: colors[surface],
    kind: 'wall',
  };
}
export const TIMBER_FACE_PARTS: BayPart[] = [
  local(
    'bay-timber-left',
    -0.755,
    ROOM_ONE.doorHeight / 2,
    0.18,
    [1.49, ROOM_ONE.doorHeight, 0.12],
    'wood',
  ),
  local(
    'bay-timber-right',
    0.755,
    ROOM_ONE.doorHeight / 2,
    0.18,
    [1.49, ROOM_ONE.doorHeight, 0.12],
    'wood',
  ),
  ...[-1, 1].map((side) =>
    local(`bay-frame-${side}`, side * 1.6, 1.86, 0.17, [0.2, 3.72, 0.24], 'steel'),
  ),
  local('bay-frame-head', 0, 3.62, 0.17, [3.4, 0.2, 0.24], 'steel'),
  local('bay-sliding-rail', 0, 3.86, 0.24, [4.1, 0.13, 0.1], 'steel'),
  local('bay-concrete-header', 0, 4.92, 0.02, [TIMBER_FACE.width, 0.4, 0.3], 'concrete'),
  local('bay-upper-loading-panel', 0, 6.77, 0.13, [1.3, 2.05, 0.13], 'steel'),
];
// Surface detail remains above/against the existing closed boundary; no invented floor passage.
export const TIMBER_BAY_COLLIDERS: Box[] = TIMBER_FACE_PARTS.filter(
  (part) => part.id.startsWith('bay-timber-') || part.id.startsWith('bay-frame-'),
);

export const UPPER_BAY_PARTS: BayPart[] = [];
HIGH_BAY_OUTLINE.forEach((a, index) => {
  const b = HIGH_BAY_OUTLINE[(index + 1) % HIGH_BAY_OUTLINE.length];
  const [x1, z1] = planToWorld(a),
    [x2, z2] = planToWorld(b);
  const width = Math.hypot(x2 - x1, z2 - z1),
    yaw = -Math.atan2(z2 - z1, x2 - x1);
  const height = ROOM_ONE.upperRoofHeight - ROOM_ONE.referenceHeight;
  const part = (
    id: string,
    along: number,
    y: number,
    w: number,
    h: number,
    surface: BayPart['surface'],
  ) => {
    UPPER_BAY_PARTS.push({
      id,
      position: [(x1 + x2) / 2 + Math.cos(yaw) * along, y, (z1 + z2) / 2 - Math.sin(yaw) * along],
      size: [w, h, 0.18],
      rotation: yaw,
      surface,
      color: colors[surface],
      kind: 'wall',
    });
  };
  // East clerestory is the visible glazed return next to the timber/upper loading face.
  if (index === 1) {
    part('bay-glazing-sill', 0, 5.72, width, 0.44, 'brick');
    part('bay-glazing-head', 0, 7.84, width, 0.32, 'brick');
    part('bay-clerestory', 0, 6.81, width - 0.2, 1.74, 'glass');
    for (let i = 0; i <= 6; i++)
      part(`bay-mullion-${i}`, (i / 6 - 0.5) * (width - 0.2), 6.81, 0.045, 1.8, 'steel');
  } else if (index === 2) {
    const flank = (width - 1.45) / 2;
    for (const side of [-1, 1])
      part(`bay-upper-brick-${side}`, side * (0.725 + flank / 2), 6.75, flank, height, 'brick');
    part('bay-upper-brick-sill', 0, 5.63, 1.45, 0.26, 'brick');
    part('bay-upper-brick-head', 0, 7.89, 1.45, 0.22, 'brick');
  } else {
    // Rear infill is a provisional enclosure, not an independently photographed elevation.
    part(`bay-upper-infill-${index}`, 0, 6.75, width, height, 'brick');
  }
  part(`bay-lintel-${index}`, 0, 5.5, width + 0.15, 0.24, 'concrete');
});
