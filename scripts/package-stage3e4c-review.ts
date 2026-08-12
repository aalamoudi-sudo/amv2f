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

interface ScreenshotManifest {
  featureCommit: string;
  screenshots: ScreenshotRecord[];
}

const repositoryRoot = process.cwd();
const home = process.env.HOME ?? os.homedir();
const bundleName = 'mayadeen-stage-3e4c-founder-spatial-truth-map-control-review';
const reviewRoot = process.env.STAGE3E4C_REVIEW_DIR ?? path.join(home, 'Downloads', bundleName);
const beforeRoot = process.env.STAGE3E4C_BEFORE_DIR
  ?? path.join(home, 'Downloads', 'mayadeen-stage-3e4c-founder-spatial-truth-map-control-before');
const afterRoot = path.join(reviewRoot, 'after');
const comparisonsRoot = path.join(reviewRoot, 'comparisons');
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedFeatureScreenshotsPerResolution = 23;
const expectedFeatureScreenshotCount = 69;
const expectedComparisonCount = 18;
const startingCommit = 'c427a1379942d420d030a5f2ad029084cfa2176e';
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
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new Error(`Review artifact must be a regular file: ${filePath}`);
  }
}

function assertDirectory(directory: string): void {
  if (!existsSync(directory)) throw new Error(`Missing review directory: ${directory}`);
  const metadata = lstatSync(directory);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new Error(`Review directory must not be a symlink: ${directory}`);
  }
}

function copyRegularFile(source: string, destination: string): void {
  assertRegularFile(source);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
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
  process.env.STAGE3E4C_PYTHON,
  path.join(home, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'bin', 'python3'),
  'python3'
].filter((candidate): candidate is string => Boolean(candidate));
const python = pythonCandidates.find((candidate) => candidate === 'python3' || existsSync(candidate));
if (!python) throw new Error('A Python runtime with Pillow is required to generate visual comparisons.');
execFileSync(python, [
  path.join(repositoryRoot, 'scripts', 'generate-stage3e4c-comparisons.py'),
  beforeRoot,
  afterRoot,
  comparisonsRoot
], { stdio: 'inherit' });

assertDirectory(beforeRoot);
assertDirectory(afterRoot);
assertDirectory(comparisonsRoot);

const finalHashes = new Set<string>();
const finalRecords: Array<ScreenshotRecord & { resolution: string }> = [];
for (const resolution of resolutions) {
  const [expectedWidth, expectedHeight] = resolution.split('x').map(Number);
  const beforeDirectory = path.join(beforeRoot, resolution);
  const afterDirectory = path.join(afterRoot, resolution);
  assertDirectory(beforeDirectory);
  assertDirectory(afterDirectory);

  const beforeManifest = JSON.parse(
    readFileSync(path.join(beforeDirectory, 'screenshots.json'), 'utf8')
  ) as ScreenshotManifest;
  if (beforeManifest.featureCommit !== startingCommit || beforeManifest.screenshots.length !== 15) {
    throw new Error(`Invalid Stage 3E.4B baseline manifest: ${resolution}`);
  }
  beforeManifest.screenshots.forEach((record) => {
    const filePath = path.join(beforeDirectory, record.file);
    assertRegularFile(filePath);
    const bytes = readFileSync(filePath);
    if (sha256(bytes) !== record.sha256) throw new Error(`Before screenshot hash mismatch: ${record.file}`);
    const dimensions = pngDimensions(bytes);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
      throw new Error(`Before screenshot dimensions mismatch: ${record.file}`);
    }
  });

  const afterManifest = JSON.parse(
    readFileSync(path.join(afterDirectory, 'screenshots.json'), 'utf8')
  ) as ScreenshotManifest;
  if (afterManifest.featureCommit !== currentCommit
    || afterManifest.screenshots.length !== expectedFeatureScreenshotsPerResolution) {
    throw new Error([
      `Invalid Stage 3E.4C final manifest: ${resolution}`,
      `path=${path.join(afterDirectory, 'screenshots.json')}`,
      `manifestCommit=${afterManifest.featureCommit}`,
      `currentCommit=${currentCommit}`,
      `screenshotCount=${afterManifest.screenshots.length}`,
      `expectedScreenshotCount=${expectedFeatureScreenshotsPerResolution}`
    ].join('\n'));
  }
  afterManifest.screenshots.forEach((record) => {
    const filePath = path.join(afterDirectory, record.file);
    assertRegularFile(filePath);
    const bytes = readFileSync(filePath);
    const actualHash = sha256(bytes);
    const dimensions = pngDimensions(bytes);
    if (actualHash !== record.sha256) throw new Error(`Final screenshot hash mismatch: ${record.file}`);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight
      || record.width !== expectedWidth || record.height !== expectedHeight) {
      throw new Error(`Final screenshot dimensions mismatch: ${record.file}`);
    }
    if (finalHashes.has(actualHash)) throw new Error(`Final screenshot hash is not unique: ${record.file}`);
    finalHashes.add(actualHash);
    finalRecords.push({ ...record, resolution });
  });
}
if (finalRecords.length !== expectedFeatureScreenshotCount) {
  throw new Error(`Expected ${expectedFeatureScreenshotCount} final screenshots, found ${finalRecords.length}.`);
}

