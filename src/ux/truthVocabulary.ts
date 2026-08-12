import type { OperationalStateContext } from '../types/spatial';

export type TruthLabel =
  | 'candidate'
  | 'temporary-demo'
  | 'baseline'
  | 'scenario'
  | 'reported'
  | 'verified'
  | 'quarantined'
  | 'unknown'
  | 'disconnected'
  | 'unapproved';

export const truthLabels: Record<TruthLabel, string> = {
  candidate: 'مرشح',
  'temporary-demo': 'بيانات تجريبية مؤقتة',
  baseline: 'حالة أساسية',
  scenario: 'سيناريو',
  reported: 'مُبلّغ',
  verified: 'متحقق',
  quarantined: 'محجور',
  unknown: 'غير معروف',
  disconnected: 'غير متصل',
  unapproved: 'غير معتمد'
};

export const truthTone: Record<TruthLabel, string> = {
  candidate: 'truth-candidate',
  'temporary-demo': 'truth-demo',
  baseline: 'truth-baseline',
  scenario: 'truth-scenario',
  reported: 'truth-reported',
  verified: 'truth-verified',
  quarantined: 'truth-quarantined',
  unknown: 'truth-unknown',
  disconnected: 'truth-disconnected',
  unapproved: 'truth-unapproved'
};

export function truthLabelForStateContext(context: OperationalStateContext): TruthLabel {
  if (context === 'temporary-demo') return 'temporary-demo';
  if (context === 'scenario') return 'scenario';
  return 'baseline';
}
