import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import deviceSchema from '../../schemas/integration/v1/iot-device-registry.schema.json' with { type: 'json' };
import observationSchema from '../../schemas/integration/v1/iot-observation.schema.json' with { type: 'json' };
import type { IoTDeviceRegistryRecord, IoTObservation } from '../types/iot';
import {
  validateIoTDeviceRegistryRecord,
  validateIoTObservation
} from './iotObservationValidation';
import type { SpatialEntityId } from '../types/spatial';

export type IoTSchemaName = 'iot-device-registry' | 'iot-observation';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
const schemas: Record<IoTSchemaName, object> = {
  'iot-device-registry': deviceSchema,
  'iot-observation': observationSchema
};
const validators = new Map<IoTSchemaName, ValidateFunction>();
for (const [name, schema] of Object.entries(schemas) as Array<[IoTSchemaName, object]>) {
  validators.set(name, ajv.compile(schema));
}

export interface IoTJsonSchemaResult {
  valid: boolean;
  errors: ErrorObject[];
}

export function validateWithIoTSchema(schemaName: IoTSchemaName, value: unknown): IoTJsonSchemaResult {
  const validator = validators.get(schemaName);
  if (!validator) return { valid: false, errors: [] };
  const valid = validator(value) === true;
  return { valid, errors: structuredClone(validator.errors ?? []) };
}

export function runIoTSchemaConformance(
  devices: IoTDeviceRegistryRecord[],
  observation: IoTObservation,
  knownEntityIds: ReadonlySet<SpatialEntityId>
): { validator: 'Ajv 8 Draft 2020-12'; schemas: 2; valid: boolean } {
  const device = devices.find((candidate) => candidate.deviceId === observation.deviceId);
  const schemasValid = Object.values(schemas).every((schema) => ajv.validateSchema(schema));
  const devicesValid = devices.every((candidate) =>
    validateWithIoTSchema('iot-device-registry', candidate).valid
    && !validateIoTDeviceRegistryRecord(candidate, knownEntityIds).some((issue) => issue.blocking)
  );
  const observationValid = validateWithIoTSchema('iot-observation', observation).valid
    && !validateIoTObservation(observation, device, knownEntityIds).some((issue) => issue.blocking);
  return {
    validator: 'Ajv 8 Draft 2020-12',
    schemas: 2,
    valid: schemasValid && devicesValid && observationValid
  };
}
