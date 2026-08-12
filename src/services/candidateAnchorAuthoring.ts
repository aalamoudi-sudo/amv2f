import type { CandidateSpatialEntity } from '../types/sourceIntake';
import type {
  CandidateAnchorEditingSession,
  CandidateAnchorRevision,
  CandidateVisualAnchor,
  SpatialTruthPack
} from '../types/spatialTruth';
import {
  canonicalCandidateAnchorRevisionContent,
  identifyCandidateAnchorRevision,
  normalizedAnchorIsValid,
  verifyCandidateAnchorRevision
} from './spatialTruth';

export const candidateAnchorRevisionStoragePrefix = 'mayadeen-candidate-anchor-revisions:v1:';

function cloneAnchors(anchors: readonly CandidateVisualAnchor[]): CandidateVisualAnchor[] {
  return anchors.map((anchor) => ({ ...anchor }));
}

function anchorSnapshotsEqual(left: readonly CandidateVisualAnchor[], right: readonly CandidateVisualAnchor[]): boolean {
  return left.length === right.length && left.every((anchor, index) => {
    const candidate = right[index];
    return candidate?.candidateEntityId === anchor.candidateEntityId
      && candidate.x === anchor.x
      && candidate.y === anchor.y
      && candidate.sourceHash === anchor.sourceHash
      && candidate.sourceLayerId === anchor.sourceLayerId;
  });
}

export function createCandidateAnchorEditingSession(options: {
  projectId: string;
  eventId: string;
  venueId: string;
  truthPack: SpatialTruthPack;
  sourceLayerId: string;
  sourceHash: string;
  entities: readonly CandidateSpatialEntity[];
  frozenRevision?: CandidateAnchorRevision | null;
}): CandidateAnchorEditingSession {
  if (options.truthPack.projectId !== options.projectId
    || options.truthPack.eventId !== options.eventId
    || options.truthPack.venueId !== options.venueId) {
    throw new Error('candidate-anchor-cross-project-truth-pack');
  }
  if (!options.sourceHash || !options.sourceLayerId) throw new Error('candidate-anchor-source-identity-missing');
  if (options.frozenRevision && (!verifyCandidateAnchorRevision(options.frozenRevision)
    || options.frozenRevision.projectId !== options.projectId
    || options.frozenRevision.eventId !== options.eventId
    || options.frozenRevision.venueId !== options.venueId
    || options.frozenRevision.baseTruthPackId !== options.truthPack.packId
    || options.frozenRevision.sourceLayerId !== options.sourceLayerId
    || options.frozenRevision.sourceHash !== options.sourceHash
    || options.frozenRevision.status !== 'frozen-candidate'
    || options.frozenRevision.anchors.length !== options.entities.filter((entity) => entity.normalizedAnchor).length
    || options.frozenRevision.anchors.some((anchor) => (
      !options.entities.some((entity) => entity.candidateId === anchor.candidateEntityId && entity.normalizedAnchor)
    )))) {
    throw new Error('candidate-anchor-cross-project-revision');
  }
  const manifestAnchors: CandidateVisualAnchor[] = options.entities.flatMap((entity) => entity.normalizedAnchor ? [{
    candidateEntityId: entity.candidateId,
    x: entity.normalizedAnchor.x,
    y: entity.normalizedAnchor.y,
    sourceLayerId: options.sourceLayerId,
    sourceHash: options.sourceHash,
    anchorStatus: 'candidate-visual-anchor' as const,
    revision: 1
  }] : []);
  const frozenAnchors = options.frozenRevision?.anchors.length
    ? cloneAnchors(options.frozenRevision.anchors)
    : manifestAnchors;
  return {
    projectId: options.projectId,
    eventId: options.eventId,
    venueId: options.venueId,
    baseTruthPackId: options.truthPack.packId,
    sourceLayerId: options.sourceLayerId,
    sourceHash: options.sourceHash,
    frozenRevision: options.frozenRevision?.revision ?? 1,
    frozenAnchors: cloneAnchors(frozenAnchors),
    workingAnchors: cloneAnchors(frozenAnchors),
    undoStack: [],
    redoStack: [],
    changeReason: '',
    dirty: false
  };
}

export function previewCandidateAnchor(
  session: CandidateAnchorEditingSession,
  candidateEntityId: string,
  position: { x: number; y: number }
): CandidateAnchorEditingSession {
  if (!normalizedAnchorIsValid(position)) throw new Error('candidate-anchor-out-of-bounds');
  const existing = session.workingAnchors.find((anchor) => anchor.candidateEntityId === candidateEntityId);
  if (!existing) throw new Error('candidate-anchor-unresolved-target');
  return {
    ...session,
    workingAnchors: session.workingAnchors.map((anchor) => anchor.candidateEntityId === candidateEntityId
      ? { ...anchor, ...position, revision: session.frozenRevision + 1 }
      : { ...anchor }),
    dirty: true
  };
}

