import type { Box } from './types.ts';

/** Trace coordinates are pixels in the 1406 × 987 half-resolution source image.
 * Keep these independent of metres so an onsite measurement recalibrates everything. */
export type PlanPoint = readonly [number, number];
export const PLAN = { width: 1406, height: 987, origin: [840, 520] as PlanPoint };
export function polygonArea(points: readonly PlanPoint[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2
  );
}
// Photo-based Canal Room ceiling estimate; replace when measured onsite.
export const CANAL_ROOM_HEIGHT = 3.4;
const atrium: PlanPoint[] = [
  [651, 365],
  [1057, 371],
  [1052, 528],
  [652, 523],
];
export const VENUE_CALIBRATION = {
  status: 'published-drawing-scale' as const,
  source: 'Hoxton Dock Creds Deck, September 2025, page 5 (embedded ground-floor drawing)',
  basis:
    'Published 1:200 at A3 landscape: full source-image width represents 420 mm on paper (84 m in the venue).',
  // Replace this ONE value after a measured distance is supplied. Never scale X/Z separately.
  metresPerPixel: ((420 / 1000) * 200) / PLAN.width,
  wallHeight: 5.5, // Boat Space prose says 5.5 m; drawing says 5.6 m. Other heights unmeasured.
  wallThickness: 0.22, // fallback; major structural divider follows the thicker drawing
  doorHeight: 2.15, // unmeasured; all opening widths below follow the drawing
};
export function planToWorld([x, z]: PlanPoint): [number, number] {
  return [
    (x - PLAN.origin[0]) * VENUE_CALIBRATION.metresPerPixel,
    (z - PLAN.origin[1]) * VENUE_CALIBRATION.metresPerPixel,
  ];
}
export type VenueRoom = {
  id: string;
  name: string;
  outline: PlanPoint[];
  label: PlanPoint;
  color: string;
  access?: 'private' | 'storage' | 'outdoor';
  holes?: PlanPoint[][];
};
// Onsite clarification: photo batch 1 is room 2; the raised part is the dashed square numbered 1.
// These are photo-survey regions of a connected hall, not new physical partitions.
export const HIGH_BAY_OUTLINE: PlanPoint[] = [
  [444, 483],
  [527, 478],
  [534, 580],
  [448, 584],
];
export const VENUE_ROOMS: VenueRoom[] = [
  {
    id: 'boat',
    name: '1 / HIGH BAY',
    color: '#d5d8d5',
    label: [483, 535],
    outline: HIGH_BAY_OUTLINE,
  },
  {
    id: 'lightwell',
    name: '2 / MAIN HALL',
    color: '#e7e9df',
    label: [448, 350],
    holes: [HIGH_BAY_OUTLINE],
    outline: [
      [306, 279],
      [374, 275],
      [370, 158],
      [434, 124],
      [494, 230],
      [644, 257],
      [650, 523],
      [637, 570],
      [644, 716],
      [544, 732],
      [534, 580],
      [324, 587],
      [310, 324],
    ],
  },
  {
    id: 'canal',
    name: '3 / CANAL ROOM',
    color: '#d5e4e8',
    label: [760, 331],
    outline: [
      [650, 260],
      [906, 316],
      [906, 368],
      [651, 365],
    ],
  },
  {
    id: 'kitchen',
    name: '4 / KITCHEN / LOCKED',
    access: 'private',
    color: '#b4b1a8',
    label: [978, 349],
    outline: [
      [906, 316],
      [1057, 344],
      [1057, 371],
      [906, 368],
    ],
  },
  { id: 'atrium', name: '5 / ATRIUM', color: '#dbe4db', label: [843, 448], outline: atrium },
  {
    id: 'court-west',
    name: '6 / COURTYARD',
    color: '#b9c9b1',
    access: 'outdoor',
    label: [773, 549],
    outline: [
      [652, 523],
      [895, 527],
      [895, 573],
      [648, 570],
    ],
  },
  {
    id: 'court-east',
    name: '6 / COURTYARD',
    color: '#b9c9b1',
    access: 'outdoor',
    label: [998, 549],
    outline: [
      [948, 528],
      [1052, 528],
      [1044, 575],
      [948, 575],
    ],
  },
  {
    id: 'vestibule',
    name: 'ATRIUM ACCESS',
    color: '#dbe4db',
    label: [921, 546],
    outline: [
      [895, 526],
      [948, 528],
      [948, 575],
      [895, 573],
    ],
  },
  {
    id: 'studio',
    name: '7 / PHOTO STUDIO / LOCKED',
    access: 'private',
    color: '#b7b2bc',
    label: [531, 801],
    outline: [
      [469, 721],
      [544, 716],
      [548, 732],
      [593, 730],
      [604, 882],
      [476, 889],
    ],
  },
  {
    id: 'toilets',
    name: '8 / WC / LOCKED',
    access: 'private',
    color: '#aab7ba',
    label: [680, 790],
    outline: [
      [645, 725],
      [710, 724],
      [714, 806],
      [651, 809],
    ],
  },
  {
    id: 'cloakroom',
    name: '9 / CLOAKROOM',
    color: '#e2dde7',
    label: [787, 773],
    outline: [
      [754, 723],
      [792, 722],
      [822, 749],
      [822, 803],
      [757, 805],
    ],
  },
  {
    id: 'recording',
    name: '10 / RECORDING / LOCKED',
    access: 'private',
    color: '#b7b2bc',
    label: [702, 850],
    outline: [
      [651, 809],
      [822, 803],
      [750, 880],
      [750, 898],
      [653, 898],
    ],
  },
  {
    id: 'yard',
    name: '11 / YARD',
    color: '#d7cebb',
    access: 'outdoor',
    label: [1024, 808],
    outline: [
      [934, 721],
      [1336, 712],
      [1336, 388],
      [1388, 388],
      [1388, 898],
      [750, 898],
      [750, 880],
    ],
  },
  {
    id: 'parking',
    name: '12 / COVERED PARKING',
    color: '#c4c7ca',
    access: 'outdoor',
    label: [1176, 856],
    outline: [
      [1088, 813],
      [1262, 813],
      [1262, 898],
      [1088, 898],
    ],
  },
  {
    id: 'bar',
    name: '13 / BAR',
    color: '#e5dfd0',
    label: [701, 610],
    outline: [
      [637, 570],
      [764, 572],
      [758, 662],
      [642, 658],
    ],
  },
  {
    id: 'club',
    name: '14 / CLUB ROOM',
    color: '#e2dde7',
    label: [805, 615],
    outline: [
      [764, 572],
      [888, 573],
      [888, 591],
      [822, 684],
      [758, 662],
    ],
  },
  {
    id: 'workshop',
    name: '15 / WORKSHOP',
    color: '#e5dfd0',
    label: [953, 662],
    outline: [
      [948, 575],
      [991, 575],
      [991, 720],
      [934, 721],
      [876, 731],
      [866, 719],
    ],
  },
  {
    id: 'foyer',
    name: 'ENTRANCE / CIRCULATION',
    color: '#e2e4df',
    label: [842, 704],
    outline: [
      [544, 732],
      [642, 716],
      [642, 658],
      [758, 662],
      [822, 684],
      [888, 591],
      [888, 573],
      [948, 575],
      [866, 719],
      [876, 731],
      [934, 721],
      [822, 815],
      [822, 749],
      [792, 722],
      [645, 725],
      [645, 881],
      [604, 882],
      [593, 730],
    ],
  },
  {
    id: 'private-west',
    name: 'PRIVATE',
    color: '#747985',
    access: 'private',
    label: [407, 658],
    outline: [
      [324, 587],
      [534, 580],
      [544, 716],
      [469, 721],
      [476, 889],
      [345, 891],
    ],
  },
  {
    id: 'private-east',
    name: 'PRIVATE',
    color: '#747985',
    access: 'private',
    label: [1192, 617],
    outline: [
      [1057, 344],
      [1336, 388],
      [1336, 712],
      [991, 712],
      [991, 575],
      [1044, 575],
      [1052, 528],
    ],
  },
  {
    id: 'storage',
    name: 'STORAGE',
    color: '#92979b',
    access: 'storage',
    label: [345, 125],
    outline: [
      [294, 48],
      [394, 45],
      [434, 124],
      [370, 158],
      [374, 275],
      [306, 279],
    ],
  },
];

