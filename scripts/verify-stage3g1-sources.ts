import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import {
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  freezeOperationalReadinessSourceExtractionManifest,
  operationalSourceRevisionId
} from '../src/services/operationalReadinessPack';
import type {
  OperationalReadinessSourceExtractionManifest
} from '../src/types/operationalReadinessPack';

interface SourceExpectation {
  sourceId: string;
  path: string;
  expectedByteSize: number;
  expectedSha256: string;
  classification: string;
}

const sources: SourceExpectation[] = [
  {
    sourceId: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001',
    path: '/Users/mayadeen/Downloads/حوكمة_مشروع_حدائق_الملك_عبدالله_  05-07-2026 (3).pptx',
    expectedByteSize: 6_403_790,
    expectedSha256: '8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb',
    classification: 'founder-approved-project-governance-source'
  },
  {
    sourceId: 'SOURCE-ASSET-KAP-DWG-LOCAL-001',
    path: '/Users/mayadeen/Downloads/Kaig-master 2.dwg',
    expectedByteSize: 99_452_545,
    expectedSha256: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d',
    classification: 'founder-approved-cad-source'
  },
  {
    sourceId: 'SOURCE-ASSET-KAP-EMPLOYEE-XLSX-001',
    path: '/Users/mayadeen/Downloads/اسماء موظفين ميادين .xlsx',
    expectedByteSize: 15_661,
    expectedSha256: 'fac606e4517e8d6e2f070dab4582d980b932c8eca2d9f5a0f3ea0fb18a746aec',
    classification: 'employee-name-reference-limited'
  },
  {
    sourceId: 'SOURCE-ASSET-STAGE3G1-FOUNDER-DIRECTION-001',
    path: '/Users/mayadeen/.codex/attachments/777fc698-0cec-4828-8eec-1bdeef4ce651/pasted-text.txt',
    expectedByteSize: 29_659,
    expectedSha256: 'b74fcd1eee9d5c38044ee0bae3ea8868b79a5018924dcb9e6b41296788a49bd5',
    classification: 'founder-direction'
  }
];

async function sha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath) as AsyncIterable<Buffer>) hash.update(chunk);
  return hash.digest('hex');
}

const results = await Promise.all(sources.map(async (source) => {
  const observedByteSize = statSync(source.path).size;
  const observedSha256 = await sha256(source.path);
  return {
    sourceId: source.sourceId,
    classification: source.classification,
    expectedByteSize: source.expectedByteSize,
    observedByteSize,
    expectedSha256: source.expectedSha256,
    observedSha256,
    status: observedByteSize === source.expectedByteSize && observedSha256 === source.expectedSha256
      ? 'verified'
      : 'mismatch-blocked'
  };
}));

const extraction = JSON.parse(
  readFileSync('pilot-input/manifests/kap-readiness-source-extraction-v1.json', 'utf8')
) as OperationalReadinessSourceExtractionManifest;
const {
  sourceFingerprint: _sourceFingerprint,
  sourceTraceFingerprint: _sourceTraceFingerprint,
  extractionFingerprint: _extractionFingerprint,
  ...extractionWithoutFingerprints
} = extraction;
void _sourceFingerprint;
void _sourceTraceFingerprint;
void _extractionFingerprint;
const recomputedExtraction = freezeOperationalReadinessSourceExtractionManifest(
  extractionWithoutFingerprints
);
const manifestIssues = [
  extraction.sourceFingerprint === deriveOperationalSourceFingerprint(extraction.sourceRegistry)
    ? null
    : 'source-fingerprint-mismatch',
  extraction.sourceTraceFingerprint === deriveOperationalSourceTraceFingerprint(extraction.sourceTraces)
    ? null
    : 'source-trace-fingerprint-mismatch',
  extraction.extractionFingerprint === recomputedExtraction.extractionFingerprint
    ? null
    : 'extraction-fingerprint-mismatch',
  extraction.sourceRegistry.every((source) =>
    source.sourceRevisionId === operationalSourceRevisionId(source)
  )
    ? null
    : 'source-revision-identity-mismatch',
  extraction.sourceRegistry.every((source) =>
    results.some((result) =>
      result.sourceId === source.sourceId
      && result.observedByteSize === source.observedByteSize
      && result.observedSha256 === source.observedSha256
    )
  )
    ? null
    : 'registered-source-bytes-mismatch',
  extraction.sourceRegistry.every((source) =>
    source.absoluteLocalPath === `local-review://${source.sourceId}/R${source.sourceRevision}`
  )
    ? null
    : 'private-local-path-exposed'
].filter((issue): issue is string => Boolean(issue));

if (results.some((result) => result.status !== 'verified') || manifestIssues.length > 0) {
  process.stderr.write(`${JSON.stringify({
    status: 'SOURCE_REVISION_MISMATCH_BLOCKED',
    results,
    manifestIssues
  }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({
    status: 'STAGE3G1A_SOURCE_LINEAGE_VERIFIED',
    verifiedCount: results.length,
    traceCount: extraction.sourceTraces.length,
    sourceFingerprint: extraction.sourceFingerprint,
    sourceTraceFingerprint: extraction.sourceTraceFingerprint,
    extractionFingerprint: extraction.extractionFingerprint,
    results
  }, null, 2)}\n`);
}
