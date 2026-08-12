import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import operationalManifestSchema from '../../schemas/experience-delivery/v1/operational-delivery-manifest.schema.json';
import studioManifestSchema from '../../schemas/experience-delivery/v1/studio-3d-delivery-manifest.schema.json';
import type { ExperienceDeliveryValidationIssue } from '../types/experienceDelivery';

export type ExperienceDeliverySchemaName = 'operational-delivery-manifest' | 'studio-3d-delivery-manifest';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });

const validators: Record<ExperienceDeliverySchemaName, ValidateFunction> = {
  'operational-delivery-manifest': ajv.compile(operationalManifestSchema),
  'studio-3d-delivery-manifest': ajv.compile(studioManifestSchema)
};

function issueFromAjv(error: ErrorObject, affectedFile: string | null): ExperienceDeliveryValidationIssue {
  const field = error.instancePath || '/';
  return {
    code: `experience-delivery-schema-${error.keyword}`,
    path: field,
    messageAr: `بنية بيان التسليم غير مكتملة أو غير صالحة عند ${field}.`,
    severity: 'blocking',
    affectedFile,
    affectedField: field,
    blocking: true,
    recommendedActionAr: 'صحح الحقل في بيان التسليم ثم أعد المعاينة؛ لم يتغير توأم التجربة.',
    safeTechnicalDetail: `schema:${error.keyword}`
  };
}

export function validateExperienceDeliverySchema(
  schemaName: ExperienceDeliverySchemaName,
  value: unknown,
  affectedFile: string | null = null
): { valid: boolean; issues: readonly ExperienceDeliveryValidationIssue[] } {
  try {
    const validator = validators[schemaName];
    const valid = validator(value);
    return {
      valid: Boolean(valid),
      issues: valid ? [] : (validator.errors ?? []).map((error) => issueFromAjv(error, affectedFile))
    };
  } catch {
    return {
      valid: false,
      issues: [{
        code: 'experience-delivery-schema-failed-safe',
        path: '/',
        messageAr: 'تعذر التحقق من بنية بيان التسليم بأمان؛ نُقلت المعاينة إلى حالة الحجب.',
        severity: 'blocking',
        affectedFile,
        affectedField: '/',
        blocking: true,
        recommendedActionAr: 'أعد إنشاء البيان من القالب المعتمد ولا تقبل المصدر الحالي.',
        safeTechnicalDetail: 'schema-validation-failed-safe'
      }]
    };
  }
}
