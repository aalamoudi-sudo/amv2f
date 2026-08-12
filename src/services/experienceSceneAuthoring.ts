import type { ExperienceSceneAsset, SceneAssetRevision, SceneValidationContext, SceneValidationIssue } from '../types/experienceScene';
import { sha256PayloadSync, stableSerialize } from './integrationHash';
import { validateExperienceSceneAsset } from './experienceSceneValidation';

export interface SceneAssetDifference {
  path: string;
  before: unknown;
  after: unknown;
}

export interface SceneAssetCandidateRevisionResult {
  asset: Readonly<ExperienceSceneAsset>;
  revision: Readonly<SceneAssetRevision>;
  differences: readonly SceneAssetDifference[];
  baselineMutationAllowed: false;
  readinessMutationAllowed: false;
  decisionMutationAllowed: false;
  evidenceMutationAllowed: false;
}

export function deepFreezeSceneRevision<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((entry) => deepFreezeSceneRevision(entry));
    Object.freeze(value);
  }
  return value;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function collectDifferences(before: unknown, after: unknown, path = ''): SceneAssetDifference[] {
  if (stableSerialize(before) === stableSerialize(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after)) {
    return [{ path: path || '/', before: clone(before), after: clone(after) }];
  }
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) => collectDifferences(left[key], right[key], `${path}/${key}`));
}

function revisionIdentity(asset: ExperienceSceneAsset, revision: number, parentRevisionId: string): string {
  const payload = clone(asset) as unknown as Record<string, unknown>;
  delete payload.revisionId;
  delete payload.revision;
  delete payload.parentRevisionId;
  return `${asset.assetId}-R${revision}-${sha256PayloadSync({ parentRevisionId, payload }).slice(0, 12)}`;
}

export function createSceneAssetCandidateRevision(
  current: ExperienceSceneAsset,
  proposed: ExperienceSceneAsset,
  changeReason: string,
  actorRef: string,
  context: SceneValidationContext
): SceneAssetCandidateRevisionResult {
  if (!changeReason.trim()) throw new Error('سبب التغيير مطلوب قبل إنشاء مراجعة مشهد جديدة.');
  if (!actorRef.trim()) throw new Error('هوية مؤلف المراجعة المحلية مطلوبة.');
  if (current.assetId !== proposed.assetId || current.projectId !== proposed.projectId || current.eventId !== proposed.eventId || current.venueId !== proposed.venueId) {
    throw new Error('لا يمكن نقل مراجعة مشهد بين أصلين أو مشروعين أو فعاليتين.');
  }
  if (current.sourceFingerprint !== proposed.sourceFingerprint || current.sourceId !== proposed.sourceId || current.contentHash !== proposed.contentHash) {
    throw new Error('لا يجوز استبدال هوية المصدر أو بصمة الملف داخل مراجعة الأصل نفسها؛ سجّل أصلًا أو مراجعة مصدر جديدة.');
  }
  const next = clone(proposed);
  next.revision = current.revision + 1;
  next.parentRevisionId = current.revisionId;
  next.revisionId = revisionIdentity(next, next.revision, current.revisionId);
  next.createdBy = actorRef.trim();
  next.createdAt = null;
  const candidateRevision: SceneAssetRevision = {
    revisionId: next.revisionId,
    assetId: next.assetId,
    revision: next.revision,
    parentRevisionId: current.revisionId,
    previousContentHash: current.contentHash,
    contentHash: next.contentHash,
    changeReason: changeReason.trim(),
    createdAt: null,
    createdBy: actorRef.trim(),
    timeTrust: 'local-process-untrusted',
    status: next.availabilityStatus === 'quarantined' ? 'quarantined' : 'candidate',
    changedFields: collectDifferences(current, next).map((difference) => difference.path).filter((path) => !['/revision', '/revisionId', '/parentRevisionId', '/createdBy'].includes(path))
  };
  const expandedContext: SceneValidationContext = {
    ...context,
    registryAssets: [...context.registryAssets.filter((asset) => asset.assetId !== next.assetId), next],
    registryRevisions: [...context.registryRevisions, candidateRevision]
  };
  const validation = validateExperienceSceneAsset(next, expandedContext);
  if (!validation.valid) {
    throw new Error(validation.issues.find((entry) => entry.severity === 'blocking')?.messageAr ?? 'فشل التحقق من مراجعة المشهد.');
  }
  const differences = collectDifferences(current, next).filter((difference) => !difference.path.startsWith('/createdAt'));
  return deepFreezeSceneRevision({
    asset: clone(next),
    revision: clone(candidateRevision),
    differences,
    baselineMutationAllowed: false as const,
    readinessMutationAllowed: false as const,
    decisionMutationAllowed: false as const,
    evidenceMutationAllowed: false as const
  });
}

export class LocalSceneRevisionRepository {
  private readonly assetsByRevisionId = new Map<string, Readonly<ExperienceSceneAsset>>();
  private readonly revisionRecords = new Map<string, Readonly<SceneAssetRevision>>();
  private activeRevisionId: string;

  constructor(rootAsset: ExperienceSceneAsset, rootRevision: SceneAssetRevision) {
    const asset = deepFreezeSceneRevision(clone(rootAsset));
    const revision = deepFreezeSceneRevision(clone(rootRevision));
    this.assetsByRevisionId.set(asset.revisionId, asset);
    this.revisionRecords.set(revision.revisionId, revision);
    this.activeRevisionId = asset.revisionId;
  }

  append(result: SceneAssetCandidateRevisionResult): void {
    if (this.assetsByRevisionId.has(result.asset.revisionId)) throw new Error('معرّف مراجعة المشهد موجود مسبقًا ولا يمكن استبداله.');
    const active = this.current();
    if (result.asset.parentRevisionId !== active.revisionId || result.asset.revision !== active.revision + 1) throw new Error('سلسلة مراجعات المشهد غير متصلة.');
    this.assetsByRevisionId.set(result.asset.revisionId, deepFreezeSceneRevision(clone(result.asset)));
    this.revisionRecords.set(result.revision.revisionId, deepFreezeSceneRevision(clone(result.revision)));
    this.activeRevisionId = result.asset.revisionId;
  }

  current(): Readonly<ExperienceSceneAsset> {
    return this.assetsByRevisionId.get(this.activeRevisionId)!;
  }

  selectHistoricalRevision(revisionId: string): Readonly<ExperienceSceneAsset> {
    const asset = this.assetsByRevisionId.get(revisionId);
    if (!asset) throw new Error('مراجعة المشهد المطلوبة غير موجودة.');
    this.activeRevisionId = revisionId;
    return asset;
  }

  history(): readonly Readonly<SceneAssetRevision>[] {
    return [...this.revisionRecords.values()].sort((left, right) => left.revision - right.revision);
  }
}

export function quarantineSceneAsset(asset: ExperienceSceneAsset, diagnostics: readonly SceneValidationIssue[]): ExperienceSceneAsset {
  const quarantined = clone(asset);
  quarantined.availabilityStatus = 'quarantined';
  quarantined.warnings = [...quarantined.warnings, ...diagnostics.map((entry) => entry.messageAr)];
  return deepFreezeSceneRevision(quarantined);
}
