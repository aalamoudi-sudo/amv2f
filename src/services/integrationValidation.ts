import {
  adapterManifestSchemaVersion,
  assertionStateValues,
  captureSchemaVersion,
  confidenceLevelValues,
  evidenceSchemaVersion,
  evidenceTypeValues,
  evidenceVerificationStatusValues,
  inputAdapterTypeValues,
  operationalEventSchemaVersion,
  operationalEventTypeValues,
  outputAdapterTypeValues,
  physicalSceneCommandSchemaVersion,
  requirementOutcomeValues,
  spatialOutputCommandSchemaVersion,
  stateProjectionSchemaVersion,
  validationDispositionValues,
  type AdapterManifest,
  type CaptureEnvelope,
  type CanonicalEvidenceReference,
  type OperationalEvent,
  type PhysicalSceneCommand,
  type SpatialOutputCommand,
  type StateProjection,
  type ValidationIssue
} from '../types/integration';
import { operationalStateContextValues, type SpatialEntityId } from '../types/spatial';
import { isSha256, sha256Payload } from './integrationHash';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function issue(code: string, path: string, messageAr: string, blocking = true): ValidationIssue {
  return { code, path, messageAr, blocking };
}

function requireString(candidate: Record<string, unknown>, field: string, issues: ValidationIssue[], path = '$') {
  if (!isNonEmptyString(candidate[field])) {
    issues.push(issue('required-string', `${path}.${field}`, `الحقل ${field} مطلوب ويجب أن يكون نصاً غير فارغ.`));
  }
}

function requireDate(candidate: Record<string, unknown>, field: string, issues: ValidationIssue[], path = '$') {
  if (!isIsoDate(candidate[field])) {
    issues.push(issue('invalid-date', `${path}.${field}`, `الحقل ${field} يجب أن يحتوي تاريخاً صالحاً.`));
  }
}

function validateNullableString(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value !== null && !isNonEmptyString(value)) {
    issues.push(issue('invalid-nullable-string', path, 'يجب أن تكون القيمة نصاً غير فارغ أو قيمة فارغة صريحة.'));
  }
}

function validateStringList(value: unknown, path: string, issues: ValidationIssue[], minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum || value.some((item) => !isNonEmptyString(item))) {
    issues.push(issue('invalid-reference-list', path, 'يجب أن تكون القيمة قائمة معرفات نصية صالحة.'));
    return;
  }
  if (new Set(value).size !== value.length) {
    issues.push(issue('duplicate-reference', path, 'قائمة المراجع تحتوي قيماً مكررة.'));
  }
}

function validateBooleanFields(candidate: Record<string, unknown>, fields: string[], path: string, issues: ValidationIssue[]) {
  for (const field of fields) {
    if (typeof candidate[field] !== 'boolean') {
      issues.push(issue('invalid-boolean', `${path}.${field}`, `الحقل ${field} يجب أن يكون منطقياً.`));
    }
  }
}

