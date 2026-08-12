import { statusConfig } from '../../data/statuses';

export function StatusLegend() {
  return (
    <div aria-label="مفتاح الحالات التشغيلية" className="grid grid-cols-2 gap-2">
      {Object.values(statusConfig).map((status) => (
        <div
          key={status.value}
          className={`rounded border px-2.5 py-2.5 ${status.borderClass} ${status.surfaceClass}`}
          title={status.legendDescriptionAr}
          aria-label={`${status.labelAr}: ${status.legendDescriptionAr}`}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: status.hexColor }}
              aria-hidden="true"
            />
            <span className={`text-xs font-medium ${status.textClass}`}>{status.labelAr}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
