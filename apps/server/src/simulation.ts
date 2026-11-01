import { DT } from '../../../packages/shared/src/constants.ts';
import { movePlayer } from '../../../packages/shared/src/movement.ts';
import type { Shot } from '../../../packages/shared/src/types.ts';
import { shoot, explode } from './combat.ts';
import { respawn } from './players.ts';
import { idleInput, type Room } from './rooms.ts';
export function simulate(room: Room, now: number): Shot[] {
  const shots: Shot[] = [];
  const players = [...room.members.values()].filter((m) => m.socketId).map((m) => m.player);
  const record = (shot: Shot) => {
    shots.push(shot);
    for (const victimId of shot.kills || []) {
      const victim = players.find((q) => q.id === victimId);
      const owner = room.members.get(shot.shooter)?.player;
      if (victim && owner) room.feed.unshift({ id: `${shot.id}:${victimId}`, killer: owner.name,
        victim: victim.name, color: shot.color, weapon: shot.weapon, at: now });
    }
    room.feed = room.feed.slice(0, 5);
  };
  room.projectiles = room.projectiles.filter((shot) => {
    if (now < shot.at + (shot.travelMs || 0)) return true;
    const owner = room.members.get(shot.shooter)?.player;
    if (owner) record(explode(shot, owner, players, now));
    return false;
  });
  for (const [id, m] of room.members) {
    if (!m.socketId) {
      if (now - m.disconnectedAt > 30000) room.members.delete(id);
      continue;
    }
    const p = m.player;
    if (p.hp <= 0) {
      if (now >= p.respawnAt) {
        respawn(p, players, now);
        m.input = idleInput();
      }
      continue;
    }
    const input =
      now - m.lastInputAt < 250
        ? m.input
        : { ...m.input, x: 0, z: 0, fire: false, jump: false, dive: false, stumble: false };
    movePlayer(p, input, DT, now);
    if (input.fire) {
      const shot = shoot(p, players, now, m.lastShot);
      if (shot) {
        m.lastShot = now;
        record(shot);
        if (shot.travelMs) room.projectiles.push(shot);
      }
    }
    m.input = { ...m.input, jump: false, dive: false, stumble: false };
  }
  return shots;
}
