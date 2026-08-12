import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import { operationalStateContextValues } from '../../src/types/spatial';
import type { GatewayObservationInput } from './types';

const sourceCaptureSchema = {
  $id: 'https://schemas.mayadeen.local/iot-gateway/v1/source-capture.json',
  type: 'object',
  additionalProperties: false,
  required: [
    'deviceId',
    'streamId',
    'sourceRecordId',
    'idempotencyKey',
    'eventRef',
    'venueId',
    'value',
    'valueType',
    'unit',
    'sourceTimestamp',
    'sequence',
    'stateContext'
  ],
  properties: {
    deviceId: { type: 'string', minLength: 1, maxLength: 160 },
    streamId: { type: 'string', minLength: 1, maxLength: 160 },
    sourceRecordId: { type: 'string', minLength: 1, maxLength: 240 },
    idempotencyKey: { type: 'string', minLength: 1, maxLength: 240 },
    eventRef: { type: ['string', 'null'], minLength: 1, maxLength: 160 },
    venueId: { type: 'string', minLength: 1, maxLength: 160 },
    value: { type: ['number', 'string', 'boolean'] },
    valueType: { enum: ['number', 'string', 'boolean'] },
    unit: { type: ['string', 'null'], minLength: 1, maxLength: 48 },
    sourceTimestamp: { type: 'string', minLength: 20, maxLength: 48 },
    sequence: { type: 'integer', minimum: 0 },
    offlineSequence: { type: ['integer', 'null'], minimum: 1 },
    stateContext: { enum: operationalStateContextValues }
  },
  allOf: [
    {
      if: { properties: { valueType: { const: 'number' } }, required: ['valueType'] },
      then: { properties: { value: { type: 'number' } } }
    },
    {
      if: { properties: { valueType: { const: 'string' } }, required: ['valueType'] },
      then: { properties: { value: { type: 'string' } } }
    },
    {
      if: { properties: { valueType: { const: 'boolean' } }, required: ['valueType'] },
      then: { properties: { value: { type: 'boolean' } } }
    }
  ]
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
const validate = ajv.compile(sourceCaptureSchema);

export interface SourceCaptureValidation {
  valid: boolean;
  value: GatewayObservationInput | null;
  errors: ErrorObject[];
}

export function validateSourceCapture(value: unknown): SourceCaptureValidation {
  const schemaValid = validate(value);
  if (!schemaValid || !isCaptureTimestamp(value)) {
    return {
      valid: false,
      value: null,
      errors: structuredClone(validate.errors ?? [])
    };
  }
  return { valid: true, value: structuredClone(value), errors: [] };
}

function isCaptureTimestamp(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const timestamp = (value as Record<string, unknown>).sourceTimestamp;
  return typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp));
}
