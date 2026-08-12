import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

interface ReviewState {
  file: string;
  labelAr: string;
  query: string;
  prepare?: (page: Page) => Promise<void>;
}

const root = process.cwd();
const origin = process.env.EX1F_DELIVERY_REVIEW_ORIGIN ?? 'http://127.0.0.1:4196';
const bundleName = 'mayadeen-ex1f-delivery-accelerator-review';
const reviewRoot = path.join(os.homedir(), 'Downloads', bundleName);
const zipPath = `${reviewRoot}.zip`;
const scope = 'workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&experienceMode=delivery';
const resolutions = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }] as const;
const states: ReviewState[] = [
  { file: '01-delivery-overview.png', labelAr: 'نظرة الاستلام والحالة الصفرية الحقيقية', query: 'deliveryView=overview' },
  { file: '02-operational-waiting-expanded.png', labelAr: 'حالة انتظار الحزمة التشغيلية وتفاصيل ما تم وما التالي', query: 'deliveryView=overview', prepare: async (page) => { await page.locator('.delivery-built-next summary').click(); } },
  { file: '03-operational-preview.png', labelAr: 'معاينة تشغيلية خيالية صالحة', query: 'deliveryView=operational&deliveryScenario=operational-valid' },
  { file: '04-operational-conflict.png', labelAr: 'مصالحة تشغيلية خيالية متعارضة', query: 'deliveryView=operational&deliveryScenario=operational-conflict' },
  { file: '05-fictional-glb-valid.png', labelAr: 'فحص GLB خيالي صالح', query: 'deliveryView=studio&deliveryScenario=glb-valid' },
  { file: '06-invalid-glb.png', labelAr: 'رفض GLB خيالي تالف', query: 'deliveryView=studio&deliveryScenario=glb-invalid' },
  { file: '07-valid-panorama.png', labelAr: 'بانوراما خيالية صحيحة 2 إلى 1', query: 'deliveryView=studio&deliveryScenario=panorama-valid' },
  { file: '08-flat-panorama-rejected.png', labelAr: 'رفض المرجع المسطح كبانوراما', query: 'deliveryView=studio&deliveryScenario=panorama-flat' },
  { file: '09-destination-mapping.png', labelAr: 'مصفوفة ربط الوجهات والمشاهد', query: 'deliveryView=mapping' },
  { file: '10-four-day-variants.png', labelAr: 'متغيرات الأصول للأيام الأربعة', query: 'deliveryView=variants' },
  { file: '11-rights-blocker.png', labelAr: 'حجب أصل لغياب الحقوق', query: 'deliveryView=studio&deliveryScenario=rights-blocked' },
  { file: '12-quarantine.png', labelAr: 'حجر أصل ذي تبعية مفقودة', query: 'deliveryView=studio&deliveryScenario=glb-missing-dependency' },
  { file: '13-append-only-rollback.png', labelAr: 'قبول وربط ورجوع خيالي إلحاقي', query: 'deliveryView=operational&deliveryScenario=operational-valid', prepare: async (page) => {
    await page.getByTestId('delivery-accept-fictional').click();
    await page.getByTestId('delivery-view-revisions').click();
    await page.getByTestId('delivery-bind-fictional').click();
    await page.getByTestId('delivery-rollback-fictional').click();
  } },
  { file: '14-deployment-readiness.png', labelAr: 'جاهزية حزمة مراجعة العميل المحلية', query: 'deliveryView=deployment' }
];

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function dimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('Invalid PNG screenshot.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const tracked = execFileSync('git', ['status', '--short', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim();
if (tracked) throw new Error('Visual review packaging requires a clean committed feature worktree.');
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
rmSync(reviewRoot, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(reviewRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const hashes = new Set<string>();
const externalRequests = new Set<string>();
let screenshotCount = 0;
try {
  for (const resolution of resolutions) {
    const resolutionName = `${resolution.width}x${resolution.height}`;
    const directory = path.join(reviewRoot, 'screenshots', resolutionName);
    mkdirSync(directory, { recursive: true });
    const page = await browser.newPage({ viewport: resolution, deviceScaleFactor: 1, locale: 'ar-SA', colorScheme: 'light', reducedMotion: 'reduce' });
    const browserErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('request', (request) => {
      const target = new URL(request.url());
      if (['http:', 'https:'].includes(target.protocol) && !['127.0.0.1', 'localhost'].includes(target.hostname)) externalRequests.add(request.url());
    });
    const screenshots: Array<{ file: string; labelAr: string; width: number; height: number; sha256: string }> = [];
    for (const state of states) {
      await page.goto(`${origin}/?${scope}&${state.query}`, { waitUntil: 'networkidle' });
      await page.getByTestId('experience-delivery-control-center').waitFor({ state: 'visible' });
      if (state.prepare) await state.prepare(page);
      const visibleText = await page.getByTestId('experience-delivery-control-center').innerText();
      if (visibleText.includes('/Users/') || visibleText.includes('@')) throw new Error(`Private path or contact-like content visible in ${state.file}`);
      const filePath = path.join(directory, state.file);
      await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
      const bytes = readFileSync(filePath);
      const size = dimensions(bytes);
      const hash = sha256(bytes);
      if (size.width !== resolution.width || size.height !== resolution.height) throw new Error(`Wrong screenshot dimensions: ${state.file}`);
      if (hashes.has(hash)) throw new Error(`Duplicate screenshot SHA-256: ${state.file} at ${resolutionName}`);
      hashes.add(hash);
      screenshots.push({ file: state.file, labelAr: state.labelAr, ...size, sha256: hash });
      screenshotCount += 1;
    }
    if (browserErrors.length) throw new Error(`Browser errors at ${resolutionName}:\n${browserErrors.join('\n')}`);
    writeFileSync(path.join(directory, 'screenshots.json'), `${JSON.stringify({ featureCommit, resolution: resolutionName, screenshots }, null, 2)}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (externalRequests.size) throw new Error(`External requests detected:\n${[...externalRequests].join('\n')}`);

const docs = [
  'docs/experience-twin/ex1f-delivery-accelerator.md',
  'docs/experience-twin/ex1f-operational-delivery-intake.md',
  'docs/experience-twin/ex1f-studio-3d-delivery-intake.md',
  'docs/experience-twin/ex1f-asset-validation-matrix.md',
  'docs/experience-twin/ex1f-operational-reconciliation-protocol.md',
  'docs/experience-twin/ex1f-3d-360-binding-protocol.md',
  'docs/experience-twin/ex1f-client-review-deployment.md',
  'docs/experience-twin/ex1f-delivery-rollback-runbook.md',
  'docs/architecture-decisions/ADR-EX006-controlled-delivery-accelerator.md'
];
mkdirSync(path.join(reviewRoot, 'documentation'), { recursive: true });
for (const file of docs) copyFileSync(path.join(root, file), path.join(reviewRoot, 'documentation', path.basename(file)));
writeFileSync(path.join(reviewRoot, 'review-manifest.json'), `${JSON.stringify({
  workPackage: 'EX.1F Delivery Accelerator',
  status: 'READY_FOR_OPERATIONAL_AND_3D_DELIVERY',
  featureCommit,
  mainBaseline: '894fa504e331e6cf890753db8726b2e4de6e5bc1',
  resolutions,
  screenshotCount,
  uniqueScreenshotHashes: hashes.size,
  realPackages: { operationalReceived: 0, studioReceived: 0, operationalAccepted: 0, studioAccepted: 0 },
  kapBindings: { operational: 0, scenes: 0, panoramas: 0 },
  operationalReadiness: 'cannot-determine',
  rawSourcesIncluded: 0,
  privatePathsIncluded: 0,
  piiIncluded: 0,
  gpsIncluded: 0,
  secretsIncluded: 0
}, null, 2)}\n`);
execFileSync('zip', ['-q', '-r', zipPath, bundleName], { cwd: path.dirname(reviewRoot) });
execFileSync('unzip', ['-t', zipPath], { stdio: 'ignore' });
const zipHash = sha256(readFileSync(zipPath));
process.stdout.write(`${JSON.stringify({ status: 'READY_FOR_OPERATIONAL_AND_3D_DELIVERY', zipPath, sha256: zipHash, screenshotCount, uniqueScreenshotHashes: hashes.size }, null, 2)}\n`);
