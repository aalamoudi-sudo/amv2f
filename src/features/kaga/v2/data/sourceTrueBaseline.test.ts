import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  gardens,
  internalGardens,
  knowledgeConflicts,
  KNOWLEDGE_GUIDE_METADATA,
  namedExternalGardens,
  projectFactById,
} from '../../knowledge';
import { kagaV2Assets } from '../v2Assets';

const hashFile = (path: string) => new Promise<string>((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(path);
  input.on('error', reject);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('end', () => resolve(hash.digest('hex')));
});

describe('KAGA V2 source-true baseline', () => {
  it('pins the exact knowledge-guide identity', () => {
    expect(KNOWLEDGE_GUIDE_METADATA.pageCount).toBe(24);
    expect(KNOWLEDGE_GUIDE_METADATA.sha256).toBe(
      '213204327d095354c11ea02f14052b98bdcb319a5fec253f19a67c110a119738',
    );
  });

  it('records the named gardens and preserves the source count conflict', () => {
    expect(internalGardens).toHaveLength(7);
    expect(internalGardens.map((garden) => garden.titleAr)).toContain('حديقة الخيارات');
    expect(namedExternalGardens).toHaveLength(6);
    expect(projectFactById['external-garden-count']?.value).toBe(8);
    expect(knowledgeConflicts).toContainEqual(
      expect.objectContaining({ id: 'external-garden-naming-gap', status: 'unresolved' }),
    );
  });

  it('gives every named garden an area and traceable source', () => {
    expect(gardens.every((garden) => (garden.areaSqm ?? 0) > 0)).toBe(true);
    expect(gardens.every((garden) => garden.source.length > 0)).toBe(true);
    expect(gardens.every((garden) => garden.source.every((source) => source.sourcePages.length > 0))).toBe(true);
  });

  it('keeps every V2 source asset present and page-traceable', () => {
    for (const asset of Object.values(kagaV2Assets)) {
      expect(existsSync(join(process.cwd(), 'public', asset.path))).toBe(true);
      expect(asset.source.sourcePages.length).toBeGreaterThan(0);
      expect(asset.source.sourceConfidence).toBe('exact');
    }
  });

  it('keeps the accepted V1 client and developer archives byte-identical', async () => {
    const clientZip = join(process.cwd(), 'deliverables', 'KAGA-Executive-Presentation.zip');
    const developerZip = join(process.cwd(), 'deliverables', 'KAGA-Final-Developer-Archive.zip');
    expect(existsSync(clientZip)).toBe(true);
    expect(existsSync(developerZip)).toBe(true);
    await expect(hashFile(clientZip)).resolves.toBe(
      '5f7c3f3db76d7bbf841d1f1dc4b20914b736cc7437f47ab86b60f8f5eddaeac6',
    );
    await expect(hashFile(developerZip)).resolves.toBe(
      '7da8ba169fc9c94ab0501878970d4812743a731dffdc3cec71cc03dd3ee54151',
    );
  });
});
