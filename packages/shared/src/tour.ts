import { ARENA, MAP_BOUNDS } from './constants.ts';
import { circleBoxOverlap, resolveCircleBox } from './geometry.ts';
import { registeredStageSolids } from './stage.ts';
import { FURNITURE_SOLIDS, visibleInCurrentEvent } from './roomTwoDetails.ts';
import { TIMBER_BAY_COLLIDERS } from './roomOne.ts';
import { ROOM_FIVE_FURNITURE_SOLIDS, atriumPlan, atriumYaw } from './roomFive.ts';
import { ROOM_THREE_FURNITURE_SOLIDS, canalPlan, canalYaw } from './roomThree.ts';
import { ROOM_ELEVEN_FURNITURE_SOLIDS } from './roomEleven.ts';
import { ENTRANCE_DOOR_SOLIDS, ENTRANCE_FURNITURE_SOLIDS, ENTRANCE_VIEWS } from './entranceFoyer.ts';
import { PLAN, VENUE_CALIBRATION, VENUE_ROOMS, VENUE_SPAWNS, planToWorld, type PlanPoint } from './venue.ts';
import type { Vec3 } from './types.ts';

export const TOUR = { eyeHeight: 1.65, bodyHeight: 1.8, radius: 0.3, walkSpeed: 1.4, fastSpeed: 2.4 };
export const TOUR_SOLIDS = [...ARENA.filter(visibleInCurrentEvent), ...registeredStageSolids(), ...TIMBER_BAY_COLLIDERS, ...ENTRANCE_DOOR_SOLIDS];
export const TOUR_FURNITURE_SOLIDS = [...FURNITURE_SOLIDS, ...ROOM_FIVE_FURNITURE_SOLIDS, ...ROOM_THREE_FURNITURE_SOLIDS, ...ROOM_ELEVEN_FURNITURE_SOLIDS, ...ENTRANCE_FURNITURE_SOLIDS];
const FURNISHED_TOUR_SOLIDS = [...TOUR_SOLIDS, ...TOUR_FURNITURE_SOLIDS];
export const TOUR_STOPS: { name: string; spawn?: number; point?: PlanPoint; yaw?: number; pitch?: number }[] = [
  { name: 'Entrance / circulation', ...ENTRANCE_VIEWS.arrival }, { name: '1 / High bay', spawn: 1, yaw: -2.62, pitch: 0.18 },
  { name: '5 / Atrium', spawn: 2, yaw: atriumYaw(), pitch: 0.08 }, { name: '3 / Canal Room', point: canalPlan(0.5, 0.78), yaw: canalYaw(), pitch: 0.04 },
  { name: 'Bar', spawn: 5 }, { name: 'Club Room', spawn: 6 },
  { name: 'Workshop', spawn: 7 }, { name: '11 / Yard', point: [1018, 807], yaw: -1.9 },
  { name: '2 / Main hall', point: [450, 400] },
  { name: 'Stage / room 2', point: [450, 325] },
  { name: 'DevDay backdrop / lounge', point: [620, 645], yaw: 0.74 },
  { name: '1 / Timber bay overview', point: [510, 425], yaw: 3.015, pitch: 0.14 },
  { name: '5 / Atrium — opening end', point: atriumPlan(0.04, 0.5), yaw: atriumYaw(), pitch: 0.14 },
  { name: '5 / Atrium — far end', point: atriumPlan(0.96, 0.5), yaw: atriumYaw(false), pitch: 0.08 },
  { name: '3 / Canal — main-hall end', point: canalPlan(0.04, 0.73), yaw: canalYaw(), pitch: 0.05 },
  { name: '3 / Canal — locked-kitchen end', point: canalPlan(0.94, 0.64), yaw: canalYaw(false), pitch: 0.05 },
  { name: '2 / Help desk', point: [522, 322] },
  { name: 'Front / timber doorway', ...ENTRANCE_VIEWS.doorway },
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
