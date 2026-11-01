import { randomBytes } from 'node:crypto';
import type { Input, Player, Snapshot, Feed } from '../../../packages/shared/src/types.ts';
import { MATCH_MS } from '../../../packages/shared/src/constants.ts';
export type Member = {
  player: Player;
  token: string;
  socketId: string | null;
  disconnectedAt: number;
  input: Input;
  lastInputAt: number;
  lastShot: number;
  lastPetShot: number;
  lastReceivedSeq: number;
  rateStart: number;
  rateCount: number;
};
export type Room = {
  code: string;
  members: Map<string, Member>;
  endsAt: number;
  round: number;
  feed: Feed[];
  finishedAt: number;
  createdAt: number;
};
export const rooms = new Map<string, Room>();
export const idleInput = (): Input => ({
  seq: 0,
  x: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  jump: false,
  dive: false,
  stumble: false,
  fire: false,
});
export function createRoom(now: number) {
  let code: string;
  do {
    code = randomBytes(3).toString('hex').toUpperCase();
  } while (rooms.has(code));
  const room: Room = {
    code,
    members: new Map(),
    endsAt: now + MATCH_MS,
    round: 1,
    feed: [],
    finishedAt: 0,
    createdAt: now,
  };
  rooms.set(code, room);
  return room;
}
export function snapshot(room: Room, now: number): Snapshot {
  return {
    room: room.code,
    players: [...room.members.values()].filter((m) => m.socketId).map((m) => m.player),
    time: now,
    endsAt: 0,
    round: 1,
    feed: room.feed,
    phase: 'playing',
  };
}

export function publicRoom(now: number): Room {
  const existing = rooms.get('LIVE');
  if (existing) return existing;
  const room: Room = {
    code: 'LIVE',
    members: new Map(),
    endsAt: 0,
    round: 1,
    feed: [],
    finishedAt: 0,
    createdAt: now,
  };
  rooms.set('LIVE', room);
  return room;
}
