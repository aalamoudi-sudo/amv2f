import { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Download, Eye, FileWarning, GitCompareArrows, LockKeyhole, Play, RefreshCcw, ShieldAlert, Snowflake } from 'lucide-react';
import { createFictionalPilotSourceBundle } from '../../data/pilotAuthoringFixture';
import { validateEventPackage } from '../../services/eventPackageValidation';
import { compilePilotPackageDraft, createPilotPackageDraft, validatePilotPackageDraft } from '../../services/pilotPackageCompiler';
import { freezePilotPackage, pilotInputTemplateFiles } from '../../services/pilotPackageFreeze';
import { validatePilotIdGovernance } from '../../services/pilotIdGovernance';
import { useEventStore } from '../../store/useEventStore';
import type { FrozenPilotPackage, PilotAuthoringMetrics, PilotCompilationResult, PilotPackageDraft, PilotSourceBundle, PilotValidationIssue } from '../../types/pilotAuthoring';
import { KapPilotCandidateWorkspace } from './KapPilotCandidateWorkspace';

const missingInputMessage = 'لا توجد مدخلات طيار حقيقية في المسار المعتمد. نظام التأليف جاهز، والحزمة الحقيقية محجوبة حتى يزوّد أحمد الملفات والاعتمادات المطلوبة.';
const activationOutcomeLabels: Record<PilotAuthoringMetrics['activationOutcome'], string> = {
  'not-attempted': 'لم يُحاول',
  succeeded: 'نجح',
  failed: 'فشل'
};
const integrationPathLabels = { input: 'إدخال', spatial: 'مكاني', physical: 'مخرج مادي' } as const;
const integrationStatusLabels: Record<string, string> = {
  'reference-local': 'مرجع محلي',
  candidate: 'مرشح',
  'not-executable': 'غير قابل للتنفيذ'
};
const securityClassificationLabels: Record<string, string> = {
  public: 'عام',
  internal: 'داخلي',
  confidential: 'سري',
  restricted: 'مقيد'
};

function initialMetrics(): PilotAuthoringMetrics {
  return {
    importedAt: null,
    firstValidatedAt: null,
    firstValidationDurationMs: null,
    blockingIssueCount: 0,
    warningCount: 0,
    correctedMappingCount: 0,
    duplicateIdsFound: 0,
    danglingReferencesFound: 0,
    missingOwners: 0,
    missingSources: 0,
    missingEvidencePolicies: 0,
    validationAttempts: 0,
    validDraftAt: null,
    frozenAt: null,
    validToFrozenDurationMs: null,
    activationOutcome: 'not-attempted'
  };
}

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function countIssues(issues: PilotValidationIssue[], token: string) {
  return issues.filter((current) => current.code.includes(token)).length;
}

