import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
async function run(script: string, testRunner = false) {
  const port = await new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') throw new Error('No test port');
      probe.close(() => resolve(address.port));
    });
  });
  const env = {
    ...process.env,
    PORT: String(port),
    CORS_ORIGIN: 'http://localhost:3000',
    DEEPGRAM_API_KEY: '',
    COMMENTARY_ENABLED: 'false',
    TEST_SERVER_URL: `http://127.0.0.1:${port}`,
    TEST_ORIGIN: 'http://localhost:3000',
  };
  const server = spawn(process.execPath, ['apps/server/src/index.ts'], {
    env,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        ready = (await fetch(`${env.TEST_SERVER_URL}/health`)).ok;
      } catch {
        /* Server is starting. */
      }
      if (ready) break;
      if (server.exitCode !== null) throw new Error('Test server exited during startup');
      await pause(100);
    }
    if (!ready) throw new Error('Test server did not become healthy');
    const args = ['--import', 'tsx', ...(testRunner ? ['--test'] : []), script];
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once('exit', resolve);
      child.once('error', reject);
    });
    if (code !== 0) throw new Error(`${script} failed (${code})`);
  } finally {
    server.kill('SIGTERM');
    for (let i = 0; i < 40 && server.exitCode === null && server.signalCode === null; i++)
      await pause(100);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
}
await run('apps/server/src/security.integration.ts', true);
await run('scripts/network-test.ts');