export type PlanWall = {
  id: string;
  a: PlanPoint;
  b: PlanPoint;
  thickness?: number;
  /** Distances in trace pixels from a; gaps preserve door locations and widths. */
  openings?: readonly (readonly [number, number])[];
  gate?: boolean;
  /** Closed room doors by opening index; public openings on the same wall stay clear. */
  lockedOpenings?: readonly number[];
  openingHeight?: number;
  height?: number;
};
export const PLAN_WALLS: PlanWall[] = [
  { id: 'west-north', a: [294, 48], b: [312, 380] },
  { id: 'west-gate', a: [312, 380], b: [324, 587], openings: [[110, 164]], gate: true },
  { id: 'west-south', a: [324, 587], b: [345, 891] },
  { id: 'north-tip', a: [294, 48], b: [394, 45] },
  { id: 'north-diagonal', a: [394, 45], b: [494, 230] },
  { id: 'north-boat', a: [494, 230], b: [644, 257] },
  { id: 'north-canal', a: [644, 257], b: [1057, 344] },
  { id: 'north-private', a: [1057, 344], b: [1336, 388] },
  { id: 'yard-north', a: [1336, 388], b: [1388, 388] },
  { id: 'yard-east', a: [1388, 388], b: [1388, 898], height: 3.4 },
  {
    id: 'yard-gates',
    a: [750, 898],
    b: [1388, 898],
    height: 3.4,
    openingHeight: 3,
    openings: [
      [116, 200],
      [520, 607],
    ],
    gate: true,
  },
  { id: 'south-recording', a: [653, 898], b: [750, 898] },
  { id: 'south-step', a: [653, 898], b: [652, 882] },
  { id: 'south-studios', a: [345, 891], b: [652, 882], openings: [[270, 292]], gate: true },
  { id: 'private-west-top', a: [324, 587], b: [534, 580] },
  { id: 'private-west-side', a: [534, 580], b: [544, 716] },
  { id: 'private-west-studio', a: [544, 716], b: [469, 721] },
  { id: 'private-west-lower', a: [469, 721], b: [476, 889] },
  { id: 'private-west-partition', a: [332, 694], b: [540, 685] },
  {
    id: 'boat-atrium',
    a: [644, 257],
    b: [650, 523],
    thickness: 0.55,
    openingHeight: 3.3,
    openings: [
      [30, 78],
      [217, 262],
    ],
  },
  { id: 'boat-bar', a: [637, 570], b: [642, 670] },
  { id: 'canal-atrium', height: 5.5, a: [651, 365], b: [1057, 371], openings: [[219, 243]] },
  { id: 'kitchen-canal', lockedOpenings: [0], a: [906, 316], b: [906, 368], openings: [[14, 40]] },
  { id: 'atrium-private', height: 5.5, a: [1057, 344], b: [1052, 528], thickness: 0.4 },
  {
    id: 'atrium-court-west',
    height: 5.5,
    a: [652, 523],
    b: [895, 527],
    openings: [
      [5, 22],
      [98, 121],
    ],
  },
  { id: 'atrium-court-east', height: 5.5, a: [948, 528], b: [1052, 528], openings: [[21, 45]] },
  { id: 'court-west-end', a: [652, 523], b: [648, 570], openings: [[12, 33]] },
  { id: 'court-west-access', a: [895, 527], b: [895, 573], openings: [[10, 33]] },
  { id: 'court-east-access', a: [948, 528], b: [948, 575], openings: [[10, 33]] },
  { id: 'court-east-end', a: [1052, 528], b: [1044, 575] },
  { id: 'bar-courtyard', a: [637, 570], b: [888, 573] },
  { id: 'bar-club', a: [764, 572], b: [758, 662] },
  { id: 'bar-south', a: [642, 658], b: [758, 662], openings: [[94, 111]] },
  { id: 'club-south', a: [758, 662], b: [822, 684], openings: [[16, 41]] },
  { id: 'club-diagonal', a: [822, 684], b: [888, 591] },
  { id: 'club-return', a: [888, 591], b: [888, 573] },
  { id: 'workshop-top', a: [948, 575], b: [991, 575] },
  { id: 'workshop-private', a: [991, 575], b: [991, 720] },
  { id: 'workshop-bottom', a: [876, 731], b: [934, 721], openings: [[8, 27]] },
  { id: 'workshop-base', a: [934, 721], b: [991, 720] },
  { id: 'workshop-diagonal', a: [866, 719], b: [948, 575] },
  { id: 'workshop-return', a: [866, 719], b: [876, 731] },
  { id: 'private-east-court', a: [991, 575], b: [1044, 575] },
  { id: 'private-east-yard', a: [991, 712], b: [1336, 712], height: 3.4 },
  { id: 'private-east-end', a: [1336, 388], b: [1336, 712] },
  { id: 'private-east-room', a: [1166, 360], b: [1166, 577] },
  { id: 'private-east-room-base', a: [1166, 577], b: [1336, 577] },
  {
    id: 'studio-top',
    lockedOpenings: [0],
    a: [544, 732],
    b: [645, 725],
    openings: [
      [12, 41],
      [78, 96],
    ],
  },
  { id: 'studio-stair', lockedOpenings: [0], a: [593, 730], b: [604, 882], openings: [[35, 54]] },
  { id: 'stair-toilets', lockedOpenings: [0], a: [645, 725], b: [652, 882], openings: [[15, 32]] },
  { id: 'toilets-top', lockedOpenings: [0], a: [645, 725], b: [792, 722], openings: [[17, 33]] },
  { id: 'toilets-east', a: [710, 724], b: [714, 806] },
  { id: 'toilets-lobby', a: [645, 764], b: [712, 762], openings: [[38, 55]] },
  { id: 'cloak-west', a: [754, 723], b: [757, 805] },
  { id: 'cloak-east', a: [822, 749], b: [822, 815] },
  { id: 'recording-top', a: [651, 809], b: [822, 803] },
  {
    id: 'foyer-yard',
    lockedOpenings: [0],
    a: [750, 880],
    b: [934, 721],
    openings: [
      [16, 39],
      [103, 143],
    ],
  },
  { id: 'recording-step', a: [750, 880], b: [750, 898] },
];

