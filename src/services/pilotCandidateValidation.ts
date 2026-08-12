import { sha256Payload } from './integrationHash';
import {
  governedSourceStatusValues,
  pilotAuthoringLifecycleValues,
  type GovernedPilotSourceRecord,
  type PilotCandidateValidationIssue,
  type PilotCandidateValidationResult,
  type PilotEventPackageCandidate,
  type PilotFreezeGate
} from '../types/pilotCandidate';

const sha256Pattern = /^[a-f0-9]{64}$/i;
const eventIdPattern = /^EVENT-[A-Za-z0-9-]+$/;
const venueIdPattern = /^VENUE-[A-Za-z0-9-]+$/;
const entityIdPattern = /^(?:SITE|ZONE|HALL|GATE|ROUTE|STAGE|PARK|SERVICE|ASSEMBLY|ASSET)-[A-Za-z0-9-]+$/;

function issue(
  code: string,
  path: string,
  messageAr: string,
  severity: PilotCandidateValidationIssue['severity'] = 'blocking'
): PilotCandidateValidationIssue {
  return { code, path, messageAr, severity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  values.forEach((value) => seen.has(value) ? repeated.add(value) : seen.add(value));
  return [...repeated];
}

function sourceByType(candidate: PilotEventPackageCandidate, sourceType: GovernedPilotSourceRecord['sourceType']) {
  return candidate.sources.find((source) => source.sourceType === sourceType);
}

function gate(gateId: string, titleAr: string, passed: boolean, blockerAr: string, evidenceSourceIds: string[] = []): PilotFreezeGate {
  return {
    gateId,
    titleAr,
    status: passed ? 'passed' : 'blocked',
    evidenceSourceIds: passed ? evidenceSourceIds : [],
    blockerAr: passed ? null : blockerAr
  };
}

export function evaluatePilotFreezeGates(candidate: PilotEventPackageCandidate): PilotFreezeGate[] {
  const dwg = sourceByType(candidate, 'cad');
  const floorPlans = sourceByType(candidate, 'floor-plans');
  const visualIdentity = sourceByType(candidate, 'visual-identity');
  const externalAuthorityTypes = new Set(['client', 'hse', 'venue-opening', 'route', 'live-operations']);
  const externalAuthoritiesResolved = candidate.authorities
    .filter((authority) => externalAuthorityTypes.has(authority.authorityType))
    .every((authority) => authority.actorId && authority.verificationStatus === 'authoritative');
  const productionActorsResolved = candidate.actors
    .filter((actor) => actor.actorType === 'internal-candidate')
    .every((actor) => actor.identityStatus === 'authoritative' && actor.authoritativeIdentityId);
  const allMapped = candidate.stableEntityIds.every((entityId) => candidate.entities.some((entity) => (
    entity.entityId === entityId
    && entity.geometryMappingStatus === 'mapped-approved'
    && entity.geometrySourceId
    && entity.geometryReference
  )));
  const conversionAccepted = candidate.assets3d.every((asset) => (
    (!asset.conditionalScope || asset.sourceAvailable)
    && asset.webConversionStatus === 'completed'
    && asset.texturesVerified
    && asset.originVerified
    && asset.scaleVerified
    && asset.hierarchyVerified
  ));

  return [
    gate('FREEZE-GATE-DWG', 'مراجعة DWG معتمدة وبصمة محتوى', Boolean(dwg && dwg.sourceStatus === 'final-approved-source' && dwg.revision && dwg.contentHash), 'الملف الحالي مبدئي وغير معتمد.', dwg ? [dwg.sourceId] : []),
    gate('FREEZE-GATE-CRS', 'EPSG معتمد أو نقاط ضبط مساحية', Boolean(candidate.cadManifest.epsg), 'EPSG ونقاط الضبط غير متاحة.', [candidate.cadManifest.sourceRef]),
    gate('FREEZE-GATE-NORTH-ORIGIN', 'الشمال ونقطة الأصل المعتمدان', Boolean(candidate.cadManifest.northAuthority && candidate.cadManifest.originAuthority), 'الشمال ونقطة الأصل غير معروفين.', [candidate.cadManifest.sourceRef]),
    gate('FREEZE-GATE-ENTITY-MAPPING', 'ربط هندسة المناطق الخمس', allMapped, 'كل المناطق الخمس ما زالت بلا ربط هندسي.', [candidate.cadManifest.sourceRef]),
    gate('FREEZE-GATE-FLOOR-PLANS', 'مخططات الطوابق الرسمية', Boolean(floorPlans && floorPlans.sourceStatus === 'final-approved-source' && floorPlans.contentHash), 'مجلد Floor Plans مفقود المحتوى.', floorPlans ? [floorPlans.sourceId] : []),
    gate('FREEZE-GATE-2D-IDENTITY', 'أصول الهوية الرسمية ثنائية الأبعاد', Boolean(visualIdentity && visualIdentity.sourceStatus === 'final-approved-source' && visualIdentity.contentHash), 'مجلد 2D Identity مفقود المحتوى.', visualIdentity ? [visualIdentity.sourceId] : []),
    gate('FREEZE-GATE-ACTOR-IDENTITY', 'معرّفات ممثلين سلطوية للصلاحيات الإنتاجية', Boolean(productionActorsResolved), 'الأسماء لا تملك معرفات HR أو Actor سلطوية.'),
    gate('FREEZE-GATE-EVIDENCE-POLICY', 'سياسة الأدلة وسلسلة الحفظ', candidate.policyStatus.evidencePolicy === 'approved', 'سياسة الأدلة غير معتمدة.'),
    gate('FREEZE-GATE-PRIVACY-RETENTION', 'سياسة الخصوصية والاحتفاظ', candidate.policyStatus.privacyPolicy === 'approved' && candidate.policyStatus.retentionPolicy === 'approved', 'سياسة الخصوصية والاحتفاظ غير معتمدة.'),
    gate('FREEZE-GATE-AUTHORITY-SEPARATION', 'سلطات العميل وHSE والفتح والمسارات', externalAuthoritiesResolved, 'الفصل مصمم، لكن السلطات الخارجية وتفويضاتها لم تُثبت.'),
    gate('FREEZE-GATE-EVENT-YEAR', 'تأكيد سنة الفعالية', !candidate.event.dateAssumption, 'سنة 2026 مستنتجة ولم يؤكدها أحمد صراحة.'),
    gate('FREEZE-GATE-3D-CONVERSION', 'ملف تحويل ثلاثي الأبعاد مقبول عند طلب المخرج', conversionAccepted, 'لا توجد صادرات GLB أو FBX متحققة.')
  ];
}

function canonicalCandidateSource(candidate: PilotEventPackageCandidate): unknown {
  const content = structuredClone(candidate);
  content.sourceBundleHash = null;
  content.packageContentHash = null;
  content.freezeGates = evaluatePilotFreezeGates(content);
  content.validationSnapshot = {
    status: 'not-run',
    blockingIssueCount: 0,
    warningCount: 0,
    freezeBlockerCount: content.freezeGates.filter((gate) => gate.status === 'blocked').length
  };
  return content;
}

export async function createPilotCandidateSourceHash(candidate: PilotEventPackageCandidate): Promise<string> {
  return `PILOT-SOURCE-v1-${await sha256Payload(canonicalCandidateSource(candidate))}`;
}

export async function buildPilotCandidatePreview(candidate: PilotEventPackageCandidate): Promise<PilotEventPackageCandidate> {
  const preview = structuredClone(candidate);
  preview.freezeGates = evaluatePilotFreezeGates(preview);
  preview.sourceBundleHash = await createPilotCandidateSourceHash(preview);
  const validation = validatePilotEventPackageCandidate(preview);
  preview.validationSnapshot = {
    status: validation.validForAuthoring ? 'authoring-valid' : 'blocked',
    blockingIssueCount: validation.issues.filter((current) => current.severity === 'blocking').length,
    warningCount: validation.issues.filter((current) => current.severity === 'warning').length,
    freezeBlockerCount: validation.freezeGates.filter((gate) => gate.status === 'blocked').length
  };
  return preview;
}

function validateSources(candidate: PilotEventPackageCandidate, issues: PilotCandidateValidationIssue[]) {
  const sourceIds = candidate.sources.map((source) => source.sourceId);
  duplicates(sourceIds).forEach((sourceId) => issues.push(issue('pilot-source-id-duplicate', '$.sources', `معرّف المصدر ${sourceId} مكرر؛ لا يمكن تحديد سجل الحقيقة.`)));
  const sourceIdSet = new Set(sourceIds);
  const pathHashes = new Map<string, string>();
  const fingerprintOwners = new Map<string, string>();

  candidate.sources.forEach((source, index) => {
    const path = `$.sources[${index}]`;
    if (!governedSourceStatusValues.includes(source.sourceStatus)) issues.push(issue('pilot-source-status-invalid', `${path}.sourceStatus`, `تصنيف المصدر ${source.sourceId} غير معروف ولا يمكن ترقيته.`));
    if (source.contentHash !== null && !sha256Pattern.test(source.contentHash)) issues.push(issue('pilot-source-hash-invalid', `${path}.contentHash`, `بصمة المصدر ${source.sourceId} ليست SHA-256 صالحة.`));
    if (source.sourcePath && source.sourceStatus !== 'missing' && !source.contentHash) issues.push(issue('pilot-source-hash-missing', `${path}.contentHash`, `المصدر ${source.sourceId} يفتقد بصمة المحتوى المطلوبة.`));
    if (source.sourceStatus === 'final-approved-source' && !source.sourceAuthority) issues.push(issue('pilot-source-authority-missing', `${path}.sourceAuthority`, `المصدر ${source.sourceId} مصنف نهائياً بلا سلطة مصدر معلنة.`));
    if (source.sourceStatus === 'provisional-until-approved-revision-arrives' && source.permittedUses.includes('geometry')) issues.push(issue('pilot-provisional-geometry-promoted', `${path}.permittedUses`, `المخطط المبدئي ${source.sourceId} لا يجوز استخدامه كهندسة معتمدة.`));
    if ((source.sourceType === 'visual-reference' || source.sourceType === 'design-review') && source.permittedUses.includes('geometry')) issues.push(issue('pilot-visual-used-as-geometry', `${path}.permittedUses`, `الصور أو الرندرات في ${source.sourceId} مرجع بصري فقط وليست هندسة.`));
    if ((source.sourceType === 'visual-reference' || source.sourceType === 'model-3d') && source.sourceStatus === 'final-approved-source') issues.push(issue('pilot-candidate-source-marked-approved', `${path}.sourceStatus`, `المصدر المرشح ${source.sourceId} لا يملك ما يثبت اعتماده النهائي.`));
    source.parentSourceIds.forEach((parentSourceId, parentIndex) => {
      if (!sourceIdSet.has(parentSourceId)) issues.push(issue('pilot-source-lineage-missing', `${path}.parentSourceIds[${parentIndex}]`, `المصدر ${source.sourceId} يشير إلى أصل غير معروف ${parentSourceId}.`));
    });
    if (source.sourcePath && source.contentHash) {
      const existingHash = pathHashes.get(source.sourcePath);
      if (existingHash && existingHash !== source.contentHash) issues.push(issue('pilot-source-fingerprint-conflict', path, `المسار نفسه للمصدر ${source.sourceId} يحمل بصمتين متعارضتين.`));
      pathHashes.set(source.sourcePath, source.contentHash);
    }
    if (source.contentHash) {
      const existingSource = fingerprintOwners.get(source.contentHash);
      if (existingSource && existingSource !== source.sourceId) issues.push(issue('pilot-source-fingerprint-duplicate', path, `البصمة نفسها مستخدمة للمصدرين ${existingSource} و${source.sourceId}؛ يجب توحيد السجل أو توثيق العلاقة.`, 'warning'));
      fingerprintOwners.set(source.contentHash, source.sourceId);
    }
    if (source.driveFileId && !source.contentHash && source.sourceStatus !== 'missing') issues.push(issue('pilot-source-hash-awaiting-intake', `${path}.contentHash`, `المصدر ${source.sourceId} متاح كمرشح لكنه لم يُستقبل محلياً لحساب البصمة.`, 'warning'));
  });
}

function validateAuthorityAndRoles(candidate: PilotEventPackageCandidate, issues: PilotCandidateValidationIssue[]) {
  const actors = new Map(candidate.actors.map((actor) => [actor.actorId, actor]));
  const roles = new Set(candidate.roleDefinitions.map((role) => role.roleId));
  const authorities = new Map(candidate.authorities.map((authority) => [authority.authorityId, authority]));
  const sources = new Set(candidate.sources.map((source) => source.sourceId));
  const ahmedActor = candidate.actors.find((actor) => actor.actorType === 'platform-owner')?.actorId;

  candidate.authorities.forEach((authority, index) => {
    if (authority.actorId && !actors.has(authority.actorId)) issues.push(issue('pilot-authority-actor-missing', `$.authorities[${index}].actorId`, `جهة الصلاحية ${authority.titleAr} تشير إلى ممثل غير معروف.`));
    if (authority.authorityType !== 'platform' && authority.actorId === ahmedActor) issues.push(issue('pilot-platform-authority-misused', `$.authorities[${index}].actorId`, `اعتماد أحمد للمنصة لا يساوي ${authority.titleAr}؛ يلزم تفويض خارجي مستقل.`));
    if (authority.authorityType === 'platform' && authority.verificationStatus !== 'confirmed-platform-only') issues.push(issue('pilot-platform-authority-scope-invalid', `$.authorities[${index}].verificationStatus`, 'سلطة المنصة يجب أن تبقى مصنفة بوضوح كاعتماد منصة فقط.'));
  });

  candidate.roleAssignments.forEach((assignment, index) => {
    const path = `$.roleAssignments[${index}]`;
    const actor = actors.get(assignment.actorId);
    if (!actor) issues.push(issue('pilot-role-actor-missing', `${path}.actorId`, `تكليف ${assignment.assignmentId} يشير إلى ممثل غير معروف.`));
    if (!roles.has(assignment.roleId)) issues.push(issue('pilot-role-definition-missing', `${path}.roleId`, `تكليف ${assignment.assignmentId} يشير إلى دور غير معروف.`));
    if (assignment.eventId !== candidate.event.eventId || assignment.venueId !== candidate.event.venueId) issues.push(issue('pilot-role-cross-event', path, `تكليف ${assignment.assignmentId} خارج نطاق الفعالية أو الموقع.`));
    if (assignment.evidenceSourceId && !sources.has(assignment.evidenceSourceId)) issues.push(issue('pilot-role-evidence-missing', `${path}.evidenceSourceId`, `تكليف ${assignment.assignmentId} يشير إلى دليل مصدر غير معروف.`));
    if (assignment.approvingAuthorityId && !authorities.has(assignment.approvingAuthorityId)) issues.push(issue('pilot-role-authority-missing', `${path}.approvingAuthorityId`, `تكليف ${assignment.assignmentId} يشير إلى جهة اعتماد غير معروفة.`));
    if (!assignment.effectiveFrom || !assignment.effectiveTo) issues.push(issue('pilot-role-effective-date-missing', path, `تكليف ${assignment.assignmentId} لا يملك تاريخ سريان وانتهاء؛ يبقى غير إنتاجي.`, 'warning'));
    if (assignment.assignmentStatus === 'production-active' || assignment.productionPermissionGranted) {
      if (!actor || actor.identityStatus !== 'authoritative' || !actor.authoritativeIdentityId) issues.push(issue('pilot-name-only-production-permission', `${path}.productionPermissionGranted`, `لا يجوز منح صلاحية إنتاجية للاسم ${actor?.displayNameAr ?? assignment.actorId} من دون هوية سلطوية.`));
      if (!assignment.effectiveFrom || !assignment.effectiveTo || !assignment.evidenceSourceId || !assignment.approvingAuthorityId) issues.push(issue('pilot-production-assignment-incomplete', path, `تكليف ${assignment.assignmentId} يفتقد تاريخ السريان أو الدليل أو جهة الاعتماد.`));
    }
  });
}

function validateEvidence(candidate: PilotEventPackageCandidate, issues: PilotCandidateValidationIssue[]) {
  const sourceIds = new Set(candidate.sources.map((source) => source.sourceId));
  candidate.evidence.forEach((evidence, index) => {
    const path = `$.evidence[${index}]`;
    const missing = [
      [evidence.fileId, 'معرّف الملف'],
      [evidence.sourceOwner, 'مالك المصدر'],
      [evidence.rights, 'الحقوق'],
      [evidence.captureTime, 'وقت الالتقاط'],
      [evidence.locationEntityId, 'الموقع أو المنطقة'],
      [evidence.sha256, 'بصمة SHA-256'],
      [evidence.version, 'الإصدار'],
      [evidence.privacyClassification, 'تصنيف الخصوصية']
    ].filter(([value]) => !value).map(([, label]) => label as string);
    if (!sourceIds.has(evidence.sourceId)) issues.push(issue('pilot-evidence-source-missing', `${path}.sourceId`, `الدليل ${evidence.evidenceId} يشير إلى مصدر غير معروف.`));
    if (evidence.sha256 && !sha256Pattern.test(evidence.sha256)) issues.push(issue('pilot-evidence-hash-invalid', `${path}.sha256`, `بصمة الدليل ${evidence.evidenceId} غير صالحة.`));
    if (missing.length && evidence.status !== 'quarantined') issues.push(issue('pilot-evidence-quarantine-required', path, `الدليل ${evidence.evidenceId} يفتقد ${missing.join('، ')} ويجب حجره.`));
    if (!missing.length && evidence.status === 'quarantined' && !evidence.quarantineReasonsAr.length) issues.push(issue('pilot-evidence-quarantine-reason-missing', `${path}.quarantineReasonsAr`, `الدليل ${evidence.evidenceId} محجور من دون سبب موثق.`));
  });
}

function validateCandidateSemantics(candidate: PilotEventPackageCandidate): PilotCandidateValidationIssue[] {
  const issues: PilotCandidateValidationIssue[] = [];
  if (!pilotAuthoringLifecycleValues.includes(candidate.authoringLifecycle)) issues.push(issue('pilot-authoring-lifecycle-invalid', '$.authoringLifecycle', 'حالة دورة التأليف غير معروفة.'));
  if (candidate.authoringLifecycle === 'frozen') issues.push(issue('pilot-candidate-false-frozen', '$.authoringLifecycle', 'لا يمكن تصنيف الحزمة مجمّدة مع وجود بوابات مفتوحة.'));
  if (candidate.stateContext !== 'temporary-demo') issues.push(issue('pilot-candidate-state-context-invalid', '$.stateContext', 'الحزمة المرشحة المحلية يجب أن تبقى في سياق temporary-demo ولا تصبح baseline.'));
  if (!eventIdPattern.test(candidate.event.eventId)) issues.push(issue('pilot-event-id-invalid', '$.event.eventId', 'معرّف الفعالية غير صالح.'));
  if (!venueIdPattern.test(candidate.event.venueId)) issues.push(issue('pilot-venue-id-invalid', '$.event.venueId', 'معرّف الموقع غير صالح.'));
  if (candidate.event.dateAssumption && candidate.event.assumptionReason !== 'year inferred from current 2026 project context') issues.push(issue('pilot-date-assumption-reason-invalid', '$.event.assumptionReason', 'سبب افتراض سنة الفعالية يجب أن يبقى موثقاً بالنص المعتمد.'));

  const stableIds = candidate.stableEntityIds;
  duplicates(stableIds).forEach((entityId) => issues.push(issue('pilot-stable-entity-id-duplicate', '$.stableEntityIds', `معرّف العنصر الثابت ${entityId} مكرر.`)));
  const entityIds = candidate.entities.map((entity) => entity.entityId);
  duplicates(entityIds).forEach((entityId) => issues.push(issue('pilot-entity-id-duplicate', '$.entities', `معرّف العنصر ${entityId} مكرر.`)));
  stableIds.forEach((entityId) => {
    if (!entityIds.includes(entityId)) issues.push(issue('pilot-stable-entity-id-missing', '$.entities', `المعرّف الثابت ${entityId} مفقود من الحزمة المرشحة.`));
  });
  candidate.entities.forEach((entity, index) => {
    const path = `$.entities[${index}]`;
    if (!entityIdPattern.test(entity.entityId)) issues.push(issue('pilot-entity-id-invalid', `${path}.entityId`, `معرّف العنصر ${entity.entityId} غير صالح.`));
    if (entity.geometryMappingStatus === 'pending' && (entity.geometrySourceId || entity.geometryReference || entity.position || entity.polygon)) issues.push(issue('pilot-pending-geometry-fabricated', path, `العنصر ${entity.entityId} مصنف غير مربوط لكنه يحتوي هندسة موحية بموقع معروف.`));
    if (entity.geometryMappingStatus !== 'pending' && (!entity.geometrySourceId || !entity.geometryReference)) issues.push(issue('pilot-geometry-mapping-incomplete', path, `ربط العنصر ${entity.entityId} يفتقد المصدر أو مرجع الهندسة.`));
  });

  validateSources(candidate, issues);
  validateAuthorityAndRoles(candidate, issues);
  validateEvidence(candidate, issues);

  const sourceIds = new Set(candidate.sources.map((source) => source.sourceId));
  if (!sourceIds.has(candidate.cadManifest.sourceRef)) issues.push(issue('pilot-cad-source-missing', '$.cadManifest.sourceRef', 'بيان CAD يشير إلى مصدر غير موجود في السجل.'));
  const cadSource = candidate.sources.find((source) => source.sourceId === candidate.cadManifest.sourceRef);
  if (cadSource?.contentHash !== candidate.cadManifest.contentHash) issues.push(issue('pilot-cad-source-hash-mismatch', '$.cadManifest.contentHash', 'بصمة بيان CAD لا تطابق بصمة سجل المصدر.'));
  if (candidate.cadManifest.sourceStatus === 'final-approved-source' && (!candidate.cadManifest.revision || !candidate.cadManifest.epsg || !candidate.cadManifest.northAuthority || !candidate.cadManifest.originAuthority)) issues.push(issue('pilot-provisional-dwg-false-promotion', '$.cadManifest', 'لا يمكن ترقية المخطط إلى معتمد من دون مراجعة ومرجع مكاني وشمال وأصل موثق.'));
  if (candidate.cadManifest.embeddedGeolocationTrusted && !candidate.cadManifest.epsg) issues.push(issue('pilot-untrusted-geolocation-promoted', '$.cadManifest.embeddedGeolocationTrusted', 'لا يجوز اعتبار الموقع الجغرافي المضمن موثوقاً من دون EPSG أو نقاط ضبط معتمدة.'));

  const derivedIds = new Set(candidate.derivedAssets.map((asset) => asset.derivedAssetId));
  candidate.cadManifest.derivedAssetIds.forEach((assetId) => {
    if (!derivedIds.has(assetId)) issues.push(issue('pilot-derived-asset-missing', '$.cadManifest.derivedAssetIds', `بيان CAD يشير إلى أصل مشتق غير معروف ${assetId}.`));
  });
  candidate.derivedAssets.forEach((asset, index) => {
    if (!asset.parentSourceIds.length || asset.parentSourceIds.some((sourceId) => !sourceIds.has(sourceId))) issues.push(issue('pilot-derived-lineage-missing', `$.derivedAssets[${index}].parentSourceIds`, `الأصل المشتق ${asset.derivedAssetId} يفتقد سلسلة مصدر كاملة.`));
  });

  candidate.evidenceRequirements.forEach((requirement, index) => {
    if (!requirement.evidenceRequirementId || !requirement.requiredMetadataFields.length) issues.push(issue('pilot-evidence-requirement-incomplete', `$.evidenceRequirements[${index}]`, 'متطلب الدليل يفتقد المعرّف أو حقول الميتاداتا الإلزامية.'));
  });

  const capabilities = new Map(candidate.capabilities.map((capability) => [capability.capabilityId, capability]));
  candidate.capabilities.forEach((capability, index) => capability.dependencyIds.forEach((dependencyId) => {
    const dependency = capabilities.get(dependencyId);
    if (!dependency || (capability.enabled && !dependency.enabled)) issues.push(issue('pilot-capability-dependency-missing', `$.capabilities[${index}].dependencyIds`, `القدرة ${capability.capabilityId} تعتمد على ${dependencyId} غير المفعلة.`));
  }));
  candidate.dependencyDeclarations.forEach((dependency, index) => {
    if (!dependency.packageId || !dependency.versionRange || dependency.status === 'unresolved') issues.push(issue('pilot-package-dependency-unresolved', `$.dependencyDeclarations[${index}]`, `تبعية الحزمة ${dependency.packageId || 'غير المعروفة'} غير محلولة.`));
  });
  candidate.outputProfiles.forEach((profile, index) => {
    if (profile.status === 'preview-only' && profile.outputType !== '2d-authoring-preview') issues.push(issue('pilot-output-false-preview', `$.outputProfiles[${index}]`, `ملف المخرج ${profile.outputProfileId} لا يملك بيانات كافية لتصنيفه معاينة متاحة.`));
    if ((profile.outputType === 'projection-metadata' || profile.outputType === 'physical-output-metadata') && (profile.coreStandardId !== 'MEIOS-PDT-STD-001' || profile.coreStandardVersion !== '1.0.0')) issues.push(issue('pilot-physical-standard-missing', `$.outputProfiles[${index}]`, `ملف المخرج ${profile.outputProfileId} لا يثبت معيار Core المطلوب.`));
  });
  candidate.scenarios.forEach((scenario, index) => {
    if (scenario.stateContext === 'scenario' && scenario.writesToStateContext === 'baseline') issues.push(issue('pilot-scenario-baseline-write', `$.scenarios[${index}]`, `السيناريو ${scenario.scenarioId} يحاول الكتابة إلى baseline، وهذا محظور.`));
  });

  const computedGates = evaluatePilotFreezeGates(candidate);
  const declaredById = new Map(candidate.freezeGates.map((current) => [current.gateId, current]));
  computedGates.forEach((computed) => {
    const declared = declaredById.get(computed.gateId);
    if (!declared || declared.status !== computed.status) issues.push(issue('pilot-freeze-gate-state-mismatch', '$.freezeGates', `حالة بوابة ${computed.titleAr} لا تطابق البيانات المصدرية ويجب إعادة حسابها.`));
  });
  return issues;
}

export function validatePilotEventPackageCandidate(value: unknown): PilotCandidateValidationResult {
  try {
    if (!isRecord(value)
      || !isRecord(value.event)
      || !Array.isArray(value.entities)
      || !Array.isArray(value.stableEntityIds)
      || !Array.isArray(value.sources)
      || !Array.isArray(value.actors)
      || !Array.isArray(value.roleDefinitions)
      || !Array.isArray(value.roleAssignments)
      || !Array.isArray(value.authorities)
      || !Array.isArray(value.evidence)
      || !Array.isArray(value.evidenceRequirements)
      || !isRecord(value.cadManifest)
      || !Array.isArray(value.assets3d)
      || !Array.isArray(value.derivedAssets)
      || !Array.isArray(value.capabilities)
      || !Array.isArray(value.dependencyDeclarations)
      || !Array.isArray(value.outputProfiles)
      || !Array.isArray(value.scenarios)
      || !isRecord(value.policyStatus)
      || !Array.isArray(value.freezeGates)
      || !isRecord(value.validationSnapshot)) {
      const structuralIssue = issue('pilot-candidate-structure-invalid', '$', 'بنية الحزمة المرشحة غير مكتملة؛ بقيت خارج التجميد والتفعيل.');
      return { validForAuthoring: false, readyToFreeze: false, candidate: null, issues: [structuralIssue], freezeGates: [] };
    }
    const candidate = structuredClone(value) as unknown as PilotEventPackageCandidate;
    const issues = validateCandidateSemantics(candidate);
    const freezeGates = evaluatePilotFreezeGates(candidate);
    const validForAuthoring = issues.every((current) => current.severity !== 'blocking');
    const readyToFreeze = validForAuthoring && freezeGates.every((current) => current.status === 'passed');
    return { validForAuthoring, readyToFreeze, candidate, issues, freezeGates };
  } catch {
    const boundaryIssue = issue('pilot-candidate-validation-failed-safe', '$', 'تعذر فحص الحزمة المرشحة بأمان؛ بقيت خارج التجميد والتفعيل.');
    return { validForAuthoring: false, readyToFreeze: false, candidate: null, issues: [boundaryIssue], freezeGates: [] };
  }
}

export async function attemptPilotCandidateFreeze(candidate: PilotEventPackageCandidate): Promise<{
  success: boolean;
  candidate: PilotEventPackageCandidate;
  issues: PilotCandidateValidationIssue[];
}> {
  const preview = await buildPilotCandidatePreview(candidate);
  const validation = validatePilotEventPackageCandidate(preview);
  if (!validation.readyToFreeze) {
    return {
      success: false,
      candidate: preview,
      issues: [
        ...validation.issues,
        ...validation.freezeGates.filter((current) => current.status === 'blocked').map((current) => issue(
          `pilot-freeze-blocked-${current.gateId.toLowerCase()}`,
          '$.freezeGates',
          `${current.titleAr}: ${current.blockerAr ?? 'البوابة غير مكتملة.'}`
        ))
      ]
    };
  }
  const frozen = structuredClone(preview);
  frozen.authoringLifecycle = 'frozen';
  return { success: true, candidate: frozen, issues: [] };
}
