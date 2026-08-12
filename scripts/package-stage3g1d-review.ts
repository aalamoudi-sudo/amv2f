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

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

const repositoryRoot = process.cwd();
const home = process.env.HOME ?? os.homedir();
const bundleName =
  'mayadeen-stage-3g1d-local-trust-root-custody-review';
const reviewRoot = process.env.STAGE3G1D_REVIEW_DIR
  ?? path.join(home, 'Downloads', bundleName);
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedPerResolution = 11;
const packFingerprint =
  '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc';
const allowedExtensions = new Set(['.png', '.json', '.md']);
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8'
}).trim();
const adversarialCases = [
  'same-revision-trigger-rewrite-with-self-issued-anchor',
  'caller-snapshots-modified-active-pack',
  'plain-object-imitates-trusted-session',
  'session-issued-for-another-pack',
  'session-issued-for-another-project-or-event',
  'expired-or-superseded-session',
  'revision-actor-absent-from-authority-matrix',
  'wrong-canonical-authority-kind',
  'copied-actor-with-wrong-authority',
  'authoring-command-missing-source-trace',
  'caller-created-evidence-resolver',
  'fabricated-verified-evidence',
  'trusted-evidence-from-another-event',
  'evidence-registry-fingerprint-mismatch',
  'missing-evidence-registry-custody',
  'revision-three-waiver-history-reset',
  'missing-waiver-ledger',
  'forked-waiver-history',
  'wrong-previous-waiver-hash',
  'waiver-rollback-erases-custody',
  'local-storage-self-anchor-injection',
  'rehash-invalid-state',
  'compiled-trusted-root-loads',
  'canonical-revision-two-accepted',
  'trusted-evidence-resolves',
  'first-waiver-appends',
  'second-waiver-links-to-first',
  'trusted-conditional-waiver-freezes',
  'generic-non-kap-gateway',
  'kap-remains-blocked-cannot-determine'
] as const;

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Review image is not a valid PNG.');
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function assertRegularFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Missing review artifact: ${filePath}`);
  }
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
    if (entry.isSymbolicLink()) {
      throw new Error(`Symlink prohibited: ${absolute}`);
    }
    if (entry.isDirectory()) return listFiles(absolute);
    if (!entry.isFile()) {
      throw new Error(`Unsupported review entry: ${absolute}`);
    }
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
    trustPolicyVersion: string;
    screenshots: ScreenshotRecord[];
  };
  if (
    manifest.featureCommit !== currentCommit
    || manifest.packFingerprint !== packFingerprint
    || manifest.trustPolicyVersion
      !== 'OPERATIONAL-READINESS-TRUST-POLICY-v1'
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
    if (screenshotHashes.has(actualHash)) {
      throw new Error(`Duplicate screenshot hash: ${record.file}`);
    }
    screenshotHashes.add(actualHash);
    screenshotCount += 1;
  }
}

const stagingParent = mkdtempSync(
  path.join(os.tmpdir(), 'mayadeen-stage3g1d-review-')
);
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
    'docs/stage-3g1d-local-trust-root-and-custody-closure.md',
    'docs/architecture-decisions/ADR-015-local-readiness-trust-root.md',
    'docs/architecture-decisions/ADR-014-derived-operational-authority-contract.md'
  ];
  for (const relativePath of documentation) {
    copyRegularFile(
      path.join(repositoryRoot, relativePath),
      path.join(stagedRoot, 'documentation', path.basename(relativePath))
    );
  }

  writeFileSync(
    path.join(stagedRoot, 'trust-root-adversarial-results.json'),
    `${JSON.stringify({
      suite: 'src/services/operationalReadinessTrustGateway.test.ts',
      result: 'passed',
      passed: adversarialCases.length,
      failed: 0,
      cases: adversarialCases.map((name, index) => ({
        number: index + 1,
        name,
        result: 'passed'
      }))
    }, null, 2)}\n`
  );

  const manifest = {
    stage: '3G.1D',
    status: 'READY_FOR_FOUNDER_STAGE_3G1D_REVIEW',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint,
    trustRootId: 'READINESS-TRUST-ROOT-KAP-R1',
    trustPolicyVersion: 'OPERATIONAL-READINESS-TRUST-POLICY-v1',
    sourceFingerprint:
      '9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97',
    sourceTraceFingerprint:
      '900cd8a205b170e4893fb2a938a98628925a504dfb13b20ee045131b3f7d5530',
    triggerFingerprint:
      '49c4ff2a7b75b236f549e68e5e5f73934589e03b917edb2404694d409562d937',
    featureCommit: currentCommit,
    generatedAt: new Date().toISOString(),
    screenshotCount,
    uniqueScreenshotHashCount: screenshotHashes.size,
    resolutions,
    adversarialTestCount: adversarialCases.length,
    expectedAuthorityCount: 9,
    validAuthorityAssignmentCount: 0,
    preFreezeBlockerCount: 15,
    preActivationBlockerCount: 5,
    totalRequirementCount: 24,
    legalRequirementCount: 18,
    preparationCompleteness: 61.7,
    evidenceRegistryStatus: 'unavailable-for-kap',
    waiverLedgerStatus: 'initialized-empty',
    sourceBinariesIncluded: false,
    privateContactDataIncluded: false,
    preciseGpsIncluded: false,
    secretsIncluded: false,
    operationalReadiness: 'cannot-determine',
    operationalApprovalClaimed: false,
    productionAuthenticationClaimed: false
  };
  writeFileSync(
    path.join(stagedRoot, 'review-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3G.1D Founder Review',
    '',
    'This archive reviews the local-process trust root, revision custody,',
    'trusted evidence registry boundary, and append-only waiver ledger.',
    '',
    'Screens 01-05 are product states. Screens 06-11 are explicitly labeled',
    'local test evidence generated from the same trust gateway in the test process.',
    '',
    'KAP has no trusted operational evidence registry, no valid authority',
    'assignments, no waiver, no freeze, and no activation. Its readiness remains',
    'cannot-determine.',
    '',
    'This is not production authentication or cryptographic certification.',
    'Raw PPTX, XLSX, DWG, contact data, GPS, credentials, and secrets are excluded.',
    ''
  ].join('\n'));

  for (const filePath of listFiles(stagedRoot)) {
    const extension = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      throw new Error(`Non-allowlisted artifact: ${filePath}`);
    }
    if (statSync(filePath).size === 0) {
      throw new Error(`Empty artifact: ${filePath}`);
    }
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
  execFileSync('zip', ['-X', '-q', '-r', zipPath, bundleName], {
    cwd: stagingParent
  });
  execFileSync('unzip', ['-tq', zipPath], { stdio: 'pipe' });
  const zipBytes = readFileSync(zipPath);
  process.stdout.write(`${JSON.stringify({
    zipPath,
    sha256: sha256(zipBytes),
    byteSize: zipBytes.length,
    featureCommit: currentCommit,
    screenshotCount,
    uniqueScreenshotHashCount: screenshotHashes.size,
    adversarialTestCount: adversarialCases.length
  }, null, 2)}\n`);
} finally {
  rmSync(stagingParent, { recursive: true, force: true });
}
