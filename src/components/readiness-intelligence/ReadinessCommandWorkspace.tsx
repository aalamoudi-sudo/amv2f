import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleDashed,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  Fingerprint,
  GitBranch,
  Layers3,
  LockKeyhole,
  MapPinned,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRoundCog,
  X
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { findSpatialCommandExperience } from '../../data/spatialCommandExperiences';
import { createReadinessDecisionDraft } from '../../services/readinessDecisionBridge';
import {
  deriveReadinessSnapshot,
  validateReadinessOperationalPack
} from '../../services/readinessDerivationV2';
import type {
  ReadinessBlocker,
  ReadinessDecisionDraft,
  ReadinessOperationalPack,
  ReadinessPosture,
  ReadinessRequirement,
  ReadinessSourceAuthority
} from '../../types/readinessIntelligence';
import { ReadinessSpatialPanel } from './ReadinessSpatialPanel';
import './readinessCommand.css';

const ReadinessLocalAuthoringPanel = lazy(() => import('./ReadinessLocalAuthoringPanel'));

type ReadinessView = 'overview' | 'matrix' | 'governance' | 'flow' | 'map';
type PolicyPreviewState =
  | 'source-missing'
  | 'evidence-submitted'
  | 'verification-pending'
  | 'internal-approval-pending'
  | 'client-acceptance-pending'
  | 'expired-evidence';

const viewLabels: Record<ReadinessView, string> = {
  overview: 'موقف الافتتاح',
  matrix: 'مصفوفة المتطلبات',
  governance: 'الملكية والسلطات',
  flow: 'الأدلة والاعتماد',
  map: 'الخريطة المرتبطة'
};

const postureLabels: Record<ReadinessPosture, string> = {
  unassessed: 'غير مُقيّم',
  blocked: 'محجوب',
  'at-risk': 'مُعرّض للخطر',
  incomplete: 'قيد الاستكمال',
  'under-review': 'قيد المراجعة',
  'ready-with-conditions': 'جاهز بشروط',
  ready: 'جاهز'
};

const authorityLabels: Record<ReadinessSourceAuthority, string> = {
  'founder-approved-project-governance-source': 'مصدر حوكمة معتمد من المؤسس',
  'founder-approved-cad-source': 'مصدر CAD معتمد من المؤسس',
  'founder-product-authority': 'سلطة المؤسس على المنتج',
  'client-authority': 'سلطة قبول العميل',
  'engineering-authority': 'سلطة هندسية',
  'hse-authority': 'سلطة سلامة',
  'operational-authority': 'سلطة تشغيلية',
  'reported-source': 'مصدر مُبلّغ',
  'temporary-demo': 'عرض مؤقت',
  unknown: 'سلطة غير معروفة'
};

const criticalityOrder: Record<ReadinessBlocker['criticality'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function readInitialView(): ReadinessView {
  const value = new URL(window.location.href).searchParams.get('readinessView');
  return value && Object.hasOwn(viewLabels, value) ? value as ReadinessView : 'overview';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeZone: 'Asia/Riyadh'
  }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-SA').format(value);
}

function coverage(value: number | null): string {
  return value === null ? 'غير قابل للحساب' : `${formatNumber(value)}٪`;
}

function updateReadinessUrl(view: ReadinessView, selection?: { blockerId?: string | null; entityId?: string | null }) {
  const url = new URL(window.location.href);
  url.searchParams.set('readinessView', view);
  if (selection?.blockerId) url.searchParams.set('readinessBlocker', selection.blockerId);
  else url.searchParams.delete('readinessBlocker');
  if (selection?.entityId) url.searchParams.set('readinessEntity', selection.entityId);
  else url.searchParams.delete('readinessEntity');
  window.history.pushState({}, '', url);
}

function sourceFactTone(status: ReadinessOperationalPack['sourceFacts'][number]['status']): string {
  if (status === 'verified-source-fact') return 'is-approved';
  if (status === 'conflicted') return 'is-conflicted';
  if (status === 'missing') return 'is-missing';
  return 'is-reported';
}

function requirementStatusAr(requirement: ReadinessRequirement): string {
  if (!requirement.operationalTruthEligible || requirement.applicability === 'unknown') return 'غير مُقيّم';
  if (requirement.applicability === 'not-applicable') return 'غير منطبق';
  return 'بانتظار تقييم قانوني';
}

function roleLabel(pack: ReadinessOperationalPack, roleId: string | null): string {
  if (!roleId) return 'غير معيّن';
  return pack.roles.find((role) => role.roleId === roleId)?.labelAr ?? 'دور غير معروف';
}

function authorityLabel(pack: ReadinessOperationalPack, authorityId: string | null): string {
  if (!authorityId) return 'جهة الاعتماد غير معيّنة';
  return pack.approvalAuthorities.find((authority) => authority.authorityId === authorityId)?.labelAr
    ?? 'جهة الاعتماد غير معيّنة';
}

