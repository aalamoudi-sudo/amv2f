import { Activity, AlertTriangle, Gauge, Route } from 'lucide-react';
import { getAverageReadiness, getCriticalSignalCount } from '../../utils/statusMetrics';
import { formatPercent } from '../../utils/format';
import type { SpatialEntityRecord } from '../../types/spatial';
import type { RouteDefinition, RouteVisibility } from '../../types/routes';

interface OperationalSnapshotProps {
  entities: SpatialEntityRecord;
  routeVisibility: RouteVisibility;
  routes: RouteDefinition[];
}

export function OperationalSnapshot({ entities, routeVisibility, routes }: OperationalSnapshotProps) {
  const readiness = getAverageReadiness(entities);
  const criticalCount = getCriticalSignalCount(entities);
  const visibleRoutes = routes.filter((route) => routeVisibility[route.id]).length;
  const activeEntities = Object.values(entities).filter((entity) => entity.status !== 'inactive').length;

  const metrics = [
    {
      label: 'متوسط الجاهزية المحلي',
      value: formatPercent(readiness),
      icon: Gauge,
      tone: 'text-command-accent',
      accent: 'border-command-accent/70'
    },
    {
      label: 'إشارات حرجة محلية',
      value: new Intl.NumberFormat('ar-SA').format(criticalCount),
      icon: AlertTriangle,
      tone: criticalCount > 0 ? 'text-command-red' : 'text-command-accent',
      accent: criticalCount > 0 ? 'border-command-red/80' : 'border-command-accent/70'
    },
    {
      label: 'مسارات ظاهرة',
      value: new Intl.NumberFormat('ar-SA').format(visibleRoutes),
      icon: Route,
      tone: 'text-command-amber',
      accent: 'border-command-amber/70'
    },
    {
      label: 'عناصر نشطة',
      value: new Intl.NumberFormat('ar-SA').format(activeEntities),
      icon: Activity,
      tone: 'text-command-blue',
      accent: 'border-command-blue/70'
    }
  ];

  return (
    <div aria-label="الملخص التشغيلي" className="grid grid-cols-2 gap-2.5">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className={`min-h-[76px] rounded border border-s-2 border-command-line bg-command-panelStrong p-3 ${metric.accent}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] leading-5 text-command-muted">{metric.label}</p>
              <Icon className={`h-4 w-4 ${metric.tone}`} aria-hidden="true" />
            </div>
            <p className={`mt-1 text-2xl font-semibold leading-8 text-command-text ${metric.tone}`}>{metric.value}</p>
          </div>
        );
      })}
    </div>
  );
}
