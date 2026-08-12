import { getSafeLocalStorage } from './storage';
import {
  deepFreezeRehearsalValue,
  validateDigitalRehearsalPlan,
  validateDigitalRehearsalRun,
  type DigitalRehearsalValidationContext
} from './digitalRehearsalValidation';
import type { DigitalRehearsalPlan, DigitalRehearsalRun, RehearsalValidationIssue } from '../types/digitalRehearsal';

export const DIGITAL_REHEARSAL_REPOSITORY_SCHEMA_VERSION = 1;

interface RehearsalRepositoryEnvelope {
  schemaVersion: number;
  projectId: string;
  eventId: string;
  venueId: string;
  plans: DigitalRehearsalPlan[];
  runs: DigitalRehearsalRun[];
  activeRunId: string | null;
  quarantine: RehearsalQuarantineRecord[];
}

export interface RehearsalQuarantineRecord {
  quarantineId: string;
  recordType: 'plan' | 'run' | 'import' | 'repository';
  recordId: string | null;
  reasonAr: string;
  issueCodes: string[];
  localTime: string;
  timeTrust: 'local-device-time-untrusted';
}

export interface RehearsalImportPreview {
  valid: boolean;
  kind: 'plan' | 'run' | 'unknown';
  recordId: string | null;
  issues: RehearsalValidationIssue[];
  mutationApplied: false;
}

export interface RehearsalRepositoryWriteResult<T> {
  accepted: boolean;
  conflict: boolean;
  value: T | null;
  messageAr: string;
}

export interface DigitalRehearsalRepository {
  listPlans(): DigitalRehearsalPlan[];
  listRuns(planId?: string): DigitalRehearsalRun[];
  getPlan(planId: string): DigitalRehearsalPlan | null;
  getRun(runId: string): DigitalRehearsalRun | null;
  getActiveRun(): DigitalRehearsalRun | null;
  savePlan(plan: DigitalRehearsalPlan, expectedPreviousHash: string | null): RehearsalRepositoryWriteResult<DigitalRehearsalPlan>;
  saveRun(run: DigitalRehearsalRun, expectedPreviousHash: string | null): RehearsalRepositoryWriteResult<DigitalRehearsalRun>;
  selectRun(runId: string | null): boolean;
  resetActiveTemporaryContext(): void;
  exportSanitized(): string;
  previewImport(value: string, plan?: DigitalRehearsalPlan): RehearsalImportPreview;
  quarantine(): RehearsalQuarantineRecord[];
}

