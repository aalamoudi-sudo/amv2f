import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assessIntakePath,
  assessZipCentralDirectory,
  classifyDeliverySourceType,
  classifyGpsMetadata,
  classifyInventoryDuplicate,
  classifyStudioCapability,
  classifyStudioDeliveryFormat,
  detectCredentialLikeContent,
  findUnexpectedExternalUris,
  mimeTypeForFilename,
  redactPrivateSourcePath,
  safeDisplayFilename
} from '../src/services/experienceDeliverySafety';
import { validateGlbBytes, validateGltfDocument } from '../src/services/studioAssetValidation';
import type { DeliverySourceInventoryRecord } from '../src/types/experienceDelivery';

type Channel = 'operational' | 'studio-3d';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/u, '').split('=');
  return [key, value.join('=') || 'true'];
}));
const channel = (args.get('channel') ?? 'operational') as Channel;
if (!['operational', 'studio-3d'].includes(channel)) throw new Error('channel must be operational or studio-3d');

const privateRoot = path.join(repositoryRoot, 'private-input');
const channelRoot = path.join(privateRoot, channel === 'operational' ? 'operational-delivery' : 'studio-3d-delivery');
const quarantineRoot = path.join(privateRoot, 'quarantine');
const outputRoot = path.join(repositoryRoot, 'private-output', 'delivery-intake');
for (const directory of [privateRoot, channelRoot, quarantineRoot, outputRoot]) mkdirSync(directory, { recursive: true });

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function imageDimensions(bytes: Uint8Array): { width: number; height: number; format: 'jpeg' | 'png' | 'unknown' } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0, false) === 0x89504e47 && view.getUint32(4, false) === 0x0d0a1a0a) {
    return { width: view.getUint32(16, false), height: view.getUint32(20, false), format: 'png' };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset + 2, false);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: view.getUint16(offset + 7, false), height: view.getUint16(offset + 5, false), format: 'jpeg' };
      }
      offset += 2 + length;
    }
  }
  return null;
}

interface IntakeFileResult {
  inventory: DeliverySourceInventoryRecord;
  relativeFileId: string;
  status: 'inventory-created' | 'quarantined' | 'duplicate' | 'conflict';
  securityCodes: string[];
  externalUriCount: number;
  credentialFindingCount: number;
  archiveEntryCount: number | null;
  studioCapability: string | null;
  studioValidation: unknown;
  imageMetadata: unknown;
}

function walk(directory: string, relativeDirectory = ''): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(relativeDirectory, entry.name);
    const absolute = path.join(directory, entry.name);
    const link = lstatSync(absolute).isSymbolicLink();
    if (link) {
      results.push(relative);
      continue;
    }
    if (entry.isDirectory()) results.push(...walk(absolute, relative));
    else results.push(relative);
  }
  return results.sort();
}

