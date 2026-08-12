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
const bundleName = 'mayadeen-stage-3g0-evidence-derived-readiness-command-review';
const reviewRoot = process.env.STAGE3G0_REVIEW_DIR ?? path.join(home, 'Downloads', bundleName);
const comparisonRoot = path.join(reviewRoot, 'comparisons');
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedPerResolution = 20;
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

const pythonCandidates = [
  process.env.STAGE3G0_PYTHON,
  path.join(home, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'bin', 'python3'),
  'python3'
].filter((candidate): candidate is string => Boolean(candidate));
const python = pythonCandidates.find((candidate) => candidate === 'python3' || existsSync(candidate));
if (!python) throw new Error('Python with Pillow is required for comparison generation.');
rmSync(comparisonRoot, { recursive: true, force: true });
execFileSync(python, [
  path.join(repositoryRoot, 'scripts', 'generate-stage3g0-comparisons.py'),
  reviewRoot,
  comparisonRoot
], { stdio: 'inherit' });

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
if (comparisonManifest.comparisonCount !== resolutions.length) {
  throw new Error('Comparison count is invalid.');
}
comparisonManifest.records.forEach((record) => {
  const filePath = path.join(comparisonRoot, record.file);
  const bytes = readFileSync(filePath);
  const dimensions = pngDimensions(bytes);
  if (
    sha256(bytes) !== record.sha256
    || dimensions.width !== record.width
    || dimensions.height !== record.height
  ) {
    throw new Error(`Comparison integrity mismatch: ${record.file}`);
  }
});

const stagingParent = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3g0-review-'));
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
    'docs/stage-3g0-evidence-derived-readiness-command.md',
    'docs/readiness-domain-model-v2.md',
    'docs/readiness-derivation-policy-v1.md',
    'docs/readiness-migration-from-manual-percent.md',
    'docs/kap-approved-source-registration.md',
    'docs/kap-governance-authority-mapping.md',
    'docs/readiness-operational-review.md',
    'docs/readiness-architecture-review.md',
    'docs/readiness-strategy-review.md',
    'docs/architecture-decisions/ADR-012-evidence-derived-readiness.md'
  ];
  documentation.forEach((relativePath) => copyRegularFile(
    path.join(repositoryRoot, relativePath),
    path.join(stagedRoot, 'documentation', path.basename(relativePath))
  ));

  const manifest = {
    stage: '3G.0',
    status: 'READY_FOR_FOUNDER_STAGE_3G0_REVIEW',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    featureCommit: currentCommit,
    generatedAt: new Date().toISOString(),
    screenshotCount,
    uniqueScreenshotHashCount: allScreenshotHashes.size,
    comparisonCount: comparisonManifest.comparisonCount,
    resolutions,
    sourceBinariesIncluded: false,
    optionalLocalPreviewsIncluded: false,
    personalContactDataIncluded: false,
    preciseGpsIncluded: false,
    secretsIncluded: false,
    operationalClaim: 'KAP remains unassessed; approved sources do not imply operational readiness.'
  };
  writeFileSync(path.join(stagedRoot, 'review-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3G.0 Founder Review',
    '',
    'The package compares the legacy temporary-demo percentage workspace with the evidence-derived KAP readiness command.',
    '',
    'KAP remains unassessed. Governance and CAD source approval do not establish engineering, HSE, client, or operational readiness.',
    '',
    'Raw PPTX, DWG, local source previews, contact details, exact GPS, and secrets are excluded.',
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
