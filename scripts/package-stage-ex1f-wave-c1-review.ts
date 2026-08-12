import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

interface ScreenshotRecord {
  file: string;
  width: number;
  height: number;
  sha256: string;
}

interface BundleAssetMetric {
  file: string;
  bytes: number;
  gzipBytes: number;
}

const bundleName = 'mayadeen-stage-ex1f-wave-c1-approved-design-web3d-review';
const reviewRoot = path.join(os.homedir(), 'Downloads', bundleName);
const zipPath = `${reviewRoot}.zip`;
const screenshotsRoot = path.join(reviewRoot, 'screenshots');
const baselineRoot = path.join(os.homedir(), 'Downloads', 'mayadeen-stage-ex1f-wave-a1-founder-visual-wow-review');
const origin = process.env.EX1F_WAVEC1_REVIEW_ORIGIN ?? 'http://127.0.0.1:4197';
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedScreenshots = [
  '01-experience-twin-premium-entry.png',
  '02-real-design-scene-loaded.png',
  '03-cinematic-overview.png',
  '04-top-view.png',
  '05-isometric-view.png',
  '06-experience-design-lens.png',
  '07-structure-lens.png',
  '08-truth-lens.png',
  '09-command-lens.png',
  '10-design-camera-tour-playing.png',
  '11-selected-viewpoint.png',
  '12-october-31-employee-context.png',
  '13-november-2-vip-context.png',
  '14-november-3-media-context.png',
  '15-november-1-route-not-applicable.png',
  '16-proposed-mamar-relation.png',
  '17-client-presentation-mode.png',
  '18-fullscreen-design.png',
  '19-missing-360.png',
  '20-missing-asset-safe-state.png',
  '21-hash-mismatch-rejection.png',
  '22-technical-truth-drawer.png',
  '23-responsive-density.png',
  '24-complete-experience-twin.png'
] as const;

