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
const bundleName = 'mayadeen-stage-3g1-kap-real-operational-readiness-pack-review';
const reviewRoot = process.env.STAGE3G1_REVIEW_DIR ?? path.join(home, 'Downloads', bundleName);
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedPerResolution = 21;
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

const screenshotHashes = new Set<string>();
let screenshotCount = 0;
for (const resolution of resolutions) {
  const directory = path.join(reviewRoot, resolution);
  const manifestPath = path.join(directory, 'screenshots.json');
  assertRegularFile(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    featureCommit: string;
    packFingerprint: string;
    screenshots: ScreenshotRecord[];
  };
  if (
    manifest.featureCommit !== currentCommit
    || manifest.packFingerprint !== '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc'
    || manifest.screenshots.length !== expectedPerResolution
  ) {
    throw new Error(`Invalid screenshot manifest for ${resolution}.`);
  }
  const [expectedWidth, expectedHeight] = resolution.split('x').map(Number);
  for (const record of manifest.screenshots) {
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
    if (screenshotHashes.has(actualHash)) throw new Error(`Duplicate screenshot hash: ${record.file}`);
    screenshotHashes.add(actualHash);
    screenshotCount += 1;
  }
}

const stagingParent = mkdtempSync(path.join(os.tmpdir(), 'mayadeen-stage3g1-review-'));
const stagedRoot = path.join(stagingParent, bundleName);
mkdirSync(stagedRoot, { recursive: true });

try {
  for (const resolution of resolutions) {
    const directory = path.join(reviewRoot, resolution);
    for (const fileName of readdirSync(directory)) {
      copyRegularFile(
        path.join(directory, fileName),
        path.join(stagedRoot, 'screenshots', resolution, fileName)
      );
    }
  }

  const documentation = [
    'docs/stage-3g1-kap-real-operational-readiness-pack.md',
    'docs/kap-readiness-source-traceability.md',
    'docs/kap-readiness-authority-and-ownership-matrix.md',
    'docs/kap-readiness-gap-register.md',
    'docs/kap-readiness-acceptance-protocol.md',
    'docs/kap-readiness-pack-preparation-model.md',
    'docs/stage-3g1-architecture-review.md',
    'docs/stage-3g1-operational-review.md',
    'docs/stage-3g1-governance-review.md',
    'docs/stage-3g1-strategy-review.md',
    'docs/architecture-decisions/ADR-013-real-readiness-pack-authoring-and-eligibility.md'
  ];
  for (const relativePath of documentation) {
    copyRegularFile(
      path.join(repositoryRoot, relativePath),
      path.join(stagedRoot, 'documentation', path.basename(relativePath))
    );
  }

  const manifest = {
    stage: '3G.1',
    status: 'READY_FOR_FOUNDER_STAGE_3G1_REVIEW',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint: '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc',
    featureCommit: currentCommit,
    generatedAt: new Date().toISOString(),
    screenshotCount,
    uniqueScreenshotHashCount: screenshotHashes.size,
    resolutions,
    sourceBinariesIncluded: false,
    localSourcePreviewsIncluded: false,
    unrelatedEmployeeDataIncluded: false,
    preciseGpsIncluded: false,
    secretsIncluded: false,
    operationalReadiness: 'cannot-determine',
    operationalApprovalClaimed: false
  };
  writeFileSync(path.join(stagedRoot, 'review-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3G.1 Founder Review',
    '',
    'This package reviews the real-source KAP operational-readiness pack candidate.',
    '',
    'The 61.7% measure is pack preparation only. KAP operational readiness remains cannot-determine.',
    '',
    'Raw PPTX, DWG, XLSX, source previews, local paths, unrelated HR data, GPS, credentials, and secrets are excluded.',
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
    uniqueScreenshotHashCount: screenshotHashes.size
  }, null, 2)}\n`);
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
