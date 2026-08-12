import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  assertAllowlistedReviewEntry,
  assertExactEntryNames,
  type ReviewBundleEntryKind
} from './lib/reviewBundlePolicy';

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

const repositoryRoot = process.cwd();
const home = process.env.HOME ?? '/Users/mayadeen';
const bundleDirectoryName = 'mayadeen-stage-3e4a-kap-candidate-spatial-intake-review';
const reviewRoot = process.env.STAGE3E4A_REVIEW_DIR
  ?? path.join(home, 'Downloads', bundleDirectoryName);
const zipPath = path.join(path.dirname(reviewRoot), `${bundleDirectoryName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'];
const expectedScreenshotCount = 18;
const allowedStagedExtensions = new Set(['.png', '.json', '.md']);

const documentation = [
  'docs/stage-3e4a-kap-candidate-spatial-intake.md',
  'docs/kap-source-authority-matrix.md',
  'docs/kap-spatial-mapping-register.md',
  'docs/kap-media-evidence-intake.md',
  'docs/kap-disney-style-map-input-spec.md',
  'docs/architecture-decisions/ADR-009-candidate-spatial-source-intake.md'
];

const manifests = [
  'pilot-input/manifests/kap-source-assets-3e4a-v1.json',
  'pilot-input/manifests/kap-candidate-operational-entities-v1.json',
  'pilot-input/manifests/kap-candidate-experience-mappings-v1.json',
  'pilot-input/manifests/kap-field-evidence-inventory-v1.json',
  'pilot-input/manifests/kap-candidate-spatial-package-v1.json'
];

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Founder-review screenshot is not a valid PNG.');
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertRegularFile(filePath: string): void {
  const metadata = lstatSync(filePath);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error(`Review artifact must be a regular file: ${filePath}`);
}

function copyRegularFile(source: string, destination: string): void {
  if (!existsSync(source)) throw new Error(`Missing review artifact: ${source}`);
  assertRegularFile(source);
  copyFileSync(source, destination);
}

function copyAllowlist(files: readonly string[], destination: string, kind: ReviewBundleEntryKind): void {
  mkdirSync(destination, { recursive: true });
  files.forEach((relativePath) => {
    assertAllowlistedReviewEntry(relativePath, kind);
    copyRegularFile(path.join(repositoryRoot, relativePath), path.join(destination, path.basename(relativePath)));
  });
}

function listRegularFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are prohibited in the review staging area: ${absolutePath}`);
    if (entry.isDirectory()) return listRegularFiles(absolutePath);
    if (!entry.isFile()) throw new Error(`Unsupported review staging entry: ${absolutePath}`);
    return [absolutePath];
  });
}

function parseScreenshotRecords(manifestPath: string, resolution: string): ScreenshotRecord[] {
  assertRegularFile(manifestPath);
  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as { screenshots?: unknown };
  if (!Array.isArray(parsed.screenshots) || parsed.screenshots.length !== expectedScreenshotCount) {
    throw new Error(`${resolution} must contain exactly ${expectedScreenshotCount} screenshots.`);
  }
  return parsed.screenshots.map((value) => {
    const record = value as Partial<ScreenshotRecord>;
    if (typeof record.file !== 'string'
      || typeof record.state !== 'string'
      || typeof record.width !== 'number'
      || typeof record.height !== 'number'
      || typeof record.sha256 !== 'string') {
      throw new Error(`Malformed screenshot record in ${manifestPath}.`);
    }
    assertAllowlistedReviewEntry(`${resolution}/${record.file}`, 'screenshot');
    return record as ScreenshotRecord;
  });
}

if (!existsSync(reviewRoot)) throw new Error(`Review screenshot directory is missing: ${reviewRoot}`);
if (lstatSync(reviewRoot).isSymbolicLink() || !lstatSync(reviewRoot).isDirectory()) {
  throw new Error('Review screenshot root must be a real directory.');
}
assertExactEntryNames(readdirSync(reviewRoot), resolutions, 'review-root');

const stagingParent = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3e4a-review-'));
const stagedReviewRoot = path.join(stagingParent, bundleDirectoryName);
mkdirSync(stagedReviewRoot, { recursive: true });

