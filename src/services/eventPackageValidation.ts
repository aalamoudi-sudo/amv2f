import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import eventPackageSchema from '../../schemas/event-package/v1/event-package.schema.json';
import captureEnvelopeSchema from '../../schemas/integration/v1/capture-envelope.schema.json';
import { referenceAdapterManifests } from '../data/integrationFixtures';
import {
  inputAdapterTypeValues,
  outputAdapterTypeValues
} from '../types/integration';
import {
  currentPlatformVersion,
  eventPackageSchemaVersion,
  type EventPackage,
  type EventPackageValidationIssue,
  type EventPackageValidationResult
} from '../types/eventPackage';
import type { SpatialEntityId } from '../types/spatial';
import { validateDecisionDataset } from './decisionValidation';
import { ReferenceInputAdapter, operationalEventIdFromObservation } from './adapterSdk';
import { validateEventPackageDependencies } from './eventPackageDependencyResolution';
import { createEventPackageContentHash, isEventPackageContentHash } from './eventPackageHash';
import { createEventRuntimeConfiguration, verifyEventRuntimeHealth } from './eventRuntimeConfiguration';
import { validateCaptureEnvelopeIntegrity } from './integrationValidation';
import {
  operationalPackRegistry,
  platformCapabilityIds,
  resolveOperationalPacks
} from './operationalPackRegistry';
import { validateZoneReadinessDataset } from './zoneReadinessValidation';
import { validateScenarioPlayerConfiguration } from './scenarioPackValidation';
import { ProvenanceResolver } from './provenanceResolver';
import {
  findExecutableInputAdapterManifest,
  isEnabledInputIntegrationProfile
} from './integrationProfileExecutability';

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
ajv.addSchema(captureEnvelopeSchema);
const eventPackageSchemaValidator: ValidateFunction = ajv.compile(eventPackageSchema);
const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-[A-Za-z0-9.-]+)?$/;

export interface EventPackageValidationOptions {
  existingPackageIds?: Iterable<string>;
  packageCatalog?: Iterable<EventPackage>;
  supportedCapabilityIds?: Iterable<string>;
  platformVersion?: string;
}

