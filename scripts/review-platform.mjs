import { spawn, spawnSync } from 'node:child_process';
import console from 'node:console';
import net from 'node:net';
import process from 'node:process';

const approvedCommit = '863be25f76b78ce460bcfcec025283701a2d029d';
const host = '127.0.0.1';
const port = 4174;
const project = 'PROJECT-KAP-OPENING-2026';
const event = 'EVENT-KAP-OPENING-2026';

const runGit = (args) => spawnSync('git', args, { encoding: 'utf8' });
const branchResult = runGit(['branch', '--show-current']);
const ancestryResult = runGit(['merge-base', '--is-ancestor', approvedCommit, 'HEAD']);

if (branchResult.status !== 0 || branchResult.stdout.trim() !== 'main') {
  console.error('Platform review must be started from the approved main worktree.');
  process.exit(1);
}

if (ancestryResult.status !== 0) {
  console.error(`Approved UX.1C commit ${approvedCommit} is not present in HEAD.`);
  process.exit(1);
}

const assertPortAvailable = () =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', (error) => reject(error));
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close(resolve);
    });
  });

try {
  await assertPortAvailable();
} catch (error) {
  console.error(`Review port ${host}:${port} is unavailable: ${error.message}`);
  process.exit(1);
}

const build = spawnSync('pnpm', ['build'], { stdio: 'inherit' });
if (build.status !== 0) {
  console.error('Approved platform build failed; review server was not started.');
  process.exit(build.status ?? 1);
}

try {
  await assertPortAvailable();
} catch (error) {
  console.error(`Review port ${host}:${port} became unavailable: ${error.message}`);
  process.exit(1);
}

const baseUrl = `http://${host}:${port}`;
const urls = [
  `${baseUrl}/?workspace=portfolio`,
  `${baseUrl}/?workspace=executive&project=${project}&event=${event}`,
  `${baseUrl}/?workspace=spatial&project=${project}&event=${event}`,
  `${baseUrl}/?workspace=experience&project=${project}&event=${event}`,
];

console.log('\nApproved Mayadeen platform review URLs:');
for (const url of urls) console.log(`- ${url}`);
console.log('');

const server = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '--host', host, '--port', String(port), '--strictPort'],
  { stdio: 'inherit' },
);

const forwardSignal = (signal) => {
  if (!server.killed) server.kill(signal);
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));
server.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
