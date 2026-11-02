import type { Input } from '../../../packages/shared/src/types.ts';
export function validateInput(value: unknown): Input | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  for (const k of ['seq', 'x', 'z', 'yaw', 'pitch'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k])) return null;
  if (
    !Number.isSafeInteger(v.seq) ||
    Number(v.seq) < 0 ||
    Number(v.seq) > 1e12 ||
    Math.abs(Number(v.x)) > 1 ||
    Math.abs(Number(v.z)) > 1 ||
    Math.abs(Number(v.yaw)) > 1e6 ||
    Math.abs(Number(v.pitch)) > 1.35
  )
    return null;
  for (const k of ['jump', 'dive', 'stumble', 'fire']) if (typeof v[k] !== 'boolean') return null;
  return v as unknown as Input;
}
export function cleanName(v: unknown) {
  return typeof v === 'string'
    ? v
        .trim()
        .replace(/[<>\p{Cc}]/gu, '')
        .slice(0, 18)
    : '';
}
