import type { DecisionPriorityLabel, DecisionRecord } from '../types/decision';

export const DECISION_PRIORITY_MODEL_VERSION = '3C.1-1.0';
export const OPERATIONAL_PRIORITY_THEORETICAL_MAX = 100;
export const DATA_QUALITY_ATTENTION_THEORETICAL_MAX = 100;

export interface OperationalPriorityFactors {
  urgency: number;
  operationalImpact: number;
  safetyImpact: number;
  visitorImpact: number;
  scheduleImpact: number;
  dependencyImpact: number;
  dueDatePressure: number;
}

export interface DataQualityAttentionFactors {
  confidenceGap: number;
  evidenceGap: number;
  approvalGap: number;
  sourceQualityGap: number;
  ownershipAuthorityGap: number;
}

export interface DecisionPriorityFactorBreakdown {
  key: keyof OperationalPriorityFactors | keyof DataQualityAttentionFactors;
  labelAr: string;
  points: number;
  category: 'operational-priority' | 'data-quality-attention';
}

export interface DecisionPriorityDiagnostics {
  operationalRawScore: number;
  dataQualityRawScore: number;
  operationalTheoreticalMaximum: number;
  dataQualityTheoreticalMaximum: number;
}

export interface DecisionPriorityResult {
  operationalPriorityScore: number;
  operationalPriorityLabelAr: DecisionPriorityLabel;
  dataQualityAttentionScore: number;
  dataQualityAttentionLabelAr: 'عناية عاجلة' | 'عناية مرتفعة' | 'عناية متوسطة' | 'عناية منخفضة';
  operationalFactors: OperationalPriorityFactors;
  dataQualityFactors: DataQualityAttentionFactors;
  operationalFactorBreakdown: DecisionPriorityFactorBreakdown[];
  dataQualityFactorBreakdown: DecisionPriorityFactorBreakdown[];
  strongestOperationalFactors: DecisionPriorityFactorBreakdown[];
  strongestDataQualityFactors: DecisionPriorityFactorBreakdown[];
  operationalExplanationAr: string;
  dataQualityExplanationAr: string;
  modelVersion: string;
  diagnostics: DecisionPriorityDiagnostics;
}

const urgencyWeight = { low: 0, medium: 7, high: 14, critical: 20 } as const;
const impactWeight15 = { none: 0, low: 4, medium: 9, high: 15 } as const;
const impactWeight20 = { none: 0, low: 5, medium: 12, high: 20 } as const;
const impactWeight10 = { none: 0, low: 3, medium: 6, high: 10 } as const;

const operationalMetadata: Record<keyof OperationalPriorityFactors, string> = {
  urgency: 'الاستعجال',
  operationalImpact: 'الأثر التشغيلي',
  safetyImpact: 'أثر السلامة',
  visitorImpact: 'أثر الزائر',
  scheduleImpact: 'أثر الجدول',
  dependencyImpact: 'أثر الاعتماديات',
  dueDatePressure: 'ضغط الموعد'
};

const dataQualityMetadata: Record<keyof DataQualityAttentionFactors, string> = {
  confidenceGap: 'فجوة الثقة',
  evidenceGap: 'فجوة الدليل',
  approvalGap: 'فجوة الاعتماد',
  sourceQualityGap: 'جودة المصدر',
  ownershipAuthorityGap: 'فجوة الملكية أو السلطة'
};

function getDueDatePressure(record: DecisionRecord, now: Date): number {
  const dueAt = Date.parse(record.dueAt);
  if (!Number.isFinite(dueAt) || dueAt < now.getTime()) return 15;
  if (dueAt - now.getTime() <= 48 * 60 * 60 * 1000) return 10;
  if (dueAt - now.getTime() <= 7 * 24 * 60 * 60 * 1000) return 5;
  return 0;
}

function operationalLabel(score: number): DecisionPriorityLabel {
  if (score >= 75) return 'عاجلة';
  if (score >= 55) return 'مرتفعة';
  if (score >= 30) return 'متوسطة';
  return 'منخفضة';
}

function dataQualityLabel(score: number): DecisionPriorityResult['dataQualityAttentionLabelAr'] {
  if (score >= 75) return 'عناية عاجلة';
  if (score >= 50) return 'عناية مرتفعة';
  if (score >= 25) return 'عناية متوسطة';
  return 'عناية منخفضة';
}

function operationalFactors(record: DecisionRecord, now: Date): OperationalPriorityFactors {
  if (record.status === 'closed') {
    return {
      urgency: 0,
      operationalImpact: 0,
      safetyImpact: 0,
      visitorImpact: 0,
      scheduleImpact: 0,
      dependencyImpact: 0,
      dueDatePressure: 0
    };
  }
  return {
    urgency: urgencyWeight[record.urgency],
    operationalImpact: impactWeight15[record.expectedImpact.level],
    safetyImpact: impactWeight20[record.expectedImpact.dimensions.safety ?? 'none'],
    visitorImpact: impactWeight10[record.expectedImpact.dimensions.visitor ?? 'none'],
    scheduleImpact: impactWeight10[record.expectedImpact.dimensions.schedule ?? 'none'],
    dependencyImpact: impactWeight10[record.expectedImpact.dimensions.dependency ?? 'none'],
    dueDatePressure: getDueDatePressure(record, now)
  };
}

