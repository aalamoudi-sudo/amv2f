import { describe, expect, it } from 'vitest';
import { kapSpatialCommandExperience } from '../data/spatialCommandExperiences';
import {
  cancelCandidateAnchorEditing,
  commitCandidateAnchorPreview,
  createBrowserCandidateAnchorRevisionRepository,
  createCandidateAnchorDraft,
  createCandidateAnchorEditingSession,
  freezeCandidateAnchorRevision,
  previewCandidateAnchor,
  redoCandidateAnchorEdit,
  restoreFrozenCandidateAnchor,
  undoCandidateAnchorEdit
} from './candidateAnchorAuthoring';
import { verifyCandidateAnchorRevision } from './spatialTruth';

const candidateLayer = kapSpatialCommandExperience.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!;
const sourceHash = candidateLayer.previewSha256!;

function session() {
  return createCandidateAnchorEditingSession({
    projectId: kapSpatialCommandExperience.projectId,
    eventId: kapSpatialCommandExperience.eventId,
    venueId: kapSpatialCommandExperience.venueId,
    truthPack: kapSpatialCommandExperience.spatialTruthPack,
    sourceLayerId: candidateLayer.sourceLayerId,
    sourceHash,
    entities: kapSpatialCommandExperience.candidateEntities
  });
}

function moveFirstAnchor() {
  const initial = session();
  const entityId = initial.workingAnchors[0]!.candidateEntityId;
  const preview = previewCandidateAnchor(initial, entityId, { x: .12, y: .18 });
  return {
    initial,
    entityId,
    moved: commitCandidateAnchorPreview(initial, preview)
  };
}

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const revisionScope = {
  projectId: kapSpatialCommandExperience.projectId,
  eventId: kapSpatialCommandExperience.eventId,
  venueId: kapSpatialCommandExperience.venueId,
  baseTruthPackId: kapSpatialCommandExperience.spatialTruthPack.packId,
  sourceLayerId: candidateLayer.sourceLayerId,
  sourceHash,
  candidateEntityIds: kapSpatialCommandExperience.candidateEntities.map((entity) => entity.candidateId)
};

