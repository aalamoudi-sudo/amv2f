import type {
  EventPackage,
  EventPackageActivationHistoryEntry,
  EventPackageActivationSnapshot,
  EventPackageDifference,
  EventPackageImportPreview,
  EventRuntimeConfiguration
} from '../types/eventPackage';
import { validateEventPackage } from './eventPackageValidation';

export type EventRuntimeActivator = (runtime: EventRuntimeConfiguration) => void;

function emptyPreview(rawJson = ''): EventPackageImportPreview {
  return { rawJson, parsedPackage: null, validation: null, differences: [] };
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('ar-SA').format(value);
}

export function compareEventRuntimes(
  previousRuntime: EventRuntimeConfiguration | null,
  nextRuntime: EventRuntimeConfiguration
): EventPackageDifference[] {
  const previous = previousRuntime;
  return [
    { field: 'eventIdentity', labelAr: 'هوية الفعالية', previousValue: previous?.identity.eventNameAr ?? 'لا توجد حزمة نشطة', nextValue: nextRuntime.identity.eventNameAr },
    { field: 'venueIdentity', labelAr: 'هوية الموقع', previousValue: previous?.identity.venueId ?? 'غير محدد', nextValue: nextRuntime.identity.venueId },
    { field: 'entities', labelAr: 'العناصر المكانية', previousValue: formatCount(previous ? Object.keys(previous.entities).length : 0), nextValue: formatCount(Object.keys(nextRuntime.entities).length) },
    { field: 'routes', labelAr: 'المسارات', previousValue: formatCount(previous?.routes.length ?? 0), nextValue: formatCount(nextRuntime.routes.length) },
    { field: 'readiness', labelAr: 'سجلات الجاهزية', previousValue: formatCount(previous?.readinessRecords.length ?? 0), nextValue: formatCount(nextRuntime.readinessRecords.length) },
    { field: 'decisions', labelAr: 'القرارات', previousValue: formatCount(previous?.decisions.length ?? 0), nextValue: formatCount(nextRuntime.decisions.length) },
    { field: 'roles', labelAr: 'الأدوار', previousValue: formatCount(previous?.roles.length ?? 0), nextValue: formatCount(nextRuntime.roles.length) },
    { field: 'packs', labelAr: 'الحزم التشغيلية', previousValue: formatCount(previous?.enabledOperationalPacks.length ?? 0), nextValue: formatCount(nextRuntime.enabledOperationalPacks.length) },
    { field: 'integrations', labelAr: 'ملفات التكامل', previousValue: formatCount(previous?.integrationProfiles.length ?? 0), nextValue: formatCount(nextRuntime.integrationProfiles.length) },
    { field: 'projection', labelAr: 'تهيئة العرض المكاني', previousValue: previous?.projectionProfiles[0]?.projectionConfigurationVersion ?? 'غير محدد', nextValue: nextRuntime.projectionProfiles[0]?.projectionConfigurationVersion ?? 'غير محدد' }
  ];
}

export class EventPackageActivationController {
  private activeRuntime: EventRuntimeConfiguration | null = null;
  private previousRuntime: EventRuntimeConfiguration | null = null;
  private history: EventPackageActivationHistoryEntry[] = [];
  private preview: EventPackageImportPreview = emptyPreview();

