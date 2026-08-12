import type { DecisionRecord } from '../types/decision';

export interface DecisionTrustResult {
  score: number;
  labelAr: 'ثقة عالية' | 'ثقة متوسطة' | 'ثقة منخفضة';
  sourceQuality: number;
  evidenceCompleteness: number;
  approvalCompleteness: number;
  factorsAr: string[];
}

const sourceQuality: Record<DecisionRecord['sourceType'], number> = {
  'temporary-demo': 25,
  exercise: 45,
  'manual-update': 55,
  'approved-plan': 75,
  'field-check': 85
};

export function calculateDecisionTrust(record: DecisionRecord): DecisionTrustResult {
  const evidenceCompleteness = record.evidence.length === 0 ? 0 : record.evidence.every((item) => item.status === 'verified') ? 100 : 60;
  const approvalCompleteness = record.approvalStatus === 'approved' && record.approvedBy && record.approvedAt ? 100 : 25;
  const ownerCompleteness = record.decisionOwner && record.responsibleParty ? 100 : 0;
  const confidenceWeight = record.confidence === 'high' ? 100 : record.confidence === 'medium' ? 60 : 25;
  const calculatedScore = Math.round(
    sourceQuality[record.sourceType] * 0.25 +
      evidenceCompleteness * 0.3 +
      approvalCompleteness * 0.2 +
      ownerCompleteness * 0.15 +
      confidenceWeight * 0.1
  );
  const score = record.confidence === 'low' ? Math.min(49, calculatedScore) : calculatedScore;
  const labelAr = record.confidence === 'low' ? 'ثقة منخفضة' : score >= 75 ? 'ثقة عالية' : score >= 50 ? 'ثقة متوسطة' : 'ثقة منخفضة';
  const factorsAr = [
    `جودة المصدر ${sourceQuality[record.sourceType]}%`,
    `اكتمال الدليل ${evidenceCompleteness}%`,
    `اكتمال الاعتماد ${approvalCompleteness}%`,
    ownerCompleteness ? 'الملكية والمسؤولية محددتان' : 'الملكية أو المسؤولية ناقصة',
    `الثقة المدخلة ${record.confidence === 'high' ? 'عالية' : record.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}`
  ];

  return { score, labelAr, sourceQuality: sourceQuality[record.sourceType], evidenceCompleteness, approvalCompleteness, factorsAr };
}