describe('Stage 3E.4C controlled candidate anchor authoring', () => {
  it('creates a fingerprint-bound editing session with only the eleven existing visual anchors', () => {
    const editing = session();
    expect(editing.workingAnchors).toHaveLength(11);
    expect(editing.workingAnchors.every((anchor) => (
      anchor.sourceHash === sourceHash
      && anchor.sourceLayerId === candidateLayer.sourceLayerId
      && anchor.anchorStatus === 'candidate-visual-anchor'
    ))).toBe(true);
    expect(editing.workingAnchors.some((anchor) => anchor.candidateEntityId === 'ZONE-SHOW-001')).toBe(false);
  });

  it('drags an existing anchor, supports undo/redo, restores the frozen position, and cancels safely', () => {
    const { initial, entityId, moved } = moveFirstAnchor();
    expect(moved.dirty).toBe(true);
    expect(moved.undoStack).toHaveLength(1);
    const undone = undoCandidateAnchorEdit(moved);
    expect(undone.workingAnchors).toEqual(initial.workingAnchors);
    const redone = redoCandidateAnchorEdit(undone);
    expect(redone.workingAnchors).toEqual(moved.workingAnchors);
    const restored = restoreFrozenCandidateAnchor(redone, entityId);
    expect(restored.workingAnchors.find((anchor) => anchor.candidateEntityId === entityId)).toEqual(
      initial.frozenAnchors.find((anchor) => anchor.candidateEntityId === entityId)
    );
    expect(cancelCandidateAnchorEditing(moved)).toMatchObject({
      workingAnchors: initial.frozenAnchors,
      dirty: false,
      changeReason: ''
    });
  });

  it('requires a reason, creates a deterministic draft diff, and freezes only after explicit confirmation', async () => {
    const { moved, entityId } = moveFirstAnchor();
    const options = {
      expectedProjectId: kapSpatialCommandExperience.projectId,
      expectedSourceHash: sourceHash,
      actor: 'Ahmed',
      createdAt: '2026-07-28T12:00:00.000Z',
      previousAnchorRevisionId: null
    };
    await expect(createCandidateAnchorDraft(moved, options)).rejects.toThrow('candidate-anchor-change-reason-required');
    const withReason = { ...moved, changeReason: 'تحسين التطابق البصري مع العلامة المصدرية.' };
    const first = await createCandidateAnchorDraft(withReason, options);
    const second = await createCandidateAnchorDraft(withReason, options);
    expect(first.anchorRevisionId).toBe(second.anchorRevisionId);
    expect(first.beforeAfterDiff).toEqual([{
      path: `$.anchors.${entityId}`,
      before: expect.any(Object),
      after: { x: .12, y: .18 }
    }]);
    await expect(freezeCandidateAnchorRevision(first, false)).rejects.toThrow('candidate-anchor-freeze-confirmation-required');
    const frozen = await freezeCandidateAnchorRevision(first, true);
    expect(frozen).toMatchObject({ status: 'frozen-candidate', revision: 2 });
    expect(frozen.anchorRevisionId).not.toBe(first.anchorRevisionId);
    expect(verifyCandidateAnchorRevision(frozen)).toBe(true);
    expect(JSON.stringify(frozen)).not.toMatch(/readiness|baseline|engineering-approved|route/i);
  });

  it('quarantines malformed, tampered, or foreign persisted revisions before they become frozen state', async () => {
    const storage = new MemoryStorage();
    const repository = createBrowserCandidateAnchorRevisionRepository(storage);
    const { moved } = moveFirstAnchor();
    const draft = await createCandidateAnchorDraft({
      ...moved,
      changeReason: 'Verified local visual correction.'
    }, {
      expectedProjectId: kapSpatialCommandExperience.projectId,
      expectedSourceHash: sourceHash,
      actor: 'browser-local-review-operator',
      createdAt: '2026-07-28T12:00:00.000Z',
      previousAnchorRevisionId: null
    });
    const frozen = await freezeCandidateAnchorRevision(draft, true);
    await repository.save(frozen);
    expect(await repository.list(revisionScope)).toEqual([frozen]);

    storage.setItem(
      `mayadeen-candidate-anchor-revisions:v1:${kapSpatialCommandExperience.projectId}`,
      JSON.stringify([{ ...frozen, changeReason: 'tampered without a new hash' }])
    );
    expect(await repository.list(revisionScope)).toEqual([]);

    storage.setItem(
      `mayadeen-candidate-anchor-revisions:v1:${kapSpatialCommandExperience.projectId}`,
      JSON.stringify([{ ...frozen, projectId: 'PROJECT-FOREIGN-001' }])
    );
    expect(await repository.list(revisionScope)).toEqual([]);
  });

  it('blocks out-of-bounds anchors, unresolved targets, invalid source hashes, and cross-project saves', async () => {
    const editing = session();
    expect(() => previewCandidateAnchor(editing, editing.workingAnchors[0]!.candidateEntityId, { x: 1.1, y: .5 })).toThrow('candidate-anchor-out-of-bounds');
    expect(() => previewCandidateAnchor(editing, 'ZONE-SHOW-001', { x: .5, y: .5 })).toThrow('candidate-anchor-unresolved-target');
    const { moved } = moveFirstAnchor();
    const withReason = { ...moved, changeReason: 'Valid visual change reason.' };
    await expect(createCandidateAnchorDraft(withReason, {
      expectedProjectId: kapSpatialCommandExperience.projectId,
      expectedSourceHash: '0'.repeat(64),
      actor: 'Ahmed',
      createdAt: '2026-07-28T12:00:00.000Z',
      previousAnchorRevisionId: null
    })).rejects.toThrow('candidate-anchor-invalid-source-hash');
    await expect(createCandidateAnchorDraft(withReason, {
      expectedProjectId: 'PROJECT-FOREIGN-001',
      expectedSourceHash: sourceHash,
      actor: 'Ahmed',
      createdAt: '2026-07-28T12:00:00.000Z',
      previousAnchorRevisionId: null
    })).rejects.toThrow('candidate-anchor-cross-project-save');
  });

  it('rejects a foreign truth pack and a foreign frozen candidate revision', () => {
    const foreignTruth = {
      ...structuredClone(kapSpatialCommandExperience.spatialTruthPack),
      projectId: 'PROJECT-FOREIGN-001'
    };
    expect(() => createCandidateAnchorEditingSession({
      projectId: kapSpatialCommandExperience.projectId,
      eventId: kapSpatialCommandExperience.eventId,
      venueId: kapSpatialCommandExperience.venueId,
      truthPack: foreignTruth,
      sourceLayerId: candidateLayer.sourceLayerId,
      sourceHash,
      entities: kapSpatialCommandExperience.candidateEntities
    })).toThrow('candidate-anchor-cross-project-truth-pack');
  });
});
