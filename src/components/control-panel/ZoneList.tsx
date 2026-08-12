import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getStatusConfig } from '../../data/statuses';
import { useEventStore } from '../../store/useEventStore';
import { getOperationalEntities } from '../../utils/entities';
import { entityTypeLabelsAr, formatPercent } from '../../utils/format';
import { EmptyState } from '../shared/StateBlocks';

export function ZoneList() {
  const entities = useEventStore((state) => state.entities);
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const [query, setQuery] = useState('');

  const entityList = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return getOperationalEntities(entities).filter((entity) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        entity.nameAr.includes(query.trim()) ||
        entity.nameEn.toLowerCase().includes(normalizedQuery) ||
        entity.id.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [entities, query]);

  return (
    <div>
      <label className="mb-3 block">
        <span className="sr-only">بحث في العناصر التشغيلية</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-command-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث باسم المنطقة أو المعرّف"
            aria-label="بحث في العناصر التشغيلية"
            className="command-select py-2 pl-3 pr-10 placeholder:text-command-muted"
          />
        </span>
      </label>

      {entityList.length === 0 ? (
        <EmptyState title="لا توجد نتائج" message="غيّر عبارة البحث أو أعد ضبط بيانات العرض التجريبي." />
      ) : (
        <div aria-label="قائمة العناصر التشغيلية" className="max-h-[36vh] space-y-2 overflow-y-auto pl-1 command-scrollbar xl:max-h-[38vh]">
          {entityList.map((entity) => {
            const status = getStatusConfig(entity.status);
            const selected = selectedEntityId === entity.id;
            return (
              <button
                data-testid={`zone-list-item-${entity.id}`}
                type="button"
                key={entity.id}
                onClick={() => selectEntity(entity.id)}
                className={`w-full rounded border p-3 text-right transition focus-visible:ring-1 focus-visible:ring-command-accent ${
                  selected
                    ? 'border-command-accent border-s-2 bg-command-accent/15 ring-1 ring-command-accent/45'
                    : 'border-command-line bg-command-panelStrong hover:border-command-accent/80'
                }`}
                aria-pressed={selected}
                aria-label={`${entity.nameAr}، ${status.labelAr}، الجاهزية ${formatPercent(entity.readiness)}${selected ? '، محدد' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-command-text">{entity.nameAr}</p>
                    <p className="mt-1 text-[11px] text-command-muted">
                      {entityTypeLabelsAr[entity.type]} · <span className="ltr inline-block">{entity.id}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-1 text-[11px] ${status.borderClass} ${status.surfaceClass} ${status.textClass}`}
                  >
                    {status.labelAr}
                  </span>
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30"
                  role="progressbar"
                  aria-label={`جاهزية ${entity.nameAr}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={entity.readiness}
                  aria-valuetext={formatPercent(entity.readiness)}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${entity.readiness}%`, backgroundColor: status.hexColor }}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-[11px] text-command-muted">الجاهزية {formatPercent(entity.readiness)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
