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

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

interface ComparisonRecord {
  resolution: string;
  state: string;
  file: string;
  beforeFile: string;
  afterFile: string;
  width: number;
  height: number;
  changedPixelRatio: number;
  sha256: string;
}

const repositoryRoot = process.cwd();
const home = process.env.HOME ?? os.homedir();
const bundleName = 'mayadeen-stage-3e4b-kap-spatial-command-experience-review';
const reviewRoot = process.env.STAGE3E4B_REVIEW_DIR ?? path.join(home, 'Downloads', bundleName);
const beforeRoot = process.env.STAGE3E4B_BEFORE_DIR
  ?? path.join(home, 'Downloads', 'mayadeen-stage-3e4b-kap-spatial-command-experience-before');
const afterRoot = path.join(reviewRoot, 'after');
const comparisonsRoot = path.join(reviewRoot, 'comparisons');
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedFeatureScreenshotCount = 45;
const expectedComparisonCount = 18;
const startingCommit = '9599939d49d498d0355314732c140ff5140ad14f';
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const allowedExtensions = new Set(['.png', '.json', '.md']);

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Review image is not a valid PNG.');
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertRegularFile(filePath: string): void {
  if (!existsSync(filePath)) throw new Error(`Missing review artifact: ${filePath}`);
  const metadata = lstatSync(filePath);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error(`Review artifact must be a regular file: ${filePath}`);
}

function assertDirectory(directory: string): void {
  if (!existsSync(directory)) throw new Error(`Missing review directory: ${directory}`);
  const metadata = lstatSync(directory);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`Review directory must not be a symlink: ${directory}`);
}

function assertExactNames(directory: string, expectedNames: readonly string[]): void {
  const actual = readdirSync(directory).sort();
  const expected = [...expectedNames].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected review entries in ${directory}: ${actual.join(', ')}`);
  }
}

function copyRegularFile(source: string, destination: string): void {
  assertRegularFile(source);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

function parseAfterManifest(manifestPath: string): { featureCommit: string; screenshots: ScreenshotRecord[] } {
  assertRegularFile(manifestPath);
  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    featureCommit?: unknown;
    screenshots?: unknown;
  };
  if (typeof parsed.featureCommit !== 'string' || !Array.isArray(parsed.screenshots) || parsed.screenshots.length !== 15) {
    throw new Error(`Invalid final screenshot manifest: ${manifestPath}`);
  }
  return {
    featureCommit: parsed.featureCommit,
    screenshots: parsed.screenshots as ScreenshotRecord[]
  };
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink prohibited in review package: ${absolutePath}`);
    if (entry.isDirectory()) return listFiles(absolutePath);
    if (!entry.isFile()) throw new Error(`Unsupported review entry: ${absolutePath}`);
    return [absolutePath];
  });
}

const pythonCandidates = [
  process.env.STAGE3E4B_PYTHON,
  path.join(home, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'bin', 'python3'),
  'python3'
].filter((candidate): candidate is string => Boolean(candidate));
const python = pythonCandidates.find((candidate) => candidate === 'python3' || existsSync(candidate));
if (!python) throw new Error('A Python runtime with Pillow is required to generate visual comparisons.');
execFileSync(python, [
  path.join(repositoryRoot, 'scripts', 'generate-stage3e4b-comparisons.py'),
  beforeRoot,
  afterRoot,
  comparisonsRoot
], { stdio: 'inherit' });

assertDirectory(beforeRoot);
assertDirectory(afterRoot);
assertDirectory(comparisonsRoot);

const beforeManifestPath = path.join(beforeRoot, 'screenshots.json');
assertRegularFile(beforeManifestPath);
const beforeManifest = JSON.parse(readFileSync(beforeManifestPath, 'utf8')) as {
  capturedFromCommit?: string;
  screenshotCount?: number;
  records?: Array<ScreenshotRecord & { viewport: string; fileName: string }>;
};
if (beforeManifest.capturedFromCommit !== startingCommit
  || beforeManifest.screenshotCount !== 12
  || !Array.isArray(beforeManifest.records)
  || beforeManifest.records.length !== 12) {
  throw new Error('Stage 3E.4A baseline manifest does not match the required commit and screenshot count.');
}

