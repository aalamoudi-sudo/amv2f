import {
  iotDeviceClassValues,
  iotDeviceLifecycleValues,
  iotDeviceRegistrySchemaVersion,
  iotObservationSchemaVersion,
  iotQualityFlagValues,
  iotSourceTimeAuthorityValues,
  iotTransportValues,
  iotValueTypeValues,
  type IoTDeviceRegistryRecord,
  type IoTObservation,
  type IoTSpatialBinding,
  type IoTStreamDefinition
} from '../types/iot';
import type { ValidationIssue } from '../types/integration';
import { operationalStateContextValues, type SpatialEntityId } from '../types/spatial';
import { isSha256, sha256Payload } from './integrationHash';

function issue(code: string, path: string, messageAr: string, blocking = true): ValidationIssue {
  return { code, path, messageAr, blocking };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

const forbiddenCredentialKey = /password|secret|token|credential|authorization|api[-_]?key/i;

function validateRequiredString(record: Record<string, unknown>, field: string, path: string, issues: ValidationIssue[]) {
  if (!isNonEmptyString(record[field])) {
    issues.push(issue('iot-required-string', `${path}.${field}`, `الحقل ${field} مطلوب ويجب أن يكون نصاً غير فارغ.`));
  }
}

function validateIsoDate(record: Record<string, unknown>, field: string, path: string, issues: ValidationIssue[]) {
  if (!isIsoDate(record[field])) {
    issues.push(issue('iot-invalid-date', `${path}.${field}`, `الحقل ${field} يجب أن يحتوي تاريخاً صالحاً.`));
  }
}

function validateSpatialBinding(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  knownEntityIds?: ReadonlySet<SpatialEntityId>
): value is IoTSpatialBinding {
  if (!isRecord(value)) {
    issues.push(issue('iot-invalid-spatial-binding', path, 'الربط المكاني للجهاز أو القراءة مطلوب.'));
    return false;
  }
  validateRequiredString(value, 'bindingId', path, issues);
  validateRequiredString(value, 'entityId', path, issues);
  if (!isNullableString(value.zoneId)) issues.push(issue('iot-invalid-zone-id', `${path}.zoneId`, 'معرّف المنطقة يجب أن يكون نصاً أو قيمة فارغة صريحة.'));
  if (!['venue-local', 'model-local', 'geographic', 'unknown'].includes(String(value.coordinateReference))) {
    issues.push(issue('iot-invalid-coordinate-reference', `${path}.coordinateReference`, 'مرجع الإحداثيات للربط المكاني غير مدعوم.'));
  }
  if (!isNullableString(value.spatialReference)) {
    issues.push(issue('iot-invalid-spatial-reference', `${path}.spatialReference`, 'المرجع المكاني يجب أن يكون نصاً أو قيمة فارغة صريحة.'));
  }
  if (value.position !== null && (
    !Array.isArray(value.position)
    || value.position.length !== 3
    || value.position.some((coordinate) => typeof coordinate !== 'number' || !Number.isFinite(coordinate))
  )) {
    issues.push(issue('iot-invalid-position', `${path}.position`, 'موضع الجهاز يجب أن يكون ثلاث قيم رقمية أو قيمة فارغة صريحة.'));
  }
  if (!['unverified', 'verified'].includes(String(value.bindingStatus))) {
    issues.push(issue('iot-invalid-binding-status', `${path}.bindingStatus`, 'حالة الربط المكاني غير صالحة.'));
  }
  if (knownEntityIds && isNonEmptyString(value.entityId) && !knownEntityIds.has(value.entityId as SpatialEntityId)) {
    issues.push(issue('iot-unknown-entity', `${path}.entityId`, `العنصر ${value.entityId} غير موجود في السجل المكاني.`));
  }
  if (knownEntityIds && isNonEmptyString(value.zoneId) && !knownEntityIds.has(value.zoneId as SpatialEntityId)) {
    issues.push(issue('iot-unknown-zone', `${path}.zoneId`, `المنطقة ${value.zoneId} غير موجودة في السجل المكاني.`));
  }
  return true;
}

function validateStream(value: unknown, index: number, issues: ValidationIssue[]): value is IoTStreamDefinition {
  const path = `$.streams[${index}]`;
  if (!isRecord(value)) {
    issues.push(issue('iot-invalid-stream', path, 'تعريف قناة القياس يجب أن يكون كائناً منظماً.'));
    return false;
  }
  for (const field of ['streamId', 'nameAr', 'nameEn', 'measurementType']) validateRequiredString(value, field, path, issues);
  if (!iotValueTypeValues.includes(value.valueType as never)) {
    issues.push(issue('iot-invalid-value-type', `${path}.valueType`, 'نوع قيمة قناة القياس غير صالح.'));
  }
  if (!isNullableString(value.unit)) issues.push(issue('iot-invalid-unit', `${path}.unit`, 'وحدة القياس يجب أن تكون نصاً أو قيمة فارغة صريحة.'));
  for (const field of ['minimumValue', 'maximumValue']) {
    if (value[field] !== null && (typeof value[field] !== 'number' || !Number.isFinite(value[field]))) {
      issues.push(issue('iot-invalid-bound', `${path}.${field}`, 'حد القياس يجب أن يكون رقماً محدوداً أو قيمة فارغة صريحة.'));
    }
  }
  if (
    typeof value.minimumValue === 'number'
    && typeof value.maximumValue === 'number'
    && value.minimumValue > value.maximumValue
  ) {
    issues.push(issue('iot-reversed-bounds', path, 'الحد الأدنى لقناة القياس لا يجوز أن يتجاوز الحد الأعلى.'));
  }
  if (typeof value.freshnessThresholdSeconds !== 'number' || !Number.isFinite(value.freshnessThresholdSeconds) || value.freshnessThresholdSeconds <= 0) {
    issues.push(issue('iot-invalid-freshness-threshold', `${path}.freshnessThresholdSeconds`, 'حد حداثة القراءة يجب أن يكون رقماً موجباً.'));
  }
  if (typeof value.enabled !== 'boolean') issues.push(issue('iot-invalid-stream-enabled', `${path}.enabled`, 'حالة تفعيل قناة القياس يجب أن تكون منطقية.'));
  return true;
}

export function validateIoTDeviceRegistryRecord(
  value: unknown,
  knownEntityIds?: ReadonlySet<SpatialEntityId>
): ValidationIssue[] {
  try {
    if (!isRecord(value)) return [issue('iot-invalid-device-record', '$', 'سجل جهاز إنترنت الأشياء يجب أن يكون كائناً منظماً.')];
    const issues: ValidationIssue[] = [];
    if (value.schemaVersion !== iotDeviceRegistrySchemaVersion) {
      issues.push(issue('iot-unsupported-device-schema', '$.schemaVersion', 'إصدار عقد سجل الجهاز غير مدعوم.'));
    }
    for (const field of ['deviceId', 'venueId', 'nameAr', 'nameEn', 'sourceSystemId', 'adapterId', 'adapterVersion', 'mappingVersion']) {
      validateRequiredString(value, field, '$', issues);
    }
    if (!isNullableString(value.eventRef)) issues.push(issue('iot-invalid-event-ref', '$.eventRef', 'مرجع الفعالية يجب أن يكون نصاً أو قيمة فارغة صريحة.'));
    if (!iotDeviceClassValues.includes(value.deviceClass as never)) issues.push(issue('iot-invalid-device-class', '$.deviceClass', 'فئة جهاز إنترنت الأشياء غير مدعومة.'));
    if (!iotDeviceLifecycleValues.includes(value.lifecycleStatus as never)) issues.push(issue('iot-invalid-device-lifecycle', '$.lifecycleStatus', 'حالة دورة حياة الجهاز غير صالحة.'));
    if (!operationalStateContextValues.includes(value.stateContext as never)) {
      issues.push(issue('iot-invalid-state-context', '$.stateContext', 'سياق حالة الجهاز غير صالح.'));
    } else if (value.stateContext !== 'temporary-demo') {
      issues.push(issue('iot-live-context-forbidden', '$.stateContext', 'أساس IoT الحالي محلي وتجريبي فقط؛ لا يجوز تسجيله كخط أساس أو سيناريو تشغيلي.'));
    }
    if (value.identityAuthority !== 'local-simulator' && value.identityAuthority !== 'unknown') {
      issues.push(issue('iot-untrusted-identity-authority', '$.identityAuthority', 'هوية الإنتاج غير متاحة؛ السلطة المسموحة محلياً هي المحاكي أو مجهولة.'));
    }
    validateIsoDate(value, 'registeredAt', '$', issues);
    validateIsoDate(value, 'updatedAt', '$', issues);
    if (isIsoDate(value.registeredAt) && isIsoDate(value.updatedAt) && Date.parse(value.updatedAt) < Date.parse(value.registeredAt)) {
      issues.push(issue('iot-device-time-order', '$.updatedAt', 'وقت تحديث الجهاز لا يجوز أن يسبق وقت تسجيله.'));
    }
    validateSpatialBinding(value.spatialBinding, '$.spatialBinding', issues, knownEntityIds);
    if (!Array.isArray(value.streams) || value.streams.length === 0) {
      issues.push(issue('iot-streams-required', '$.streams', 'يجب تعريف قناة قياس واحدة على الأقل للجهاز.'));
    } else {
      const streamIds = new Set<string>();
      value.streams.forEach((stream, index) => {
        validateStream(stream, index, issues);
        if (isRecord(stream) && isNonEmptyString(stream.streamId)) {
          if (streamIds.has(stream.streamId)) issues.push(issue('iot-duplicate-stream', `$.streams[${index}].streamId`, `معرّف القناة ${stream.streamId} مكرر داخل الجهاز.`));
          streamIds.add(stream.streamId);
        }
      });
    }
    if (!isRecord(value.metadata)) {
      issues.push(issue('iot-invalid-metadata', '$.metadata', 'البيانات الوصفية للجهاز يجب أن تكون كائناً منظماً.'));
    } else {
      for (const [key, metadataValue] of Object.entries(value.metadata)) {
        if (forbiddenCredentialKey.test(key)) {
          issues.push(issue('iot-credential-material-forbidden', `$.metadata.${key}`, 'يُمنع تخزين كلمات المرور أو الأسرار أو الرموز أو مفاتيح الوصول داخل سجل الجهاز.'));
        }
        if (metadataValue !== null && !['string', 'number', 'boolean'].includes(typeof metadataValue)) {
          issues.push(issue('iot-invalid-metadata-value', `$.metadata.${key}`, 'قيمة البيانات الوصفية يجب أن تكون نصاً أو رقماً أو قيمة منطقية أو فارغة صريحة.'));
        }
      }
    }
    return issues;
  } catch {
    return [issue('iot-device-validation-failed', '$', 'تعذر التحقق من سجل الجهاز بأمان؛ لم يُقبل السجل.')];
  }
}

export function canonicalIoTObservationPayload(observation: IoTObservation): Record<string, unknown> {
  return {
    eventRef: observation.eventRef,
    venueId: observation.venueId,
    deviceId: observation.deviceId,
    streamId: observation.streamId,
    sourceSystemId: observation.sourceSystemId,
    sourceRecordId: observation.sourceRecordId,
    value: observation.value,
    valueType: observation.valueType,
    unit: observation.unit,
    sourceTimestamp: observation.sourceTimestamp,
    sequence: observation.sequence,
    offlineSequence: observation.offlineSequence,
    mappingVersion: observation.mappingVersion,
    spatialBinding: observation.spatialBinding
  };
}

export async function calculateIoTObservationPayloadHash(observation: IoTObservation): Promise<string> {
  return sha256Payload(canonicalIoTObservationPayload(observation));
}

export function validateIoTObservation(
  value: unknown,
  device?: IoTDeviceRegistryRecord,
  knownEntityIds?: ReadonlySet<SpatialEntityId>
): ValidationIssue[] {
  try {
    if (!isRecord(value)) return [issue('iot-invalid-observation', '$', 'قراءة إنترنت الأشياء يجب أن تكون كائناً منظماً.')];
    const issues: ValidationIssue[] = [];
    if (value.schemaVersion !== iotObservationSchemaVersion) {
      issues.push(issue('iot-unsupported-observation-schema', '$.schemaVersion', 'إصدار عقد قراءة IoT غير مدعوم.'));
    }
    for (const field of [
      'observationId', 'venueId', 'deviceId', 'streamId', 'sourceSystemId', 'sourceRecordId',
      'adapterId', 'adapterVersion', 'mappingVersion', 'idempotencyKey'
    ]) validateRequiredString(value, field, '$', issues);
    if (!isNullableString(value.eventRef)) issues.push(issue('iot-invalid-event-ref', '$.eventRef', 'مرجع الفعالية يجب أن يكون نصاً أو قيمة فارغة صريحة.'));
    if (!iotTransportValues.includes(value.transport as never)) issues.push(issue('iot-invalid-transport', '$.transport', 'طريقة نقل قراءة IoT غير مدعومة.'));
    if (!operationalStateContextValues.includes(value.stateContext as never)) {
      issues.push(issue('iot-invalid-state-context', '$.stateContext', 'سياق قراءة IoT غير صالح.'));
    } else if (value.stateContext !== 'temporary-demo') {
      issues.push(issue('iot-live-context-forbidden', '$.stateContext', 'قراءات IoT في هذه المرحلة محلية وتجريبية فقط ولا يجوز ترقيتها تشغيلياً.'));
    }
    if (!iotValueTypeValues.includes(value.valueType as never)) {
      issues.push(issue('iot-invalid-value-type', '$.valueType', 'نوع قيمة قراءة IoT غير صالح.'));
    } else if (!['number', 'string', 'boolean'].includes(typeof value.value) || typeof value.value !== value.valueType) {
      issues.push(issue('iot-value-type-mismatch', '$.value', 'قيمة القراءة لا تطابق نوع القيمة المعلن.'));
    } else if (typeof value.value === 'number' && !Number.isFinite(value.value)) {
      issues.push(issue('iot-non-finite-value', '$.value', 'القيمة الرقمية يجب أن تكون محدودة.'));
    }
    if (!isNullableString(value.unit)) issues.push(issue('iot-invalid-unit', '$.unit', 'وحدة القياس يجب أن تكون نصاً أو قيمة فارغة صريحة.'));
    validateIsoDate(value, 'sourceTimestamp', '$', issues);
    validateIsoDate(value, 'platformReceivedAt', '$', issues);
    if (!iotSourceTimeAuthorityValues.includes(value.sourceTimeAuthority as never)) {
      issues.push(issue('iot-invalid-time-authority', '$.sourceTimeAuthority', 'تصنيف سلطة وقت المصدر غير صالح.'));
    } else if (value.sourceTimeAuthority === 'platform-authoritative') {
      issues.push(issue('iot-authoritative-time-forbidden', '$.sourceTimeAuthority', 'لا توجد خدمة وقت سلطوية في المختبر المحلي؛ لا يجوز وصف وقت القراءة بأنه سلطوي.'));
    }
    if (!Number.isInteger(value.sequence) || Number(value.sequence) < 0) {
      issues.push(issue('iot-invalid-sequence', '$.sequence', 'تسلسل القراءة يجب أن يكون عدداً صحيحاً غير سالب.'));
    }
    if (value.offlineSequence !== null && (!Number.isInteger(value.offlineSequence) || Number(value.offlineSequence) < 1)) {
      issues.push(issue('iot-invalid-offline-sequence', '$.offlineSequence', 'تسلسل العمل دون اتصال يجب أن يكون عدداً صحيحاً موجباً أو قيمة فارغة صريحة.'));
    }
    if (typeof value.freshnessThresholdSeconds !== 'number' || !Number.isFinite(value.freshnessThresholdSeconds) || value.freshnessThresholdSeconds <= 0) {
      issues.push(issue('iot-invalid-freshness-threshold', '$.freshnessThresholdSeconds', 'حد حداثة القراءة يجب أن يكون رقماً موجباً.'));
    }
    const qualityFlags: unknown[] | null = Array.isArray(value.qualityFlags)
      ? value.qualityFlags as unknown[]
      : null;
    if (!qualityFlags || qualityFlags.length === 0) {
      issues.push(issue('iot-quality-flags-required', '$.qualityFlags', 'يجب توضيح جودة القراءة بعلامة واحدة على الأقل.'));
    } else {
      const invalidFlag: unknown = qualityFlags.find((flag: unknown) => !iotQualityFlagValues.includes(flag as never));
      if (invalidFlag !== undefined) {
        const invalidFlagLabel = typeof invalidFlag === 'string' ? invalidFlag : typeof invalidFlag;
        issues.push(issue('iot-invalid-quality-flag', '$.qualityFlags', `علامة الجودة ${invalidFlagLabel} غير مدعومة.`));
      }
      if (new Set(qualityFlags).size !== qualityFlags.length) issues.push(issue('iot-duplicate-quality-flag', '$.qualityFlags', 'علامات جودة القراءة تحتوي قيماً مكررة.'));
      if (qualityFlags.includes('good') && qualityFlags.some((flag) => flag !== 'good')) {
        issues.push(issue('iot-conflicting-quality-flags', '$.qualityFlags', 'لا يجوز جمع علامة الجودة الجيدة مع علامات التحفظ أو الخلل.'));
      }
    }
    validateSpatialBinding(value.spatialBinding, '$.spatialBinding', issues, knownEntityIds);
    if (!isSha256(value.payloadHash)) issues.push(issue('iot-invalid-payload-hash', '$.payloadHash', 'بصمة حمولة القراءة يجب أن تكون SHA-256 صالحة.'));

    if (isIsoDate(value.sourceTimestamp) && isIsoDate(value.platformReceivedAt)) {
      const ageSeconds = (Date.parse(value.platformReceivedAt) - Date.parse(value.sourceTimestamp)) / 1000;
      if (ageSeconds < 0 && qualityFlags && !qualityFlags.includes('clock-untrusted')) {
        issues.push(issue('iot-source-clock-ahead', '$.sourceTimestamp', 'وقت المصدر يتقدم على وقت المنصة ويجب وسم الساعة كغير موثوقة.'));
      }
      if (
        typeof value.freshnessThresholdSeconds === 'number'
        && Number.isFinite(value.freshnessThresholdSeconds)
        && ageSeconds > value.freshnessThresholdSeconds
        && qualityFlags
        && !qualityFlags.includes('stale')
      ) {
        issues.push(issue('iot-stale-reading-unmarked', '$.qualityFlags', 'القراءة تجاوزت حد الحداثة ويجب وسمها كقديمة.'));
      }
    }

    if (device) {
      const registryIssues = validateIoTDeviceRegistryRecord(device, knownEntityIds);
      if (registryIssues.some((candidate) => candidate.blocking)) {
        issues.push(issue('iot-device-registry-invalid', '$.deviceId', 'سجل الجهاز المرتبط غير صالح ولا يمكن قبول القراءة.'));
      }
      if (value.deviceId !== device.deviceId) issues.push(issue('iot-device-mismatch', '$.deviceId', 'معرّف الجهاز لا يطابق سجل الجهاز المحدد.'));
      if (value.eventRef !== device.eventRef || value.venueId !== device.venueId || value.stateContext !== device.stateContext) {
        issues.push(issue('iot-device-context-mismatch', '$', 'سياق الفعالية أو الموقع أو الحالة لا يطابق سجل الجهاز.'));
      }
      if (value.sourceSystemId !== device.sourceSystemId || value.adapterId !== device.adapterId || value.adapterVersion !== device.adapterVersion) {
        issues.push(issue('iot-source-adapter-mismatch', '$', 'المصدر أو Adapter للقراءة لا يطابق سجل الجهاز.'));
      }
      if (value.mappingVersion !== device.mappingVersion) issues.push(issue('iot-mapping-version-mismatch', '$.mappingVersion', 'إصدار الربط المكاني للقراءة لا يطابق سجل الجهاز.'));
      if (JSON.stringify(value.spatialBinding) !== JSON.stringify(device.spatialBinding)) {
        issues.push(issue('iot-spatial-binding-mismatch', '$.spatialBinding', 'نسخة الربط المكاني في القراءة لا تطابق سجل الجهاز.'));
      }
      const stream = device.streams.find((candidate) => candidate.streamId === value.streamId);
      if (!stream) {
        issues.push(issue('iot-unknown-stream', '$.streamId', 'قناة القياس غير معرفة في سجل الجهاز.'));
      } else {
        if (!stream.enabled) issues.push(issue('iot-disabled-stream', '$.streamId', 'قناة القياس معطلة في سجل الجهاز.'));
        if (value.valueType !== stream.valueType || (isNullableString(value.unit) && value.unit !== stream.unit)) {
          issues.push(issue('iot-stream-contract-mismatch', '$', 'نوع القيمة أو وحدتها لا يطابق عقد قناة القياس.'));
        }
        if (value.freshnessThresholdSeconds !== stream.freshnessThresholdSeconds) {
          issues.push(issue('iot-freshness-contract-mismatch', '$.freshnessThresholdSeconds', 'حد حداثة القراءة لا يطابق عقد القناة.'));
        }
        if (typeof value.value === 'number') {
          const outOfRange = (stream.minimumValue !== null && value.value < stream.minimumValue)
            || (stream.maximumValue !== null && value.value > stream.maximumValue);
          if (outOfRange && qualityFlags && !qualityFlags.includes('out-of-range')) {
            issues.push(issue('iot-out-of-range-unmarked', '$.qualityFlags', 'القيمة خارج حدود القناة ويجب وسمها بذلك قبل قبولها.'));
          }
        }
      }
    }
    return issues;
  } catch {
    return [issue('iot-observation-validation-failed', '$', 'تعذر التحقق من قراءة IoT بأمان؛ لم تُقبل القراءة.')];
  }
}

export async function validateIoTObservationIntegrity(
  observation: IoTObservation,
  device?: IoTDeviceRegistryRecord,
  knownEntityIds?: ReadonlySet<SpatialEntityId>
): Promise<ValidationIssue[]> {
  const issues = validateIoTObservation(observation, device, knownEntityIds);
  if (issues.some((candidate) => candidate.blocking)) return issues;
  try {
    const calculatedHash = await calculateIoTObservationPayloadHash(observation);
    if (calculatedHash !== observation.payloadHash) {
      issues.push(issue('iot-payload-hash-mismatch', '$.payloadHash', 'بصمة حمولة القراءة لا تطابق محتواها القانوني.'));
    }
  } catch {
    issues.push(issue('iot-payload-hash-failed', '$.payloadHash', 'تعذر حساب بصمة حمولة القراءة بأمان.'));
  }
  return issues;
}
