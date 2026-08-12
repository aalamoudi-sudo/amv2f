import type { ZoneReadinessRecord } from '../types/spatial';
import { isExpiredReadinessRecord, getReadinessCompletenessPercentage } from './zoneReadinessValidation';

export interface ZoneReadinessMetrics {
  totalZones: number;
  readyZones: number;
  interventionZones: number;
  delayedZones: number;
  approvedZones: number;
  missingEvidenceZones: number;
  lowConfidenceZones: number;
  openingImpactZones: number;
  visitorRouteImpactZones: number;
  overdueActions: number;
  dataCompletenessPercentage: number;
  approvalCoveragePercentage: number;
}

function isOverdue(record: ZoneReadinessRecord, now: Date): boolean {
  const dueAt = Date.parse(record.dueAt);
  if (!Number.isFinite(dueAt) || dueAt >= now.getTime()) {
    return false;
  }

  return record.blockers.some((blocker) => blocker.status === 'open') || record.requiredAction.trim().length > 0;
}

export function getZoneReadinessMetrics(records: ZoneReadinessRecord[], now = new Date()): ZoneReadinessMetrics {
  const totalZones = records.length;
  const readyZones = records.filter((record) => record.readiness >= 90 && record.approvalStatus === 'approved').length;
  const interventionZones = records.filter(
    (record) => record.readiness < 90 || record.blockers.some((blocker) => blocker.status === 'open') || record.approvalStatus !== 'approved'
  ).length;
  const delayedZones = records.filter(
    (record) => record.status === 'delayed' || record.blockers.some((blocker) => blocker.status === 'open') || isExpiredReadinessRecord(record, now)
  ).length;
  const approvedZones = records.filter((record) => record.approvalStatus === 'approved').length;
  const missingEvidenceZones = records.filter((record) => record.evidence.length === 0).length;
  const lowConfidenceZones = records.filter((record) => record.confidence === 'low').length;
  const openingImpactZones = records.filter((record) => record.openingImpact === 'high' || record.openingImpact === 'medium').length;
  const visitorRouteImpactZones = records.filter(
    (record) => record.operationalImpact.visitorRoutes === 'high' || record.operationalImpact.visitorRoutes === 'medium'
  ).length;
  const overdueActions = records.filter((record) => isOverdue(record, now)).length;
  const dataCompletenessPercentage = totalZones
    ? Math.round(records.reduce((sum, record) => sum + getReadinessCompletenessPercentage(record), 0) / totalZones)
    : 0;
  const approvalCoveragePercentage = totalZones ? Math.round((approvedZones / totalZones) * 100) : 0;

  return {
    totalZones,
    readyZones,
    interventionZones,
    delayedZones,
    approvedZones,
    missingEvidenceZones,
    lowConfidenceZones,
    openingImpactZones,
    visitorRouteImpactZones,
    overdueActions,
    dataCompletenessPercentage,
    approvalCoveragePercentage
  };
}
