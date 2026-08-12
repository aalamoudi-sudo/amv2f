import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  Fingerprint,
  GitCompareArrows,
  Gavel,
  GitBranch,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MapPinned,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  activateOperationalCandidateRevision,
  attemptOperationalReadinessPackFreeze,
  createOperationalReadinessAuthoringState,
  createReadinessPackDecisionDraft,
  deriveOperationalAuthorityContractProjection,
  derivePreActivationEligibility,
  derivePreFreezeEligibility,
  deriveReadinessPackPreparation,
  materializeOperationalReadinessPackDerivedState,
  previewOperationalReadinessPackRevision,
  rollbackOperationalCandidateRevision
} from '../../services/operationalReadinessPack';
import {
  inspectOperationalReadinessTrustSession
} from '../../services/operationalReadinessTrustGateway';
import {
  deriveOperationalReadinessAuthorityTopologyFingerprint,
  deriveOperationalReadinessSourceBindingFingerprint,
  deriveOperationalReadinessTraceBindingFingerprint
} from '../../services/operationalReadinessCustodyFingerprint';
import {
  readOperationalReadinessAuthoringState,
  writeOperationalReadinessAuthoringState
} from '../../services/operationalReadinessPackLocalState';
import type {
  OperationalReadinessAuthoritySlot,
  OperationalReadinessDecisionDraft,
  OperationalReadinessPack,
  OperationalReadinessRequirement,
  OperationalSourceTrace,
  ReadinessPackSourceClassification
} from '../../types/operationalReadinessPack';
import type {
  OperationalReadinessTrustSession
} from '../../types/operationalReadinessTrust';
import type { ReadinessBlocker } from '../../types/readinessIntelligence';
import { ReadinessSpatialPanel } from '../readiness-intelligence/ReadinessSpatialPanel';
import './operationalReadinessPack.css';

type ReadinessPackView =
  | 'summary'
  | 'sources'
  | 'workstreams'
  | 'requirements'
  | 'authorities'
  | 'evidence'
  | 'spatial'
  | 'eligibility';

const viewValues = new Set<ReadinessPackView>([
  'summary',
  'sources',
  'workstreams',
  'requirements',
  'authorities',
  'evidence',
  'spatial',
  'eligibility'
]);

const viewDefinitions: Array<{
  id: ReadinessPackView;
  labelAr: string;
  shortAr: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'summary', labelAr: 'ملخص الحزمة التنفيذي', shortAr: 'الملخص', icon: LayoutDashboard },
  { id: 'sources', labelAr: 'تتبع المصادر', shortAr: 'المصادر', icon: Fingerprint },
  { id: 'workstreams', labelAr: 'مصفوفة مسارات العمل', shortAr: 'المسارات', icon: GitBranch },
  { id: 'requirements', labelAr: 'تأليف المتطلبات', shortAr: 'المتطلبات', icon: Check },
  { id: 'authorities', labelAr: 'مصفوفة السلطات', shortAr: 'السلطات', icon: Gavel },
  { id: 'evidence', labelAr: 'عقد الأدلة', shortAr: 'الأدلة', icon: ShieldCheck },
  { id: 'spatial', labelAr: 'العلاقات المكانية', shortAr: 'المكان', icon: MapPinned },
  { id: 'eligibility', labelAr: 'الأهلية والتجميد', shortAr: 'الأهلية', icon: LockKeyhole }
];

const classificationLabels: Record<ReadinessPackSourceClassification, string> = {
  'source-backed': 'مستند إلى مصدر',
  'founder-directed': 'بتوجيه المؤسس',
  'template-proposed': 'مقترح قالب',
  missing: 'مفقود',
  conflicting: 'متعارض',
  superseded: 'مستبدل'
};

const sourceClassificationLabels: Record<OperationalReadinessPack['sourceRegistry'][number]['sourceClassification'], string> = {
  'founder-approved-project-governance-source': 'مرجع حوكمة مشروع معتمد من المؤسس',
  'founder-approved-cad-source': 'مصدر CAD عامل معتمد من المؤسس',
  'employee-name-reference-limited': 'مرجع أسماء موظفين محدود السلطة',
  'founder-direction': 'توجيه مؤسس صريح'
};

const authorityKindLabels: Record<OperationalReadinessAuthoritySlot['authorityKind'], string> = {
  'project-assignment': 'تعيين المشروع',
  'requirement-owner': 'ملكية المتطلبات',
  'responsible-delivery': 'مسؤولية التسليم',
  'evidence-submission': 'تقديم الدليل',
  'evidence-verification': 'التحقق من الدليل',
  'internal-approval': 'الاعتماد الداخلي',
  'client-acceptance': 'قبول العميل',
  'engineering-authority': 'السلطة الهندسية',
  'hse-authority': 'سلطة HSE',
  'route-authority': 'سلطة المسارات',
  'opening-authority': 'سلطة الافتتاح',
  'readiness-pack-activation': 'سلطة تفعيل حزمة الجاهزية',
  'founder-platform-acceptance': 'قبول قدرة المنصة'
};

function currentViewFromLocation(): ReadinessPackView {
  const requested = new URL(window.location.href).searchParams.get('readinessPackView');
  return requested && viewValues.has(requested as ReadinessPackView)
    ? requested as ReadinessPackView
    : 'summary';
}

function currentRequirementFromLocation(pack: OperationalReadinessPack): string | null {
  const requested = new URL(window.location.href).searchParams.get('readinessRequirement');
  return requested && pack.requirements.some((requirement) => requirement.id === requested)
    ? requested
    : null;
}

function actorLabel(actor: OperationalReadinessRequirement['owner']): string {
  return actor?.displayNameAr ?? 'غير معيّن';
}

function sourceLocator(trace: OperationalSourceTrace): string {
  if (trace.locatorType === 'slide-shape') {
    return `شريحة ${trace.slideNumber ?? '؟'} · شكل ${trace.shapeId ?? '؟'}`;
  }
  if (trace.locatorType === 'slide-table-row') {
    return `شريحة ${trace.slideNumber ?? '؟'} · جدول ${trace.tableIndex ?? '؟'} · صف ${trace.rowNumber ?? '؟'}`;
  }
  if (trace.locatorType === 'workbook-row') {
    return `ورقة ${trace.sheetName ?? '؟'} · صف ${trace.rowNumber ?? '؟'}`;
  }
  if (trace.locatorType === 'file-fingerprint') return 'بصمة الملف';
  if (trace.locatorType === 'founder-direction') return 'توجيه مؤسس صريح';
  return trace.sectionReference ?? 'مرجع منصة';
}

function diffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'فارغ';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function statusTone(value: string): 'good' | 'warn' | 'bad' | 'neutral' {
  if (['verified', 'assigned', 'passed', 'source-backed', 'founder-directed'].includes(value)) return 'good';
  if (['conflicting', 'recorded-first-observation', 'template-proposed'].includes(value)) return 'warn';
  if (['unknown', 'missing', 'failed', 'blocked', 'unresolved', 'mismatch', 'quarantined'].includes(value)) return 'bad';
  return 'neutral';
}

function StatusPill({ value, label }: { value: string; label: string }) {
  return <span className={`orp-status orp-status--${statusTone(value)}`}>{label}</span>;
}

function EmptyValue({ children = 'غير معيّن' }: { children?: ReactNode }) {
  return <span className="orp-empty-value"><AlertTriangle aria-hidden="true" />{children}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="orp-section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="orp-section-actions">{actions}</div> : null}
    </header>
  );
}

