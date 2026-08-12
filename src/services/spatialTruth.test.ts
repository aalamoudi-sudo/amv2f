import { describe, expect, it } from 'vitest';
import { kapFounderSpatialTruthPack } from '../data/kapSpatialTruth';
import type { SpatialTruthPackDraft } from '../types/spatialTruth';
import {
  createSpatialTruthRevision,
  diffSpatialTruthPacks,
  identifySpatialTruthPack,
  spatialTruthPackHash,
  spatialTruthPackHashSync,
  verifySpatialTruthPack,
  verifySpatialTruthPackSync
} from './spatialTruth';

function nextDraftContent(): Omit<SpatialTruthPackDraft, 'revision' | 'supersedes' | 'revisionMetadata'> {
  const {
    packId,
    contentHash,
    frozen,
    revision,
    supersedes,
    revisionMetadata,
    ...content
  } = structuredClone(kapFounderSpatialTruthPack);
  void packId;
  void contentHash;
  void frozen;
  void revision;
  void supersedes;
  void revisionMetadata;
  return content;
}

describe('Stage 3E.4C frozen spatial truth', () => {
  it('recomputes the deterministic canonical identity of revision 1', async () => {
    expect(await spatialTruthPackHash(kapFounderSpatialTruthPack)).toBe(
      'b63207f0b3f0d61a228c15b937fb72911cc546312e2ff19f0929797484ce56bf'
    );
    expect(await verifySpatialTruthPack(kapFounderSpatialTruthPack)).toBe(true);
    expect(spatialTruthPackHashSync(kapFounderSpatialTruthPack)).toBe(kapFounderSpatialTruthPack.contentHash);
    expect(verifySpatialTruthPackSync(kapFounderSpatialTruthPack)).toBe(true);
    expect(kapFounderSpatialTruthPack.packId).toBe(
      `SPATIAL-TRUTH-PACK-v1-${kapFounderSpatialTruthPack.contentHash}`
    );
  });

  it('rejects a runtime manifest whose decision content changed without a new identity', () => {
    const tampered = structuredClone(kapFounderSpatialTruthPack);
    tampered.semanticDecisions[0]!.primaryLabelAr = 'قيمة غير مصرح بها';
    expect(verifySpatialTruthPackSync(tampered)).toBe(false);
  });

  it('deep-freezes revision 1 and never exposes view-state fields in its contract', () => {
    expect(Object.isFrozen(kapFounderSpatialTruthPack)).toBe(true);
    expect(Object.isFrozen(kapFounderSpatialTruthPack.semanticDecisions)).toBe(true);
    expect(Object.isFrozen(kapFounderSpatialTruthPack.semanticDecisions[0])).toBe(true);
    expect(() => {
      (kapFounderSpatialTruthPack.semanticDecisions[0] as { primaryLabelAr: string }).primaryLabelAr = 'mutated';
    }).toThrow();
    expect(kapFounderSpatialTruthPack).not.toHaveProperty('zoom');
    expect(kapFounderSpatialTruthPack).not.toHaveProperty('pan');
    expect(kapFounderSpatialTruthPack).not.toHaveProperty('visibleLayers');
  });

  it('keeps semantic, spatial, engineering, and operational authority independent', () => {
    const walkway = kapFounderSpatialTruthPack.semanticDecisions.find((decision) => decision.targetId === 'ENTITY-KAP-OP-006')!;
    expect(walkway).toMatchObject({
      primaryLabelAr: 'ممر العصور',
      semanticStatus: 'founder-approved',
      spatialStatus: 'conflicted',
      engineeringStatus: 'unverified',
      operationalStatus: 'unavailable'
    });
    expect(walkway.legacyAliases).toEqual(expect.arrayContaining(['Tunnel', 'Ages Tunnel', 'نفق العصور']));
  });

  it('keeps the show unanchored and freezes 004, 005, and 011 as independent landmarks', () => {
    const show = kapFounderSpatialTruthPack.semanticDecisions.find((decision) => decision.targetId === 'ZONE-SHOW-001')!;
    expect(show).toMatchObject({
      semanticStatus: 'founder-approved',
      spatialStatus: 'unresolved',
      engineeringStatus: 'unverified',
      operationalStatus: 'unavailable',
      anchorReference: null
    });
    expect(kapFounderSpatialTruthPack.independentLandmarks.map((landmark) => landmark.candidateEntityId)).toEqual([
      'ENTITY-KAP-OP-004',
      'ENTITY-KAP-OP-005',
      'ENTITY-KAP-OP-011'
    ]);
  });

  it('creates revision 2 with a new hash, previous identity, reason, actor, evidence, and before/after diff', async () => {
    const content = nextDraftContent();
    content.semanticDecisions = content.semanticDecisions.map((decision) => decision.targetId === 'ENTITY-KAP-OP-001'
      ? { ...decision, notes: [...decision.notes, 'Future authorized clarification.'] }
      : decision);
    const revision = await createSpatialTruthRevision(kapFounderSpatialTruthPack, content, {
      changeReason: 'Authorized clarification test',
      actor: 'Ahmed',
      date: '2026-07-29',
      evidenceOrAuthorityReferences: ['FOUNDER-AUTHORIZATION-TEST']
    });
    expect(revision.revision).toBe(2);
    expect(revision.contentHash).not.toBe(kapFounderSpatialTruthPack.contentHash);
    expect(revision.supersedes).toBe(kapFounderSpatialTruthPack.packId);
    expect(revision.revisionMetadata).toMatchObject({
      previousHash: kapFounderSpatialTruthPack.contentHash,
      changeReason: 'Authorized clarification test',
      actor: 'Ahmed',
      date: '2026-07-29'
    });
    expect(revision.revisionMetadata?.beforeAfterDiff.some((change) => change.path.includes('semanticDecisions'))).toBe(true);
    expect(await verifySpatialTruthPack(revision)).toBe(true);
  });

  it('rejects no-op revisions and cross-project revision creation', async () => {
    await expect(createSpatialTruthRevision(kapFounderSpatialTruthPack, nextDraftContent(), {
      changeReason: 'No-op',
      actor: 'Ahmed',
      date: '2026-07-29',
      evidenceOrAuthorityReferences: ['TEST']
    })).rejects.toThrow('spatial-truth-revision-has-no-change');

    const foreign = nextDraftContent();
    foreign.projectId = 'PROJECT-FOREIGN-001';
    await expect(createSpatialTruthRevision(kapFounderSpatialTruthPack, foreign, {
      changeReason: 'Invalid scope',
      actor: 'Ahmed',
      date: '2026-07-29',
      evidenceOrAuthorityReferences: ['TEST']
    })).rejects.toThrow('spatial-truth-cross-project-revision');
  });

  it('produces the same identity from equivalent canonical content order', async () => {
    const draft = nextDraftContent();
    const first = await identifySpatialTruthPack({
      ...draft,
      revision: 1,
      supersedes: null,
      revisionMetadata: null
    });
    const second = await identifySpatialTruthPack(JSON.parse(JSON.stringify({
      revisionMetadata: null,
      supersedes: null,
      revision: 1,
      ...draft
    })) as SpatialTruthPackDraft);
    expect(first.contentHash).toBe(second.contentHash);
    expect(diffSpatialTruthPacks(first, second)).toEqual([]);
  });
});
