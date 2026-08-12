import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSearch,
  Play,
  RotateCcw,
  Square,
  Timer,
  Upload
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { previewDecisionPack, serializeDecisionValidationReport, type DecisionImportPreview, type DecisionPackFormat } from '../../services/decisionImport';
import { serializeValidationResults, type OperationalValidationResult, type ValidationInterfaceMode } from '../../services/operationalValidationResults';
import { useEventStore } from '../../store/useEventStore';
import type { DecisionId } from '../../types/decision';
import type { SpatialEntityId } from '../../types/spatial';
import { EmptyState, ErrorState } from '../shared/StateBlocks';
import { Panel } from '../shared/Panel';
import { fallbackRuntimeIdentity } from '../../data/fallbackRuntime';

const interfaceModeLabels: Record<ValidationInterfaceMode, string> = {
  list: 'قائمة تشغيلية',
  '2d': 'مخطط ثنائي الأبعاد',
  '3d': 'مشهد ثلاثي الأبعاد',
  hybrid: 'قائمة ومخطط ومشهد'
};

interface ResultDraft {
  participantId: string;
  selectedDecisionId: string;
  identifiedOwner: string;
  identifiedAction: string;
  evidenceGapDetected: boolean;
  authorityGapDetected: boolean;
  confidence: number;
  criticalErrors: number;
  facilitatorScore: number;
  notes: string;
}

const initialResultDraft: ResultDraft = {
  participantId: '',
  selectedDecisionId: '',
  identifiedOwner: '',
  identifiedAction: '',
  evidenceGapDetected: false,
  authorityGapDetected: false,
  confidence: 3,
  criticalErrors: 0,
  facilitatorScore: 3,
  notes: ''
};