export function validateCaptureEnvelope(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-envelope', '$', 'غلاف الالتقاط يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  for (const field of ['envelopeId', 'adapterId', 'adapterVersion', 'sourceRecordId', 'sourceSystemId', 'correlationId', 'idempotencyKey']) {
    requireString(value, field, issues);
  }
  requireDate(value, 'receivedAt', issues);
  if (value.schemaVersion !== captureSchemaVersion) issues.push(issue('unsupported-schema', '$.schemaVersion', 'إصدار غلاف الالتقاط غير مدعوم.'));
  if (!inputAdapterTypeValues.includes(value.adapterType as never)) issues.push(issue('invalid-adapter-type', '$.adapterType', 'نوع Adapter الإدخال غير صالح.'));
  if (!operationalStateContextValues.includes(value.stateContext as never)) issues.push(issue('invalid-state-context', '$.stateContext', 'سياق الحالة غير صالح.'));
  if (!isRecord(value.payload)) {
    issues.push(issue('invalid-payload', '$.payload', 'حمولة المصدر يجب أن تكون كائناً منظماً.'));
  } else {
    const payload = value.payload;
    for (const field of ['sourceRecordId', 'sourceSystemId', 'recordType']) requireString(payload, field, issues, '$.payload');
    requireDate(payload, 'occurredAt', issues, '$.payload');
    if (!isRecord(payload.data)) issues.push(issue('invalid-source-data', '$.payload.data', 'بيانات سجل المصدر يجب أن تكون كائناً منظماً.'));
    if (isNonEmptyString(payload.sourceRecordId) && payload.sourceRecordId !== value.sourceRecordId) {
      issues.push(issue('source-record-mismatch', '$.payload.sourceRecordId', 'معرّف سجل المصدر داخل الحمولة لا يطابق الغلاف.'));
    }
    if (isNonEmptyString(payload.sourceSystemId) && payload.sourceSystemId !== value.sourceSystemId) {
      issues.push(issue('source-system-mismatch', '$.payload.sourceSystemId', 'معرّف نظام المصدر داخل الحمولة لا يطابق الغلاف.'));
    }
  }
  if (!isSha256(value.payloadHash)) issues.push(issue('invalid-payload-hash', '$.payloadHash', 'بصمة الحمولة يجب أن تكون SHA-256 صحيحة البنية.'));
  if (value.deviceId !== null && !isNonEmptyString(value.deviceId)) issues.push(issue('invalid-device-id', '$.deviceId', 'معرّف الجهاز يجب أن يكون نصاً أو قيمة فارغة صريحة.'));
  if (value.offlineSequence !== null && (!Number.isInteger(value.offlineSequence) || Number(value.offlineSequence) < 1)) {
    issues.push(issue('invalid-offline-sequence', '$.offlineSequence', 'تسلسل العمل دون اتصال يجب أن يكون عدداً صحيحاً موجباً.'));
  }
  if (value.causationId !== null && !isNonEmptyString(value.causationId)) issues.push(issue('invalid-causation-id', '$.causationId', 'مرجع السبب يجب أن يكون نصاً أو قيمة فارغة صريحة.'));
  if (!isRecord(value.transportMetadata)) {
    issues.push(issue('invalid-transport-metadata', '$.transportMetadata', 'بيانات النقل مطلوبة.'));
  } else {
    const metadata = value.transportMetadata;
    if (!['local-simulator', 'batch', 'offline-queue', 'stream-simulator'].includes(String(metadata.transport))) {
      issues.push(issue('invalid-transport', '$.transportMetadata.transport', 'طريقة النقل غير مدعومة في المختبر المحلي.'));
    }
    if (!Number.isInteger(metadata.retryCount) || Number(metadata.retryCount) < 0) {
      issues.push(issue('invalid-retry-count', '$.transportMetadata.retryCount', 'عدد المحاولات يجب أن يكون عدداً صحيحاً غير سالب.'));
    }
    validateNullableString(metadata.batchId, '$.transportMetadata.batchId', issues);
    requireDate(metadata, 'sourceClock', issues, '$.transportMetadata');
    requireDate(metadata, 'platformClock', issues, '$.transportMetadata');
    if (metadata.contentType !== 'application/json') issues.push(issue('invalid-content-type', '$.transportMetadata.contentType', 'نوع محتوى الغلاف يجب أن يكون application/json.'));
  }
  return issues;
}

export async function validateCaptureEnvelopeIntegrity(envelope: CaptureEnvelope): Promise<ValidationIssue[]> {
  const issues = validateCaptureEnvelope(envelope);
  if (issues.some((currentIssue) => currentIssue.blocking)) return issues;
  const calculatedHash = await sha256Payload(envelope.payload);
  if (calculatedHash !== envelope.payloadHash) {
    issues.push(issue('payload-hash-mismatch', '$.payloadHash', 'بصمة الحمولة لا تطابق محتواها؛ تم رفض السجل لحماية النزاهة.'));
  }
  return issues;
}

function validateSubjects(value: unknown, knownEntityIds?: ReadonlySet<SpatialEntityId>): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-subjects', '$.subjects', 'مراجع موضوع الحدث مطلوبة.')];
  const issues: ValidationIssue[] = [];
  requireString(value, 'venueId', issues, '$.subjects');
  requireString(value, 'entityId', issues, '$.subjects');
  for (const field of ['eventRef', 'zoneId', 'assetId', 'routeId', 'decisionId', 'workOrderRef', 'requirementId']) {
    validateNullableString(value[field], `$.subjects.${field}`, issues);
  }
  if (isNonEmptyString(value.entityId) && knownEntityIds && !knownEntityIds.has(value.entityId as SpatialEntityId)) {
    issues.push(issue('unknown-entity', '$.subjects.entityId', `العنصر ${value.entityId} غير معروف في السجل المكاني.`));
  }
  if (knownEntityIds) {
    for (const field of ['zoneId', 'assetId', 'routeId']) {
      const entityId = value[field];
      if (isNonEmptyString(entityId) && !knownEntityIds.has(entityId as SpatialEntityId)) {
        issues.push(issue('unknown-related-entity', `$.subjects.${field}`, `مرجع العنصر ${entityId} غير معروف في السجل المكاني.`));
      }
    }
  }
  return issues;
}