const channelRootReal = realpathSync(channelRoot);
const channelFiles = walk(channelRoot);
const fileResults: IntakeFileResult[] = [];
const privateTechnicalDiagnostics: Array<{ localOpaqueSourceId: string; originalFilename: string; absoluteSourcePath: string; safeDisplayFilename: string; status: IntakeFileResult['status'] }> = [];
for (const relativePath of channelFiles) {
  const absolutePath = path.resolve(channelRoot, relativePath);
  const lstat = lstatSync(absolutePath);
  const resolvedWithinRoot = lstat.isSymbolicLink()
    ? false
    : realpathSync(absolutePath).startsWith(`${channelRootReal}${path.sep}`);
  const pathAssessment = assessIntakePath({
    relativePath,
    symbolicLink: lstat.isSymbolicLink(),
    resolvedWithinRoot,
    directory: lstat.isDirectory(),
    allowedDataExtensions: channel === 'studio-3d' ? new Set(['bin']) : undefined
  });
  if (!pathAssessment.safe || lstat.isDirectory()) {
    const syntheticHash = sha256(new TextEncoder().encode(relativePath));
    fileResults.push({
      inventory: {
        sourceRecordId: `SOURCE-LOCAL-QUARANTINE-${syntheticHash.slice(0, 12)}`,
        localOpaqueSourceId: `LOCAL-SOURCE-${syntheticHash.slice(0, 16)}`,
        originalFilename: safeDisplayFilename(relativePath),
        safeDisplayFilename: safeDisplayFilename(relativePath),
        sourceType: 'unknown', mimeType: null, byteSize: 0, sha256: syntheticHash, fingerprintState: 'not-verified', sourceOwner: null,
        suppliedBy: null, suppliedAt: null, revision: null, claimedApprovalStatus: null, verifiedAuthorityStatus: 'unknown',
        confidentialityClassification: 'unknown', retentionClassification: 'quarantine', relevantDayIds: [], relevantPersonaIds: [],
        relevantDestinationIds: [], relevantWorkstreamIds: [], extractionStatus: 'blocked', conflictStatus: 'unresolved',
        acceptanceStatus: 'quarantined', modifiedAtReported: null, pathDisclosure: 'redacted'
      },
      relativeFileId: `LOCAL-PATH-${syntheticHash.slice(0, 16)}`,
      status: 'quarantined', securityCodes: [...pathAssessment.codes], externalUriCount: 0, credentialFindingCount: 0,
      archiveEntryCount: null, studioCapability: null, studioValidation: null, imageMetadata: null
    });
    privateTechnicalDiagnostics.push({ localOpaqueSourceId: `LOCAL-SOURCE-${syntheticHash.slice(0, 16)}`, originalFilename: path.basename(absolutePath), absoluteSourcePath: absolutePath, safeDisplayFilename: safeDisplayFilename(relativePath), status: 'quarantined' });
    continue;
  }

  const before = statSync(absolutePath, { bigint: true });
  const bytes = readFileSync(absolutePath);
  const fingerprint = sha256(bytes);
  const after = statSync(absolutePath, { bigint: true });
  const changed = before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ino !== after.ino;
  const redacted = redactPrivateSourcePath(relativePath, fingerprint);
  const sourceType = classifyDeliverySourceType(relativePath, channel);
  const securityCodes = [...pathAssessment.codes];
  let archiveEntryCount: number | null = null;
  if (path.extname(relativePath).toLowerCase() === '.zip') {
    const archive = assessZipCentralDirectory(bytes, { allowedDataExtensions: channel === 'studio-3d' ? new Set(['bin']) : undefined });
    archiveEntryCount = archive.entries.length;
    securityCodes.push(...archive.codes);
  }
  const textEligible = bytes.length <= 5 * 1024 * 1024 && ['json', 'csv', 'gltf'].includes(path.extname(relativePath).slice(1).toLowerCase());
  const text = textEligible ? new TextDecoder().decode(bytes) : '';
  const credentialFindings = detectCredentialLikeContent(text);
  const externalUris = findUnexpectedExternalUris(text);
  if (credentialFindings.length) securityCodes.push('delivery-credential-like-content');
  if (externalUris.length) securityCodes.push('delivery-unexpected-external-uri');
  if (changed) securityCodes.push('delivery-file-changed-after-fingerprint');
  const studioFormat = channel === 'studio-3d' ? classifyStudioDeliveryFormat(relativePath) : null;
  const studioCapability = channel === 'studio-3d' ? classifyStudioCapability(studioFormat) : null;
  const sourceDirectory = path.posix.dirname(relativePath);
  const dependencyNames = new Set(channelFiles.map((candidate) => path.posix.normalize(path.posix.relative(sourceDirectory, candidate))));
  let studioValidation: unknown = null;
  if (studioFormat === 'glb') studioValidation = validateGlbBytes(bytes, { sourceFingerprint: fingerprint, availableDependencies: dependencyNames });
  if (studioFormat === 'gltf') {
    try { studioValidation = validateGltfDocument(JSON.parse(text), { sourceFingerprint: fingerprint, availableDependencies: dependencyNames }); }
    catch { studioValidation = validateGltfDocument(null, { sourceFingerprint: fingerprint }); }
  }
  const dimensions = imageDimensions(bytes);
  const imageMetadata = dimensions ? { ...dimensions, ratio: Number((dimensions.width / dimensions.height).toFixed(5)), gpsStatus: classifyGpsMetadata(bytes) } : null;
  const quarantine = securityCodes.length > 0;
  const sourceId = `SOURCE-LOCAL-${fingerprint.slice(0, 16)}`;
  const inventory: DeliverySourceInventoryRecord = {
    sourceRecordId: sourceId,
    localOpaqueSourceId: `LOCAL-SOURCE-${fingerprint.slice(0, 16)}`,
    originalFilename: redacted.safeDisplayName,
    safeDisplayFilename: redacted.safeDisplayName,
    sourceType,
    mimeType: mimeTypeForFilename(relativePath),
    byteSize: bytes.length,
    sha256: fingerprint,
    fingerprintState: changed ? 'changed-after-fingerprint' : 'verified',
    sourceOwner: null,
    suppliedBy: null,
    suppliedAt: null,
    revision: null,
    claimedApprovalStatus: null,
    verifiedAuthorityStatus: 'unknown',
    confidentialityClassification: 'unknown',
    retentionClassification: quarantine ? 'quarantine' : 'review-session',
    relevantDayIds: [], relevantPersonaIds: [], relevantDestinationIds: [], relevantWorkstreamIds: [],
    extractionStatus: quarantine ? 'blocked' : studioValidation ? 'metadata-extracted' : 'inventory-only',
    conflictStatus: 'none',
    acceptanceStatus: quarantine ? 'quarantined' : 'inventory-created',
    modifiedAtReported: new Date(Number(after.mtimeMs)).toISOString(),
    pathDisclosure: 'redacted'
  };
  const duplicate = fileResults.map((result) => result.inventory).map((existing) => classifyInventoryDuplicate(existing, inventory)).find((classification) => classification !== 'distinct') ?? 'distinct';
  if (duplicate === 'duplicate') { inventory.conflictStatus = 'duplicate'; inventory.acceptanceStatus = 'duplicate'; }
  if (duplicate === 'conflict') { inventory.conflictStatus = 'conflicting-content'; inventory.acceptanceStatus = 'conflict'; }
  fileResults.push({
    inventory,
    relativeFileId: redacted.safeOpaquePathId,
    status: quarantine ? 'quarantined' : duplicate === 'duplicate' ? 'duplicate' : duplicate === 'conflict' ? 'conflict' : 'inventory-created',
    securityCodes: [...new Set(securityCodes)].sort(),
    externalUriCount: externalUris.length,
    credentialFindingCount: credentialFindings.length,
    archiveEntryCount,
    studioCapability,
    studioValidation,
    imageMetadata
  });
  privateTechnicalDiagnostics.push({ localOpaqueSourceId: inventory.localOpaqueSourceId, originalFilename: path.basename(absolutePath), absoluteSourcePath: absolutePath, safeDisplayFilename: inventory.safeDisplayFilename, status: quarantine ? 'quarantined' : duplicate === 'duplicate' ? 'duplicate' : duplicate === 'conflict' ? 'conflict' : 'inventory-created' });
}

