import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import digitalRehearsalPlanSchema from '../../schemas/digital-rehearsal/v1/digital-rehearsal-plan.schema.json';
import digitalRehearsalRunSchema from '../../schemas/digital-rehearsal/v1/digital-rehearsal-run.schema.json';
import eventDayPlanSchema from '../../schemas/digital-rehearsal/v1/event-day-plan.schema.json';
import programMomentCueSchema from '../../schemas/digital-rehearsal/v1/program-moment-cue.schema.json';
import contingencyBranchSchema from '../../schemas/digital-rehearsal/v1/contingency-branch.schema.json';
import dailyLearningRecordSchema from '../../schemas/digital-rehearsal/v1/daily-learning-record.schema.json';
import rehearsalProjectionExportSchema from '../../schemas/digital-rehearsal/v1/rehearsal-projection-export.schema.json';
import type { RehearsalValidationIssue } from '../types/digitalRehearsal';

export type DigitalRehearsalSchemaName =
  | 'digital-rehearsal-plan'
  | 'digital-rehearsal-run'
  | 'event-day-plan'
  | 'program-moment-cue'
  | 'contingency-branch'
  | 'daily-learning-record'
  | 'rehearsal-projection-export';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });

const validators: Record<DigitalRehearsalSchemaName, ValidateFunction> = {
  'digital-rehearsal-plan': ajv.compile(digitalRehearsalPlanSchema),
  'digital-rehearsal-run': ajv.compile(digitalRehearsalRunSchema),
  'event-day-plan': ajv.compile(eventDayPlanSchema),
  'program-moment-cue': ajv.compile(programMomentCueSchema),
  'contingency-branch': ajv.compile(contingencyBranchSchema),
  'daily-learning-record': ajv.compile(dailyLearningRecordSchema),
  'rehearsal-projection-export': ajv.compile(rehearsalProjectionExportSchema)
};

function issueFromAjv(error: ErrorObject): RehearsalValidationIssue {
  const path = error.instancePath || '/';
  return {
    code: `rehearsal-schema-${error.keyword}`,
    path,
    severity: 'blocking',
    messageAr: `بنية سجل البروفة غير مكتملة أو غير صالحة عند ${path}.`
  };
}

export function validateDigitalRehearsalSchema(
  schemaName: DigitalRehearsalSchemaName,
  value: unknown
): { valid: boolean; issues: RehearsalValidationIssue[] } {
  try {
    const validator = validators[schemaName];
    const valid = validator(value);
    return { valid: Boolean(valid), issues: valid ? [] : (validator.errors ?? []).map(issueFromAjv) };
  } catch {
    return {
      valid: false,
      issues: [{
        code: 'rehearsal-schema-validation-failed-safe',
        path: '/',
        severity: 'blocking',
        messageAr: 'تعذر التحقق من سجل البروفة بأمان، لذلك حُجب السجل دون تغيير أي حقيقة تشغيلية.'
      }]
    };
  }
}