function ReadinessPostureBand({
  pack,
  snapshot,
  blocker
}: {
  pack: ReadinessOperationalPack;
  snapshot: ReturnType<typeof deriveReadinessSnapshot>;
  blocker: ReadinessBlocker;
}) {
  const sourceFactsApproved = pack.sourceFacts.filter((fact) => fact.status === 'verified-source-fact').length;
  return (
    <section data-testid="readiness-executive-posture" className={`ri-posture-band is-${snapshot.posture}`}>
      <div className="ri-posture-answer">
        <span>هل يمكن الافتتاح؟</span>
        <strong>{postureLabels[snapshot.posture]}</strong>
        <p>{snapshot.explanationAr[0]}</p>
      </div>
      <div className="ri-posture-divider" aria-hidden="true" />
      <div className="ri-main-blocker">
        <span><ShieldAlert aria-hidden="true" /> العائق الأهم الآن</span>
        <strong>{blocker.titleAr}</strong>
        <p>{blocker.descriptionAr}</p>
      </div>
      <dl className="ri-posture-facts">
        <div><dt>مالك الإجراء</dt><dd>{roleLabel(pack, blocker.ownerRoleId)}</dd></div>
        <div><dt>الدليل المطلوب</dt><dd>{blocker.nextAcceptedEvidenceAr}</dd></div>
        <div><dt>الاعتماد</dt><dd>{authorityLabel(pack, blocker.requiredAuthorityId)}</dd></div>
        <div><dt>حقائق مصدر متحققة</dt><dd>{formatNumber(sourceFactsApproved)} · لا تُثبت الجاهزية</dd></div>
      </dl>
    </section>
  );
}

