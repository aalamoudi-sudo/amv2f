import { sha256PayloadSync } from './integrationHash';
import { validateReadinessOperationalPack } from './readinessDerivationV2';
import type {
  ReadinessAuthoringState,
  ReadinessOperationalPack,
  ReadinessPackDiffEntry,
  ReadinessPackRevision
} from '../types/readinessIntelligence';

type PackWithoutHash = Omit<ReadinessOperationalPack, 'contentHash'>;

export function canonicalReadinessOperationalPackContent(
  pack: ReadinessOperationalPack | PackWithoutHash
): PackWithoutHash {
  const { contentHash, ...canonical } = pack as ReadinessOperationalPack;
  void contentHash;
  return structuredClone(canonical);
}

export function hashReadinessOperationalPack(pack: ReadinessOperationalPack | PackWithoutHash): string {
  return sha256PayloadSync(canonicalReadinessOperationalPackContent(pack));
}

export function freezeReadinessOperationalPack(pack: PackWithoutHash): ReadinessOperationalPack {
  const canonical = canonicalReadinessOperationalPackContent(pack);
  return {
    ...canonical,
    contentHash: hashReadinessOperationalPack(canonical)
  };
}

export function verifyReadinessOperationalPackHash(pack: ReadinessOperationalPack): boolean {
  return /^[a-f0-9]{64}$/.test(pack.contentHash)
    && hashReadinessOperationalPack(pack) === pack.contentHash;
}

function collectDiff(
  before: unknown,
  after: unknown,
  path = '$',
  entries: ReadinessPackDiffEntry[] = []
): ReadinessPackDiffEntry[] {
  if (Object.is(before, after)) return entries;
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) {
      entries.push({ path, before: structuredClone(before), after: structuredClone(after) });
      return entries;
    }
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      collectDiff(before[index], after[index], `${path}[${index}]`, entries);
    }
    return entries;
  }
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    const beforeRecord = before as Record<string, unknown>;
    const afterRecord = after as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])].sort();
    keys.forEach((key) => collectDiff(beforeRecord[key], afterRecord[key], `${path}.${key}`, entries));
    return entries;
  }
  entries.push({ path, before: structuredClone(before), after: structuredClone(after) });
  return entries;
}

export function createReadinessAuthoringState(
  projectId: string,
  initialPack?: ReadinessOperationalPack
): ReadinessAuthoringState {
  if (!initialPack) {
    return {
      projectId,
      activeRevisionId: null,
      revisions: [],
      quarantinedRevisionIds: []
    };
  }
  if (initialPack.projectId !== projectId || !verifyReadinessOperationalPackHash(initialPack)) {
    throw new Error('READINESS_AUTHORING_INITIAL_PACK_INVALID');
  }
  const revisionId = `${initialPack.packId}:r${initialPack.revision}:${initialPack.contentHash}`;
  return {
    projectId,
    activeRevisionId: revisionId,
    revisions: [{
      revisionId,
      packId: initialPack.packId,
      revision: initialPack.revision,
      status: 'active',
      previousContentHash: null,
      contentHash: initialPack.contentHash,
      changeReason: 'initial-authoring-state',
      actorRef: 'SYSTEM-LOCAL-AUTHORING',
      createdAt: initialPack.effectiveAt,
      diff: [],
      pack: structuredClone(initialPack)
    }],
    quarantinedRevisionIds: []
  };
}

