import { isIP } from 'node:net';
import type { IncomingHttpHeaders } from 'node:http';

const PROXIES = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  '172.17.0.1',
  '::ffff:172.17.0.1',
]);

// Caddy replaces X-Forwarded-For. Only our loopback/Docker gateway may assert it.
export function clientAddress(request: {
  headers: IncomingHttpHeaders;
  socket: { remoteAddress?: string };
}): string {
  const peer = request.socket.remoteAddress || 'unknown';
  if (!PROXIES.has(peer)) return peer;
  const forwarded = request.headers['x-forwarded-for'];
  const address = typeof forwarded === 'string' ? forwarded.split(',').at(-1)!.trim() : '';
  return isIP(address) ? address : peer;
}

export class ConnectionLimits {
  private attempts = new Map<string, { count: number; started: number }>();
  private active = new Map<string, number>();

  allow(ip: string, total: number, now = Date.now()): boolean {
    if (total >= 128 || (this.active.get(ip) || 0) >= 24) return false;
    let record = this.attempts.get(ip);
    if (!record || now - record.started >= 60_000) {
      if (!record && this.attempts.size >= 10_000) return false;
      record = { count: 0, started: now };
      this.attempts.set(ip, record);
    }
    return ++record.count <= 60;
  }
  opened(ip: string) {
    this.active.set(ip, (this.active.get(ip) || 0) + 1);
  }
  closed(ip: string) {
    const count = (this.active.get(ip) || 1) - 1;
    if (count) this.active.set(ip, count);
    else this.active.delete(ip);
  }
  prune(now = Date.now()) {
    for (const [ip, record] of this.attempts)
      if (now - record.started >= 60_000) this.attempts.delete(ip);
  }
}
