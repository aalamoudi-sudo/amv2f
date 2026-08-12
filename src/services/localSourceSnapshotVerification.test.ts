import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  verifyLocalSnapshot,
  verifyMeasuredDuplicate
} from '../../scripts/lib/sourceSnapshotVerification';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createSnapshot(bytes: Buffer): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mayadeen-source-snapshot-'));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, 'source.bin');
  await writeFile(filePath, bytes);
  return filePath;
}

describe('local source snapshot byte verification', () => {
  it('measures the actual bytes before accepting a recorded fingerprint', async () => {
    const bytes = Buffer.from('reviewed-source-bytes');
    const filePath = await createSnapshot(bytes);
    await expect(verifyLocalSnapshot({
      sourceAssetId: 'SOURCE-TEST-001',
      filePath,
      recordedByteSize: bytes.length,
      recordedSha256: createHash('sha256').update(bytes).digest('hex')
    })).resolves.toMatchObject({ verifiedFromBytes: true, byteSize: bytes.length });
  });

  it('rejects a file modified after its manifest fingerprint was prepared', async () => {
    const original = Buffer.from('original-source');
    const filePath = await createSnapshot(original);
    const expectation = {
      sourceAssetId: 'SOURCE-TEST-002',
      filePath,
      recordedByteSize: original.length,
      recordedSha256: createHash('sha256').update(original).digest('hex')
    };
    await writeFile(filePath, Buffer.from('modified-source'));
    await expect(verifyLocalSnapshot(expectation)).rejects.toMatchObject({ code: 'snapshot-hash-mismatch' });
  });

  it('confirms duplicate content only after the incoming bytes are measured', async () => {
    const bytes = Buffer.from('canonical-source');
    const filePath = await createSnapshot(bytes);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const measured = await verifyLocalSnapshot({
      sourceAssetId: 'SOURCE-INCOMING-001',
      filePath,
      recordedByteSize: bytes.length,
      recordedSha256: sha256
    });
    expect(verifyMeasuredDuplicate(measured, {
      sourceAssetId: 'SOURCE-CANONICAL-001',
      byteSize: bytes.length,
      sha256
    })).toEqual({
      duplicateOfSourceAssetId: 'SOURCE-CANONICAL-001',
      duplicateConfirmed: true,
      contentRevisionCreated: false
    });
    expect(() => verifyMeasuredDuplicate(measured, {
      sourceAssetId: 'SOURCE-CANONICAL-002',
      byteSize: bytes.length,
      sha256: '0'.repeat(64)
    })).toThrowError(/do not match/);
  });
});
