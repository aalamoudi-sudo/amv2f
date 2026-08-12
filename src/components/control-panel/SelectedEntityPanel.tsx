import { Save } from 'lucide-react';
import { statusConfig } from '../../data/statuses';
import { riskLevelConfig } from '../../data/riskLevels';
import { isOperationalPackEnabled, useEventStore } from '../../store/useEventStore';
import { entityTypeLabelsAr, formatCapacity, formatPercent } from '../../utils/format';
import type { OperationalStatus, RiskLevel } from '../../types/status';
import { ErrorState, EmptyState, SuccessState } from '../shared/StateBlocks';

export function SelectedEntityPanel() {
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const selectedEntity = useEventStore((state) =>
    state.selectedEntityId ? state.entities[state.selectedEntityId] : undefined
  );
  const updateStatus = useEventStore((state) => state.updateEntityStatus);
  const updateReadiness = useEventStore((state) => state.updateEntityReadiness);
  const updateRisk = useEventStore((state) => state.updateEntityRiskLevel);
  const lastSavedAt = useEventStore((state) => state.lastSavedAt);
  const readinessEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'zone-readiness'));

  if (!selectedEntityId) {
    return <EmptyState title="لا يوجد عنصر محدد" message="اختر عنصراً من القائمة أو من المشهد ثلاثي الأبعاد." />;
  }

  if (!selectedEntity) {
    return <ErrorState title="تعذر عرض العنصر" message="العنصر المحدد غير موجود في بيانات العرض الحالية." />;
  }

  const status = statusConfig[selectedEntity.status];
  const risk = riskLevelConfig[selectedEntity.riskLevel];
  const entityTypeLabel = entityTypeLabelsAr[selectedEntity.type];

  return (
    <div data-testid="selected-entity-panel" className="space-y-3.5" aria-live="polite">
      <div className="border-s-2 border-command-accent ps-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-command-muted">
              <span>{entityTypeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="ltr inline-block">{selectedEntity.id}</span>
            </div>
            <h2 className="mt-1 text-xl font-semibold leading-7 text-command-text">{selectedEntity.nameAr}</h2>
          </div>
          <span className={`shrink-0 rounded border px-2 py-1 text-xs ${status.borderClass} ${status.surfaceClass} ${status.textClass}`}>
            {status.labelAr}
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-command-muted">{selectedEntity.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <InfoItem label="المعرّف" value={selectedEntity.id} ltr />
        <InfoItem label="النوع" value={entityTypeLabelsAr[selectedEntity.type]} />
        <InfoItem label="السعة" value={formatCapacity(selectedEntity.capacity)} />
        <InfoItem label="المخاطر" value={risk.labelAr} className={risk.colorClass} />
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-command-muted">الحالة التشغيلية</span>
        <select
          data-testid="status-select"
          value={selectedEntity.status}
          onChange={(event) => updateStatus(selectedEntity.id, event.target.value as OperationalStatus)}
          className="command-select"
        >
          {Object.values(statusConfig).map((item) => (
            <option key={item.value} value={item.value}>
              {item.labelAr}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 flex items-center justify-between text-xs font-semibold text-command-muted">
          <span>نسبة الجاهزية</span>
          <output className="text-command-text">{formatPercent(selectedEntity.readiness)}</output>
        </span>
        <input
          data-testid="readiness-input"
          type="range"
          disabled={!readinessEnabled}
          min={0}
          max={100}
          value={selectedEntity.readiness}
          onChange={(event) => updateReadiness(selectedEntity.id, Number(event.target.value))}
          className="h-5 w-full cursor-pointer accent-command-accent disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={readinessEnabled ? 'تغيير نسبة الجاهزية' : 'جاهزية المناطق غير مفعلة في الحزمة الحالية'}
          aria-valuetext={formatPercent(selectedEntity.readiness)}
        />
        {!readinessEnabled ? <span className="mt-1 block text-xs text-command-muted">حزمة جاهزية المناطق غير مفعلة في التهيئة الحالية.</span> : null}
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-command-muted">مستوى المخاطر</span>
        <select
          data-testid="risk-select"
          value={selectedEntity.riskLevel}
          onChange={(event) => updateRisk(selectedEntity.id, event.target.value as RiskLevel)}
          className="command-select"
        >
          {Object.values(riskLevelConfig).map((item) => (
            <option key={item.value} value={item.value}>
              {item.labelAr}
            </option>
          ))}
        </select>
      </label>

      <div className="command-card p-3">
        <p className="text-xs font-semibold text-command-muted">الفريق المسؤول</p>
        <p className="mt-1 text-sm text-command-text">{selectedEntity.responsibleParty}</p>
      </div>

      <SuccessState
        title="الحفظ المحلي نشط"
        message={lastSavedAt ? 'تم حفظ آخر تعديل في المتصفح المحلي.' : 'أي تعديل على الحالة أو الجاهزية سيحفظ تلقائياً محلياً.'}
        action={
          <span className="inline-flex items-center gap-2 text-xs text-command-severity-normal">
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            لا يوجد اتصال خلفي في هذه المرحلة
          </span>
        }
      />
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
  ltr?: boolean;
  className?: string;
}

function InfoItem({ label, value, ltr = false, className = '' }: InfoItemProps) {
  return (
    <div className={`rounded border border-command-line bg-command-panelStrong p-3 ${className}`}>
      <p className="text-[11px] text-command-muted">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold text-command-text ${ltr ? 'ltr text-left' : ''}`}>{value}</p>
    </div>
  );
}
