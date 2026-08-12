import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Archive,
  Box,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileDiff,
  FileWarning,
  Fingerprint,
  GitCompareArrows,
  Layers3,
  LockKeyhole,
  Map,
  Network,
  RotateCcw,
  ShieldAlert,
  Snowflake,
  UserRoundCheck
} from 'lucide-react';
import { createKapPilotCandidate } from '../../data/kapPilotCandidate';
import { comparePilotCadManifests, promotePilotCadManifest } from '../../services/pilotCadReplacement';
import {
  attemptPilotCandidateFreeze,
  buildPilotCandidatePreview,
  validatePilotEventPackageCandidate
} from '../../services/pilotCandidateValidation';
import type {
  PilotCadComparisonResult,
  PilotCandidateValidationIssue,
  PilotEventPackageCandidate,
  PilotFreezeGate
} from '../../types/pilotCandidate';

type CandidateSection =
  | 'overview'
  | 'identity'
  | 'scope'
  | 'governance'
  | 'authority'
  | 'sources'
  | 'cad'
  | 'spatial'
  | 'assets3d'
  | 'evidence'
  | 'missing'
  | 'freeze'
  | 'validation'
  | 'package'
  | 'cad-diff'
  | 'rollback';

const sections: Array<{ id: CandidateSection; label: string; icon: typeof Archive }> = [
  { id: 'overview', label: 'نظرة عامة', icon: ClipboardCheck },
  { id: 'identity', label: 'هوية الفعالية', icon: CalendarClock },
  { id: 'scope', label: 'النطاق والمناطق', icon: Map },
  { id: 'governance', label: 'الحوكمة والتكليفات', icon: UserRoundCheck },
  { id: 'authority', label: 'حدود السلطة', icon: ShieldAlert },
  { id: 'sources', label: 'سجل المصادر', icon: Archive },
  { id: 'cad', label: 'حالة CAD', icon: Layers3 },
  { id: 'spatial', label: 'الربط المكاني', icon: Network },
  { id: 'assets3d', label: 'مصادر 3D', icon: Box },
  { id: 'evidence', label: 'الأدلة والحجر', icon: FileWarning },
  { id: 'missing', label: 'المدخلات المفقودة', icon: AlertTriangle },
  { id: 'freeze', label: 'بوابات التجميد', icon: Snowflake },
  { id: 'validation', label: 'تقرير التحقق', icon: CheckCircle2 },
  { id: 'package', label: 'معاينة الحزمة', icon: Fingerprint },
  { id: 'cad-diff', label: 'مقارنة CAD', icon: FileDiff },
  { id: 'rollback', label: 'الترقية والرجوع', icon: RotateCcw }
];

const sourceStatusLabels: Record<string, string> = {
  'final-approved-source': 'مصدر نهائي معتمد ضمن نطاقه',
  'received-non-authoritative-identity-source': 'مرجع أسماء غير سلطوي',
  'provisional-until-approved-revision-arrives': 'مبدئي حتى وصول مراجعة معتمدة',
  'visual-reference-candidate': 'مرجع بصري مرشح',
  'partially-available-skp-and-max': 'مصدر 3D متاح جزئياً',
  none: 'غير موجود',
  missing: 'مفقود'
};

const authorityTypeLabels: Record<string, string> = {
  platform: 'اعتماد المنصة',
  client: 'قبول العميل',
  hse: 'اعتماد HSE',
  'venue-opening': 'اعتماد فتح الموقع',
  route: 'اعتماد المسارات',
  'live-operations': 'سلطة التشغيل الحي'
};

const cadFieldLabels: Record<string, string> = {
  contentHash: 'بصمة المحتوى',
  revision: 'المراجعة',
  units: 'الوحدة',
  xyExtents: 'نطاق XY',
  zExtents: 'نطاق Z',
  layerCount: 'عدد الطبقات',
  layerNames: 'أسماء الطبقات',
  xrefLayerCount: 'طبقات XREF',
  epsg: 'EPSG',
  northAuthority: 'مرجع الشمال',
  originAuthority: 'مرجع الأصل',
  missingMappedEntities: 'الربط المفقود',
  orphanedMappings: 'الربط اليتيم'
};

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

interface KapPilotCandidateWorkspaceProps {
  onOpenTechnicalFixture: () => void;
}