function downloadText(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function OperationalValidationWorkspace() {
  const demoDecisions = useEventStore((state) => state.decisions);
  const baselineDecisionCount = useEventStore((state) => state.baselineDecisions.length);
  const entities = useEventStore((state) => state.entities);
  const activeRuntime = useEventStore((state) => state.activeRuntime);
  const [preview, setPreview] = useState<DecisionImportPreview | null>(null);
  const [acceptedRecords, setAcceptedRecords] = useState<DecisionImportPreview['validRecords']>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<DecisionId>(demoDecisions[0]?.decisionId ?? 'DECISION-001');
  const [interfaceMode, setInterfaceMode] = useState<ValidationInterfaceMode>('hybrid');
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState('');
  const [stoppedAt, setStoppedAt] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [draft, setDraft] = useState<ResultDraft>(initialResultDraft);
  const [results, setResults] = useState<OperationalValidationResult[]>([]);
  const cases = acceptedRecords.length ? acceptedRecords : demoDecisions;
  const selectedCase = cases.find((record) => record.decisionId === selectedCaseId) ?? cases[0];
  const blockingIssues = preview?.issues.filter((currentIssue) => currentIssue.severity === 'error') ?? [];

  useEffect(() => {
    if (timerStartedAt === null) return undefined;
    const intervalId = window.setInterval(() => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000))), 250);
    return () => window.clearInterval(intervalId);
  }, [timerStartedAt]);

  const importOptions = useMemo(() => ({
    knownEntityIds: Object.keys(entities) as SpatialEntityId[],
    knownEventIds: [activeRuntime?.identity.eventInstanceId ?? fallbackRuntimeIdentity.eventId],
    knownVenueIds: [activeRuntime?.identity.venueId ?? fallbackRuntimeIdentity.venueId]
  }), [activeRuntime, entities]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const format: DecisionPackFormat = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
    const content = await file.text();
    setAcceptedRecords([]);
    setPreview(previewDecisionPack(content, file.name, format, importOptions));
  };

  const startTimer = () => {
    const now = Date.now();
    setElapsedSeconds(0);
    setStartedAt(new Date(now).toISOString());
    setStoppedAt('');
    setTimerStartedAt(now);
  };

  const stopTimer = () => {
    if (timerStartedAt === null) return;
    const now = Date.now();
    setElapsedSeconds(Math.max(0, Math.floor((now - timerStartedAt) / 1000)));
    setStoppedAt(new Date(now).toISOString());
    setTimerStartedAt(null);
  };

  const saveResult = () => {
    if (!selectedCase) return;
    const stopTime = stoppedAt || new Date().toISOString();
    const result: OperationalValidationResult = {
      resultId: `VALIDATION-${String(results.length + 1).padStart(3, '0')}`,
      participantId: draft.participantId.trim(),
      decisionCaseId: selectedCase.decisionId,
      interfaceMode,
      startedAt: startedAt || stopTime,
      stoppedAt: stopTime,
      durationSeconds: elapsedSeconds,
      selectedDecisionId: (draft.selectedDecisionId || selectedCase.decisionId) as DecisionId,
      identifiedOwner: draft.identifiedOwner.trim(),
      identifiedAction: draft.identifiedAction.trim(),
      evidenceGapDetected: draft.evidenceGapDetected,
      authorityGapDetected: draft.authorityGapDetected,
      confidence: draft.confidence,
      criticalErrors: draft.criticalErrors,
      facilitatorScore: draft.facilitatorScore,
      notes: draft.notes.trim()
    };
    setResults((currentResults) => [...currentResults, result]);
  };

  const resetValidationWorkspace = () => {
    setPreview(null);
    setAcceptedRecords([]);
    if (demoDecisions[0]) setSelectedCaseId(demoDecisions[0].decisionId);
    setInterfaceMode('hybrid');
    setTimerStartedAt(null);
    setStartedAt('');
    setStoppedAt('');
    setElapsedSeconds(0);
    setDraft(initialResultDraft);
    setResults([]);
  };

  return (
    <div
      data-testid="validation-workspace"
      data-baseline-decision-count={baselineDecisionCount}
      data-event-id={activeRuntime?.identity.eventInstanceId ?? fallbackRuntimeIdentity.eventId}
      data-venue-id={activeRuntime?.identity.venueId ?? fallbackRuntimeIdentity.venueId}
      className="min-h-0 flex-1 overflow-y-auto command-scrollbar"
    >
      <div className="mx-auto w-full max-w-[1920px] space-y-4 p-4">
        <header className="flex flex-wrap items-start justify-between gap-4 border border-command-line bg-command-panel p-4 shadow-command">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileSearch className="h-5 w-5 text-command-accent" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-command-text">التحقق التشغيلي</h2>
              <span data-testid="validation-local-label" className="rounded border border-command-amber/70 bg-command-amber/10 px-2 py-1 text-[11px] text-command-amber">أداة تحقق محلية</span>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-command-muted">تقيس هذه المساحة أداء واجهات القرار على حالات تجريبية أو حزمة مستوردة للمعاينة. لا تغيّر الحالة الأساسية، ولا تثبت قيمة إحصائية من تجربة صغيرة.</p>
          </div>
          <div className="rounded border border-command-line bg-command-panelStrong px-3 py-2 text-xs text-command-muted">لا تُجمع بيانات شخصية؛ المعرّف المجهول اختياري.</div>
        </header>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <Panel title="معاينة حزمة القرارات" eyebrow="لا كتابة صامتة إلى الحالة الأساسية">
            <div className="space-y-4">
              <label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 border border-dashed border-command-line bg-command-panelStrong p-4 text-sm text-command-muted hover:border-command-accent">
                <Upload className="h-5 w-5 text-command-accent" aria-hidden="true" />
                <span>اختيار ملف قرارات جدولي أو منظم</span>
                <input data-testid="decision-import-file" type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
              </label>
              {preview ? <div data-testid="decision-import-preview" className="space-y-3"><div className="grid grid-cols-3 gap-2"><Metric label="السجلات" value={preview.records.length} /><Metric label="أخطاء مانعة" value={preview.blockingErrorCount} testId="import-error-count" /><Metric label="تحذيرات" value={preview.warningCount + preview.migrationNotices.reduce((sum, notice) => sum + notice.warnings.length, 0)} /></div><div className={`rounded border p-3 text-sm ${preview.canAcceptForExperiment ? 'border-command-accent/60 bg-command-accent/10 text-command-accent' : 'border-red-300/40 bg-red-950/30 text-red-100'}`}>{preview.canAcceptForExperiment ? <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />الحزمة صالحة للاختبار المحلي فقط.</span> : <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" aria-hidden="true" />يجب حل الأخطاء المانعة قبل قبول الحزمة للتجربة.</span>}</div>{blockingIssues.length ? <ul data-testid="decision-import-errors" className="space-y-2">{blockingIssues.slice(0, 8).map((currentIssue, index) => <li key={`${currentIssue.recordId}-${currentIssue.code}-${index}`} className="rounded border border-red-300/30 bg-red-950/20 p-2 text-xs leading-6 text-red-100"><span className="font-semibold">السجل {currentIssue.rowNumber ?? (currentIssue.recordIndex ?? 0) + 1}</span> · <span className="ltr inline-block">{currentIssue.recordId}</span><span className="mt-1 block">{currentIssue.messageAr}</span></li>)}</ul> : null}{preview.migrationNotices.length ? <ul data-testid="decision-migration-warnings" className="space-y-2">{preview.migrationNotices.flatMap((notice) => notice.warnings.map((currentWarning) => <li key={`${notice.recordIndex}-${currentWarning.code}-${currentWarning.field}`} className="rounded border border-command-amber/40 bg-command-amber/5 p-2 text-xs leading-6 text-command-text"><span className="font-semibold text-command-amber">تحذير هجرة للسجل {notice.recordIndex + 1}</span> · <span className="ltr inline-block">{notice.recordId}</span><span className="mt-1 block">{currentWarning.messageAr}</span></li>))}</ul> : null}<div className="flex flex-wrap gap-2"><button data-testid="decision-import-accept" type="button" disabled={!preview.canAcceptForExperiment} onClick={() => { setAcceptedRecords(preview.validRecords); if (preview.validRecords[0]) setSelectedCaseId(preview.validRecords[0].decisionId); }} className="command-button command-button-primary disabled:cursor-not-allowed disabled:opacity-40">قبول للاختبار المحلي</button><button data-testid="decision-import-export-report" type="button" onClick={() => downloadText('decision-import-validation-report.json', serializeDecisionValidationReport(preview, 'json'), 'application/json')} className="command-button"><Download className="h-4 w-4" aria-hidden="true" />تصدير تقرير التحقق</button><button data-testid="decision-import-reset" type="button" onClick={resetValidationWorkspace} className="command-button"><RotateCcw className="h-4 w-4" aria-hidden="true" />إعادة أداة التحقق</button></div></div> : <EmptyState title="لا توجد حزمة في المعاينة" message="اختر ملفاً لعرض السجلات والأخطاء والتحذيرات قبل أي قبول محلي." />}
              {acceptedRecords.length ? <p data-testid="imported-pack-status" className="text-xs leading-6 text-command-accent">تم قبول {acceptedRecords.length} سجل للاختبار المحلي. بقيت الحالة الأساسية دون تغيير.</p> : null}
            </div>
          </Panel>

          <Panel title="إعداد حالة الاختبار" eyebrow="ترتيب الواجهات يُوازن بين المشاركين">
            <div className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs text-command-muted">حالة القرار</span><select data-testid="validation-case-select" value={selectedCase?.decisionId ?? ''} onChange={(event) => setSelectedCaseId(event.target.value as DecisionId)} className="command-select">{cases.map((record) => <option key={record.decisionId} value={record.decisionId}>{record.title}</option>)}</select></label>
              <div><p className="mb-2 text-xs text-command-muted">الواجهة المختبرة</p><div className="grid grid-cols-2 gap-2">{(Object.keys(interfaceModeLabels) as ValidationInterfaceMode[]).map((mode) => <button key={mode} data-testid={`validation-mode-${mode}`} type="button" aria-pressed={interfaceMode === mode} onClick={() => setInterfaceMode(mode)} className={`command-button min-h-10 text-xs ${interfaceMode === mode ? 'command-button-primary' : ''}`}>{interfaceModeLabels[mode]}</button>)}</div></div>
              {selectedCase ? <div data-testid="validation-case-summary" className="rounded border border-command-line bg-command-panelStrong p-3"><p className="font-semibold text-command-text">{selectedCase.title}</p><p className="mt-2 text-xs leading-6 text-command-muted">{selectedCase.problemStatement}</p><p className="mt-2 text-xs text-command-accent">المالك المسجل: {selectedCase.decisionOwner}</p></div> : <ErrorState title="لا توجد حالة" message="لا يمكن بدء اختبار دون حالة قرار صالحة." />}
            </div>
          </Panel>
        </div>

        <Panel title="جلسة القياس المحلية" eyebrow="الوقت والدقة والثقة والحمل المعرفي">
          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <div data-testid="validation-timer-panel" className="flex min-h-52 flex-col items-center justify-center border border-command-line bg-command-panelStrong p-5 text-center"><Timer className="h-7 w-7 text-command-accent" aria-hidden="true" /><p data-testid="validation-timer" className="ltr mt-3 text-4xl font-semibold text-command-text">{formatElapsed(elapsedSeconds)}</p><p className="mt-2 text-xs text-command-muted">مؤقت محلي داخل المتصفح</p><div className="mt-4 flex gap-2"><button data-testid="validation-timer-start" type="button" onClick={startTimer} disabled={timerStartedAt !== null} className="command-button command-button-primary disabled:opacity-40"><Play className="h-4 w-4" aria-hidden="true" />بدء</button><button data-testid="validation-timer-stop" type="button" onClick={stopTimer} disabled={timerStartedAt === null} className="command-button disabled:opacity-40"><Square className="h-4 w-4" aria-hidden="true" />إيقاف</button></div></div>
            <div className="grid gap-3 xl:grid-cols-2"><Field label="معرّف مشارك مجهول اختياري"><input data-testid="validation-participant-id" value={draft.participantId} onChange={(event) => setDraft({ ...draft, participantId: event.target.value })} className="command-select ltr text-left" /></Field><Field label="القرار الذي اختاره المشارك"><input data-testid="validation-selected-decision" value={draft.selectedDecisionId} onChange={(event) => setDraft({ ...draft, selectedDecisionId: event.target.value })} className="command-select ltr text-left" /></Field><Field label="المالك الذي حدده"><input data-testid="validation-owner" value={draft.identifiedOwner} onChange={(event) => setDraft({ ...draft, identifiedOwner: event.target.value })} className="command-select" /></Field><Field label="الإجراء الذي حدده"><input data-testid="validation-action" value={draft.identifiedAction} onChange={(event) => setDraft({ ...draft, identifiedAction: event.target.value })} className="command-select" /></Field><CheckboxField testId="validation-evidence-gap" label="اكتشف فجوة الدليل" checked={draft.evidenceGapDetected} onChange={(checked) => setDraft({ ...draft, evidenceGapDetected: checked })} /><CheckboxField testId="validation-authority-gap" label="اكتشف فجوة السلطة" checked={draft.authorityGapDetected} onChange={(checked) => setDraft({ ...draft, authorityGapDetected: checked })} /><NumberField testId="validation-confidence" label="ثقة المشارك من 1 إلى 5" value={draft.confidence} min={1} max={5} onChange={(value) => setDraft({ ...draft, confidence: value })} /><NumberField testId="validation-critical-errors" label="الأخطاء الحرجة" value={draft.criticalErrors} min={0} max={20} onChange={(value) => setDraft({ ...draft, criticalErrors: value })} /><NumberField testId="validation-facilitator-score" label="تقييم الميسّر من 1 إلى 5" value={draft.facilitatorScore} min={1} max={5} onChange={(value) => setDraft({ ...draft, facilitatorScore: value })} /><Field label="ملاحظات مختصرة"><input data-testid="validation-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="command-select" /></Field></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><button data-testid="validation-save-result" type="button" onClick={saveResult} className="command-button command-button-primary">تسجيل النتيجة المحلية</button><button data-testid="validation-export-csv" type="button" disabled={!results.length} onClick={() => downloadText('decision-validation-results.csv', serializeValidationResults(results, 'csv'), 'text/csv')} className="command-button disabled:opacity-40"><Download className="h-4 w-4" aria-hidden="true" />تصدير جدولي</button><button data-testid="validation-export-json" type="button" disabled={!results.length} onClick={() => downloadText('decision-validation-results.json', serializeValidationResults(results, 'json'), 'application/json')} className="command-button disabled:opacity-40"><Download className="h-4 w-4" aria-hidden="true" />تصدير منظم</button><span data-testid="validation-result-count" className="text-xs text-command-muted">النتائج المسجلة: {results.length}</span></div>
          {results.length ? <div data-testid="validation-result" className="mt-4 rounded border border-command-accent/50 bg-command-accent/10 p-3 text-sm text-command-text">آخر نتيجة: {results.at(-1)?.durationSeconds} ثانية · {interfaceModeLabels[results.at(-1)!.interfaceMode]} · أخطاء حرجة {results.at(-1)?.criticalErrors}</div> : null}
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, testId }: { label: string; value: number; testId?: string }) {
  return <div className="rounded border border-command-line bg-command-panelStrong p-3"><p className="text-[11px] text-command-muted">{label}</p><p data-testid={testId} className="ltr mt-1 text-2xl font-semibold text-command-text">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs text-command-muted">{label}</span>{children}</label>;
}

function CheckboxField({ testId, label, checked, onChange }: { testId: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-3 border border-command-line bg-command-panelStrong px-3 text-sm text-command-text"><input data-testid={testId} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-command-accent" />{label}</label>;
}

function NumberField({ testId, label, value, min, max, onChange }: { testId: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <Field label={label}><input data-testid={testId} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} className="command-select ltr text-left" /></Field>;
}
