import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';

export interface LocalSnapshotFingerprint {
  byteSize: number;
  sha256: string;
}

export interface LocalSnapshotExpectation {
  sourceAssetId: string;
  filePath: string;
  recordedByteSize: number;
  recordedSha256: string;
}

export interface VerifiedLocalSnapshot extends LocalSnapshotFingerprint {
  sourceAssetId: string;
  verifiedFromBytes: true;
}

export class LocalSnapshotVerificationError extends Error {
  readonly code: 'snapshot-changed-during-read' | 'snapshot-size-mismatch' | 'snapshot-hash-mismatch' | 'snapshot-duplicate-mismatch';

  constructor(code: LocalSnapshotVerificationError['code'], message: string) {
    super(message);
    this.name = 'LocalSnapshotVerificationError';
    this.code = code;
  }
}

export async function measureLocalSnapshot(filePath: string): Promise<LocalSnapshotFingerprint> {
  const handle = await open(filePath, 'r');
  try {
    const before = await handle.stat({ bigint: true });
    const hash = createHash('sha256');
    let byteSize = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteSize += bytes.length;
      hash.update(bytes);
    }
    const after = await handle.stat({ bigint: true });
    if (before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
      throw new LocalSnapshotVerificationError('snapshot-changed-during-read', 'The local source snapshot changed while its fingerprint was being measured.');
    }
    return { byteSize, sha256: hash.digest('hex') };
  } finally {
    await handle.close();
  }
}

export async function verifyLocalSnapshot(expectation: LocalSnapshotExpectation): Promise<VerifiedLocalSnapshot> {
  const measured = await measureLocalSnapshot(expectation.filePath);
  if (measured.byteSize !== expectation.recordedByteSize) {
    throw new LocalSnapshotVerificationError('snapshot-size-mismatch', `Byte-size mismatch for ${expectation.sourceAssetId}.`);
  }
  if (measured.sha256 !== expectation.recordedSha256) {
    throw new LocalSnapshotVerificationError('snapshot-hash-mismatch', `SHA-256 mismatch for ${expectation.sourceAssetId}.`);
  }
  return { sourceAssetId: expectation.sourceAssetId, ...measured, verifiedFromBytes: true };
}

export function verifyMeasuredDuplicate(
  incoming: VerifiedLocalSnapshot,
  canonical: { sourceAssetId: string; byteSize: number; sha256: string }
): { duplicateOfSourceAssetId: string; duplicateConfirmed: true; contentRevisionCreated: false } {
  if (incoming.byteSize !== canonical.byteSize || incoming.sha256 !== canonical.sha256) {
    throw new LocalSnapshotVerificationError('snapshot-duplicate-mismatch', 'Incoming bytes do not match the registered canonical source fingerprint.');
  }
  return {
    duplicateOfSourceAssetId: canonical.sourceAssetId,
    duplicateConfirmed: true,
    contentRevisionCreated: false
  };
}