const finalRecords: Array<ScreenshotRecord & { resolution: string }> = [];
const finalHashes = new Set<string>();
for (const resolution of resolutions) {
  const directory = path.join(afterRoot, resolution);
  assertDirectory(directory);
  const manifestPath = path.join(directory, 'screenshots.json');
  const manifest = parseAfterManifest(manifestPath);
  if (manifest.featureCommit !== currentCommit) {
    throw new Error(`Final screenshots for ${resolution} were not captured from ${currentCommit}.`);
  }
  assertExactNames(directory, ['screenshots.json', ...manifest.screenshots.map((record) => record.file)]);
  const [expectedWidth, expectedHeight] = resolution.split('x').map(Number);
  for (const record of manifest.screenshots) {
    const imagePath = path.join(directory, record.file);
    assertRegularFile(imagePath);
    const bytes = readFileSync(imagePath);
    const dimensions = pngDimensions(bytes);
    const actualHash = sha256(bytes);
    if (actualHash !== record.sha256) throw new Error(`Final screenshot hash mismatch: ${record.file}`);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight
      || record.width !== expectedWidth || record.height !== expectedHeight) {
      throw new Error(`Final screenshot dimensions mismatch: ${record.file}`);
    }
    if (finalHashes.has(actualHash)) throw new Error(`Final screenshot hash is not unique: ${record.file}`);
    finalHashes.add(actualHash);
    finalRecords.push({ ...record, resolution });
  }
}
if (finalRecords.length !== expectedFeatureScreenshotCount) {
  throw new Error(`Expected ${expectedFeatureScreenshotCount} final screenshots, found ${finalRecords.length}.`);
}

for (const record of beforeManifest.records) {
  const imagePath = path.join(beforeRoot, record.viewport, record.fileName);
  assertRegularFile(imagePath);
  const bytes = readFileSync(imagePath);
  if (sha256(bytes) !== record.sha256) throw new Error(`Before screenshot hash mismatch: ${record.fileName}`);
  const dimensions = pngDimensions(bytes);
  if (dimensions.width !== record.width || dimensions.height !== record.height) {
    throw new Error(`Before screenshot dimensions mismatch: ${record.fileName}`);
  }
}

const comparisonManifestPath = path.join(comparisonsRoot, 'comparisons.json');
assertRegularFile(comparisonManifestPath);
const comparisonManifest = JSON.parse(readFileSync(comparisonManifestPath, 'utf8')) as {
  comparisonCount?: number;
  minimumPrimaryChangedPixelRatio?: number;
  records?: ComparisonRecord[];
};
if (comparisonManifest.comparisonCount !== expectedComparisonCount
  || !Array.isArray(comparisonManifest.records)
  || comparisonManifest.records.length !== expectedComparisonCount
  || typeof comparisonManifest.minimumPrimaryChangedPixelRatio !== 'number'
  || comparisonManifest.minimumPrimaryChangedPixelRatio < 0.30) {
  throw new Error('Visual comparison manifest failed the Stage 3E.4B acceptance gate.');
}
for (const record of comparisonManifest.records) {
  const imagePath = path.join(comparisonsRoot, record.file);
  assertRegularFile(imagePath);
  const bytes = readFileSync(imagePath);
  const dimensions = pngDimensions(bytes);
  if (sha256(bytes) !== record.sha256 || dimensions.width !== record.width || dimensions.height !== record.height) {
    throw new Error(`Comparison integrity mismatch: ${record.file}`);
  }
}

const stagingParent = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3e4b-review-'));
const stagedRoot = path.join(stagingParent, bundleName);
mkdirSync(stagedRoot, { recursive: true });