const reportBase = {
  reportId: `EXPERIENCE-DELIVERY-INVENTORY-${channel.toUpperCase()}-${new Date().toISOString().slice(0, 10)}`,
  channel,
  generatedAt: new Date().toISOString(),
  timeTrust: 'local-process-time-untrusted',
  inputRoot: channel === 'operational' ? 'private-input/operational-delivery/' : 'private-input/studio-3d-delivery/',
  quarantineRoot: 'private-input/quarantine/',
  receivedPackageCount: fileResults.length,
  acceptedPackageCount: 0,
  boundAssetCount: 0,
  status: fileResults.length ? fileResults.some((result) => result.status === 'quarantined') ? 'quarantined' : 'inventory-created' : 'missing',
  files: fileResults,
  rawFilesCopiedToBrowser: false,
  externalTransmission: false,
  automaticAcceptance: false
};
const report = { ...reportBase, contentHash: sha256(new TextEncoder().encode(JSON.stringify(reportBase))) };
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (serialized.includes(repositoryRoot) || serialized.includes(process.env.HOME ?? '__NO_HOME__')) throw new Error('private path redaction failed');
const outputPath = path.join(outputRoot, `${channel}-inventory.json`);
writeFileSync(outputPath, serialized, { mode: 0o600 });
writeFileSync(path.join(outputRoot, `${channel}-private-source-custody.json`), `${JSON.stringify({
  classification: 'private-local-technical-report-do-not-publish',
  generatedAt: report.generatedAt,
  files: privateTechnicalDiagnostics
}, null, 2)}\n`, { mode: 0o600 });

process.stdout.write(`${JSON.stringify({
  status: report.status,
  channel,
  receivedPackageCount: report.receivedPackageCount,
  acceptedPackageCount: 0,
  output: `private-output/delivery-intake/${channel}-inventory.json`,
  input: report.inputRoot,
  quarantine: report.quarantineRoot,
  directoriesReady: existsSync(channelRoot) && existsSync(quarantineRoot)
}, null, 2)}\n`);
