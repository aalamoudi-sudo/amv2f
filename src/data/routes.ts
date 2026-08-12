import type { RouteDefinition, RouteVisibility } from '../types/routes';

export const routeDefinitions: RouteDefinition[] = [
  {
    id: 'ROUTE-001',
    entityId: 'ROUTE-001',
    nameAr: 'مسار الزائر',
    nameEn: 'Visitor Route',
    type: 'visitor',
    descriptionAr: 'يربط البوابة الشرقية بالاستقبال والمعارض وساحة الفعاليات.',
    points: [
      [19.2, 0.32, 6.8],
      [12, 0.32, 6.8],
      [4.5, 0.32, 6.8],
      [-3, 0.32, 7],
      [-10.4, 0.32, 2.4],
      [-10.8, 0.32, -2]
    ],
    color: '#47d6b5',
    secondaryColor: '#a8f3df',
    width: 0.18,
    defaultVisible: true,
    relatedEntityIds: ['GATE-001', 'ZONE-001', 'ZONE-002', 'ZONE-004'],
    geometrySource: 'temporary-demo-route-points',
    authority: 'لم تحدد جهة اعتماد في بيانات العرض',
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    version: 'demo-v1'
  },
  {
    id: 'ROUTE-002',
    entityId: 'ROUTE-002',
    nameAr: 'مسار الإخلاء',
    nameEn: 'Evacuation Route',
    type: 'evacuation',
    descriptionAr: 'ينقل الجمهور من الساحة والقاعات إلى نقاط التجمع والبوابات الآمنة.',
    points: [
      [-10.5, 0.36, -2],
      [-14.8, 0.36, 3],
      [-17.2, 0.36, 12],
      [-3.4, 0.36, -8.7],
      [5.4, 0.36, -8.7],
      [11.8, 0.36, -13.2],
      [17.2, 0.36, -12]
    ],
    color: '#ff3b58',
    secondaryColor: '#ffc0ca',
    width: 0.22,
    defaultVisible: false,
    relatedEntityIds: ['ZONE-004', 'HALL-001', 'HALL-002', 'GATE-003', 'ASSEMBLY-001', 'ASSEMBLY-002'],
    geometrySource: 'temporary-demo-route-points',
    authority: 'لم تحدد جهة اعتماد في بيانات العرض',
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    version: 'demo-v1'
  },
  {
    id: 'ROUTE-003',
    entityId: 'ROUTE-003',
    nameAr: 'مسار الخدمات',
    nameEn: 'Service Route',
    type: 'service',
    descriptionAr: 'يربط مواقف التشغيل وممر الخدمات بمنطقة الخدمات الخلفية.',
    points: [
      [15, 0.4, 11.5],
      [15, 0.4, 6.8],
      [10.4, 0.4, -2.2],
      [15.3, 0.4, -8.6]
    ],
    color: '#e4b363',
    secondaryColor: '#f7dfab',
    width: 0.16,
    defaultVisible: false,
    relatedEntityIds: ['PARK-001', 'ZONE-005', 'SERVICE-001'],
    geometrySource: 'temporary-demo-route-points',
    authority: 'لم تحدد جهة اعتماد في بيانات العرض',
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    version: 'demo-v1'
  }
];

export function isKnownRouteId(value: unknown): value is RouteDefinition['id'] {
  return typeof value === 'string' && routeDefinitions.some((route) => route.id === value);
}

export function createDefaultRouteVisibility(): RouteVisibility {
  return routeDefinitions.reduce<RouteVisibility>((visibility, route) => {
    visibility[route.id] = route.defaultVisible;
    return visibility;
  }, {} as RouteVisibility);
}
