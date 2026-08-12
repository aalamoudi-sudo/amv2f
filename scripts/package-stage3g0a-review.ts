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

const repositoryRoot = process.cwd();
const home = process.env.HOME ?? os.homedir();
const bundleName = 'mayadeen-stage-3g0a-founder-interaction-density-review';
const reviewRoot = process.env.STAGE3G0A_REVIEW_DIR ?? path.join(home, 'Downloads', bundleName);
const comparisonRoot = path.join(reviewRoot, 'comparisons');
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const baselineZip = process.env.STAGE3G0_BASELINE_ZIP
  ?? path.join(home, 'Downloads', 'mayadeen-stage-3g0-evidence-derived-readiness-command-review.zip');
const baselineEntry = 'mayadeen-stage-3g0-evidence-derived-readiness-command-review/screenshots/1366x768/05-requirement-matrix.png';
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedPerResolution = 9;
const allowedExtensions = new Set(['.png', '.json', '.md']);
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

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

function copyRegularFile(source: string, destination: string): void {
  assertRegularFile(source);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink prohibited: ${absolute}`);
    if (entry.isDirectory()) return listFiles(absolute);
    if (!entry.isFile()) throw new Error(`Unsupported review entry: ${absolute}`);
    return [absolute];
  });
}

assertRegularFile(baselineZip);
const comparisonTemp = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3g0a-comparison-'));
try {
  const beforePath = path.join(comparisonTemp, 'before-matrix-1366x768.png');
  writeFileSync(beforePath, execFileSync('unzip', ['-p', baselineZip, baselineEntry], {
    maxBuffer: 10 * 1024 * 1024
  }));
  rmSync(comparisonRoot, { recursive: true, force: true });
  const pythonCandidates = [
    process.env.STAGE3G0A_PYTHON,
    path.join(home, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'bin', 'python3'),
    'python3'
  ].filter((candidate): candidate is string => Boolean(candidate));
  const python = pythonCandidates.find((candidate) => candidate === 'python3' || existsSync(candidate));
  if (!python) throw new Error('Python with Pillow is required for comparison generation.');
  execFileSync(python, [
    path.join(repositoryRoot, 'scripts', 'generate-stage3g0a-comparison.py'),
    beforePath,
    path.join(reviewRoot, '1366x768', '02-compact-requirement-matrix.png'),
    comparisonRoot
  ], { stdio: 'inherit' });
} finally {
  rmSync(comparisonTemp, { recursive: true, force: true });
}

const allScreenshotHashes = new Set<string>();
let screenshotCount = 0;
for (const resolution of resolutions) {
  const directory = path.join(reviewRoot, resolution);
  const manifestPath = path.join(directory, 'screenshots.json');
  assertRegularFile(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    featureCommit: string;
    screenshots: ScreenshotRecord[];
  };
  if (manifest.featureCommit !== currentCommit || manifest.screenshots.length !== expectedPerResolution) {
    throw new Error(`Invalid screenshot manifest for ${resolution}.`);
  }
  const [expectedWidth, expectedHeight] = resolution.split('x').map(Number);
  manifest.screenshots.forEach((record) => {
    const filePath = path.join(directory, record.file);
    assertRegularFile(filePath);
    const bytes = readFileSync(filePath);
    const dimensions = pngDimensions(bytes);
    const actualHash = sha256(bytes);
    if (
      actualHash !== record.sha256
      || dimensions.width !== expectedWidth
      || dimensions.height !== expectedHeight
      || record.width !== expectedWidth
      || record.height !== expectedHeight
    ) {
      throw new Error(`Screenshot integrity mismatch: ${record.file}`);
    }
    if (allScreenshotHashes.has(actualHash)) {
      throw new Error(`Screenshot hash is not unique: ${record.file}`);
    }
    allScreenshotHashes.add(actualHash);
    screenshotCount += 1;
  });
}

const comparisonManifestPath = path.join(comparisonRoot, 'comparisons.json');
assertRegularFile(comparisonManifestPath);
const comparisonManifest = JSON.parse(readFileSync(comparisonManifestPath, 'utf8')) as {
  comparisonCount: number;
  records: Array<{ file: string; width: number; height: number; sha256: string }>;
};
if (comparisonManifest.comparisonCount !== 1) throw new Error('Comparison count is invalid.');
comparisonManifest.records.forEach((record) => {
  const bytes = readFileSync(path.join(comparisonRoot, record.file));
  const dimensions = pngDimensions(bytes);
  if (
    sha256(bytes) !== record.sha256
    || dimensions.width !== record.width
    || dimensions.height !== record.height
  ) {
    throw new Error(`Comparison integrity mismatch: ${record.file}`);
  }
});

const stagingParent = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3g0a-review-'));
const stagedRoot = path.join(stagingParent, bundleName);
mkdirSync(stagedRoot, { recursive: true });

try {
  for (const resolution of resolutions) {
    const directory = path.join(reviewRoot, resolution);
    readdirSync(directory).forEach((fileName) => copyRegularFile(
      path.join(directory, fileName),
      path.join(stagedRoot, 'screenshots', resolution, fileName)
    ));
  }
  readdirSync(comparisonRoot).forEach((fileName) => copyRegularFile(
    path.join(comparisonRoot, fileName),
    path.join(stagedRoot, 'comparisons', fileName)
  ));

  const documentation = [
    'docs/stage-3g0a-founder-interaction-density-correction.md',
    'docs/stage-3g0-evidence-derived-readiness-command.md',
    'docs/readiness-domain-model-v2.md',
    'docs/readiness-derivation-policy-v1.md',
    'docs/architecture-decisions/ADR-012-evidence-derived-readiness.md',
    'docs/architecture-decisions/ADR-011-founder-spatial-truth-freeze.md'
  ];
  documentation.forEach((relativePath) => copyRegularFile(
    path.join(repositoryRoot, relativePath),
    path.join(stagedRoot, 'documentation', path.basename(relativePath))
  ));

  const manifest = {
    stage: '3G.0A',
    status: 'READY_FOR_FOUNDER_STAGE_3G0A_REVIEW',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    featureCommit: currentCommit,
    generatedAt: new Date().toISOString(),
    screenshotCount,
    uniqueScreenshotHashCount: allScreenshotHashes.size,
    comparisonCount: comparisonManifest.comparisonCount,
    resolutions,
    measurements1366x768: {
      secondaryContentBeforePx: 253,
      secondaryContentAfterPx: 395,
      mapCanvasBeforePx: 156,
      mapCanvasAfterPx: 377,
      visibleMatrixRowsBefore: 3,
      visibleMatrixRowsAfter: 5
    },
    productionBundleComparison: {
      baselineCommit: 'af1d05b3bd095cc86c27e1203be629d9d07f5272',
      baselineRawBytes: 3_077_110,
      correctedRawBytes: 3_089_816,
      rawIncreasePercent: 0.413,
      baselineGzipBytes: 819_206,
      correctedGzipBytes: 821_824,
      gzipIncreasePercent: 0.320,
      dependencyChange: false
    },
    sourceBinariesIncluded: false,
    localPreviewBinariesIncluded: false,
    personalContactDataIncluded: false,
    preciseGpsIncluded: false,
    secretsIncluded: false,
    operationalClaim: 'KAP remains unassessed; interaction correction does not promote spatial or readiness authority.'
  };
  writeFileSync(path.join(stagedRoot, 'review-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3G.0A Founder Review',
    '',
    'This package proves exact pointer and keyboard marker selection plus the corrected secondary-view density.',
    '',
    'Stored candidate anchors and all Stage 3G.0 truth, evidence, authority, and project-isolation boundaries remain unchanged.',
    '',
    'Raw DWG, PDF, video, HEIC, local preview binaries, personal data, exact GPS, and secrets are excluded.',
    ''
  ].join('\n'));

  for (const filePath of listFiles(stagedRoot)) {
    const extension = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.has(extension)) throw new Error(`Non-allowlisted artifact: ${filePath}`);
    if (statSync(filePath).size === 0) throw new Error(`Empty artifact: ${filePath}`);
    if (extension === '.json' || extension === '.md') {
      const text = readFileSync(filePath, 'utf8');
      if (
        text.includes('/Users/')
        || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
        || /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]/i.test(text)
        || /"(?:latitude|longitude|coordinates|gpsLatitude|gpsLongitude)"\s*:/i.test(text)
      ) {
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
    screenshotCount,
    uniqueScreenshotHashCount: allScreenshotHashes.size,
    comparisonCount: comparisonManifest.comparisonCount
  }, null, 2)}\n`);
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
