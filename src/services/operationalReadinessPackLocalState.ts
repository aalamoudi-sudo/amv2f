import {
  immutableOperationalReadinessClone
} from './operationalReadinessPack';
import {
  isOperationalReadinessRevisionTrusted
} from './operationalReadinessTrustGateway';
import type {
  OperationalReadinessAuthoringState,
  OperationalReadinessPack,
  OperationalReadinessPackRevision
} from '../types/operationalReadinessPack';
import type {
  OperationalReadinessTrustSession
} from '../types/operationalReadinessTrust';

function storageKey(pack: Pick<OperationalReadinessPack, 'projectId' | 'id'>): string {
  return `mayadeen:operational-readiness-authoring:${pack.projectId}:${pack.id}`;
}

function authoringRevisionIsTrusted(
  revision: OperationalReadinessPackRevision,
  trustedRoot: OperationalReadinessPack,
  trustSession: OperationalReadinessTrustSession
): boolean {
  return revision.pack.projectId === trustedRoot.projectId
    && revision.pack.id === trustedRoot.id
    && revision.pack.stateContext !== 'baseline'
    && revision.pack.packStatus !== 'activated-baseline'
    && isOperationalReadinessRevisionTrusted(trustSession, revision.pack);
}

function authoringStateIsTrusted(
  state: OperationalReadinessAuthoringState,
  trustedRoot: OperationalReadinessPack,
  trustSession: OperationalReadinessTrustSession
): boolean {
  return state.revisions.every((revision) =>
    authoringRevisionIsTrusted(revision, trustedRoot, trustSession)
  );
}

export function readOperationalReadinessAuthoringState(
  storage: Pick<Storage, 'getItem'>,
  pack: OperationalReadinessPack,
  fallback: OperationalReadinessAuthoringState,
  trustSession: OperationalReadinessTrustSession
): OperationalReadinessAuthoringState {
  const serialized = storage.getItem(storageKey(pack));
  if (!serialized) return immutableOperationalReadinessClone(fallback);
  try {
    const candidate = JSON.parse(serialized) as OperationalReadinessAuthoringState;
    if (
      candidate.projectId !== pack.projectId
      || candidate.initialRevisionId !== fallback.initialRevisionId
      || !candidate.revisions.some((revision) => revision.revisionId === candidate.activeRevisionId)
      || !authoringStateIsTrusted(candidate, pack, trustSession)
    ) {
      return immutableOperationalReadinessClone(fallback);
    }
    return immutableOperationalReadinessClone(candidate);
  } catch {
    return immutableOperationalReadinessClone(fallback);
  }
}

export function writeOperationalReadinessAuthoringState(
  storage: Pick<Storage, 'setItem'>,
  pack: OperationalReadinessPack,
  state: OperationalReadinessAuthoringState,
  trustSession: OperationalReadinessTrustSession
): void {
  if (state.projectId !== pack.projectId) {
    throw new Error('OPERATIONAL_PACK_LOCAL_STATE_CROSS_PROJECT_REJECTED');
  }
  const trustedRevisions = state.revisions.filter((revision) =>
    authoringRevisionIsTrusted(revision, pack, trustSession)
  );
  const activeRevisionId = trustedRevisions.some(
    (revision) => revision.revisionId === state.activeRevisionId
  )
    ? state.activeRevisionId
    : trustedRevisions.at(-1)?.revisionId ?? state.initialRevisionId;
  const persisted = immutableOperationalReadinessClone({
    ...state,
    activeRevisionId,
    revisions: trustedRevisions,
    quarantinedRevisionIds: state.quarantinedRevisionIds.filter((revisionId) =>
      trustedRevisions.some((revision) => revision.revisionId === revisionId)
    )
  });
  if (!authoringStateIsTrusted(persisted, pack, trustSession)) {
    throw new Error('OPERATIONAL_PACK_LOCAL_STATE_UNTRUSTED');
  }
  storage.setItem(storageKey(pack), JSON.stringify(persisted));
}

export function clearOperationalReadinessAuthoringState(
  storage: Pick<Storage, 'removeItem'>,
  pack: OperationalReadinessPack
): void {
  storage.removeItem(storageKey(pack));
}
