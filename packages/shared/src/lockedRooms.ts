import { PLAN_WALLS, VENUE_WALLS } from './venue.ts';

const doorLabels: Record<string, { room: number; title: string }> = {
  'kitchen-canal': { room: 4, title: '4 / KITCHEN' },
  'studio-top': { room: 7, title: '7 / PHOTO STUDIO' },
  'studio-stair': { room: 7, title: '7 / PHOTO STUDIO' },
  'stair-toilets': { room: 8, title: 'WC / TOILETS' },
  'toilets-top': { room: 8, title: 'WC / TOILETS' },
  'foyer-yard': { room: 10, title: '10 / RECORDING' },
};

/** Door dimensions and collision panels come directly from the shared traced openings.
 * Door finish/sign design is illustrative; no inaccessible interior is reconstructed. */
export const LOCKED_ROOM_DOORS = PLAN_WALLS.flatMap((wall) =>
  (wall.lockedOpenings ?? []).map((opening) => ({
    ...doorLabels[wall.id],
    wallId: wall.id,
    panel: VENUE_WALLS.find((box) => box.id === `${wall.id}-gate-${opening}`)!,
  })),
);
