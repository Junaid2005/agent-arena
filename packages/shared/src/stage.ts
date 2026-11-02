import { planToWorld, type PlanPoint } from './venue.ts';
import type { Box } from './types.ts';

/** Photo-estimated dimensions; not a measured survey. Metres, local front = +Z. */
export const STAGE = {
  width: 4.6,
  depth: 2.4,
  height: 0.32,
  screenWidth: 4,
  screenHeight: 2.25,
  screenBottom: 1.05,
  curtainWidth: 8,
  curtainHeight: 5.5,
  lecternHeight: 1.08,
  bannerWidth: 0.8,
  bannerHeight: 2.1,
};
export const STAGE_REGISTRATION: {
  anchor: PlanPoint | null;
  yaw: number;
  status: 'awaiting-plan-location' | 'photo-estimated';
} = {
  // User: stage around marker 2. Slightly canalward of the marker, facing +Z into the hall.
  // Exact anchor, clearance and yaw remain a photo/plan estimate, not a surveyed placement.
  anchor: [450, 270],
  yaw: 0,
  status: 'photo-estimated',
};

/** The visible asset and optional venue collision geometry share these local boxes. */
export const STAGE_LOCAL_SOLIDS: Box[] = [
  {
    id: 'event-stage',
    position: [0, STAGE.height / 2, 0],
    size: [STAGE.width, STAGE.height, STAGE.depth],
    color: '#242529',
    kind: 'cover',
  },
  {
    id: 'event-screen',
    position: [0, STAGE.screenBottom + STAGE.screenHeight / 2, -1.17],
    size: [STAGE.screenWidth + 0.1, STAGE.screenHeight + 0.1, 0.12],
    color: '#16181b',
    kind: 'cover',
  },
  {
    id: 'event-lectern',
    position: [-1.2, STAGE.height + STAGE.lecternHeight / 2, 0.45],
    size: [0.52, STAGE.lecternHeight, 0.45],
    color: '#b8bcc0',
    kind: 'cover',
  },
  ...[-1, 1].map((side): Box => ({
    id: `event-speaker-${side}`,
    position: [side * 2.95, 2.05, -0.3],
    size: [0.48, 0.82, 0.38],
    color: '#17191b',
    kind: 'cover',
  })),
  ...[-1, 1].map((side): Box => ({
    id: `event-speaker-stand-${side}`,
    position: [side * 2.95, 0.85, -0.3],
    size: [0.12, 1.7, 0.12],
    color: '#303336',
    kind: 'cover',
  })),
  ...[-1, 1].map((side): Box => ({
    id: `event-banner-${side}`,
    position: [side * 2.45, STAGE.bannerHeight / 2, -0.75],
    size: [STAGE.bannerWidth, STAGE.bannerHeight, 0.05],
    color: '#e7e4df',
    kind: 'cover',
  })),
  {
    id: 'event-curtain',
    position: [0, STAGE.curtainHeight / 2, -1.55],
    size: [STAGE.curtainWidth, STAGE.curtainHeight, 0.12],
    color: '#111216',
    kind: 'cover',
  },
];
export function registeredStageSolids(): Box[] {
  if (!STAGE_REGISTRATION.anchor) return [];
  const [x, z] = planToWorld(STAGE_REGISTRATION.anchor);
  const c = Math.cos(STAGE_REGISTRATION.yaw),
    s = Math.sin(STAGE_REGISTRATION.yaw);
  return STAGE_LOCAL_SOLIDS.map((box) => ({
    ...box,
    position: [
      x + c * box.position[0] + s * box.position[2],
      box.position[1],
      z - s * box.position[0] + c * box.position[2],
    ],
    rotation: (box.rotation ?? 0) + STAGE_REGISTRATION.yaw,
  }));
}
