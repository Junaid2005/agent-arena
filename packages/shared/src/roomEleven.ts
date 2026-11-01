import type { Box } from './types.ts';
import { planToWorld, type PlanPoint } from './venue.ts';

/** Photo-supported object types; positions, sizes and heights are provisional. */
export const ROOM_ELEVEN = {
  status: 'photo-estimated' as const,
  wallHeight: 3.4,
  facadeWindows: [1010, 1052, 1094, 1171, 1213, 1255, 1297],
  timberDoor: [1133, 712] as PlanPoint,
  viewPoint: [1018, 807] as PlanPoint,
  viewYaw: -1.9,
};
export type YardItem = {
  id: string; type: 'picnic' | 'sofa' | 'coffee' | 'planter' | 'barrier';
  point: PlanPoint; yaw: number; width: number; depth: number; height: number;
};
export const ROOM_ELEVEN_FURNITURE: YardItem[] = [
  ...[1070, 1130, 1190].map((x, i): YardItem => ({ id: `yard-picnic-${i}`, type: 'picnic',
    point: [x, 782], yaw: 0, width: 2, depth: 1.75, height: 0.76 })),
  ...[1018, 1066].map((x, i): YardItem => ({ id: `yard-sofa-${i}`, type: 'sofa',
    point: [x, 730], yaw: 0, width: 2.4, depth: 0.85, height: 0.84 })),
  { id: 'yard-coffee', type: 'coffee', point: [1042, 756], yaw: 0, width: 1.25, depth: 0.6, height: 0.36 },
  { id: 'yard-planter-west', type: 'planter', point: [998, 739], yaw: 0, width: 0.7, depth: 0.7, height: 0.6 },
  { id: 'yard-planter-east', type: 'planter', point: [1278, 741], yaw: 0, width: 0.7, depth: 0.7, height: 0.6 },
  // A representative queue rail at the edge, leaving the centre and door approaches clear.
  { id: 'yard-barrier-a', type: 'barrier', point: [1260, 801], yaw: 0, width: 2.1, depth: 0.55, height: 1.05 },
  { id: 'yard-barrier-b', type: 'barrier', point: [1290, 826], yaw: Math.PI / 2, width: 2.1, depth: 0.55, height: 1.05 },
];
export const ROOM_ELEVEN_FURNITURE_SOLIDS: Box[] = ROOM_ELEVEN_FURNITURE.map((item) => {
  const [x, z] = planToWorld(item.point);
  return { id: item.id, position: [x, item.height / 2, z], size: [item.width, item.height, item.depth],
    rotation: item.yaw, color: '#555653', kind: item.type === 'planter' ? 'planter' : 'cover' };
});
