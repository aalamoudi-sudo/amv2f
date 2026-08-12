import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const reviewPorts = [4180, 4181, 4182, 4183, 4184];
const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';

async function portIsAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}

function portOwner(port) {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
  } catch {
    return 'Owner unavailable from lsof.';
  }
}

async function selectPort() {
  const occupied = [];
  for (const port of reviewPorts) {
    if (await portIsAvailable(port)) return { port, occupied };
    occupied.push({ port, owner: portOwner(port) });
  }
  throw new Error(`No Stage 3G.0 review port is available.\n${JSON.stringify(occupied, null, 2)}`);
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await globalThis.fetch(url)).status === 200) return;
    } catch {
      // The production preview may still be starting.
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  }
  throw new Error(`Review server did not become ready: ${url}`);
}

const selection = await selectPort();
const origin = `http://${host}:${selection.port}`;
const links = {
  portfolio: `${origin}/?workspace=portfolio`,
  readinessOverview: `${origin}/?workspace=readiness&${scope}&readinessView=overview`,
  requirementMatrix: `${origin}/?workspace=readiness&${scope}&readinessView=matrix`,
  governanceAuthority: `${origin}/?workspace=readiness&${scope}&readinessView=governance`,
  evidenceApprovalFlow: `${origin}/?workspace=readiness&${scope}&readinessView=flow`,
  spatialReadiness: `${origin}/?workspace=readiness&${scope}&readinessView=map`
};

const trackedStatus = execFileSync(
  'git',
  ['status', '--short', '--untracked-files=no'],
  { encoding: 'utf8' }
).trim();
if (trackedStatus) throw new Error(`Review must run from a clean feature commit:\n${trackedStatus}`);
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

execFileSync(process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), '-b'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], { stdio: 'inherit' });

if (!(await portIsAvailable(selection.port))) {
  throw new Error(`Port ${selection.port} became occupied.\n${portOwner(selection.port)}`);
}
const preview = spawn(process.execPath, [
  path.join('node_modules', 'vite', 'bin', 'vite.js'),
  'preview',
  '--host',
  host,
  '--port',
  String(selection.port),
  '--strictPort'
], { stdio: 'inherit' });
const stop = () => {
  if (!preview.killed) preview.kill('SIGTERM');
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
process.once('exit', stop);

try {
  await waitForServer(links.portfolio);
  for (const [label, url] of Object.entries(links)) {
    const response = await globalThis.fetch(url);
    if (response.status !== 200) throw new Error(`${label} returned HTTP ${response.status}`);
  }
  const html = await (await globalThis.fetch(origin)).text();
  const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  if (assetPaths.length === 0) throw new Error('No production assets were found.');
  for (const assetPath of assetPaths) {
    if ((await globalThis.fetch(`${origin}${assetPath}`)).status !== 200) throw new Error(`Asset failed: ${assetPath}`);
  }
  for (const previewPath of [
    '/local-assets/kap/kaga-zoning-candidate.jpg',
    '/local-assets/kap/kap-concept-masterplan-reference.jpg'
  ]) {
    if ((await globalThis.fetch(`${origin}${previewPath}`)).status !== 200) throw new Error(`Local preview failed: ${previewPath}`);
  }

  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, locale: 'ar-SA' });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    for (const url of Object.values(links)) {
      await page.goto(url, { waitUntil: 'networkidle' });
      if (url.includes('workspace=readiness')) {
        const workspace = page.getByTestId('readiness-command-workspace');
        await workspace.waitFor({ state: 'visible' });
        if (await workspace.getAttribute('dir') !== 'rtl') throw new Error(`RTL inactive: ${url}`);
        if (await workspace.getAttribute('data-readiness-posture') !== 'unassessed') {
          throw new Error(`KAP posture changed unexpectedly: ${url}`);
        }
        const expected = page.url();
        await page.reload({ waitUntil: 'networkidle' });
        if (page.url() !== expected) throw new Error(`Refresh changed deep link: ${url}`);
      }
    }
  } finally {
    await browser.close();
  }
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);

  process.stdout.write(`${JSON.stringify({
    status: 'READY_FOR_FOUNDER_STAGE_3G0_REVIEW',
    featureCommit,
    strictPort: selection.port,
    occupiedPreferredPorts: selection.occupied,
    verifiedHttpStatus: 200,
    browserConsoleErrors: 0,
    rtlVerified: true,
    refreshVerified: true,
    links
  }, null, 2)}\n`);

  await new Promise((resolve, reject) => {
    preview.once('exit', (code) => code === 0 || code === null
      ? resolve()
      : reject(new Error(`Review server exited with code ${code}.`)));
    preview.once('error', reject);
  });
} catch (error) {
  stop();
  throw error;
}
