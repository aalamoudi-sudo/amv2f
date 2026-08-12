import type { FrozenPilotPackage, PilotIdMappingRecord, PilotIdMappingReport, PilotSourceBundle, PilotValidationIssue } from '../types/pilotAuthoring';
import type { EntityType, SpatialEntityId } from '../types/spatial';

const entityPrefixes: Record<EntityType, string> = {
  site: 'SITE-',
  zone: 'ZONE-',
  hall: 'HALL-',
  gate: 'GATE-',
  route: 'ROUTE-',
  stage: 'STAGE-',
  parking: 'PARK-',
  service: 'SERVICE-',
  assembly: 'ASSEMBLY-',
  asset: 'ASSET-'
};

function issue(code: string, path: string, messageAr: string): PilotValidationIssue {
  return { code, path, messageAr, severity: 'blocking', category: 'identity' };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  values.forEach((value) => seen.has(value) ? repeated.add(value) : seen.add(value));
  return [...repeated];
}

function mappingRecords(bundle: PilotSourceBundle, frozenIds = new Set<string>()): PilotIdMappingRecord[] {
  return [
    { id: bundle.eventId, kind: 'event', labelAr: bundle.eventNameAr, labelEn: bundle.eventNameEn, sourcePath: '$.eventId', frozen: frozenIds.has(bundle.eventId) },
    { id: bundle.venueId, kind: 'venue', labelAr: 'موقع الفعالية', labelEn: 'Event venue', sourcePath: '$.venueId', frozen: frozenIds.has(bundle.venueId) },
    ...bundle.entities.map((entity, index) => ({ id: entity.id, kind: entity.type, labelAr: entity.nameAr, labelEn: entity.nameEn, sourcePath: `$.entities[${index}].id`, frozen: frozenIds.has(entity.id) })),
    ...bundle.requirements.map((record, index) => ({ id: record.requirementId, kind: 'requirement' as const, labelAr: record.titleAr, labelEn: record.requirementId, sourcePath: `$.requirements[${index}].requirementId`, frozen: frozenIds.has(record.requirementId) })),
    ...bundle.decisionRecords.map((record, index) => ({ id: record.decisionId, kind: 'decision' as const, labelAr: record.title, labelEn: record.decisionId, sourcePath: `$.decisionRecords[${index}].decisionId`, frozen: frozenIds.has(record.decisionId) })),
    ...bundle.roles.map((record, index) => ({ id: record.roleId, kind: 'role' as const, labelAr: record.titleAr, labelEn: record.titleEn, sourcePath: `$.roles[${index}].roleId`, frozen: frozenIds.has(record.roleId) })),
    ...bundle.authorities.map((record, index) => ({ id: record.authorityId, kind: 'authority' as const, labelAr: record.titleAr, labelEn: record.titleEn, sourcePath: `$.authorities[${index}].authorityId`, frozen: frozenIds.has(record.authorityId) })),
    ...bundle.evidenceRegister.map((record, index) => ({ id: record.evidenceId, kind: 'evidence' as const, labelAr: record.titleAr, labelEn: record.evidenceId, sourcePath: `$.evidenceRegister[${index}].evidenceId`, frozen: frozenIds.has(record.evidenceId) })),
    ...bundle.integrationProfiles.map((record, index) => ({ id: record.integrationProfileId, kind: 'integration-profile' as const, labelAr: record.titleAr, labelEn: record.titleEn, sourcePath: `$.integrationProfiles[${index}].integrationProfileId`, frozen: frozenIds.has(record.integrationProfileId) }))
  ];
}

function frozenRecords(frozen: FrozenPilotPackage | null): PilotIdMappingRecord[] {
  if (!frozen) return [];
  return frozen.idMappingReport.records;
}

