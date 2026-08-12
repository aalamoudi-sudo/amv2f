import type {
  EventPackage,
  EventRuntimeConfiguration,
  EventPackageValidationIssue
} from '../types/eventPackage';
import type { SpatialEntityId, SpatialEntityRecord } from '../types/spatial';
import { resolveOperationalPacks } from './operationalPackRegistry';
import {
  getScenarioPlayerPackConfiguration,
  validateScenarioPlayerConfiguration
} from './scenarioPackValidation';
import { stableSerialize } from './integrationHash';

export function canonicalScenarioConfiguration(
  operationalPacks: EventRuntimeConfiguration['operationalPackConfiguration']
): string | null {
  const configuration = getScenarioPlayerPackConfiguration(operationalPacks);
  return configuration ? stableSerialize(configuration) : null;
}

export function eventRuntimeScopeKey(
  eventInstanceId: string,
  venueId: string,
  stateContext: string
): string {
  return `${eventInstanceId}::${venueId}::${stateContext}`;
}

export function createEventRuntimeConfiguration(eventPackage: EventPackage): EventRuntimeConfiguration {
  const entities = eventPackage.spatialConfiguration.entities.reduce<SpatialEntityRecord>((record, entity) => {
    record[entity.id] = structuredClone(entity);
    return record;
  }, {} as SpatialEntityRecord);
  const outputProfileIds = [
    ...eventPackage.projectionProfileConfiguration.map((profile) => profile.outputProfileId),
    ...eventPackage.physicalOutputProfileConfiguration.map((profile) => profile.outputProfileId)
  ];
  const packs = resolveOperationalPacks({
    enabledPackIds: eventPackage.operationalPackConfiguration.enabledPackIds,
    configurationByPackId: eventPackage.operationalPackConfiguration.configurationByPackId,
    entityTypes: eventPackage.spatialConfiguration.entities.map((entity) => entity.type),
    roleIds: eventPackage.roleConfiguration.map((role) => role.roleId),
    authorityIds: eventPackage.authorityConfiguration.map((authority) => authority.authorityId),
    integrationProfileIds: eventPackage.integrationProfileConfiguration
      .filter((profile) => profile.enabled)
      .map((profile) => profile.integrationProfileId),
    outputProfileIds
  });

  return {
    identity: {
      packageId: eventPackage.packageId,
      packageVersion: eventPackage.packageVersion,
      packageContentHash: eventPackage.packageContentHash,
      eventInstanceId: eventPackage.eventInstance.eventInstanceId,
      eventTemplateId: eventPackage.eventTemplate.eventTemplateId,
      eventType: eventPackage.eventType,
      eventNameAr: eventPackage.eventInstance.eventNameAr,
      eventNameEn: eventPackage.eventInstance.eventNameEn,
      venueId: eventPackage.eventInstance.venueId,
      stateContext: 'temporary-demo',
      dataClassification: 'temporary-demo'
    },
    entities,
    entityLabels: { ...eventPackage.spatialConfiguration.entityLabels },
    routes: structuredClone(eventPackage.routeConfiguration.routes),
    requirements: structuredClone(eventPackage.requirementConfiguration),
    roles: structuredClone(eventPackage.roleConfiguration),
    authorities: structuredClone(eventPackage.authorityConfiguration),
    enabledOperationalPacks: structuredClone(packs.orderedPacks),
    operationalPackConfiguration: structuredClone(eventPackage.operationalPackConfiguration),
    integrationProfiles: structuredClone(eventPackage.integrationProfileConfiguration),
    integrationProfilesCanonical: stableSerialize(eventPackage.integrationProfileConfiguration),
    captureFixtures: eventPackage.temporaryDemoSeedData.captureFixtures.map((seed) => structuredClone(seed.record)),
    scenarioConfigurationCanonical: canonicalScenarioConfiguration(eventPackage.operationalPackConfiguration),
    projectionProfiles: structuredClone(eventPackage.projectionProfileConfiguration),
    physicalOutputProfiles: structuredClone(eventPackage.physicalOutputProfileConfiguration),
    spatialConfiguration: {
      siteBoundaryId: eventPackage.spatialConfiguration.siteBoundaryId,
      venueIds: structuredClone(eventPackage.spatialConfiguration.venueIds),
      localCoordinateSystem: structuredClone(eventPackage.spatialConfiguration.localCoordinateSystem),
      geographicReference: structuredClone(eventPackage.spatialConfiguration.geographicReference),
      modelReferences: structuredClone(eventPackage.spatialConfiguration.modelReferences),
      spatialMappingVersion: eventPackage.spatialConfiguration.spatialMappingVersion,
      projectionProfileVersion: eventPackage.spatialConfiguration.projectionProfileVersion,
      physicalOutputMappingVersion: eventPackage.spatialConfiguration.physicalOutputMappingVersion
    },
    readinessRecords: eventPackage.temporaryDemoSeedData.readinessRecords.map((seed) => structuredClone(seed.record)),
    decisions: eventPackage.temporaryDemoSeedData.decisionRecords.map((seed) => structuredClone(seed.record)),
    scopeKey: eventRuntimeScopeKey(
      eventPackage.eventInstance.eventInstanceId,
      eventPackage.eventInstance.venueId,
      eventPackage.eventInstance.stateContext
    )
  };
}

