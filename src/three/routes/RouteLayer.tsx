import type { RouteDefinition, RouteVisibility } from '../../types/routes';
import type { SpatialEntityId } from '../../types/spatial';
import { RoutePath } from './RoutePath';

interface RouteLayerProps {
  routes: RouteDefinition[];
  routeVisibility: RouteVisibility;
  selectedEntityId: SpatialEntityId | null;
  highlightedEntityIds: SpatialEntityId[];
  projectionRoutesVisible: boolean;
  onSelectRoute: (entityId: SpatialEntityId) => void;
}

export function RouteLayer({
  routes,
  routeVisibility,
  selectedEntityId,
  highlightedEntityIds,
  projectionRoutesVisible,
  onSelectRoute
}: RouteLayerProps) {
  return (
    <group>
      {routes.map((route) => (
        <RoutePath
          key={route.id}
          route={route}
          visible={projectionRoutesVisible && Boolean(routeVisibility[route.id])}
          selected={selectedEntityId === route.entityId}
          highlighted={highlightedEntityIds.includes(route.entityId)}
          onSelect={() => onSelectRoute(route.entityId)}
        />
      ))}
    </group>
  );
}