function emptyEnvelope(context: DigitalRehearsalValidationContext): RehearsalRepositoryEnvelope {
  return {
    schemaVersion: DIGITAL_REHEARSAL_REPOSITORY_SCHEMA_VERSION,
    projectId: context.projectId,
    eventId: context.eventId,
    venueId: context.venueId,
    plans: [],
    runs: [],
    activeRunId: null,
    quarantine: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function migration(value: unknown, context: DigitalRehearsalValidationContext): RehearsalRepositoryEnvelope | null {
  if (!isRecord(value)) return null;
  const version = typeof value.schemaVersion === 'number' ? value.schemaVersion : 0;
  if (version > DIGITAL_REHEARSAL_REPOSITORY_SCHEMA_VERSION) return null;
  if (version === 0 && Array.isArray(value.runs)) {
    return {
      ...emptyEnvelope(context),
      plans: Array.isArray(value.plans) ? value.plans as DigitalRehearsalPlan[] : [],
      runs: value.runs as DigitalRehearsalRun[],
      activeRunId: typeof value.activeRunId === 'string' ? value.activeRunId : null
    };
  }
  if (version !== 1 || value.projectId !== context.projectId || value.eventId !== context.eventId || value.venueId !== context.venueId) return null;
  return {
    schemaVersion: 1,
    projectId: context.projectId,
    eventId: context.eventId,
    venueId: context.venueId,
    plans: Array.isArray(value.plans) ? value.plans as DigitalRehearsalPlan[] : [],
    runs: Array.isArray(value.runs) ? value.runs as DigitalRehearsalRun[] : [],
    activeRunId: typeof value.activeRunId === 'string' ? value.activeRunId : null,
    quarantine: Array.isArray(value.quarantine) ? value.quarantine as RehearsalQuarantineRecord[] : []
  };
}

function historyIsPrefix<T>(previous: readonly T[], next: readonly T[]): boolean {
  if (previous.length > next.length) return false;
  return previous.every((entry, index) => JSON.stringify(entry) === JSON.stringify(next[index]));
}

export class BrowserDigitalRehearsalRepository implements DigitalRehearsalRepository {
  private envelope: RehearsalRepositoryEnvelope;
  private readonly storageKey: string;

  constructor(
    private readonly context: DigitalRehearsalValidationContext,
    private readonly storage: Storage = getSafeLocalStorage()
  ) {
    this.storageKey = `mayadeen:experience-rehearsal:v1:${context.projectId}:${context.eventId}:${context.venueId}`;
    this.envelope = this.rehydrate();
  }

  listPlans(): DigitalRehearsalPlan[] { return structuredClone(this.envelope.plans); }
  listRuns(planId?: string): DigitalRehearsalRun[] { return structuredClone(this.envelope.runs.filter((run) => !planId || run.planId === planId)); }
  getPlan(planId: string): DigitalRehearsalPlan | null { return structuredClone([...this.envelope.plans].reverse().find((plan) => plan.planId === planId) ?? null); }
  getRun(runId: string): DigitalRehearsalRun | null { return structuredClone([...this.envelope.runs].reverse().find((run) => run.runId === runId) ?? null); }
  getActiveRun(): DigitalRehearsalRun | null { return this.envelope.activeRunId ? this.getRun(this.envelope.activeRunId) : null; }

  savePlan(plan: DigitalRehearsalPlan, expectedPreviousHash: string | null): RehearsalRepositoryWriteResult<DigitalRehearsalPlan> {
    const validation = validateDigitalRehearsalPlan(plan, this.context);
    if (!validation.valid) return { accepted: false, conflict: false, value: null, messageAr: validation.issues[0]?.messageAr ?? 'الخطة غير صالحة.' };
    const current = [...this.envelope.plans].reverse().find((candidate) => candidate.planId === plan.planId);
    if (current && current.planHash !== expectedPreviousHash) return { accepted: false, conflict: true, value: null, messageAr: 'تعارض مراجعة الخطة؛ لم يُستخدم آخر-كاتب-يفوز.' };
    if (!current && expectedPreviousHash !== null) return { accepted: false, conflict: true, value: null, messageAr: 'أصل مراجعة الخطة غير موجود.' };
    if (current && (plan.revision !== current.revision + 1 || plan.previousPlanHash !== current.planHash)) return { accepted: false, conflict: true, value: null, messageAr: 'مراجعة الخطة لا تتبع الرأس المحلي مباشرة.' };
    this.envelope.plans = current ? [...this.envelope.plans, structuredClone(plan)] : [...this.envelope.plans, structuredClone(plan)];
    this.persist();
    return { accepted: true, conflict: false, value: deepFreezeRehearsalValue(structuredClone(plan)), messageAr: 'حُفظت مراجعة الخطة المرشحة محليًا.' };
  }

  saveRun(run: DigitalRehearsalRun, expectedPreviousHash: string | null): RehearsalRepositoryWriteResult<DigitalRehearsalRun> {
    const plan = [...this.envelope.plans].reverse().find((candidate) => candidate.planId === run.planId && candidate.planHash === run.planHash);
    if (!plan) return { accepted: false, conflict: false, value: null, messageAr: 'خطة البروفة المجمدة غير موجودة في مستودع هذا المشروع.' };
    const validation = validateDigitalRehearsalRun(run, plan);
    if (!validation.valid) {
      this.addQuarantine('run', run.runId, validation.issues, validation.issues[0]?.messageAr ?? 'سجل التشغيل غير صالح.');
      return { accepted: false, conflict: false, value: null, messageAr: validation.issues[0]?.messageAr ?? 'سجل التشغيل غير صالح.' };
    }
    const current = [...this.envelope.runs].reverse().find((candidate) => candidate.runId === run.runId);
    if (current && current.contentHash !== expectedPreviousHash) return { accepted: false, conflict: true, value: null, messageAr: 'تعارض تشغيل البروفة؛ احتُفظ بالنسختين للمراجعة ولم يُستخدم آخر-كاتب-يفوز.' };
    if (!current && expectedPreviousHash !== null) return { accepted: false, conflict: true, value: null, messageAr: 'الرأس السابق لتشغيل البروفة غير موجود.' };
    if (current && (!historyIsPrefix(current.transitions, run.transitions) || !historyIsPrefix(current.revisions, run.revisions) || !historyIsPrefix(current.observations, run.observations) || !historyIsPrefix(current.issues, run.issues))) {
      this.addQuarantine('run', run.runId, [], 'محاولة حذف أو تعديل سجل سابق في تشغيل البروفة.');
      return { accepted: false, conflict: true, value: null, messageAr: 'حُجب التعديل لأنه يزيل أو يغيّر تاريخًا سابقًا.' };
    }
    this.envelope.runs = current ? this.envelope.runs.map((candidate) => candidate.runId === run.runId ? structuredClone(run) : candidate) : [...this.envelope.runs, structuredClone(run)];
    this.envelope.activeRunId = run.runId;
    this.persist();
    return { accepted: true, conflict: false, value: deepFreezeRehearsalValue(structuredClone(run)), messageAr: 'حُفظ تشغيل البروفة محليًا مع تاريخه الإلحاقي.' };
  }

  selectRun(runId: string | null): boolean {
    if (runId !== null && !this.envelope.runs.some((run) => run.runId === runId)) return false;
    this.envelope.activeRunId = runId;
    this.persist();
    return true;
  }

  resetActiveTemporaryContext(): void {
    this.envelope.activeRunId = null;
    this.persist();
  }

  exportSanitized(): string {
    return JSON.stringify({
      schemaVersion: this.envelope.schemaVersion,
      projectId: this.envelope.projectId,
      eventId: this.envelope.eventId,
      venueId: this.envelope.venueId,
      plans: this.envelope.plans,
      runs: this.envelope.runs,
      activeRunId: this.envelope.activeRunId,
      disclaimerAr: 'تصدير محلي لبروفة مرشحة؛ لا يتضمن مصدرًا خامًا أو حقيقة تشغيلية.'
    }, null, 2);
  }

  previewImport(value: string, plan?: DigitalRehearsalPlan): RehearsalImportPreview {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!isRecord(parsed)) return { valid: false, kind: 'unknown', recordId: null, issues: [{ code: 'rehearsal-import-shape-invalid', path: '/', severity: 'blocking', messageAr: 'ملف الاستيراد ليس سجلًا صالحًا.' }], mutationApplied: false };
      if ('planId' in parsed && 'eventDays' in parsed) {
        const validation = validateDigitalRehearsalPlan(parsed as unknown as DigitalRehearsalPlan, this.context);
        return { valid: validation.valid, kind: 'plan', recordId: typeof parsed.planId === 'string' ? parsed.planId : null, issues: validation.issues, mutationApplied: false };
      }
      if ('runId' in parsed && 'momentStates' in parsed) {
        const resolvedPlan = plan ?? this.envelope.plans.find((candidate) => candidate.planId === parsed.planId && candidate.planHash === parsed.planHash);
        if (!resolvedPlan) return { valid: false, kind: 'run', recordId: typeof parsed.runId === 'string' ? parsed.runId : null, issues: [{ code: 'rehearsal-import-plan-missing', path: '/planId', severity: 'blocking', messageAr: 'لا توجد خطة مجمدة مطابقة لتشغيل البروفة المستورد.' }], mutationApplied: false };
        const validation = validateDigitalRehearsalRun(parsed as unknown as DigitalRehearsalRun, resolvedPlan);
        return { valid: validation.valid, kind: 'run', recordId: typeof parsed.runId === 'string' ? parsed.runId : null, issues: validation.issues, mutationApplied: false };
      }
      return { valid: false, kind: 'unknown', recordId: null, issues: [{ code: 'rehearsal-import-kind-unknown', path: '/', severity: 'blocking', messageAr: 'نوع سجل الاستيراد غير معروف.' }], mutationApplied: false };
    } catch {
      return { valid: false, kind: 'unknown', recordId: null, issues: [{ code: 'rehearsal-import-json-invalid', path: '/', severity: 'blocking', messageAr: 'JSON الاستيراد غير صالح وحُجب دون كتابة.' }], mutationApplied: false };
    }
  }

  quarantine(): RehearsalQuarantineRecord[] { return structuredClone(this.envelope.quarantine); }

  private rehydrate(): RehearsalRepositoryEnvelope {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return emptyEnvelope(this.context);
      const migrated = migration(JSON.parse(raw), this.context);
      if (!migrated) return { ...emptyEnvelope(this.context), quarantine: [{ quarantineId: 'QUARANTINE-REPOSITORY-001', recordType: 'repository', recordId: null, reasonAr: 'سجل الحفظ المحلي خارج النطاق أو بإصدار غير مدعوم.', issueCodes: ['rehearsal-repository-migration-failed'], localTime: new Date().toISOString(), timeTrust: 'local-device-time-untrusted' }] };
      const validPlans = migrated.plans.filter((plan) => validateDigitalRehearsalPlan(plan, this.context).valid);
      const plansByHash = new Map(validPlans.map((plan) => [plan.planHash, plan]));
      const validRuns = migrated.runs.filter((run) => {
        const plan = plansByHash.get(run.planHash);
        return Boolean(plan && validateDigitalRehearsalRun(run, plan).valid);
      });
      const rejectedCount = migrated.plans.length - validPlans.length + migrated.runs.length - validRuns.length;
      return {
        ...migrated,
        plans: validPlans,
        runs: validRuns,
        activeRunId: validRuns.some((run) => run.runId === migrated.activeRunId) ? migrated.activeRunId : null,
        quarantine: rejectedCount ? [...migrated.quarantine, { quarantineId: `QUARANTINE-REHYDRATE-${migrated.quarantine.length + 1}`, recordType: 'repository', recordId: null, reasonAr: `عُزل ${rejectedCount} سجل محلي غير صالح أثناء الاستعادة.`, issueCodes: ['rehearsal-rehydrate-record-invalid'], localTime: new Date().toISOString(), timeTrust: 'local-device-time-untrusted' }] : migrated.quarantine
      };
    } catch {
      return { ...emptyEnvelope(this.context), quarantine: [{ quarantineId: 'QUARANTINE-REPOSITORY-PARSE', recordType: 'repository', recordId: null, reasonAr: 'تعذر قراءة سجل الحفظ المحلي وعُزل بأمان.', issueCodes: ['rehearsal-repository-json-invalid'], localTime: new Date().toISOString(), timeTrust: 'local-device-time-untrusted' }] };
    }
  }

  private addQuarantine(recordType: RehearsalQuarantineRecord['recordType'], recordId: string | null, issues: RehearsalValidationIssue[], reasonAr: string): void {
    this.envelope.quarantine.push({ quarantineId: `QUARANTINE-${this.envelope.quarantine.length + 1}`, recordType, recordId, reasonAr, issueCodes: issues.map((entry) => entry.code), localTime: new Date().toISOString(), timeTrust: 'local-device-time-untrusted' });
    this.persist();
  }

  private persist(): void {
    try { this.storage.setItem(this.storageKey, JSON.stringify(this.envelope)); } catch { /* The UI reports local persistence as unavailable. */ }
  }
}