function dataQualityFactors(record: DecisionRecord): DataQualityAttentionFactors {
  const confidenceGap = record.confidence === 'low' ? 25 : record.confidence === 'medium' ? 10 : 0;
  const evidenceGap = record.evidence.length === 0
    ? 30
    : record.evidence.some((item) => item.status !== 'verified')
      ? 15
      : 0;
  const approvalGap = record.approvalStatus === 'approved'
    ? 0
    : record.approvalStatus === 'under-review'
      ? 10
      : 20;
  const sourceQualityGap: Record<DecisionRecord['sourceType'], number> = {
    'temporary-demo': 15,
    exercise: 12,
    'manual-update': 8,
    'field-check': 4,
    'approved-plan': 0
  };
  const ownershipAuthorityGap =
    (record.decisionOwner.trim() ? 0 : 4) +
    (record.responsibleParty.trim() ? 0 : 3) +
    (record.approvingAuthority.trim() ? 0 : 3);
  return {
    confidenceGap,
    evidenceGap,
    approvalGap,
    sourceQualityGap: sourceQualityGap[record.sourceType],
    ownershipAuthorityGap
  };
}

function breakdown<K extends string>(
  factors: Record<K, number>,
  labels: Record<K, string>,
  category: DecisionPriorityFactorBreakdown['category']
): DecisionPriorityFactorBreakdown[] {
  return (Object.keys(factors) as K[]).map((key) => ({
    key: key as DecisionPriorityFactorBreakdown['key'],
    labelAr: labels[key],
    points: factors[key],
    category
  }));
}

function strongest(factors: DecisionPriorityFactorBreakdown[]): DecisionPriorityFactorBreakdown[] {
  return factors
    .filter((factor) => factor.points > 0)
    .sort((left, right) => right.points - left.points || left.labelAr.localeCompare(right.labelAr, 'ar'))
    .slice(0, 4);
}

export function calculateDecisionPriority(record: DecisionRecord, now = new Date()): DecisionPriorityResult {
  const operational = operationalFactors(record, now);
  const dataQuality = dataQualityFactors(record);
  const operationalRawScore =
    operational.urgency +
    operational.operationalImpact +
    operational.safetyImpact +
    operational.visitorImpact +
    operational.scheduleImpact +
    operational.dependencyImpact +
    operational.dueDatePressure;
  const dataQualityRawScore =
    dataQuality.confidenceGap +
    dataQuality.evidenceGap +
    dataQuality.approvalGap +
    dataQuality.sourceQualityGap +
    dataQuality.ownershipAuthorityGap;
  const operationalPriorityScore = Math.min(100, Math.max(0, Math.round(
    (operationalRawScore / OPERATIONAL_PRIORITY_THEORETICAL_MAX) * 100
  )));
  const dataQualityAttentionScore = Math.min(100, Math.max(0, Math.round(
    (dataQualityRawScore / DATA_QUALITY_ATTENTION_THEORETICAL_MAX) * 100
  )));
  const operationalFactorBreakdown = breakdown(operational, operationalMetadata, 'operational-priority');
  const dataQualityFactorBreakdown = breakdown(dataQuality, dataQualityMetadata, 'data-quality-attention');
  const strongestOperationalFactors = strongest(operationalFactorBreakdown);
  const strongestDataQualityFactors = strongest(dataQualityFactorBreakdown);
  const operationalPriorityLabelAr = operationalLabel(operationalPriorityScore);
  const dataQualityAttentionLabelAr = dataQualityLabel(dataQualityAttentionScore);

  return {
    operationalPriorityScore,
    operationalPriorityLabelAr,
    dataQualityAttentionScore,
    dataQualityAttentionLabelAr,
    operationalFactors: operational,
    dataQualityFactors: dataQuality,
    operationalFactorBreakdown,
    dataQualityFactorBreakdown,
    strongestOperationalFactors,
    strongestDataQualityFactors,
    operationalExplanationAr: strongestOperationalFactors.length
      ? `الأولوية التشغيلية ${operationalPriorityLabelAr} بسبب ${strongestOperationalFactors.map((factor) => factor.labelAr).join('، ')}.`
      : 'لا توجد حالياً عوامل تشغيلية ترفع أولوية هذا القرار.',
    dataQualityExplanationAr: strongestDataQualityFactors.length
      ? `${dataQualityAttentionLabelAr} بسبب ${strongestDataQualityFactors.map((factor) => factor.labelAr).join('، ')}. هذه الفجوات لا تعني أثراً تشغيلياً أعلى.`
      : 'عقد البيانات مكتمل بدرجة عالية ولا يرفع ترتيب الأثر التشغيلي.',
    modelVersion: DECISION_PRIORITY_MODEL_VERSION,
    diagnostics: {
      operationalRawScore,
      dataQualityRawScore,
      operationalTheoreticalMaximum: OPERATIONAL_PRIORITY_THEORETICAL_MAX,
      dataQualityTheoreticalMaximum: DATA_QUALITY_ATTENTION_THEORETICAL_MAX
    }
  };
}

export function prioritizeDecisions(records: DecisionRecord[], now = new Date()) {
  return records
    .map((record) => ({ record, priority: calculateDecisionPriority(record, now) }))
    .sort((left, right) =>
      right.priority.operationalPriorityScore - left.priority.operationalPriorityScore ||
      Date.parse(left.record.dueAt) - Date.parse(right.record.dueAt) ||
      right.priority.dataQualityAttentionScore - left.priority.dataQualityAttentionScore ||
      left.record.decisionId.localeCompare(right.record.decisionId, 'en', { numeric: true })
    );
}
