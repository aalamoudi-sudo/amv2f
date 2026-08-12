import { riskLevelConfig } from '../data/riskLevels';
import type { ZoneReadinessRecord } from '../types/spatial';

export interface ReadinessPriorityFactors {
  readinessGap: number;
  risk: number;
  dueDate: number;
  openingImpact: number;
  routeImpact: number;
  dependencyImpact: number;
  evidenceGap: number;
  confidenceGap: number;
  approvalGap: number;
  escalation: number;
}

export interface ReadinessPriorityResult {
  score: number;
  labelAr: 'عاجلة' | 'مرتفعة' | 'متوسطة' | 'منخفضة';
  factors: ReadinessPriorityFactors;
  explanationAr: string;
}

function dueDateWeight(record: ZoneReadinessRecord, now: Date): number {
  const dueAt = Date.parse(record.dueAt);
  if (!Number.isFinite(dueAt)) {
    return 10;
  }

  const hoursUntilDue = (dueAt - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue < 0) return 25;
  if (hoursUntilDue <= 48) return 16;
  if (hoursUntilDue <= 168) return 8;
  return 0;
}

function impactWeight(level: ZoneReadinessRecord['openingImpact']): number {
  return { none: 0, low: 4, medium: 12, high: 24 }[level];
}

function approvalWeight(record: ZoneReadinessRecord): number {
  return {
    draft: 7,
    submitted: 5,
    'under-review': 4,
    approved: 0,
    rejected: 10,
    expired: 12
  }[record.approvalStatus];
}

function escalationWeight(record: ZoneReadinessRecord): number {
  return { none: 0, watch: 4, elevated: 8, urgent: 14 }[record.escalationLevel];
}

export function calculateReadinessPriority(record: ZoneReadinessRecord, now = new Date()): ReadinessPriorityResult {
  const factors: ReadinessPriorityFactors = {
    readinessGap: Math.max(0, 90 - record.readiness) * 0.35,
    risk: riskLevelConfig[record.riskLevel].rank * 6,
    dueDate: dueDateWeight(record, now),
    openingImpact: impactWeight(record.openingImpact),
    routeImpact: impactWeight(record.operationalImpact.visitorRoutes),
    dependencyImpact: Math.min(16, record.dependencies.length * 8 + (record.operationalImpact.dependentAreas === 'high' ? 8 : 0)),
    evidenceGap: record.evidence.length === 0 ? 12 : record.evidence.some((evidence) => evidence.status !== 'verified') ? 6 : 0,
    confidenceGap: record.confidence === 'low' ? 10 : record.confidence === 'medium' ? 4 : 0,
    approvalGap: approvalWeight(record),
    escalation: escalationWeight(record)
  };
  const score = Math.round(
    (Object.keys(factors) as Array<keyof ReadinessPriorityFactors>).reduce((sum, key) => sum + factors[key], 0)
  );
  const labelAr = score >= 70 ? 'عاجلة' : score >= 45 ? 'مرتفعة' : score >= 25 ? 'متوسطة' : 'منخفضة';
  const explanationParts: string[] = [];

  if (factors.readinessGap >= 8) explanationParts.push('فجوة جاهزية واضحة');
  if (factors.dueDate >= 16) explanationParts.push(factors.dueDate >= 25 ? 'موعد الإجراء متأخر' : 'الموعد قريب');
  if (factors.openingImpact >= 12) explanationParts.push('أثر مباشر على الافتتاح');
  if (factors.routeImpact >= 12) explanationParts.push('تأثير على مسار الزائر');
  if (factors.dependencyImpact > 0) explanationParts.push('اعتماديات أو مناطق تابعة');
  if (factors.evidenceGap > 0) explanationParts.push('فجوة في الدليل');
  if (factors.confidenceGap > 0) explanationParts.push('ثقة منخفضة أو متوسطة');
  if (factors.escalation >= 8) explanationParts.push('مستوى تصعيد مرتفع');

  const explanationAr = explanationParts.length
    ? `أولوية ${labelAr} بسبب ${explanationParts.join('، ')}.`
    : `أولوية ${labelAr} ولا توجد إشارة تصعيد إضافية في السجل التجريبي.`;

  return { score, labelAr, factors, explanationAr };
}

export function prioritizeReadinessRecords(records: ZoneReadinessRecord[], now = new Date()) {
  return records
    .map((record) => ({ record, priority: calculateReadinessPriority(record, now) }))
    .sort((left, right) => right.priority.score - left.priority.score);
}
