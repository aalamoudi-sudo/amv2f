import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  kapDesignAssetId,
  kapDesignDerivative,
  kapDesignPreviewUri,
  kapDesignRuntimeUri,
  kapDesignScene,
  kapDesignSourceRecord
} from '../src/data/kapDesignExperience';
import { inspectGlbBinary, validateDesignDerivative } from '../src/services/designAssetValidation';
import { isSafeDesignAssetRelativePath } from '../src/services/designAssetStagingPolicy';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDir, '..');
const defaultPrivateRoot = join(homedir(), 'Documents', 'Mayadeen Event Intelligence', 'private-intake', 'KAP', '3D', '2026-08-02_Mahmoud_Delivery_01');
const privateRoot = resolve(process.env.KAP_DESIGN_PACKAGE_ROOT ?? defaultPrivateRoot);
const stageRoot = join(repositoryRoot, 'public/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design');
const stageParent = dirname(stageRoot);
const sourceRelative = '01_native/Kaig-mastersite.3dm';
const glbRelative = '03_web_derivatives/kap-direct-mesh-subscene-candidate.glb';
const previewRelative = '05_review/kap-direct-mesh-subscene-candidate.png';
const checksumRelative = 'SHA256SUMS.txt';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function assertContained(root: string, relativePath: string): Promise<string> {
  if (!isSafeDesignAssetRelativePath(relativePath)) throw new Error('unsafe-relative-path');
  const rootReal = await realpath(root);
  const candidate = join(rootReal, relativePath);
  const candidateReal = await realpath(candidate);
  if (candidateReal !== rootReal && !candidateReal.startsWith(`${rootReal}${sep}`)) throw new Error('path-escape');
  const fileStat = await lstat(candidateReal);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) throw new Error('unsafe-file-kind');
  return candidateReal;
}