export function validateOperationalEvent(value: unknown, knownEntityIds?: ReadonlySet<SpatialEntityId>): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-operational-event', '$', 'الحدث التشغيلي يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  requireString(value, 'eventId', issues);
  if (!operationalEventTypeValues.includes(value.eventType as never)) issues.push(issue('invalid-event-type', '$.eventType', 'نوع الحدث التشغيلي غير صالح.'));
  if (value.schemaVersion !== operationalEventSchemaVersion) issues.push(issue('unsupported-event-schema', '$.schemaVersion', 'إصدار عقد الحدث غير مدعوم.'));
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) issues.push(issue('invalid-revision', '$.revision', 'مراجعة الحدث يجب أن تكون عدداً صحيحاً موجباً.'));
  if (!operationalStateContextValues.includes(value.stateContext as never)) issues.push(issue('invalid-state-context', '$.stateContext', 'سياق الحدث غير صالح.'));
  issues.push(...validateSubjects(value.subjects, knownEntityIds));

  if (!isRecord(value.time)) {
    issues.push(issue('invalid-time', '$.time', 'أوقات الحدث مطلوبة.'));
  } else {
    for (const field of ['eventTime', 'recordTime', 'receivedAt']) requireDate(value.time, field, issues, '$.time');
    requireString(value.time, 'timeZoneOffset', issues, '$.time');
  }
  if (!isRecord(value.location)) {
    issues.push(issue('invalid-location', '$.location', 'الموقع التشغيلي مطلوب حتى عندما تكون الإحداثيات غير معروفة.'));
  } else {
    requireString(value.location, 'observedAt', issues, '$.location');
    validateNullableString(value.location.resultingLocation, '$.location.resultingLocation', issues);
    validateNullableString(value.location.spatialReference, '$.location.spatialReference', issues);
    if (!['venue-local', 'model-local', 'geographic', 'unknown'].includes(String(value.location.coordinateReference))) {
      issues.push(issue('invalid-coordinate-reference', '$.location.coordinateReference', 'مرجع الإحداثيات غير مدعوم.'));
    }
  }
  if (!isRecord(value.operationalContext)) {
    issues.push(issue('invalid-operational-context', '$.operationalContext', 'سياق العمل والإجراء مطلوب.'));
  } else {
    for (const field of ['businessStep', 'proposedDisposition', 'actionType']) requireString(value.operationalContext, field, issues, '$.operationalContext');
    for (const field of ['priorDisposition', 'instructionId', 'instructionVersion']) {
      validateNullableString(value.operationalContext[field], `$.operationalContext.${field}`, issues);
    }
  }
  if (!isRecord(value.source)) {
    issues.push(issue('invalid-source', '$.source', 'بيانات المصدر مطلوبة.'));
  } else {
    for (const field of ['sourceSystemId', 'sourceRecordId', 'actorId', 'actorRole', 'captureMethod', 'adapterId', 'adapterVersion']) {
      requireString(value.source, field, issues, '$.source');
    }
    validateNullableString(value.source.deviceId, '$.source.deviceId', issues);
    if (!inputAdapterTypeValues.includes(value.source.sourceType as never)) issues.push(issue('invalid-source-type', '$.source.sourceType', 'نوع مصدر الحدث غير صالح.'));
  }
  validateStringList(value.evidenceRefs, '$.evidenceRefs', issues);
  validateStringList(value.observationRefs, '$.observationRefs', issues);
  validateStringList(value.provenanceRefs, '$.provenanceRefs', issues, 1);
  if (!isRecord(value.trust)) {
    issues.push(issue('invalid-trust', '$.trust', 'حالة الثقة والتحقق مطلوبة.'));
  } else {
    if (!assertionStateValues.includes(value.trust.assertionState as never)) issues.push(issue('invalid-assertion-state', '$.trust.assertionState', 'حالة الادعاء غير صالحة.'));
    if (!confidenceLevelValues.includes(value.trust.sourceConfidence as never)) issues.push(issue('invalid-confidence', '$.trust.sourceConfidence', 'درجة ثقة المصدر غير صالحة.'));
    if (!validationDispositionValues.includes(value.trust.validationResult as never)) issues.push(issue('invalid-validation-result', '$.trust.validationResult', 'نتيجة التحقق غير صالحة.'));
    validateStringList(value.trust.validationRuleIds, '$.trust.validationRuleIds', issues, 1);
    validateNullableString(value.trust.authorityRequirement, '$.trust.authorityRequirement', issues);
  }
  if (!isRecord(value.relationships)) {
    issues.push(issue('invalid-event-relationships', '$.relationships', 'علاقات الارتباط والسبب مطلوبة.'));
  } else {
    requireString(value.relationships, 'correlationId', issues, '$.relationships');
    for (const field of ['causationId', 'supersedesEventId', 'errorDeclarationForEventId', 'relationshipReason']) {
      validateNullableString(value.relationships[field], `$.relationships.${field}`, issues);
    }
  }
  if (!isRecord(value.delivery)) {
    issues.push(issue('invalid-delivery', '$.delivery', 'بيانات نزاهة التسليم مطلوبة.'));
  } else {
    requireString(value.delivery, 'idempotencyKey', issues, '$.delivery');
    if (!isSha256(value.delivery.payloadHash)) issues.push(issue('invalid-payload-hash', '$.delivery.payloadHash', 'بصمة حمولة الحدث غير صالحة.'));
    if (value.delivery.offlineSequence !== null && (!Number.isInteger(value.delivery.offlineSequence) || Number(value.delivery.offlineSequence) < 1)) {
      issues.push(issue('invalid-offline-sequence', '$.delivery.offlineSequence', 'تسلسل الحدث دون اتصال غير صالح.'));
    }
  }
  return issues;
}