const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const mainCommit = execFileSync('git', ['rev-parse', 'main'], { encoding: 'utf8' }).trim();
const trackedStatus = execFileSync('git', ['status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).trim();
if (trackedStatus) throw new Error('Wave C.1 packaging requires a clean committed feature worktree.');
if (mainCommit !== '894fa504e331e6cf890753db8726b2e4de6e5bc1') throw new Error('main changed from the authorized baseline.');
if (!existsSync(screenshotsRoot)) throw new Error('Wave C.1 screenshots are missing.');
if (!existsSync(path.join(baselineRoot, 'bundle-metrics.json'))) throw new Error('Wave A.1 baseline review is missing.');

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('Invalid PNG screenshot.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function bundleMetrics(): BundleAssetMetric[] {
  const assetRoot = path.join(process.cwd(), 'dist', 'assets');
  const files = readdirSync(assetRoot).filter((file) => /\.(js|css)$/.test(file));
  if (files.some((file) => / \d+\.(?:js|css)$/.test(file))) {
    throw new Error('Production output contains duplicate collision files; rebuild from a clean dist directory.');
  }
  return files
    .sort()
    .map((file) => {
      const bytes = readFileSync(path.join(assetRoot, file));
      return { file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
    });
}

function initialFiles(metrics: BundleAssetMetric[]): BundleAssetMetric[] {
  const html = readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
  const names = new Set([...html.matchAll(/assets\/([^"']+\.(?:js|css))/g)].map((match) => match[1]));
  return metrics.filter((metric) => names.has(metric.file));
}

async function compareScreenshots(page: Page, beforePath: string, afterPath: string) {
  const beforeUrl = `data:image/png;base64,${readFileSync(beforePath).toString('base64')}`;
  const afterUrl = `data:image/png;base64,${readFileSync(afterPath).toString('base64')}`;
  return page.evaluate(async ({ beforeUrl: first, afterUrl: second }) => {
    const before = document.createElement('img');
    const after = document.createElement('img');
    before.src = first;
    after.src = second;
    await Promise.all([before.decode(), after.decode()]);
    if (before.width !== after.width || before.height !== after.height) throw new Error('Visual comparison dimensions differ.');
    const canvas = document.createElement('canvas');
    canvas.width = before.width;
    canvas.height = before.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas comparison is unavailable.');
    context.drawImage(before, 0, 0);
    const beforePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(after, 0, 0);
    const afterPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let changedPixels = 0;
    let channelDelta = 0;
    for (let index = 0; index < beforePixels.length; index += 4) {
      const red = Math.abs(beforePixels[index] - afterPixels[index]);
      const green = Math.abs(beforePixels[index + 1] - afterPixels[index + 1]);
      const blue = Math.abs(beforePixels[index + 2] - afterPixels[index + 2]);
      if (Math.max(red, green, blue) >= 12) changedPixels += 1;
      channelDelta += red + green + blue;
    }
    const pixels = canvas.width * canvas.height;
    return {
      changedPixelPercent: Number(((changedPixels / pixels) * 100).toFixed(3)),
      meanAbsoluteChannelDelta: Number((channelDelta / (pixels * 3)).toFixed(3))
    };
  }, { beforeUrl, afterUrl });
}

const screenshotHashes = new Set<string>();
const screenshotRecords: Record<string, ScreenshotRecord[]> = {};
for (const resolution of resolutions) {
  const [expectedWidth, expectedHeight] = resolution.split('x').map(Number);
  const directory = path.join(screenshotsRoot, resolution);
  const records = expectedScreenshots.map((file) => {
    const bytes = readFileSync(path.join(directory, file));
    const dimensions = pngDimensions(bytes);
    const hash = sha256(bytes);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) throw new Error(`Wrong dimensions: ${resolution}/${file}`);
    if (screenshotHashes.has(hash)) throw new Error(`Duplicate screenshot SHA-256: ${resolution}/${file}`);
    screenshotHashes.add(hash);
    return { file, ...dimensions, sha256: hash };
  });
  screenshotRecords[resolution] = records;
  writeFileSync(path.join(directory, 'screenshots.json'), `${JSON.stringify({ featureCommit, resolution, screenshots: records }, null, 2)}\n`);
}

const browser = await chromium.launch({ headless: true });
const visualDifferences = [];
const loadRuns = [];
const externalRequests = new Set<string>();
try {
  const comparisonPage = await browser.newPage();
  const beforeRoot = path.join(reviewRoot, 'before');
  for (const resolution of resolutions) {
    const directory = path.join(beforeRoot, resolution);
    mkdirSync(directory, { recursive: true });
    const beforePath = path.join(directory, 'missing-production-3d.png');
    copyFileSync(path.join(baselineRoot, 'screenshots', resolution, '08-a1-missing-production-3d.png'), beforePath);
    const difference = await compareScreenshots(comparisonPage, beforePath, path.join(screenshotsRoot, resolution, '02-real-design-scene-loaded.png'));
    if (difference.changedPixelPercent < 12) throw new Error(`Web3D visual change is not material at ${resolution}.`);
    visualDifferences.push({ resolution, beforeFile: '08-a1-missing-production-3d.png', afterFile: '02-real-design-scene-loaded.png', ...difference });
  }
  await comparisonPage.close();

  const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
  const designUrl = `${origin}/?workspace=experience-twin&${scope}&experienceMode=scenes&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&entity=ENTITY-KAP-OP-006&zone=ZONE-AGES-TUNNEL-001&scene=DESIGN-ASSET-KAP-DIRECT-MESH-001&sceneView=model-3d&mapMode=web3d&viewMode=scene-focus&designLens=experience&designViewpoint=DESIGN-VIEW-KAP-OVERVIEW&designQuality=balanced`;
  for (let run = 1; run <= 3; run += 1) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ar-SA' });
    const page = await context.newPage();
    const errors: string[] = [];
    const badResponses: Array<{ status: number; pathname: string }> = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => {
      const target = new URL(request.url());
      if (['http:', 'https:'].includes(target.protocol) && !['127.0.0.1', 'localhost'].includes(target.hostname)) {
        externalRequests.add(request.url());
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) badResponses.push({ status: response.status(), pathname: new URL(response.url()).pathname });
    });
    const startedAt = Date.now();
    await page.goto(designUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="scene-web3d-surface"][data-model-ready="true"]').waitFor({ state: 'visible', timeout: 10_000 });
    const interactiveMs = Date.now() - startedAt;
    const resource = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter((entry) => entry.name.includes('DESIGN-ASSET-KAP-DIRECT-MESH-001.glb'))
      .map((entry) => ({
        durationMs: Number(entry.duration.toFixed(1)),
        transferSize: (entry as PerformanceResourceTiming).transferSize,
        decodedBodySize: (entry as PerformanceResourceTiming).decodedBodySize
      })));
    if (interactiveMs > 5_000 || errors.length || badResponses.length || resource.length !== 1) throw new Error(`Web3D load verification failed on run ${run}.`);
    loadRuns.push({ run, interactiveMs, resource: resource[0], consoleErrors: errors.length, badResponses: badResponses.length });
    await context.close();
  }
} finally {
  await browser.close();
}
if (externalRequests.size) throw new Error('Unexpected external network request during Web3D review.');

const metrics = bundleMetrics();
const currentInitial = initialFiles(metrics);
const currentInitialJsGzipBytes = currentInitial.filter((item) => item.file.endsWith('.js')).reduce((sum, item) => sum + item.gzipBytes, 0);
const currentInitialGzipBytes = currentInitial.reduce((sum, item) => sum + item.gzipBytes, 0);
const currentTotalGzipBytes = metrics.reduce((sum, item) => sum + item.gzipBytes, 0);
const baseline = JSON.parse(readFileSync(path.join(baselineRoot, 'bundle-metrics.json'), 'utf8')) as {
  featureCommit: string;
  assets: BundleAssetMetric[];
  initialGzipBytes: number;
  totalGzipBytes: number;
};
const baselineInitialJsGzipBytes = baseline.assets
  .filter((item) => /^index-.*\.js$/.test(item.file))
  .reduce((sum, item) => sum + item.gzipBytes, 0);
const initialJsDeltaPercent = Number((((currentInitialJsGzipBytes - baselineInitialJsGzipBytes) / baselineInitialJsGzipBytes) * 100).toFixed(3));
if (initialJsDeltaPercent >= 1) throw new Error(`Initial JavaScript gzip target exceeded: ${initialJsDeltaPercent}%`);
const web3dChunk = metrics.find((item) => /^Web3DSceneSurface-.*\.js$/.test(item.file));
if (!web3dChunk) throw new Error('Lazy Web3D chunk is missing.');
const bundleReport = {
  featureCommit,
  baselineCommit: baseline.featureCommit,
  baseline: { initialJsGzipBytes: baselineInitialJsGzipBytes, initialGzipBytes: baseline.initialGzipBytes, totalGzipBytes: baseline.totalGzipBytes },
  current: { initialJsGzipBytes: currentInitialJsGzipBytes, initialGzipBytes: currentInitialGzipBytes, totalGzipBytes: currentTotalGzipBytes, initialFiles: currentInitial, web3dChunk },
  delta: {
    initialJsGzipBytes: currentInitialJsGzipBytes - baselineInitialJsGzipBytes,
    initialJsPercent: initialJsDeltaPercent,
    initialGzipBytes: currentInitialGzipBytes - baseline.initialGzipBytes,
    initialPercent: Number((((currentInitialGzipBytes - baseline.initialGzipBytes) / baseline.initialGzipBytes) * 100).toFixed(3)),
    totalGzipBytes: currentTotalGzipBytes - baseline.totalGzipBytes,
    totalPercent: Number((((currentTotalGzipBytes - baseline.totalGzipBytes) / baseline.totalGzipBytes) * 100).toFixed(3))
  }
};

const documentation = [
  'docs/experience-twin/stage-ex1f-wave-c1-approved-design-web3d.md',
  'docs/experience-twin/kap-design-asset-register.md',
  'docs/experience-twin/kap-design-scene-mapping-register.md',
  'docs/experience-twin/kap-design-camera-tour.md',
  'docs/experience-twin/kap-3d-and-360-truth-matrix.md',
  'docs/experience-twin/kap-design-performance-report.md',
  'docs/experience-twin/kap-client-design-demo-script.md',
  'docs/architecture-decisions/ADR-EX005-private-design-assets-and-web3d-derivatives.md'
];
const documentationRoot = path.join(reviewRoot, 'documentation');
mkdirSync(documentationRoot, { recursive: true });
for (const relativePath of documentation) copyFileSync(relativePath, path.join(documentationRoot, path.basename(relativePath)));
const sanitizedManifest = 'public/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design/runtime-design-manifest.json';
copyFileSync(sanitizedManifest, path.join(reviewRoot, 'runtime-design-manifest.json'));

writeFileSync(path.join(reviewRoot, 'visual-difference.json'), `${JSON.stringify({ thresholdPercent: 12, comparisons: visualDifferences }, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'asset-load-performance.json'), `${JSON.stringify({ origin, maximumInteractiveMs: Math.max(...loadRuns.map((item) => item.interactiveMs)), runs: loadRuns, externalRequests: 0 }, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'bundle-metrics.json'), `${JSON.stringify(bundleReport, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'before-after-comparison.md'), [
  '# Wave C.1 Before / After',
  '',
  'The reviewed Wave A.1 missing-production-3D state is preserved beside the verified interactive Web3D scene at all three resolutions.',
  '`visual-difference.json` records the pixel-level composition delta. Pixel difference supports review; it does not promote engineering, route, readiness, 360, or as-built truth.',
  ''
].join('\n'));
writeFileSync(path.join(reviewRoot, 'review-manifest.json'), `${JSON.stringify({
  stage: 'EX.1F Wave C.1',
  status: 'READY_FOR_FOUNDER_STAGE_EX1F_WAVEC1_DESIGN_REVIEW',
  featureCommit,
  mainCommit,
  screenshotCount: resolutions.length * expectedScreenshots.length,
  uniqueScreenshotHashCount: screenshotHashes.size,
  dimensionsVerified: true,
  nativeSourceSha256: 'e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e',
  derivativeSha256: '7b4147af359beba58e0864a85eb725569d08ebbe6eec3d2d93b443eb08c45bca',
  operationalReadiness: 'cannot-determine',
  engineeringRegistered: false,
  panorama360Available: false,
  rawSourceIncluded: false,
  glbIncluded: false,
  piiIncluded: false,
  gpsIncluded: false,
  credentialsIncluded: false,
  externalNetworkRequests: 0,
  visualDifferences,
  bundleReport,
  loadRuns
}, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'README.md'), [
  '# Mayadeen EX.1F Wave C.1 Founder Design Review',
  '',
  'Verified visual evidence for the first KAP interactive Web3D design derivative.',
  'The native source is founder-approved design intent. The derivative remains diagnostic, unregistered, non-as-built, non-operational, and not a production 360.',
  '',
  'Raw 3DM, GLB, embedded resources, private paths, contact data, GPS and credentials are excluded.',
  ''
].join('\n'));

const forbiddenExtensions = new Set(['.3dm', '.dwg', '.dxf', '.glb', '.gltf', '.pdf', '.pptx', '.xlsx', '.heic', '.heif', '.mp4', '.mov']);
const reviewFiles = execFileSync('find', [reviewRoot, '-type', 'f'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
if (reviewFiles.some((file) => forbiddenExtensions.has(path.extname(file).toLowerCase()))) throw new Error('A raw or prohibited asset entered the review package.');
for (const file of reviewFiles.filter((item) => ['.json', '.md', '.txt'].includes(path.extname(item).toLowerCase()))) {
  const text = readFileSync(file, 'utf8');
  if (/\/Users\//.test(text) || /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]/i.test(text) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) || /"(?:latitude|longitude|gpsLatitude|gpsLongitude)"\s*:/i.test(text)) throw new Error(`Sensitive review text: ${path.basename(file)}`);
}

rmSync(zipPath, { force: true });
execFileSync('zip', ['-X', '-q', '-r', zipPath, bundleName], { cwd: path.dirname(reviewRoot) });
execFileSync('unzip', ['-t', zipPath], { stdio: 'pipe' });
const zipHash = sha256(readFileSync(zipPath));
process.stdout.write(`${JSON.stringify({ status: 'review-package-ready', path: zipPath, sha256: zipHash, screenshotCount: resolutions.length * expectedScreenshots.length, uniqueScreenshotHashCount: screenshotHashes.size, unzipVerified: true, visualDifferences, loadRuns, bundleDelta: bundleReport.delta }, null, 2)}\n`);