export function commitCandidateAnchorPreview(
  beforePreview: CandidateAnchorEditingSession,
  afterPreview: CandidateAnchorEditingSession
): CandidateAnchorEditingSession {
  if (beforePreview.projectId !== afterPreview.projectId
    || beforePreview.sourceHash !== afterPreview.sourceHash) {
    throw new Error('candidate-anchor-preview-scope-mismatch');
  }
  if (anchorSnapshotsEqual(beforePreview.workingAnchors, afterPreview.workingAnchors)) return beforePreview;
  return {
    ...afterPreview,
    undoStack: [...beforePreview.undoStack, cloneAnchors(beforePreview.workingAnchors)],
    redoStack: [],
    dirty: !anchorSnapshotsEqual(afterPreview.workingAnchors, afterPreview.frozenAnchors)
  };
}

export function undoCandidateAnchorEdit(session: CandidateAnchorEditingSession): CandidateAnchorEditingSession {
  const previous = session.undoStack.at(-1);
  if (!previous) return session;
  return {
    ...session,
    workingAnchors: cloneAnchors(previous),
    undoStack: session.undoStack.slice(0, -1),
    redoStack: [...session.redoStack, cloneAnchors(session.workingAnchors)],
    dirty: !anchorSnapshotsEqual(previous, session.frozenAnchors)
  };
}

export function redoCandidateAnchorEdit(session: CandidateAnchorEditingSession): CandidateAnchorEditingSession {
  const next = session.redoStack.at(-1);
  if (!next) return session;
  return {
    ...session,
    workingAnchors: cloneAnchors(next),
    undoStack: [...session.undoStack, cloneAnchors(session.workingAnchors)],
    redoStack: session.redoStack.slice(0, -1),
    dirty: !anchorSnapshotsEqual(next, session.frozenAnchors)
  };
}

export function cancelCandidateAnchorEditing(session: CandidateAnchorEditingSession): CandidateAnchorEditingSession {
  return {
    ...session,
    workingAnchors: cloneAnchors(session.frozenAnchors),
    undoStack: [],
    redoStack: [],
    changeReason: '',
    dirty: false
  };
}

export function restoreFrozenCandidateAnchor(
  session: CandidateAnchorEditingSession,
  candidateEntityId: string
): CandidateAnchorEditingSession {
  const frozen = session.frozenAnchors.find((anchor) => anchor.candidateEntityId === candidateEntityId);
  if (!frozen) throw new Error('candidate-anchor-unresolved-target');
  const preview = {
    ...session,
    workingAnchors: session.workingAnchors.map((anchor) => anchor.candidateEntityId === candidateEntityId ? { ...frozen } : { ...anchor })
  };
  return commitCandidateAnchorPreview(session, preview);
}

function anchorDiff(
  before: readonly CandidateVisualAnchor[],
  after: readonly CandidateVisualAnchor[]
) {
  return after.flatMap((anchor) => {
    const previous = before.find((candidate) => candidate.candidateEntityId === anchor.candidateEntityId);
    if (!previous || (previous.x === anchor.x && previous.y === anchor.y)) return [];
    return [{
      path: `$.anchors.${anchor.candidateEntityId}`,
      before: previous ? { x: previous.x, y: previous.y } : null,
      after: { x: anchor.x, y: anchor.y }
    }];
  });
}

export async function createCandidateAnchorDraft(
  session: CandidateAnchorEditingSession,
  options: {
    expectedProjectId: string;
    expectedSourceHash: string;
    actor: string;
    createdAt: string;
    previousAnchorRevisionId: string | null;
  }
): Promise<CandidateAnchorRevision> {
  if (session.projectId !== options.expectedProjectId) throw new Error('candidate-anchor-cross-project-save');
  if (session.sourceHash !== options.expectedSourceHash) throw new Error('candidate-anchor-invalid-source-hash');
  if (!session.changeReason.trim()) throw new Error('candidate-anchor-change-reason-required');
  if (!session.dirty) throw new Error('candidate-anchor-draft-has-no-change');
  if (session.workingAnchors.some((anchor) => !normalizedAnchorIsValid(anchor)
    || anchor.sourceHash !== session.sourceHash
    || anchor.sourceLayerId !== session.sourceLayerId)) {
    throw new Error('candidate-anchor-draft-invalid');
  }
  return identifyCandidateAnchorRevision({
    projectId: session.projectId,
    eventId: session.eventId,
    venueId: session.venueId,
    baseTruthPackId: session.baseTruthPackId,
    revision: session.frozenRevision + 1,
    status: 'draft',
    sourceLayerId: session.sourceLayerId,
    sourceHash: session.sourceHash,
    anchors: cloneAnchors(session.workingAnchors).map((anchor) => ({
      ...anchor,
      revision: session.frozenRevision + 1
    })),
    changeReason: session.changeReason.trim(),
    actor: options.actor,
    createdAt: options.createdAt,
    previousAnchorRevisionId: options.previousAnchorRevisionId,
    beforeAfterDiff: anchorDiff(session.frozenAnchors, session.workingAnchors)
  });
}