function issue(code: string, path: string, messageAr: string, severity: EventPackageValidationIssue['severity'] = 'blocking'): EventPackageValidationIssue {
  return { code, path, messageAr, severity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function schemaIssue(error: ErrorObject): EventPackageValidationIssue {
  const path = error.instancePath || '$';
  const field = error.params && 'missingProperty' in error.params ? `.${String(error.params.missingProperty)}` : '';
  return issue('event-package-schema-invalid', `${path}${field}`, `بنية الحزمة غير صالحة عند ${path}${field}، ويجب تصحيح الحقل قبل التفعيل.`);
}

function compareSemver(left: string, right: string): number | null {
  const leftMatch = semverPattern.exec(left);
  const rightMatch = semverPattern.exec(right);
  if (!leftMatch || !rightMatch) return null;
  for (let index = 1; index <= 3; index += 1) {
    const difference = Number(leftMatch[index]) - Number(rightMatch[index]);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function validateEventPackageSchema(value: unknown): { valid: boolean; issues: EventPackageValidationIssue[] } {
  const valid = eventPackageSchemaValidator(value) === true;
  return {
    valid,
    issues: valid ? [] : (eventPackageSchemaValidator.errors ?? []).map(schemaIssue)
  };
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => seen.has(value) ? duplicates.add(value) : seen.add(value));
  return [...duplicates];
}

function validateSemantics(eventPackage: EventPackage, options: EventPackageValidationOptions): EventPackageValidationIssue[] {
  const issues: EventPackageValidationIssue[] = [];
  const supportedCapabilities = new Set(options.supportedCapabilityIds ?? platformCapabilityIds);
  const platformVersion = options.platformVersion ?? currentPlatformVersion;
  const entities = eventPackage.spatialConfiguration.entities;
  const entityIds = entities.map((entity) => entity.id);
  const knownEntityIds = new Set<SpatialEntityId>(entityIds);
  const entityTypes = new Set(entities.map((entity) => entity.type));
  const routes = eventPackage.routeConfiguration.routes;
  const routeIds = routes.map((route) => route.id);
  const roleIds = eventPackage.roleConfiguration.map((role) => role.roleId);
  const authorityIds = eventPackage.authorityConfiguration.map((authority) => authority.authorityId);
  const integrationProfileIds = eventPackage.integrationProfileConfiguration.map((profile) => profile.integrationProfileId);
  const enabledIntegrationProfileIds = eventPackage.integrationProfileConfiguration
    .filter((profile) => profile.enabled)
    .map((profile) => profile.integrationProfileId);
  const knownOperationalPackIds = new Set(operationalPackRegistry.map((pack) => pack.packId));
  const outputProfileIds = [
    ...eventPackage.projectionProfileConfiguration.map((profile) => profile.outputProfileId),
    ...eventPackage.physicalOutputProfileConfiguration.map((profile) => profile.outputProfileId)
  ];

  if (!semverPattern.test(eventPackage.packageVersion)) issues.push(issue('invalid-package-version', '$.packageVersion', 'إصدار الحزمة يجب أن يتبع صيغة الأرقام الدلالية.'));
  if (eventPackage.schemaVersion !== eventPackageSchemaVersion) issues.push(issue('unsupported-package-schema-version', '$.schemaVersion', 'إصدار مخطط الحزمة غير مدعوم.'));
  if (options.existingPackageIds && new Set(options.existingPackageIds).has(eventPackage.packageId)) issues.push(issue('duplicate-package-id', '$.packageId', 'معرّف الحزمة مستخدم بالفعل في مكتبة الاستيراد الحالية.'));
  const minComparison = compareSemver(platformVersion, eventPackage.minimumPlatformVersion);
  const maxComparison = compareSemver(platformVersion, eventPackage.maximumPlatformVersion);
  if (minComparison === null || maxComparison === null || minComparison < 0 || maxComparison > 0) issues.push(issue('unsupported-platform-version', '$.minimumPlatformVersion', 'إصدار المنصة الحالي خارج نطاق توافق الحزمة.'));
  eventPackage.requiredCapabilityIds.forEach((capabilityId) => {
    if (!supportedCapabilities.has(capabilityId)) issues.push(issue('unsupported-platform-capability', `$.requiredCapabilityIds.${capabilityId}`, `القدرة ${capabilityId} غير متاحة في المنصة الحالية.`));
  });
  eventPackage.incompatibleCapabilityIds.forEach((capabilityId) => {
    if (supportedCapabilities.has(capabilityId)) issues.push(issue('incompatible-platform-capability', `$.incompatibleCapabilityIds.${capabilityId}`, `الحزمة لا تتوافق مع القدرة المفعلة ${capabilityId}.`));
  });
  const packageCreatedAt = Date.parse(eventPackage.createdAt);
  const eventStartsAt = Date.parse(eventPackage.eventInstance.startAt);
  const eventEndsAt = Date.parse(eventPackage.eventInstance.endAt);
  if (!Number.isFinite(packageCreatedAt)) issues.push(issue('invalid-package-created-at', '$.createdAt', 'وقت إنشاء الحزمة غير صالح.'));
  if (eventPackage.approvalStatus === 'approved') {
    const packageApprovedAt = eventPackage.approvedAt ? Date.parse(eventPackage.approvedAt) : Number.NaN;
    if (!eventPackage.approvedBy?.trim() || !Number.isFinite(packageApprovedAt)) issues.push(issue('invalid-package-approval', '$.approvalStatus', 'الحزمة المعتمدة تحتاج إلى جهة اعتماد ووقت اعتماد صالحين.'));
    else if (Number.isFinite(packageCreatedAt) && packageApprovedAt < packageCreatedAt) issues.push(issue('invalid-package-approval-time', '$.approvedAt', 'وقت اعتماد الحزمة لا يمكن أن يسبق وقت إنشائها.'));
  }
  if (eventPackage.eventTemplate.eventType !== eventPackage.eventType) issues.push(issue('template-event-type-mismatch', '$.eventTemplate.eventType', 'نوع قالب الفعالية لا يطابق تصنيف الحزمة.'));
  if (eventPackage.eventInstance.eventTemplateId !== eventPackage.eventTemplate.eventTemplateId) issues.push(issue('invalid-event-instance-template', '$.eventInstance.eventTemplateId', 'مثيل الفعالية لا يشير إلى القالب الموجود داخل الحزمة.'));
  if (!Number.isFinite(eventStartsAt) || !Number.isFinite(eventEndsAt) || eventStartsAt >= eventEndsAt) issues.push(issue('invalid-event-instance-dates', '$.eventInstance.endAt', 'وقتا بداية ونهاية مثيل الفعالية يجب أن يكونا صالحين، وأن تأتي النهاية بعد البداية.'));
  if (!eventPackage.spatialConfiguration.venueIds.includes(eventPackage.eventInstance.venueId)) issues.push(issue('unknown-venue', '$.eventInstance.venueId', 'الموقع المرتبط بمثيل الفعالية غير موجود في التهيئة المكانية.'));
  if (!knownEntityIds.has(eventPackage.spatialConfiguration.siteBoundaryId)) issues.push(issue('unknown-site-boundary', '$.spatialConfiguration.siteBoundaryId', 'حدود الموقع تشير إلى عنصر مكاني غير معروف.'));
  duplicateValues(entityIds).forEach((entityId) => issues.push(issue('duplicate-entity-id', `$.spatialConfiguration.entities.${entityId}`, `معرّف العنصر ${entityId} مكرر داخل الحزمة.`)));
  entities.forEach((entity, index) => {
    if (entity.parentId && !knownEntityIds.has(entity.parentId)) issues.push(issue('unknown-entity-reference', `$.spatialConfiguration.entities[${index}].parentId`, `العنصر ${entity.id} يشير إلى أب مكاني غير معروف.`));
    if (!eventPackage.eventTemplate.supportedSpatialEntityTypes.includes(entity.type)) issues.push(issue('entity-type-not-supported-by-template', `$.spatialConfiguration.entities[${index}].type`, `نوع العنصر ${entity.type} غير مدعوم في قالب الفعالية.`));
    if (eventPackage.spatialConfiguration.entityLabels[entity.id] !== entity.nameAr) issues.push(issue('missing-entity-label', `$.spatialConfiguration.entityLabels.${entity.id}`, `التسمية العربية للعنصر ${entity.id} مفقودة أو غير متطابقة.`));
  });
  eventPackage.spatialConfiguration.modelReferences.forEach((modelReference, modelIndex) => {
    Object.keys(modelReference.entityNodeMap).forEach((entityId) => {
      if (!knownEntityIds.has(entityId as SpatialEntityId)) issues.push(issue('model-unknown-entity-reference', `$.spatialConfiguration.modelReferences[${modelIndex}].entityNodeMap.${entityId}`, `مرجع النموذج يشير إلى العنصر غير المعروف ${entityId}.`));
    });
  });
  duplicateValues(routeIds).forEach((routeId) => issues.push(issue('duplicate-route-id', `$.routeConfiguration.routes.${routeId}`, `معرّف المسار ${routeId} مكرر داخل الحزمة.`)));
  routes.forEach((route, index) => {
    if (!knownEntityIds.has(route.entityId)) issues.push(issue('unknown-route-reference', `$.routeConfiguration.routes[${index}].entityId`, `المسار ${route.id} لا يملك عنصراً مكانياً مطابقاً.`));
    if (route.points.length < 2 || route.points.some((point) => point.length !== 3 || point.some((coordinate) => !Number.isFinite(coordinate)))) issues.push(issue('invalid-route-geometry', `$.routeConfiguration.routes[${index}].points`, `هندسة المسار ${route.id} تحتاج إلى نقطتين صالحتي الإحداثيات على الأقل.`));
    route.relatedEntityIds.forEach((entityId, relationIndex) => {
      if (!knownEntityIds.has(entityId)) issues.push(issue('unknown-route-entity', `$.routeConfiguration.routes[${index}].relatedEntityIds[${relationIndex}]`, `المسار ${route.id} يشير إلى العنصر غير المعروف ${entityId}.`));
    });
  });
  eventPackage.requirementConfiguration.forEach((requirement, index) => {
    if (!knownEntityIds.has(requirement.entityId)) issues.push(issue('unknown-requirement-entity', `$.requirementConfiguration[${index}].entityId`, `المتطلب ${requirement.requirementId} مرتبط بعنصر غير معروف.`));
  });

  duplicateValues(roleIds).forEach((roleId) => issues.push(issue('duplicate-role-id', `$.roleConfiguration.${roleId}`, `الدور ${roleId} مكرر.`)));
  eventPackage.eventTemplate.requiredRoleIds.forEach((roleId) => {
    if (!roleIds.includes(roleId)) issues.push(issue('missing-required-role', `$.eventTemplate.requiredRoleIds.${roleId}`, `الدور المطلوب ${roleId} غير معرف في الحزمة.`));
  });
  eventPackage.roleConfiguration.forEach((role, index) => {
    role.allowedEntityTypes.forEach((entityType) => {
      if (!eventPackage.eventTemplate.supportedSpatialEntityTypes.includes(entityType)) issues.push(issue('role-entity-type-not-supported', `$.roleConfiguration[${index}].allowedEntityTypes`, `الدور ${role.titleAr} يسمح بنوع عنصر غير مدعوم في القالب.`));
    });
    role.operationalPackIds.forEach((packId) => {
      if (!eventPackage.operationalPackConfiguration.enabledPackIds.includes(packId)) issues.push(issue('role-unknown-pack', `$.roleConfiguration[${index}].operationalPackIds`, `الدور ${role.titleAr} يشير إلى حزمة تشغيلية غير مفعلة.`));
    });
    role.escalationTargets.forEach((targetRoleId) => {
      if (!roleIds.includes(targetRoleId)) issues.push(issue('role-unknown-escalation-target', `$.roleConfiguration[${index}].escalationTargets`, `هدف التصعيد ${targetRoleId} غير معرف في الحزمة.`));
    });
  });
  duplicateValues(authorityIds).forEach((authorityId) => issues.push(issue('duplicate-authority-id', `$.authorityConfiguration.${authorityId}`, `جهة الصلاحية ${authorityId} مكررة.`)));
  eventPackage.authorityConfiguration.forEach((authority, index) => {
    authority.requiredRoleIds.forEach((roleId) => {
      if (!roleIds.includes(roleId)) issues.push(issue('authority-missing-role', `$.authorityConfiguration[${index}].requiredRoleIds`, `جهة الصلاحية ${authority.titleAr} تحتاج إلى دور غير معرف.`));
    });
    authority.separationOfDutyRules.forEach((rule, ruleIndex) => {
      if (!roleIds.includes(rule.actorRoleId) || !roleIds.includes(rule.prohibitedCounterpartyRoleId) || rule.actorRoleId === rule.prohibitedCounterpartyRoleId) issues.push(issue('invalid-authority-rule', `$.authorityConfiguration[${index}].separationOfDutyRules[${ruleIndex}]`, `قاعدة فصل الواجبات ${rule.ruleId} غير صالحة.`));
    });
  });

  duplicateValues(integrationProfileIds).forEach((profileId) => issues.push(issue('duplicate-integration-profile', `$.integrationProfileConfiguration.${profileId}`, `ملف التكامل ${profileId} مكرر.`)));
  eventPackage.integrationProfileConfiguration.forEach((profile, index) => {
    const isInput = inputAdapterTypeValues.includes(profile.adapterType as (typeof inputAdapterTypeValues)[number]);
    const isOutput = outputAdapterTypeValues.includes(profile.adapterType as (typeof outputAdapterTypeValues)[number]);
    if ((profile.direction === 'input' && !isInput) || (profile.direction === 'output' && !isOutput) || (!isInput && !isOutput)) issues.push(issue('invalid-integration-profile', `$.integrationProfileConfiguration[${index}].adapterType`, `نوع الموائم لا يطابق اتجاه ملف التكامل ${profile.titleAr}.`));
    profile.requiredEntityTypes.forEach((entityType) => {
      if (!entityTypes.has(entityType)) issues.push(issue('integration-profile-missing-entity-type', `$.integrationProfileConfiguration[${index}].requiredEntityTypes`, `ملف التكامل ${profile.titleAr} يحتاج إلى نوع عنصر غير موجود.`));
    });
    profile.requiredOperationalPackIds.forEach((packId) => {
      if (!knownOperationalPackIds.has(packId)) issues.push(issue('integration-profile-unknown-pack', `$.integrationProfileConfiguration[${index}].requiredOperationalPackIds`, `ملف التكامل ${profile.titleAr} يشير إلى حزمة تشغيلية غير معروفة.`));
      else if (profile.enabled && !eventPackage.operationalPackConfiguration.enabledPackIds.includes(packId)) issues.push(issue('integration-profile-missing-enabled-pack', `$.integrationProfileConfiguration[${index}].requiredOperationalPackIds`, `ملف التكامل المفعّل ${profile.titleAr} يحتاج إلى تفعيل الحزمة ${packId}.`));
    });
    if (profile.outputProfileId && !outputProfileIds.includes(profile.outputProfileId)) issues.push(issue('unknown-output-profile', `$.integrationProfileConfiguration[${index}].outputProfileId`, `ملف التكامل يشير إلى ملف إخراج غير معروف.`));
  });
  duplicateValues(outputProfileIds).forEach((profileId) => issues.push(issue('duplicate-output-profile', '$.projectionProfileConfiguration', `معرّف ملف الإخراج ${profileId} مكرر.`)));

  const captureEnabled = eventPackage.operationalPackConfiguration.enabledPackIds.includes('operational-capture');
  if (captureEnabled) {
    const enabledInputProfiles = eventPackage.integrationProfileConfiguration.filter(isEnabledInputIntegrationProfile);
    if (!enabledInputProfiles.length) issues.push(issue(
      'capture-pack-without-executable-profile',
      '$.integrationProfileConfiguration',
      'حزمة الالتقاط التشغيلي المفعلة تحتاج إلى ملف إدخال يطابق موائماً مرجعياً قابلاً للتنفيذ.'
    ));
    eventPackage.integrationProfileConfiguration.forEach((profile, profileIndex) => {
      if (!isEnabledInputIntegrationProfile(profile) || findExecutableInputAdapterManifest(profile)) return;
      issues.push(issue(
        'enabled-input-profile-not-executable',
        `$.integrationProfileConfiguration[${profileIndex}]`,
        `ملف التكامل المفعّل ${profile.titleAr} لا يطابق موائماً إدخالياً مرجعياً قابلاً للتنفيذ محلياً.`
      ));
    });
    if (!eventPackage.temporaryDemoSeedData.captureFixtures.length) issues.push(issue(
      'capture-pack-without-fixture',
      '$.temporaryDemoSeedData.captureFixtures',
      'حزمة الالتقاط التشغيلي المفعلة تحتاج إلى سجل تجريبي صالح لاختبار حد النزاهة المحلي.'
    ));
  }

  const projectionEnabled = eventPackage.operationalPackConfiguration.enabledPackIds.includes('projection-preview');
  if (projectionEnabled && !eventPackage.projectionProfileConfiguration.length) issues.push(issue(
    'projection-pack-without-profile',
    '$.projectionProfileConfiguration',
    'معاينة الإسقاط المفعلة تحتاج إلى ملف إسقاط محلي محدد.'
  ));
  if (projectionEnabled && !eventPackage.physicalOutputProfileConfiguration.length) issues.push(issue(
    'projection-pack-without-output-metadata',
    '$.physicalOutputProfileConfiguration',
    'معاينة المخرج المادي تحتاج إلى بيانات تعريف ملف إخراج محلي غير متصل.'
  ));

  const configuredPackIds = Object.keys(eventPackage.operationalPackConfiguration.configurationByPackId);
  configuredPackIds.forEach((packId) => {
    if (!eventPackage.operationalPackConfiguration.enabledPackIds.includes(packId)) issues.push(issue(
      'configuration-for-disabled-pack',
      `$.operationalPackConfiguration.configurationByPackId.${packId}`,
      `توجد تهيئة للحزمة ${packId} رغم أنها غير مفعلة.`
    ));
  });
  eventPackage.operationalPackConfiguration.enabledPackIds.forEach((packId) => {
    if (!eventPackage.operationalPackConfiguration.configurationByPackId[packId]) issues.push(issue(
      'missing-enabled-pack-configuration',
      `$.operationalPackConfiguration.configurationByPackId.${packId}`,
      `الحزمة المفعلة ${packId} لا تملك تهيئة تنفيذية محددة.`
    ));
  });

  const packResolution = resolveOperationalPacks({
    enabledPackIds: eventPackage.operationalPackConfiguration.enabledPackIds,
    configurationByPackId: eventPackage.operationalPackConfiguration.configurationByPackId,
    entityTypes,
    roleIds,
    authorityIds,
    integrationProfileIds: enabledIntegrationProfileIds,
    outputProfileIds,
    supportedCapabilityIds: supportedCapabilities
  });
  issues.push(...packResolution.issues);
  eventPackage.eventTemplate.defaultOperationalPackIds.forEach((packId) => {
    if (!eventPackage.operationalPackConfiguration.enabledPackIds.includes(packId)) issues.push(issue('missing-template-default-pack', `$.eventTemplate.defaultOperationalPackIds.${packId}`, `حزمة القالب الافتراضية ${packId} غير مفعلة في المثيل.`));
  });
  issues.push(...validateScenarioPlayerConfiguration(
    eventPackage.operationalPackConfiguration,
    knownEntityIds,
    routes
  ));
  issues.push(...validateEventPackageDependencies(eventPackage, options.packageCatalog));
  return issues;
}

function validateSeedMetadata(eventPackage: EventPackage): EventPackageValidationIssue[] {
  const issues: EventPackageValidationIssue[] = [];
  const groups = [
    ['readinessRecords', eventPackage.temporaryDemoSeedData.readinessRecords],
    ['decisionRecords', eventPackage.temporaryDemoSeedData.decisionRecords],
    ['captureFixtures', eventPackage.temporaryDemoSeedData.captureFixtures]
  ] as const;
  groups.forEach(([groupName, seeds]) => seeds.forEach((seed, index) => {
    const path = `$.temporaryDemoSeedData.${groupName}[${index}]`;
    if (seed.stateContext !== 'temporary-demo' || seed.dataClassification !== 'temporary-demo') issues.push(issue('cross-context-seed-data', path, 'كل سجل بذري في الحزمة يجب أن يبقى بيانات تجريبية مؤقتة.'));
    if (!seed.source.trim() || !seed.createdBy.trim() || !Number.isFinite(Date.parse(seed.createdAt)) || seed.revision < 1) issues.push(issue('invalid-seed-governance', path, 'بيانات حوكمة السجل البذري غير مكتملة.'));
  }));
  return issues;
}

async function validateSeedRecords(eventPackage: EventPackage): Promise<EventPackageValidationIssue[]> {
  const issues: EventPackageValidationIssue[] = [];
  const knownEntityIds = eventPackage.spatialConfiguration.entities.map((entity) => entity.id);
  const knownZoneIds = eventPackage.spatialConfiguration.entities.filter((entity) => entity.type === 'zone').map((entity) => entity.id);
  const readiness = eventPackage.temporaryDemoSeedData.readinessRecords.map((seed) => seed.record);
  const readinessResult = validateZoneReadinessDataset(readiness, knownZoneIds, { targetStateContext: 'temporary-demo' });
  readinessResult.issues.forEach((recordIssue) => issues.push(issue(
    recordIssue.code === 'unknown-zone-id' ? 'readiness-unknown-zone' : recordIssue.code,
    `$.temporaryDemoSeedData.readinessRecords.${recordIssue.recordId}.${recordIssue.field}`,
    recordIssue.messageAr,
    recordIssue.severity === 'warning' ? 'warning' : 'blocking'
  )));
  readiness.forEach((record, index) => {
    if (record.stateContext !== 'temporary-demo') issues.push(issue('baseline-seed-in-temporary-package', `$.temporaryDemoSeedData.readinessRecords[${index}].record.stateContext`, 'لا يمكن إدخال حالة أساسية أو سيناريو داخل حزمة تفعيل مؤقتة.'));
    record.relatedRouteIds.forEach((routeId) => {
      if (!eventPackage.routeConfiguration.routes.some((route) => route.id === routeId)) issues.push(issue('unknown-readiness-route', `$.temporaryDemoSeedData.readinessRecords[${index}].record.relatedRouteIds`, `سجل الجاهزية يشير إلى المسار غير المعروف ${routeId}.`));
    });
  });
  const decisions = eventPackage.temporaryDemoSeedData.decisionRecords.map((seed) => seed.record);
  const decisionResult = validateDecisionDataset(decisions, {
    knownEntityIds,
    knownEventIds: [eventPackage.eventInstance.eventInstanceId],
    knownVenueIds: [eventPackage.eventInstance.venueId],
    targetStateContext: 'temporary-demo',
    sourceFormat: 'runtime'
  });
  decisionResult.issues.forEach((recordIssue) => issues.push(issue(
    recordIssue.code === 'unknown-related-entity' ? 'decision-unknown-entity' : recordIssue.code,
    `$.temporaryDemoSeedData.decisionRecords.${recordIssue.recordId}.${recordIssue.path}`,
    recordIssue.messageAr,
    recordIssue.blocking ? 'blocking' : 'warning'
  )));
  decisions.forEach((record, index) => {
    if (record.stateContext !== 'temporary-demo') issues.push(issue('baseline-seed-in-temporary-package', `$.temporaryDemoSeedData.decisionRecords[${index}].record.stateContext`, 'لا يمكن إدخال قرار أساسي أو سيناريو داخل حزمة تفعيل مؤقتة.'));
    if (record.eventId !== eventPackage.eventInstance.eventInstanceId || record.venueId !== eventPackage.eventInstance.venueId) issues.push(issue('cross-event-relationship', `$.temporaryDemoSeedData.decisionRecords[${index}].record`, 'القرار يشير إلى فعالية أو موقع خارج نطاق الحزمة.'));
  });
  const knownEntities = new Set(knownEntityIds);
  for (const [index, seed] of eventPackage.temporaryDemoSeedData.captureFixtures.entries()) {
    const capture = seed.record;
    const captureIssues = await validateCaptureEnvelopeIntegrity(capture);
    captureIssues.forEach((captureIssue) => issues.push(issue(captureIssue.code, `$.temporaryDemoSeedData.captureFixtures[${index}]${captureIssue.path}`, captureIssue.messageAr, captureIssue.blocking ? 'blocking' : 'warning')));
    const profile = eventPackage.integrationProfileConfiguration.find((candidate) =>
      candidate.enabled
      && candidate.adapterId === capture.adapterId
      && candidate.adapterVersion === capture.adapterVersion
    );
    if (!profile) issues.push(issue('capture-unknown-adapter', `$.temporaryDemoSeedData.captureFixtures[${index}].record.adapterId`, 'غلاف الالتقاط يشير إلى موائم غير معرف في ملف التكامل.'));
    if (profile && !profile.sourceSystemIds.includes(capture.sourceSystemId)) issues.push(issue('capture-unknown-source', `$.temporaryDemoSeedData.captureFixtures[${index}].record.sourceSystemId`, 'غلاف الالتقاط يشير إلى نظام مصدر غير مسجل في ملف التكامل.'));
    if (capture.stateContext !== 'temporary-demo') issues.push(issue('cross-context-seed-data', `$.temporaryDemoSeedData.captureFixtures[${index}].record.stateContext`, 'غلاف الالتقاط يجب أن يبقى في السياق التجريبي المؤقت.'));
    const data = isRecord(capture.payload) && isRecord(capture.payload.data) ? capture.payload.data : {};
    if (data.eventRef !== eventPackage.eventInstance.eventInstanceId || data.venueId !== eventPackage.eventInstance.venueId) issues.push(issue('capture-cross-event-reference', `$.temporaryDemoSeedData.captureFixtures[${index}].record.payload.data`, 'غلاف الالتقاط يشير إلى فعالية أو موقع خارج الحزمة.'));
    if (typeof data.entityId !== 'string' || !knownEntities.has(data.entityId as SpatialEntityId)) issues.push(issue('capture-unknown-entity', `$.temporaryDemoSeedData.captureFixtures[${index}].record.payload.data.entityId`, 'غلاف الالتقاط يشير إلى عنصر مكاني غير معروف.'));
    const manifest = referenceAdapterManifests.find((candidate) =>
      candidate.inputOrOutput === 'input'
      && candidate.adapterId === capture.adapterId
      && candidate.version === capture.adapterVersion
    );
    if (!manifest) {
      issues.push(issue(
        'capture-adapter-not-executable',
        `$.temporaryDemoSeedData.captureFixtures[${index}].record.adapterId`,
        'ملف الالتقاط المفعّل لا يطابق موائماً مرجعياً قابلاً للتنفيذ داخل المختبر المحلي.'
      ));
      continue;
    }
    try {
      const adapter = new ReferenceInputAdapter(manifest);
      const observation = adapter.normalize(capture);
      const eventId = operationalEventIdFromObservation(observation);
      const provenance = adapter.createProvenance(observation, eventId);
      const provenanceResult = new ProvenanceResolver([provenance]).resolve({
        provenanceRefs: [provenance.bundleId],
        eventId,
        stateContext: capture.stateContext,
        sourceRecordId: capture.sourceRecordId,
        sourceSystemId: capture.sourceSystemId,
        adapterId: capture.adapterId,
        adapterVersion: capture.adapterVersion
      });
      provenanceResult.issues.forEach((provenanceIssue) => issues.push(issue(
        provenanceIssue.code,
        `$.temporaryDemoSeedData.captureFixtures[${index}]${provenanceIssue.path}`,
        provenanceIssue.messageAr,
        provenanceIssue.blocking ? 'blocking' : 'warning'
      )));
    } catch (error) {
      const field = error instanceof Error ? error.message.replace('missing:', '') : 'payload.data';
      issues.push(issue(
        'capture-normalization-failed',
        `$.temporaryDemoSeedData.captureFixtures[${index}].record.payload.data.${field}`,
        `تعذر تطبيع سجل الالتقاط المحلي عند الحقل ${field}.`
      ));
    }
  }
  return issues;
}

export async function validateEventPackage(value: unknown, options: EventPackageValidationOptions = {}): Promise<EventPackageValidationResult> {
  try {
    const schema = validateEventPackageSchema(value);
    if (!schema.valid) return { valid: false, schemaValid: false, contentHashValid: false, issues: schema.issues, runtime: null };
    const eventPackage = structuredClone(value) as EventPackage;
    const issues = [
      ...validateSemantics(eventPackage, options),
      ...validateSeedMetadata(eventPackage),
      ...await validateSeedRecords(eventPackage)
    ];
    const expectedHash = await createEventPackageContentHash(eventPackage);
    const contentHashValid = isEventPackageContentHash(eventPackage.packageContentHash) && eventPackage.packageContentHash === expectedHash;
    if (!contentHashValid) issues.push(issue('invalid-package-content-hash', '$.packageContentHash', 'هوية محتوى الحزمة لا تطابق محتواها القانوني.'));
    let runtime = null;
    if (!issues.some((currentIssue) => currentIssue.severity === 'blocking')) {
      runtime = createEventRuntimeConfiguration(eventPackage);
      issues.push(...verifyEventRuntimeHealth(runtime));
    }
    const valid = !issues.some((currentIssue) => currentIssue.severity === 'blocking');
    return { valid, schemaValid: true, contentHashValid, issues, runtime: valid ? runtime : null };
  } catch {
    return {
      valid: false,
      schemaValid: false,
      contentHashValid: false,
      runtime: null,
      issues: [issue(
        'event-package-validation-failed',
        '$',
        'تعذر التحقق من الحزمة بأمان بسبب بنية داخلية غير مدعومة؛ لم تتغير الحالة النشطة.'
      )]
    };
  }
}

export async function validateEventPackageCollection(values: unknown[]): Promise<Map<number, EventPackageValidationResult>> {
  const ids = values.map((value) => isRecord(value) && typeof value.packageId === 'string' ? value.packageId : '').filter(Boolean);
  const duplicateIds = new Set(duplicateValues(ids));
  const catalog = values.filter((value): value is EventPackage => validateEventPackageSchema(value).valid);
  const initialResults = await Promise.all(values.map(async (value) =>
    validateEventPackage(value, { packageCatalog: catalog })
  ));
  const results = new Map<number, EventPackageValidationResult>();
  values.forEach((value, index) => {
    const packageId = isRecord(value) && typeof value.packageId === 'string' ? value.packageId : '';
    const result = initialResults[index]!;
    if (duplicateIds.has(packageId)) {
      result.issues.push(issue('duplicate-package-id', '$.packageId', `معرّف الحزمة ${packageId} مكرر في مجموعة الاستيراد.`));
      result.valid = false;
      result.runtime = null;
    }
    results.set(index, result);
  });

  const indicesByPackageId = new Map<string, number[]>();
  values.forEach((value, index) => {
    if (!isRecord(value) || typeof value.packageId !== 'string') return;
    const indices = indicesByPackageId.get(value.packageId) ?? [];
    indices.push(index);
    indicesByPackageId.set(value.packageId, indices);
  });

  let changed = true;
  while (changed) {
    changed = false;
    catalog.forEach((eventPackage) => {
      const packageIndex = values.findIndex((value) => value === eventPackage);
      const result = results.get(packageIndex);
      if (!result) return;
      eventPackage.dependencies.forEach((dependency, dependencyIndex) => {
        const dependencyIndices = indicesByPackageId.get(dependency.packageId) ?? [];
        if (dependencyIndices.length === 0) return;
        const dependencyInvalid = dependencyIndices.length !== 1
          || !results.get(dependencyIndices[0]!)?.valid;
        const alreadyReported = result.issues.some((currentIssue) =>
          currentIssue.code === 'invalid-required-package-dependency'
          && currentIssue.path === `$.dependencies[${dependencyIndex}]`
        );
        if (!dependencyInvalid || alreadyReported) return;
        result.issues.push(issue(
          'invalid-required-package-dependency',
          `$.dependencies[${dependencyIndex}]`,
          `تعذر اعتماد الحزمة لأن الاعتماد المطلوب ${dependency.packageId} غير صالح بالكامل داخل مجموعة الحزم.`
        ));
        result.valid = false;
        result.runtime = null;
        changed = true;
      });
    });
  }
  return results;
}