export function KapPilotCandidateWorkspace({ onOpenTechnicalFixture }: KapPilotCandidateWorkspaceProps) {
  const [candidate, setCandidate] = useState<PilotEventPackageCandidate>(() => createKapPilotCandidate());
  const [section, setSection] = useState<CandidateSection>('overview');
  const [selectedEntityId, setSelectedEntityId] = useState(candidate.stableEntityIds[0]!);
  const [spatialView, setSpatialView] = useState<'2d' | '3d'>('2d');
  const [validationIssues, setValidationIssues] = useState<PilotCandidateValidationIssue[]>([]);
  const [freezeIssues, setFreezeIssues] = useState<PilotCandidateValidationIssue[]>([]);
  const [freezeAttempted, setFreezeAttempted] = useState(false);
  const [authorityTestIssue, setAuthorityTestIssue] = useState<string | null>(null);
  const [rollbackMessage, setRollbackMessage] = useState('لم تُنفذ ترقية. المصدر المبدئي الحالي محفوظ دون تغيير.');
  const [exportMessage, setExportMessage] = useState('لم يُصدر تقرير في هذه الجلسة.');
  const [cadComparison, setCadComparison] = useState<PilotCadComparisonResult>(() => (
    comparePilotCadManifests(candidate.cadManifest, null, candidate.stableEntityIds)
  ));

  useEffect(() => {
    void buildPilotCandidatePreview(createKapPilotCandidate()).then((preview) => {
      setCandidate(preview);
      setCadComparison(comparePilotCadManifests(preview.cadManifest, null, preview.stableEntityIds));
    });
  }, []);

  const freezeGates = useMemo(() => validatePilotEventPackageCandidate(candidate).freezeGates, [candidate]);
  const blockedGateCount = freezeGates.filter((gate) => gate.status === 'blocked').length;
  const selectedEntity = candidate.entities.find((entity) => entity.entityId === selectedEntityId) ?? candidate.entities[0]!;
  const quarantinedEvidence = candidate.evidence.filter((evidence) => evidence.status === 'quarantined');

  const runValidation = () => {
    const result = validatePilotEventPackageCandidate(candidate);
    setValidationIssues(result.issues);
    setSection('validation');
  };

  const runAuthorityMisuseTest = () => {
    const invalid = structuredClone(candidate);
    const hse = invalid.authorities.find((authority) => authority.authorityType === 'hse');
    hse!.actorId = 'ACTOR-PLATFORM-AHMED-001';
    const result = validatePilotEventPackageCandidate(invalid);
    setAuthorityTestIssue(result.issues.find((current) => current.code === 'pilot-platform-authority-misused')?.messageAr ?? 'لم ينتج التحقق الرسالة المتوقعة.');
  };

  const attemptFreeze = async () => {
    const result = await attemptPilotCandidateFreeze(candidate);
    setCandidate(result.candidate);
    setFreezeIssues(result.issues);
    setFreezeAttempted(true);
    setSection('freeze');
  };

  const previewCadReplacement = () => {
    setCadComparison(comparePilotCadManifests(candidate.cadManifest, null, candidate.stableEntityIds));
    setSection('cad-diff');
  };

  const attemptBlockedPromotion = () => {
    const result = promotePilotCadManifest(
      candidate.cadManifest,
      candidate.cadManifest,
      candidate.stableEntityIds,
      { authorityType: 'platform', authorityId: 'AUTHORITY-KAP-PLATFORM' },
      () => false
    );
    setRollbackMessage(result.rolledBack
      ? `فشلت الترقية ورجع النظام إلى ${result.activeManifest.manifestId}. لم يتغير أي معرّف أو مصدر نشط.`
      : 'نتيجة غير متوقعة؛ يلزم مراجعة التحقق.');
    setSection('rollback');
  };

  const exportValidation = () => {
    const validation = validatePilotEventPackageCandidate(candidate);
    downloadJson('kap-pilot-candidate-validation-report.json', {
      generatedAt: new Date().toISOString(),
      authoringLifecycle: candidate.authoringLifecycle,
      eventId: candidate.event.eventId,
      venueId: candidate.event.venueId,
      sourceBundleHash: candidate.sourceBundleHash,
      readyToFreeze: validation.readyToFreeze,
      issues: validation.issues.map(({ messageAr, severity, path }) => ({ messageAr, severity, path })),
      freezeGates: validation.freezeGates
    });
    setExportMessage('تم تصدير تقرير منقح بلا ملفات خام أو بيانات اتصال شخصية.');
  };

  return (
    <div data-testid="pilot-authoring-workspace" className="min-h-0 flex-1 overflow-y-auto bg-command-bg p-4 command-scrollbar" lang="ar" dir="rtl">
      <header data-testid="kap-authoring-overview" className="border border-command-line bg-command-panel px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-command-accent">Stage 3E.2 · حزمة فعالية واقعية مرشحة محلياً</p>
            <h2 className="mt-1 text-xl font-semibold text-command-text">تأليف الحزمة التجريبية</h2>
            <p className="mt-1 text-sm font-semibold text-command-text">{candidate.event.eventNameAr}</p>
            <p className="mt-2 max-w-5xl text-sm leading-7 text-command-muted">مصادر منقحة ← حزمة مرشحة ← تحقق ← معاينة. لا baseline، لا تشغيل حي، ولا اعتماد هندسة أو سلامة أو فتح.</p>
          </div>
          <div data-testid="kap-authoring-classification" className="border border-amber-300/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            الحالة: مرشحة · <span className="ltr inline-block">candidate / temporary-demo</span>
          </div>
        </div>
        <div className="mt-4 grid gap-px border border-command-line bg-command-line sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="حقائق مؤكدة" value="5 مناطق" tone="ok" />
          <Metric label="مصدر هندسي" value="مبدئي" tone="warn" />
          <Metric label="ربط هندسي" value="0 / 5" tone="warn" />
          <Metric label="أدلة محجورة" value={String(quarantinedEvidence.length)} tone="warn" />
          <Metric label="بوابات مانعة" value={String(blockedGateCount)} tone="danger" />
          <Metric label="جاهزية التجميد" value="غير جاهزة" tone="danger" />
        </div>
      </header>

      <section className="mt-4 grid gap-3 border border-command-line bg-command-panel p-4 xl:grid-cols-5">
        <Answer label="ما المؤكد؟" value="الهوية، تاريخ 31 أكتوبر بافتراض السنة، خمس مناطق، نطاق أحمد، وثيقة الحوكمة." tone="ok" />
        <Answer label="ما المبدئي؟" value="DWG الحالي ومعاينة PNG ومصادر SKP/MAX." tone="warn" />
        <Answer label="ما المفقود؟" value="Floor Plans، 2D Identity، الهوية السلطوية، السياسات، المرجع المكاني." tone="danger" />
        <Answer label="ما المتاح الآن؟" value="التأليف، التحقق، سجل المصادر، معاينة المقارنة، تقرير الحجب." tone="ok" />
        <Answer label="ما يمنع التجميد؟" value="اثنتا عشرة بوابة موثقة؛ لا ترقية جزئية أو نجاح مضلل." tone="danger" />
      </section>

      <nav aria-label="أقسام تأليف الحزمة" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`kap-section-${id}`}
            type="button"
            onClick={() => setSection(id)}
            className={`command-button min-h-10 justify-start ${section === id ? 'command-button-primary' : ''}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="mt-4 border border-command-line bg-command-panel p-4">
        {section === 'overview' ? <Overview candidate={candidate} blockedGateCount={blockedGateCount} /> : null}
        {section === 'identity' ? <Identity candidate={candidate} /> : null}
        {section === 'scope' ? (
          <Scope
            candidate={candidate}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
            selectedEntity={selectedEntity}
          />
        ) : null}
        {section === 'governance' ? <Governance candidate={candidate} /> : null}
        {section === 'authority' ? <Authority candidate={candidate} testIssue={authorityTestIssue} onRunTest={runAuthorityMisuseTest} /> : null}
        {section === 'sources' ? <Sources candidate={candidate} /> : null}
        {section === 'cad' ? <CadStatus candidate={candidate} /> : null}
        {section === 'spatial' ? <SpatialMapping candidate={candidate} selectedEntity={selectedEntity} view={spatialView} onChangeView={setSpatialView} /> : null}
        {section === 'assets3d' ? <Assets3d candidate={candidate} /> : null}
        {section === 'evidence' ? <Evidence candidate={candidate} /> : null}
        {section === 'missing' ? <MissingInputs candidate={candidate} /> : null}
        {section === 'freeze' ? <FreezeGates gates={freezeGates} attempted={freezeAttempted} issues={freezeIssues} onAttempt={() => void attemptFreeze()} /> : null}
        {section === 'validation' ? <Validation candidate={candidate} issues={validationIssues} onRun={runValidation} /> : null}
        {section === 'package' ? <PackagePreview candidate={candidate} onExport={exportValidation} exportMessage={exportMessage} /> : null}
        {section === 'cad-diff' ? <CadDiff comparison={cadComparison} onRefresh={previewCadReplacement} /> : null}
        {section === 'rollback' ? <Rollback message={rollbackMessage} onAttempt={attemptBlockedPromotion} /> : null}
      </main>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-command-line bg-command-panel px-4 py-3 text-sm text-command-muted">
        <span>مختبر محلي غير إنتاجي · الملفات الخام والأصول المقيدة خارج Git.</span>
        <button data-testid="pilot-open-technical-fixture" type="button" onClick={onOpenTechnicalFixture} className="command-button">
          <GitCompareArrows className="h-4 w-4" />فتح النموذج التقني الخيالي السابق
        </button>
      </footer>
    </div>
  );
}

function Overview({ candidate, blockedGateCount }: { candidate: PilotEventPackageCandidate; blockedGateCount: number }) {
  return (
    <SectionHeader title="لوحة قرار التأليف" subtitle="الحزمة المرشحة تصف ما نعرفه وما لا نعرفه؛ لا تحوّل النقص إلى حقيقة تشغيلية.">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border border-command-line bg-command-panelStrong p-4">
          <h4 className="font-semibold">{candidate.event.eventNameAr}</h4>
          <p className="mt-1 text-sm text-command-muted">{candidate.event.eventNameEn}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataLine label="معرّف الفعالية" value={candidate.event.eventId} ltr />
            <DataLine label="معرّف الموقع" value={candidate.event.venueId} ltr />
            <DataLine label="التاريخ" value={candidate.event.eventDate} ltr />
            <DataLine label="المنطقة الزمنية" value={candidate.event.timeZone} ltr />
          </div>
        </div>
        <div className="border border-red-300/35 bg-red-950/20 p-4">
          <p className="text-xs font-semibold text-red-200">قرار التجميد</p>
          <strong className="mt-2 block text-2xl text-red-50">محجوب</strong>
          <p className="mt-2 text-sm leading-7 text-red-100/80">{blockedGateCount} بوابة مفتوحة. لا توجد حزمة EventPackage مجمّدة أو baseline أو ادعاء جاهزية.</p>
        </div>
      </div>
    </SectionHeader>
  );
}

function Identity({ candidate }: { candidate: PilotEventPackageCandidate }) {
  const [assumptionExpanded, setAssumptionExpanded] = useState(false);
  return (
    <SectionHeader title="هوية الفعالية" subtitle="الاسم مؤكد؛ السنة موثقة كافتراض حتى يؤكدها أحمد.">
      <div data-testid="kap-event-identity" className="grid gap-3 lg:grid-cols-2">
        <DataLine label="الاسم العربي" value={candidate.event.eventNameAr} />
        <DataLine label="الاسم الإنجليزي" value={candidate.event.eventNameEn} />
        <DataLine label="معرّف الفعالية" value={candidate.event.eventId} ltr />
        <DataLine label="معرّف الموقع" value={candidate.event.venueId} ltr />
        <DataLine label="نوع الفعالية" value={candidate.event.eventType} ltr />
        <DataLine label="الحالة التأليفية" value={candidate.authoringLifecycle} ltr />
      </div>
      <div data-testid="kap-date-assumption" className="mt-4 border border-amber-300/45 bg-amber-950/25 p-4">
        <div className="flex items-center gap-2 text-amber-100"><CalendarClock className="h-4 w-4" /><strong>افتراض تاريخ مفتوح</strong></div>
        <p className="mt-2 text-sm">31 أكتوبر 2026 · <span className="ltr inline-block">{candidate.event.eventDate}</span></p>
        <p className="ltr mt-2 text-left text-xs text-amber-100/75">{candidate.event.assumptionReason}</p>
        <button data-testid="kap-date-assumption-expand" type="button" onClick={() => setAssumptionExpanded((value) => !value)} className="command-button mt-3">{assumptionExpanded ? 'إخفاء سجل الافتراض' : 'عرض سجل الافتراض'}</button>
        {assumptionExpanded ? <div data-testid="kap-date-assumption-detail" className="mt-3 border border-amber-300/30 bg-command-panelStrong p-3 text-sm leading-7"><strong>قرار مطلوب من أحمد</strong><p className="mt-1 text-command-muted">تأكيد أن تاريخ الفعالية هو 31 أكتوبر 2026 قبل تجميد بيانات الحدث. حتى ذلك الوقت يبقى الحقل افتراضاً موثقاً، ولا يتحول إلى حقيقة معتمدة.</p></div> : null}
      </div>
    </SectionHeader>
  );
}

function Scope({ candidate, selectedEntityId, onSelectEntity, selectedEntity }: {
  candidate: PilotEventPackageCandidate;
  selectedEntityId: string;
  onSelectEntity: (entityId: PilotEventPackageCandidate['stableEntityIds'][number]) => void;
  selectedEntity: PilotEventPackageCandidate['entities'][number];
}) {
  return (
    <SectionHeader title="النطاق التجريبي الثابت" subtitle="المعرّفات الخمسة تبقى ثابتة عند وصول DWG المعتمد؛ أسماء العرض ليست هوية دائمة.">
      <div data-testid="kap-five-entity-scope" className="grid gap-3 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-2">
          {candidate.entities.map((entity) => (
            <button key={entity.entityId} type="button" onClick={() => onSelectEntity(entity.entityId)} className={`flex w-full items-center justify-between gap-3 border px-3 py-3 text-right ${selectedEntityId === entity.entityId ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong'}`}>
              <span><strong className="block text-sm">{entity.nameAr}</strong><span className="ltr mt-1 block text-left text-xs text-command-muted">{entity.entityId}</span></span>
              <span className="text-xs text-amber-200">غير مربوط</span>
            </button>
          ))}
        </div>
        <div data-testid="kap-entity-detail" className="border border-command-line bg-command-panelStrong p-4">
          <p className="text-xs font-semibold text-command-accent">العنصر المحدد</p>
          <h4 className="mt-2 text-lg font-semibold">{selectedEntity.nameAr}</h4>
          <p className="ltr mt-1 text-left text-xs text-command-muted">{selectedEntity.entityId}</p>
          <div className="mt-4 space-y-2">
            <DataLine label="حالة الربط" value="pending" ltr />
            <DataLine label="مصدر الهندسة" value="غير معروف" />
            <DataLine label="الإحداثيات" value="غير متاحة" />
          </div>
          <p className="mt-4 border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100">الموقع غير مثبت على المخطط</p>
        </div>
      </div>
    </SectionHeader>
  );
}

