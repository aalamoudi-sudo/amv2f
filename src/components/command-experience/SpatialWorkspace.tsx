import { Box, List, Map, MapPinned, Route, Triangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { prioritizeReadinessRecords } from '../../services/readinessPriority';
import { selectRuntimeRoutes, useEventStore } from '../../store/useEventStore';
import type { ZoneReadinessRecord } from '../../types/spatial';
import { EventSceneViewport } from '../../three/scene/EventSceneViewport';
import { formatPercent } from '../../utils/format';
import { ReadinessPlan2D } from '../readiness/ReadinessPlan2D';
import { EmptyState } from '../shared/StateBlocks';
import { OperatorDecisionFlow } from './OperatorDecisionFlow';
import { truthLabelForStateContext } from '../../ux/truthVocabulary';
import { TruthContextBadge } from './TruthContextBadge';

type SpatialView = 'list' | '2d' | '3d' | 'hybrid';

const spatialViews: Array<{ value: SpatialView; label: string; icon: typeof List }> = [
  { value: 'list', label: 'قائمة', icon: List },
  { value: '2d', label: '2D', icon: Map },
  { value: '3d', label: '3D', icon: Box },
  { value: 'hybrid', label: 'هجين', icon: Triangle }
];

export function SpatialWorkspace({ onOpenDecision }: { onOpenDecision: () => void }) {
  const entities = useEventStore((state) => state.entities);
  const readiness = useEventStore((state) => state.zoneReadiness);
  const routes = useEventStore(selectRuntimeRoutes);
  const selectedEntityId = useEventStore((state) => state.selectedEntityId);
  const selectEntity = useEventStore((state) => state.selectEntity);
  const [view, setView] = useState<SpatialView>('hybrid');
  const prioritized = useMemo(() => prioritizeReadinessRecords(readiness), [readiness]);
  const selectedRecord = readiness.find((record) => record.zoneId === selectedEntityId) ?? prioritized[0]?.record ?? null;

  const selectRecord = (record: ZoneReadinessRecord) => selectEntity(record.zoneId);

  return (
    <div data-testid="spatial-workspace" className="min-h-0 flex-1 overflow-y-auto command-scrollbar">
      <div className="mx-auto w-full max-w-[2560px] space-y-4 p-4">
        <header className="command-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <MapPinned className="h-5 w-5 text-command-accent" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-command-text">المكان والسياق المكاني</h2>
                <TruthContextBadge label="unapproved" />
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-command-muted">القائمة تجيب عن ما يحتاج الانتباه، و2D عن أين يقع، و3D عن العلاقة المكانية، والتفاصيل عن السبب والإجراء. كل السطوح تستخدم معرف العنصر نفسه.</p>
            </div>
            <div data-testid="spatial-view-selector" className="flex rounded border border-command-line bg-command-bg/60 p-1" aria-label="اختيار عرض المكان">
              {spatialViews.map(({ value, label, icon: Icon }) => (
                <button key={value} data-testid={'spatial-view-' + value} type="button" onClick={() => setView(value)} aria-pressed={view === value} className={'command-preset-button gap-1.5 ' + (view === value ? 'command-preset-button-active' : '')}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs leading-6 text-command-muted">
            <span className="rounded border border-command-amber/50 bg-command-amber/10 px-2 py-1">الهندسة المعروضة غير موثقة كمسح أو مخطط معتمد.</span>
            <span className="rounded border border-command-line px-2 py-1">لا تظهر هندسة تجربة مرشحة داخل هذا السياق التشغيلي.</span>
          </div>
        </header>

        <div className="grid gap-4 2xl:grid-cols-[330px_minmax(560px,1fr)_390px]">
          <aside className="space-y-3">
            <section className="command-card p-4">
              <div className="flex items-center gap-2"><List className="h-4 w-4 text-command-accent" aria-hidden="true" /><h3 className="font-semibold text-command-text">ما يحتاج الانتباه</h3></div>
              <div data-testid="spatial-attention-list" className="mt-3 space-y-2">
                {prioritized.length ? prioritized.map(({ record, priority }) => {
                  const entity = entities[record.zoneId];
                  const selected = record.zoneId === selectedEntityId;
                  return (
                    <button key={record.zoneId} data-testid={'spatial-list-' + record.zoneId} type="button" onClick={() => selectRecord(record)} aria-pressed={selected} className={'w-full rounded border p-3 text-right transition ' + (selected ? 'border-command-accent bg-command-accent/10' : 'border-command-line bg-command-panelStrong hover:border-command-accent')}>
                      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-command-text">{entity?.nameAr ?? record.zoneId}</span><TruthContextBadge label={truthLabelForStateContext(record.stateContext)} /></div>
                      <p className="mt-1 text-xs text-command-muted">أولوية {priority.labelAr} · الجاهزية {formatPercent(record.readiness)}</p>
                      <p className="ltr mt-1 text-left text-[10px] text-command-muted">{record.zoneId}</p>
                    </button>
                  );
                }) : <EmptyState title="لا توجد عناصر مكانية منظمة" message="لا توجد سجلات جاهزية يمكن وضعها في سياق مكاني." />}
              </div>
            </section>
            <section className="command-card p-4 text-xs leading-6 text-command-muted">
              <p className="font-semibold text-command-text"><Route className="ml-2 inline h-4 w-4 text-command-accent" aria-hidden="true" />علاقات المسارات</p>
              <p className="mt-2">تظهر فقط المسارات المنظمة في Runtime الحالي. لا تُستنتج إحداثيات أو روابط جديدة.</p>
            </section>
          </aside>

          <section data-testid={'spatial-surface-' + view} className="min-h-[520px] overflow-hidden rounded border border-command-line bg-command-panel">
            {view === 'list' ? <SpatialListSurface records={prioritized.map((item) => item.record)} selectedEntityId={selectedEntityId} entities={entities} onSelect={selectRecord} /> : null}
            {view === '2d' ? <ReadinessPlan2D records={readiness} entities={entities} routes={routes} selectedEntityId={selectedEntityId} onSelectEntity={selectEntity} /> : null}
            {view === '3d' ? <div className="h-[620px]"><EventSceneViewport className="h-full" /></div> : null}
            {view === 'hybrid' ? <div className="grid h-full min-h-[620px] gap-px bg-command-line xl:grid-cols-2"><div className="min-h-[360px] bg-command-panel p-3"><p className="mb-2 text-xs font-semibold text-command-muted">2D · أين يقع؟</p><ReadinessPlan2D records={readiness} entities={entities} routes={routes} selectedEntityId={selectedEntityId} onSelectEntity={selectEntity} /></div><div className="min-h-[360px] bg-command-panel"><div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-command-muted"><span>3D · كيف يرتبط؟</span><span className="ltr">{selectedEntityId ?? 'لا يوجد اختيار'}</span></div><EventSceneViewport className="h-[565px]" /></div></div> : null}
          </section>

          <aside className="space-y-3">
            <section className="command-card p-4">
              <p className="command-eyebrow">التفاصيل أولاً ثم الدليل</p>
              <h3 className="mt-1 font-semibold text-command-text">من الحالة إلى الإجراء</h3>
              <div className="mt-4"><OperatorDecisionFlow entityId={selectedRecord?.zoneId ?? selectedEntityId} onOpenDecision={onOpenDecision} /></div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SpatialListSurface({
  records,
  selectedEntityId,
  entities,
  onSelect
}: {
  records: ZoneReadinessRecord[];
  selectedEntityId: string | null;
  entities: ReturnType<typeof useEventStore.getState>['entities'];
  onSelect: (record: ZoneReadinessRecord) => void;
}) {
  if (!records.length) return <div className="p-4"><EmptyState title="لا توجد سجلات" message="لا توجد حالة جاهزية منظمة لعرضها." /></div>;
  return (
    <div className="h-full overflow-y-auto p-4 command-scrollbar">
      <table className="w-full min-w-[700px] text-right text-sm">
        <thead className="border-b border-command-line text-xs text-command-muted"><tr><th className="px-3 py-3">العنصر</th><th className="px-3 py-3">الجاهزية</th><th className="px-3 py-3">المصدر</th><th className="px-3 py-3">الإجراء</th></tr></thead>
        <tbody>{records.map((record) => <tr key={record.zoneId} className={record.zoneId === selectedEntityId ? 'bg-command-accent/10' : 'border-b border-command-line/60'}><td className="px-3 py-3"><button type="button" onClick={() => onSelect(record)} className="text-right font-semibold text-command-text hover:text-command-accent">{entities[record.zoneId]?.nameAr ?? record.zoneId}<span className="ltr mt-1 block text-left text-[10px] text-command-muted">{record.zoneId}</span></button></td><td className="px-3 py-3">{formatPercent(record.readiness)}</td><td className="px-3 py-3"><TruthContextBadge label={truthLabelForStateContext(record.stateContext)} /></td><td className="px-3 py-3 text-xs leading-6 text-command-muted">{record.requiredAction}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
