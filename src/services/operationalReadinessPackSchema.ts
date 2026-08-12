import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import operationalReadinessPackSchema from '../../schemas/readiness-pack/v1/operational-readiness-pack.schema.json';
import sourceTraceRegisterSchema from '../../schemas/readiness-pack/v1/source-trace-register.schema.json';
import authorityMatrixSchema from '../../schemas/readiness-pack/v1/authority-matrix.schema.json';
import gapRegisterSchema from '../../schemas/readiness-pack/v1/gap-register.schema.json';
import evidenceContractSchema from '../../schemas/readiness-pack/v1/evidence-contract.schema.json';
import type { OperationalReadinessPack } from '../types/operationalReadinessPack';

export type ReadinessPackManifestKind =
  | 'operational-readiness-pack'
  | 'source-trace-register'
  | 'authority-matrix'
  | 'gap-register'
  | 'evidence-contract';

export interface ReadinessPackSchemaValidationResult {
  valid: boolean;
  errors: Array<{
    instancePath: string;
    keyword: string;
    message: string;
  }>;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
  validateFormats: false
});

const validators: Record<ReadinessPackManifestKind, ValidateFunction> = {
  'operational-readiness-pack': ajv.compile(operationalReadinessPackSchema),
  'source-trace-register': ajv.compile(sourceTraceRegisterSchema),
  'authority-matrix': ajv.compile(authorityMatrixSchema),
  'gap-register': ajv.compile(gapRegisterSchema),
  'evidence-contract': ajv.compile(evidenceContractSchema)
};

function normalizeErrors(errors: ErrorObject[] | null | undefined): ReadinessPackSchemaValidationResult['errors'] {
  return (errors ?? []).map((error) => ({
    instancePath: error.instancePath || '$',
    keyword: error.keyword,
    message: error.message ?? 'schema-validation-failed'
  }));
}

export function validateReadinessPackManifest(
  kind: ReadinessPackManifestKind,
  value: unknown
): ReadinessPackSchemaValidationResult {
  const validator = validators[kind];
  const valid = validator(value);
  return {
    valid: Boolean(valid),
    errors: valid ? [] : normalizeErrors(validator.errors)
  };
}

export function isOperationalReadinessPackManifest(
  value: unknown
): value is OperationalReadinessPack {
  return validateReadinessPackManifest('operational-readiness-pack', value).valid;
}