const comparisonManifestPath = path.join(comparisonsRoot, 'comparisons.json');
assertRegularFile(comparisonManifestPath);
const comparisonManifest = JSON.parse(readFileSync(comparisonManifestPath, 'utf8')) as {
  comparisonCount?: number;
  minimumChangedPixelRatio?: number;
  records?: Array<{ file: string; width: number; height: number; sha256: string }>;
};
if (comparisonManifest.comparisonCount !== expectedComparisonCount
  || comparisonManifest.records?.length !== expectedComparisonCount
  || !comparisonManifest.minimumChangedPixelRatio
  || comparisonManifest.minimumChangedPixelRatio < .01) {
  throw new Error('Stage 3E.4C visual comparison manifest failed integrity checks.');
}
comparisonManifest.records.forEach((record) => {
  const filePath = path.join(comparisonsRoot, record.file);
  assertRegularFile(filePath);
  const bytes = readFileSync(filePath);
  const dimensions = pngDimensions(bytes);
  if (sha256(bytes) !== record.sha256
    || dimensions.width !== record.width
    || dimensions.height !== record.height) {
    throw new Error(`Comparison integrity mismatch: ${record.file}`);
  }
});

const stagingParent = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3e4c-review-'));
const stagedRoot = path.join(stagingParent, bundleName);
mkdirSync(stagedRoot, { recursive: true });

try {
  for (const resolution of resolutions) {
    for (const rootName of ['before', 'after'] as const) {
      const sourceDirectory = rootName === 'before'
        ? path.join(beforeRoot, resolution)
        : path.join(afterRoot, resolution);
      for (const fileName of readdirSync(sourceDirectory)) {
        copyRegularFile(
          path.join(sourceDirectory, fileName),
          path.join(stagedRoot, rootName, resolution, fileName)
        );
      }
    }
    const comparisonDirectory = path.join(comparisonsRoot, resolution);
    for (const fileName of readdirSync(comparisonDirectory)) {
      copyRegularFile(
        path.join(comparisonDirectory, fileName),
        path.join(stagedRoot, 'comparisons', resolution, fileName)
      );
    }
  }
  copyRegularFile(comparisonManifestPath, path.join(stagedRoot, 'comparisons', 'comparisons.json'));

  const documentation = [
    'docs/stage-3e4c-founder-spatial-truth-and-map-control.md',
    'docs/kap-founder-spatial-decision-register.md',
    'docs/ux/stage-3e4c-interactive-map-control.md',
    'docs/architecture-decisions/ADR-011-founder-spatial-truth-freeze.md'
  ];
  documentation.forEach((relativePath) => {
    copyRegularFile(
      path.join(repositoryRoot, relativePath),
      path.join(stagedRoot, 'documentation', path.basename(relativePath))
    );
  });

  const reviewManifest = {
    stage: '3E.4C',
    status: 'READY_FOR_FOUNDER_STAGE_3E4C_REVIEW',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    startingCommit,
    featureCommit: currentCommit,
    generatedAt: new Date().toISOString(),
    beforeScreenshotCount: 45,
    finalScreenshotCount: finalRecords.length,
    uniqueFinalScreenshotHashCount: finalHashes.size,
    comparisonCount: comparisonManifest.records.length,
    minimumChangedPixelRatio: comparisonManifest.minimumChangedPixelRatio,
    resolutions,
    spatialTruthPackHash: 'b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf',
    sourceBinariesIncluded: false,
    optionalLocalPreviewsIncluded: false,
    exactGpsIncluded: false,
    personalDataIncluded: false,
    secretsIncluded: false,
    truthBoundary: 'founder-approved semantics with candidate visual anchors; no engineering geometry, route, readiness, or live state'
  };
  writeFileSync(path.join(stagedRoot, 'review-manifest.json'), `${JSON.stringify(reviewManifest, null, 2)}\n`, 'utf8');
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3E.4C Founder Review',
    '',
    'This package contains the Stage 3E.4B before state, the Stage 3E.4C final states, and unaltered side-by-side comparisons.',
    '',
    'Original DWG, PDF, video, HEIC, optional local preview files, exact GPS, personal data, and secrets are excluded.',
    '',
    'The frozen founder decision approves product semantics only. Every displayed position remains a candidate visual anchor.',
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
  const bytes = readFileSync(zipPath);
  process.stdout.write(`${JSON.stringify({
    zipPath,
    sha256: sha256(bytes),
    byteSize: bytes.length,
    featureCommit: currentCommit,
    finalScreenshotCount: finalRecords.length,
    uniqueFinalScreenshotHashCount: finalHashes.size,
    comparisonCount: comparisonManifest.records.length,
    minimumChangedPixelRatio: comparisonManifest.minimumChangedPixelRatio
  }, null, 2)}\n`);
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
