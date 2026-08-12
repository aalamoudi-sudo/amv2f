import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const port = 4191;
const expectedBranch = 'codex/stage-ex1a-additive-four-day-experience-twin';
const expectedSourceSize = 35_931_866;
const expectedSourceHash = '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d';
const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const basic = `${scope}&scenario=SCENARIO-KAP-BASIC-2026`;
const selection = 'persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL';

async function portIsAvailable() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}

function portOwner() {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
  } catch {
    return 'تعذر تحديد مالك المنفذ عبر lsof.';
  }
}

async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function verifyOptionalSource() {
  const sourcePath = process.env.EXPERIENCE_SOURCE_PATH;
  if (!sourcePath) return { supplied: false, status: 'not-supplied-optional' };
  const observedSize = statSync(sourcePath).size;
  const observedHash = await sha256File(sourcePath);
  if (observedSize !== expectedSourceSize || observedHash !== expectedSourceHash) {
    throw new Error(`SOURCE_FINGERPRINT_MISMATCH: expected ${expectedSourceSize}/${expectedSourceHash}, observed ${observedSize}/${observedHash}`);
  }
  return { supplied: true, status: 'validated', byteSize: observedSize, sha256: observedHash };
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await globalThis.fetch(url)).status === 200) return;
    } catch {
      // Vite preview is still starting.
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  }
  throw new Error(`Review server did not become ready: ${url}`);
}

function canonicalReviewUrl(value) {
  const url = new globalThis.URL(value);
  const entries = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  );
  url.search = '';
  for (const [key, entryValue] of entries) url.searchParams.append(key, entryValue);
  return url.href;
}

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (branch !== expectedBranch) throw new Error(`Unexpected review branch: ${branch}`);
const trackedStatus = execFileSync('git', ['status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).trim();
if (trackedStatus) throw new Error(`Review must run from a clean feature commit:\n${trackedStatus}`);
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const expectedFeatureCommit = process.env.EXPERIENCE_REVIEW_COMMIT ?? featureCommit;
if (featureCommit !== expectedFeatureCommit) throw new Error(`Feature commit mismatch: expected ${expectedFeatureCommit}, observed ${featureCommit}`);
const sourceVerification = await verifyOptionalSource();

if (!(await portIsAvailable())) {
  throw new Error(`Strict Experience Twin review port ${port} is occupied. No process was stopped.\n${portOwner()}`);
}

execFileSync(process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), '-b'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], { stdio: 'inherit' });

if (!(await portIsAvailable())) throw new Error(`Port ${port} became occupied.\n${portOwner()}`);

const origin = `http://${host}:${port}`;
const links = {
  portfolio: `${origin}/?workspace=portfolio`,
  overview: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-10-31&${selection}&lens=experience&mapMode=illustrated&viewMode=split`,
  day1: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-10-31&${selection}&lens=experience&mapMode=illustrated&viewMode=split`,
  day2: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&step=STEP-KAP-ROYAL-ARRIVAL&lens=protocol&mapMode=illustrated&viewMode=split`,
  day3: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-11-02&persona=PERSONA-KAP-REGIONAL-LEADERSHIP&journey=JOURNEY-KAP-REGIONAL-2026&step=STEP-KAP-REGIONAL-ARRIVAL&lens=executive&mapMode=illustrated&viewMode=split`,
  day4: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&journey=JOURNEY-KAP-PRESS-2026&step=STEP-KAP-PRESS-ARRIVAL&lens=content-and-show&mapMode=illustrated&viewMode=split`,
  scenarioComparison: `${origin}/?workspace=experience-twin&${scope}&scenario=SCENARIO-KAP-CELEBRATORY-2026&lens=executive&mapMode=illustrated&viewMode=split`,
  rehearsal: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-10-31&${selection}&lens=experience&mapMode=operational&viewMode=map-focus`,
  candidateMap: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-10-31&${selection}&lens=operations&mapMode=operational&viewMode=map-focus`,
  sourceTruth: `${origin}/?workspace=experience-twin&${basic}&day=DAY-KAP-2026-10-31&${selection}&lens=source-truth&mapMode=illustrated&viewMode=split&drawer=truth`
};

const preview = spawn(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', host, '--port', String(port), '--strictPort'], { stdio: 'inherit' });
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
  if (!assetPaths.length) throw new Error('No production assets were found.');
  for (const assetPath of assetPaths) {
    if ((await globalThis.fetch(`${origin}${assetPath}`)).status !== 200) throw new Error(`Asset failed: ${assetPath}`);
  }

  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, locale: 'ar-SA' });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    for (const [label, url] of Object.entries(links)) {
      await page.goto(url, { waitUntil: 'networkidle' });
      if (label === 'portfolio') {
        await page.getByTestId('neutral-launcher').waitFor({ state: 'visible' });
        continue;
      }
      const workspace = page.getByTestId('experience-twin-workspace');
      await workspace.waitFor({ state: 'visible' });
      if (await workspace.getAttribute('dir') !== 'rtl') throw new Error(`RTL inactive: ${label}`);
      if (await workspace.getAttribute('data-project-id') !== 'PROJECT-KAP-OPENING-2026') throw new Error(`Project isolation failed: ${label}`);
      if (!await workspace.getByText('لا يمكن تحديدها', { exact: true }).count()) throw new Error(`KAP readiness truth changed: ${label}`);
      if (await workspace.getByText('جاهز تشغيليًا', { exact: false }).count()) throw new Error(`Forbidden readiness claim: ${label}`);
      const expectedUrl = page.url();
      await page.reload({ waitUntil: 'networkidle' });
      if (canonicalReviewUrl(page.url()) !== canonicalReviewUrl(expectedUrl)) throw new Error(`Refresh changed deep link: ${label}`);
    }
  } finally {
    await browser.close();
  }
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join('\n')}`);

  process.stdout.write(`${JSON.stringify({
    status: 'READY_FOR_FOUNDER_STAGE_EX1A_REVIEW',
    featureCommit,
    branch,
    strictPort: port,
    sourceVerification,
    verifiedHttpStatus: 200,
    browserConsoleErrors: 0,
    rtlVerified: true,
    refreshVerified: true,
    initialBundleLazyLoaded: true,
    operationalReadiness: 'cannot-determine',
    links
  }, null, 2)}\n`);

  await new Promise((resolve, reject) => {
    preview.once('exit', (code) => code === 0 || code === null ? resolve() : reject(new Error(`Review server exited with code ${code}.`)));
    preview.once('error', reject);
  });
} catch (error) {
  stop();
  throw error;
}