async function verifyChecksumInventory(): Promise<number> {
  const checksumPath = await assertContained(privateRoot, checksumRelative);
  const lines = (await readFile(checksumPath, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = /^([a-f0-9]{64})\s+\*?(.+)$/.exec(line);
    const relativePath = match?.[2].startsWith('./') ? match[2].slice(2) : match?.[2];
    if (!match || !relativePath || !isSafeDesignAssetRelativePath(relativePath)) throw new Error('checksum-manifest-invalid');
    const filePath = await assertContained(privateRoot, relativePath);
    const bytes = await readFile(filePath);
    if (sha256(bytes) !== match[1]) throw new Error('checksum-mismatch');
  }
  return lines.length;
}

async function verifyInput() {
  const checksumCount = await verifyChecksumInventory();
  const sourcePath = await assertContained(privateRoot, sourceRelative);
  const glbPath = await assertContained(privateRoot, glbRelative);
  const previewPath = await assertContained(privateRoot, previewRelative);
  const [sourceStats, sourceBytes, glbBytes, previewBytes] = await Promise.all([
    stat(sourcePath),
    readFile(sourcePath),
    readFile(glbPath),
    readFile(previewPath)
  ]);
  if (sourceStats.size !== kapDesignSourceRecord.observedByteSize || sha256(sourceBytes) !== kapDesignSourceRecord.observedSha256) throw new Error('source-fingerprint-mismatch');
  if (sha256(glbBytes) !== kapDesignDerivative.sha256) throw new Error('derivative-fingerprint-mismatch');
  if (sha256(previewBytes) !== 'a738d41ba3ad70eb2603f7a45cb554dcb5151623b1f1cbb8e22904037d6258ac') throw new Error('preview-fingerprint-mismatch');
  const validation = validateDesignDerivative(kapDesignDerivative, glbBytes);
  const inspection = inspectGlbBinary(glbBytes);
  if (!validation.valid || !inspection.validContainer) throw new Error('derivative-validation-failed');
  return { checksumCount, glbPath, previewPath, glbBytes, previewBytes, inspection };
}

async function assertIgnoredBoundary(): Promise<void> {
  const ignore = await readFile(join(repositoryRoot, '.gitignore'), 'utf8');
  if (!ignore.includes('/public/local-assets/experience-scenes/')) throw new Error('local-assets-not-ignored');
}

async function clearStagedAssets(): Promise<void> {
  await rm(stageRoot, { recursive: true, force: true });
  process.stdout.write('تمت إزالة مشتقات العرض المحلية فقط. لم يُمس المصدر الخاص.\n');
}

async function stageAssets(): Promise<void> {
  await assertIgnoredBoundary();
  const verified = await verifyInput();
  await mkdir(stageParent, { recursive: true });
  const temporaryRoot = `${stageRoot}.incoming-${process.pid}`;
  const backupRoot = `${stageRoot}.previous-${process.pid}`;
  await rm(temporaryRoot, { recursive: true, force: true });
  await rm(backupRoot, { recursive: true, force: true });
  await mkdir(temporaryRoot, { recursive: true });
  await copyFile(verified.glbPath, join(temporaryRoot, `${kapDesignAssetId}.glb`));
  await copyFile(verified.previewPath, join(temporaryRoot, `${kapDesignAssetId}-preview.png`));
  const runtimeManifest = {
    schemaVersion: '1.0.0',
    sceneId: kapDesignScene.sceneId,
    assetId: kapDesignAssetId,
    source: {
      sourceId: kapDesignSourceRecord.sourceId,
      safeFilename: kapDesignSourceRecord.safeFilename,
      sha256: kapDesignSourceRecord.observedSha256,
      bytes: kapDesignSourceRecord.observedByteSize,
      authority: kapDesignSourceRecord.authorityStatus
    },
    derivative: {
      derivativeId: kapDesignDerivative.derivativeId,
      safeFilename: kapDesignDerivative.safeFilename,
      sha256: kapDesignDerivative.sha256,
      bytes: kapDesignDerivative.byteSize,
      authority: kapDesignDerivative.authorityStatus,
      runtimeUri: kapDesignRuntimeUri,
      previewUri: kapDesignPreviewUri,
      inspection: {
        sceneCount: verified.inspection.sceneCount,
        nodeCount: verified.inspection.nodeCount,
        meshCount: verified.inspection.meshCount,
        primitiveCount: verified.inspection.primitiveCount,
        vertexCount: verified.inspection.vertexCount,
        triangleCount: verified.inspection.triangleCount,
        materialCount: verified.inspection.materialCount,
        textureCount: verified.inspection.textureCount,
        boundsMin: verified.inspection.boundsMin,
        boundsMax: verified.inspection.boundsMax
      }
    },
    truth: {
      engineeringRegistered: false,
      approvedRoute: false,
      operationalReadiness: 'cannot-determine',
      panorama360Available: false
    },
    verification: { checksumEntriesVerified: verified.checksumCount, validatorVersion: 'DESIGN-ASSET-VALIDATOR-v1' }
  };
  await writeFile(join(temporaryRoot, 'runtime-design-manifest.json'), `${JSON.stringify(runtimeManifest, null, 2)}\n`, { mode: 0o600 });
  try {
    await rename(stageRoot, backupRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    await rename(temporaryRoot, stageRoot);
    await rm(backupRoot, { recursive: true, force: true });
  } catch (error) {
    await rm(stageRoot, { recursive: true, force: true });
    try { await rename(backupRoot, stageRoot); } catch { /* No previous staged revision existed. */ }
    throw error;
  }
  process.stdout.write([
    'KAP Design Web3D staged locally.',
    `Scene: ${kapDesignScene.sceneId}`,
    `Asset: ${kapDesignAssetId}`,
    `Source SHA-256: ${kapDesignSourceRecord.observedSha256}`,
    `Derivative SHA-256: ${kapDesignDerivative.sha256}`,
    `Verified package entries: ${verified.checksumCount}`,
    'Authority: founder-approved design source -> derived diagnostic candidate',
    'No raw source was copied into the repository runtime.'
  ].join('\n') + '\n');
}

async function main(): Promise<void> {
  if (process.argv.includes('--clear')) return clearStagedAssets();
  if (process.argv.includes('--verify-only')) {
    const verified = await verifyInput();
    process.stdout.write(`Design package verified: ${verified.checksumCount} checksums; GLB ${verified.inspection.triangleCount} triangles.\n`);
    return;
  }
  await stageAssets();
}

main().catch(() => {
  process.stderr.write('فشل التحقق أو الترحيل المحلي لأصل التصميم. لم تتغير أصول العرض السابقة.\n');
  process.exitCode = 1;
});