export function validateEvidenceReference(value: unknown, knownEntityIds?: ReadonlySet<SpatialEntityId>): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-evidence', '$', 'مرجع الدليل يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== evidenceSchemaVersion) issues.push(issue('unsupported-evidence-schema', '$.schemaVersion', 'إصدار عقد الدليل غير مدعوم.'));
  if (!operationalStateContextValues.includes(value.stateContext as never)) issues.push(issue('invalid-evidence-context', '$.stateContext', 'سياق حالة الدليل غير صالح.'));
  for (const field of ['evidenceId', 'uri', 'fileName', 'mimeType', 'capturedBy', 'sourceSystemId']) requireString(value, field, issues);
  requireDate(value, 'capturedAt', issues);
  if (!evidenceTypeValues.includes(value.evidenceType as never)) issues.push(issue('invalid-evidence-type', '$.evidenceType', 'نوع الدليل غير صالح.'));
  if (!isSha256(value.sha256)) issues.push(issue('invalid-evidence-hash', '$.sha256', 'بصمة الدليل يجب أن تكون SHA-256 صحيحة البنية.'));
  if (!evidenceVerificationStatusValues.includes(value.verificationStatus as never)) issues.push(issue('invalid-evidence-status', '$.verificationStatus', 'حالة التحقق من الدليل غير صالحة.'));
  if (!['temporary-validation', 'operational', 'regulated'].includes(String(value.retentionClass))) issues.push(issue('invalid-retention-class', '$.retentionClass', 'فئة الاحتفاظ بالدليل غير صالحة.'));
  if (!['public', 'internal', 'restricted'].includes(String(value.sensitivityClass))) issues.push(issue('invalid-sensitivity-class', '$.sensitivityClass', 'فئة حساسية الدليل غير صالحة.'));
  validateNullableString(value.spatialReference, '$.spatialReference', issues);
  validateNullableString(value.instructionVersion, '$.instructionVersion', issues);
  if (!Array.isArray(value.relatedEntityIds)) {
    issues.push(issue('invalid-related-entities', '$.relatedEntityIds', 'علاقات الدليل المكانية يجب أن تكون قائمة.'));
  } else {
    validateStringList(value.relatedEntityIds, '$.relatedEntityIds', issues);
    if (knownEntityIds) {
      value.relatedEntityIds.forEach((entityId, index) => {
        if (!knownEntityIds.has(entityId as SpatialEntityId)) issues.push(issue('unknown-evidence-entity', `$.relatedEntityIds[${index}]`, `العنصر ${String(entityId)} غير معروف.`));
      });
    }
  }
  validateStringList(value.relatedEventIds, '$.relatedEventIds', issues);
  validateStringList(value.relatedRequirementIds, '$.relatedRequirementIds', issues);
  validateStringList(value.relatedActionIds, '$.relatedActionIds', issues);
  validateNullableString(value.instructionId, '$.instructionId', issues);
  validateNullableString(value.supersededByEvidenceId, '$.supersededByEvidenceId', issues);
  if (!isRecord(value.metadata)) issues.push(issue('invalid-evidence-metadata', '$.metadata', 'بيانات وصف الدليل يجب أن تكون كائناً منظماً.'));
  return issues;
}

