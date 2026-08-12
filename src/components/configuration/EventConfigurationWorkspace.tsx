import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  FileJson,
  GitCompareArrows,
  Layers3,
  Map,
  RotateCcw,
  ShieldCheck,
  Undo2,
  Waypoints
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  defaultReferenceEventPackageId,
  loadReferenceEventPackages
} from '../../data/referenceEventPackages';
import { compareEventRuntimes } from '../../services/eventPackageActivation';
import { withEventPackageContentHash } from '../../services/eventPackageHash';
import { validateEventPackage } from '../../services/eventPackageValidation';
import { useEventStore } from '../../store/useEventStore';
import type {
  EventPackage,
  EventPackageImportPreview,
  EventRuntimeConfiguration,
  IntegrationProfileDefinition
} from '../../types/eventPackage';
import type { RouteVisibility } from '../../types/routes';
import type { EntityType, SpatialEntityId } from '../../types/spatial';
import { EventSceneViewport } from '../../three/scene/EventSceneViewport';
import { ReadinessPlan2D } from '../readiness/ReadinessPlan2D';
import { EmptyState, LoadingState } from '../shared/StateBlocks';

const eventTypeLabelsAr: Record<string, string> = {
  exhibition: 'معرض',
  conference: 'مؤتمر',
  festival: 'مهرجان'
};

const entityTypeLabelsAr: Record<EntityType, string> = {
  site: 'موقع',
  zone: 'منطقة',
  hall: 'قاعة',
  gate: 'بوابة',
  route: 'مسار',
  stage: 'منصة',
  parking: 'مواقف',
  service: 'خدمات',
  assembly: 'نقطة تجمع',
  asset: 'أصل تشغيلي'
};

const offlinePolicyLabelsAr: Record<IntegrationProfileDefinition['offlinePolicy'], string> = {
  'not-supported': 'لا يدعم العمل دون اتصال',
  'queue-local-preview': 'طابور معاينة محلي',
  'manual-retry-preview': 'إعادة محاولة محلية يدوية'
};

function emptyPreview(): EventPackageImportPreview {
  return { rawJson: '', parsedPackage: null, validation: null, differences: [] };
}

function routeVisibilityFor(runtime: EventRuntimeConfiguration | null): RouteVisibility {
  return (runtime?.routes ?? []).reduce<RouteVisibility>((visibility, route) => {
    visibility[route.id] = true;
    return visibility;
  }, {} as RouteVisibility);
}

