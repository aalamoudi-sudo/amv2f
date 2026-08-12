import { isSha256, sha256PayloadSync, stableSerialize } from './integrationHash';
import type {
  DeliveryBindingResult,
  DeliveryCandidateRevision,
  OperationalCanonicalFact,
  OperationalIncomingFact,
  OperationalReconciliationItem,
  OperationalReconciliationPreview
} from '../types/experienceDelivery';

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((nested) => deepFreeze(nested));
  return Object.freeze(value);
}

function dimensionsMatch(current: OperationalCanonicalFact, incoming: OperationalIncomingFact): boolean {
  return current.factKind === incoming.factKind
    && current.dayId === incoming.dayId
    && current.personaId === incoming.personaId
    && current.momentId === incoming.momentId
    && current.destinationId === incoming.destinationId;
}

function revisionHashInput<T>(scopeId: string, revision: Omit<DeliveryCandidateRevision<T>, 'revisionId' | 'contentHash'>): object {
  return {
    scopeId,
    revision: revision.revision,
    sourcePackageHash: revision.sourcePackageHash,
    parentRevisionId: revision.parentRevisionId,
    timestamp: revision.timestamp,
    timestampClassification: revision.timestampClassification,
    actorClassification: revision.actorClassification,
    acceptanceReason: revision.acceptanceReason,
    affectedObjectIds: revision.affectedObjectIds,
    diffSummary: revision.diffSummary,
    rollbackReference: revision.rollbackReference,
    status: revision.status,
    value: revision.value
  };
}

export function reconcileOperationalDelivery(input: {
  sourceFingerprint: string;
  currentProjectionHash: string;
  currentFacts: readonly OperationalCanonicalFact[];
  incomingFacts: readonly OperationalIncomingFact[];
}): Readonly<OperationalReconciliationPreview> {
  const currentFacts = [...input.currentFacts].sort((left, right) => left.canonicalFactId.localeCompare(right.canonicalFactId));
  const incomingFacts = [...input.incomingFacts].sort((left, right) => left.incomingFactId.localeCompare(right.incomingFactId));
  const items: OperationalReconciliationItem[] = incomingFacts.map((incoming) => {
    const current = currentFacts.find((candidate) => dimensionsMatch(candidate, incoming)) ?? null;
    const matching = current ? stableSerialize(current.value) === stableSerialize(incoming.value) : false;
    const missingAuthority = incoming.authorityStatus === 'unknown';
    const differenceType: OperationalReconciliationItem['differenceType'] = missingAuthority ? 'missing-authority'
      : !current ? 'new'
        : matching ? 'matching'
          : incoming.authorityStatus === 'authority-confirmed' ? 'changed' : 'conflicting';
    const recommendedAction: OperationalReconciliationItem['recommendedAction'] = missingAuthority ? 'request-authority-review'
      : !current ? 'add-candidate-fact'
        : matching ? 'preserve-current-fact'
          : incoming.authorityStatus === 'authority-confirmed' ? 'mark-superseded-candidate' : 'create-conflict';
    const authorityRequiredAr = missingAuthority
      ? 'تصنيف سلطة المصدر مطلوب قبل قبول الحقيقة المرشحة.'
      : differenceType === 'conflicting'
        ? 'جهة مخولة مطلوبة لحسم التعارض؛ لا اختيار تلقائي.'
        : 'قرار أحمد مطلوب لقبول الربط المرشح فقط.';
    return {
      reconciliationItemId: `RECON-${sha256PayloadSync({ incoming: incoming.incomingFactId, current: current?.canonicalFactId ?? null }).slice(0, 18)}`,
      currentFactId: current?.canonicalFactId ?? null,
      incomingFactId: incoming.incomingFactId,
      currentValue: current?.value ?? null,
      incomingValue: incoming.value,
      differenceType,
      recommendedAction,
      sourceLocator: structuredClone(incoming.sourceLocator),
      dayId: incoming.dayId,
      personaId: incoming.personaId,
      momentId: incoming.momentId,
      destinationId: incoming.destinationId,
      decisionContextId: incoming.decisionContextId,
      readinessContextId: incoming.readinessContextId,
      operationalImpactAr: differenceType === 'matching' ? 'لا تغيير تشغيلي مقترح.' : 'تغيير مرشح يحتاج مراجعة الأثر والاعتماد قبل الربط.',
      clientPresentationImpactAr: differenceType === 'matching' ? 'لا تغيير في عرض العميل.' : 'لا يظهر التغيير في عرض العميل قبل القبول المرشح.',
      authorityRequiredAr
    };
  });
  const itemHash = sha256PayloadSync(items);
  const base = {
    previewId: `OPERATIONAL-RECONCILIATION-${itemHash.slice(0, 16)}`,
    sourceFingerprint: input.sourceFingerprint,
    currentProjectionHash: input.currentProjectionHash,
    itemHash,
    items,
    canMutateProjection: false as const
  };
  return deepFreeze({ ...base, deterministicFingerprint: sha256PayloadSync(base) });
}