try {
  const screenshotRecords: Array<ScreenshotRecord & { resolution: string }> = [];
  const globalScreenshotHashes = new Set<string>();

  resolutions.forEach((resolution) => {
    const sourceDirectory = path.join(reviewRoot, resolution);
    if (!existsSync(sourceDirectory) || lstatSync(sourceDirectory).isSymbolicLink() || !lstatSync(sourceDirectory).isDirectory()) {
      throw new Error(`Missing or unsafe screenshot directory: ${sourceDirectory}`);
    }
    const manifestPath = path.join(sourceDirectory, 'screenshots.json');
    const records = parseScreenshotRecords(manifestPath, resolution);
    const expectedNames = ['screenshots.json', ...records.map((record) => record.file)];
    assertExactEntryNames(readdirSync(sourceDirectory), expectedNames, resolution);

    const destinationDirectory = path.join(stagedReviewRoot, resolution);
    mkdirSync(destinationDirectory, { recursive: true });
    copyRegularFile(manifestPath, path.join(destinationDirectory, 'screenshots.json'));

    const [expectedWidth, expectedHeight] = resolution.split('x').map(Number);
    records.forEach((record) => {
      const screenshotPath = path.join(sourceDirectory, record.file);
      assertRegularFile(screenshotPath);
      const bytes = readFileSync(screenshotPath);
      const actualHash = sha256(bytes);
      const dimensions = pngDimensions(bytes);
      if (actualHash !== record.sha256) throw new Error(`Screenshot hash mismatch: ${record.file}`);
      if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
        throw new Error(`Screenshot dimensions mismatch: ${record.file}`);
      }
      if (globalScreenshotHashes.has(actualHash)) throw new Error(`Duplicate screenshot hash: ${record.file}`);
      globalScreenshotHashes.add(actualHash);
      screenshotRecords.push({ resolution, ...record });
      copyFileSync(screenshotPath, path.join(destinationDirectory, record.file));
    });
  });

  copyAllowlist(documentation, path.join(stagedReviewRoot, 'documentation'), 'documentation');
  copyAllowlist(manifests, path.join(stagedReviewRoot, 'manifests'), 'manifest');

  const bundleManifest = {
    stage: '3E.4A',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    generatedAt: new Date().toISOString(),
    screenshotCount: screenshotRecords.length,
    uniqueScreenshotHashCount: globalScreenshotHashes.size,
    resolutions,
    packagingPolicy: 'fresh-staging-exact-allowlist-no-symlinks',
    privacyReview: 'allowlist plus manual screenshot review',
    sourceBinariesIncluded: false,
    exactGpsIncluded: false,
    personalDataIncluded: false,
    optionalLocalPreviewsIncluded: false,
    screenshots: screenshotRecords
  };
  writeFileSync(path.join(stagedReviewRoot, 'review-manifest.json'), `${JSON.stringify(bundleManifest, null, 2)}\n`, 'utf8');

  listRegularFiles(stagedReviewRoot).forEach((filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    if (!allowedStagedExtensions.has(extension)) throw new Error(`Non-allowlisted file in review staging: ${filePath}`);
    if (statSync(filePath).size === 0) throw new Error(`Empty review artifact: ${filePath}`);
    if (extension === '.json' || extension === '.md') {
      const text = readFileSync(filePath, 'utf8');
      const containsLocalPath = text.includes('/Users/');
      const containsExactGpsField = /"(?:latitude|longitude|coordinates|gpsLatitude|gpsLongitude)"\s*:/i.test(text);
      const containsEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
      if (containsLocalPath || containsExactGpsField || containsEmail) {
        throw new Error(`Local path, exact GPS field, or email found in review text: ${filePath}`);
      }
    }
  });

  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-q', '-r', zipPath, bundleDirectoryName], { cwd: stagingParent });
  execFileSync('unzip', ['-tq', zipPath], { stdio: 'pipe' });

  const zipBytes = readFileSync(zipPath);
  process.stdout.write(`${JSON.stringify({
    zipPath,
    sha256: sha256(zipBytes),
    byteSize: zipBytes.length,
    screenshotCount: screenshotRecords.length,
    uniqueScreenshotHashCount: globalScreenshotHashes.size
  }, null, 2)}\n`);
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
