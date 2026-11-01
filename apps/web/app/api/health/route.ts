export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const server = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!server)
    return Response.json({ ok: false, error: 'Game server is not configured.' }, { status: 503 });
  try {
    const response = await fetch(new URL('/health', server), {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      { ok: false, service: 'agent-arena', hosting: 'vps', error: 'Game server unavailable.' },
      { status: 503 },
    );
  }
}