export function validateAdapterManifest(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-adapter-manifest', '$', 'تعريف Adapter يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== adapterManifestSchemaVersion) issues.push(issue('unsupported-manifest-schema', '$.schemaVersion', 'إصدار تعريف Adapter غير مدعوم.'));
  for (const field of ['adapterId', 'version']) requireString(value, field, issues);
  const types = [...inputAdapterTypeValues, ...outputAdapterTypeValues];
  if (!types.includes(value.adapterType as never)) issues.push(issue('invalid-adapter-type', '$.adapterType', 'فئة Adapter غير مدعومة.'));
  if (!['input', 'output'].includes(String(value.inputOrOutput))) issues.push(issue('invalid-adapter-direction', '$.inputOrOutput', 'اتجاه Adapter يجب أن يكون إدخالاً أو إخراجاً.'));
  if (value.inputOrOutput === 'input' && !inputAdapterTypeValues.includes(value.adapterType as never)) issues.push(issue('adapter-direction-mismatch', '$.adapterType', 'فئة Adapter لا تطابق اتجاه الإدخال.'));
  if (value.inputOrOutput === 'output' && !outputAdapterTypeValues.includes(value.adapterType as never)) issues.push(issue('adapter-direction-mismatch', '$.adapterType', 'فئة Adapter لا تطابق اتجاه الإخراج.'));
  validateStringList(value.supportedSchemaVersions, '$.supportedSchemaVersions', issues, 1);
  if (!isRecord(value.capabilities)) {
    issues.push(issue('invalid-capabilities', '$.capabilities', 'قدرات Adapter مطلوبة.'));
  } else {
    validateBooleanFields(value.capabilities, ['normalize', 'ingest', 'acknowledge', 'retry', 'outputDelivery', 'conformanceTesting'], '$.capabilities', issues);
  }
  validateBooleanFields(value, ['onlineSupport', 'offlineSupport', 'batchSupport', 'streamingSupport', 'evidenceSupport', 'spatialSupport', 'taskingSupport'], '$', issues);
  if (!['healthy', 'degraded', 'offline'].includes(String(value.healthStatus))) issues.push(issue('invalid-health-status', '$.healthStatus', 'حالة صحة Adapter غير صالحة.'));
  if (!isRecord(value.configurationSchema)) issues.push(issue('invalid-configuration-schema', '$.configurationSchema', 'مخطط التهيئة مطلوب.'));
  if (!isRecord(value.vendorMetadata) || value.vendorMetadata.vendorNeutral !== true) {
    issues.push(issue('vendor-lock-in', '$.vendorMetadata.vendorNeutral', 'Adapter المرجعي يجب أن يبقى محايد المورد.'));
  } else {
    if (value.vendorMetadata.implementation !== 'local-reference') issues.push(issue('invalid-reference-implementation', '$.vendorMetadata.implementation', 'التنفيذ المرجعي في هذه المرحلة يجب أن يبقى محلياً.'));
    if (value.vendorMetadata.productName !== null) issues.push(issue('vendor-product-forbidden', '$.vendorMetadata.productName', 'لا يجوز ربط التعريف المرجعي بمنتج مورد في هذه المرحلة.'));
  }
  return issues;
}