function Governance({ candidate }: { candidate: PilotEventPackageCandidate }) {
  return (
    <SectionHeader title="الحوكمة والتكليفات" subtitle="Actor وRoleDefinition وRoleAssignment مفصولة. لا مطابقة غامضة ولا صلاحية من الاسم وحده.">
      <div data-testid="kap-governance-assignments" className="grid gap-3 xl:grid-cols-3">
        {candidate.roleAssignments.filter((assignment) => assignment.roleId !== 'ROLE-PLATFORM-OWNER').map((assignment) => {
          const actor = candidate.actors.find((current) => current.actorId === assignment.actorId)!;
          const role = candidate.roleDefinitions.find((current) => current.roleId === assignment.roleId)!;
          return (
            <article key={assignment.assignmentId} className="border border-command-line bg-command-panelStrong p-4">
              <strong>{actor.displayNameAr}</strong>
              <p className="mt-1 text-sm text-command-accent">{role.titleAr}</p>
              <div className="mt-3 space-y-2 text-xs text-command-muted">
                <DataLine label="هوية إنتاجية" value="غير محسومة" />
                <DataLine label="المسمى المؤسسي" value={actor.hrJobTitleAr ?? 'غير مثبت'} />
                <DataLine label="تاريخ السريان" value="غير متاح" />
                <DataLine label="صلاحية إنتاجية" value="لا" />
              </div>
              {actor.possibleHrMatches.length ? <p className="mt-3 border border-amber-300/35 bg-amber-950/20 p-2 text-xs text-amber-100">يوجد أكثر من تطابق محتمل في سجل الأسماء؛ المطابقة الآلية محظورة.</p> : null}
            </article>
          );
        })}
      </div>
    </SectionHeader>
  );
}

