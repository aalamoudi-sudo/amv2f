import { isRouteOperationallyApproved } from '../../services/zoneReadinessImpact';
import { deriveSpatialBounds, projectSpatialPoint } from '../../services/spatialBounds';
import type { RouteDefinition } from '../../types/routes';
import type { SpatialEntityRecord, ZoneReadinessRecord } from '../../types/spatial';

interface ReadinessPlan2DProps {
  records: ZoneReadinessRecord[];
  entities: SpatialEntityRecord;
  routes: RouteDefinition[];
  selectedEntityId: string | null;
  onSelectEntity: (zoneId: ZoneReadinessRecord['zoneId']) => void;
}

function routePoints(route: RouteDefinition, bounds: ReturnType<typeof deriveSpatialBounds>): string {
  return route.points
    .map(([x, , z]) => {
      const point = projectSpatialPoint(bounds, x, z);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

export function ReadinessPlan2D({ records, entities, routes, selectedEntityId, onSelectEntity }: ReadinessPlan2DProps) {
  const bounds = deriveSpatialBounds(entities, routes);
  return (
    <div
      data-testid="readiness-2d-plan"
      data-spatial-bounds={`${bounds.minX},${bounds.maxX},${bounds.minZ},${bounds.maxZ}`}
      className="command-spatial-plan relative aspect-[16/9] min-h-[420px] overflow-hidden rounded border border-command-line p-5"
      aria-label="مخطط ثنائي الأبعاد لجاهزية المناطق"
    >
      <div className="command-spatial-plan-field absolute inset-5 border border-command-blue/35" aria-hidden="true" />
      <div className="absolute inset-5 opacity-40" aria-hidden="true">
        <div className="command-spatial-plan-grid h-full w-full" />
      </div>
      <svg className="pointer-events-none absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {routes.map((route) => (
          <polyline
            key={route.id}
            points={routePoints(route, bounds)}
            fill="none"
            stroke={route.color}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isRouteOperationallyApproved(route) ? undefined : '2 1.5'}
            opacity="0.86"
          />
        ))}
      </svg>

      {records.map((record) => {
        const entity = entities[record.zoneId];
        if (!entity) return null;
        const point = projectSpatialPoint(bounds, entity.position[0], entity.position[2]);
        const width = Math.max(6, Math.min(26, (entity.scale[0] / bounds.width) * 100));
        const height = Math.max(5, Math.min(20, (entity.scale[2] / bounds.depth) * 100));
        const selected = selectedEntityId === record.zoneId;
        const urgent = record.escalationLevel === 'urgent' || record.openingImpact === 'high';

        return (
          <button
            key={record.zoneId}
            type="button"
            data-testid={`readiness-2d-zone-${record.zoneId}`}
            onClick={() => onSelectEntity(record.zoneId)}
            className={`absolute z-10 flex flex-col items-center justify-center overflow-hidden rounded border px-1 text-center transition focus-visible:outline-2 focus-visible:outline-command-accent ${
              selected
                ? 'border-command-accent bg-command-accent/35 ring-2 ring-command-accent ring-offset-2 ring-offset-command-panel'
                : urgent
                  ? 'border-command-red/80 bg-command-red/30 hover:border-command-red'
                  : 'border-command-line bg-command-panelStrong/90 hover:border-command-accent'
            }`}
            style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${width}%`, height: `${height}%`, transform: 'translate(-50%, -50%)' }}
            aria-pressed={selected}
            aria-label={`${record.zoneId}، ${record.readiness}%، ${record.approvalStatus}`}
          >
            <span className="max-w-full truncate text-[10px] font-semibold text-command-text">{entity.nameAr}</span>
            <span className="ltr text-[9px] text-command-muted">{record.readiness}%</span>
          </button>
        );
      })}

      <div className="absolute bottom-2 end-2 flex flex-wrap gap-2 rounded border border-command-line bg-command-panel/90 px-2 py-1 text-[10px] text-command-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-command-accent" /> منطقة محددة</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-command-red" /> أثر مرتفع</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-command-amber" /> مسار تجريبي غير معتمد</span>
      </div>
    </div>
  );
}
