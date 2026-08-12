import { statusConfig } from '../data/statuses';
import type { SpatialEntityRecord } from '../types/spatial';
import type { OperationalStatus } from '../types/status';

export interface StatusMetric {
  status: OperationalStatus;
  labelAr: string;
  count: number;
  color: string;
}

export function getStatusMetrics(entities: SpatialEntityRecord): StatusMetric[] {
  const counts = Object.values(entities).reduce<Record<OperationalStatus, number>>(
    (accumulator, entity) => {
      accumulator[entity.status] += 1;
      return accumulator;
    },
    {
      inactive: 0,
      preparing: 0,
      ready: 0,
      needsAttention: 0,
      delayed: 0,
      highRisk: 0,
      closed: 0,
      emergency: 0
    }
  );

  return Object.values(statusConfig).map((config) => ({
    status: config.value,
    labelAr: config.labelAr,
    count: counts[config.value],
    color: config.hexColor
  }));
}

export function getAverageReadiness(entities: SpatialEntityRecord): number {
  const entityList = Object.values(entities).filter((entity) => entity.type !== 'site');

  if (entityList.length === 0) {
    return 0;
  }

  return Math.round(entityList.reduce((sum, entity) => sum + entity.readiness, 0) / entityList.length);
}

export function getCriticalSignalCount(entities: SpatialEntityRecord): number {
  return Object.values(entities).filter(
    (entity) =>
      entity.status === 'emergency' ||
      entity.status === 'highRisk' ||
      entity.riskLevel === 'critical' ||
      entity.riskLevel === 'high'
  ).length;
}
