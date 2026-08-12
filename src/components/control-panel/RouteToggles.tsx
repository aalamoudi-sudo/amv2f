import { Route } from 'lucide-react';
import { selectRuntimeRoutes, useEventStore } from '../../store/useEventStore';

export function RouteToggles() {
  const routeVisibility = useEventStore((state) => state.routeVisibility);
  const routeDefinitions = useEventStore(selectRuntimeRoutes);
  const toggleRoute = useEventStore((state) => state.toggleRoute);
  const selectEntity = useEventStore((state) => state.selectEntity);

  if (routeDefinitions.length === 0) {
    return <p className="text-sm text-command-muted">لا توجد مسارات معرفة حالياً.</p>;
  }

  return (
    <div className="space-y-2">
      {routeDefinitions.map((route) => {
        const checked = Boolean(routeVisibility[route.id]);
        return (
          <div key={route.id} className={`rounded border p-3 transition ${checked ? 'border-command-accent/55 bg-command-accent/5' : 'border-command-line bg-command-panelStrong'}`}>
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => selectEntity(route.entityId)}
                className="min-w-0 text-right transition focus-visible:text-command-accent"
                aria-label={`تحديد ${route.nameAr}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-command-text">
                  <Route className="h-4 w-4" style={{ color: route.color }} aria-hidden="true" />
                  {route.nameAr}
                </span>
                <span className="mt-1 block text-xs leading-5 text-command-muted">{route.descriptionAr}</span>
              </button>
              <label className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-2 text-xs text-command-muted">
                <input
                  data-testid={`route-toggle-${route.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRoute(route.id)}
                  className="h-4 w-4 accent-command-accent"
                  aria-label={`إظهار ${route.nameAr}`}
                />
                {checked ? 'ظاهر' : 'مخفي'}
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
