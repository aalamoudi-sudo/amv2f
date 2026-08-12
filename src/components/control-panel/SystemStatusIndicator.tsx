import { Activity, Database, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEventStore } from '../../store/useEventStore';
import { getCriticalSignalCount } from '../../utils/statusMetrics';
import { formatTime } from '../../utils/format';

interface SystemStatusIndicatorProps {
  presentation: 'launcher' | 'experience-candidate' | 'operational';
  experiencePackageRole?: 'experience' | 'demo' | 'reference';
}

export function SystemStatusIndicator({ presentation, experiencePackageRole = 'experience' }: SystemStatusIndicatorProps) {
  const entities = useEventStore((state) => state.entities);
  const lastSavedAt = useEventStore((state) => state.lastSavedAt);
  const stateContext = useEventStore((state) => state.stateContext);
  const activeRuntimeName = useEventStore((state) => state.activeRuntime?.identity.eventNameAr ?? null);
  if (presentation === 'launcher') {
    return (
      <div aria-label="حالة الإطلاق" aria-live="polite" className="flex flex-wrap items-center gap-2 text-xs xl:flex-1 xl:justify-center">
        <StatusPill testId="system-status" icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />} label="واجهة اختيار الحزمة" tone="accent" />
        <StatusPill icon={<Database className="h-3.5 w-3.5" aria-hidden="true" />} label={activeRuntimeName ? `بيئة تشغيل مؤقتة محفوظة: ${activeRuntimeName}` : 'لا توجد بيئة تشغيل مؤقتة محفوظة'} />
        <StatusPill icon={<WifiOff className="h-3.5 w-3.5" aria-hidden="true" />} label="لا توجد بيانات تشغيلية حية" />
      </div>
    );
  }

  if (presentation === 'experience-candidate') {
    const packageLabel = experiencePackageRole === 'demo'
      ? 'حزمة تجريبية صريحة'
      : experiencePackageRole === 'reference'
        ? 'حزمة مرجعية'
        : 'حزمة تجربة مرشحة';
    return (
      <div aria-label="حالة حزمة التجربة" aria-live="polite" className="flex flex-wrap items-center gap-2 text-xs xl:flex-1 xl:justify-center">
        <StatusPill testId="system-status" icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />} label={packageLabel} tone="accent" />
        <StatusPill icon={<Database className="h-3.5 w-3.5" aria-hidden="true" />} label="لا تفعيل لخط الأساس" />
        <StatusPill icon={<WifiOff className="h-3.5 w-3.5" aria-hidden="true" />} label="لا توجد بيانات تشغيلية حية" />
      </div>
    );
  }

  const criticalSignals = getCriticalSignalCount(entities);
  const healthy = criticalSignals < 4;
  const sourceLabel = stateContext.dataSource === 'temporary-demo' ? 'بيانات عرض مؤقتة' : 'خط أساس تشغيلي';
  const stateLabel = stateContext.stateLayer === 'scenario' ? `${sourceLabel} · حالة تمرين` : sourceLabel;

  return (
    <div aria-label="حالة المنصة" aria-live="polite" className="flex flex-wrap items-center gap-2 text-xs xl:flex-1 xl:justify-center">
      <span
        data-testid="system-status"
        aria-label={healthy ? 'حالة النظام المحلي: العرض مستقر' : 'حالة النظام المحلي: متابعة العرض'}
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 ${
          healthy
            ? 'status-normal'
            : 'status-warning'
        }`}
      >
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        {healthy ? 'النظام المحلي مستقر' : 'متابعة محلية'}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-command-line bg-command-panelStrong px-2.5 py-1.5 text-command-muted">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        {stateLabel}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-command-line bg-command-panelStrong px-2.5 py-1.5 text-command-muted">
        <Database className="h-3.5 w-3.5" aria-hidden="true" />
        حفظ محلي {formatTime(lastSavedAt)}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-command-line bg-command-panelStrong px-2.5 py-1.5 text-command-muted">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        لا يوجد اتصال خلفي
      </span>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  testId,
  tone = 'muted'
}: {
  icon: ReactNode;
  label: string;
  testId?: string;
  tone?: 'accent' | 'muted';
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 ${tone === 'accent' ? 'border-command-blue/50 bg-command-blue/10 text-command-blue' : 'border-command-line bg-command-panelStrong text-command-muted'}`}
    >
      {icon}
      {label}
    </span>
  );
}
