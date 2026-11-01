import { ARENA, MAP_BOUNDS } from './constants.ts';
import { circleBoxOverlap, resolveCircleBox } from './geometry.ts';
import { registeredStageSolids } from './stage.ts';
import { FURNITURE_SOLIDS, visibleInCurrentEvent } from './roomTwoDetails.ts';
import { TIMBER_BAY_COLLIDERS } from './roomOne.ts';
import { PLAN, VENUE_CALIBRATION, VENUE_ROOMS, VENUE_SPAWNS, planToWorld, type PlanPoint } from './venue.ts';
import type { Vec3 } from './types.ts';

export const TOUR = { eyeHeight: 1.65, bodyHeight: 1.8, radius: 0.3, walkSpeed: 1.4, fastSpeed: 2.4 };
export const TOUR_SOLIDS = [...ARENA.filter(visibleInCurrentEvent), ...registeredStageSolids(), ...TIMBER_BAY_COLLIDERS];
const FURNISHED_TOUR_SOLIDS = [...TOUR_SOLIDS, ...FURNITURE_SOLIDS];
export const TOUR_STOPS: { name: string; spawn?: number; point?: PlanPoint }[] = [
  { name: 'Entrance / circulation', spawn: 0 }, { name: '1 / High bay', spawn: 1 },
  { name: 'Atrium', spawn: 2 }, { name: 'Canal Room', spawn: 4 },
  { name: 'Bar', spawn: 5 }, { name: 'Club Room', spawn: 6 },
  { name: 'Workshop', spawn: 7 }, { name: 'Photography studio', spawn: 8 },
  { name: 'Recording studio', spawn: 9 }, { name: 'Yard', spawn: 10 },
  { name: '2 / Main hall', point: [450, 400] },
  { name: 'Stage / room 2', point: [450, 325] },
  { name: 'DevDay backdrop / lounge', point: [620, 645] },
  { name: '1 / Timber bay overview', point: [510, 425] },
];
export function tourPosition(stop = 0): Vec3 {
  const target = TOUR_STOPS[stop];
  if (target?.point) { const [x, z] = planToWorld(target.point); return { x, y: 0, z }; }
  const [x, , z] = VENUE_SPAWNS[target?.spawn ?? 0];
  return { x, y: 0, z };
}
/** Walking only: measured seconds/metres, no game gravity, jumping or network state. */
export function walkTour(position: Vec3, x: number, z: number, yaw: number, seconds: number, fast = false, solidFurniture = false) {
  const length = Math.max(1, Math.hypot(x, z));
  const speed = fast ? TOUR.fastSpeed : TOUR.walkSpeed;
  const vx = (x * Math.cos(yaw) + z * Math.sin(yaw)) / length * speed;
  const vz = (-x * Math.sin(yaw) + z * Math.cos(yaw)) / length * speed;
  const dt = Math.max(0, Math.min(seconds, 0.1));
  const steps = Math.max(1, Math.ceil(Math.hypot(vx, vz) * dt / (TOUR.radius / 2)));
  const support = () => {
    const deck = TOUR_SOLIDS.find((b) => b.id === 'event-stage');
    return deck && circleBoxOverlap(position, TOUR.radius, deck)
      ? deck.position[1] + deck.size[1] / 2 : 0;
  };
  for (let i = 0; i < steps; i++) {
    position.x += vx * dt / steps; position.z += vz * dt / steps;
    position.y = support(); // A 0.32 m low platform can be stepped onto, not walked through.
    for (let pass = 0; pass < 3; pass++) for (const box of solidFurniture ? FURNISHED_TOUR_SOLIDS : TOUR_SOLIDS) {
      if (box.position[1] + box.size[1] / 2 <= position.y + 1e-6 ||
        box.position[1] - box.size[1] / 2 >= position.y + TOUR.bodyHeight) continue;
      resolveCircleBox(position, TOUR.radius, box);
    }
    position.x = Math.max(MAP_BOUNDS.minX + TOUR.radius, Math.min(MAP_BOUNDS.maxX - TOUR.radius, position.x));
    position.z = Math.max(MAP_BOUNDS.minZ + TOUR.radius, Math.min(MAP_BOUNDS.maxZ - TOUR.radius, position.z));
  }
  position.y = support();
}
export function tourRoom(position: Vec3) {
  const s = VENUE_CALIBRATION.metresPerPixel;
  const x = position.x / s + PLAN.origin[0], z = position.z / s + PLAN.origin[1];
  // More specific footprints (parking, for example) take precedence over their enclosing yard.
  for (const room of [...VENUE_ROOMS].reverse()) {
    const contains = (outline: typeof room.outline) => {
      let inside = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const a = outline[i], b = outline[j];
        if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      return inside;
    };
    if (contains(room.outline) && !(room.holes ?? []).some(contains)) return room;
  }
  return undefined;
}
