import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const port = 4196;
const expectedBranch = 'codex/stage-ex1a-additive-four-day-experience-twin';
const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const origin = `http://${host}:${port}`;
const links = {
  portfolio: `${origin}/?workspace=portfolio`,
  overview: `${origin}/?workspace=experience-twin&${scope}&experienceMode=overview`,
  day1: `${origin}/?workspace=experience-twin&${scope}&experienceMode=journey&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&mapMode=story`,
  day2: `${origin}/?workspace=experience-twin&${scope}&experienceMode=journey&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&mapMode=story`,
  day3Routes: `${origin}/?workspace=experience-twin&${scope}&experienceMode=command&day=DAY-KAP-2026-11-02&persona=PERSONA-KAP-REGIONAL-LEADERSHIP&journey=JOURNEY-KAP-REGIONAL-2026&mapMode=operational`,
  day4: `${origin}/?workspace=experience-twin&${scope}&experienceMode=journey&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&journey=JOURNEY-KAP-PRESS-2026&mapMode=story`,
  sources: `${origin}/?workspace=experience-twin&${scope}&experienceMode=sources`,
  assets: `${origin}/?workspace=experience-twin&${scope}&experienceMode=assets`,
  delivery: `${origin}/?workspace=experience-twin&${scope}&experienceMode=delivery&deliveryView=overview`,
  v11Routes: `${origin}/?workspace=experience-twin&${scope}&experienceMode=delivery&deliveryView=routes&deliveryJourneyDay=DAY-KAP-2026-11-03&deliveryJourney=JOURNEY-KAP-20261103-MEDIA-V11`,
  missingNovember1Route: `${origin}/?workspace=experience-twin&${scope}&experienceMode=delivery&deliveryView=routes&deliveryJourneyDay=DAY-KAP-2026-11-01`,
  presentation: `${origin}/?workspace=experience-twin&${scope}&experienceMode=presentation&presentationStep=1`,
  rehearsal: `${origin}/?workspace=experience-rehearsal&${scope}`
};

async function portIsAvailable() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}
function portOwner() {
  try { return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim(); }
  catch { return 'تعذر تحديد مالك المنفذ عبر lsof.'; }
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await globalThis.fetch(url)).status === 200) return; } catch { /* preview is starting */ }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  }
  throw new Error(`Review server did not become ready: ${url}`);
}

async function waitForWorkspace(page, label) {
  if (label === 'portfolio') await page.getByTestId('neutral-launcher').waitFor({ state: 'visible' });
  else if (label === 'rehearsal') await page.getByTestId('experience-rehearsal-workspace').waitFor({ state: 'visible' });
  else await page.getByTestId('experience-twin-workspace').waitFor({ state: 'visible' });
}

async function waitForStableUrl(page) {
  let previous = page.url();
  let stableSamples = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.waitForTimeout(100);
    const current = page.url();
    if (current === previous) {
      stableSamples += 1;
      if (stableSamples === 3) return current;
    } else {
      previous = current;
      stableSamples = 0;
    }
  }
  throw new Error(`Deep link did not settle: ${page.url()}`);
}

function canonicalUrl(rawUrl) {
  const url = new globalThis.URL(rawUrl);
  url.searchParams.sort();
  return `${url.origin}${url.pathname}?${url.searchParams.toString()}${url.hash}`;
}

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (branch !== expectedBranch) throw new Error(`Unexpected review branch: ${branch}`);
const trackedStatus = execFileSync('git', ['status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).trim();
if (trackedStatus) throw new Error(`Review must run from a clean feature commit:\n${trackedStatus}`);
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!(await portIsAvailable())) throw new Error(`Strict EX.1F review port ${port} is occupied. No process was stopped.\n${portOwner()}`);

execFileSync(process.execPath, [path.join('node_modules', 'tsx', 'dist', 'cli.mjs'), 'scripts/verify-ex1f-review-sources.ts'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), '-b'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], { stdio: 'inherit' });
if (!(await portIsAvailable())) throw new Error(`Port ${port} became occupied.\n${portOwner()}`);

const preview = spawn(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', host, '--port', String(port), '--strictPort'], { stdio: 'inherit' });
const stop = () => { if (!preview.killed) preview.kill('SIGTERM'); };
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
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  if (!assets.length) throw new Error('No production assets were found.');
  for (const asset of assets) if ((await globalThis.fetch(`${origin}${asset}`)).status !== 200) throw new Error(`Asset failed: ${asset}`);

  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, locale: 'ar-SA', reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    for (const [label, url] of Object.entries(links)) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await waitForWorkspace(page, label);
      if (label !== 'portfolio' && label !== 'rehearsal') {
        const workspace = page.getByTestId('experience-twin-workspace');
        if (await workspace.getAttribute('dir') !== 'rtl') throw new Error(`RTL inactive: ${label}`);
        if (await workspace.getAttribute('data-project-id') !== 'PROJECT-KAP-OPENING-2026') throw new Error(`Project isolation failed: ${label}`);
      }
      const expected = await waitForStableUrl(page);
      await page.reload({ waitUntil: 'networkidle' });
      await waitForWorkspace(page, label);
      if (canonicalUrl(await waitForStableUrl(page)) !== canonicalUrl(expected)) throw new Error(`Refresh changed deep link: ${label}`);
    }
  } finally { await browser.close(); }
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join('\n')}`);

  process.stdout.write(`${JSON.stringify({ status: 'READY_FOR_FOUNDER_STAGE_EX1F_REVIEW', featureCommit, branch, strictPort: port, verifiedHttpStatus: 200, browserConsoleErrors: 0, rtlVerified: true, refreshVerified: true, operationalReadiness: 'cannot-determine', links }, null, 2)}\n`);
  await new Promise((resolve, reject) => {
    preview.once('exit', (code) => code === 0 || code === null ? resolve() : reject(new Error(`Review server exited with code ${code}.`)));
    preview.once('error', reject);
  });
} catch (error) {
  stop();
  throw error;
}