export function EventConfigurationWorkspace() {
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState(defaultReferenceEventPackageId);
  const [preview, setPreview] = useState<EventPackageImportPreview>(emptyPreview);
  const [selectedPreviewEntityId, setSelectedPreviewEntityId] = useState<SpatialEntityId | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [busy, setBusy] = useState(true);
  const [messageAr, setMessageAr] = useState('جاري تحميل مكتبة الحزم المرجعية.');
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const activeProjectId = useEventStore((state) => state.activeProjectId);
  const activeProjectEventId = useEventStore((state) => state.activeProjectEventId);
  const previousRuntimeSession = useEventStore((state) => state.previousRuntimeSession);
  const activationHistory = useEventStore((state) => state.activationHistory);
  const activateTemporaryEventRuntime = useEventStore((state) => state.activateTemporaryEventRuntime);
  const rollbackTemporaryEventRuntime = useEventStore((state) => state.rollbackTemporaryEventRuntime);
  const deactivateTemporaryEventRuntime = useEventStore((state) => state.deactivateTemporaryEventRuntime);

  useEffect(() => {
    let active = true;
    void loadReferenceEventPackages().then(async (loadedPackages) => {
      if (!active) return;
      setPackages(loadedPackages);
      const activePackageId = useEventStore.getState().activeRuntime?.identity.packageId;
      const packageId = activePackageId && loadedPackages.some((item) => item.packageId === activePackageId)
        ? activePackageId
        : defaultReferenceEventPackageId;
      setSelectedPackageId(packageId);
      const selected = loadedPackages.find((item) => item.packageId === packageId)!;
      const validation = await validateEventPackage(selected, { packageCatalog: loadedPackages });
      const nextPreview: EventPackageImportPreview = {
        rawJson: JSON.stringify(selected, null, 2),
        parsedPackage: structuredClone(selected),
        validation,
        differences: validation.runtime
          ? compareEventRuntimes(useEventStore.getState().activeRuntime, validation.runtime)
          : []
      };
      if (!active) return;
      setPreview(nextPreview);
      setJsonText(JSON.stringify(selected, null, 2));
      setSelectedPreviewEntityId(nextPreview.validation?.runtime?.readinessRecords[0]?.zoneId ?? null);
      setMessageAr('اكتملت المعاينة المحلية؛ لم تتغير الحالة الأساسية.');
      setBusy(false);
    });
    return () => { active = false; };
  }, []);

  const selectedPackage = useMemo(
    () => packages.find((eventPackage) => eventPackage.packageId === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );
  const runtime = preview.validation?.runtime ?? null;
  const visibleRoutes = useMemo(() => routeVisibilityFor(runtime), [runtime]);
  const blockingIssues = preview.validation?.issues.filter((issue) => issue.severity === 'blocking') ?? [];
  const warningIssues = preview.validation?.issues.filter((issue) => issue.severity === 'warning') ?? [];
  const previewMatchesProject = !activeProjectEventId || runtime?.identity.eventInstanceId === activeProjectEventId;

  const previewPackage = async (eventPackage: EventPackage, message = 'تم تحميل الحزمة في المعاينة فقط.') => {
    setBusy(true);
    setSelectedPackageId(eventPackage.packageId);
    const validation = await validateEventPackage(eventPackage, { packageCatalog: packages });
    const nextPreview: EventPackageImportPreview = {
      rawJson: JSON.stringify(eventPackage, null, 2),
      parsedPackage: structuredClone(eventPackage),
      validation,
      differences: validation.runtime ? compareEventRuntimes(activeRuntime, validation.runtime) : []
    };
    setPreview(nextPreview);
    setJsonText(JSON.stringify(eventPackage, null, 2));
    setSelectedPreviewEntityId(nextPreview.validation?.runtime?.readinessRecords[0]?.zoneId ?? null);
    setMessageAr(message);
    setBusy(false);
  };

  const activatePreview = () => {
    const runtime = preview.validation?.runtime;
    const activated = Boolean(runtime && preview.validation?.valid && activateTemporaryEventRuntime(
      runtime,
      'تفعيل محلي مؤقت بعد نجاح مخطط الحزمة والعلاقات والاعتماديات.'
    ));
    setMessageAr(activated
      ? 'تم التفعيل محلياً في سياق البيانات التجريبية المؤقتة.'
      : 'حُجب التفعيل؛ بقيت الحزمة النشطة دون تغيير.');
  };

  const validateJson = async () => {
    setBusy(true);
    let nextPreview: EventPackageImportPreview;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const validation = await validateEventPackage(parsed, { packageCatalog: packages });
      nextPreview = {
        rawJson: jsonText,
        parsedPackage: validation.schemaValid ? structuredClone(parsed) as EventPackage : null,
        validation,
        differences: validation.runtime ? compareEventRuntimes(activeRuntime, validation.runtime) : []
      };
    } catch {
      nextPreview = {
        rawJson: jsonText,
        parsedPackage: null,
        validation: {
          valid: false,
          schemaValid: false,
          contentHashValid: false,
          runtime: null,
          issues: [{ code: 'event-package-json-invalid', path: '$', messageAr: 'ملف JSON غير قابل للقراءة؛ لم تتغير الحزمة النشطة.', severity: 'blocking' }]
        },
        differences: []
      };
    }
    setPreview(nextPreview);
    setSelectedPreviewEntityId(nextPreview.validation?.runtime?.readinessRecords[0]?.zoneId ?? null);
    setMessageAr(nextPreview.validation?.valid ? 'اجتاز ملف JSON المعاينة والتحقق، ولم يُفعّل بعد.' : 'حُجب ملف JSON في المعاينة ولم تتغير الحالة النشطة.');
    setBusy(false);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBusy(true);
    setJsonText(text);
    await validateJsonText(text);
    setBusy(false);
  };

  const validateJsonText = async (text: string) => {
    let nextPreview: EventPackageImportPreview;
    try {
      const parsed = JSON.parse(text) as unknown;
      const validation = await validateEventPackage(parsed, { packageCatalog: packages });
      nextPreview = {
        rawJson: text,
        parsedPackage: validation.schemaValid ? structuredClone(parsed) as EventPackage : null,
        validation,
        differences: validation.runtime ? compareEventRuntimes(activeRuntime, validation.runtime) : []
      };
    } catch {
      nextPreview = {
        rawJson: text,
        parsedPackage: null,
        validation: {
          valid: false,
          schemaValid: false,
          contentHashValid: false,
          runtime: null,
          issues: [{ code: 'event-package-json-invalid', path: '$', messageAr: 'ملف JSON غير قابل للقراءة؛ لم تتغير الحزمة النشطة.', severity: 'blocking' }]
        },
        differences: []
      };
    }
    setPreview(nextPreview);
    setSelectedPreviewEntityId(nextPreview.validation?.runtime?.readinessRecords[0]?.zoneId ?? null);
    setMessageAr(nextPreview.validation?.valid ? 'تمت معاينة الملف المحلي بنجاح.' : 'يحتوي الملف المحلي أخطاء مانعة.');
  };

  const showInvalidPackage = async () => {
    if (!selectedPackage) return;
    const invalid = structuredClone(selectedPackage);
    invalid.eventInstance.venueId = 'VENUE-UNKNOWN-DEMO';
    const hashed = await withEventPackageContentHash(invalid);
    await previewPackage(hashed, 'معاينة اختبارية: الموقع غير معروف، لذلك يجب منع التفعيل.');
  };

  const showMissingDependency = async () => {
    if (!selectedPackage) return;
    const invalid = structuredClone(selectedPackage);
    invalid.operationalPackConfiguration.enabledPackIds = invalid.operationalPackConfiguration.enabledPackIds.filter((packId) => packId !== 'spatial-foundation');
    delete invalid.operationalPackConfiguration.configurationByPackId['spatial-foundation'];
    const hashed = await withEventPackageContentHash(invalid);
    await previewPackage(hashed, 'معاينة اختبارية: اعتماد تشغيلي مفقود، لذلك يجب منع التفعيل.');
  };

  const rollback = () => {
    const rolledBack = rollbackTemporaryEventRuntime();
    setMessageAr(rolledBack ? 'أعيدت جلسة الحزمة السابقة كاملة.' : 'لا توجد حزمة سابقة متاحة للتراجع.');
  };

  const reset = async () => {
    if (!activeProjectId) deactivateTemporaryEventRuntime();
    const defaultPackage = packages.find((eventPackage) => eventPackage.packageId === defaultReferenceEventPackageId);
    const activePackage = packages.find((eventPackage) => eventPackage.packageId === activeRuntime?.identity.packageId);
    const resetPackage = activeProjectId ? activePackage : defaultPackage;
    if (resetPackage) await previewPackage(
      resetPackage,
      activeProjectId
        ? 'أعيدت معاينة حزمة المشروع؛ بقي Runtime المشروع النشط دون تغيير.'
        : 'أزيلت الحزمة النشطة وأعيدت بيانات العرض المحلية؛ الحزمة المرجعية في المعاينة فقط.'
    );
  };

  if (busy && packages.length === 0) {
    return <div className="flex min-h-0 flex-1 items-center justify-center p-6"><LoadingState title="جاري تحميل تهيئة الفعاليات" message="يتم بناء الحزم المرجعية وحساب هويات المحتوى محلياً." /></div>;
  }

  return (
    <section
      data-testid="event-configuration-workspace"
      className="min-h-0 flex-1 overflow-y-auto bg-command-bg px-4 py-4 command-scrollbar"
      aria-label="تهيئة الفعاليات والحزم التشغيلية"
    >
      <div className="mx-auto max-w-[1840px] space-y-4">
        <header className="border border-command-line bg-command-panel px-4 py-4 shadow-command">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-command-accent">Stage 3E · مختبر تهيئة محلي</p>
              <h2 className="mt-1 text-xl font-bold text-command-text">تهيئة الفعاليات والحزم التشغيلية</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-command-muted">نواة منصة واحدة تستقبل قالباً ومثيلاً وحزماً تشغيلية مختلفة. التحقق التقني لا يثبت حقيقة تشغيلية أو اعتماداً رسمياً.</p>
            </div>
            <div data-testid="package-demo-classification" className="grid gap-1 border border-command-amber/50 bg-command-amber/10 px-3 py-2 text-xs text-command-text">
              <strong className="text-command-amber">بيانات تجريبية مؤقتة</strong>
              <span>ليست فعالية تشغيلية حية</span>
              <span>لا يوجد اعتماد إنتاجي أو تكامل خارجي حي</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-command-muted">
            <span className="border border-command-line bg-command-panelStrong px-2.5 py-1.5">{messageAr}</span>
            <span data-testid="package-active-identity" className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-command-accent/50 bg-command-accent/10 px-2.5 py-1.5 text-command-text">
              <span>الحزمة النشطة: {activeRuntime?.identity.eventNameAr ?? 'لم تُفعّل حزمة Stage 3E بعد'}</span>
              {activeRuntime ? <><span aria-hidden="true">·</span><span className="ltr inline-block">{activeRuntime.identity.eventInstanceId}</span><span aria-hidden="true">·</span><span className="ltr inline-block">{activeRuntime.identity.venueId}</span></> : null}
            </span>
          </div>
        </header>

        <WorkspaceSection title="مكتبة حزم الفعاليات" icon={<Boxes className="h-4 w-4" aria-hidden="true" />} testId="event-package-library">
          <div className="grid gap-2 md:grid-cols-3">
            {packages.map((eventPackage) => {
              const selected = eventPackage.packageId === selectedPackageId;
              const active = activeRuntime?.identity.packageId === eventPackage.packageId;
              return (
                <button
                  key={eventPackage.packageId}
                  type="button"
                  data-testid={`event-package-select-${eventPackage.eventType}`}
                  onClick={() => void previewPackage(eventPackage)}
                  className={`min-h-24 border p-3 text-right transition ${selected ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent/60'}`}
                  aria-pressed={selected}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-command-text">{eventPackage.titleAr}</strong>
                    {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-command-green" aria-label="نشطة" /> : null}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-command-muted">{eventPackage.descriptionAr}</span>
                </button>
              );
            })}
          </div>
        </WorkspaceSection>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <WorkspaceSection title="تعريف الحزمة المختارة" icon={<FileJson className="h-4 w-4" aria-hidden="true" />} testId="selected-package-definition">
            {preview.parsedPackage ? (
              <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <Definition label="معرّف الحزمة" value={preview.parsedPackage.packageId} ltr />
                <Definition label="إصدار الحزمة" value={preview.parsedPackage.packageVersion} ltr />
                <Definition label="هوية المحتوى" value={preview.parsedPackage.packageContentHash} ltr truncate />
                <Definition label="حالة الحزمة" value="صالحة فنياً للعرض المحلي، غير معتمدة إنتاجياً" />
                <Definition label="المصدر" value={preview.parsedPackage.source} />
                <Definition label="المراجعة" value={String(preview.parsedPackage.revision)} ltr />
              </dl>
            ) : <EmptyState title="لا توجد حزمة قابلة للقراءة" message="اختر حزمة مرجعية أو أصلح ملف JSON." />}
          </WorkspaceSection>

          <WorkspaceSection title="نوع الفعالية والقالب والمثيل" icon={<Layers3 className="h-4 w-4" aria-hidden="true" />} testId="package-template-instance">
            {preview.parsedPackage ? (
              <div className="space-y-2 text-sm">
                <KeyValue label="نوع الفعالية" value={eventTypeLabelsAr[preview.parsedPackage.eventType] ?? 'نوع فعالية مهيأ'} />
                <KeyValue label="معرّف نوع الفعالية" value={preview.parsedPackage.eventType} ltr />
                <KeyValue label="القالب القابل لإعادة الاستخدام" value={preview.parsedPackage.eventTemplate.eventTemplateId} ltr />
                <KeyValue label="مثيل الفعالية الخيالي" value={preview.parsedPackage.eventInstance.eventNameAr} />
                <KeyValue label="معرّف المثيل" value={preview.parsedPackage.eventInstance.eventInstanceId} ltr />
                <KeyValue label="الموقع" value={preview.parsedPackage.eventInstance.venueId} ltr />
              </div>
            ) : null}
          </WorkspaceSection>
        </div>

        <WorkspaceSection title="حالة التحقق والاستيراد المحلي" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} testId="package-validation-status">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <div className="flex flex-wrap gap-2">
                <button data-testid="event-package-validate" type="button" onClick={() => selectedPackage && void previewPackage(selectedPackage, 'أعيد التحقق من الحزمة المرجعية.') } className="command-button"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> إعادة التحقق</button>
                <button data-testid="event-package-activate" type="button" onClick={activatePreview} disabled={!preview.validation?.valid || !previewMatchesProject} className="command-button command-button-primary disabled:cursor-not-allowed disabled:opacity-45"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> تفعيل مؤقت محلي</button>
                <button data-testid="simulate-invalid-package" type="button" onClick={() => void showInvalidPackage()} className="command-button"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> اختبار موقع غير معروف</button>
                <button data-testid="simulate-missing-dependency" type="button" onClick={() => void showMissingDependency()} className="command-button"><Waypoints className="h-4 w-4" aria-hidden="true" /> اختبار اعتماد مفقود</button>
              </div>
              <div className={`mt-3 border px-3 py-2 text-sm ${preview.validation?.valid ? 'border-command-green/50 bg-command-green/10 text-command-text' : 'border-command-red/50 bg-command-red/10 text-command-text'}`}>
                {preview.validation?.valid ? 'اجتازت الحزمة مخطط JSON والعلاقات والاعتماديات وهوية المحتوى.' : 'الحزمة غير قابلة للتفعيل. الحزمة النشطة وخط الأساس لم يتغيرا.'}
                <p className="mt-1 text-xs text-command-muted">التحقق التقني لا يعني اعتماداً تشغيلياً أو صحة البيانات.</p>
                {!previewMatchesProject ? <p data-testid="package-project-mismatch" className="mt-1 font-semibold text-command-amber">المعاينة تخص فعالية أخرى؛ يمكن فحصها لكن لا يمكن تفعيلها داخل المشروع النشط.</p> : null}
              </div>
              {(blockingIssues.length > 0 || warningIssues.length > 0) ? (
                <div data-testid="package-validation-issues" className="mt-3 max-h-44 space-y-2 overflow-y-auto command-scrollbar">
                  {[...blockingIssues, ...warningIssues].map((validationIssue, index) => (
                    <div key={`${validationIssue.code}-${validationIssue.path}-${index}`} data-issue-code={validationIssue.code} className={`border px-3 py-2 text-xs ${validationIssue.severity === 'blocking' ? 'border-command-red/50 bg-command-red/10' : 'border-command-amber/50 bg-command-amber/10'}`}>
                      <strong>{validationIssue.messageAr}</strong>
                      <span className="ltr mt-1 block text-command-muted">{validationIssue.path}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-semibold text-command-muted" htmlFor="package-json-input">استيراد JSON بالمعاينة أولاً</label>
              <textarea id="package-json-input" data-testid="package-json-input" value={jsonText} onChange={(event) => setJsonText(event.target.value)} className="command-scrollbar ltr mt-2 h-28 w-full resize-y border border-command-line bg-command-panelStrong p-3 text-left font-mono text-[11px] text-command-text" spellCheck={false} />
              <div className="mt-2 flex flex-wrap gap-2">
                <button data-testid="package-json-preview" type="button" onClick={() => void validateJson()} className="command-button"><FileJson className="h-4 w-4" aria-hidden="true" /> معاينة JSON</button>
                <label className="command-button cursor-pointer">
                  اختيار ملف محلي
                  <input data-testid="package-json-file" type="file" accept="application/json,.json" onChange={(event) => void handleFile(event)} className="sr-only" />
                </label>
              </div>
            </div>
          </div>
        </WorkspaceSection>

        <div className="grid gap-4 2xl:grid-cols-2">
          <WorkspaceSection title="الحزم التشغيلية المفعلة" icon={<Layers3 className="h-4 w-4" aria-hidden="true" />} testId="package-operational-packs">
            <div className="grid gap-2 sm:grid-cols-2">
              {(runtime?.enabledOperationalPacks ?? []).map((pack) => (
                <div key={pack.packId} className="border border-command-line bg-command-panelStrong p-3">
                  <div className="flex items-center justify-between gap-2"><strong className="text-sm text-command-text">{pack.titleAr}</strong><span className="ltr text-[11px] text-command-muted">v{pack.packVersion}</span></div>
                  <p className="mt-1 text-xs leading-5 text-command-muted">{pack.descriptionAr}</p>
                </div>
              ))}
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="الاعتماديات والتعارضات" icon={<GitCompareArrows className="h-4 w-4" aria-hidden="true" />} testId="package-dependencies">
            <div className="space-y-2">
              {(runtime?.enabledOperationalPacks ?? []).map((pack) => (
                <div key={pack.packId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b border-command-line pb-2 text-xs last:border-b-0">
                  <strong className="text-command-text">{pack.titleAr}</strong>
                  <span className="text-command-muted">{pack.requiredPackIds.length ? `يعتمد على: ${pack.requiredPackIds.join('، ')}` : 'لا يعتمد على حزمة أخرى'}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <WorkspaceSection title="الأدوار والصلاحيات" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} testId="package-role-authority">
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-command-accent">الأدوار المحلية</p>
                {(runtime?.roles ?? []).map((role) => <KeyValue key={role.roleId} label={role.titleAr} value={role.responsibility} />)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-command-amber">جهات المراجعة المحلية</p>
                {(runtime?.authorities ?? []).map((authority) => <KeyValue key={authority.authorityId} label={authority.titleAr} value={`${authority.approvalLevels.join('، ')} · غير ملزم إنتاجياً`} />)}
              </div>
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="ملفات التكامل" icon={<Waypoints className="h-4 w-4" aria-hidden="true" />} testId="package-integration-profiles">
            {(runtime?.integrationProfiles ?? []).map((profile) => (
              <div key={profile.integrationProfileId} className="border border-command-line bg-command-panelStrong p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong>{profile.titleAr}</strong><span className="ltr text-xs text-command-accent">{profile.adapterId}@{profile.adapterVersion}</span></div>
                <p className="mt-2 text-xs text-command-muted">{profile.enabled ? 'معلن في الحزمة' : 'غير مفعل في هذه الحزمة'} · {offlinePolicyLabelsAr[profile.offlinePolicy]} · لا شبكة ولا حزمة مورّد</p>
              </div>
            ))}
          </WorkspaceSection>
        </div>

        <WorkspaceSection title="ملخص العناصر والمسارات" icon={<Map className="h-4 w-4" aria-hidden="true" />} testId="package-spatial-summary">
          <div className="grid gap-4 xl:grid-cols-2">
            <div data-testid="package-entity-list" className="max-h-52 overflow-y-auto border border-command-line command-scrollbar">
              {(runtime ? Object.values(runtime.entities) : []).map((entity) => (
                <button key={entity.id} type="button" onClick={() => setSelectedPreviewEntityId(entity.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-command-line px-3 py-2 text-right text-xs last:border-b-0 hover:bg-command-accent/10">
                  <span><strong className="text-command-text">{entity.nameAr}</strong><span className="mt-0.5 block text-command-muted">{entityTypeLabelsAr[entity.type]}</span></span>
                  <span className="ltr text-command-accent">{entity.id}</span>
                </button>
              ))}
            </div>
            <div data-testid="package-route-list" className="space-y-2">
              {(runtime?.routes ?? []).map((route) => (
                <div key={route.id} className="flex items-center justify-between gap-3 border border-command-line bg-command-panelStrong px-3 py-2 text-xs">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5" style={{ backgroundColor: route.color }} />{route.nameAr}</span>
                  <span className="ltr text-command-muted">{route.id}</span>
                </div>
              ))}
            </div>
          </div>
        </WorkspaceSection>

        <div className="grid gap-4 2xl:grid-cols-2">
          <WorkspaceSection title="معاينة 2D" icon={<Map className="h-4 w-4" aria-hidden="true" />} testId="package-2d-preview">
            {runtime ? <ReadinessPlan2D records={runtime.readinessRecords} entities={runtime.entities} routes={runtime.routes} selectedEntityId={selectedPreviewEntityId} onSelectEntity={setSelectedPreviewEntityId} /> : <EmptyState title="لا توجد معاينة" message="أصلح الحزمة أولاً." />}
          </WorkspaceSection>
          <WorkspaceSection title="معاينة 3D" icon={<Layers3 className="h-4 w-4" aria-hidden="true" />} testId="package-3d-preview">
            {runtime ? (
              <EventSceneViewport
                className="h-[460px]"
                entitiesOverride={runtime.entities}
                routeDefinitionsOverride={runtime.routes}
                routeVisibilityOverride={visibleRoutes}
                selectedEntityIdOverride={selectedPreviewEntityId}
                onSelectEntityOverride={setSelectedPreviewEntityId}
              />
            ) : <EmptyState title="لا توجد معاينة" message="أصلح الحزمة أولاً." />}
          </WorkspaceSection>
        </div>

        <WorkspaceSection title="بيانات العرض التجريبية" icon={<Boxes className="h-4 w-4" aria-hidden="true" />} testId="package-demo-seed-data">
          <div className="grid gap-4 xl:grid-cols-3">
            <SeedList testId="package-readiness-list" title="الجاهزية" items={(runtime?.readinessRecords ?? []).map((record) => ({ id: record.zoneId, label: `${record.readiness}% · ${record.requiredAction}` }))} />
            <SeedList testId="package-decision-list" title="القرارات" items={(runtime?.decisions ?? []).map((record) => ({ id: record.decisionId, label: record.title }))} />
            <SeedList testId="package-capture-list" title="التقاط محلي" items={(runtime?.captureFixtures ?? []).map((record) => ({ id: record.envelopeId, label: `${record.adapterId} · بيانات مؤقتة` }))} />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="مقارنة التفعيل" icon={<GitCompareArrows className="h-4 w-4" aria-hidden="true" />} testId="package-comparison">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead><tr className="border-b border-command-line text-command-muted"><th className="p-2 text-right">البند</th><th className="p-2 text-right">الحالة السابقة</th><th className="p-2 text-right">الحزمة المختارة</th></tr></thead>
              <tbody>{preview.differences.map((difference) => <tr key={difference.field} className="border-b border-command-line/70"><th className="p-2 text-right font-semibold text-command-text">{difference.labelAr}</th><td className="p-2 text-command-muted">{difference.previousValue}</td><td className="p-2 text-command-accent">{difference.nextValue}</td></tr>)}</tbody>
            </table>
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="التراجع إلى الحزمة السابقة" icon={<Undo2 className="h-4 w-4" aria-hidden="true" />} testId="package-rollback-section">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-command-muted">
              <p>الحزمة السابقة: <strong className="text-command-text">{previousRuntimeSession?.runtime.identity.eventNameAr ?? 'لا توجد'}</strong></p>
              <p id="baseline-preserved-note" data-testid="baseline-preserved-note" className="mt-1">التراجع والتفعيل محليان؛ خط الأساس المخزن وسياق السيناريو لا يتغيران.</p>
            </div>
            <div className="flex gap-2">
              <button data-testid="package-rollback" type="button" onClick={rollback} disabled={!previousRuntimeSession} className="command-button disabled:opacity-45"><Undo2 className="h-4 w-4" aria-hidden="true" /> تراجع محلي</button>
              <button data-testid="package-reset" type="button" onClick={() => void reset()} className="command-button"><RotateCcw className="h-4 w-4" aria-hidden="true" /> {activeProjectId ? 'حزمة المشروع' : 'الحزمة الافتراضية'}</button>
            </div>
          </div>
          <div data-testid="package-activation-history" className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {activationHistory.slice(0, 6).map((entry) => (
              <div key={entry.activationId} className="border border-command-line bg-command-panelStrong px-3 py-2 text-xs">
                <div className="flex justify-between gap-2"><strong>{entry.reasonAr}</strong><span className="ltr text-command-accent">{entry.activationId}</span></div>
                <p className="ltr mt-1 truncate text-command-muted">{entry.packageId}</p>
              </div>
            ))}
          </div>
        </WorkspaceSection>
      </div>
    </section>
  );
}

function WorkspaceSection({ title, icon, testId, children }: { title: string; icon: ReactNode; testId: string; children: ReactNode }) {
  return (
    <section data-testid={testId} className="border border-command-line bg-command-panel px-4 py-4 shadow-command">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-command-text">{icon}{title}</h3>
      {children}
    </section>
  );
}

function Definition({ label, value, ltr = false, truncate = false }: { label: string; value: string; ltr?: boolean; truncate?: boolean }) {
  return <div><dt className="text-xs text-command-muted">{label}</dt><dd title={value} className={`mt-1 font-semibold text-command-text ${ltr ? 'ltr text-left' : ''} ${truncate ? 'truncate' : ''}`}>{value}</dd></div>;
}

function KeyValue({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="border-b border-command-line py-2 last:border-b-0"><p className="text-xs font-semibold text-command-text">{label}</p><p className={`mt-1 text-xs leading-5 text-command-muted ${ltr ? 'ltr text-left' : ''}`}>{value}</p></div>;
}

function SeedList({ title, items, testId }: { title: string; items: Array<{ id: string; label: string }>; testId: string }) {
  return (
    <div data-testid={testId} className="border border-command-line bg-command-panelStrong p-3">
      <h4 className="text-sm font-semibold text-command-text">{title}</h4>
      <div className="mt-2 space-y-2">{items.map((item) => <div key={item.id} className="border-b border-command-line pb-2 text-xs last:border-b-0"><span className="ltr block text-command-accent">{item.id}</span><span className="mt-1 block leading-5 text-command-muted">{item.label}</span></div>)}</div>
    </div>
  );
}
