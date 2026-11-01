export const dynamic = 'force-dynamic';
// The persistent server owns gameplay; retired Functions must never consume Redis commands.
export async function GET() {
  return Response.json(
    { error: 'The arena moved to its persistent server. Reload the website to reconnect.' },
    { status: 410 },
  );
}