export function validatePilotIdGovernance(
  bundle: PilotSourceBundle,
  frozen: FrozenPilotPackage | null = null
): PilotIdMappingReport {
  const issues: PilotValidationIssue[] = [];
  const frozenMapping = frozenRecords(frozen);
  const frozenIds = new Set(frozenMapping.map((record) => record.id));
  const records = mappingRecords(bundle, frozenIds);
  const entityIds = bundle.entities.map((entity) => entity.id);
  const knownEntityIds = new Set<SpatialEntityId>(entityIds);
  const routeIds = bundle.routes.map((route) => route.id);
  const knownRouteIds = new Set(routeIds);

  const categorySets: Array<[string, string[], string]> = [
    ['العناصر', entityIds, '$.entities'],
    ['المسارات', routeIds, '$.routes'],
    ['المتطلبات', bundle.requirements.map((record) => record.requirementId), '$.requirements'],
    ['القرارات', bundle.decisionRecords.map((record) => record.decisionId), '$.decisionRecords'],
    ['الأدوار', bundle.roles.map((record) => record.roleId), '$.roles'],
    ['جهات الصلاحية', bundle.authorities.map((record) => record.authorityId), '$.authorities'],
    ['الأدلة', bundle.evidenceRegister.map((record) => record.evidenceId), '$.evidenceRegister'],
    ['ملفات التكامل', bundle.integrationProfiles.map((record) => record.integrationProfileId), '$.integrationProfiles']
  ];
  categorySets.forEach(([label, ids, path]) => duplicates(ids).forEach((id) => issues.push(issue('pilot-duplicate-id', path, `المعرّف ${id} مكرر داخل فئة ${label}.`))));

  bundle.entities.forEach((entity, index) => {
    if (!entity.id.startsWith(entityPrefixes[entity.type])) issues.push(issue('pilot-invalid-id-prefix', `$.entities[${index}].id`, `معرّف ${entity.nameAr} لا يطابق بادئة نوعه ${entityPrefixes[entity.type]}.`));
    if (entity.type === 'site' && entity.parentId !== null) issues.push(issue('pilot-invalid-site-parent', `$.entities[${index}].parentId`, `عنصر الموقع ${entity.id} يجب ألا يملك أباً مكانياً.`));
    if (entity.type !== 'site' && (!entity.parentId || !knownEntityIds.has(entity.parentId))) issues.push(issue('pilot-dangling-parent', `$.entities[${index}].parentId`, `العنصر ${entity.id} يحتاج إلى أب مكاني معروف.`));
    const visited = new Set<string>([entity.id]);
    let parentId = entity.parentId;
    while (parentId) {
      if (visited.has(parentId)) {
        issues.push(issue('pilot-parent-cycle', `$.entities[${index}].parentId`, `علاقة الأب للعنصر ${entity.id} تحتوي دورة غير صالحة.`));
        break;
      }
      visited.add(parentId);
      parentId = bundle.entities.find((candidate) => candidate.id === parentId)?.parentId ?? null;
    }
  });

  if (!knownEntityIds.has(bundle.spatialProfile.siteBoundaryId)) issues.push(issue('pilot-unknown-site-boundary', '$.spatialProfile.siteBoundaryId', 'حد الموقع يشير إلى عنصر غير معروف.'));
  bundle.routes.forEach((route, routeIndex) => {
    if (route.entityId !== route.id || !knownEntityIds.has(route.entityId)) issues.push(issue('pilot-route-entity-mismatch', `$.routes[${routeIndex}].entityId`, `المسار ${route.id} يحتاج إلى عنصر مكاني مطابق بالمعرّف نفسه.`));
    route.relatedEntityIds.forEach((entityId, relationIndex) => {
      if (!knownEntityIds.has(entityId)) issues.push(issue('pilot-dangling-route-reference', `$.routes[${routeIndex}].relatedEntityIds[${relationIndex}]`, `المسار ${route.id} يشير إلى العنصر غير المعروف ${entityId}.`));
    });
  });
  bundle.requirements.forEach((record, index) => {
    if (!knownEntityIds.has(record.entityId)) issues.push(issue('pilot-dangling-requirement', `$.requirements[${index}].entityId`, `المتطلب ${record.requirementId} يشير إلى عنصر غير معروف.`));
  });
  bundle.readinessRecords.forEach((record, index) => {
    if (!knownEntityIds.has(record.zoneId)) issues.push(issue('pilot-dangling-readiness-zone', `$.readinessRecords[${index}].zoneId`, `سجل الجاهزية يشير إلى المنطقة غير المعروفة ${record.zoneId}.`));
    record.dependencies.forEach((entityId, relationIndex) => {
      if (!knownEntityIds.has(entityId)) issues.push(issue('pilot-dangling-readiness-dependency', `$.readinessRecords[${index}].dependencies[${relationIndex}]`, `اعتمادية الجاهزية تشير إلى العنصر غير المعروف ${entityId}.`));
    });
    record.relatedRouteIds.forEach((routeId, relationIndex) => {
      if (!knownRouteIds.has(routeId)) issues.push(issue('pilot-dangling-readiness-route', `$.readinessRecords[${index}].relatedRouteIds[${relationIndex}]`, `سجل الجاهزية يشير إلى المسار غير المعروف ${routeId}.`));
    });
  });
  bundle.decisionRecords.forEach((record, index) => {
    if (record.eventId !== bundle.eventId || record.venueId !== bundle.venueId) issues.push(issue('pilot-cross-event-decision', `$.decisionRecords[${index}]`, `القرار ${record.decisionId} خارج نطاق الفعالية أو الموقع المحدد.`));
    record.relationships.forEach((relation, relationIndex) => {
      if (!knownEntityIds.has(relation.entityId)) issues.push(issue('pilot-dangling-decision-relation', `$.decisionRecords[${index}].relationships[${relationIndex}].entityId`, `علاقة القرار تشير إلى العنصر غير المعروف ${relation.entityId}.`));
    });
  });
  bundle.spatialProfile.modelReferences.forEach((model, modelIndex) => Object.keys(model.entityNodeMap).forEach((entityId) => {
    if (!knownEntityIds.has(entityId as SpatialEntityId)) issues.push(issue('pilot-dangling-model-node', `$.spatialProfile.modelReferences[${modelIndex}].entityNodeMap.${entityId}`, `ربط النموذج يشير إلى العنصر غير المعروف ${entityId}.`));
  }));
  bundle.scenarioConfiguration.scenarios.forEach((scenario, scenarioIndex) => scenario.steps.forEach((step, stepIndex) => {
    const entityReferences = [step.focusEntityId, ...(step.highlightEntityIds ?? []), ...(step.changes ?? []).map((change) => change.entityId)].filter(Boolean) as SpatialEntityId[];
    entityReferences.forEach((entityId) => {
      if (!knownEntityIds.has(entityId)) issues.push(issue('pilot-dangling-scenario-entity', `$.scenarioConfiguration.scenarios[${scenarioIndex}].steps[${stepIndex}]`, `خطوة السيناريو تشير إلى العنصر غير المعروف ${entityId}.`));
    });
    [...(step.showRoutes ?? []), ...(step.hideRoutes ?? [])].forEach((routeId) => {
      if (!knownRouteIds.has(routeId)) issues.push(issue('pilot-dangling-scenario-route', `$.scenarioConfiguration.scenarios[${scenarioIndex}].steps[${stepIndex}]`, `خطوة السيناريو تشير إلى المسار غير المعروف ${routeId}.`));
    });
  }));
  const sourceIds = new Set(bundle.sourceRegister.map((record) => record.sourceId));
  bundle.evidenceRegister.forEach((record, index) => {
    if (!sourceIds.has(record.sourceId)) issues.push(issue('pilot-dangling-evidence-source', `$.evidenceRegister[${index}].sourceId`, `الدليل ${record.evidenceId} يشير إلى مصدر غير معروف.`));
  });

  let renamedIdCount = 0;
  if (frozen) {
    const currentIds = new Set(records.map((record) => record.id));
    frozenMapping.forEach((record) => {
      if (!currentIds.has(record.id)) issues.push(issue('pilot-frozen-id-changed', record.sourcePath, `المعرّف المجمّد ${record.id} مفقود من المراجعة الجديدة؛ يجب إنشاء مراجعة موثقة لا استبداله بصمت.`));
    });
    records.forEach((record) => {
      const renamed = frozenMapping.find((candidate) => candidate.kind === record.kind && candidate.labelAr === record.labelAr && candidate.id !== record.id);
      if (renamed) {
        renamedIdCount += 1;
        issues.push(issue('pilot-renamed-id', record.sourcePath, `تغيّر معرّف ${record.labelAr} من ${renamed.id} إلى ${record.id} بعد التجميد.`));
      }
    });
  }

  return {
    valid: issues.length === 0,
    records,
    issues,
    duplicateCount: issues.filter((current) => current.code === 'pilot-duplicate-id').length,
    danglingReferenceCount: issues.filter((current) => current.code.includes('dangling') || current.code.includes('unknown')).length,
    renamedIdCount
  };
}