export function validateStateProjection(value: unknown, knownEntityIds?: ReadonlySet<SpatialEntityId>): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-projection', '$', 'إسقاط الحالة يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== stateProjectionSchemaVersion) issues.push(issue('unsupported-projection-schema', '$.schemaVersion', 'إصدار إسقاط الحالة غير مدعوم.'));
  requireString(value, 'projectionVersion', issues);
  if (!isSha256(value.projectionContentHash)) issues.push(issue('invalid-projection-content-hash', '$.projectionContentHash', 'بصمة محتوى الإسقاط يجب أن تكون SHA-256 صالحة.'));
  if (isNonEmptyString(value.projectionVersion) && isSha256(value.projectionContentHash) && value.projectionVersion !== `PROJECTION-v1-${value.projectionContentHash}`) {
    issues.push(issue('projection-identity-mismatch', '$.projectionVersion', 'هوية الإسقاط لا تطابق بصمة محتواه.'));
  }
  requireString(value, 'projectionConfigurationVersion', issues);
  requireString(value, 'spatialMappingVersion', issues);
  requireDate(value, 'generatedAt', issues);
  if (!operationalStateContextValues.includes(value.stateContext as never)) issues.push(issue('invalid-state-context', '$.stateContext', 'سياق الإسقاط غير صالح.'));
  if (!Number.isInteger(value.lastEventRevision) || Number(value.lastEventRevision) < 0) issues.push(issue('invalid-last-revision', '$.lastEventRevision', 'آخر مراجعة في الإسقاط يجب أن تكون عدداً صحيحاً غير سالب.'));
  if (!Array.isArray(value.entityStates)) {
    issues.push(issue('invalid-entity-states', '$.entityStates', 'حالات العناصر المشتقة مطلوبة.'));
  } else {
    const projectedIds = new Set<string>();
    value.entityStates.forEach((state, index) => {
      const path = `$.entityStates[${index}]`;
      if (!isRecord(state)) {
        issues.push(issue('invalid-projected-entity', path, 'حالة العنصر المشتقة يجب أن تكون كائناً منظماً.'));
        return;
      }
      for (const field of ['entityId', 'disposition', 'labelAr']) requireString(state, field, issues, path);
      requireDate(state, 'lastEventTime', issues, path);
      validateStringList(state.sourceEventIds, `${path}.sourceEventIds`, issues, 1);
      if (!assertionStateValues.includes(state.assertionState as never)) issues.push(issue('invalid-assertion-state', `${path}.assertionState`, 'حالة الادعاء في الإسقاط غير صالحة.'));
      if (!['neutral', 'reported', 'verified', 'approved', 'blocked'].includes(String(state.colorToken))) issues.push(issue('invalid-color-token', `${path}.colorToken`, 'رمز لون الإسقاط غير صالح.'));
      if (isNonEmptyString(state.entityId)) {
        if (projectedIds.has(state.entityId)) issues.push(issue('duplicate-projected-entity', `${path}.entityId`, 'الإسقاط يحتوي حالة مكررة للعنصر نفسه.'));
        projectedIds.add(state.entityId);
        if (knownEntityIds && !knownEntityIds.has(state.entityId as SpatialEntityId)) issues.push(issue('unknown-projected-entity', `${path}.entityId`, 'الإسقاط يحتوي عنصراً مكانياً غير معروف.'));
      }
    });
  }
  validateStringList(value.sourceEventIds, '$.sourceEventIds', issues);
  if (!Array.isArray(value.sourceEventLineage)) {
    issues.push(issue('invalid-source-event-lineage', '$.sourceEventLineage', 'نسب أحداث المصدر مطلوب في الإسقاط.'));
  } else {
    value.sourceEventLineage.forEach((lineage, index) => {
      const path = `$.sourceEventLineage[${index}]`;
      if (!isRecord(lineage)) return issues.push(issue('invalid-source-event-lineage-entry', path, 'مدخل نسب الحدث غير صالح.'));
      requireString(lineage, 'eventId', issues, path);
      if (!Number.isInteger(lineage.revision) || Number(lineage.revision) < 1) issues.push(issue('invalid-lineage-revision', `${path}.revision`, 'مراجعة نسب الحدث غير صالحة.'));
      if (!isSha256(lineage.payloadHash)) issues.push(issue('invalid-lineage-payload-hash', `${path}.payloadHash`, 'بصمة حمولة الحدث في النسب غير صالحة.'));
      if (!isSha256(lineage.eventContentHash)) issues.push(issue('invalid-event-content-hash', `${path}.eventContentHash`, 'بصمة محتوى الحدث في النسب غير صالحة.'));
    });
  }
  validateStringList(value.rejectedEventIds, '$.rejectedEventIds', issues);
  validateStringList(value.supersededEventIds, '$.supersededEventIds', issues);
  if (!Array.isArray(value.requirementStates)) {
    issues.push(issue('invalid-requirement-states', '$.requirementStates', 'حالات متطلبات الإسقاط مطلوبة.'));
  } else {
    value.requirementStates.forEach((requirement, index) => {
      const path = `$.requirementStates[${index}]`;
      if (!isRecord(requirement)) return issues.push(issue('invalid-requirement-state', path, 'حالة المتطلب غير صالحة.'));
      for (const field of ['requirementId', 'entityId', 'titleAr']) requireString(requirement, field, issues, path);
      if (!requirementOutcomeValues.includes(requirement.outcome as never)) issues.push(issue('invalid-requirement-outcome', `${path}.outcome`, 'نتيجة المتطلب غير صالحة.'));
      if (typeof requirement.weight !== 'number' || !Number.isFinite(requirement.weight) || requirement.weight < 0) issues.push(issue('invalid-requirement-weight', `${path}.weight`, 'وزن المتطلب غير صالح.'));
      validateStringList(requirement.contributingEventIds, `${path}.contributingEventIds`, issues);
      validateStringList(requirement.eligibleTrustStates, `${path}.eligibleTrustStates`, issues);
    });
  }
  validateStringList(value.explanationAr, '$.explanationAr', issues, 1);
  return issues;
}