export function previewReadinessPackRevision(input: {
  state: ReadinessAuthoringState;
  nextPack: ReadinessOperationalPack;
  changeReason: string;
  actorRef: string;
  createdAt: string;
}): { state: ReadinessAuthoringState; revision: ReadinessPackRevision } {
  if (!input.changeReason.trim()) throw new Error('READINESS_CHANGE_REASON_REQUIRED');
  if (!input.actorRef.trim()) throw new Error('READINESS_ACTOR_REQUIRED');
  if (input.nextPack.projectId !== input.state.projectId) {
    throw new Error('READINESS_CROSS_PROJECT_DRAFT_REJECTED');
  }
  const active = input.state.revisions.find((revision) => revision.revisionId === input.state.activeRevisionId) ?? null;
  if (active && input.nextPack.packId !== active.packId) throw new Error('READINESS_PACK_ID_IMMUTABLE');
  if (active && input.nextPack.revision !== active.revision + 1) throw new Error('READINESS_REVISION_SEQUENCE_INVALID');

  const expectedHash = hashReadinessOperationalPack(input.nextPack);
  if (expectedHash !== input.nextPack.contentHash) throw new Error('READINESS_PACK_HASH_INVALID');
  const validation = validateReadinessOperationalPack(input.nextPack);
  const revisionId = `${input.nextPack.packId}:r${input.nextPack.revision}:${input.nextPack.contentHash}`;
  const revision: ReadinessPackRevision = {
    revisionId,
    packId: input.nextPack.packId,
    revision: input.nextPack.revision,
    status: validation.valid ? 'draft' : 'quarantined',
    previousContentHash: active?.contentHash ?? null,
    contentHash: input.nextPack.contentHash,
    changeReason: input.changeReason.trim(),
    actorRef: input.actorRef,
    createdAt: input.createdAt,
    diff: collectDiff(active?.pack ?? null, input.nextPack),
    pack: structuredClone(input.nextPack)
  };
  return {
    revision,
    state: {
      ...structuredClone(input.state),
      revisions: [...input.state.revisions.map((entry) => structuredClone(entry)), revision],
      quarantinedRevisionIds: validation.valid
        ? [...input.state.quarantinedRevisionIds]
        : [...input.state.quarantinedRevisionIds, revisionId]
    }
  };
}

export function activateReadinessPackRevision(
  state: ReadinessAuthoringState,
  revisionId: string
): ReadinessAuthoringState {
  const target = state.revisions.find((revision) => revision.revisionId === revisionId);
  if (!target || target.status !== 'draft') throw new Error('READINESS_DRAFT_NOT_ACTIVATABLE');
  const active = state.revisions.find((revision) => revision.revisionId === state.activeRevisionId) ?? null;
  if (active?.pack.status === 'baseline') throw new Error('READINESS_BASELINE_PROTECTED');
  if (target.pack.projectId !== state.projectId) throw new Error('READINESS_CROSS_PROJECT_ACTIVATION_REJECTED');
  if (
    target.pack.stateContext === 'baseline'
    && active
    && active.pack.stateContext !== 'baseline'
  ) {
    throw new Error('READINESS_CONTEXT_PROMOTION_REJECTED');
  }
  if (
    target.pack.status === 'baseline'
    && active
  ) {
    throw new Error('READINESS_BASELINE_PROMOTION_REQUIRES_EXTERNAL_AUTHORITY');
  }
  return {
    ...structuredClone(state),
    activeRevisionId: revisionId,
    revisions: state.revisions.map((revision) => ({
      ...structuredClone(revision),
      status: revision.revisionId === revisionId
        ? 'active'
        : revision.status === 'active'
          ? 'rolled-back'
          : revision.status
    }))
  };
}

export function rollbackReadinessPackRevision(
  state: ReadinessAuthoringState,
  revisionId: string
): ReadinessAuthoringState {
  const target = state.revisions.find((revision) => revision.revisionId === revisionId);
  if (!target || target.status === 'quarantined') throw new Error('READINESS_ROLLBACK_TARGET_INVALID');
  if (target.pack.projectId !== state.projectId) throw new Error('READINESS_CROSS_PROJECT_ROLLBACK_REJECTED');
  return {
    ...structuredClone(state),
    activeRevisionId: revisionId,
    revisions: state.revisions.map((revision) => ({
      ...structuredClone(revision),
      status: revision.revisionId === revisionId
        ? 'active'
        : revision.status === 'active'
          ? 'rolled-back'
          : revision.status
    }))
  };
}

export function getActiveReadinessPack(state: ReadinessAuthoringState): ReadinessOperationalPack | null {
  const active = state.revisions.find((revision) => revision.revisionId === state.activeRevisionId);
  return active ? structuredClone(active.pack) : null;
}

export function resetReadinessAuthoringState(initial: ReadinessAuthoringState): ReadinessAuthoringState {
  return structuredClone(initial);
}