  constructor(
    private readonly activateRuntime: EventRuntimeActivator,
    private readonly defaultPackageId: string,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  snapshot(): EventPackageActivationSnapshot {
    return structuredClone({ activeRuntime: this.activeRuntime, previousRuntime: this.previousRuntime, history: this.history });
  }

  currentPreview(): EventPackageImportPreview {
    return structuredClone(this.preview);
  }

  async previewPackage(eventPackage: EventPackage): Promise<EventPackageImportPreview> {
    const parsedPackage = structuredClone(eventPackage);
    const validation = await validateEventPackage(parsedPackage);
    this.preview = {
      rawJson: JSON.stringify(parsedPackage, null, 2),
      parsedPackage,
      validation,
      differences: validation.runtime ? compareEventRuntimes(this.activeRuntime, validation.runtime) : []
    };
    return this.currentPreview();
  }

  async previewJson(rawJson: string): Promise<EventPackageImportPreview> {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const validation = await validateEventPackage(parsed);
      this.preview = {
        rawJson,
        parsedPackage: validation.schemaValid ? structuredClone(parsed) as EventPackage : null,
        validation,
        differences: validation.runtime ? compareEventRuntimes(this.activeRuntime, validation.runtime) : []
      };
    } catch {
      this.preview = {
        rawJson,
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
    return this.currentPreview();
  }

  activatePreview(reasonAr = 'تفعيل محلي بعد اكتمال التحقق.'): EventPackageActivationSnapshot {
    const validation = this.preview.validation;
    const runtime = validation?.runtime;
    if (!validation?.valid || !runtime) {
      this.record(this.preview.parsedPackage?.packageId ?? 'PACKAGE-UNKNOWN', this.preview.parsedPackage?.packageContentHash ?? '', 'blocked', 'حُجب التفعيل لأن الحزمة تحتوي أخطاء مانعة.');
      return this.snapshot();
    }
    const nextRuntime = structuredClone(runtime);
    try {
      this.activateRuntime(nextRuntime);
    } catch {
      this.record(nextRuntime.identity.packageId, nextRuntime.identity.packageContentHash, 'blocked', 'فشل فحص صحة التشغيل؛ بقيت الحزمة السابقة دون تغيير.');
      return this.snapshot();
    }
    this.previousRuntime = this.activeRuntime ? structuredClone(this.activeRuntime) : null;
    this.activeRuntime = nextRuntime;
    this.record(nextRuntime.identity.packageId, nextRuntime.identity.packageContentHash, 'activated', reasonAr);
    return this.snapshot();
  }

  async activatePackage(eventPackage: EventPackage, reasonAr?: string): Promise<EventPackageActivationSnapshot> {
    await this.previewPackage(eventPackage);
    return this.activatePreview(reasonAr);
  }

  rollback(): EventPackageActivationSnapshot {
    if (!this.previousRuntime) {
      this.record(this.activeRuntime?.identity.packageId ?? 'PACKAGE-NONE', this.activeRuntime?.identity.packageContentHash ?? '', 'blocked', 'لا توجد حزمة سابقة متاحة للتراجع المحلي.');
      return this.snapshot();
    }
    const rollbackRuntime = structuredClone(this.previousRuntime);
    const displacedRuntime = this.activeRuntime ? structuredClone(this.activeRuntime) : null;
    this.activateRuntime(rollbackRuntime);
    this.activeRuntime = rollbackRuntime;
    this.previousRuntime = displacedRuntime;
    this.record(rollbackRuntime.identity.packageId, rollbackRuntime.identity.packageContentHash, 'rolled-back', 'أعيدت الحزمة السابقة محلياً من دون تعديل خط الأساس.');
    return this.snapshot();
  }

  async reset(packages: EventPackage[]): Promise<EventPackageActivationSnapshot> {
    const defaultPackage = packages.find((eventPackage) => eventPackage.packageId === this.defaultPackageId);
    if (!defaultPackage) {
      this.record(this.defaultPackageId, '', 'blocked', 'تعذر العثور على الحزمة المرجعية الافتراضية.');
      return this.snapshot();
    }
    await this.previewPackage(defaultPackage);
    return this.activatePreview('أعيدت الحزمة المرجعية الافتراضية محلياً.');
  }

  private record(packageId: string, packageContentHash: string, outcome: EventPackageActivationHistoryEntry['outcome'], reasonAr: string) {
    const activatedAt = this.now();
    const entry: EventPackageActivationHistoryEntry = {
      activationId: `ACTIVATION-${String(this.history.length + 1).padStart(3, '0')}`,
      packageId,
      packageContentHash,
      activatedAt,
      activatedBy: 'local-demo-operator',
      outcome,
      reasonAr
    };
    this.history = [entry, ...this.history].slice(0, 20);
  }
}
