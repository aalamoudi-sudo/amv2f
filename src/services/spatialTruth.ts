import {
  isSha256,
  sha256Payload,
  sha256PayloadSync,
  stableSerialize
} from './integrationHash';
import type {
  CandidateAnchorRevision,
  CandidateVisualAnchor,
  SpatialTruthChange,
  SpatialTruthPack,
  SpatialTruthPackDraft,
  SpatialTruthRevisionMetadata
} from '../types/spatialTruth';

const packIdPattern = /^SPATIAL-TRUTH-PACK-v1-([a-f0-9]{64})$/;

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function deepFreezeSpatialValue<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((child) => deepFreezeSpatialValue(child));
  return Object.freeze(value);
}

export function canonicalSpatialTruthPackContent(
  pack: Pick<SpatialTruthPack, keyof SpatialTruthPack>
): Omit<SpatialTruthPack, 'packId' | 'contentHash'> {
  const {
    packId,
    contentHash,
    ...canonical
  } = cloneValue(pack);
  void packId;
  void contentHash;
  return canonical;
}

export async function spatialTruthPackHash(pack: SpatialTruthPack): Promise<string> {
  return sha256Payload(canonicalSpatialTruthPackContent(pack));
}

export function spatialTruthPackHashSync(pack: SpatialTruthPack): string {
  return sha256PayloadSync(canonicalSpatialTruthPackContent(pack));
}

export async function identifySpatialTruthPack(
  draft: SpatialTruthPackDraft
): Promise<SpatialTruthPack> {
  const candidate = {
    ...cloneValue(draft),
    packId: '',
    frozen: true as const,
    contentHash: ''
  };
  const contentHash = await spatialTruthPackHash(candidate);
  return deepFreezeSpatialValue({
    ...candidate,
    packId: `SPATIAL-TRUTH-PACK-v1-${contentHash}`,
    contentHash
  });
}

export async function verifySpatialTruthPack(pack: SpatialTruthPack): Promise<boolean> {
  const match = pack.packId.match(packIdPattern);
  if (!match || match[1] !== pack.contentHash || !isSha256(pack.contentHash)) return false;
  if (!pack.frozen || pack.revision < 1) return false;
  if (pack.revision === 1 && (pack.supersedes !== null || pack.revisionMetadata !== null)) return false;
  if (pack.revision > 1 && (!pack.supersedes || !pack.revisionMetadata)) return false;
  return await spatialTruthPackHash(pack) === pack.contentHash;
}

export function verifySpatialTruthPackSync(pack: SpatialTruthPack): boolean {
  const match = pack.packId.match(packIdPattern);
  if (!match || match[1] !== pack.contentHash || !isSha256(pack.contentHash)) return false;
  if (!pack.frozen || pack.revision < 1) return false;
  if (pack.revision === 1 && (pack.supersedes !== null || pack.revisionMetadata !== null)) return false;
  if (pack.revision > 1 && (!pack.supersedes || !pack.revisionMetadata)) return false;
  return spatialTruthPackHashSync(pack) === pack.contentHash;
}

function collectDiffs(before: unknown, after: unknown, path: string, changes: SpatialTruthChange[]): void {
  if (stableSerialize(before) === stableSerialize(after)) return;
  const beforeRecord = before && typeof before === 'object' && !Array.isArray(before)
    ? before as Record<string, unknown>
    : null;
  const afterRecord = after && typeof after === 'object' && !Array.isArray(after)
    ? after as Record<string, unknown>
    : null;
  if (beforeRecord && afterRecord) {
    const keys = [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])].sort();
    keys.forEach((key) => collectDiffs(beforeRecord[key], afterRecord[key], `${path}.${key}`, changes));
    return;
  }
  changes.push({ path, before: cloneValue(before), after: cloneValue(after) });
}

export function diffSpatialTruthPacks(
  before: SpatialTruthPack,
  after: SpatialTruthPackDraft | SpatialTruthPack
): SpatialTruthChange[] {
  const beforeCanonical = canonicalSpatialTruthPackContent(before);
  const afterCandidate = 'packId' in after
    ? canonicalSpatialTruthPackContent(after)
    : { ...cloneValue(after), frozen: true as const };
  const changes: SpatialTruthChange[] = [];
  collectDiffs(beforeCanonical, afterCandidate, '$', changes);
  return changes.filter((change) => ![
    '$.revision',
    '$.supersedes',
    '$.revisionMetadata'
  ].includes(change.path));
}