export function verifyEventRuntimeHealth(runtime: EventRuntimeConfiguration): EventPackageValidationIssue[] {
  const issues: EventPackageValidationIssue[] = [];
  const blocking = (code: string, path: string, messageAr: string) => issues.push({ code, path, messageAr, severity: 'blocking' });
  if (runtime.identity.stateContext !== 'temporary-demo') blocking('runtime-context-not-temporary-demo', '$.identity.stateContext', 'لا يمكن تفعيل الحزمة محلياً خارج سياق البيانات التجريبية المؤقتة.');
  if (runtime.scopeKey !== eventRuntimeScopeKey(runtime.identity.eventInstanceId, runtime.identity.venueId, runtime.identity.stateContext)) {
    blocking('runtime-scope-key-mismatch', '$.scopeKey', 'مفتاح عزل الفعالية لا يطابق معرف الفعالية والموقع والسياق.');
  }
  if (Object.keys(runtime.entities).length === 0) blocking('runtime-empty-entities', '$.entities', 'لا يمكن تشغيل حزمة بلا عناصر مكانية.');
  if (!Object.values(runtime.entities).some((entity) => entity.type === 'site')) blocking('runtime-missing-site', '$.entities', 'الحزمة التشغيلية تحتاج إلى حدود موقع واحدة على الأقل.');
  if (runtime.readinessRecords.some((record) => record.stateContext !== 'temporary-demo')) blocking('runtime-seed-context-mismatch', '$.readinessRecords', 'سجلات الجاهزية النشطة يجب أن تبقى بيانات تجريبية مؤقتة.');
  if (runtime.decisions.some((record) => record.stateContext !== 'temporary-demo')) blocking('runtime-decision-context-mismatch', '$.decisions', 'القرارات النشطة يجب أن تبقى بيانات تجريبية مؤقتة.');
  const enabledPackIds = runtime.enabledOperationalPacks.map((pack) => pack.packId).sort();
  const configuredPackIds = [...runtime.operationalPackConfiguration.enabledPackIds].sort();
  if (enabledPackIds.join('|') !== configuredPackIds.join('|')) blocking('runtime-pack-state-mismatch', '$.operationalPackConfiguration.enabledPackIds', 'قائمة الحزم المفعلة لا تطابق قدرات جلسة التشغيل الحالية.');
  const knownEntityIds = new Set(Object.keys(runtime.entities) as SpatialEntityId[]);
  if (Object.prototype.hasOwnProperty.call(runtime, 'scenarioPlayer')) {
    blocking('runtime-duplicate-scenario-representation', '$.scenarioPlayer', 'تحتوي جلسة التشغيل تمثيلاً قديماً مستقلاً للسيناريو؛ يجب استخدام تهيئة الحزمة التشغيلية وحدها.');
  }
  const canonicalScenario = canonicalScenarioConfiguration(runtime.operationalPackConfiguration);
  if (runtime.scenarioConfigurationCanonical !== canonicalScenario) {
    blocking('runtime-scenario-configuration-mismatch', '$.scenarioConfigurationCanonical', 'تهيئة السيناريو التنفيذية لا تطابق التهيئة القانونية التي اجتازت التحقق.');
  }
  if (runtime.integrationProfilesCanonical !== stableSerialize(runtime.integrationProfiles)) {
    blocking('runtime-integration-profile-mismatch', '$.integrationProfilesCanonical', 'تهيئة ملفات التكامل التنفيذية لا تطابق التهيئة القانونية التي اجتازت التحقق.');
  }
  if (runtime.routes.some((route) => !knownEntityIds.has(route.entityId))) blocking('runtime-route-entity-mismatch', '$.routes', 'يوجد مسار لا ينتمي إلى عناصر جلسة التشغيل الحالية.');
  if (runtime.readinessRecords.some((record) => !knownEntityIds.has(record.zoneId))) blocking('runtime-readiness-entity-mismatch', '$.readinessRecords', 'يوجد سجل جاهزية خارج عناصر جلسة التشغيل الحالية.');
  if (runtime.decisions.some((record) =>
    record.eventId !== runtime.identity.eventInstanceId
    || record.venueId !== runtime.identity.venueId
    || record.relationships.some((relation) => !knownEntityIds.has(relation.entityId) || relation.stateContext !== record.stateContext)
  )) blocking('runtime-decision-scope-mismatch', '$.decisions', 'يوجد قرار أو علاقة مكانية خارج نطاق الفعالية النشطة.');
  issues.push(...validateScenarioPlayerConfiguration(
    runtime.operationalPackConfiguration,
    knownEntityIds,
    runtime.routes
  ));
  if (enabledPackIds.includes('scenario-player') && !getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)?.scenarios.length) blocking('runtime-scenario-pack-missing', '$.operationalPackConfiguration', 'مشغل التمرين مفعّل من دون سيناريو صالح.');
  if (enabledPackIds.includes('operational-capture')) {
    if (!runtime.integrationProfiles.some((profile) => profile.enabled) || !runtime.captureFixtures.length) blocking('runtime-capture-pack-incomplete', '$.integrationProfiles', 'حزمة الالتقاط مفعلة من دون ملف تكامل وسجل اختبار صالحين.');
  }
  if (enabledPackIds.includes('projection-preview') && !runtime.projectionProfiles.length) blocking('runtime-projection-pack-incomplete', '$.projectionProfiles', 'معاينة الإسقاط مفعلة من دون ملف إسقاط.');
  return issues;
}