function FictionalPilotAuthoringWorkspace({ onReturnToCandidate, onDirtyChange }: { onReturnToCandidate: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const activateTemporaryEventRuntime = useEventStore((state) => state.activateTemporaryEventRuntime);
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const [draft, setDraft] = useState<PilotPackageDraft>(() => createPilotPackageDraft());
  const [compilation, setCompilation] = useState<PilotCompilationResult | null>(null);
  const [frozenArtifacts, setFrozenArtifacts] = useState<FrozenPilotPackage[]>([]);
  const [lastFrozenBundle, setLastFrozenBundle] = useState<PilotSourceBundle | null>(null);
  const [metrics, setMetrics] = useState<PilotAuthoringMetrics>(initialMetrics);
  const [messageAr, setMessageAr] = useState(missingInputMessage);
  const [freezeManifestExpanded, setFreezeManifestExpanded] = useState(false);
  const [exportStatus, setExportStatus] = useState('لم يُنفذ تصدير في هذه الجلسة.');
  const [selectedIntegrationPath, setSelectedIntegrationPath] = useState<'input' | 'spatial' | 'physical'>('input');
  const blockingIssues = draft.issues.filter((current) => current.severity === 'blocking');
  const warningIssues = draft.issues.filter((current) => current.severity === 'warning');
  const currentBundle = draft.sourceBundle;
  const idReport = useMemo(
    () => currentBundle.eventId && currentBundle.entities && currentBundle.routes && currentBundle.readinessRecords && currentBundle.decisionRecords && currentBundle.requirements && currentBundle.roles && currentBundle.authorities && currentBundle.integrationProfiles && currentBundle.evidenceRegister && currentBundle.sourceRegister && currentBundle.scenarioConfiguration && currentBundle.spatialProfile
      ? validatePilotIdGovernance(currentBundle as PilotSourceBundle, frozenArtifacts[0] ?? null)
      : null,
    [currentBundle, frozenArtifacts]
  );
  const fieldStateValues = Object.values(draft.fieldStates);
  const completeFields = fieldStateValues.filter((state) => state === 'complete' || state === 'ready-to-freeze').length;
  const completeness = fieldStateValues.length ? Math.round((completeFields / fieldStateValues.length) * 100) : 0;
  const frozen = Boolean(draft.frozenArtifactId);
  const markDirty = () => onDirtyChange(true);

  const loadIncomplete = async () => {
    markDirty();
    const fixture = await createFictionalPilotSourceBundle();
    const incomplete: Partial<PilotSourceBundle> = {
      schemaVersion: fixture.schemaVersion,
      sourceType: 'real-pilot-input',
      pilotBundleId: 'PILOT-BUNDLE-WAITING-FOR-AHMED',
      pilotBundleVersion: '1.0.0',
      eventNameAr: 'طيار حقيقي غير مكتمل',
      eventNameEn: 'Incomplete real pilot',
      eventType: 'unknown',
      approvalStatus: 'draft',
      revision: 1
    };
    setDraft(createPilotPackageDraft(incomplete));
    setCompilation(null);
    setMessageAr('تم تحميل مسودة حقيقية ناقصة عمداً؛ لن تُترجم أو تُجمّد قبل استكمال حقول أحمد.');
    setMetrics({ ...initialMetrics(), importedAt: new Date().toISOString() });
  };

  const loadFictionalFixture = async () => {
    markDirty();
    const fixture = await createFictionalPilotSourceBundle();
    setDraft(createPilotPackageDraft(fixture));
    setCompilation(null);
    setMessageAr('تم تحميل نموذج خيالي آمن للاختبار التقني فقط.');
    setMetrics({ ...initialMetrics(), importedAt: new Date().toISOString() });
  };

  const validateDraft = () => {
    markDirty();
    const started = performance.now();
    const nextDraft = validatePilotPackageDraft(draft);
    const finishedAt = new Date().toISOString();
    const nextBlocking = nextDraft.issues.filter((current) => current.severity === 'blocking').length;
    const nextWarnings = nextDraft.issues.filter((current) => current.severity === 'warning').length;
    setDraft(nextDraft);
    setMessageAr(nextBlocking ? 'الحزمة محجوبة؛ صحّح المشاكل المانعة قبل الترجمة.' : 'اجتازت المسودة تحقق حزمة المصدر وأصبحت جاهزة للترجمة.');
    setMetrics((current) => ({
      ...current,
      firstValidatedAt: current.firstValidatedAt ?? finishedAt,
      firstValidationDurationMs: current.firstValidationDurationMs ?? Math.round(performance.now() - started),
      blockingIssueCount: Math.max(current.blockingIssueCount, nextBlocking),
      warningCount: Math.max(current.warningCount, nextWarnings),
      duplicateIdsFound: Math.max(current.duplicateIdsFound, countIssues(nextDraft.issues, 'duplicate')),
      danglingReferencesFound: Math.max(current.danglingReferencesFound, countIssues(nextDraft.issues, 'dangling')),
      missingOwners: Math.max(current.missingOwners, countIssues(nextDraft.issues, 'owner-missing')),
      missingSources: Math.max(current.missingSources, countIssues(nextDraft.issues, 'source-missing')),
      missingEvidencePolicies: Math.max(current.missingEvidencePolicies, countIssues(nextDraft.issues, 'integration-metadata')),
      validationAttempts: current.validationAttempts + 1,
      validDraftAt: nextBlocking === 0 ? finishedAt : current.validDraftAt
    }));
  };

  const injectIdConflict = () => {
    if (frozen || !currentBundle.entities?.length) return;
    markDirty();
    const next = structuredClone(currentBundle) as PilotSourceBundle;
    next.entities.push(structuredClone(next.entities[0]!));
    setDraft(createPilotPackageDraft(next));
    setCompilation(null);
    setMessageAr('أُضيف تعارض معرّف خيالي لاختبار الحجب؛ شغّل التحقق لرؤية المشكلة.');
  };

  const correctDraft = async () => {
    markDirty();
    const fixture = await createFictionalPilotSourceBundle();
    setDraft(createPilotPackageDraft(fixture));
    setCompilation(null);
    setMessageAr('أعيدت المسودة إلى النموذج الخيالي الكامل؛ يلزم التحقق من جديد.');
    setMetrics((current) => ({ ...current, correctedMappingCount: current.correctedMappingCount + 1 }));
  };

  const compileDraft = async () => {
    markDirty();
    const result = await compilePilotPackageDraft(draft, new Date().toISOString());
    setCompilation(result);
    if (!result.success) {
      setDraft((current) => ({ ...current, issues: [...result.issues] }));
      setMessageAr('فشلت الترجمة بأمان؛ لم تُنشأ حزمة مرشحة.');
      return;
    }
    setMessageAr('نجحت ترجمة النموذج الخيالي، وحزمة الفعالية جاهزة للتجميد المحلي.');
  };

  const freezeDraft = async () => {
    if (!compilation?.success) return;
    markDirty();
    const bundle = draft.sourceBundle as PilotSourceBundle;
    const result = await freezePilotPackage(bundle, compilation);
    if (!result.success || !result.artifact) {
      setDraft((current) => ({ ...current, issues: result.issues }));
      setMessageAr('تعذر التجميد لأن بوابة الحوكمة لم تكتمل.');
      return;
    }
    setFrozenArtifacts((current) => [result.artifact!, ...current]);
    setLastFrozenBundle(structuredClone(bundle));
    setDraft((current) => ({ ...current, frozenArtifactId: result.artifact!.artifactId }));
    setMessageAr('جُمّد النموذج الخيالي محلياً. لا يمكن تعديل هذا الأثر؛ أي تغيير يتطلب مراجعة جديدة.');
    setFreezeManifestExpanded(false);
    const frozenAt = new Date().toISOString();
    setMetrics((current) => ({
      ...current,
      frozenAt,
      validToFrozenDurationMs: current.validDraftAt ? Math.max(0, Date.parse(frozenAt) - Date.parse(current.validDraftAt)) : null
    }));
  };

  const createRevision = () => {
    if (!lastFrozenBundle) return;
    markDirty();
    const next = structuredClone(lastFrozenBundle);
    next.revision += 1;
    next.changeReason = `مراجعة خيالية ${next.revision} بعد التجميد المحلي.`;
    next.pilotBundleVersion = `1.0.${next.revision - 1}`;
    setDraft(createPilotPackageDraft(next));
    setCompilation(null);
    setMessageAr(`أُنشئت مراجعة خيالية جديدة رقم ${next.revision}؛ الأثر السابق بقي محفوظاً.`);
  };

  const activateFrozen = async () => {
    const artifact = frozenArtifacts[0];
    if (!artifact) return;
    const validation = await validateEventPackage(artifact.eventPackage);
    const activated = Boolean(validation.runtime && activateTemporaryEventRuntime(validation.runtime, 'تفعيل نموذج تأليف خيالي مجمّد محلياً.'));
    setMetrics((current) => ({ ...current, activationOutcome: activated ? 'succeeded' : 'failed' }));
    setMessageAr(activated ? 'تم تفعيل النموذج الخيالي مؤقتاً؛ لا يمثل تجربة حقيقية أو حالة تشغيلية معتمدة.' : 'فشل التفعيل وبقي سياق التشغيل السابق دون تغيير.');
  };

  const resetDraft = () => {
    setDraft(createPilotPackageDraft());
    setCompilation(null);
    setMessageAr(`مُسحت جلسة التأليف وبقي ${frozenArtifacts.length} أثر مجمّد محلياً.`);
    onDirtyChange(false);
  };

  const exportReport = () => downloadJson('pilot-authoring-validation-report.json', {
    generatedAt: new Date().toISOString(),
    status: frozenArtifacts.length ? 'fictional-frozen-local' : 'real-pilot-input-missing',
    messageAr: missingInputMessage,
    metrics,
    issues: draft.issues,
    idMappingReport: idReport,
    frozenArtifacts: frozenArtifacts.map(({ artifactId, packageContentHash, sourceBundleHash, frozenRevision, frozenAt }) => ({ artifactId, packageContentHash, sourceBundleHash, frozenRevision, frozenAt }))
  });

  const exportFrozenPackage = () => {
    downloadJson('frozen-pilot-event-package.json', frozenArtifacts[0]?.eventPackage);
    setExportStatus('تم تصدير الحزمة المجمدة محلياً بصيغة ملف منظم منقح.');
  };

  const exportValidationReport = () => {
    exportReport();
    setExportStatus('تم تصدير تقرير التحقق المحلي بصيغة ملف منظم منقح.');
  };

  return (
    <div data-testid="pilot-authoring-workspace" className="min-h-0 flex-1 overflow-y-auto bg-command-bg p-4 command-scrollbar" lang="ar" dir="rtl">
      <header className="border border-command-line bg-command-panel px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-command-accent">المرحلة 3E.2 · أداة محلية غير إنتاجية</p>
            <h2 className="mt-1 text-xl font-semibold text-command-text">مختبر إعداد حزمة الفعالية التجريبية</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-command-muted">مصادر محكومة ← مسودة ← تحقق وربط ← حزمة فعالية ← تجميد محلي ← تفعيل مؤقت. لا توجد بيانات حية أو اعتماد تشغيلي.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div data-testid="pilot-source-classification" className="border border-amber-300/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">النموذج الحالي: خيالي · اختبار تقني منفصل</div>
            <button data-testid="pilot-return-kap-candidate" type="button" onClick={onReturnToCandidate} className="command-button">العودة إلى حزمة KAP المرشحة</button>
          </div>
        </div>
      </header>

      <section data-testid="pilot-input-status" className="mt-4 grid gap-3 border border-command-line bg-command-panel p-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-semibold text-command-accent">حالة مدخلات التجربة</p>
          <h3 className="mt-1 text-lg font-semibold">لا توجد حزمة مصدر حقيقية</h3>
          <p className="mt-2 text-sm leading-7 text-command-muted">{missingInputMessage}</p>
          <p className="mt-2 text-xs text-command-muted">مسار الإدخال المحلي المتجاهل: <code dir="ltr">pilot-input/</code>
          </p>
        </div>
        <div className="flex flex-wrap content-start gap-2">
          <button data-testid="pilot-load-incomplete" type="button" onClick={() => void loadIncomplete()} className="command-button"><FileWarning className="h-4 w-4" />اختبار مسودة ناقصة</button>
          <button data-testid="pilot-load-fictional" type="button" onClick={() => void loadFictionalFixture()} className="command-button command-button-primary"><Archive className="h-4 w-4" />تحميل نموذج خيالي</button>
          <button data-testid="pilot-reset-draft" type="button" onClick={resetDraft} className="command-button"><RefreshCcw className="h-4 w-4" />مسح جلسة التأليف</button>
        </div>
      </section>

      <section data-testid="pilot-completeness" className="mt-4 grid gap-px border border-command-line bg-command-line sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="اكتمال الحقول" value={`${completeness}%`} />
        <Metric label="مشاكل مانعة" value={String(blockingIssues.length)} tone={blockingIssues.length ? 'warn' : 'ok'} />
        <Metric label="تحذيرات" value={String(warningIssues.length)} />
        <Metric label="محاولات التحقق" value={String(metrics.validationAttempts)} />
        <Metric label="تعارضات المعرّفات" value={String(idReport?.duplicateCount ?? 0)} />
        <Metric label="مراجع معلقة" value={String(idReport?.danglingReferenceCount ?? 0)} />
      </section>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <AuthoringSection testId="pilot-template-list" title="قوالب الإدخال" subtitle="أمثلة خيالية لا تُعامل كبيانات حقيقية">
            <div className="grid gap-2 sm:grid-cols-2">{pilotInputTemplateFiles.map((fileName) => <div key={fileName} className="flex items-center justify-between border-b border-command-line py-2 text-sm"><span className="ltr text-left">{fileName}</span><span className="text-amber-200">مثال فقط</span></div>)}</div>
          </AuthoringSection>

          <AuthoringSection testId="pilot-id-validation" title="مشاكل المعرّفات والعلاقات" subtitle="المعرّفات دائمة ولا تُشتق من أسماء العرض">
            <div className="flex flex-wrap gap-2">
              <button data-testid="pilot-inject-id-conflict" type="button" disabled={frozen || !currentBundle.entities?.length} onClick={injectIdConflict} className="command-button">اختبار تعارض معرّف</button>
              <button data-testid="pilot-correct-draft" type="button" disabled={frozen} onClick={() => void correctDraft()} className="command-button">تصحيح النموذج</button>
            </div>
            <IssueSummary testId="pilot-id-issues" issues={(idReport?.issues ?? []).filter((current) => current.category === 'identity')} empty="لا توجد مشاكل هوية مكتشفة في الحالة الحالية." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-spatial-validation" title="الهندسة المكانية" subtitle="إحداثيات محلية ومرجع مكاني وربط نموذج">
            <DataLine label="العناصر" value={String(currentBundle.entities?.length ?? 0)} />
            <DataLine label="المرجع الجغرافي" value={currentBundle.spatialProfile?.geographicReference ? 'محفوظ للبوابة المكانية المستقبلية' : 'غير متاح'} />
            <IssueSummary issues={draft.issues.filter((current) => current.category === 'spatial')} empty="لا توجد أخطاء مكانية بعد التحقق." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-route-authoring" title="المسارات" subtitle="الهندسة والاتجاه والسلطة والإصدار قبل أي ادعاء اعتماد">
            <DataLine label="المسارات" value={String(currentBundle.routes?.length ?? 0)} />
            <DataLine label="المسارات المعتمدة رسمياً" value="0" />
            <IssueSummary testId="pilot-route-validation" issues={draft.issues.filter((current) => current.category === 'route')} empty="لا توجد أخطاء مسار بعد التحقق؛ تبقى المسارات غير معتمدة ميدانياً." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-readiness-authoring" title="الجاهزية" subtitle="الملكية والمصدر والدليل منفصلة عن نسبة الجاهزية">
            <DataLine label="سجلات الجاهزية" value={String(currentBundle.readinessRecords?.length ?? 0)} />
            <IssueSummary testId="pilot-readiness-validation" issues={draft.issues.filter((current) => current.category === 'readiness')} empty="لا توجد أخطاء جاهزية بعد التحقق." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-decision-authoring" title="القرارات" subtitle="النطاق والمالك والسلطة والخيارات والأثر">
            <DataLine label="القرارات" value={String(currentBundle.decisionRecords?.length ?? 0)} />
            <IssueSummary testId="pilot-decision-validation" issues={draft.issues.filter((current) => current.category === 'decision')} empty="لا توجد أخطاء قرار بعد التحقق." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-authority-matrix" title="الأدوار والصلاحيات" subtitle="تحقق محلي؛ ليس إنفاذ هوية إنتاجية">
            <DataLine label="الأدوار" value={String(currentBundle.roles?.length ?? 0)} />
            <DataLine label="جهات الصلاحية" value={String(currentBundle.authorities?.length ?? 0)} />
            <IssueSummary issues={draft.issues.filter((current) => current.category === 'authority')} empty="لا توجد تعارضات فصل واجبات بعد التحقق." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-evidence-sources" title="الأدلة والمصادر" subtitle="مراجع فقط؛ لا تُدرج ملفات حساسة">
            <DataLine label="سجل الأدلة" value={String(currentBundle.evidenceRegister?.length ?? 0)} />
            <DataLine label="سجل المصادر" value={String(currentBundle.sourceRegister?.length ?? 0)} />
            <p className="mt-2 text-sm text-command-muted">لا كلمات مرور، ولا رموز وصول، ولا بيانات شخصية، ولا هندسة أمنية داخل المستودع أو التصدير.</p>
          </AuthoringSection>

          <AuthoringSection testId="pilot-integration-manifest" title="بيان مرشحي التكامل" subtitle="عقود فقط؛ لا اتصالات خارجية">
            <div className="mb-3 flex flex-wrap gap-2">{(['input', 'spatial', 'physical'] as const).map((path) => <button key={path} data-testid={`pilot-integration-path-${path}`} type="button" onClick={() => setSelectedIntegrationPath(path)} className={`command-button ${selectedIntegrationPath === path ? 'command-button-primary' : ''}`}>{integrationPathLabels[path]}</button>)}</div>
            <div className="grid gap-2">{(currentBundle.integrationCandidates ?? []).filter((candidate) => candidate.path === selectedIntegrationPath).map((candidate) => <div key={candidate.candidateId} className="border border-command-line p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{candidate.systemName}</strong><span className="text-command-accent">{integrationPathLabels[candidate.path]}</span></div><p className="mt-1 text-xs text-command-muted">{candidate.owner} · {integrationStatusLabels[candidate.adapterStatus] ?? 'حالة غير معروفة'} · {securityClassificationLabels[candidate.securityClassification] ?? 'تصنيف غير معروف'}</p><p className="mt-2 text-xs leading-5 text-command-muted">{candidate.errorBehavior} · {candidate.exitExportMethod}</p></div>)}</div>
          </AuthoringSection>
        </div>

        <div className="space-y-4">
          <AuthoringSection testId="pilot-validation-report" title="تقرير التحقق" subtitle={messageAr}>
            <div className="flex flex-wrap gap-2">
              <button data-testid="pilot-validate" type="button" disabled={frozen} onClick={validateDraft} className="command-button command-button-primary"><CheckCircle2 className="h-4 w-4" />تشغيل التحقق</button>
              <button data-testid="pilot-compile" type="button" disabled={frozen || blockingIssues.length > 0} onClick={() => void compileDraft()} className="command-button">ترجمة حزمة الفعالية</button>
            </div>
            <IssueSummary testId="pilot-validation-issues" issues={draft.issues} empty="لم يُشغّل التحقق أو لا توجد مشاكل في المسودة الحالية." />
          </AuthoringSection>

          <AuthoringSection testId="pilot-package-preview" title="معاينة الحزمة" subtitle="الناتج المرشح منفصل عن المسودة">
            {compilation?.success && compilation.eventPackage ? <div className="grid gap-2 text-sm sm:grid-cols-2"><DataLine label="معرّف الحزمة" value={compilation.eventPackage.packageId} ltr /><DataLine label="بصمة الحزمة" value={compilation.eventPackage.packageContentHash} ltr /><DataLine label="بصمة المصدر" value={compilation.sourceBundleHash ?? 'غير متاح'} ltr /><DataLine label="السياق" value="بيانات تجريبية مؤقتة" /></div> : <p className="text-sm text-command-muted">لا توجد حزمة مترجمة صالحة بعد.</p>}
          </AuthoringSection>

          <AuthoringSection testId="pilot-freeze-section" title="تجميد الحزمة" subtitle="تجميد محلي؛ ليس توقيعاً رقمياً أو اعتماداً رسمياً">
            <div className="flex flex-wrap gap-2">
              <button data-testid="pilot-freeze" type="button" disabled={frozen || !compilation?.success} onClick={() => void freezeDraft()} className="command-button command-button-primary"><Snowflake className="h-4 w-4" />تجميد محلي</button>
              <button data-testid="pilot-new-revision" type="button" disabled={!lastFrozenBundle} onClick={createRevision} className="command-button"><GitCompareArrows className="h-4 w-4" />مراجعة جديدة</button>
            </div>
            {frozenArtifacts[0] ? <div data-testid="pilot-frozen-artifact" data-immutable="true" className="mt-3 border border-command-accent/50 bg-command-accent/10 p-3"><div className="flex items-center gap-2 text-command-accent"><LockKeyhole className="h-4 w-4" /><strong>أثر مجمّد غير قابل للتعديل</strong></div><p data-testid="pilot-frozen-immutable" className="ltr mt-2 break-all text-left text-xs">{frozenArtifacts[0].artifactId} · {frozenArtifacts[0].packageContentHash}</p></div> : null}
            {frozenArtifacts[0] ? <button data-testid="pilot-freeze-manifest-toggle" type="button" onClick={() => setFreezeManifestExpanded((value) => !value)} className="command-button mt-3"><Eye className="h-4 w-4" />{freezeManifestExpanded ? 'إخفاء بيان التجميد' : 'عرض بيان التجميد'}</button> : null}
            {freezeManifestExpanded && frozenArtifacts[0] ? <div data-testid="pilot-freeze-manifest" className="mt-3 space-y-1 border border-command-line bg-command-panelStrong p-3 text-xs"><DataLine label="بصمة المصدر" value={frozenArtifacts[0].sourceBundleHash} ltr /><DataLine label="مراجعة التجميد" value={String(frozenArtifacts[0].frozenRevision)} /><DataLine label="مدخلات البيان" value={String(frozenArtifacts[0].inputManifest.length)} /><DataLine label="مرشحو التكامل" value={String(frozenArtifacts[0].integrationCandidateManifest.length)} /></div> : null}
          </AuthoringSection>

          <AuthoringSection testId="pilot-revision-comparison" title="مقارنة المراجعات" subtitle="كل تغيير ينتج أثراً جديداً ويحفظ السابق">
            <div data-testid="pilot-revision-list" className="space-y-2">{frozenArtifacts.length ? frozenArtifacts.map((artifact) => <div key={artifact.artifactId} className="grid gap-2 border-b border-command-line py-2 text-sm sm:grid-cols-[auto_1fr]"><span>المراجعة {artifact.frozenRevision}</span><span className="ltr break-all text-left text-xs">{artifact.packageContentHash}</span></div>) : <p className="text-sm text-command-muted">لا توجد مراجعات مجمّدة.</p>}</div>
          </AuthoringSection>

          <AuthoringSection testId="pilot-activation-proof" title="التفعيل المؤقت" subtitle="نموذج خيالي فقط حتى تصل بيانات أحمد">
            <div className="flex flex-wrap gap-2">
              <button data-testid="pilot-activate" type="button" disabled={!frozenArtifacts.length} onClick={() => void activateFrozen()} className="command-button command-button-primary"><Play className="h-4 w-4" />تفعيل الأثر المجمد</button>
            </div>
            <p data-testid="pilot-activation-status" className="mt-3 text-sm text-command-muted">{activeRuntime?.identity.eventInstanceId === frozenArtifacts[0]?.eventId ? `مفعّل مؤقتاً: ${activeRuntime?.identity.eventNameAr ?? ''}` : 'لم يُفعّل أثر تأليف بعد.'}</p>
          </AuthoringSection>

          <AuthoringSection testId="pilot-authoring-metrics" title="مقاييس تجربة التأليف" subtitle="تقيس العملية لا القيمة التشغيلية">
            <div className="grid gap-2 sm:grid-cols-2"><DataLine label="محاولات التحقق" value={String(metrics.validationAttempts)} /><DataLine label="تصحيحات الربط" value={String(metrics.correctedMappingCount)} /><DataLine label="ملاك مفقودون" value={String(metrics.missingOwners)} /><DataLine label="مصادر مفقودة" value={String(metrics.missingSources)} /><DataLine label="نتيجة التفعيل" value={activationOutcomeLabels[metrics.activationOutcome]} /><DataLine label="زمن الصالح إلى المجمد" value={metrics.validToFrozenDurationMs === null ? 'غير مقاس' : `${metrics.validToFrozenDurationMs} ملّي ثانية`} /></div>
          </AuthoringSection>

          <AuthoringSection testId="pilot-export-section" title="تصدير الحزمة والتقارير" subtitle="ملف محلي منقح بلا أسرار">
            <div className="flex flex-wrap gap-2">
              <button data-testid="pilot-export-package" type="button" disabled={!frozenArtifacts.length} onClick={exportFrozenPackage} className="command-button"><Download className="h-4 w-4" />تصدير الحزمة</button>
              <button data-testid="pilot-export-report" type="button" onClick={exportValidationReport} className="command-button"><Download className="h-4 w-4" />تصدير التقرير</button>
            </div>
            <p data-testid="pilot-export-status" className="mt-3 text-sm text-command-muted">{exportStatus}</p>
          </AuthoringSection>

          <section data-testid="pilot-missing-data" className="border border-red-300/40 bg-red-950/20 p-4">
            <div className="flex items-center gap-2 text-red-100"><ShieldAlert className="h-5 w-5" /><h3 className="font-semibold">سجل المدخلات المفقودة من أحمد</h3></div>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-red-100/85 sm:grid-cols-2">
              {['هوية الفعالية والموقع المعتمدة', 'سجل العناصر والهندسة ومصدرها', 'المسارات وسلطاتها وإصداراتها', 'ملاك الجاهزية ومصادرها وأدلتها', 'القرارات والسلطات والخيارات', 'مصفوفة الأدوار وفصل الواجبات', 'سياسة الأدلة والخصوصية والاحتفاظ', 'مرشحو التكامل ومعايير قبولهم'].map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export function PilotAuthoringWorkspace({
  mode,
  onModeChange,
  onDirtyChange = () => undefined
}: {
  mode: 'kap-candidate' | 'fictional-technical';
  onModeChange: (mode: 'kap-candidate' | 'fictional-technical') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  useEffect(() => {
    if (mode === 'kap-candidate') onDirtyChange(false);
  }, [mode, onDirtyChange]);
  return mode === 'kap-candidate'
    ? <KapPilotCandidateWorkspace onOpenTechnicalFixture={() => onModeChange('fictional-technical')} />
    : <FictionalPilotAuthoringWorkspace onReturnToCandidate={() => onModeChange('kap-candidate')} onDirtyChange={onDirtyChange} />;
}

function AuthoringSection({ testId, title, subtitle, children }: { testId: string; title: string; subtitle: string; children: React.ReactNode }) {
  return <section data-testid={testId} className="border border-command-line bg-command-panel p-4"><div className="border-b border-command-line pb-3"><h3 className="font-semibold text-command-text">{title}</h3><p className="mt-1 text-xs leading-5 text-command-muted">{subtitle}</p></div><div className="mt-3">{children}</div></section>;
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'ok' | 'warn' }) {
  return <div className="bg-command-panel p-3"><p className="text-xs text-command-muted">{label}</p><p className={`ltr mt-1 text-left text-xl font-semibold ${tone === 'ok' ? 'text-command-accent' : tone === 'warn' ? 'text-amber-300' : 'text-command-text'}`}>{value}</p></div>;
}

function DataLine({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="flex min-w-0 items-start justify-between gap-3 border-b border-command-line py-2 text-sm"><span className="text-command-muted">{label}</span><strong className={`${ltr ? 'ltr break-all text-left' : 'text-left'} min-w-0`}>{value}</strong></div>;
}

function IssueSummary({ issues, empty, testId }: { issues: PilotValidationIssue[]; empty: string; testId?: string }) {
  return <div data-testid={testId} className="mt-3 space-y-2">{issues.length ? issues.slice(0, 12).map((current, index) => <div key={`${current.code}-${current.path}-${index}`} className={`border px-3 py-2 text-sm leading-6 ${current.severity === 'blocking' ? 'border-red-300/40 bg-red-950/20 text-red-100' : 'border-amber-300/40 bg-amber-950/20 text-amber-100'}`}>{current.messageAr}<span className="ltr mt-1 block break-all text-left text-[10px] opacity-65">{current.path}</span></div>) : <p className="text-sm text-command-muted">{empty}</p>}</div>;
}