export async function freezeCandidateAnchorRevision(
  draft: CandidateAnchorRevision,
  explicitConfirmation: boolean
): Promise<CandidateAnchorRevision> {
  if (!explicitConfirmation) throw new Error('candidate-anchor-freeze-confirmation-required');
  if (draft.status !== 'draft' || draft.revision <= 1 || draft.beforeAfterDiff.length === 0) {
    throw new Error('candidate-anchor-freeze-invalid-draft');
  }
  const canonicalDraft = canonicalCandidateAnchorRevisionContent(draft);
  return identifyCandidateAnchorRevision({
    ...canonicalDraft,
    status: 'frozen-candidate'
  });
}

export interface CandidateAnchorRevisionScope {
  projectId: string;
  eventId: string;
  venueId: string;
  baseTruthPackId: string;
  sourceLayerId: string;
  sourceHash: string;
  candidateEntityIds: readonly string[];
}

function revisionMatchesScope(
  revision: CandidateAnchorRevision,
  scope: CandidateAnchorRevisionScope
): boolean {
  const expectedCandidateIds = new Set(scope.candidateEntityIds);
  return verifyCandidateAnchorRevision(revision)
    && revision.projectId === scope.projectId
    && revision.eventId === scope.eventId
    && revision.venueId === scope.venueId
    && revision.baseTruthPackId === scope.baseTruthPackId
    && revision.sourceLayerId === scope.sourceLayerId
    && revision.sourceHash === scope.sourceHash
    && revision.anchors.length === expectedCandidateIds.size
    && revision.anchors.every((anchor) => expectedCandidateIds.has(anchor.candidateEntityId));
}

export interface CandidateAnchorRevisionRepository {
  list(scope: CandidateAnchorRevisionScope): Promise<CandidateAnchorRevision[]>;
  save(revision: CandidateAnchorRevision): Promise<void>;
  clearDrafts(scope: CandidateAnchorRevisionScope): Promise<void>;
}

export function createBrowserCandidateAnchorRevisionRepository(
  storage: Pick<Storage, 'getItem' | 'setItem'>
): CandidateAnchorRevisionRepository {
  return {
    list(scope) {
      try {
        const raw = storage.getItem(`${candidateAnchorRevisionStoragePrefix}${scope.projectId}`);
        const parsed: unknown = raw ? JSON.parse(raw) as unknown : [];
        if (!Array.isArray(parsed)) return Promise.resolve([]);
        return Promise.resolve(parsed
          .filter((candidate): candidate is CandidateAnchorRevision => (
            revisionMatchesScope(candidate as CandidateAnchorRevision, scope)
          ))
          .sort((left, right) => right.revision - left.revision));
      } catch {
        return Promise.resolve([]);
      }
    },
    async save(revision) {
      if (!verifyCandidateAnchorRevision(revision)) {
        throw new Error('candidate-anchor-revision-integrity-invalid');
      }
      const key = `${candidateAnchorRevisionStoragePrefix}${revision.projectId}`;
      const current = await this.list({
        projectId: revision.projectId,
        eventId: revision.eventId,
        venueId: revision.venueId,
        baseTruthPackId: revision.baseTruthPackId,
        sourceLayerId: revision.sourceLayerId,
        sourceHash: revision.sourceHash,
        candidateEntityIds: revision.anchors.map((anchor) => anchor.candidateEntityId)
      });
      const next = [revision, ...current.filter((candidate) => candidate.anchorRevisionId !== revision.anchorRevisionId)]
        .sort((left, right) => right.revision - left.revision)
        .slice(0, 12);
      storage.setItem(key, JSON.stringify(next));
    },
    async clearDrafts(scope) {
      const key = `${candidateAnchorRevisionStoragePrefix}${scope.projectId}`;
      const frozen = (await this.list(scope)).filter((revision) => revision.status === 'frozen-candidate');
      storage.setItem(key, JSON.stringify(frozen));
    }
  };
}