function Authority({ candidate, testIssue, onRunTest }: { candidate: PilotEventPackageCandidate; testIssue: string | null; onRunTest: () => void }) {
  return (
    <SectionHeader title="حدود السلطة" subtitle="اعتماد المنصة مستقل تماماً عن قبول العميل وHSE والفتح والمسارات والتشغيل الحي.">
      <div data-testid="kap-authority-boundaries" className="grid gap-3 xl:grid-cols-3">
        {candidate.authorities.map((authority) => (
          <article key={authority.authorityId} className={`border p-4 ${authority.authorityType === 'platform' ? 'border-command-accent/50 bg-command-accent/10' : 'border-red-300/30 bg-red-950/15'}`}>
            <p className="text-xs text-command-muted">{authorityTypeLabels[authority.authorityType]}</p>
            <strong className="mt-1 block">{authority.titleAr}</strong>
            <p className="mt-2 text-sm text-command-muted">{authority.actorId ? 'أحمد — ضمن نطاق المنصة فقط' : 'الجهة المفوضة غير معروفة'}</p>
            <p className="ltr mt-2 break-all text-left text-[11px] text-command-muted">{authority.authorityId}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button data-testid="kap-authority-misuse-test" type="button" onClick={onRunTest} className="command-button"><ShieldAlert className="h-4 w-4" />اختبار إساءة استخدام سلطة المنصة</button>
        {testIssue ? <p data-testid="kap-authority-error" className="border border-red-300/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">{testIssue}</p> : null}
      </div>
    </SectionHeader>
  );
}

function Sources({ candidate }: { candidate: PilotEventPackageCandidate }) {
  return (
    <SectionHeader title="سجل المصادر" subtitle="التصنيف والسلطة والبصمة والاستخدام المسموح منفصلة؛ لا ترقية صامتة.">
      <div data-testid="kap-source-register" className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-sm">
          <thead><tr className="border-b border-command-line text-right text-xs text-command-muted"><th className="p-2">المصدر</th><th className="p-2">التصنيف</th><th className="p-2">السلطة</th><th className="p-2">البصمة</th><th className="p-2">الاستخدام</th><th className="p-2">الحالة</th></tr></thead>
          <tbody>{candidate.sources.map((source) => (
            <tr key={source.sourceId} className="border-b border-command-line/70 align-top">
              <td className="p-2"><strong className="block">{source.titleAr}</strong><span className="ltr mt-1 block text-left text-[11px] text-command-muted">{source.sourceId}</span></td>
              <td className="p-2">{sourceStatusLabels[source.sourceStatus]}</td>
              <td className="p-2 text-command-muted">{source.sourceAuthority ?? 'غير معروفة'}</td>
              <td className="ltr max-w-52 break-all p-2 text-left text-[11px]">{source.contentHash ?? 'unknown'}</td>
              <td className="p-2 text-command-muted">{source.permittedUses.length ? source.permittedUses.join(' · ') : 'لا استخدام'}</td>
              <td className="p-2"><Status text={source.validationStatus === 'missing' ? 'مفقود' : 'مقبول للتأليف'} tone={source.validationStatus === 'missing' ? 'danger' : 'warn'} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </SectionHeader>
  );
}

function CadStatus({ candidate }: { candidate: PilotEventPackageCandidate }) {
  const cad = candidate.cadManifest;
  return (
    <SectionHeader title="المخطط المبدئي" subtitle="المعاينة تثبت قابلية القراءة فقط، ولا تمنح هندسة تفاعلية أو مرجعاً جغرافياً أو اعتماداً.">
      <div data-testid="kap-provisional-cad" className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative flex min-h-72 items-center justify-center overflow-hidden border border-amber-300/35 bg-[#0e1311] p-6 text-center">
          <div>
            <Layers3 className="mx-auto h-10 w-10 text-amber-200" />
            <strong className="mt-3 block text-lg text-amber-100">مخطط مبدئي — غير معتمد</strong>
            <p className="mt-2 text-sm text-command-muted">لا توجد علامات مناطق أو مضلعات أو نقاط مخمّنة.</p>
            <p className="ltr mx-auto mt-3 max-w-xl break-all text-left text-[11px] text-command-muted">SHA-256: {cad.contentHash}</p>
          </div>
        </div>
        <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <DataLine label="الإصدار" value={cad.formatVersion} />
          <DataLine label="الوحدة" value="متر" />
          <DataLine label="الطبقات" value="2,315" />
          <DataLine label="طبقات XREF" value="1,942" />
          <DataLine label="طبقات AUDIT_BAD" value="2" />
          <DataLine label="طبقات HATCH" value="143" />
          <DataLine label="EPSG" value="غير معروف" />
          <DataLine label="الشمال / الأصل" value="غير معروف / غير معروف" />
          <DataLine label="موقع سان فرانسيسكو المضمن" value="غير موثوق" />
          <DataLine label="نطاق Z" value="يحتوي قيماً شاذة" />
        </div>
      </div>
    </SectionHeader>
  );
}

function SpatialMapping({ candidate, selectedEntity, view, onChangeView }: {
  candidate: PilotEventPackageCandidate;
  selectedEntity: PilotEventPackageCandidate['entities'][number];
  view: '2d' | '3d';
  onChangeView: (view: '2d' | '3d') => void;
}) {
  return (
    <SectionHeader title="حالة الربط المكاني" subtitle="2D و3D تمثيلان متكاملان؛ كلاهما يعرض حالة غير مربوطة بدلاً من موقع زائف.">
      <div className="mb-3 flex gap-2">
        <button data-testid="kap-spatial-2d" type="button" onClick={() => onChangeView('2d')} className={`command-button ${view === '2d' ? 'command-button-primary' : ''}`}>مخطط ثنائي الأبعاد</button>
        <button data-testid="kap-spatial-3d" type="button" onClick={() => onChangeView('3d')} className={`command-button ${view === '3d' ? 'command-button-primary' : ''}`}>مشهد ثلاثي الأبعاد</button>
      </div>
      <div data-testid={`kap-spatial-${view}-state`} className={`grid min-h-80 place-items-center border p-6 text-center ${view === '2d' ? 'border-command-accent/35 bg-command-panelStrong' : 'border-amber-300/35 bg-[#0b1014]'}`}>
        <div>
          {view === '2d' ? <Map className="mx-auto h-12 w-12 text-command-accent" /> : <Box className="mx-auto h-12 w-12 text-amber-200" />}
          <strong className="mt-3 block text-lg">{selectedEntity.nameAr}</strong>
          <span className="ltr mt-1 block text-xs text-command-muted">{selectedEntity.entityId}</span>
          <p className="mt-3 text-amber-100">الموقع غير مثبت على المخطط</p>
          <p className="mt-2 text-sm text-command-muted">{candidate.entities.length} مناطق منطقية · 0 روابط هندسية · لا إحداثيات أو مجسمات معتمدة</p>
        </div>
      </div>
    </SectionHeader>
  );
}

function Assets3d({ candidate }: { candidate: PilotEventPackageCandidate }) {
  return (
    <SectionHeader title="سجل مصادر 3D المرشحة" subtitle="المصدر متاح جزئياً؛ لا GLB أو FBX متحقق، وTwinmotion مؤجل.">
      <div data-testid="kap-3d-candidates" className="grid gap-3 xl:grid-cols-3">
        {candidate.assets3d.map((asset) => (
          <article key={asset.assetCandidateId} className="border border-command-line bg-command-panelStrong p-4">
            <strong className="ltr block text-left text-sm">{asset.fileName}</strong>
            <p className="mt-2 text-xs text-command-muted">{asset.conditionalScope ? 'نطاق مشروط' : 'ضمن المصادر المرشحة'}</p>
            <div className="mt-3 space-y-2 text-sm">
              <DataLine label="تحويل الويب" value="معلق" />
              <DataLine label="الخامات" value="غير متحققة" />
              <DataLine label="الأصل والمقياس" value="غير متحققين" />
              <DataLine label="الهيكل" value="غير متحقق" />
            </div>
          </article>
        ))}
      </div>
    </SectionHeader>
  );
}

function Evidence({ candidate }: { candidate: PilotEventPackageCandidate }) {
  return (
    <SectionHeader title="الأدلة والسياق البصري" subtitle="الصور والفيديو سياق أو دليل محتمل، وليست هندسة. السجل الناقص يُحجر تلقائياً.">
      <div data-testid="kap-evidence-quarantine" className="space-y-3">
        {candidate.evidence.map((evidence) => (
          <article key={evidence.evidenceId} className="border border-red-300/35 bg-red-950/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{evidence.titleAr}</strong><p className="ltr mt-1 text-left text-xs text-command-muted">{evidence.evidenceId}</p></div><Status text="محجور" tone="danger" /></div>
            <ul className="mt-3 grid gap-2 text-sm text-red-100/85 sm:grid-cols-2">{evidence.quarantineReasonsAr.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
            <p className="mt-3 text-sm text-command-muted">لا يمكن إرفاق هذا السجل بقرار متحقق قبل استكمال جميع الحقول.</p>
          </article>
        ))}
      </div>
    </SectionHeader>
  );
}

function MissingInputs({ candidate }: { candidate: PilotEventPackageCandidate }) {
  const unresolvedActors = candidate.actors.filter((actor) => actor.identityStatus === 'unresolved');
  const [selectedMissingId, setSelectedMissingId] = useState('SOURCE-KAP-FLOOR-PLANS-001');
  return (
    <SectionHeader title="سجل المدخلات المفقودة" subtitle="المجهول يبقى مجهولاً؛ لا قيم افتراضية أو اعتماد تلقائي.">
      <div data-testid="kap-missing-inputs" className="grid gap-3 xl:grid-cols-2">
        {candidate.sources.filter((source) => source.validationStatus === 'missing').map((source) => <button key={source.sourceId} data-testid={`kap-missing-source-${source.sourceId}`} type="button" onClick={() => setSelectedMissingId(source.sourceId)} className={`border p-3 text-right ${selectedMissingId === source.sourceId ? 'border-red-200 bg-red-900/35 ring-1 ring-red-200/50' : 'border-red-300/30 bg-red-950/15'}`}><strong className="text-sm">{source.titleAr}</strong><p className="mt-1 text-xs leading-6 text-red-100/70">{source.warningsAr.join(' ')}</p></button>)}
        <Missing title="EPSG أو نقاط ضبط مساحية" detail="مطلوبة قبل أي محاذاة جغرافية." />
        <Missing title="الشمال ونقطة الأصل" detail="لا يمكن استنتاجهما من الإحداثيات المضمنة." />
        <Missing title="معرّفات الممثلين السلطوية" detail={`${unresolvedActors.length} هويات داخلية غير محسومة.`} />
        <Missing title="سياسات الأدلة والخصوصية والاحتفاظ" detail="لا تجميد ولا دليل مقبول قبل اعتمادها." />
        <Missing title="سلطات العميل وHSE والفتح والمسار" detail="اعتماد المنصة لا يملأ هذه السلطات." />
      </div>
    </SectionHeader>
  );
}

function FreezeGates({ gates, attempted, issues, onAttempt }: { gates: PilotFreezeGate[]; attempted: boolean; issues: PilotCandidateValidationIssue[]; onAttempt: () => void }) {
  return (
    <SectionHeader title="بوابات تجميد الحزمة" subtitle="تقييم حتمي يفشل مغلقاً ويعيد كل الموانع؛ لا ترقية جزئية.">
      <div className="flex flex-wrap items-center gap-3">
        <button data-testid="kap-freeze-attempt" type="button" onClick={onAttempt} className="command-button command-button-primary"><Snowflake className="h-4 w-4" />محاولة التجميد</button>
        <Status text="التجميد محجوب" tone="danger" />
        {attempted ? <span data-testid="kap-freeze-result" className="text-sm text-red-100">فشلت المحاولة بأمان؛ بقيت الحزمة مرشحة.</span> : null}
      </div>
      <div data-testid="kap-freeze-gates" className="mt-4 grid gap-2 xl:grid-cols-2">
        {gates.map((current, index) => (
          <div key={current.gateId} className="grid grid-cols-[32px_1fr] gap-3 border border-red-300/25 bg-red-950/15 p-3">
            <span className="grid h-7 w-7 place-items-center bg-red-950 text-xs font-semibold text-red-100">{index + 1}</span>
            <div><strong className="text-sm">{current.titleAr}</strong><p className="mt-1 text-xs leading-6 text-red-100/75">{current.blockerAr}</p></div>
          </div>
        ))}
      </div>
      {issues.length ? <p className="mt-3 text-xs text-command-muted">أعاد التحقق {issues.length} نتيجة مانعة تشمل جميع البوابات المفتوحة.</p> : null}
    </SectionHeader>
  );
}

function Validation({ candidate, issues, onRun }: { candidate: PilotEventPackageCandidate; issues: PilotCandidateValidationIssue[]; onRun: () => void }) {
  const warnings = issues.filter((current) => current.severity === 'warning');
  const blocking = issues.filter((current) => current.severity === 'blocking');
  return (
    <SectionHeader title="تقرير التحقق" subtitle="التحقق يقيس سلامة عقد التأليف؛ بوابات التجميد تبقى طبقة مستقلة.">
      <div className="flex flex-wrap items-center gap-3">
        <button data-testid="kap-run-validation" type="button" onClick={onRun} className="command-button command-button-primary"><CheckCircle2 className="h-4 w-4" />تشغيل التحقق</button>
        <DataLine label="حالة التأليف" value={candidate.authoringLifecycle} ltr />
        <DataLine label="حالة التشغيل" value={candidate.stateContext} ltr />
      </div>
      <div data-testid="kap-validation-report" className="mt-4 space-y-2">
        {!issues.length ? <p className="text-sm text-command-muted">لم يُشغّل التحقق في هذه الجلسة.</p> : null}
        {blocking.map((current) => <Issue key={`${current.path}-${current.messageAr}`} issue={current} />)}
        {warnings.map((current) => <Issue key={`${current.path}-${current.messageAr}`} issue={current} />)}
      </div>
    </SectionHeader>
  );
}

function PackagePreview({ candidate, onExport, exportMessage }: { candidate: PilotEventPackageCandidate; onExport: () => void; exportMessage: string }) {
  return (
    <SectionHeader title="معاينة الحزمة المرشحة" subtitle="تُنتج من بيانات منظمة، لكن EventPackage النهائي لا يُنشأ قبل اكتمال الهندسة والسلطة والأدلة.">
      <div data-testid="kap-package-preview" className="grid gap-3 lg:grid-cols-2">
        <DataLine label="Package ID" value={candidate.packageId} ltr />
        <DataLine label="Package Version" value={candidate.packageVersion} ltr />
        <DataLine label="Source Bundle Hash" value={candidate.sourceBundleHash ?? 'جارٍ الحساب'} ltr />
        <DataLine label="EventPackage Content Hash" value="غير مولّد — التجميد محجوب" />
        <DataLine label="Event ID" value={candidate.event.eventId} ltr />
        <DataLine label="Venue ID" value={candidate.event.venueId} ltr />
        <DataLine label="ملفات المخرجات" value={`${candidate.outputProfiles.length} · 1 معاينة و3 محجوبة`} />
        <DataLine label="تبعيات الحزمة" value={candidate.dependencyDeclarations.length ? String(candidate.dependencyDeclarations.length) : 'لا توجد تبعيات خارجية'} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button data-testid="kap-export-validation" type="button" onClick={onExport} className="command-button"><Download className="h-4 w-4" />تصدير تقرير منقح</button>
        <p className="text-sm text-command-muted">{exportMessage}</p>
      </div>
    </SectionHeader>
  );
}

function CadDiff({ comparison, onRefresh }: { comparison: PilotCadComparisonResult; onRefresh: () => void }) {
  return (
    <SectionHeader title="معاينة مقارنة واستبدال CAD" subtitle="لا يوجد بيان بديل بعد؛ تظهر أبعاد المقارنة المطلوبة من دون اختراع مراجعة ثانية.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button data-testid="kap-cad-compare" type="button" onClick={onRefresh} className="command-button"><FileDiff className="h-4 w-4" />تحديث المعاينة</button>
        <Status text="بانتظار DWG معتمد" tone="warn" />
      </div>
      <div data-testid="kap-cad-diff" className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead><tr className="border-b border-command-line text-right text-xs text-command-muted"><th className="p-2">البعد</th><th className="p-2">الحالي</th><th className="p-2">المصدر البديل</th><th className="p-2">الحكم</th></tr></thead>
          <tbody>{comparison.differences.map((current) => <tr key={current.field} className="border-b border-command-line/70"><td className="p-2 font-medium">{cadFieldLabels[current.field]}</td><td className="ltr max-w-72 break-all p-2 text-left text-xs">{current.currentValue}</td><td className="ltr max-w-72 break-all p-2 text-left text-xs">{current.stagedValue}</td><td className="p-2 text-command-muted">{current.changed === null ? 'غير قابل للمقارنة' : current.changed ? 'تغيّر' : 'مطابق'}</td></tr>)}</tbody>
        </table>
      </div>
    </SectionHeader>
  );
}

function Rollback({ message, onAttempt }: { message: string; onAttempt: () => void }) {
  return (
    <SectionHeader title="الترقية الذرية والرجوع" subtitle="المنصة لا تستخدم اعتماد أحمد لترقية الهندسة، ولا تغيّر المصدر الحالي عند فشل تابع.">
      <div data-testid="kap-rollback-status" className="border border-command-line bg-command-panelStrong p-4">
        <div className="flex items-center gap-2 text-command-accent"><LockKeyhole className="h-4 w-4" /><strong>المصدر النشط محمي</strong></div>
        <p className="mt-3 text-sm leading-7 text-command-muted">{message}</p>
        <button data-testid="kap-cad-promotion-test" type="button" onClick={onAttempt} className="command-button mt-4"><RotateCcw className="h-4 w-4" />اختبار ترقية مرفوضة ورجوع</button>
      </div>
    </SectionHeader>
  );
}

function SectionHeader({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section><div className="mb-4"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-command-muted">{subtitle}</p></div>{children}</section>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'warn' | 'danger' }) {
  const toneClass = tone === 'ok' ? 'text-emerald-200' : tone === 'warn' ? 'text-amber-200' : tone === 'danger' ? 'text-red-200' : 'text-command-text';
  return <div className="bg-command-panelStrong p-3"><p className="text-xs text-command-muted">{label}</p><strong className={`mt-1 block text-lg ${toneClass}`}>{value}</strong></div>;
}

function Answer({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' | 'danger' }) {
  const color = tone === 'ok' ? 'border-emerald-300/25' : tone === 'warn' ? 'border-amber-300/30' : 'border-red-300/30';
  return <div className={`border-r-2 ${color} pr-3`}><strong className="text-sm">{label}</strong><p className="mt-1 text-xs leading-6 text-command-muted">{value}</p></div>;
}

function DataLine({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="flex min-w-0 items-start justify-between gap-3 border-b border-command-line py-2 text-sm"><span className="shrink-0 text-command-muted">{label}</span><span className={`${ltr ? 'ltr text-left' : 'text-right'} min-w-0 break-words font-medium`}>{value}</span></div>;
}

function Status({ text, tone }: { text: string; tone: 'warn' | 'danger' }) {
  return <span className={`inline-flex border px-2 py-1 text-xs ${tone === 'danger' ? 'border-red-300/40 bg-red-950/25 text-red-100' : 'border-amber-300/40 bg-amber-950/25 text-amber-100'}`}>{text}</span>;
}

function Missing({ title, detail }: { title: string; detail: string }) {
  return <div className="border border-red-300/30 bg-red-950/15 p-3"><strong className="text-sm">{title}</strong><p className="mt-1 text-xs leading-6 text-red-100/70">{detail}</p></div>;
}

function Issue({ issue: current }: { issue: PilotCandidateValidationIssue }) {
  return <div className={`border p-3 text-sm ${current.severity === 'blocking' ? 'border-red-300/35 bg-red-950/20 text-red-100' : 'border-amber-300/35 bg-amber-950/20 text-amber-100'}`}><p>{current.messageAr}</p><p className="ltr mt-1 text-left text-[11px] opacity-70">{current.path}</p></div>;
}
