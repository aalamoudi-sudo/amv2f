import type { RouteDefinition } from '../types/routes';
import type { ZoneReadinessRecord } from '../types/spatial';

export interface ZoneRouteImpact {
  route: RouteDefinition;
  approved: boolean;
  impactAr: string;
}

export interface ZoneDependencyImpact {
  zoneId: string;
  direction: 'upstream' | 'downstream';
  impactAr: string;
}

export function isRouteOperationallyApproved(route: RouteDefinition): boolean {
  return Boolean(
    route.geometrySource.trim() &&
      route.authority.trim() &&
      route.approvalStatus === 'approved' &&
      route.approvedBy?.trim() &&
      route.approvedAt &&
      route.version.trim()
  );
}

export function getZoneRouteImpacts(record: ZoneReadinessRecord, routes: RouteDefinition[]): ZoneRouteImpact[] {
  return record.relatedRouteIds.flatMap((routeId) => {
    const route = routes.find((candidate) => candidate.id === routeId);
    if (!route) return [];
    return [
      {
        route,
        approved: isRouteOperationallyApproved(route),
        impactAr: record.operationalImpact.visitorRoutes === 'high' ? 'تأثير مرتفع على التشغيل' : 'تأثير يحتاج متابعة'
      }
    ];
  });
}

export function getZoneDependencyImpacts(record: ZoneReadinessRecord, records: ZoneReadinessRecord[]): ZoneDependencyImpact[] {
  const downstream = records.filter((candidate) => candidate.dependencies.includes(record.zoneId));
  return [
    ...record.dependencies.map((zoneId) => ({
      zoneId,
      direction: 'upstream' as const,
      impactAr: 'هذه المنطقة تنتظر معالجة المنطقة المعتمدة عليها.'
    })),
    ...downstream.map((candidate) => ({
      zoneId: candidate.zoneId,
      direction: 'downstream' as const,
      impactAr: 'تغيير هذه المنطقة قد يؤثر على منطقة تابعة.'
    }))
  ];
}