function CompactReadinessContextBar({
  pack,
  snapshot,
  blocker,
  expanded,
  onToggle
}: {
  pack: ReadinessOperationalPack;
  snapshot: ReturnType<typeof deriveReadinessSnapshot>;
  blocker: ReadinessBlocker;
  expanded: boolean;
  onToggle: () => void;
}) {
  const verifiedSourceFacts = pack.sourceFacts.filter((fact) => fact.status === 'verified-source-fact').length;
  return (
    <section
      data-testid="readiness-compact-context"
      className={`ri-compact-context ${expanded ? 'is-expanded' : ''}`}
      aria-label="سياق الجاهزية المضغوط"
    >
      <div className="ri-compact-context-summary">
        <div className="ri-compact-posture">
          <span>موقف الافتتاح</span>
          <strong>{postureLabels[snapshot.posture]}</strong>
        </div>
        <div>
          <span>العائق الأهم</span>
          <strong>{blocker.titleAr}</strong>
        </div>
        <div>
          <span>الإجراء التالي</span>
          <strong>{blocker.requiredAction}</strong>
        </div>
        <div className="ri-compact-truth">
          <span>حقيقة المصدر</span>
          <strong>تحضير مصدر · لا baseline</strong>
          <small>{formatNumber(verifiedSourceFacts)} حقائق مصدر متحققة لا تثبت الجاهزية</small>
        </div>
        <button
          data-testid="readiness-compact-context-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="readiness-compact-context-details"
          onClick={onToggle}
        >
          {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل الكاملة'}
        </button>
      </div>
      {expanded ? (
        <div id="readiness-compact-context-details" data-testid="readiness-compact-context-details" className="ri-compact-context-details">
          <dl>
            <div><dt>سبب الموقف</dt><dd>{snapshot.explanationAr[0]}</dd></div>
            <div><dt>مالك الإجراء</dt><dd>{roleLabel(pack, blocker.ownerRoleId)}</dd></div>
            <div><dt>الدليل المقبول التالي</dt><dd>{blocker.nextAcceptedEvidenceAr}</dd></div>
            <div><dt>جهة الاعتماد</dt><dd>{authorityLabel(pack, blocker.requiredAuthorityId)}</dd></div>
          </dl>
          <div className="ri-compact-source-facts" aria-label="تفاصيل حقائق المصادر">
            {pack.sourceFacts.slice(0, 5).map((fact) => (
              <span key={fact.sourceFactId} className={sourceFactTone(fact.status)}>
                {fact.status === 'verified-source-fact' ? <ShieldCheck aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
                <strong>{fact.labelAr}</strong>
                <small>{fact.operationalInferenceAllowed ? 'يمكن الاستدلال التشغيلي' : 'لا تستنتج جاهزية'}</small>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CriticalBlockerStrip({
  pack,
  blockers,
  selectedId,
  onSelect,
  onCreateDraft
}: {
  pack: ReadinessOperationalPack;
  blockers: ReadinessBlocker[];
  selectedId: string;
  onSelect: (blockerId: string) => void;
  onCreateDraft: (blocker: ReadinessBlocker) => void;
}) {
  const selected = blockers.find((blocker) => blocker.blockerId === selectedId) ?? blockers[0]!;
  return (
    <section data-testid="readiness-critical-command-strip" className="ri-blocker-strip">
      <div className="ri-blocker-list" aria-label="عوائق الجاهزية">
        {blockers.map((blocker, index) => (
          <button
            key={blocker.blockerId}
            data-testid={`readiness-blocker-${blocker.blockerId}`}
            type="button"
            className={blocker.blockerId === selected.blockerId ? 'is-selected' : undefined}
            onClick={() => onSelect(blocker.blockerId)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{blocker.titleAr}</strong><small>{blocker.criticality === 'critical' ? 'حرج' : 'مرتفع'} · {blocker.status === 'open' ? 'مفتوح' : blocker.status}</small></div>
          </button>
        ))}
      </div>
      <div className="ri-blocker-command">
        <div>
          <span>الإجراء التالي المقبول</span>
          <strong>{selected.requiredAction}</strong>
          <small>{roleLabel(pack, selected.responsibleRoleId)} · التصعيد {selected.escalationLevel}</small>
        </div>
        <button
          data-testid="create-readiness-decision-draft"
          type="button"
          disabled={!selected.decisionRequired}
          onClick={() => onCreateDraft(selected)}
        >
          <GitBranch aria-hidden="true" />
          {selected.decisionRequired ? 'إنشاء مسودة قرار' : 'لا يتطلب قرارًا الآن'}
        </button>
      </div>
    </section>
  );
}

function ReadinessOverview({
  pack,
  spatialConfigurationId,
  blockers,
  selectedBlocker,
  selectedEntityId,
  onSelectBlocker,
  onSelectEntity,
  onOpenMatrix
}: {
  pack: ReadinessOperationalPack;
  spatialConfigurationId: string | null;
  blockers: ReadinessBlocker[];
  selectedBlocker: ReadinessBlocker;
  selectedEntityId: string | null;
  onSelectBlocker: (id: string) => void;
  onSelectEntity: (id: string | null) => void;
  onOpenMatrix: () => void;
}) {
  return (
    <div data-testid="readiness-overview" className="ri-overview">
      <aside className="ri-action-rail">
        <header><span>ما يحتاج إغلاقًا</span><strong>{blockers.length} عوائق ظاهرة</strong></header>
        <div>
          {blockers.map((blocker) => (
            <button
              key={blocker.blockerId}
              type="button"
              className={selectedBlocker.blockerId === blocker.blockerId ? 'is-active' : undefined}
              onClick={() => onSelectBlocker(blocker.blockerId)}
            >
              <i data-criticality={blocker.criticality} />
              <span><strong>{blocker.titleAr}</strong><small>{roleLabel(pack, blocker.ownerRoleId)}</small></span>
              <ChevronLeft aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" className="ri-text-action" onClick={onOpenMatrix}>فتح مصفوفة المتطلبات <ArrowLeft aria-hidden="true" /></button>
      </aside>
      <ReadinessSpatialPanel
        configurationId={spatialConfigurationId}
        projectId={pack.projectId}
        eventId={pack.eventId}
        venueId={pack.venueId}
        blocker={selectedBlocker}
        selectedEntityId={selectedEntityId}
        onSelectEntity={onSelectEntity}
      />
      <aside data-testid="readiness-blocker-inspector" className="ri-inspector">
        <header>
          <span data-criticality={selectedBlocker.criticality}>{selectedBlocker.criticality === 'critical' ? 'عائق حرج' : 'عائق مرتفع'}</span>
          <strong>{selectedBlocker.titleAr}</strong>
        </header>
        <dl>
          <div><dt>النطاق</dt><dd>{selectedBlocker.category}</dd></div>
          <div><dt>المسؤول</dt><dd>{roleLabel(pack, selectedBlocker.responsibleRoleId)}</dd></div>
          <div><dt>المعتمد</dt><dd>{authorityLabel(pack, selectedBlocker.requiredAuthorityId)}</dd></div>
          <div><dt>الوقت</dt><dd>{selectedBlocker.dueAt ? formatDate(selectedBlocker.dueAt) : 'لم يُعتمد موعد'}</dd></div>
          <div><dt>فجوة الدليل</dt><dd>{selectedBlocker.nextAcceptedEvidenceAr}</dd></div>
        </dl>
        <p><AlertTriangle aria-hidden="true" /> {selectedBlocker.decisionRequiredAr}</p>
        {selectedEntityId ? (
          <div className="ri-selected-entity">
            <span>العنصر المحدد على الخريطة</span>
            <bdi dir="ltr">{selectedEntityId}</bdi>
            <small>الموضع لا يثبت الجاهزية أو الإنجاز.</small>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function RequirementMatrix({
  pack,
  query,
  onQueryChange
}: {
  pack: ReadinessOperationalPack;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [domainId, setDomainId] = useState('all');
  const [workstreamId, setWorkstreamId] = useState('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'critical' | 'owner-missing'>('all');
  const workstreamRoles = pack.roles.filter((role) => role.workstreamId !== null);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('ar'));
  const requirements = pack.requirements.filter((requirement) => {
    if (domainId !== 'all' && requirement.domainId !== domainId) return false;
    if (workstreamId !== 'all') {
      const relatedRoleIds = [requirement.ownerRoleId, requirement.responsibleRoleId].filter(Boolean);
      const matchesWorkstream = workstreamRoles.some((role) => (
        role.workstreamId === workstreamId && relatedRoleIds.includes(role.roleId)
      ));
      if (!matchesWorkstream) return false;
    }
    if (stateFilter === 'critical' && requirement.criticality !== 'critical') return false;
    if (stateFilter === 'owner-missing' && requirement.ownerRoleId !== null) return false;
    if (!deferredQuery) return true;
    return [
      requirement.titleAr,
      requirement.titleEn,
      requirement.requirementId,
      requirement.descriptionAr
    ].some((value) => value.toLocaleLowerCase('ar').includes(deferredQuery));
  });
  return (
    <section data-testid="readiness-requirement-matrix" className="ri-matrix-view">
      <header>
        <div><span>مقارنة قابلة للتفسير</span><h2>مصفوفة تحضير متطلبات الجاهزية</h2><p>هذه عناصر تحضير غير مؤهلة للحقيقة التشغيلية حتى اعتماد حزمة متطلبات فعلية.</p></div>
        <div className="ri-matrix-filters">
          <label><Search aria-hidden="true" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="بحث بالمتطلب أو المعرّف" aria-label="بحث في متطلبات الجاهزية" /></label>
          <select value={domainId} aria-label="فلترة حسب المجال" onChange={(event) => setDomainId(event.target.value)}>
            <option value="all">كل المجالات</option>
            {pack.domains.map((domain) => <option key={domain.domainId} value={domain.domainId}>{domain.labelAr}</option>)}
          </select>
          <select data-testid="readiness-workstream-filter" value={workstreamId} aria-label="فلترة حسب مسار العمل" onChange={(event) => setWorkstreamId(event.target.value)}>
            <option value="all">كل مسارات العمل</option>
            {workstreamRoles.map((role) => <option key={role.workstreamId} value={role.workstreamId!}>{role.labelAr}</option>)}
          </select>
          <select value={stateFilter} aria-label="فلترة حسب الحالة" onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}>
            <option value="all">كل الحالات</option>
            <option value="critical">حرجة فقط</option>
            <option value="owner-missing">المالك غير معيّن</option>
          </select>
        </div>
      </header>
      <div className="ri-table-scroll">
        <table>
          <thead><tr><th>المتطلب</th><th>المجال</th><th>الحقيقة الحالية</th><th>المالك</th><th>التحقق</th><th>الاعتماد</th></tr></thead>
          <tbody>
            {requirements.map((requirement) => (
              <tr key={requirement.requirementId}>
                <td><strong>{requirement.titleAr}</strong><small><bdi dir="ltr">{requirement.requirementId}</bdi></small></td>
                <td>{pack.domains.find((domain) => domain.domainId === requirement.domainId)?.labelAr ?? requirement.category}</td>
                <td><span className="ri-state-pill is-unknown">{requirementStatusAr(requirement)}</span></td>
                <td>{roleLabel(pack, requirement.ownerRoleId)}</td>
                <td>لم يبدأ</td>
                <td>{requirement.approvingRoleId ? roleLabel(pack, requirement.approvingRoleId) : 'جهة غير معيّنة'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!requirements.length ? <p className="ri-table-empty">لا توجد عناصر تطابق الفلاتر الحالية.</p> : null}
      </div>
      <footer>
        <span>المعروض {formatNumber(requirements.length)} من {formatNumber(pack.requirements.length)}</span>
        <span>لا تُحوّل unknown إلى 0%</span>
      </footer>
    </section>
  );
}

function GovernanceView({ pack }: { pack: ReadinessOperationalPack }) {
  const conflict = pack.roleAssignments.find((assignment) => assignment.assignmentStatus === 'conflicted');
  return (
    <section data-testid="readiness-governance-view" className="ri-governance-view">
      <header><span>حوكمة مستخرجة من المصدر المعتمد</span><h2>من ينفذ، من يراجع، ومن يعتمد؟</h2><p>المسمى المؤسسي والدور في المشروع وسلطة الاعتماد حقائق مستقلة.</p></header>
      <div className="ri-governance-layout">
        <div className="ri-governance-chain">
          {pack.processStages.map((stage) => (
            <article key={stage.processStageId}>
              <span>{stage.order}</span>
              <div><strong>{stage.labelAr}</strong><small>{stage.requiredRoleIds.map((roleId) => roleLabel(pack, roleId)).join(' · ')}</small></div>
              {stage.requiredAuthorityIds.length ? <BadgeCheck aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
            </article>
          ))}
        </div>
        <div className="ri-authority-board">
          <header><ShieldCheck aria-hidden="true" /><strong>مجالات السلطة منفصلة</strong></header>
          {pack.approvalAuthorities.map((authority) => (
            <article key={authority.authorityId} data-assignment={authority.assignmentStatus}>
              <span>{authority.authorityType}</span>
              <strong>{authority.labelAr}</strong>
              <small>{authority.assignmentStatus === 'assigned' ? 'الدور موثق في المصدر' : 'جهة الاعتماد غير معيّنة'}</small>
            </article>
          ))}
        </div>
        <article data-testid="execution-assignment-conflict" className="ri-conflict-panel">
          <ShieldAlert aria-hidden="true" />
          <div>
            <span>assignmentStatus = conflicted</span>
            <h3>تعيين مسؤول مسار التنفيذ متعارض</h3>
            <p>المخطط التنظيمي وجدول المسؤوليات يقدمان مرشحين مختلفين. لم يختر النظام أحدهما ولم يمنح سلطة إنتاجية.</p>
            <small>{conflict?.sourceRefs.join(' · ')}</small>
          </div>
          <strong>لا يحجب المسارات غير المرتبطة بالتنفيذ</strong>
        </article>
      </div>
    </section>
  );
}

function FlowStage({
  label,
  state,
  active
}: {
  label: string;
  state: string;
  active?: boolean;
}) {
  return (
    <article className={active ? 'is-active' : undefined}>
      <span>{active ? <CircleDashed aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</span>
      <strong>{label}</strong>
      <small>{state}</small>
    </article>
  );
}

function EvidenceApprovalFlow({ pack }: { pack: ReadinessOperationalPack }) {
  const [preview, setPreview] = useState<PolicyPreviewState>('source-missing');
  const previewLabels: Record<PolicyPreviewState, string> = {
    'source-missing': 'KAP الآن: متطلبات غير مسلّمة',
    'evidence-submitted': 'مثال سياسة: دليل مرفق',
    'verification-pending': 'مثال سياسة: تحقق معلّق',
    'internal-approval-pending': 'مثال سياسة: اعتماد داخلي معلّق',
    'client-acceptance-pending': 'مثال سياسة: قبول العميل معلّق',
    'expired-evidence': 'مثال سياسة: دليل منتهي'
  };
  const activeIndex = {
    'source-missing': 0,
    'evidence-submitted': 1,
    'verification-pending': 2,
    'internal-approval-pending': 3,
    'client-acceptance-pending': 4,
    'expired-evidence': 1
  }[preview];
  const stageStates = preview === 'source-missing'
    ? ['غير موجود', 'لم يبدأ', 'لم يبدأ', 'لم يبدأ', 'لم يبدأ', 'غير محسوم']
    : preview === 'expired-evidence'
      ? ['مُعرّف', 'منتهي الصلاحية', 'ملغى', 'لم يبدأ', 'لم يبدأ', 'فشل']
      : ['مُعرّف', 'مرفق لا يعني متحققًا', 'قيد الانتظار', 'قيد الانتظار', 'قيد الانتظار', 'معلّق'];
  return (
    <section data-testid="readiness-evidence-approval-flow" className="ri-flow-view">
      <header>
        <div><span>مسار ثقة صريح</span><h2>من المتطلب إلى نتيجة البوابة</h2><p>كل انتقال يحتاج دليلًا وسلطة مستقلة؛ لا توجد قفزة من التقرير إلى الاعتماد.</p></div>
        <label>
          <span>معاينة حالة السياسة</span>
          <select data-testid="readiness-policy-preview" value={preview} onChange={(event) => setPreview(event.target.value as PolicyPreviewState)}>
            {Object.entries(previewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </header>
      <p className="ri-policy-preview-warning"><BookOpenCheck aria-hidden="true" /> {preview === 'source-missing' ? 'حقيقة KAP الحالية' : 'معاينة سياسة عامة غير تشغيلية؛ لا تغيّر KAP'}</p>
      <div className="ri-trust-flow">
        {[
          'المتطلب',
          'الدليل',
          'التحقق',
          'اعتماد داخلي',
          'قبول العميل',
          'نتيجة البوابة'
        ].map((label, index) => <FlowStage key={label} label={label} state={stageStates[index]!} active={index === activeIndex} />)}
      </div>
      <div className="ri-process-register">
        <header><ClipboardCheck aria-hidden="true" /><div><strong>مسار المشروع المعتمد</strong><small>خمسة مراحل · المصدر لا يثبت تنفيذها الحالي</small></div></header>
        {pack.processStages.map((stage) => (
          <article key={stage.processStageId}>
            <span>{stage.order}</span>
            <strong>{stage.labelAr}</strong>
            <small>{stage.requiredAuthorityIds.length ? authorityLabel(pack, stage.requiredAuthorityIds[0]!) : 'توثيق مسؤولية المرحلة'}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceTruthDrawer({
  pack,
  snapshotHash,
  open,
  onClose
}: {
  pack: ReadinessOperationalPack;
  snapshotHash: string;
  open: boolean;
  onClose: () => void;
}) {
  const validation = validateReadinessOperationalPack(pack);
  if (!open) return null;
  return (
    <div className="ri-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside data-testid="readiness-source-truth-drawer" className="ri-truth-drawer" role="dialog" aria-modal="true" aria-label="تفاصيل حقيقة الجاهزية">
        <header><div><span>تفاصيل تقنية عند الطلب</span><h2>مصدر الحقيقة والاشتقاق</h2></div><button type="button" aria-label="إغلاق تفاصيل الحقيقة" onClick={onClose}><X aria-hidden="true" /></button></header>
        <section>
          <h3><Fingerprint aria-hidden="true" /> البصمات</h3>
          <dl>
            <div><dt>حزمة الجاهزية</dt><dd><bdi dir="ltr">{pack.contentHash}</bdi></dd></div>
            <div><dt>لقطة الاشتقاق</dt><dd><bdi dir="ltr">{snapshotHash}</bdi></dd></div>
            <div><dt>السياسة</dt><dd><bdi dir="ltr">{pack.policyVersion}</bdi></dd></div>
          </dl>
        </section>
        <section>
          <h3><FileCheck2 aria-hidden="true" /> المصادر المسجلة</h3>
          {pack.sourceFacts.map((fact) => (
            <article key={fact.sourceFactId}>
              <strong>{fact.labelAr}</strong>
              <span>{authorityLabels[fact.authority]}</span>
              <bdi dir="ltr">{fact.sourceAssetId}</bdi>
              {fact.sourceFingerprint ? <code>{fact.sourceFingerprint}</code> : null}
              <small>{fact.sourceByteSize ? `${fact.sourceByteSize.toLocaleString('en-US')} bytes` : fact.evidenceAr}</small>
            </article>
          ))}
        </section>
        <section data-testid="readiness-authoring-validation">
          <h3><Boxes aria-hidden="true" /> حدود التأليف المحلي</h3>
          <p>المعاينة والتحقق والمراجعات المحلية لا تنشئ backend اعتماد ولا تغيّر baseline.</p>
          <div className={validation.valid ? 'ri-validation-pass' : 'ri-validation-fail'}>
            {validation.valid ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
            <strong>{validation.valid ? 'الحزمة صالحة كتحضير مصدر' : 'الحزمة محجوبة'}</strong>
            <span>{validation.issues.length} ملاحظات تحقق</span>
          </div>
          <Suspense fallback={<p>جارٍ تحميل أدوات التأليف المحلية…</p>}>
            <ReadinessLocalAuthoringPanel pack={pack} />
          </Suspense>
        </section>
      </aside>
    </div>
  );
}

function DecisionDraftPanel({
  draft,
  onClose
}: {
  draft: ReadinessDecisionDraft;
  onClose: () => void;
}) {
  return (
    <section data-testid="readiness-decision-draft" className="ri-decision-draft" role="status">
      <GitBranch aria-hidden="true" />
      <div>
        <span>مسودة قرار محلية · غير معتمدة</span>
        <strong>{draft.requiredActionAr}</strong>
        <small><bdi dir="ltr">{draft.decisionDraftId}</bdi> · لا تغيّر الجاهزية</small>
      </div>
      <button type="button" onClick={onClose}>إغلاق</button>
    </section>
  );
}

export function ReadinessCommandWorkspace({
  pack,
  projectNameAr,
  eventNameAr,
  spatialConfigurationId = null,
  onOpenOperationalPack
}: {
  pack: ReadinessOperationalPack;
  projectNameAr: string;
  eventNameAr: string;
  spatialConfigurationId?: string | null;
  onOpenOperationalPack?: () => void;
}) {
  const [view, setView] = useState<ReadinessView>(readInitialView);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matrixQuery, setMatrixQuery] = useState('');
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [compactContextExpanded, setCompactContextExpanded] = useState(false);
  const [selectedBlockerId, setSelectedBlockerId] = useState(() => (
    new URL(window.location.href).searchParams.get('readinessBlocker')
    ?? pack.blockers[0]?.blockerId
    ?? ''
  ));
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() => (
    new URL(window.location.href).searchParams.get('readinessEntity')
  ));
  const [decisionDraft, setDecisionDraft] = useState<ReadinessDecisionDraft | null>(null);
  const viewContentRef = useRef<HTMLElement>(null);
  const snapshot = useMemo(() => deriveReadinessSnapshot({
    pack,
    generatedAt: pack.effectiveAt,
    freshnessPolicyMs: 7 * 24 * 60 * 60 * 1000
  }), [pack]);
  const blockers = useMemo(() => [...pack.blockers].sort((left, right) => (
    criticalityOrder[right.criticality] - criticalityOrder[left.criticality]
    || left.titleAr.localeCompare(right.titleAr, 'ar')
  )), [pack.blockers]);
  const selectedBlocker = blockers.find((blocker) => blocker.blockerId === selectedBlockerId) ?? blockers[0]!;
  const spatialConfiguration = findSpatialCommandExperience(spatialConfigurationId ?? undefined, {
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId
  });
  const selectedSpatialEntity = spatialConfiguration?.candidateEntities.find(
    (entity) => entity.candidateId === selectedEntityId
  ) ?? null;
  const selectedSpatialDecision = spatialConfiguration?.spatialTruthPack.semanticDecisions.find(
    (decision) => decision.targetId === selectedEntityId
  );
  const selectedSpatialLabel = selectedSpatialDecision?.primaryLabelAr
    ?? selectedSpatialEntity?.labelAr
    ?? null;
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('ar'));
  const searchResults = useMemo(() => {
    if (!deferredQuery) return [];
    const results = [
      ...pack.requirements.map((requirement) => ({
        id: requirement.requirementId,
        label: requirement.titleAr,
        meta: 'متطلب تحضير',
        target: 'matrix' as const
      })),
      ...pack.blockers.map((blocker) => ({
        id: blocker.blockerId,
        label: blocker.titleAr,
        meta: 'عائق جاهزية',
        target: 'blocker' as const
      })),
      ...pack.roles.map((role) => ({
        id: role.roleId,
        label: role.labelAr,
        meta: 'دور مشروع',
        target: 'governance' as const
      })),
      ...pack.sourceFacts.map((fact) => ({
        id: fact.sourceFactId,
        label: fact.labelAr,
        meta: 'حقيقة مصدر',
        target: 'source' as const
      })),
      ...(spatialConfiguration?.candidateEntities.map((entity) => ({
        id: entity.candidateId,
        label: entity.labelAr,
        meta: 'وجهة مكانية مرشحة',
        target: 'entity' as const
      })) ?? [])
    ];
    return results.filter((result) => (
      [result.id, result.label, result.meta].some((value) => value.toLocaleLowerCase('ar').includes(deferredQuery))
    )).slice(0, 8);
  }, [deferredQuery, pack.blockers, pack.requirements, pack.roles, pack.sourceFacts, spatialConfiguration]);

  useEffect(() => {
    const sync = () => {
      const url = new URL(window.location.href);
      const requestedView = url.searchParams.get('readinessView');
      setView(
        requestedView && Object.hasOwn(viewLabels, requestedView)
          ? requestedView as ReadinessView
          : 'overview'
      );
      setCompactContextExpanded(false);
      setSelectedBlockerId(url.searchParams.get('readinessBlocker') ?? blockers[0]!.blockerId);
      setSelectedEntityId(url.searchParams.get('readinessEntity'));
    };
    // Capture before the app-shell route listener can replace this nested workspace.
    window.addEventListener('popstate', sync, { capture: true });
    window.addEventListener('mayadeen:location-synced', sync);
    return () => {
      window.removeEventListener('popstate', sync, { capture: true });
      window.removeEventListener('mayadeen:location-synced', sync);
    };
  }, [blockers]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const content = viewContentRef.current;
      if (!content) return;
      content.scrollTop = 0;
      content.scrollLeft = 0;
      content
        .querySelectorAll<HTMLElement>('.ri-table-scroll, .ri-governance-layout, .ri-process-register, .ri-map-full > aside')
        .forEach((element) => {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  const openView = (
    nextView: ReadinessView,
    selection?: { blockerId?: string | null; entityId?: string | null }
  ) => {
    setCompactContextExpanded(false);
    setView(nextView);
    const blockerId = selection && Object.hasOwn(selection, 'blockerId')
      ? selection.blockerId
      : selectedBlocker.blockerId;
    const entityId = selection && Object.hasOwn(selection, 'entityId')
      ? selection.entityId
      : selectedEntityId;
    updateReadinessUrl(nextView, { blockerId, entityId });
  };
  const chooseBlocker = (blockerId: string) => {
    setSelectedBlockerId(blockerId);
    updateReadinessUrl(view, { blockerId, entityId: selectedEntityId });
  };
  const chooseEntity = (entityId: string | null) => {
    setSelectedEntityId(entityId);
    updateReadinessUrl(view, { blockerId: selectedBlocker.blockerId, entityId });
  };
  const chooseSearchResult = (result: (typeof searchResults)[number]) => {
    setSearchOpen(false);
    setQuery('');
    if (result.target === 'blocker') {
      setSelectedBlockerId(result.id);
      openView('overview', { blockerId: result.id });
    } else if (result.target === 'matrix') {
      setMatrixQuery(result.label);
      openView('matrix');
    } else if (result.target === 'governance') {
      openView('governance');
    } else if (result.target === 'source') {
      setTechnicalOpen(true);
    } else {
      setSelectedEntityId(result.id);
      openView('map', { entityId: result.id });
    }
  };
  const createDraft = (blocker: ReadinessBlocker) => {
    const gateIds = pack.gates
      .filter((gate) => gate.relatedRequirementIds.some((requirementId) => blocker.relatedRequirementIds.includes(requirementId)))
      .map((gate) => gate.gateId);
    const draft = createReadinessDecisionDraft({
      pack,
      blockerId: blocker.blockerId,
      gateIds,
      createdAt: pack.effectiveAt,
      createdBy: 'LOCAL-FOUNDER-REVIEW-ACTOR'
    });
    setDecisionDraft(draft);
  };

  return (
    <div
      data-testid="readiness-command-workspace"
      data-readiness-posture={snapshot.posture}
      data-readiness-context={pack.stateContext}
      className={`ri-workspace ${view === 'overview' ? 'is-overview-view' : 'is-secondary-view'}`}
      lang="ar"
      dir="rtl"
    >
      <header className="ri-command-header">
        <div>
          <span>Stage 3G.0 · Evidence-Derived Readiness</span>
          <h1>قيادة الجاهزية المبنية على الأدلة</h1>
          <p>{projectNameAr} <i /> {eventNameAr}</p>
        </div>
        <div className="ri-header-tools">
          <span className="ri-context-chip"><CircleDashed aria-hidden="true" /> تحضير مصدر · لا baseline</span>
          <span className="ri-policy-chip"><FileClock aria-hidden="true" /> {pack.policyVersion}</span>
          {onOpenOperationalPack ? <button data-testid="open-operational-readiness-pack" type="button" onClick={onOpenOperationalPack}><Boxes aria-hidden="true" /> إعداد الحزمة</button> : null}
          <button data-testid="readiness-search-toggle" type="button" aria-expanded={searchOpen} onClick={() => setSearchOpen((value) => !value)}><Search aria-hidden="true" /> بحث</button>
          <button data-testid="readiness-technical-drawer-open" type="button" onClick={() => setTechnicalOpen(true)}><Fingerprint aria-hidden="true" /> الحقيقة التقنية</button>
        </div>
        {searchOpen ? (
          <section data-testid="readiness-global-search" className="ri-search-panel">
            <label><Search aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن متطلب، دور، عائق أو وجهة…" aria-label="البحث في قيادة الجاهزية" /></label>
            <div role="listbox">
              {searchResults.map((result) => <button key={`${result.target}:${result.id}`} type="button" role="option" onClick={() => chooseSearchResult(result)}><span>{result.meta}</span><strong>{result.label}</strong><bdi dir="ltr">{result.id}</bdi></button>)}
              {deferredQuery && !searchResults.length ? <p>لا توجد نتيجة داخل المشروع النشط.</p> : null}
            </div>
          </section>
        ) : null}
      </header>

      {view === 'overview' ? (
        <>
          <ReadinessPostureBand pack={pack} snapshot={snapshot} blocker={blockers[0]!} />
          <div className="ri-source-ribbon" aria-label="حقائق المصادر">
            {pack.sourceFacts.slice(0, 5).map((fact) => (
              <span key={fact.sourceFactId} className={sourceFactTone(fact.status)}>
                {fact.status === 'verified-source-fact' ? <ShieldCheck aria-hidden="true" /> : fact.status === 'conflicted' ? <ShieldAlert aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}
                <strong>{fact.labelAr}</strong>
                <small>{fact.operationalInferenceAllowed ? 'يمكن الاستدلال' : 'لا تستنتج جاهزية'}</small>
              </span>
            ))}
          </div>
          <CriticalBlockerStrip
            pack={pack}
            blockers={blockers}
            selectedId={selectedBlocker.blockerId}
            onSelect={chooseBlocker}
            onCreateDraft={createDraft}
          />
        </>
      ) : (
        <CompactReadinessContextBar
          pack={pack}
          snapshot={snapshot}
          blocker={blockers[0]!}
          expanded={compactContextExpanded}
          onToggle={() => setCompactContextExpanded((value) => !value)}
        />
      )}

      <nav className="ri-view-tabs" aria-label="مناظير قيادة الجاهزية">
        {(Object.entries(viewLabels) as Array<[ReadinessView, string]>).map(([id, label]) => (
          <button key={id} data-testid={`readiness-view-${id}`} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => openView(id)}>
            {id === 'overview' ? <ShieldAlert aria-hidden="true" /> : id === 'matrix' ? <Layers3 aria-hidden="true" /> : id === 'governance' ? <UserRoundCog aria-hidden="true" /> : id === 'flow' ? <GitBranch aria-hidden="true" /> : <MapPinned aria-hidden="true" />}
            {label}
          </button>
        ))}
        <div>
          <span>اكتمال التقييم: {coverage(snapshot.assessmentCoverage)}</span>
          <span>تغطية الأدلة: {coverage(snapshot.evidenceCoverage)}</span>
          <span>تغطية الاعتماد: {coverage(snapshot.approvalCoverage)}</span>
        </div>
      </nav>

      <main ref={viewContentRef} className="ri-view-content">
        {view === 'overview' ? (
          <ReadinessOverview
            pack={pack}
            spatialConfigurationId={spatialConfigurationId}
            blockers={blockers}
            selectedBlocker={selectedBlocker}
            selectedEntityId={selectedEntityId}
            onSelectBlocker={chooseBlocker}
            onSelectEntity={chooseEntity}
            onOpenMatrix={() => openView('matrix')}
          />
        ) : view === 'matrix' ? (
          <RequirementMatrix pack={pack} query={matrixQuery} onQueryChange={setMatrixQuery} />
        ) : view === 'governance' ? (
          <GovernanceView pack={pack} />
        ) : view === 'flow' ? (
          <EvidenceApprovalFlow pack={pack} />
        ) : (
          <div data-testid="readiness-map-full-view" className="ri-map-full">
            <ReadinessSpatialPanel
              configurationId={spatialConfigurationId}
              projectId={pack.projectId}
              eventId={pack.eventId}
              venueId={pack.venueId}
              blocker={selectedBlocker}
              selectedEntityId={selectedEntityId}
              onSelectEntity={chooseEntity}
            />
            <aside>
              <span>سياق الجاهزية</span>
              <h2 data-testid="readiness-selected-entity-label">{selectedSpatialLabel ?? 'لم يُحدد عنصر'}</h2>
              <bdi data-testid="readiness-map-inspector-id" dir="ltr">{selectedEntityId ?? 'NO-SELECTION'}</bdi>
              <p>لا توجد متطلبات تشغيلية أو أدلة متحققة مرتبطة بهذا العنصر حاليًا.</p>
              <strong>الموضع المرشح لا يثبت الجاهزية.</strong>
            </aside>
          </div>
        )}
      </main>

      {decisionDraft ? <DecisionDraftPanel draft={decisionDraft} onClose={() => setDecisionDraft(null)} /> : null}
      <SourceTruthDrawer pack={pack} snapshotHash={snapshot.contentHash} open={technicalOpen} onClose={() => setTechnicalOpen(false)} />
    </div>
  );
}
