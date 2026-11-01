import { arenaHealth } from '../../../../server/src/redis-game';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(await arenaHealth(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { ok: false, service: 'agent-arena', hosting: 'vercel', error: 'Arena state unavailable.' },
      { status: 503 },
    );
  }
}