try {
  copyRegularFile(beforeManifestPath, path.join(stagedRoot, 'before', 'screenshots.json'));
  for (const resolution of resolutions) {
    const beforeDirectory = path.join(beforeRoot, resolution);
    const stagedBeforeDirectory = path.join(stagedRoot, 'before', resolution);
    assertDirectory(beforeDirectory);
    for (const fileName of readdirSync(beforeDirectory)) {
      copyRegularFile(path.join(beforeDirectory, fileName), path.join(stagedBeforeDirectory, fileName));
    }

    const afterDirectory = path.join(afterRoot, resolution);
    const stagedAfterDirectory = path.join(stagedRoot, 'after', resolution);
    for (const fileName of readdirSync(afterDirectory)) {
      copyRegularFile(path.join(afterDirectory, fileName), path.join(stagedAfterDirectory, fileName));
    }

    const comparisonDirectory = path.join(comparisonsRoot, resolution);
    const stagedComparisonDirectory = path.join(stagedRoot, 'comparisons', resolution);
    for (const fileName of readdirSync(comparisonDirectory)) {
      copyRegularFile(path.join(comparisonDirectory, fileName), path.join(stagedComparisonDirectory, fileName));
    }
  }
  copyRegularFile(comparisonManifestPath, path.join(stagedRoot, 'comparisons', 'comparisons.json'));

  const documentation = [
    'docs/ux/stage-3e4b-spatial-command-experience.md',
    'docs/architecture-decisions/ADR-010-spatial-command-experience.md'
  ];
  for (const relativePath of documentation) {
    copyRegularFile(path.join(repositoryRoot, relativePath), path.join(stagedRoot, 'documentation', path.basename(relativePath)));
  }

  const reviewManifest = {
    stage: '3E.4B',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    startingCommit,
    featureCommit: currentCommit,
    generatedAt: new Date().toISOString(),
    beforeScreenshotCount: beforeManifest.records.length,
    finalScreenshotCount: finalRecords.length,
    uniqueFinalScreenshotHashCount: finalHashes.size,
    comparisonCount: comparisonManifest.records.length,
    minimumPrimaryChangedPixelRatio: comparisonManifest.minimumPrimaryChangedPixelRatio,
    resolutions,
    sourceBinariesIncluded: false,
    optionalLocalPreviewsIncluded: false,
    exactGpsIncluded: false,
    personalDataIncluded: false,
    secretsIncluded: false,
    artificialTopStripsIncluded: false,
    truthBoundary: 'candidate anchors and narrative connections; no approved geometry, physical route, readiness, or live state'
  };
  writeFileSync(path.join(stagedRoot, 'review-manifest.json'), `${JSON.stringify(reviewManifest, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3E.4B Founder Review',
    '',
    'This package contains immutable Stage 3E.4A baseline screenshots, final Stage 3E.4B screenshots, and unaltered side-by-side comparisons.',
    '',
    'The left half of each comparison is the baseline and the right half is the final feature state. No artificial top strip is added.',
    '',
    'Original DWG, PDF, field media, exact GPS, personal data, secrets, and optional local preview assets are excluded.',
    ''
  ].join('\n'), 'utf8');

  for (const filePath of listFiles(stagedRoot)) {
    const extension = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.has(extension)) throw new Error(`Non-allowlisted review artifact: ${filePath}`);
    if (statSync(filePath).size === 0) throw new Error(`Empty review artifact: ${filePath}`);
    if (extension === '.json' || extension === '.md') {
      const text = readFileSync(filePath, 'utf8');
      if (text.includes('/Users/')
        || /"(?:latitude|longitude|coordinates|gpsLatitude|gpsLongitude)"\s*:/i.test(text)
        || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
        || /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]/i.test(text)) {
        throw new Error(`Sensitive or local data found in review text: ${filePath}`);
      }
    }
  }

  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-X', '-q', '-r', zipPath, bundleName], { cwd: stagingParent });
  execFileSync('unzip', ['-tq', zipPath], { stdio: 'pipe' });
  const zipBytes = readFileSync(zipPath);
  process.stdout.write(`${JSON.stringify({
    zipPath,
    sha256: sha256(zipBytes),
    byteSize: zipBytes.length,
    featureCommit: currentCommit,
    finalScreenshotCount: finalRecords.length,
    uniqueFinalScreenshotHashCount: finalHashes.size,
    comparisonCount: comparisonManifest.records.length,
    minimumPrimaryChangedPixelRatio: comparisonManifest.minimumPrimaryChangedPixelRatio
  }, null, 2)}\n`);
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