export interface DeliveryLedgerSnapshot<T> {
  scopeId: string;
  revisionIds: string[];
  activeRevisionId: string | null;
  revisions: DeliveryCandidateRevision<T>[];
  contentHash: string;
}

export class ExperienceDeliveryCandidateLedger<T> {
  readonly #scopeId: string;
  readonly #allowedObjectIds: ReadonlySet<string>;
  readonly #revisions = new Map<string, Readonly<DeliveryCandidateRevision<T>>>();
  #activeRevisionId: string | null = null;

  constructor(scopeId: string, allowedObjectIds: ReadonlySet<string>, snapshot?: DeliveryLedgerSnapshot<T>) {
    this.#scopeId = scopeId;
    this.#allowedObjectIds = new Set(allowedObjectIds);
    if (snapshot) this.#restore(snapshot);
  }

  #restore(snapshot: DeliveryLedgerSnapshot<T>): void {
    const { contentHash, ...snapshotPayload } = snapshot;
    if (snapshot.scopeId !== this.#scopeId || sha256PayloadSync(snapshotPayload) !== contentHash) throw new Error('تعذر استعادة سجل التسليم: اللقطة لا تطابق النطاق أو البصمة.');
    if (snapshot.revisionIds.length !== snapshot.revisions.length || snapshot.revisionIds.some((revisionId, index) => revisionId !== snapshot.revisions[index]?.revisionId)) throw new Error('تعذر استعادة سجل التسليم: فهرس المراجعات لا يطابق السلسلة.');
    let expectedParent: string | null = null;
    for (const revision of snapshot.revisions) {
      if (revision.parentRevisionId !== expectedParent || revision.revision !== this.#revisions.size + 1) throw new Error('تعذر استعادة سجل التسليم: سلسلة المراجعات غير متصلة.');
      const { revisionId, contentHash: revisionContentHash, ...revisionPayload } = revision;
      const expectedContentHash = sha256PayloadSync(revisionHashInput(this.#scopeId, revisionPayload));
      const expectedRevisionId = `DELIVERY-REVISION-${revision.revision}-${expectedContentHash.slice(0, 14)}`;
      if (revisionContentHash !== expectedContentHash || revisionId !== expectedRevisionId) throw new Error('تعذر استعادة سجل التسليم: هوية مراجعة أو بصمتها غير صالحة.');
      const immutable = deepFreeze(structuredClone(revision));
      this.#revisions.set(immutable.revisionId, immutable);
      expectedParent = immutable.revisionId;
    }
    if (snapshot.activeRevisionId && !this.#revisions.has(snapshot.activeRevisionId)) throw new Error('تعذر استعادة سجل التسليم: المؤشر النشط غير معروف.');
    this.#activeRevisionId = snapshot.activeRevisionId;
  }

  current(): Readonly<DeliveryCandidateRevision<T>> | null {
    return this.#activeRevisionId ? this.#revisions.get(this.#activeRevisionId) ?? null : null;
  }

  history(): readonly Readonly<DeliveryCandidateRevision<T>>[] {
    return [...this.#revisions.values()];
  }

  acceptCandidate(input: {
    sourcePackageHash: string;
    timestamp: string;
    actorClassification: DeliveryCandidateRevision<T>['actorClassification'];
    reason: string;
    affectedObjectIds: string[];
    diffSummary: string[];
    value: T;
  }): DeliveryBindingResult<T> {
    return this.#commit({ ...input, status: 'accepted-as-candidate', rollbackReference: null, expectedHeadHash: this.current()?.contentHash ?? null });
  }

  bindCandidate(input: {
    sourcePackageHash: string;
    timestamp: string;
    actorClassification: DeliveryCandidateRevision<T>['actorClassification'];
    reason: string;
    affectedObjectIds: string[];
    diffSummary: string[];
    value: T;
    expectedHeadHash: string;
    validate: (value: T) => { valid: boolean; failedObjectIds: readonly string[] };
  }): DeliveryBindingResult<T> {
    const current = this.current();
    if (!current || current.contentHash !== input.expectedHeadHash) return { committed: false, revision: null, messageAr: 'فشل الربط الذري: تغير رأس المراجعة؛ لا يُستخدم آخر تعديل تلقائيًا.', failedObjectIds: [] };
    const validation = input.validate(structuredClone(input.value));
    if (!validation.valid) return { committed: false, revision: null, messageAr: 'فشل الربط الذري؛ بقيت المراجعة السابقة دون تغيير.', failedObjectIds: [...validation.failedObjectIds] };
    return this.#commit({ ...input, status: 'bound', rollbackReference: null });
  }

  rollback(input: {
    targetRevisionId: string;
    expectedHeadHash: string;
    timestamp: string;
    actorClassification: DeliveryCandidateRevision<T>['actorClassification'];
    reason: string;
  }): DeliveryBindingResult<T> {
    const current = this.current();
    const target = this.#revisions.get(input.targetRevisionId) ?? null;
    if (!current || current.contentHash !== input.expectedHeadHash || !target) return { committed: false, revision: null, messageAr: 'تعذر الرجوع: الرأس أو المراجعة المستهدفة لا يطابقان السجل.', failedObjectIds: [] };
    return this.#commit({
      sourcePackageHash: target.sourcePackageHash,
      timestamp: input.timestamp,
      actorClassification: input.actorClassification,
      reason: input.reason,
      affectedObjectIds: [...target.affectedObjectIds],
      diffSummary: [`رجوع صريح إلى ${target.revisionId}`],
      value: structuredClone(target.value),
      expectedHeadHash: input.expectedHeadHash,
      status: 'rolled-back',
      rollbackReference: target.revisionId
    });
  }

  #commit(input: {
    sourcePackageHash: string;
    timestamp: string;
    actorClassification: DeliveryCandidateRevision<T>['actorClassification'];
    reason: string;
    affectedObjectIds: string[];
    diffSummary: string[];
    value: T;
    expectedHeadHash: string | null;
    status: DeliveryCandidateRevision<T>['status'];
    rollbackReference: string | null;
  }): DeliveryBindingResult<T> {
    const current = this.current();
    if ((current?.contentHash ?? null) !== input.expectedHeadHash) return { committed: false, revision: null, messageAr: 'فشل التزام المراجعة: تغير الرأس؛ لم يحدث أي ربط جزئي.', failedObjectIds: [] };
    const invalidIds = input.affectedObjectIds.filter((id) => !this.#allowedObjectIds.has(id));
    if (invalidIds.length) return { committed: false, revision: null, messageAr: 'فشل التزام المراجعة: يحتوي الربط هويات خارج النطاق.', failedObjectIds: invalidIds };
    if (!isSha256(input.sourcePackageHash)) return { committed: false, revision: null, messageAr: 'بصمة حزمة المصدر غير صالحة؛ لم تُنشأ مراجعة.', failedObjectIds: [] };
    if (new Set(input.affectedObjectIds).size !== input.affectedObjectIds.length) return { committed: false, revision: null, messageAr: 'هويات الربط المرشح يجب ألا تتكرر داخل المراجعة.', failedObjectIds: [] };
    if (!input.reason.trim() || !input.diffSummary.length || input.diffSummary.some((entry) => !entry.trim()) || Number.isNaN(Date.parse(input.timestamp))) return { committed: false, revision: null, messageAr: 'سبب القبول وملخص الفرق وتوقيت المراجعة المحلية مطلوبة.', failedObjectIds: [] };
    const revisionNumber = this.#revisions.size + 1;
    const parentRevisionId = current?.revisionId ?? null;
    const revisionPayload: Omit<DeliveryCandidateRevision<T>, 'revisionId' | 'contentHash'> = {
      revision: revisionNumber,
      sourcePackageHash: input.sourcePackageHash,
      parentRevisionId,
      timestamp: input.timestamp,
      timestampClassification: 'local-process-time-untrusted',
      actorClassification: input.actorClassification,
      acceptanceReason: input.reason,
      affectedObjectIds: [...input.affectedObjectIds].sort(),
      diffSummary: [...input.diffSummary],
      rollbackReference: input.rollbackReference,
      status: input.status,
      value: structuredClone(input.value)
    };
    const contentHash = sha256PayloadSync(revisionHashInput(this.#scopeId, revisionPayload));
    const revision: DeliveryCandidateRevision<T> = {
      revisionId: `DELIVERY-REVISION-${revisionNumber}-${contentHash.slice(0, 14)}`,
      contentHash,
      ...revisionPayload
    };
    const immutable = deepFreeze(revision);
    this.#revisions.set(immutable.revisionId, immutable);
    this.#activeRevisionId = immutable.revisionId;
    return { committed: true, revision: immutable, messageAr: input.status === 'bound' ? 'تم ربط المراجعة المرشحة ذريًا دون تعديل الحقيقة التشغيلية.' : input.status === 'rolled-back' ? 'تم إنشاء مراجعة رجوع جديدة؛ لم يُحذف التاريخ.' : 'قُبلت المراجعة كمرشح محلي فقط.', failedObjectIds: [] };
  }

  snapshot(): Readonly<DeliveryLedgerSnapshot<T>> {
    const base = {
      scopeId: this.#scopeId,
      revisionIds: this.history().map((revision) => revision.revisionId),
      activeRevisionId: this.#activeRevisionId,
      revisions: this.history().map((revision) => structuredClone(revision)) as DeliveryCandidateRevision<T>[]
    };
    return deepFreeze({ ...base, contentHash: sha256PayloadSync(base) });
  }
}