export function validatePhysicalSceneCommand(value: unknown): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-physical-command', '$', 'أمر المشهد المادي يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== physicalSceneCommandSchemaVersion) issues.push(issue('unsupported-physical-schema', '$.schemaVersion', 'إصدار أمر المشهد المادي غير مدعوم.'));
  for (const field of ['commandId', 'deliveryAttemptId', 'projectionVersion', 'outputProfileVersion', 'mappingVersion', 'targetDeviceId', 'sceneId']) requireString(value, field, issues);
  if (!isSha256(value.commandContentHash)) issues.push(issue('invalid-command-content-hash', '$.commandContentHash', 'بصمة محتوى الأمر المادي غير صالحة.'));
  if (!isSha256(value.projectionContentHash)) issues.push(issue('invalid-projection-content-hash', '$.projectionContentHash', 'بصمة محتوى الإسقاط في الأمر المادي غير صالحة.'));
  if (!operationalStateContextValues.includes(value.stateContext as never)) issues.push(issue('invalid-state-context', '$.stateContext', 'سياق أمر المخرج المادي غير صالح.'));
  for (const field of ['issuedAt', 'expiresAt']) requireDate(value, field, issues);
  if (!Number.isInteger(value.sequence) || Number(value.sequence) < 1) issues.push(issue('invalid-command-sequence', '$.sequence', 'تسلسل أمر المشهد يجب أن يكون موجباً.'));
  if (typeof value.acknowledgementRequired !== 'boolean') issues.push(issue('invalid-acknowledgement-flag', '$.acknowledgementRequired', 'يجب تحديد ما إذا كان أمر العرض يحتاج إقرار استلام.'));
  if (!Array.isArray(value.entityVisualStates) || !Array.isArray(value.routeVisualStates)) {
    issues.push(issue('invalid-visual-states', '$.entityVisualStates', 'حالات العرض المادي مطلوبة.'));
  } else {
    value.entityVisualStates.forEach((state, index) => {
      const path = `$.entityVisualStates[${index}]`;
      if (!isRecord(state)) return issues.push(issue('invalid-entity-visual-state', path, 'حالة عرض العنصر غير صالحة.'));
      for (const field of ['entityId', 'label']) requireString(state, field, issues, path);
      if (!['neutral', 'reported', 'verified', 'approved', 'blocked'].includes(String(state.colorToken))) issues.push(issue('invalid-color-token', `${path}.colorToken`, 'رمز لون العنصر غير صالح.'));
      if (typeof state.intensity !== 'number' || !Number.isFinite(state.intensity) || state.intensity < 0 || state.intensity > 1) issues.push(issue('invalid-intensity', `${path}.intensity`, 'شدة الإظهار يجب أن تكون بين صفر وواحد.'));
    });
    value.routeVisualStates.forEach((state, index) => {
      const path = `$.routeVisualStates[${index}]`;
      if (!isRecord(state)) return issues.push(issue('invalid-route-visual-state', path, 'حالة عرض المسار غير صالحة.'));
      for (const field of ['routeId', 'colorToken']) requireString(state, field, issues, path);
      if (typeof state.active !== 'boolean') issues.push(issue('invalid-route-active', `${path}.active`, 'حالة تفعيل المسار يجب أن تكون منطقية.'));
      if (!['forward', 'reverse', 'both'].includes(String(state.direction))) issues.push(issue('invalid-route-direction', `${path}.direction`, 'اتجاه المسار غير صالح.'));
    });
  }
  validateStringList(value.sourceEventIds, '$.sourceEventIds', issues);
  if (isIsoDate(value.issuedAt) && isIsoDate(value.expiresAt) && Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)) {
    issues.push(issue('invalid-command-expiry', '$.expiresAt', 'وقت انتهاء أمر العرض يجب أن يأتي بعد وقت الإصدار.'));
  }
  return issues;
}