export async function createSpatialTruthRevision(
  previous: SpatialTruthPack,
  nextContent: Omit<SpatialTruthPackDraft, 'revision' | 'supersedes' | 'revisionMetadata'>,
  metadata: Omit<SpatialTruthRevisionMetadata, 'previousHash' | 'beforeAfterDiff'>
): Promise<SpatialTruthPack> {
  if (!(await verifySpatialTruthPack(previous))) {
    throw new Error('spatial-truth-previous-pack-invalid');
  }
  if (!metadata.changeReason.trim() || !metadata.actor.trim() || !metadata.date.trim()
    || metadata.evidenceOrAuthorityReferences.length === 0) {
    throw new Error('spatial-truth-revision-metadata-missing');
  }
  if (nextContent.projectId !== previous.projectId
    || nextContent.eventId !== previous.eventId
    || nextContent.venueId !== previous.venueId) {
    throw new Error('spatial-truth-cross-project-revision');
  }
  const draftWithoutDiff: SpatialTruthPackDraft = {
    ...cloneValue(nextContent),
    revision: previous.revision + 1,
    supersedes: previous.packId,
    revisionMetadata: {
      ...cloneValue(metadata),
      previousHash: previous.contentHash,
      beforeAfterDiff: []
    }
  };
  const previewPack = {
    ...draftWithoutDiff,
    packId: '',
    frozen: true as const,
    contentHash: ''
  };
  const beforeAfterDiff = diffSpatialTruthPacks(previous, previewPack);
  if (beforeAfterDiff.length === 0) throw new Error('spatial-truth-revision-has-no-change');
  return identifySpatialTruthPack({
    ...draftWithoutDiff,
    revisionMetadata: {
      ...draftWithoutDiff.revisionMetadata!,
      beforeAfterDiff
    }
  });
}

export function canonicalCandidateAnchorRevisionContent(
  revision: CandidateAnchorRevision
): Omit<CandidateAnchorRevision, 'anchorRevisionId' | 'contentHash'> {
  const {
    anchorRevisionId,
    contentHash,
    ...canonical
  } = cloneValue(revision);
  void anchorRevisionId;
  void contentHash;
  return canonical;
}

export async function identifyCandidateAnchorRevision(
  revision: Omit<CandidateAnchorRevision, 'anchorRevisionId' | 'contentHash'>
): Promise<CandidateAnchorRevision> {
  const contentHash = await sha256Payload(revision);
  return deepFreezeSpatialValue({
    ...cloneValue(revision),
    anchorRevisionId: `CANDIDATE-ANCHOR-REVISION-v1-${contentHash}`,
    contentHash
  });
}

export function verifyCandidateAnchorRevision(revision: CandidateAnchorRevision): boolean {
  try {
    if (!revision.anchorRevisionId.startsWith('CANDIDATE-ANCHOR-REVISION-v1-')
      || !isSha256(revision.contentHash)
      || revision.anchorRevisionId !== `CANDIDATE-ANCHOR-REVISION-v1-${revision.contentHash}`
      || revision.revision <= 1
      || !['draft', 'frozen-candidate'].includes(revision.status)
      || !revision.projectId
      || !revision.eventId
      || !revision.venueId
      || !revision.baseTruthPackId
      || !revision.sourceLayerId
      || !isSha256(revision.sourceHash)
      || !revision.changeReason.trim()
      || !revision.actor.trim()
      || !revision.createdAt
      || revision.beforeAfterDiff.length === 0
      || revision.anchors.length === 0) {
      return false;
    }
    const candidateIds = new Set<string>();
    if (revision.anchors.some((anchor) => {
      if (candidateIds.has(anchor.candidateEntityId)) return true;
      candidateIds.add(anchor.candidateEntityId);
      return !normalizedAnchorIsValid(anchor)
        || anchor.sourceHash !== revision.sourceHash
        || anchor.sourceLayerId !== revision.sourceLayerId
        || anchor.anchorStatus !== 'candidate-visual-anchor'
        || anchor.revision !== revision.revision;
    })) {
      return false;
    }
    return sha256PayloadSync(canonicalCandidateAnchorRevisionContent(revision)) === revision.contentHash;
  } catch {
    return false;
  }
}

export function normalizedAnchorIsValid(anchor: Pick<CandidateVisualAnchor, 'x' | 'y'>): boolean {
  return Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
    && anchor.x >= 0 && anchor.x <= 1
    && anchor.y >= 0 && anchor.y <= 1;
}
