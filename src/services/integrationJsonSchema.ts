import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import adapterSchema from '../../schemas/integration/v1/adapter-manifest.schema.json';
import captureSchema from '../../schemas/integration/v1/capture-envelope.schema.json';
import evidenceSchema from '../../schemas/integration/v1/evidence-reference.schema.json';
import eventSchema from '../../schemas/integration/v1/operational-event.schema.json';
import physicalSchema from '../../schemas/integration/v1/physical-scene-command.schema.json';
import projectionSchema from '../../schemas/integration/v1/state-projection.schema.json';
import spatialSchema from '../../schemas/integration/v1/spatial-output-command.schema.json';
import validAdapter from '../../fixtures/integration/valid/adapter-manifest.json';
import validCapture from '../../fixtures/integration/valid/capture-envelope.json';
import validEvidence from '../../fixtures/integration/valid/evidence-reference.json';
import validEvent from '../../fixtures/integration/valid/operational-event.json';
import validPhysical from '../../fixtures/integration/valid/physical-scene-command.json';
import validProjection from '../../fixtures/integration/valid/state-projection.json';
import validSpatial from '../../fixtures/integration/valid/spatial-output-command.json';
import invalidAdapter from '../../fixtures/integration/invalid/adapter-manifest-vendor-bound.json';
import invalidCapture from '../../fixtures/integration/invalid/capture-envelope-missing-source.json';
import invalidEvidence from '../../fixtures/integration/invalid/evidence-reference-dangling.json';
import invalidEvent from '../../fixtures/integration/invalid/operational-event-unknown-entity.json';
import invalidPhysical from '../../fixtures/integration/invalid/physical-scene-command-mismatched.json';
import invalidProjection from '../../fixtures/integration/invalid/state-projection-unknown-context.json';
import invalidSpatial from '../../fixtures/integration/invalid/spatial-output-command-mismatched.json';
import type { ProjectionOutputBundle, ValidationIssue } from '../types/integration';
import type { SpatialEntityId } from '../types/spatial';
import {
  validateAdapterManifest,
  validateCaptureEnvelope,
  validateEvidenceReference,
  validateOperationalEvent,
  validatePhysicalSceneCommand,
  validateSpatialOutputCommand,
  validateStateProjection
} from './integrationValidation';

export type IntegrationSchemaName =
  | 'adapter-manifest'
  | 'capture-envelope'
  | 'evidence-reference'
  | 'operational-event'
  | 'physical-scene-command'
  | 'state-projection'
  | 'spatial-output-command';

const schemas: Record<IntegrationSchemaName, object> = {
  'adapter-manifest': adapterSchema,
  'capture-envelope': captureSchema,
  'evidence-reference': evidenceSchema,
  'operational-event': eventSchema,
  'physical-scene-command': physicalSchema,
  'state-projection': projectionSchema,
  'spatial-output-command': spatialSchema
};

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
const validators = new Map<IntegrationSchemaName, ValidateFunction>();
for (const [name, schema] of Object.entries(schemas) as Array<[IntegrationSchemaName, object]>) {
  validators.set(name, ajv.compile(schema));
}

export interface JsonSchemaValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export interface SchemaAlignmentCase {
  caseId: string;
  labelAr: string;
  schemaName: IntegrationSchemaName;
  expectedValid: boolean;
  schemaValid: boolean;
  runtimeValid: boolean;
  aligned: boolean;
}

export interface IntegrationSchemaValidationSummary {
  validator: 'Ajv 8 Draft 2020-12';
  schemasValidated: number;
  metaSchemasValid: number;
  validFixturesPassed: number;
  invalidFixturesRejected: number;
  runtimeObjectsPassed: number;
  driftIssues: ValidationIssue[];
  cases: SchemaAlignmentCase[];
}

export function validateWithIntegrationSchema(schemaName: IntegrationSchemaName, value: unknown): JsonSchemaValidationResult {
  const validator = validators.get(schemaName);
  if (!validator) throw new Error(`Unknown integration schema: ${schemaName}`);
  const valid = validator(value) === true;
  return { valid, errors: structuredClone(validator.errors ?? []) };
}

