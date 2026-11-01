import type { Player } from '../../../packages/shared/src/types';

// The built-in sheets have idle, right/left run, wave, jump, hurt and emote rows.
export function petFrame(p: Pick<Player, 'hp' | 'grounded' | 'moving' | 'knockUntil' | 'diveUntil'>,
  now: number, elapsed: number, facingLeft: boolean) {
  if (p.hp <= 0) return { row: 5, column: 2 };
  if (now < p.knockUntil) return { row: 5, column: Math.floor(elapsed * 8) % 4 };
  if (!p.grounded || now < p.diveUntil) return { row: 4, column: Math.floor(elapsed * 8) % 5 };
  if (p.moving) return { row: facingLeft ? 2 : 1, column: Math.floor(elapsed * 10) % 8 };
  return { row: 0, column: Math.floor(elapsed * 5) % 6 };
}