export function validateSpatialOutputCommand(value: unknown, knownEntityIds?: ReadonlySet<SpatialEntityId>): ValidationIssue[] {
  if (!isRecord(value)) return [issue('invalid-spatial-command', '$', 'أمر المخرج المكاني يجب أن يكون كائناً منظماً.')];
  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== spatialOutputCommandSchemaVersion) issues.push(issue('unsupported-spatial-command-schema', '$.schemaVersion', 'إصدار أمر المخرج المكاني غير مدعوم.'));
  for (const field of ['commandId', 'deliveryAttemptId', 'projectionVersion', 'outputProfileVersion', 'mappingVersion']) requireString(value, field, issues);
  if (!isSha256(value.commandContentHash)) issues.push(issue('invalid-command-content-hash', '$.commandContentHash', 'بصمة محتوى الأمر المكاني غير صالحة.'));
  if (!isSha256(value.projectionContentHash)) issues.push(issue('invalid-projection-content-hash', '$.projectionContentHash', 'بصمة محتوى الإسقاط في الأمر المكاني غير صالحة.'));
  if (!['spatial-2d', 'spatial-3d', 'geospatial'].includes(String(value.outputType))) issues.push(issue('invalid-spatial-output-type', '$.outputType', 'نوع المخرج المكاني غير صالح.'));
  if (!operationalStateContextValues.includes(value.stateContext as never)) issues.push(issue('invalid-state-context', '$.stateContext', 'سياق أمر المخرج المكاني غير صالح.'));
  for (const field of ['issuedAt', 'expiresAt']) requireDate(value, field, issues);
  if (!Number.isInteger(value.sequence) || Number(value.sequence) < 1) issues.push(issue('invalid-command-sequence', '$.sequence', 'تسلسل أمر المخرج المكاني يجب أن يكون موجباً.'));
  validateStringList(value.sourceEventIds, '$.sourceEventIds', issues);
  if (!Array.isArray(value.visualStates)) {
    issues.push(issue('invalid-spatial-visual-states', '$.visualStates', 'حالات العرض المكانية مطلوبة.'));
  } else {
    value.visualStates.forEach((state, index) => {
      const path = `$.visualStates[${index}]`;
      if (!isRecord(state)) return issues.push(issue('invalid-spatial-visual-state', path, 'حالة العرض المكانية غير صالحة.'));
      for (const field of ['entityId', 'projectionVersion', 'projectionContentHash', 'mappingVersion', 'visualState', 'colorToken', 'label', 'spatialReference', 'issuedAt', 'expiresAt']) requireString(state, field, issues, path);
      if (!operationalStateContextValues.includes(state.stateContext as never)) issues.push(issue('invalid-state-context', `${path}.stateContext`, 'سياق حالة العرض غير صالح.'));
      validateNullableString(state.zoneId, `${path}.zoneId`, issues);
      validateStringList(state.routeIds, `${path}.routeIds`, issues);
      validateStringList(state.sourceEventIds, `${path}.sourceEventIds`, issues);
      if (typeof state.highlight !== 'boolean') issues.push(issue('invalid-highlight', `${path}.highlight`, 'قيمة إبراز العنصر يجب أن تكون منطقية.'));
      if (knownEntityIds && isNonEmptyString(state.entityId) && !knownEntityIds.has(state.entityId as SpatialEntityId)) issues.push(issue('unknown-output-entity', `${path}.entityId`, 'المخرج يحتوي عنصراً مكانياً غير معروف.'));
    });
  }
  return issues;
}

export function isCanonicalEvidenceReference(value: unknown): value is CanonicalEvidenceReference {
  return validateEvidenceReference(value).every((currentIssue) => !currentIssue.blocking);
}

export function isOperationalEvent(value: unknown, knownEntityIds?: ReadonlySet<SpatialEntityId>): value is OperationalEvent {
  return validateOperationalEvent(value, knownEntityIds).every((currentIssue) => !currentIssue.blocking);
}

export function isAdapterManifest(value: unknown): value is AdapterManifest {
  return validateAdapterManifest(value).every((currentIssue) => !currentIssue.blocking);
}

export function isStateProjection(value: unknown): value is StateProjection {
  return validateStateProjection(value).every((currentIssue) => !currentIssue.blocking);
}

export function isPhysicalSceneCommand(value: unknown): value is PhysicalSceneCommand {
  return validatePhysicalSceneCommand(value).every((currentIssue) => !currentIssue.blocking);
}

export function isSpatialOutputCommand(value: unknown): value is SpatialOutputCommand {
  return validateSpatialOutputCommand(value).every((currentIssue) => !currentIssue.blocking);
}
