export const operationalStatusValues = [
  'inactive',
  'preparing',
  'ready',
  'needsAttention',
  'delayed',
  'highRisk',
  'closed',
  'emergency'
] as const;

export type OperationalStatus = (typeof operationalStatusValues)[number];

export function isOperationalStatus(value: unknown): value is OperationalStatus {
  return typeof value === 'string' && operationalStatusValues.includes(value as OperationalStatus);
}

export interface OperationalStatusConfig {
  value: OperationalStatus;
  labelAr: string;
  colorToken: string;
  hexColor: string;
  sceneColor: string;
  emissiveColor: string;
  borderClass: string;
  surfaceClass: string;
  textClass: string;
  legendDescriptionAr: string;
}

export const riskLevelValues = ['low', 'medium', 'high', 'critical'] as const;

export type RiskLevel = (typeof riskLevelValues)[number];

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && riskLevelValues.includes(value as RiskLevel);
}

export interface RiskLevelConfig {
  value: RiskLevel;
  labelAr: string;
  colorClass: string;
  rank: number;
}
