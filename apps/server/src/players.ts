import { COLORS, SPAWNS } from '../../../packages/shared/src/constants.ts';
import type { Player } from '../../../packages/shared/src/types.ts';
export function newPlayer(id: string, name: string, index: number, now: number): Player {
  const [x, y, z] = SPAWNS[index % SPAWNS.length];
  return {
    id,
    name,
    color: COLORS[index % COLORS.length],
    position: { x, y, z },
    vy: 0,
    yaw: index % 2 ? Math.PI : 0,
    pitch: 0,
    hp: 3,
    score: 0,
    deaths: 0,
    seq: -1,
    moving: false,
    grounded: true,
    knockUntil: 0,
    diveUntil: 0,
    respawnAt: 0,
    protectedUntil: now + 2000,
    pet: 'codex',
  };
}
export function respawn(p: Player, players: Player[], now: number) {
  const spawn = [...SPAWNS].sort((a, b) => {
    const dist = (s: number[]) =>
      Math.min(
        ...players
          .filter((q) => q.id !== p.id && q.hp > 0)
          .map((q) => Math.hypot(q.position.x - s[0], q.position.z - s[2])),
        100,
      );
    return dist(b) - dist(a);
  })[0];
  p.position = { x: spawn[0], y: spawn[1], z: spawn[2] };
  p.vy = 0;
  p.hp = 3;
  p.respawnAt = 0;
  p.grounded = true;
  p.protectedUntil = now + 1500;
  p.knockUntil = 0;
  p.diveUntil = 0;
}