export function OperationalReadinessPackWorkspace({
  pack,
  trustSession,
  projectNameAr,
  eventNameAr,
  spatialConfigurationId,
  onOpenReadinessCommand
}: {
  pack: OperationalReadinessPack;
  trustSession: OperationalReadinessTrustSession;
  projectNameAr: string;
  eventNameAr: string;
  spatialConfigurationId: string | null;
  onOpenReadinessCommand: () => void;
}) {
  const initialAuthoringState = useMemo(
    () => createOperationalReadinessAuthoringState(pack, trustSession),
    [pack, trustSession]
  );
  const [authoringState, setAuthoringState] = useState(() =>
    readOperationalReadinessAuthoringState(
      window.localStorage,
      pack,
      initialAuthoringState,
      trustSession
    )
  );
  const [view, setViewState] = useState<ReadinessPackView>(currentViewFromLocation);
  const [selectedRequirementId, setSelectedRequirementIdState] = useState<string | null>(() =>
    currentRequirementFromLocation(pack)
  );
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [technicalDrawerOpen, setTechnicalDrawerOpen] = useState(false);
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [editCompletionDefinition, setEditCompletionDefinition] = useState('');
  const [editReason, setEditReason] = useState('');
  const [authoringMessage, setAuthoringMessage] = useState<string | null>(null);
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const [freezeMessage, setFreezeMessage] = useState<string | null>(null);
  const [decisionDraft, setDecisionDraft] = useState<OperationalReadinessDecisionDraft | null>(null);
  const [requirementSearch, setRequirementSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'all' | ReadinessPackSourceClassification>('all');
  const [workstreamFilter, setWorkstreamFilter] = useState('all');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [sourceLimitationsExpanded, setSourceLimitationsExpanded] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(requirementSearch.trim().toLocaleLowerCase('ar'));

  const activeRevision = authoringState.revisions.find(
    (revision) => revision.revisionId === authoringState.activeRevisionId
  ) ?? authoringState.revisions[0]!;
  const activePack = activeRevision.pack;
  const activeValidationContext = useMemo(
    () => ({ trustSession }),
    [trustSession]
  );
  const trustStatus = useMemo(
    () => inspectOperationalReadinessTrustSession(trustSession, activePack),
    [activePack, trustSession]
  );
  const custodyFingerprints = useMemo(() => ({
    authorityTopology:
      deriveOperationalReadinessAuthorityTopologyFingerprint(activePack),
    sourceBinding:
      deriveOperationalReadinessSourceBindingFingerprint(activePack),
    traceBinding:
      deriveOperationalReadinessTraceBindingFingerprint(activePack)
  }), [activePack]);
  const preparation = useMemo(
    () => deriveReadinessPackPreparation(activePack),
    [activePack]
  );
  const preFreezeEligibility = useMemo(
    () => derivePreFreezeEligibility(activePack, activeValidationContext),
    [activePack, activeValidationContext]
  );
  const preActivationEligibility = useMemo(
    () => derivePreActivationEligibility(
      activePack,
      activePack.activationRecord,
      activeValidationContext
    ),
    [activePack, activeValidationContext]
  );
  const authorityContract = useMemo(
    () => deriveOperationalAuthorityContractProjection(activePack),
    [activePack]
  );
  const selectedRequirement = activePack.requirements.find(
    (requirement) => requirement.id === selectedRequirementId
  ) ?? null;
  const selectedTrace = activePack.sourceTraces.find((trace) => trace.traceId === selectedTraceId) ?? null;
  const previewRevision = authoringState.revisions.find(
    (revision) => revision.revisionId === previewRevisionId
  ) ?? null;
  const executionConflict = activePack.unresolvedConflicts.find((conflict) =>
    conflict.candidateAssignments.length > 0
  ) ?? null;
  const failedPreFreezeCount = preFreezeEligibility.filter((gate) => gate.status !== 'passed').length;
  const failedPreActivationCount = preActivationEligibility.filter((gate) => gate.status !== 'passed').length;
  const authorityContractMismatchCount = authorityContract.filter(
    (item) => item.contractStatus !== 'matched'
  ).length;
  const assignedAuthorityContractCount = authorityContract.filter(
    (item) => item.assignmentStatus === 'assigned'
  ).length;
  const activeAuthorityTriggerCount = activePack.authorityTriggerFacts.filter(
    (fact) => fact.triggerState !== 'inactive-explicit'
  ).length;

  useEffect(() => {
    writeOperationalReadinessAuthoringState(
      window.localStorage,
      pack,
      authoringState,
      trustSession
    );
  }, [authoringState, pack, trustSession]);

  useEffect(() => {
    const sync = () => {
      startTransition(() => {
        setViewState(currentViewFromLocation());
        setSelectedRequirementIdState(currentRequirementFromLocation(activePack));
      });
      contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('mayadeen:location-synced', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('mayadeen:location-synced', sync);
    };
  }, [activePack]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (technicalDrawerOpen) setTechnicalDrawerOpen(false);
      else if (selectedTraceId) setSelectedTraceId(null);
      else if (editingRequirementId) setEditingRequirementId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingRequirementId, selectedTraceId, technicalDrawerOpen]);

  const updateUrl = (nextView: ReadinessPackView, requirementId: string | null, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('readinessPackView', nextView);
    if (requirementId) url.searchParams.set('readinessRequirement', requirementId);
    else url.searchParams.delete('readinessRequirement');
    if (replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
  };

  const setView = (nextView: ReadinessPackView) => {
    startTransition(() => setViewState(nextView));
    updateUrl(nextView, selectedRequirementId);
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };

  const selectRequirement = (requirementId: string | null, nextView = view) => {
    const valid = requirementId && activePack.requirements.some((requirement) => requirement.id === requirementId)
      ? requirementId
      : null;
    setSelectedRequirementIdState(valid);
    updateUrl(nextView, valid);
  };

  const openRequirement = (requirementId: string, nextView: ReadinessPackView = 'requirements') => {
    startTransition(() => {
      setViewState(nextView);
      setSelectedRequirementIdState(requirementId);
    });
    updateUrl(nextView, requirementId);
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };

  const filteredRequirements = useMemo(() => activePack.requirements.filter((requirement) => {
    const searchMatches = !deferredSearch
      || `${requirement.titleAr} ${requirement.titleEn ?? ''} ${requirement.description} ${requirement.id}`
        .toLocaleLowerCase('ar')
        .includes(deferredSearch);
    const classificationMatches = classificationFilter === 'all'
      || requirement.classification === classificationFilter;
    const workstreamMatches = workstreamFilter === 'all'
      || requirement.workstreamId === workstreamFilter;
    return searchMatches && classificationMatches && workstreamMatches;
  }), [activePack.requirements, classificationFilter, deferredSearch, workstreamFilter]);

  const sourceCounts = useMemo(() => Object.fromEntries(
    activePack.sourceRegistry.map((source) => [
      source.sourceId,
      activePack.requirements.filter((requirement) => requirement.sourceTraces.some((traceId) =>
        activePack.sourceTraces.some((trace) => trace.traceId === traceId && trace.sourceId === source.sourceId)
      )).length
    ])
  ), [activePack]);

  const beginEdit = (requirement: OperationalReadinessRequirement) => {
    setEditingRequirementId(requirement.id);
    setEditCompletionDefinition(requirement.completionDefinition ?? '');
    setEditReason('');
    setAuthoringMessage(null);
    setPreviewRevisionId(null);
  };

  const previewEdit = () => {
    if (!editingRequirementId) return;
    if (!editReason.trim()) {
      setAuthoringMessage('سبب التغيير إلزامي قبل إنشاء مراجعة مرشحة.');
      return;
    }
    if (!editCompletionDefinition.trim()) {
      setAuthoringMessage('تعريف الإكمال لا يمكن أن يكون فارغًا.');
      return;
    }
    const changedAt = new Date().toISOString();
    const { contentHash: ignoredHash, ...activeWithoutHash } = activePack;
    void ignoredHash;
    const revisedWithoutGates = {
      ...structuredClone(activeWithoutHash),
      packStatus: 'review' as const,
      revision: activePack.revision + 1,
      revisionReason: editReason.trim(),
      requirements: activePack.requirements.map((requirement) =>
        requirement.id === editingRequirementId
          ? { ...structuredClone(requirement), completionDefinition: editCompletionDefinition.trim() }
          : structuredClone(requirement)
      ),
      authoringHistory: [
        ...activePack.authoringHistory.map((entry) => structuredClone(entry)),
        {
          historyId: `HISTORY-${activePack.id}-R${activePack.revision + 1}-PREVIEW`,
          revision: activePack.revision + 1,
          actorRef: 'ACTOR-LOCAL-CANDIDATE-AUTHOR',
          at: changedAt,
          action: 'previewed' as const,
          reason: editReason.trim(),
          previousFingerprint: activePack.contentHash
        }
      ],
      eligibilityGates: []
    };
    const nextPack = materializeOperationalReadinessPackDerivedState(
      revisedWithoutGates,
      activeValidationContext
    );
    try {
      const preview = previewOperationalReadinessPackRevision({
        state: authoringState,
        nextPack,
        changeReason: editReason,
        actorRef: 'ACTOR-LOCAL-CANDIDATE-AUTHOR',
        createdAt: changedAt,
        trustSession
      });
      setAuthoringState(preview.state);
      setPreviewRevisionId(preview.revision.revisionId);
      setAuthoringMessage(`أُنشئت مسودة محلية للمراجعة ${nextPack.revision}. لم تدخل سلسلة الثقة ولم تغيّر خط الأساس.`);
    } catch {
      setAuthoringMessage('رُفضت المراجعة المرشحة لأنها خالفت سلامة الحزمة أو تسلسل المراجعات.');
    }
  };

  const applyPreview = () => {
    if (!previewRevisionId) return;
    try {
      setAuthoringState((state) =>
        activateOperationalCandidateRevision(state, previewRevisionId, trustSession)
      );
      setPreviewRevisionId(null);
      setEditingRequirementId(null);
      setAuthoringMessage('عُرضت المسودة محليًا فقط. لم تدخل سلسلة الثقة وبقيت الجاهزية غير قابلة للتحديد.');
    } catch {
      setAuthoringMessage('تعذر تفعيل المراجعة المرشحة. لم يتغير أي أساس.');
    }
  };

  const rollbackToInitial = () => {
    try {
      setAuthoringState((state) =>
        rollbackOperationalCandidateRevision(
          state,
          state.initialRevisionId,
          trustSession
        )
      );
      setPreviewRevisionId(null);
      setEditingRequirementId(null);
      setAuthoringMessage('عادت مساحة التأليف إلى المراجعة المرشحة الأولى دون حذف سجل المراجعات.');
    } catch {
      setAuthoringMessage('تعذر الرجوع إلى المراجعة المطلوبة.');
    }
  };

  const attemptFreeze = () => {
    const result = attemptOperationalReadinessPackFreeze(
      activePack,
      undefined,
      activeValidationContext
    );
    setFreezeMessage(`${result.messageAr} عدد البوابات المانعة: ${result.blockingGateIds.length}.`);
  };

  const createDecisionDraft = (
    blockerType: OperationalReadinessDecisionDraft['blockerType'],
    affectedIds: string[],
    sourceTraceIds: string[],
    titleAr: string
  ) => {
    setDecisionDraft(createReadinessPackDecisionDraft({
      pack: activePack,
      blockerType,
      affectedIds,
      sourceTraceIds,
      titleAr,
      expectedImpactAr: 'حسم الفجوة قد يرفع أهلية إعداد الحزمة، ولا يغيّر الجاهزية التشغيلية تلقائيًا.',
      createdAt: new Date().toISOString()
    }));
  };

  const exportCandidate = () => {
    const blob = new Blob([`${JSON.stringify(activePack, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activePack.id}-r${activePack.revision}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const mapRequirement = selectedRequirement
    ?? activePack.requirements.find((requirement) => requirement.relatedEntityIds.length > 0)
    ?? null;
  const readinessMapBlocker: ReadinessBlocker | null = mapRequirement ? {
    blockerId: `READINESS-PACK-${mapRequirement.id}`,
    projectId: activePack.projectId,
    eventId: activePack.eventId,
    venueId: activePack.venueId,
    titleAr: mapRequirement.titleAr,
    descriptionAr: mapRequirement.description,
    requirementId: mapRequirement.id,
    category: mapRequirement.category,
    criticality: mapRequirement.criticality,
    severity: mapRequirement.criticality,
    state: 'open',
    status: 'open',
    relatedRequirementIds: [mapRequirement.id],
    relatedEntityIds: [...mapRequirement.relatedEntityIds, ...mapRequirement.relatedZoneIds],
    ownerRoleId: mapRequirement.owner?.actorRef ?? null,
    responsibleRoleId: mapRequirement.responsibleParty?.actorRef ?? null,
    requiredAuthorityId: mapRequirement.externalAcceptingAuthority?.actorRef ?? null,
    dueAt: null,
    escalationLevel: mapRequirement.criticality === 'critical' ? 2 : 1,
    requiredAction: mapRequirement.blockingConditions[0] ?? 'استكمال عقد المتطلب.',
    decisionRequired: mapRequirement.blockingConditions.length > 0,
    evidenceRefs: [],
    nextAcceptedEvidenceAr: mapRequirement.evidenceRequirements[0] ?? 'عقد دليل موثّق ومقبول.',
    decisionRequiredAr: mapRequirement.blockingConditions[0] ?? 'تحديد النطاق والسلطة.',
    sourceAuthority: mapRequirement.classification === 'founder-directed'
      ? 'founder-product-authority'
      : mapRequirement.classification === 'source-backed'
        ? 'founder-approved-project-governance-source'
        : 'unknown',
    operationalEffect: 'blocks-opening'
  } : null;
  const relatedToSelectedEntity = selectedEntityId
    ? activePack.requirements.filter((requirement) => requirement.relatedEntityIds.includes(selectedEntityId))
    : [];

  const renderSummary = () => {
    const conflict = activePack.unresolvedConflicts.find((candidate) => candidate.resolutionStatus === 'unresolved');
    const missingOpening = activePack.authorityMatrix.find((authority) => authority.authorityKind === 'opening-authority');
    return (
      <div data-testid="readiness-pack-summary-view" className="orp-view orp-summary">
        <SectionHeading
          eyebrow="الحقيقة التنفيذية"
          title="الجاهزية غير قابلة للتحديد، لكن فجوات الحزمة أصبحت مرئية"
          description="البيانات الحالية تعرّف ما نعرفه وما ينقصنا. لا توجد تقييمات إكمال أو أدلة متحققة أو قرار افتتاح."
          actions={<button type="button" className="orp-secondary-button" onClick={onOpenReadinessCommand}><ArrowLeft aria-hidden="true" />فتح قيادة الجاهزية</button>}
        />

        <section
          className={`orp-trust-strip ${trustStatus.valid ? 'is-trusted' : 'is-blocked'}`}
          data-testid="readiness-pack-trust-status"
          aria-label="حالة سلسلة الثقة المحلية"
        >
          {trustStatus.valid
            ? <ShieldCheck aria-hidden="true" />
            : <ShieldAlert aria-hidden="true" />}
          <div>
            <span>جذر الثقة المحلي</span>
            <strong data-testid="readiness-pack-trust-message">
              {trustStatus.messageAr}
            </strong>
          </div>
          <dl>
            <div>
              <dt>رأس المراجعة</dt>
              <dd>R{trustStatus.trustedRevisionHead ?? '؟'}</dd>
            </div>
            <div>
              <dt>سجل الأدلة</dt>
              <dd>{trustStatus.evidenceRegistryStatus === 'trusted' ? 'موثوق' : 'غير متاح'}</dd>
            </div>
            <div>
              <dt>دفتر الإعفاءات</dt>
              <dd>{trustStatus.waiverLedgerStatus === 'trusted' ? 'مثبت' : 'مفقود'}</dd>
            </div>
          </dl>
        </section>

        <section className="orp-posture" aria-label="حالة الحزمة والجاهزية">
          <div className="orp-posture__truth">
            <span>هل يمكن الافتتاح؟</span>
            <strong data-testid="operational-readiness-cannot-determine">لا يمكن التحديد</strong>
            <p>الحزمة مرشحة وغير مؤهلة للتقييم. المجهول ليس صفرًا.</p>
          </div>
          <div className="orp-posture__preparation">
            <span>اكتمال إعداد الحزمة</span>
            <strong data-testid="pack-preparation-completeness">
              {preparation.overallPreparationCompleteness === null
                ? 'غير قابل للحساب'
                : `${preparation.overallPreparationCompleteness.toLocaleString('ar-SA')}٪`}
            </strong>
            <div className="orp-meter" aria-hidden="true">
              <i style={{ width: `${preparation.overallPreparationCompleteness ?? 0}%` }} />
            </div>
            <p>READINESS-PACK-PREPARATION-v1 · ليست نسبة جاهزية تشغيلية</p>
          </div>
          <div className="orp-posture__revision">
            <span>حالة المراجعة</span>
            <strong>مرشح · R{activePack.revision}</strong>
            <p>
              {activeRevision.status === 'active-candidate'
                ? 'المراجعة المرشحة الموثوقة'
                : activeRevision.status === 'local-draft'
                  ? 'مسودة محلية خارج سلسلة الثقة'
                  : 'معاينة غير مفعّلة'}
            </p>
          </div>
        </section>

        <section className="orp-command-strip" aria-label="أهم الفجوات">
          <article>
            <ShieldAlert aria-hidden="true" />
            <span>السلطة الحرجة المفقودة</span>
            <strong>{missingOpening?.labelAr ?? 'سلطة الافتتاح'}</strong>
            <small>{missingOpening?.status === 'unknown' ? 'غير معيّنة' : missingOpening?.status}</small>
          </article>
          <article>
            <Check aria-hidden="true" />
            <span>المتطلب الحرج المفقود</span>
            <strong>مقام متطلبات معتمد</strong>
            <small>لا يحق احتساب الجاهزية قبله</small>
          </article>
          <article>
            <GitBranch aria-hidden="true" />
            <span>{activePack.unresolvedConflicts.length.toLocaleString('ar-SA')} تعارضات مفتوحة</span>
            <strong>{conflict?.labelAr ?? 'لا يوجد'}</strong>
            <small>مشتقة من ادعاءات المصدر، ولم تُحسم تلقائيًا</small>
          </article>
          <article>
            <ArrowLeft aria-hidden="true" />
            <span>الإجراء التالي</span>
            <strong>تعيين سلطة مقام المتطلبات</strong>
            <small>الجهة المخولة غير معيّنة</small>
          </article>
        </section>

        <div className="orp-summary-grid">
          <section className="orp-preparation-board" data-testid="pack-preparation-metrics">
            <header>
              <div>
                <span>شفافية الصيغة</span>
                <h3>مؤشرات إعداد مستقلة</h3>
              </div>
              <ShieldCheck aria-hidden="true" />
            </header>
            <div className="orp-metric-list">
              {preparation.metrics.filter((metric) => metric.unit === 'percent').map((metric) => (
                <article key={metric.metricId}>
                  <div>
                    <strong>{metric.labelAr}</strong>
                    <span>{metric.numerator.toLocaleString('ar-SA')} / {metric.denominator.toLocaleString('ar-SA')}</span>
                  </div>
                  <div className="orp-metric-line">
                    <i style={{ width: `${metric.value ?? 0}%` }} />
                  </div>
                  <b>{metric.value === null ? 'غير محدد' : `${metric.value.toLocaleString('ar-SA')}٪`}</b>
                </article>
              ))}
            </div>
          </section>

          <section className="orp-next-action">
            <header>
              <span>قرار اليوم</span>
              <h3>لا تبحث عن نسبة جاهزية بعد</h3>
            </header>
            <ol>
              <li><b>1</b><div><strong>اعتماد مقام المتطلبات</strong><span>يحدد ما يدخل التقييم قانونيًا.</span></div></li>
              <li><b>2</b><div><strong>تعيين جهات التحقق والاعتماد</strong><span>منفصلة عن التسليم والتنفيذ.</span></div></li>
              <li><b>3</b><div><strong>حل تعارض التنفيذ</strong><span>دون اختيار شخص تلقائي.</span></div></li>
              <li><b>4</b><div><strong>إكمال عقود الأدلة</strong><span>التسليم لا يساوي دليلًا متحققًا.</span></div></li>
            </ol>
            <button type="button" className="orp-primary-button" onClick={() => setView('eligibility')}>
              عرض بوابات الأهلية <ChevronLeft aria-hidden="true" />
            </button>
          </section>
        </div>
      </div>
    );
  };

  const renderSources = () => (
    <div data-testid="readiness-pack-sources-view" className="orp-view">
      <SectionHeading
        eyebrow="المصدر قبل الادعاء"
        title="تتبع المصادر والبصمات"
        description="كل معنى تشغيلي يرتبط بملف ومراجعة وبصمة ومحدد دقيق. الملفات الخام محلية وغير ملتزمة في Git."
      />
      <div className="orp-source-register">
        {activePack.sourceRegistry.map((source) => {
          const sourceTracesForAsset = activePack.sourceTraces.filter((trace) => trace.sourceId === source.sourceId);
          return (
            <article key={source.sourceId} data-testid={`source-record-${source.sourceId}`}>
              <header>
                <div className="orp-source-icon"><Fingerprint aria-hidden="true" /></div>
                <div>
                  <span>{sourceClassificationLabels[source.sourceClassification]}</span>
                  <h3>{source.originalFilename}</h3>
                </div>
                <StatusPill
                  value={source.fingerprintStatus}
                  label={
                    source.fingerprintStatus === 'verified'
                      ? 'البصمة متطابقة'
                      : source.fingerprintStatus === 'mismatch'
                        ? 'محجور: بصمة غير مطابقة'
                        : 'بصمة أولى مسجلة'
                  }
                />
              </header>
              <div className="orp-source-facts">
                <div><span>المراجعة</span><strong>R{source.sourceRevision}</strong></div>
                <div><span>هوية المراجعة</span><strong>{source.sourceRevisionId.split(':').at(-2)}</strong></div>
                <div><span>الحجم</span><strong>{new Intl.NumberFormat('ar-SA').format(source.observedByteSize)} بايت</strong></div>
                <div><span>المتطلبات المرتبطة</span><strong>{sourceCounts[source.sourceId] ?? 0}</strong></div>
                <div><span>المحددات</span><strong>{sourceTracesForAsset.length}</strong></div>
              </div>
              <p>{source.approvalScope}</p>
              <div className="orp-source-actions">
                <button type="button" onClick={() => setSourceLimitationsExpanded((current) => current === source.sourceId ? null : source.sourceId)}>
                  <ShieldAlert aria-hidden="true" />حدود السلطة
                </button>
                {sourceTracesForAsset[0] ? (
                  <button data-testid={`source-trace-open-${source.sourceId}`} type="button" onClick={() => setSelectedTraceId(sourceTracesForAsset[0]!.traceId)}>
                    <Link2 aria-hidden="true" />فتح أول محدد
                  </button>
                ) : null}
                <button type="button" onClick={() => setTechnicalDrawerOpen(true)}>
                  <Fingerprint aria-hidden="true" />عرض البصمة
                </button>
              </div>
              {sourceLimitationsExpanded === source.sourceId ? (
                <ul className="orp-source-limitations">
                  {source.approvalLimitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                </ul>
              ) : null}
              <div className="orp-trace-strip">
                {sourceTracesForAsset.slice(0, 6).map((trace) => (
                  <button
                    key={trace.traceId}
                    data-testid={`source-trace-select-${trace.traceId}`}
                    type="button"
                    onClick={() => setSelectedTraceId(trace.traceId)}
                  >
                    <span>{sourceLocator(trace)}</span>
                    <strong>{trace.sanitizedSourceLabel}</strong>
                  </button>
                ))}
                {sourceTracesForAsset.length > 6 ? <span>+{sourceTracesForAsset.length - 6} محددات</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderWorkstreams = () => (
    <div data-testid="readiness-pack-workstreams-view" className="orp-view">
      <SectionHeading
        eyebrow="التعيين ليس سلطة"
        title="مصفوفة مسارات العمل"
        description="المصدر يحدد مسارات وتسليمات، لكنه لا يمنح تلقائيًا سلطة تحقق أو اعتماد أو افتتاح."
      />
      <div className="orp-table-shell">
        <table className="orp-table">
          <thead>
            <tr>
              <th>مسار العمل</th>
              <th>المالك</th>
              <th>مسؤول التنفيذ</th>
              <th>المتحقق</th>
              <th>المعتمد</th>
              <th>القبول الخارجي</th>
              <th>المتطلبات</th>
              <th>فجوة حرجة</th>
            </tr>
          </thead>
          <tbody>
            {activePack.workstreams.map((workstream) => {
              const scoped = activePack.requirements.filter((requirement) => requirement.workstreamId === workstream.workstreamId);
              const verifier = scoped.find((requirement) => requirement.verifier)?.verifier ?? null;
              const approver = scoped.find((requirement) => requirement.internalApprover)?.internalApprover ?? null;
              const external = scoped.find((requirement) => requirement.externalAcceptingAuthority)?.externalAcceptingAuthority ?? null;
              return (
                <tr key={workstream.workstreamId} data-testid={`workstream-${workstream.workstreamId}`}>
                  <td><strong>{workstream.labelAr}</strong><small>{workstream.labelEn}</small></td>
                  <td>{workstream.owner ? actorLabel(workstream.owner) : <EmptyValue />}</td>
                  <td>{workstream.responsibleParty ? actorLabel(workstream.responsibleParty) : <EmptyValue />}</td>
                  <td>{verifier ? actorLabel(verifier) : <EmptyValue />}</td>
                  <td>{approver ? actorLabel(approver) : <EmptyValue />}</td>
                  <td>{external ? actorLabel(external) : <EmptyValue />}</td>
                  <td><button type="button" className="orp-count-button" onClick={() => {
                    setWorkstreamFilter(workstream.workstreamId);
                    setView('requirements');
                  }}>{scoped.length}</button></td>
                  <td>
                    {workstream.unresolvedAssignmentIds.length ? (
                      <StatusPill value="conflicting" label="تعارض تعيين" />
                    ) : scoped.some((requirement) => !requirement.verifier) ? (
                      <StatusPill value="missing" label="تحقق مفقود" />
                    ) : <StatusPill value="verified" label="تعريف مصدر مكتمل" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {executionConflict ? (
        <section className="orp-execution-conflict" data-testid="execution-candidate-comparison">
          <header>
            <AlertTriangle aria-hidden="true" />
            <div>
              <span>{activePack.displayConfig.executionConflictLabelAr}</span>
              <h3>{executionConflict.labelAr}</h3>
            </div>
            <StatusPill value="conflicting" label="الحسم: غير محلول" />
          </header>
          <div className="orp-execution-candidates">
            {executionConflict.candidateAssignments.map((candidate) => (
              <article key={candidate.candidateId}>
                <strong>{candidate.labelAr}</strong>
                <span>{candidate.sourceTraceIds.map((traceId) => {
                  const trace = activePack.sourceTraces.find((item) => item.traceId === traceId);
                  return trace ? sourceLocator(trace) : traceId;
                }).join(' · ')}</span>
                <small>{candidate.actor?.assignmentScope ?? candidate.candidateScope}</small>
              </article>
            ))}
          </div>
          <footer>
            <span>القرار: غير محسوم</span>
            <span>المخوّل بالحسم: غير معروف</span>
            <span>التغطية المحتسبة: لا أحد</span>
          </footer>
        </section>
      ) : null}
      <section className="orp-conflict-register" data-testid="governance-conflict-register">
        <header>
          <span>سجل التعارضات المشتق</span>
          <strong>{activePack.unresolvedConflicts.length.toLocaleString('ar-SA')} تعارضات غير محلولة</strong>
        </header>
        <div>
          {activePack.unresolvedConflicts.map((conflict) => (
            <article key={conflict.conflictId}>
              <StatusPill value="conflicting" label="غير محلول" />
              <strong>{conflict.labelAr}</strong>
              <small>{conflict.sourceTraceIds.length.toLocaleString('ar-SA')} محددات مصدر</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderRequirementInspector = (requirement: OperationalReadinessRequirement) => {
    const traces = requirement.sourceTraces
      .map((traceId) => activePack.sourceTraces.find((trace) => trace.traceId === traceId))
      .filter((trace): trace is OperationalSourceTrace => Boolean(trace));
    return (
      <aside data-testid="requirement-inspector" className="orp-requirement-inspector">
        <header>
          <div>
            <StatusPill value={requirement.classification} label={classificationLabels[requirement.classification]} />
            <h3>{requirement.titleAr}</h3>
          </div>
          <button type="button" aria-label="إغلاق تفاصيل المتطلب" onClick={() => selectRequirement(null)}><X aria-hidden="true" /></button>
        </header>
        <p>{requirement.description}</p>
        <dl>
          <div><dt>المالك</dt><dd>{requirement.owner ? actorLabel(requirement.owner) : <EmptyValue />}</dd></div>
          <div><dt>المسؤول</dt><dd>{requirement.responsibleParty ? actorLabel(requirement.responsibleParty) : <EmptyValue />}</dd></div>
          <div><dt>المتحقق</dt><dd>{requirement.verifier ? actorLabel(requirement.verifier) : <EmptyValue />}</dd></div>
          <div><dt>الاعتماد الداخلي</dt><dd>{requirement.internalApprover ? actorLabel(requirement.internalApprover) : <EmptyValue />}</dd></div>
          <div><dt>القبول الخارجي</dt><dd>{requirement.externalAcceptingAuthority ? actorLabel(requirement.externalAcceptingAuthority) : <EmptyValue />}</dd></div>
          <div><dt>النطاق المكاني</dt><dd><StatusPill value={requirement.spatialScopeStatus} label={
            requirement.spatialScopeStatus === 'mapped-candidate'
              ? 'ربط مرشح'
              : requirement.spatialScopeStatus === 'explicitly-not-applicable'
                ? 'غير منطبق'
                : 'غير محسوم'
          } /></dd></div>
        </dl>
        <section>
          <span>تعريف الإكمال</span>
          <p>{requirement.completionDefinition ?? 'غير معرّف بعد.'}</p>
        </section>
        <section>
          <span>عقد الدليل</span>
          {requirement.evidenceRequirements.length ? (
            <ul>{requirement.evidenceRequirements.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul>
          ) : <EmptyValue>قواعد الدليل غير مكتملة</EmptyValue>}
        </section>
        <section>
          <span>التبعيات والشروط المانعة</span>
          {requirement.dependencyIds.length || requirement.blockingConditions.length ? (
            <ul>
              {[...requirement.dependencyIds, ...requirement.blockingConditions].map((value) => <li key={value}>{value}</li>)}
            </ul>
          ) : <p>لا توجد تبعيات مسجلة.</p>}
        </section>
        <section>
          <span>محددات المصدر</span>
          <div className="orp-inspector-traces">
            {traces.length ? traces.map((trace) => (
              <button type="button" key={trace.traceId} onClick={() => setSelectedTraceId(trace.traceId)}>
                <Link2 aria-hidden="true" /><span>{sourceLocator(trace)}</span>
              </button>
            )) : <EmptyValue>لا يوجد محدد مصدر</EmptyValue>}
          </div>
        </section>
        <div className="orp-inspector-actions">
          <button data-testid="candidate-edit-open" type="button" className="orp-primary-button" onClick={() => beginEdit(requirement)}><GitCompareArrows aria-hidden="true" />تحرير مرشح</button>
          <button type="button" className="orp-secondary-button" onClick={() => openRequirement(requirement.id, 'spatial')}><MapPinned aria-hidden="true" />فتح المكان</button>
        </div>
      </aside>
    );
  };

  const renderRequirements = () => (
    <div data-testid="readiness-pack-requirements-view" className="orp-view orp-requirements-view">
      <SectionHeading
        eyebrow="عقد لا قائمة تحقق"
        title="تأليف المتطلبات المرشحة"
        description={`${activePack.requirements.length} متطلبًا مصنفًا. المقترحات والفجوات مستبعدة من المقام القانوني حتى تعتمدها جهة مخولة.`}
        actions={<button type="button" className="orp-secondary-button" onClick={() => setTechnicalDrawerOpen(true)}><Fingerprint aria-hidden="true" />الحقيقة التقنية</button>}
      />
      <div className="orp-filter-bar">
        <label className="orp-search">
          <Search aria-hidden="true" />
          <span className="sr-only">بحث المتطلبات</span>
          <input
            value={requirementSearch}
            onChange={(event) => setRequirementSearch(event.target.value)}
            placeholder="ابحث بالاسم أو الوصف"
          />
        </label>
        <label>
          <Search aria-hidden="true" />
          <span className="sr-only">تصنيف المصدر</span>
          <select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value as typeof classificationFilter)}>
            <option value="all">كل التصنيفات</option>
            {Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <GitBranch aria-hidden="true" />
          <span className="sr-only">مسار العمل</span>
          <select value={workstreamFilter} onChange={(event) => setWorkstreamFilter(event.target.value)}>
            <option value="all">كل مسارات العمل</option>
            {activePack.workstreams.map((workstream) => <option key={workstream.workstreamId} value={workstream.workstreamId}>{workstream.labelAr}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => {
          setRequirementSearch('');
          setClassificationFilter('all');
          setWorkstreamFilter('all');
        }}><RotateCcw aria-hidden="true" />إعادة الضبط</button>
      </div>
      <div className={`orp-requirements-layout ${selectedRequirement ? 'orp-requirements-layout--inspector' : ''}`}>
        <div className="orp-requirement-list" role="list">
          {filteredRequirements.map((requirement) => {
            const workstream = activePack.workstreams.find((candidate) => candidate.workstreamId === requirement.workstreamId);
            return (
              <button
                type="button"
                role="listitem"
                key={requirement.id}
                data-testid={`readiness-pack-requirement-${requirement.id}`}
                className={selectedRequirementId === requirement.id ? 'is-selected' : ''}
                aria-pressed={selectedRequirementId === requirement.id}
                onClick={() => selectRequirement(requirement.id)}
              >
                <span className="orp-requirement-classification" data-classification={requirement.classification} />
                <div>
                  <span>{workstream?.labelAr ?? 'مسار غير معروف'}</span>
                  <strong>{requirement.titleAr}</strong>
                  <small>{requirement.description}</small>
                </div>
                <div className="orp-requirement-signals">
                  <StatusPill value={requirement.classification} label={classificationLabels[requirement.classification]} />
                  {!requirement.owner ? <StatusPill value="missing" label="مالك مفقود" /> : null}
                  {!requirement.verifier ? <StatusPill value="missing" label="تحقق مفقود" /> : null}
                  {requirement.spatialScopeStatus === 'unresolved' ? <StatusPill value="unresolved" label="مكان غير محسوم" /> : null}
                </div>
                <ChevronLeft aria-hidden="true" />
              </button>
            );
          })}
          {!filteredRequirements.length ? <div className="orp-empty-list">لا توجد متطلبات تطابق المرشحات الحالية.</div> : null}
        </div>
        {selectedRequirement ? renderRequirementInspector(selectedRequirement) : null}
      </div>
    </div>
  );

  const renderAuthorities = () => (
    <div data-testid="readiness-pack-authorities-view" className="orp-view">
      <SectionHeading
        eyebrow="فصل الواجبات"
        title="مصفوفة السلطات والملكية"
        description="الظهور في الحوكمة أو التعيين في المشروع لا يمنح سلطة تحقق أو اعتماد أو قبول أو افتتاح."
      />
      <section className="orp-authority-contract" data-testid="authority-contract-summary">
        <header>
          <div>
            <span>عقد مشتق من سياسة المنصة</span>
            <h3>التزامات السلطة التشغيلية</h3>
            <p>لا تستطيع الحزمة حذف واجبها الحوكمي أو دمج أنواع السلطات في خانة واحدة ثم تشريع ذلك بإعادة البصمة.</p>
          </div>
          <div className="orp-authority-contract-totals">
            <div><strong>{authorityContract.length.toLocaleString('ar-SA')}</strong><span>واجبًا متوقعًا</span></div>
            <div><strong>{activePack.requiredAuthorities.length.toLocaleString('ar-SA')}</strong><span>تصريحًا مخزنًا</span></div>
            <div><strong>{assignedAuthorityContractCount.toLocaleString('ar-SA')}</strong><span>تعيينًا صالحًا</span></div>
            <div><strong>{authorityContractMismatchCount.toLocaleString('ar-SA')}</strong><span>عدم تطابق عقدي</span></div>
          </div>
        </header>
        <div className="orp-authority-contract-policy" data-testid="authority-contract-policy">
          <Fingerprint aria-hidden="true" />
          <div>
            <span>سياسة الواجب وإسقاط المحفزات</span>
            <strong>
              الواجبات مشتقة من سياسة المنصة · {activeAuthorityTriggerCount.toLocaleString('ar-SA')} محفزات نشطة
            </strong>
            <small>
              {activePack.authorityRequirementPolicyId} · {activePack.authorityTriggerPolicyId}
            </small>
          </div>
          <StatusPill
            value={authorityContractMismatchCount === 0 ? 'passed' : 'mismatch'}
            label={authorityContractMismatchCount === 0 ? 'الإسقاط مطابق' : 'يوجد عدم تطابق'}
          />
        </div>
        <div className="orp-authority-contract-list" role="list">
          {authorityContract.map((item) => {
            const supplied = item.declaration;
            const slot = item.authoritySlot;
            const statusLabel = item.contractStatus === 'missing-declaration'
              ? 'التصريح المتوقع مفقود'
              : item.contractStatus === 'mismatched'
                ? 'العقد غير متطابق'
                : item.assignmentStatus === 'assigned'
                  ? 'تعيين صالح'
                  : item.assignmentStatus === 'not-applicable'
                    ? 'عدم انطباق مخوّل'
                    : 'الجهة المطلوبة غير معيّنة';
            const statusValue = item.contractStatus !== 'matched'
              ? 'mismatch'
              : item.assignmentStatus === 'assigned' || item.assignmentStatus === 'not-applicable'
                ? 'assigned'
                : 'missing';
            const waiverLabel = item.expected.applicability === 'required'
              ? 'سلطة مطلوبة: لا يمكن إعفاؤها'
              : item.waiverStatus === 'valid'
                ? 'إعفاء شرطي متحقق'
                : item.waiverStatus === 'invalid'
                  ? 'إعفاء شرطي مرفوض'
                  : item.waiverStatus === 'prohibited'
                    ? 'الإعفاء ممنوع بسبب محفز نشط'
                    : 'لم يُطلب إعفاء';
            const resolverLabel = item.expected.notApplicableResolverAuthorityKind
              ? item.resolverStatus === 'resolved'
                ? 'جهة حل الإعفاء القانونية متحققة'
                : item.waiverStatus === 'not-requested'
                  ? 'جهة الحل مطلوبة فقط عند طلب إعفاء'
                  : 'جهة حل الإعفاء غير متحققة'
              : 'هذا الواجب لا يقبل الإعفاء';
            const evidenceAndChronologyLabel = item.waiverStatus === 'not-requested'
              ? 'لا يوجد سجل إعفاء لفحص دليله أو تاريخه'
              : `الدليل: ${item.evidenceResolutionStatus === 'resolved' ? 'محلول' : 'غير محلول'} · الزمن: ${item.chronologyStatus === 'valid' ? 'صالح' : 'غير صالح'}`;
            return (
              <article
                key={item.expected.policyRuleId}
                role="listitem"
                data-testid={`authority-contract-obligation-${item.expected.authorityKind}`}
                data-contract-status={item.contractStatus}
              >
                <div className="orp-authority-obligation">
                  <span>واجب المنصة · {item.expected.lifecyclePhase === 'pre-freeze' ? 'قبل التجميد' : 'قبل التفعيل'}</span>
                  <strong>{item.expected.labelAr}</strong>
                  <small>
                    {item.expected.applicability === 'required' ? 'مطلوب' : 'مشروط'} · {' '}
                    {item.activeTriggerCount.toLocaleString('ar-SA')} محفزات نشطة
                  </small>
                </div>
                <div>
                  <span>تصريح الحزمة</span>
                  <strong>{supplied?.labelAr ?? 'التصريح المتوقع مفقود'}</strong>
                  <small>{supplied ? 'موجود في الإسقاط المخزن' : 'الحذف لا يعني عدم الانطباق'}</small>
                </div>
                <div>
                  <span>الخانة القانونية</span>
                  <strong>{slot?.labelAr ?? 'لا توجد خانة مطابقة'}</strong>
                  <small>{slot
                    ? slot.authorityKind === item.expected.authorityKind
                      ? 'النوع والنطاق مطابقان'
                      : 'نوع السلطة غير مطابق'
                    : 'مرجع الخانة غير صالح'}</small>
                </div>
                <div
                  className="orp-authority-waiver-state"
                  data-testid={`authority-waiver-status-${item.expected.authorityKind}`}
                >
                  <span>الإعفاء الشرطي</span>
                  <strong>{waiverLabel}</strong>
                  <small>{resolverLabel}</small>
                  <small>{evidenceAndChronologyLabel}</small>
                </div>
                <div className="orp-authority-contract-state">
                  <StatusPill value={statusValue} label={statusLabel} />
                  <small>{item.issueMessagesAr[0] ?? (
                    item.assignmentStatus === 'missing-or-invalid'
                      ? item.expected.applicability === 'required'
                        ? 'الإجراء التالي: تعيين جهة موثقة؛ هذا الواجب لا يقبل الإعفاء.'
                        : 'الإجراء التالي: تعيين جهة موثقة أو تقديم إعفاء شرطي مكتمل عبر جهة الحل القانونية.'
                      : 'تم التحقق من العقد وفصل الواجبات والمصدر.'
                  )}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="orp-authority-flow" aria-label="تسلسل السلطات">
        {['project-assignment', 'responsible-delivery', 'evidence-submission', 'evidence-verification', 'internal-approval', 'client-acceptance', 'opening-authority'].map((kind, index) => {
          const slots = activePack.authorityMatrix.filter((authority) => authority.authorityKind === kind);
          const assigned = slots.some((slot) => slot.status === 'assigned');
          return (
            <div key={kind}>
              <b>{index + 1}</b>
              <span>{authorityKindLabels[kind as OperationalReadinessAuthoritySlot['authorityKind']]}</span>
              <StatusPill value={assigned ? 'assigned' : 'unknown'} label={assigned ? 'محدد جزئيًا' : 'مفقود'} />
            </div>
          );
        })}
      </div>
      <div className="orp-table-shell">
        <table className="orp-table orp-authority-table">
          <thead><tr><th>نوع السلطة</th><th>النطاق</th><th>الحالة</th><th>الجهة</th><th>أساس التصنيف</th><th>الحدود</th><th>قرار</th></tr></thead>
          <tbody>
            {activePack.authorityMatrix.map((authority) => (
              <tr key={authority.authorityId} data-testid={`authority-${authority.authorityKind}-${authority.status}`}>
                <td><strong>{authority.labelAr}</strong><small>{authorityKindLabels[authority.authorityKind]}</small></td>
                <td>{authority.scopeType === 'pack' ? 'الحزمة كاملة' : authority.scopeType}</td>
                <td><StatusPill value={authority.status} label={
                  authority.status === 'assigned' ? 'معيّن' : authority.status === 'conflicting' ? 'متعارض' : 'غير معيّن'
                } /></td>
                <td>{authority.actor ? actorLabel(authority.actor) : <EmptyValue>جهة السلطة غير معيّنة</EmptyValue>}</td>
                <td>{classificationLabels[authority.classification]}</td>
                <td><span className="orp-limit-cell">{authority.limitations[0] ?? 'لا توجد حدود مسجلة'}</span></td>
                <td>{authority.status !== 'assigned' ? (
                  <button type="button" className="orp-icon-action" aria-label={`إنشاء مسودة قرار لـ ${authority.labelAr}`} onClick={() =>
                    createDecisionDraft('missing-authority', [authority.authorityId], authority.sourceTraceIds, `تعيين ${authority.labelAr}`)
                  }><Gavel aria-hidden="true" /></button>
                ) : <Check aria-hidden="true" className="orp-check" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="orp-boundary-callout" data-testid="pack-authority-boundary">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>{activePack.displayConfig.executiveNoticeAr}</strong>
          <p>{activePack.displayConfig.identityBoundaryAr}</p>
        </div>
      </div>
    </div>
  );

  const renderEvidence = () => (
    <div data-testid="readiness-pack-evidence-view" className="orp-view">
      <SectionHeading
        eyebrow="التسليم ≠ التحقق"
        title="عقد الأدلة والتحقق والقبول"
        description="يفصل العقد بين نوع الدليل، الحافظ، طريقة التحقق، الاعتماد الداخلي، والقبول الخارجي."
      />
      <div className="orp-evidence-sequence">
        {[
          ['1', 'تسليم', 'سجل أو ملف مرجعي'],
          ['2', 'دليل', 'نوع وحيازة وبصمة'],
          ['3', 'تحقق', 'جهة مستقلة ومنهج'],
          ['4', 'اعتماد داخلي', 'بعد نجاح التحقق'],
          ['5', 'قبول خارجي', 'جهة عميل مخولة'],
          ['6', 'قرار افتتاح', 'سلطة مستقلة مفقودة']
        ].map(([number, title, description]) => (
          <article key={number}>
            <b>{number}</b>
            <strong>{title}</strong>
            <span>{description}</span>
          </article>
        ))}
      </div>
      <div className="orp-evidence-grid">
        {activePack.evidencePolicies.map((policy) => (
          <article key={policy.evidencePolicyId} data-testid={`evidence-policy-${policy.classification}`}>
            <header>
              <div><span>{classificationLabels[policy.classification]}</span><h3>{policy.labelAr}</h3></div>
              <StatusPill value={policy.missingFields.length ? 'missing' : 'verified'} label={policy.missingFields.length ? `${policy.missingFields.length} حقول مفقودة` : 'العقد معرّف'} />
            </header>
            <dl>
              <div><dt>أنواع الدليل</dt><dd>{policy.acceptedEvidenceTypes.length ? policy.acceptedEvidenceTypes.join('، ') : <EmptyValue />}</dd></div>
              <div><dt>حافظ الدليل</dt><dd>{policy.custodianRole ?? <EmptyValue />}</dd></div>
              <div><dt>طريقة التحقق</dt><dd>{policy.verificationMethod ?? <EmptyValue />}</dd></div>
              <div><dt>الصلاحية</dt><dd>{policy.validityPeriod ?? <EmptyValue />}</dd></div>
              <div><dt>جهة الاعتماد</dt><dd>{policy.requiredApproverAuthorityId ? 'جهة معرفة في المصفوفة' : <EmptyValue />}</dd></div>
            </dl>
            {policy.missingFields.length ? (
              <button type="button" onClick={() =>
                createDecisionDraft('missing-evidence-rule', [policy.evidencePolicyId], policy.sourceTraceIds, `استكمال ${policy.labelAr}`)
              }><Gavel aria-hidden="true" />إنشاء مسودة قرار</button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );

  const renderSpatial = () => (
    <div data-testid="readiness-pack-spatial-view" className="orp-view orp-spatial-view">
      <SectionHeading
        eyebrow="مكان مرشح لا إثبات تشغيل"
        title="العلاقات المكانية للمتطلبات"
        description={`${activePack.displayConfig.spatialBoundaryAr} النطاق غير المحسوم لا يحصل على علامة بديلة.`}
      />
      <div className="orp-spatial-layout">
        <aside className="orp-spatial-requirements">
          <header><MapPinned aria-hidden="true" /><div><span>اختر متطلبًا</span><strong>إظهار السياق المرشح</strong></div></header>
          {activePack.requirements.filter((requirement) =>
            requirement.spatialScopeStatus !== 'explicitly-not-applicable'
          ).map((requirement) => (
            <button
              type="button"
              key={requirement.id}
              data-testid={`spatial-requirement-${requirement.id}`}
              className={mapRequirement?.id === requirement.id ? 'is-selected' : ''}
              onClick={() => selectRequirement(requirement.id, 'spatial')}
            >
              <span data-spatial-status={requirement.spatialScopeStatus} />
              <div><strong>{requirement.titleAr}</strong><small>{
                requirement.spatialScopeStatus === 'mapped-candidate'
                  ? `${requirement.relatedEntityIds.length} كيانات مرشحة`
                  : 'لا توجد علامة معتمدة'
              }</small></div>
            </button>
          ))}
        </aside>
        <section className="orp-map-stage">
          <ReadinessSpatialPanel
            configurationId={spatialConfigurationId}
            projectId={activePack.projectId}
            eventId={activePack.eventId}
            venueId={activePack.venueId}
            blocker={readinessMapBlocker}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
          />
          {mapRequirement?.spatialScopeStatus === 'unresolved' ? (
            <div data-testid="unresolved-spatial-no-marker" className="orp-unresolved-spatial">
              <AlertTriangle aria-hidden="true" />
              <div><strong>النطاق المكاني غير محسوم</strong><span>لم تُنشأ علامة أو نقطة أو مسار بديل لهذا المتطلب.</span></div>
            </div>
          ) : null}
        </section>
        <aside className="orp-spatial-inspector">
          <span>السياق المحدد</span>
          <h3>{mapRequirement?.titleAr ?? 'لا يوجد متطلب محدد'}</h3>
          <p>{mapRequirement?.description}</p>
          <dl>
            <div><dt>المالك</dt><dd>{mapRequirement?.owner ? actorLabel(mapRequirement.owner) : 'غير معيّن'}</dd></div>
            <div><dt>الدليل</dt><dd>{mapRequirement?.evidenceStatus ?? 'unknown'}</dd></div>
            <div><dt>حقيقة المكان</dt><dd>{mapRequirement?.spatialScopeStatus ?? 'unresolved'}</dd></div>
            <div><dt>العنصر المحدد</dt><dd>{selectedEntityId ? 'وجهة مرشحة محددة' : 'لا يوجد'}</dd></div>
          </dl>
          {selectedEntityId ? (
            <section>
              <span>متطلبات مرتبطة بالعنصر</span>
              {relatedToSelectedEntity.length ? relatedToSelectedEntity.map((requirement) => (
                <button type="button" key={requirement.id} onClick={() => openRequirement(requirement.id)}>
                  {requirement.titleAr}<ChevronLeft aria-hidden="true" />
                </button>
              )) : <p>لا يوجد ربط موثق لهذا العنصر.</p>}
            </section>
          ) : null}
          {mapRequirement ? (
            <button type="button" className="orp-primary-button" onClick={() =>
              createDecisionDraft(
                mapRequirement.spatialScopeStatus === 'unresolved' ? 'missing-spatial-scope' : 'pack-activation',
                [mapRequirement.id, ...mapRequirement.relatedEntityIds],
                mapRequirement.sourceTraces,
                `حسم النطاق: ${mapRequirement.titleAr}`
              )
            }><Gavel aria-hidden="true" />مسودة قرار من العائق</button>
          ) : null}
        </aside>
      </div>
    </div>
  );

  const renderGateGroup = (
    groupId: 'pre-freeze' | 'pre-activation',
    title: string,
    description: string,
    gates: typeof preFreezeEligibility
  ) => {
    const failed = gates.filter((gate) => gate.status !== 'passed').length;
    return (
      <section className="orp-gate-group" data-testid={`${groupId}-gate-group`}>
        <header>
          <div>
            <span>{groupId === 'pre-freeze' ? 'المرحلة 1' : 'المرحلة 2'}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <StatusPill
            value={failed === 0 ? 'passed' : 'blocked'}
            label={failed === 0
              ? `نجحت ${gates.length.toLocaleString('ar-SA')} من ${gates.length.toLocaleString('ar-SA')}`
              : `محجوب ${failed.toLocaleString('ar-SA')} من ${gates.length.toLocaleString('ar-SA')}`}
          />
        </header>
        <div className="orp-gate-list">
          {gates.map((gate, index) => (
            <article key={gate.gateId} data-testid={`eligibility-gate-${gate.status}`}>
              <div className={`orp-gate-index orp-gate-index--${gate.status}`}>
                {gate.status === 'passed' ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              </div>
              <div>
                <span>بوابة {index + 1}</span>
                <h3>{gate.labelAr}</h3>
                <p>{gate.explanationAr}</p>
              </div>
              <div className="orp-gate-next">
                <span>الإجراء المقبول التالي</span>
                <strong>{gate.nextActionAr}</strong>
                {gate.affectedIds.length ? <small>{gate.affectedIds.length} عناصر متأثرة</small> : null}
              </div>
              {gate.status !== 'passed' ? (
                <button type="button" aria-label={`إنشاء مسودة قرار لـ ${gate.labelAr}`} onClick={() =>
                  createDecisionDraft('pack-activation', gate.affectedIds, [], `حسم بوابة ${gate.labelAr}`)
                }><Gavel aria-hidden="true" /></button>
              ) : <Check aria-hidden="true" className="orp-check" />}
            </article>
          ))}
        </div>
      </section>
    );
  };

  const renderEligibility = () => (
    <div data-testid="readiness-pack-eligibility-view" className="orp-view">
      <SectionHeading
        eyebrow="لا ترقية صامتة"
        title="الأهلية والتجميد"
        description="بوابات ما قبل التجميد مستقلة عن بوابات ما قبل التفعيل. نجاح التفعيل لا ينشئ جاهزية تشغيلية."
        actions={
          <>
            <button data-testid="candidate-pack-export" type="button" className="orp-secondary-button" onClick={exportCandidate}><ArrowLeft aria-hidden="true" />تصدير المرشح</button>
            <button data-testid="candidate-freeze-attempt" type="button" className="orp-danger-button" onClick={attemptFreeze}><LockKeyhole aria-hidden="true" />محاولة التجميد</button>
          </>
        }
      />
      <div className="orp-eligibility-posture">
        <div>
          <span>حالة الانتقال المشتقة</span>
          <strong>{activePack.activationStatus === 'not-eligible' ? 'غير مؤهلة' : activePack.activationStatus}</strong>
          <small>ما قبل التجميد: محجوب {failedPreFreezeCount.toLocaleString('ar-SA')} من {preFreezeEligibility.length.toLocaleString('ar-SA')}</small>
        </div>
        <div>
          <span>ما قبل التفعيل</span>
          <strong>محجوب</strong>
          <small>محجوب {failedPreActivationCount.toLocaleString('ar-SA')} من {preActivationEligibility.length.toLocaleString('ar-SA')}</small>
        </div>
        <div><span>الجاهزية التشغيلية</span><strong>لا يمكن التحديد</strong><small>حتى الأساس المفعّل يحتاج تقييم أدلة لاحقًا</small></div>
        <div><span>المراجعة المحلية</span><strong>R{activePack.revision}</strong><small>{activeRevision.status}</small></div>
      </div>
      <div className="orp-authority-contract-inline" data-testid="eligibility-authority-contract">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>عقد السلطات: {authorityContractMismatchCount === 0 ? 'الإسقاط مطابق لسياسة المنصة' : 'يوجد عدم تطابق يمنع الانتقال'}</strong>
          <span>
            {authorityContract.length.toLocaleString('ar-SA')} واجبات مشتقة · {' '}
            {assignedAuthorityContractCount.toLocaleString('ar-SA')} تعيينات صالحة · {' '}
            {(authorityContract.length - assignedAuthorityContractCount).toLocaleString('ar-SA')} واجبات غير مغطاة · {' '}
            {activeAuthorityTriggerCount.toLocaleString('ar-SA')} محفزات نشطة
          </span>
        </div>
      </div>
      <section
        className="orp-custody-boundaries"
        aria-label="حدود حيازة السلطة والمصدر والمراجعة"
      >
        <article data-testid="authority-topology-custody">
          <ShieldCheck aria-hidden="true" />
          <div>
            <span>طوبولوجيا السلطات</span>
            <strong>
              {trustStatus.valid ? 'محمية بجذر الثقة' : 'تعذر إثبات الحماية'}
            </strong>
            <small>لا يستطيع مالك المتطلبات استبدال ممثل سلطة أو تغيير نوعها أو نطاقها.</small>
          </div>
        </article>
        <article data-testid="source-trace-custody">
          <Fingerprint aria-hidden="true" />
          <div>
            <span>هوية أثر المصدر</span>
            <strong>
              {trustStatus.valid ? 'ثابتة وغير قابلة لإعادة الربط' : 'سلسلة المصدر غير مثبتة'}
            </strong>
            <small>تغير البايتات أو المراجعة أو المعنى يحتاج أثرًا جديدًا وتسلسل أب صحيحًا.</small>
          </div>
        </article>
        <article data-testid="exact-revision-custody">
          <LockKeyhole aria-hidden="true" />
          <div>
            <span>المراجعة القانونية</span>
            <strong>
              {trustStatus.valid ? 'تطابق مراجعة موثوقة بعينها' : 'المراجعة الدقيقة مطلوبة'}
            </strong>
            <small>تطابق المشروع وحده لا يتيح الأدلة أو دفتر الإعفاءات.</small>
          </div>
        </article>
        <article data-testid="activation-evidence-actor-custody">
          <ShieldAlert aria-hidden="true" />
          <div>
            <span>هوية دليل التفعيل</span>
            <strong>
              {trustStatus.evidenceRegistryStatus === 'trusted'
                ? 'مرتبطة بالموقّع والسلطة'
                : 'دليل تفعيل موثوق غير متاح'}
            </strong>
            <small>دليل صادر لممثل سابق لا يجيز لممثل بديل تنفيذ التفعيل.</small>
          </div>
        </article>
        <article data-testid="waiver-ledger-exact-custody">
          <GitBranch aria-hidden="true" />
          <div>
            <span>دفتر الإعفاءات</span>
            <strong>
              {trustStatus.waiverLedgerStatus === 'trusted'
                ? 'متصل بالرأس الموثوق'
                : 'دفتر الإعفاءات غير متاح'}
            </strong>
            <small>الإلغاء أو الاستبدال يحتاج الرأس السابق نفسه ولا يسمح بإعادة ضبط التاريخ.</small>
          </div>
        </article>
      </section>
      {freezeMessage ? <div data-testid="freeze-blocked-message" className="orp-freeze-message"><LockKeyhole aria-hidden="true" /><span>{freezeMessage}</span></div> : null}
      {renderGateGroup(
        'pre-freeze',
        'بوابات ما قبل التجميد',
        'لا تتطلب أن تكون الحزمة مجمدة مسبقًا، وتتحقق من المصدر والملكية والسياسات والتعارضات والسلطات.',
        preFreezeEligibility
      )}
      {renderGateGroup(
        'pre-activation',
        'بوابات ما قبل التفعيل',
        'تقبل مراجعة مرشحة مجمدة فقط، ثم تتطلب سلطة تفعيل مستقلة ودليل قرار مرتبط بالمراجعة.',
        preActivationEligibility
      )}
      <section className="orp-revision-console">
        <header>
          <div><GitCompareArrows aria-hidden="true" /><div><span>سجل مرشح غير قابل للكتابة فوقه</span><h3>المراجعات والفروقات</h3></div></div>
          <button data-testid="candidate-rollback-r1" type="button" onClick={rollbackToInitial}><RotateCcw aria-hidden="true" />الرجوع إلى R1</button>
        </header>
        <div>
          {authoringState.revisions.map((revision) => (
            <article key={revision.revisionId} className={revision.revisionId === authoringState.activeRevisionId ? 'is-active' : ''}>
              <b>R{revision.revision}</b>
              <div><strong>{revision.changeReason}</strong><span>{revision.status} · {revision.diff.length} تغييرات</span></div>
              <StatusPill value={revision.status === 'quarantined' ? 'blocked' : revision.status === 'active-candidate' ? 'assigned' : 'neutral'} label={revision.revisionId === authoringState.activeRevisionId ? 'النشطة محليًا' : revision.status} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderCurrentView = () => {
    switch (view) {
      case 'summary': return renderSummary();
      case 'sources': return renderSources();
      case 'workstreams': return renderWorkstreams();
      case 'requirements': return renderRequirements();
      case 'authorities': return renderAuthorities();
      case 'evidence': return renderEvidence();
      case 'spatial': return renderSpatial();
      case 'eligibility': return renderEligibility();
    }
  };

  return (
    <section
      data-testid="operational-readiness-pack-workspace"
      className="orp-workspace"
      lang="ar"
      dir="rtl"
    >
      <header className="orp-topbar">
        <div className="orp-project-identity">
          <span>حزمة جاهزية تشغيلية مرشحة</span>
          <h1>{projectNameAr}</h1>
          <p>{eventNameAr} · إعداد حزمة الجاهزية التشغيلية</p>
        </div>
        <div className="orp-topbar-truth">
          <div><span>الجاهزية التشغيلية</span><strong>غير مقيمة · لا يمكن التحديد</strong></div>
          <div><span>حالة الحزمة</span><strong>مرشح للمراجعة · R{activePack.revision}</strong></div>
          <button type="button" onClick={() => setTechnicalDrawerOpen(true)}><Fingerprint aria-hidden="true" /><span>الحقيقة التقنية</span></button>
        </div>
      </header>

      <div className="orp-body">
        <nav className="orp-nav" aria-label="أقسام حزمة الجاهزية">
          <div className="orp-nav-mark"><LayoutDashboard aria-hidden="true" /><span>{activePack.displayConfig.shortLabelAr}</span></div>
          {viewDefinitions.map((definition) => {
            const Icon = definition.icon;
            return (
              <button
                type="button"
                key={definition.id}
                data-testid={`readiness-pack-view-${definition.id}`}
                className={view === definition.id ? 'is-active' : ''}
                aria-current={view === definition.id ? 'page' : undefined}
                title={definition.labelAr}
                onClick={() => setView(definition.id)}
              >
                <Icon aria-hidden="true" />
                <span>{definition.shortAr}</span>
              </button>
            );
          })}
        </nav>
        <main ref={contentRef} className="orp-content command-scrollbar">
          {renderCurrentView()}
        </main>
      </div>

      {selectedTrace ? (
        <div className="orp-drawer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setSelectedTraceId(null);
        }}>
          <aside data-testid="source-trace-drawer" className="orp-side-drawer" role="dialog" aria-modal="true" aria-label="تفاصيل محدد المصدر">
            <header><div><span>محدد مصدر دقيق</span><h2>{selectedTrace.sanitizedSourceLabel}</h2></div><button type="button" aria-label="إغلاق محدد المصدر" onClick={() => setSelectedTraceId(null)}><X aria-hidden="true" /></button></header>
            <StatusPill value={selectedTrace.reviewStatus} label={selectedTrace.reviewStatus === 'conflicted' ? 'متعارض' : 'مراجع'} />
            <section><span>المعنى التشغيلي المستخرج</span><p>{selectedTrace.extractedMeaning}</p></section>
            <dl>
              <div><dt>المحدد</dt><dd>{sourceLocator(selectedTrace)}</dd></div>
              <div><dt>الثقة</dt><dd>{selectedTrace.extractionConfidence}</dd></div>
              <div><dt>المراجعة</dt><dd>{selectedTrace.reviewStatus}</dd></div>
              <div><dt>المصدر</dt><dd>{activePack.sourceRegistry.find((source) => source.sourceId === selectedTrace.sourceId)?.originalFilename}</dd></div>
            </dl>
            <button type="button" className="orp-secondary-button" onClick={() => setTechnicalDrawerOpen(true)}><Fingerprint aria-hidden="true" />البصمة والمعرّفات</button>
          </aside>
        </div>
      ) : null}

      {editingRequirementId ? (
        <div className="orp-drawer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setEditingRequirementId(null);
        }}>
          <aside data-testid="candidate-edit-drawer" className="orp-side-drawer orp-edit-drawer" role="dialog" aria-modal="true" aria-label="تحرير متطلب مرشح">
            <header><div><span>تأليف محلي محكوم</span><h2>تحرير تعريف الإكمال المرشح</h2></div><button type="button" aria-label="إغلاق التحرير" onClick={() => setEditingRequirementId(null)}><X aria-hidden="true" /></button></header>
            <div className="orp-edit-warning"><AlertTriangle aria-hidden="true" /><span>هذا التعديل لا يثبت الإنجاز ولا يغير الجاهزية أو الأساس.</span></div>
            <label>
              <span>تعريف الإكمال المرشح</span>
              <textarea value={editCompletionDefinition} onChange={(event) => setEditCompletionDefinition(event.target.value)} rows={5} />
            </label>
            <label>
              <span>سبب التغيير الإلزامي</span>
              <textarea value={editReason} onChange={(event) => setEditReason(event.target.value)} rows={3} placeholder="لماذا يجب إنشاء مراجعة جديدة؟" />
            </label>
            {authoringMessage ? <p data-testid="candidate-authoring-message" className="orp-authoring-message">{authoringMessage}</p> : null}
            {previewRevision ? (
              <section data-testid="candidate-revision-diff" className="orp-diff-preview">
                <header><GitCompareArrows aria-hidden="true" /><div><span>قبل / بعد</span><strong>{previewRevision.diff.length} تغييرات</strong></div></header>
                <div>
                  {previewRevision.diff.slice(0, 8).map((entry) => (
                    <article key={entry.path}>
                      <span>{entry.impact}</span>
                      <strong>{entry.path.split('.').at(-1)}</strong>
                      <small>{diffValue(entry.before)} ← {diffValue(entry.after)}</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            <div className="orp-drawer-actions">
              {!previewRevision ? (
                <button data-testid="candidate-edit-preview" type="button" className="orp-primary-button" onClick={previewEdit}><GitCompareArrows aria-hidden="true" />معاينة مراجعة جديدة</button>
              ) : (
                <button data-testid="candidate-edit-apply" type="button" className="orp-primary-button" onClick={applyPreview}><Check aria-hidden="true" />عرض المسودة محليًا</button>
              )}
              <button type="button" className="orp-secondary-button" onClick={() => setEditingRequirementId(null)}><X aria-hidden="true" />إلغاء</button>
            </div>
          </aside>
        </div>
      ) : null}

      {technicalDrawerOpen ? (
        <div className="orp-drawer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setTechnicalDrawerOpen(false);
        }}>
          <aside data-testid="readiness-pack-technical-drawer" className="orp-side-drawer orp-technical-drawer" role="dialog" aria-modal="true" aria-label="الحقيقة التقنية للحزمة">
            <header><div><span>إفصاح تقني</span><h2>الهوية والبصمات والمحددات</h2></div><button type="button" aria-label="إغلاق الحقيقة التقنية" onClick={() => setTechnicalDrawerOpen(false)}><X aria-hidden="true" /></button></header>
            <dl>
              <div><dt>Pack ID</dt><dd dir="ltr">{activePack.id}</dd></div>
              <div><dt>Content SHA-256</dt><dd dir="ltr">{activePack.contentHash}</dd></div>
              <div><dt>Source fingerprint</dt><dd dir="ltr">{activePack.sourceFingerprint}</dd></div>
              <div><dt>Source trace fingerprint</dt><dd dir="ltr">{activePack.sourceTraceFingerprint}</dd></div>
              <div><dt>Authority topology custody</dt><dd dir="ltr">{custodyFingerprints.authorityTopology}</dd></div>
              <div><dt>Source binding custody</dt><dd dir="ltr">{custodyFingerprints.sourceBinding}</dd></div>
              <div><dt>Trace binding custody</dt><dd dir="ltr">{custodyFingerprints.traceBinding}</dd></div>
              <div><dt>Pack status</dt><dd dir="ltr">{activePack.packStatus}</dd></div>
              <div><dt>Activation status</dt><dd dir="ltr">{activePack.activationStatus}</dd></div>
              <div><dt>Frozen source</dt><dd dir="ltr">{activePack.frozenSourceFingerprint ?? 'not-frozen'}</dd></div>
              <div><dt>Frozen source traces</dt><dd dir="ltr">{activePack.frozenSourceTraceFingerprint ?? 'not-frozen'}</dd></div>
              <div><dt>Project</dt><dd dir="ltr">{activePack.projectId}</dd></div>
              <div><dt>Event</dt><dd dir="ltr">{activePack.eventId}</dd></div>
              <div><dt>Venue</dt><dd dir="ltr">{activePack.venueId}</dd></div>
              <div><dt>Model</dt><dd dir="ltr">READINESS-PACK-PREPARATION-v1</dd></div>
              <div><dt>Trust root</dt><dd dir="ltr">{trustStatus.trustRootId ?? 'unavailable'}</dd></div>
              <div><dt>Trust policy</dt><dd dir="ltr">{trustStatus.trustPolicyVersion ?? 'unavailable'}</dd></div>
              <div><dt>Trusted revision head</dt><dd dir="ltr">{trustStatus.trustedRevisionHead ?? 'unavailable'}</dd></div>
              <div><dt>Evidence registry</dt><dd dir="ltr">{trustStatus.evidenceRegistryStatus}</dd></div>
              <div><dt>Waiver ledger</dt><dd dir="ltr">{trustStatus.waiverLedgerStatus}</dd></div>
            </dl>
            <section>
              <span>بصمات المصادر</span>
              {activePack.sourceRegistry.map((source) => (
                <article key={source.sourceId}>
                  <strong>{source.originalFilename}</strong>
                  <code dir="ltr">{source.observedSha256}</code>
                  <small>{source.sourceRevisionId} · الأصل خارج Git وحزمة المراجعة</small>
                </article>
              ))}
            </section>
          </aside>
        </div>
      ) : null}

      {decisionDraft ? (
        <aside data-testid="readiness-pack-decision-draft" className="orp-decision-draft" aria-label="مسودة قرار محلية">
          <header><Gavel aria-hidden="true" /><div><span>Decision Draft · لم تعتمد</span><strong>{decisionDraft.titleAr}</strong></div><button type="button" aria-label="إغلاق مسودة القرار" onClick={() => setDecisionDraft(null)}><X aria-hidden="true" /></button></header>
          <p>{decisionDraft.expectedImpactAr}</p>
          <footer><span>الجاهزية لم تتغير</span><span>الأساس لم يتغير</span><span>الحالة: مسودة</span></footer>
        </aside>
      ) : null}
    </section>
  );
}