function runtimeIssues(schemaName: IntegrationSchemaName, value: unknown, knownEntityIds: ReadonlySet<SpatialEntityId>): ValidationIssue[] {
  if (schemaName === 'adapter-manifest') return validateAdapterManifest(value);
  if (schemaName === 'capture-envelope') return validateCaptureEnvelope(value);
  if (schemaName === 'evidence-reference') return validateEvidenceReference(value, knownEntityIds);
  if (schemaName === 'operational-event') return validateOperationalEvent(value, knownEntityIds);
  if (schemaName === 'physical-scene-command') return validatePhysicalSceneCommand(value);
  if (schemaName === 'state-projection') return validateStateProjection(value, knownEntityIds);
  return validateSpatialOutputCommand(value, knownEntityIds);
}

const validCases: Array<[IntegrationSchemaName, string, unknown]> = [
  ['adapter-manifest', 'تعريف موائم صالح', validAdapter],
  ['capture-envelope', 'غلاف التقاط صالح', validCapture],
  ['evidence-reference', 'مرجع دليل صالح', validEvidence],
  ['operational-event', 'حدث تشغيلي صالح', validEvent],
  ['physical-scene-command', 'أمر مادي صالح', validPhysical],
  ['state-projection', 'إسقاط صالح', validProjection],
  ['spatial-output-command', 'أمر مكاني صالح', validSpatial]
];

const invalidCases: Array<[IntegrationSchemaName, string, unknown]> = [
  ['adapter-manifest', 'تعريف موائم غير صالح', invalidAdapter],
  ['capture-envelope', 'غلاف التقاط غير صالح', invalidCapture],
  ['evidence-reference', 'مرجع دليل غير صالح', invalidEvidence],
  ['operational-event', 'حدث تشغيلي غير صالح', invalidEvent],
  ['physical-scene-command', 'أمر مادي غير صالح', invalidPhysical],
  ['state-projection', 'إسقاط غير صالح', invalidProjection],
  ['spatial-output-command', 'أمر مكاني غير صالح', invalidSpatial]
];

export function runIntegrationSchemaAlignment(
  knownEntityIds: ReadonlySet<SpatialEntityId>,
  runtimeBundle: ProjectionOutputBundle
): IntegrationSchemaValidationSummary {
  const cases: SchemaAlignmentCase[] = [];
  for (const [schemaName, labelAr, value] of [...validCases, ...invalidCases]) {
    const expectedValid = validCases.some((candidate) => candidate[1] === labelAr);
    const schemaValid = validateWithIntegrationSchema(schemaName, value).valid;
    const runtimeValid = !runtimeIssues(schemaName, value, knownEntityIds).some((currentIssue) => currentIssue.blocking);
    cases.push({ caseId: `${schemaName}-${expectedValid ? 'valid' : 'invalid'}`, labelAr, schemaName, expectedValid, schemaValid, runtimeValid, aligned: schemaValid === runtimeValid && schemaValid === expectedValid });
  }
  const runtimeObjects: Array<[IntegrationSchemaName, unknown]> = [
    ['state-projection', runtimeBundle.projection],
    ['spatial-output-command', runtimeBundle.spatial2d],
    ['spatial-output-command', runtimeBundle.spatial3d],
    ['spatial-output-command', runtimeBundle.geospatial],
    ['physical-scene-command', runtimeBundle.physical]
  ];
  const runtimeObjectsPassed = runtimeObjects.filter(([schemaName, value]) =>
    validateWithIntegrationSchema(schemaName, value).valid
    && !runtimeIssues(schemaName, value, knownEntityIds).some((currentIssue) => currentIssue.blocking)
  ).length;
  const driftIssues = cases.filter((currentCase) => !currentCase.aligned).map((currentCase) => ({
    code: 'schema-runtime-drift',
    path: currentCase.schemaName,
    messageAr: `يوجد اختلاف غير مقصود بين JSON Schema والمدقق التشغيلي في حالة ${currentCase.labelAr}.`,
    blocking: true
  }));
  const metaSchemasValid = Object.values(schemas).filter((schema) => ajv.validateSchema(schema)).length;
  return {
    validator: 'Ajv 8 Draft 2020-12',
    schemasValidated: Object.keys(schemas).length,
    metaSchemasValid,
    validFixturesPassed: cases.filter((currentCase) => currentCase.expectedValid && currentCase.aligned).length,
    invalidFixturesRejected: cases.filter((currentCase) => !currentCase.expectedValid && currentCase.aligned).length,
    runtimeObjectsPassed,
    driftIssues,
    cases
  };
}