function segmentBox(
  id: string,
  a: PlanPoint,
  b: PlanPoint,
  height: number,
  base: number,
  thickness: number,
  color = '#c9ced1',
): Box {
  const [x1, z1] = planToWorld(a),
    [x2, z2] = planToWorld(b);
  return {
    id,
    position: [(x1 + x2) / 2, base + height / 2, (z1 + z2) / 2],
    size: [Math.hypot(x2 - x1, z2 - z1), height, thickness],
    rotation: -Math.atan2(z2 - z1, x2 - x1),
    kind: 'wall',
    color,
  };
}
export const VENUE_WALLS: Box[] = PLAN_WALLS.flatMap((wall) => {
  const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
  const point = (t: number): PlanPoint => [
    wall.a[0] + ((wall.b[0] - wall.a[0]) * t) / length,
    wall.a[1] + ((wall.b[1] - wall.a[1]) * t) / length,
  ];
  const boxes: Box[] = [];
  let start = 0;
  const { wallThickness } = VENUE_CALIBRATION;
  const h = wall.height ?? VENUE_CALIBRATION.wallHeight;
  const doorHeight = wall.openingHeight ?? VENUE_CALIBRATION.doorHeight;
  const thickness = wall.thickness ?? wallThickness;
  for (const [i, [from, to]] of (wall.openings ?? []).entries()) {
    boxes.push(segmentBox(`${wall.id}-${i}`, point(start), point(from), h, 0, thickness));
    boxes.push(
      segmentBox(
        `${wall.id}-lintel-${i}`,
        point(from),
        point(to),
        h - doorHeight,
        doorHeight,
        thickness,
      ),
    );
    // Perimeter gates and locked room doors share visible, solid panels.
    if (wall.gate || wall.lockedOpenings?.includes(i))
      boxes.push(
        segmentBox(`${wall.id}-gate-${i}`, point(from), point(to), doorHeight, 0, 0.1, '#737f89'),
      );
    start = to;
  }
  if (start < length)
    boxes.push(segmentBox(`${wall.id}-end`, point(start), wall.b, h, 0, thickness));
  return boxes;
});
const columnPoints: PlanPoint[] = [
  [378, 377],
  [384, 485],
  [444, 483],
  [527, 478],
  [526, 371],
  [589, 577],
  [710, 298],
  [767, 296],
  [837, 310],
  [973, 339],
  [1040, 349],
];
export const VENUE_SOLIDS: Box[] = columnPoints.map((p, i) => {
  const [x, z] = planToWorld(p);
  const canalSteel = i >= 6 && i <= 8;
  const height = canalSteel ? CANAL_ROOM_HEIGHT : 5.5;
  return {
    id: `column-${i}`,
    position: [x, height / 2, z],
    size: [0.28, height, 0.28],
    color: canalSteel ? '#272b2c' : '#87929a',
    kind: 'wall',
  };
});
// Container and stored timber are physical obstructions, not invented event furniture.
for (const [id, a, b, depth] of [
  ['container', [310, 302], [411, 302], 42],
  ['timber', [532, 240], [532, 333], 36],
] as const) {
  VENUE_SOLIDS.push(
    segmentBox(id, a, b, 2.4, 0, depth * VENUE_CALIBRATION.metresPerPixel, '#92979b'),
  );
}
export const VENUE_SPAWN_POINTS: PlanPoint[] = [
  [839, 697],
  [459, 526],
  [831, 447],
  [455, 397],
  [759, 340],
  [696, 612],
  [800, 614],
  [950, 667],
  [625, 795],
  [1145, 850],
  [1020, 785],
  [620, 696],
];
export const VENUE_SPAWNS: [number, number, number][] = VENUE_SPAWN_POINTS.map((p) => {
  const [x, z] = planToWorld(p);
  return [x, 0, z];
});
const [minX, minZ] = planToWorld([290, 40]);
const [maxX, maxZ] = planToWorld([1392, 902]);
export const VENUE_BOUNDS = { minX, minZ, maxX, maxZ };
