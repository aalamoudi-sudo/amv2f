import type { RiskLevel, RiskLevelConfig } from '../types/status';

export const riskLevelConfig: Record<RiskLevel, RiskLevelConfig> = {
  low: {
    value: 'low',
    labelAr: 'منخفض',
    colorClass: 'text-emerald-100 bg-emerald-400/15 border-emerald-300/50',
    rank: 1
  },
  medium: {
    value: 'medium',
    labelAr: 'متوسط',
    colorClass: 'text-amber-100 bg-amber-400/15 border-amber-300/60',
    rank: 2
  },
  high: {
    value: 'high',
    labelAr: 'مرتفع',
    colorClass: 'text-orange-100 bg-orange-400/15 border-orange-300/70',
    rank: 3
  },
  critical: {
    value: 'critical',
    labelAr: 'حرج',
    colorClass: 'text-rose-100 bg-rose-500/20 border-rose-300/80',
    rank: 4
  }
};
