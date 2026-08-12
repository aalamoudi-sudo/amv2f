import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const reviewPorts = [4175, 4176, 4177, 4178, 4179];
const portSelection = await selectReviewPort();
const port = portSelection.port;
const origin = `http://${host}:${port}`;
const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const candidateLayer = 'SOURCE-LAYER-KAP-CANDIDATE-ZONING';
const links = {
  portfolio: `${origin}/?workspace=portfolio`,
  experienceMap: `${origin}/?workspace=spatial-command&${scope}&sourceLayer=${candidateLayer}&mode=experience&viewMode=top`,
  executiveMap: `${origin}/?workspace=spatial-command&${scope}&sourceLayer=${candidateLayer}&mode=executive&viewMode=top`,
  visitorJourney: `${origin}/?workspace=spatial-command&${scope}&sourceLayer=${candidateLayer}&mode=journey&journeyStep=arrival&viewMode=top`,
  candidateAuthoring: `${origin}/?workspace=spatial-command&${scope}&sourceLayer=${candidateLayer}&mode=experience&candidateEntity=ENTITY-KAP-OP-006&edit=candidate-anchors&viewMode=top`,
  focusMode: `${origin}/?workspace=spatial-command&${scope}&sourceLayer=${candidateLayer}&mode=experience&focus=map&viewMode=top`
};

async function portIsAvailable(candidatePort) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(candidatePort, host, () => probe.close(() => resolve(true)));
  });
}

function describePortOwner(candidatePort) {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${candidatePort}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
  } catch {
    return 'Owner unavailable from lsof.';
  }
}

async function selectReviewPort() {
  const occupiedPorts = [];
  for (const candidatePort of reviewPorts) {
    if (await portIsAvailable(candidatePort)) {
      return { port: candidatePort, occupiedPorts };
    }
    occupiedPorts.push({
      port: candidatePort,
      owner: describePortOwner(candidatePort)
    });
  }
  throw new Error(`No Stage 3E.4C review port is available.\n${JSON.stringify(occupiedPorts, null, 2)}`);
}

async function assertPortAvailable() {
  if (await portIsAvailable(port)) return;
  throw new Error(`Stage 3E.4C review port ${port} became occupied.\n${describePortOwner(port)}`);
}

async function waitForServer(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await globalThis.fetch(url);
      if (response.status === 200) return;
    } catch {
      // The preview process may still be starting.
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  }
  throw new Error(`Review server did not become ready: ${url}`);
}

async function verifyHttpAssets() {
  for (const [label, url] of Object.entries(links)) {
    const response = await globalThis.fetch(url);
    if (response.status !== 200) throw new Error(`${label} returned HTTP ${response.status}: ${url}`);
  }
  const html = await (await globalThis.fetch(origin)).text();
  const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  if (assetPaths.length === 0) throw new Error('No production JavaScript or CSS assets were found.');
  for (const assetPath of assetPaths) {
    const response = await globalThis.fetch(`${origin}${assetPath}`);
    if (response.status !== 200) throw new Error(`Build asset returned HTTP ${response.status}: ${assetPath}`);
  }
  for (const localPreview of [
    '/local-assets/kap/kaga-zoning-candidate.jpg',
    '/local-assets/kap/kap-concept-masterplan-reference.jpg'
  ]) {
    const response = await globalThis.fetch(`${origin}${localPreview}`);
    if (response.status !== 200) throw new Error(`Optional founder-review preview is unavailable: ${localPreview}`);
  }
}

async function verifyBrowser() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, locale: 'ar-SA' });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    for (const url of Object.values(links)) {
      await page.goto(url, { waitUntil: 'networkidle' });
      if (url.includes('workspace=spatial-command')) {
        const workspace = page.getByTestId('spatial-command-workspace');
        await workspace.waitFor({ state: 'visible' });
        if (await workspace.getAttribute('dir') !== 'rtl') throw new Error(`RTL is inactive: ${url}`);
        if (await page.locator('main[data-project-id]').getAttribute('data-project-id') !== 'PROJECT-KAP-OPENING-2026') {
          throw new Error(`Project identity was not preserved: ${url}`);
        }
        const expectedUrl = page.url();
        await page.reload({ waitUntil: 'networkidle' });
        if (page.url() !== expectedUrl) throw new Error(`Refresh changed the deep link: ${url}`);
      }
    }
    if (consoleErrors.length || pageErrors.length) {
      throw new Error(`Browser verification errors:\n${[...consoleErrors, ...pageErrors].join('\n')}`);
    }
  } finally {
    await browser.close();
  }
}

const trackedStatus = execFileSync('git', ['status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).trim();
if (trackedStatus) throw new Error(`Review must run from a clean feature commit:\n${trackedStatus}`);
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

await assertPortAvailable();
execFileSync(process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), '-b'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], { stdio: 'inherit' });

const preview = spawn(process.execPath, [
  path.join('node_modules', 'vite', 'bin', 'vite.js'),
  'preview',
  '--host',
  host,
  '--port',
  String(port),
  '--strictPort'
], { stdio: 'inherit' });

const stopPreview = () => {
  if (!preview.killed) preview.kill('SIGTERM');
};
process.once('SIGINT', stopPreview);
process.once('SIGTERM', stopPreview);
process.once('exit', stopPreview);

try {
  await waitForServer(links.portfolio);
  await verifyHttpAssets();
  await verifyBrowser();
  process.stdout.write(`${JSON.stringify({
    status: 'READY_FOR_FOUNDER_STAGE_3E4C_REVIEW',
    featureCommit,
    strictPort: port,
    occupiedPreferredPorts: portSelection.occupiedPorts,
    verifiedHttpStatus: 200,
    browserConsoleErrors: 0,
    rtlVerified: true,
    refreshVerified: true,
    links
  }, null, 2)}\n`);
  await new Promise((resolve, reject) => {
    preview.once('exit', (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`Review server exited with code ${code}.`));
    });
    preview.once('error', reject);
  });
} catch (error) {
  stopPreview();
  throw error;
}
