import type { DecisionId } from '../types/decision';

export const validationInterfaceModeValues = ['list', '2d', '3d', 'hybrid'] as const;
export type ValidationInterfaceMode = (typeof validationInterfaceModeValues)[number];

export interface OperationalValidationResult {
  resultId: string;
  participantId: string;
  decisionCaseId: DecisionId;
  interfaceMode: ValidationInterfaceMode;
  startedAt: string;
  stoppedAt: string;
  durationSeconds: number;
  selectedDecisionId: DecisionId;
  identifiedOwner: string;
  identifiedAction: string;
  evidenceGapDetected: boolean;
  authorityGapDetected: boolean;
  confidence: number;
  criticalErrors: number;
  facilitatorScore: number;
  notes: string;
}

const resultHeaders: Array<keyof OperationalValidationResult> = [
  'resultId',
  'participantId',
  'decisionCaseId',
  'interfaceMode',
  'startedAt',
  'stoppedAt',
  'durationSeconds',
  'selectedDecisionId',
  'identifiedOwner',
  'identifiedAction',
  'evidenceGapDetected',
  'authorityGapDetected',
  'confidence',
  'criticalErrors',
  'facilitatorScore',
  'notes'
];

function csvEscape(value: unknown): string {
  const stringValue = value === null || value === undefined
    ? ''
    : typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function serializeValidationResults(results: OperationalValidationResult[], format: 'csv' | 'json'): string {
  if (format === 'json') return JSON.stringify({ results }, null, 2);
  return [
    resultHeaders.join(','),
    ...results.map((result) => resultHeaders.map((header) => csvEscape(result[header])).join(','))
  ].join('\n');
}
