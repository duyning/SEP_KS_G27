import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

// Monitor the JVM too: IntelliJ's forced Stop may bypass Java shutdown hooks.
const parentPid = Number(process.argv[2]);
if (!Number.isSafeInteger(parentPid) || parentPid <= 0) throw new Error('A parent JVM PID is required.');
let server;
let installer;
let stopping = false;
async function stop(code) {
  if (stopping) return;
  stopping = true;
  clearInterval(parentMonitor);
  installer?.kill();
  await server?.close();
  process.exit(code);
}
const parentMonitor = setInterval(() => {
  try { process.kill(parentPid, 0); } catch { void stop(0); }
}, 1000);
process.on('SIGTERM', () => void stop(0));
process.on('SIGINT', () => void stop(0));

try {
  if (!existsSync('node_modules/vite/package.json')) {
    const nodeDirectory = dirname(process.execPath);
    const candidates = [
      resolve(nodeDirectory, '../node_modules/pnpm/bin/pnpm.mjs'),
      resolve(nodeDirectory, 'node_modules/npm/bin/npm-cli.js'),
      resolve(nodeDirectory, '../lib/node_modules/npm/bin/npm-cli.js'),
    ];
    const manager = candidates.find(existsSync);
    if (!manager) throw new Error('Dependencies are missing. Install Node.js with npm, then run npm install in frontend.');
    console.log('[frontend] Installing dependencies...');
    await new Promise((accept, reject) => {
      installer = spawn(process.execPath, [manager, 'install'], { stdio: 'inherit' });
      installer.once('error', reject);
      installer.once('exit', code => code === 0 ? accept() : reject(new Error(`Dependency installation failed (${code}).`)));
    });
    installer = undefined;
  }
  const { createServer } = await import('vite');
  server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: true } });
  await server.listen();
  console.log('\n[frontend] Ready: http://127.0.0.1:5173/login');
  console.log(`[frontend] API: ${process.env.API_TARGET || 'http://localhost:8080'}`);
} catch (error) {
  console.error('[frontend]', error);
  await stop(1);
}
