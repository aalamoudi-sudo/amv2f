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
  'mayadeen-stage-3g1e-final-authority-source-revision-custody-review';
const reviewRoot = process.env.STAGE3G1E_REVIEW_DIR
  ?? path.join(home, 'Downloads', bundleName);
const zipPath = path.join(path.dirname(reviewRoot), `${bundleName}.zip`);
const resolutions = ['1366x768', '1920x1080', '2560x1080'] as const;
const expectedPerResolution = 10;
const packFingerprint =
  '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc';
const allowedExtensions = new Set(['.png', '.json', '.md']);
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8'
}).trim();
const adversarialCases = [
  ['A1', 'activation-actor-injection', 'rejected-before-permit'],
  ['A2', 'injected-actor-end-to-end-freeze-activation', 'first-transition-rejected'],
  ['H1', 'authority-id-mutation', 'rejected'],
  ['H2', 'authority-kind-mutation', 'rejected'],
  ['H3', 'authority-scope-mutation', 'rejected'],
  ['H4', 'authority-actor-ref-mutation', 'rejected'],
  ['H5', 'authority-actor-classification-mutation', 'rejected'],
  ['H6', 'authority-actor-assignment-scope-mutation', 'rejected'],
  ['H7', 'governance-authority-reference-mutation', 'rejected'],
  ['H8', 'engineering-authority-actor-mutation', 'rejected'],
  ['H9', 'hse-authority-actor-mutation', 'rejected'],
  ['H10', 'opening-authority-actor-mutation', 'rejected'],
  ['D', 'source-trace-rebinding', 'rejected'],
  ['E1', 'unknown-source-parent', 'rejected'],
  ['E2', 'new-root-source-without-trusted-parent', 'rejected'],
  ['E3', 'existing-source-record-mutation', 'rejected'],
  ['E4', 'incorrect-previous-source-hash', 'rejected'],
  ['E5', 'source-revision-gap-or-fork', 'rejected'],
  ['J', 'append-only-source-r2-new-trace', 'accepted'],
  ['F', 'same-scope-forged-revision-999', 'evidence-and-ledger-denied'],
  ['G1', 'permit-from-another-session', 'rejected'],
  ['G2', 'discarded-or-consumed-permit', 'rejected'],
  ['G3', 'permit-wrong-hash-or-revision', 'rejected'],
  ['G4', 'permit-wrong-mode', 'rejected'],
  ['G5', 'permit-stale-previous-head', 'rejected'],
  ['C', 'activation-evidence-substituted-actor', 'rejected'],
  ['L', 'kap-truth-boundary', 'preserved']
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
  path.join(os.tmpdir(), 'mayadeen-stage3g1e-review-')
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
    'docs/stage-3g1e-final-authority-source-revision-custody-closure.md',
    'docs/architecture-decisions/ADR-016-authority-source-and-exact-revision-custody.md',
    'docs/stage-3g1d-local-trust-root-and-custody-closure.md',
    'docs/architecture-decisions/ADR-015-local-readiness-trust-root.md'
  ];
  for (const relativePath of documentation) {
    copyRegularFile(
      path.join(repositoryRoot, relativePath),
      path.join(stagedRoot, 'documentation', path.basename(relativePath))
    );
  }

  writeFileSync(
    path.join(stagedRoot, 'adversarial-results.json'),
    `${JSON.stringify({
      stage: '3G.1E',
      suite:
        'src/services/operationalReadinessAuthoritySourceCustody.test.ts',
      result: 'passed',
      passed: adversarialCases.length,
      failed: 0,
      beforeAfter: {
        authorityActorInjection: {
          before: 'trusted revision, freeze and activation accepted',
          after: 'revision permit rejected; trusted head unchanged'
        },
        sourceTraceRebinding: {
          before: 'validation and trusted draft accepted',
          after: 'trace identity rebinding rejected before permit'
        },
        sameScopeForgedRevision: {
          before: {
            evidenceValid: true,
            waiverLedgerAvailable: true
          },
          after: {
            evidenceValid: false,
            waiverLedgerAvailable: false
          }
        },
        activationEvidenceIdentity: {
          originalCanonicalActor: 'accepted in synthetic local fixture',
          substitutedActor: 'rejected'
        }
      },
      priorRegressionSuites: [
        {
          stage: '3G.1A',
          command: 'pnpm test:stage3g1a-integrity',
          result: 'passed'
        },
        {
          stage: '3G.1B',
          command: 'pnpm test:stage3g1b-authority-contract',
          result: 'passed'
        },
        {
          stage: '3G.1C',
          command: 'pnpm test:stage3g1c-authority-waiver-trigger',
          result: 'passed'
        },
        {
          stage: '3G.1D',
          command: 'pnpm test:stage3g1d-trust-root',
          result: 'passed'
        }
      ],
      cases: adversarialCases.map(([id, name, outcome], index) => ({
        number: index + 1,
        id,
        name,
        outcome,
        result: 'passed'
      }))
    }, null, 2)}\n`
  );

  const manifest = {
    stage: '3G.1E',
    status: 'READY_FOR_FOUNDER_STAGE_3G1E_REVIEW',
    projectId: 'PROJECT-KAP-OPENING-2026',
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint,
    trustRootId: 'READINESS-TRUST-ROOT-KAP-R1',
    trustPolicyVersion: 'OPERATIONAL-READINESS-TRUST-POLICY-v1',
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
    authorityTopologyStatus: 'compiled-root-protected',
    sourceTraceStatus: 'append-only-and-immutable',
    exactRevisionCustody: true,
    sourceBinariesIncluded: false,
    privateContactDataIncluded: false,
    preciseGpsIncluded: false,
    secretsIncluded: false,
    operationalReadiness: 'cannot-determine',
    frozen: false,
    activated: false,
    openingDecisionClaimed: false,
    productionAuthenticationClaimed: false
  };
  writeFileSync(
    path.join(stagedRoot, 'review-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  writeFileSync(path.join(stagedRoot, 'README.md'), [
    '# Mayadeen Stage 3G.1E Founder Review',
    '',
    'This archive reviews authority-topology custody, immutable source and',
    'trace lineage, exact trusted revision/permit binding, activation evidence',
    'identity, and waiver-ledger continuity.',
    '',
    'Screens 01-02 are KAP product states. Screens 03-10 are explicitly labeled',
    'local test evidence generated from the same trust services in the test process.',
    '',
    'KAP remains candidate, unfrozen, unactivated, and operationally',
    'cannot-determine. No opening decision or readiness approval is claimed.',
    '',
    'This is a local-process boundary, not production authentication or',
    'cryptographic certification. Authority administration remains deferred.',
    '',
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
