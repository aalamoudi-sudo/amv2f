import {
  spatialCommandEditingModeValues,
  spatialCommandModeValues,
  spatialCommandViewModeValues,
  type SpatialCommandExperienceConfiguration,
  type SpatialCommandEditingMode,
  type SpatialCommandMode,
  type SpatialCommandRouteState,
  type SpatialCommandValidationIssue,
  type SpatialCommandValidationResult,
  type SpatialCommandViewMode,
  type SpatialJourneyPlaybackAction,
  type SpatialJourneyPlaybackState,
  type SpatialLayerSelectionState
} from '../types/spatialCommand';
import { isSha256 } from './integrationHash';
import { validateSourceAssetManifest } from './sourceIntake';
import { validateSpatialDisplayLayers } from './spatialMap';

const candidateLayerTruthStatus = 'candidate';
const forbiddenOperationalClaimKeys = new Set([
  'routeId',
  'polyline',
  'coordinates',
  'distanceMeters',
  'travelDuration',
  'capacity',
  'readiness',
  'liveState',
  'crowdDensity',
  'surveyCoordinate'
]);

function findForbiddenClaim(value: unknown, path = '$'): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenClaim(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenOperationalClaimKeys.has(key)) return `${path}.${key}`;
    const found = findForbiddenClaim(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function issue(code: string, path: string, messageAr: string): SpatialCommandValidationIssue {
  return { code, path, messageAr };
}

export function validateSpatialCommandConfiguration(
  configuration: SpatialCommandExperienceConfiguration
): SpatialCommandValidationResult {
  const issues: SpatialCommandValidationIssue[] = [];
  const scope = {
    projectId: configuration.projectId,
    eventId: configuration.eventId,
    venueId: configuration.venueId
  };
  const forbiddenClaim = findForbiddenClaim(configuration);
  if (forbiddenClaim) {
    issues.push(issue('spatial-command-forbidden-operational-claim', forbiddenClaim, 'تحتوي التهيئة على ادعاء مسار أو جاهزية أو بيانات تشغيلية محظور.'));
  }
  if (!configuration.configurationId || !configuration.experienceTitle) {
    issues.push(issue('spatial-command-identity-missing', '$', 'هوية تجربة القيادة المكانية مطلوبة.'));
  }
  if (!configuration.visualConfiguration.mapAdapterId) {
    issues.push(issue('spatial-command-map-adapter-missing', '$.visualConfiguration.mapAdapterId', 'محوّل العرض المكاني مطلوب.'));
  }
  validateSpatialDisplayLayers(configuration.displayLayers).forEach((displayLayerIssue) => {
    issues.push(issue('spatial-command-display-layer-invalid', '$.displayLayers', `طبقة العرض غير صالحة: ${displayLayerIssue}`));
  });
  const truthPack = configuration.spatialTruthPack;
  if (truthPack.projectId !== scope.projectId
    || truthPack.eventId !== scope.eventId
    || truthPack.venueId !== scope.venueId) {
    issues.push(issue('spatial-command-truth-pack-cross-scope', '$.spatialTruthPack', 'حزمة الحقيقة المكانية خارج نطاق المشروع أو الفعالية أو الموقع.'));
  }
  if (truthPack.revision !== 1
    || !truthPack.frozen
    || truthPack.supersedes !== null
    || truthPack.revisionMetadata !== null
    || !truthPack.packId.endsWith(truthPack.contentHash)
    || !isSha256(truthPack.contentHash)) {
    issues.push(issue('spatial-command-truth-pack-identity-invalid', '$.spatialTruthPack', 'هوية حزمة الحقيقة المجمدة أو مراجعتها غير صالحة.'));
  }
  if (truthPack.semanticDecisions.some((decision) => decision.engineeringStatus === 'engineering-approved'
    || decision.operationalStatus === 'baseline')) {
    issues.push(issue('spatial-command-truth-pack-authority-escalation', '$.spatialTruthPack.semanticDecisions', 'قرار المؤسس لا يجوز أن يرفع الهندسة أو الحالة التشغيلية إلى اعتماد.'));
  }
  if (configuration.candidateEntities.length === 0) issues.push(issue('spatial-command-candidates-empty', '$.candidateEntities', 'تحتاج تجربة القيادة المكانية إلى كيان مرشح واحد على الأقل.'));
  if (configuration.experienceObjects.length === 0) issues.push(issue('spatial-command-experience-empty', '$.experienceObjects', 'تحتاج تجربة القيادة المكانية إلى كائن تجربة واحد على الأقل.'));
  if (configuration.truthContext.packageStatus !== 'candidate'
    || configuration.truthContext.operationalBaselineStatus !== 'absent'
    || configuration.truthContext.geometryAuthority !== 'none'
    || configuration.truthContext.liveDataStatus !== 'absent'
    || configuration.truthContext.routeAuthority !== 'none'
    || configuration.truthContext.readinessInference !== 'prohibited'
    || configuration.truthContext.scaleStatus !== 'unknown'
    || configuration.truthContext.crsStatus !== 'unknown'
    || configuration.truthContext.drawingApprovalStatus !== 'missing'
    || configuration.truthContext.calibrationStatus !== 'incomplete') {
    issues.push(issue('spatial-command-truth-escalation', '$.truthContext', 'لا يجوز لترتيب القيادة المكاني ترقية المرشح إلى حقيقة تشغيلية أو هندسية.'));
  }
  const entityIds = new Set<string>();
  const sourceAssetById = new Map(configuration.sourceTruth.sources.map((source) => [source.sourceAssetId, source]));
  configuration.sourceTruth.sources.forEach((source, index) => {
    const sourceValidation = validateSourceAssetManifest(source);
    if (!sourceValidation.valid) issues.push(issue('spatial-command-source-invalid', `$.sourceTruth.sources[${index}]`, 'مصدر القيادة المكانية لم يجتز تحقق الاستيعاب.'));
    if (source.projectId !== scope.projectId || source.eventId !== scope.eventId || source.venueId !== scope.venueId) {
      issues.push(issue('spatial-command-cross-scope-source', `$.sourceTruth.sources[${index}]`, 'المصدر خارج نطاق المشروع أو الفعالية أو الموقع.'));
    }
    if (source.operationalBaselineStatus !== 'not-baseline' || source.geometryApprovalStatus !== 'not-approved') {
      issues.push(issue('spatial-command-source-truth-escalation', `$.sourceTruth.sources[${index}]`, 'يجب أن يبقى كل مصدر خارج baseline والهندسة المعتمدة.'));
    }
    if (source.providerPermissionRisk !== 'none-recorded' && !configuration.sourceTruth.riskIds.includes(source.providerPermissionRisk)) {
      issues.push(issue('spatial-command-source-risk-hidden', `$.sourceTruth.sources[${index}]`, 'مخاطرة مزود المصدر غير ظاهرة في سجل المخاطر.'));
    }
  });
  configuration.sourceLayers.forEach((layer, index) => {
    if (!sourceAssetById.has(layer.sourceAssetId)) issues.push(issue('spatial-command-layer-source-missing', `$.sourceLayers[${index}]`, 'طبقة المصدر تشير إلى أصل غير مسجل.'));
    if (!layer.operatorContext.titleAr
      || !layer.operatorContext.summaryAr
      || !layer.operatorContext.canvasTitleAr
      || !layer.operatorContext.canvasSummaryAr
      || layer.operatorContext.facts.length === 0) {
      issues.push(issue('spatial-command-layer-context-missing', `$.sourceLayers[${index}].operatorContext`, 'تحتاج كل طبقة مصدر إلى سياق مشغل واضح ومحايد.'));
    }
  });
  const sourceRiskIds = new Set(configuration.sourceTruth.risks.map((risk) => risk.riskId));
  configuration.sourceTruth.riskIds.forEach((riskId, index) => {
    if (!sourceRiskIds.has(riskId)) {
      issues.push(issue('spatial-command-risk-detail-missing', `$.sourceTruth.riskIds[${index}]`, 'سجل المخاطر يشير إلى خطر بلا تفاصيل ظاهرة للمشغل.'));
    }
  });
  configuration.candidateEntities.forEach((entity, index) => {
    if (entityIds.has(entity.candidateId)) issues.push(issue('spatial-command-duplicate-entity', `$.candidateEntities[${index}]`, 'معرّف الوجهة المرشحة مكرر.'));
    entityIds.add(entity.candidateId);
    if (entity.projectId !== scope.projectId || entity.eventId !== scope.eventId || entity.venueId !== scope.venueId) {
      issues.push(issue('spatial-command-cross-scope-entity', `$.candidateEntities[${index}]`, 'الوجهة المرشحة خارج نطاق المشروع.'));
    }
    if (entity.geometryStatus === 'approved-geometry') {
      issues.push(issue('spatial-command-approved-geometry', `$.candidateEntities[${index}].geometryStatus`, 'الهندسة المعتمدة محظورة في هذه التهيئة المرشحة.'));
    }
    const candidateLayer = configuration.sourceLayers.find((layer) => layer.sourceAssetId === entity.sourceAssetId && layer.truthStatus === 'candidate');
    if (!candidateLayer || !entity.normalizedAnchor || entity.anchorMethod !== 'manual-derived-from-candidate-raster'
      || entity.normalizedAnchor.previewSha256 !== candidateLayer.previewSha256) {
      issues.push(issue('spatial-command-candidate-anchor-provenance', `$.candidateEntities[${index}]`, 'مرساة الكيان لا تطابق مشتق المصدر المرشح وبصمته.'));
    }
  });
  const experienceObjectIds = new Set(configuration.experienceObjects.map((entry) => entry.experienceObjectId));
  configuration.entityRelationships.forEach((relationship, index) => {
    if (!relationship.requiredApprovalAr.trim()) {
      issues.push(issue('spatial-command-relationship-approval-copy-missing', `$.entityRelationships[${index}].requiredApprovalAr`, 'تحتاج العلاقة إلى وصف عربي للقرار المطلوب.'));
    }
    if (relationship.projectId !== scope.projectId || relationship.eventId !== scope.eventId || relationship.venueId !== scope.venueId) {
      issues.push(issue('spatial-command-cross-scope-relationship', `$.entityRelationships[${index}]`, 'العلاقة خارج نطاق المشروع.'));
    }
    if (relationship.experienceObjectId && !experienceObjectIds.has(relationship.experienceObjectId)) {
      issues.push(issue('spatial-command-relationship-object-missing', `$.entityRelationships[${index}]`, 'العلاقة تشير إلى كائن تجربة غير موجود.'));
    }
    if (relationship.state === 'authority-confirmed') {
      issues.push(issue('spatial-command-authority-confirmation-prohibited', `$.entityRelationships[${index}]`, 'لا يجوز للحزمة المرشحة بلوغ authority-confirmed.'));
    }
    relationship.candidateEntityIds.forEach((candidateId) => {
      if (!entityIds.has(candidateId)) issues.push(issue('spatial-command-dangling-entity', `$.entityRelationships[${index}]`, 'العلاقة تشير إلى وجهة غير موجودة.'));
    });
  });
  configuration.narrativeJourney.steps.forEach((step, index) => {
    if (!step.narrativeOnly) issues.push(issue('spatial-command-journey-not-narrative', `$.narrativeJourney.steps[${index}]`, 'خطوة الرحلة يجب أن تبقى سردية فقط.'));
    if (!experienceObjectIds.has(step.experienceObjectId)) issues.push(issue('spatial-command-journey-object-missing', `$.narrativeJourney.steps[${index}]`, 'خطوة الرحلة تشير إلى كائن تجربة غير موجود.'));
    step.candidateEntityIds.forEach((candidateId) => {
      if (!entityIds.has(candidateId)) issues.push(issue('spatial-command-journey-entity-missing', `$.narrativeJourney.steps[${index}]`, 'خطوة الرحلة تشير إلى وجهة غير موجودة.'));
    });
    if (step.status === 'unresolved' && step.candidateEntityIds.length > 0) {
      issues.push(issue('spatial-command-unresolved-step-positioned', `$.narrativeJourney.steps[${index}]`, 'الخطوة المكانية غير المحسومة لا يجوز أن تحمل مرساة مرشحة.'));
    }
    if ((step.status === 'unresolved' || step.status === 'conflicted') && !step.operatorNoticeAr) {
      issues.push(issue('spatial-command-step-notice-missing', `$.narrativeJourney.steps[${index}].operatorNoticeAr`, 'تحتاج الخطوة المتعارضة أو غير المحسومة إلى تنبيه مشغل صريح.'));
    }
  });
  if (configuration.narrativeJourney.physicalRouteId !== null
    || configuration.narrativeJourney.routeAuthority !== 'none') {
    issues.push(issue('spatial-command-physical-route-prohibited', '$.narrativeJourney', 'لا يجوز إنشاء مسار ميداني من التسلسل القصصي.'));
  }
  if (configuration.truthContext.routeAuthority === 'none' && configuration.spatialRoutes.length > 0) {
    issues.push(issue('spatial-command-spatial-route-without-authority', '$.spatialRoutes', 'لا يجوز إرفاق مسار مكاني عندما تكون سلطة المسار غير موجودة.'));
  }
  configuration.narrativeJourney.connections.forEach((connection, index) => {
    if (connection.connectionKind !== 'storytelling-only'
      || connection.physicalRouteAuthority !== 'none'
      || connection.disclosureAr !== 'تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا') {
      issues.push(issue('spatial-command-narrative-route-confusion', `$.narrativeJourney.connections[${index}]`, 'يجب فصل الاتصال السردي صراحة عن المسار المكاني.'));
    }
  });
  configuration.unresolvedItems.forEach((item, index) => {
    item.candidateEntityIds.forEach((candidateId) => {
      if (!entityIds.has(candidateId)) issues.push(issue('spatial-command-unresolved-entity-missing', `$.unresolvedItems[${index}]`, 'العنصر غير المحسوم يشير إلى كيان غير موجود.'));
    });
    item.experienceObjectIds.forEach((experienceObjectId) => {
      if (!experienceObjectIds.has(experienceObjectId)) issues.push(issue('spatial-command-unresolved-object-missing', `$.unresolvedItems[${index}]`, 'العنصر غير المحسوم يشير إلى كائن تجربة غير موجود.'));
    });
  });
  configuration.executiveBlockers.forEach((blocker, index) => {
    blocker.affectedCandidateEntityIds.forEach((candidateId) => {
      if (!entityIds.has(candidateId)) issues.push(issue('spatial-command-blocker-entity-missing', `$.executiveBlockers[${index}]`, 'العائق يشير إلى كيان غير موجود.'));
    });
    blocker.affectedExperienceObjectIds.forEach((experienceObjectId) => {
      if (!experienceObjectIds.has(experienceObjectId)) issues.push(issue('spatial-command-blocker-object-missing', `$.executiveBlockers[${index}]`, 'العائق يشير إلى كائن تجربة غير موجود.'));
    });
  });
  if (configuration.presentation.phases.length === 0 || configuration.presentation.phaseDurationMs <= 0) {
    issues.push(issue('spatial-command-presentation-invalid', '$.presentation', 'يحتاج العرض التنفيذي إلى مراحل ومدة تشغيل موجبة.'));
  }
  const presentationPhaseIds = new Set<string>();
  configuration.presentation.phases.forEach((phase, index) => {
    if (presentationPhaseIds.has(phase.phaseId)) {
      issues.push(issue('spatial-command-presentation-phase-duplicate', `$.presentation.phases[${index}].phaseId`, 'معرّف مرحلة العرض مكرر.'));
    }
    presentationPhaseIds.add(phase.phaseId);
    if (phase.journeyStepId && !configuration.narrativeJourney.steps.some((step) => step.stepId === phase.journeyStepId)) {
      issues.push(issue('spatial-command-presentation-step-missing', `$.presentation.phases[${index}].journeyStepId`, 'مرحلة العرض تشير إلى خطوة رحلة غير موجودة.'));
    }
  });
  if (configuration.evidenceSummary.inventory.projectId !== scope.projectId
    || configuration.evidenceSummary.inventory.eventId !== scope.eventId
    || configuration.evidenceSummary.inventory.venueId !== scope.venueId) {
    issues.push(issue('spatial-command-evidence-cross-scope', '$.evidenceSummary.inventory', 'ملخص الأدلة خارج نطاق المشروع.'));
  }
  if (configuration.evidenceSummary.exactGpsExposed
    || configuration.evidenceSummary.personalIdentifiersExposed
    || configuration.evidenceSummary.readinessMutationAllowed) {
    issues.push(issue('spatial-command-evidence-boundary', '$.evidenceSummary', 'لا يجوز للأدلة كشف GPS أو الهوية أو تغيير الجاهزية.'));
  }
  if (!configuration.sourceLayers.some((layer) => layer.truthStatus === candidateLayerTruthStatus)) {
    issues.push(issue('spatial-command-candidate-layer-missing', '$.sourceLayers', 'طبقة التقسيم المرشح مطلوبة.'));
  }
  return { valid: issues.length === 0, issues };
}

export function resolveSpatialCommandRouteState(
  url: URL,
  configuration: SpatialCommandExperienceConfiguration
): SpatialCommandRouteState {
  const correctionCodes: string[] = [];
  const requestedMode = url.searchParams.get('mode');
  if (requestedMode && !spatialCommandModeValues.includes(requestedMode as SpatialCommandMode)) correctionCodes.push('invalid-mode');
  const mode: SpatialCommandMode = spatialCommandModeValues.includes(requestedMode as SpatialCommandMode)
    ? requestedMode as SpatialCommandMode
    : 'experience';
  const defaultLayer = configuration.sourceLayers.find((layer) => layer.defaultVisible)
    ?? configuration.sourceLayers[0];
  const requestedLayerId = url.searchParams.get('sourceLayer');
  if (requestedLayerId && !configuration.sourceLayers.some((layer) => layer.sourceLayerId === requestedLayerId)) correctionCodes.push('invalid-source-layer');
  const sourceLayer = configuration.sourceLayers.find((layer) => layer.sourceLayerId === requestedLayerId)
    ?? defaultLayer;
  if (!sourceLayer) throw new Error('لا توجد طبقة مصدر صالحة في تهيئة القيادة المكانية.');
  const requestedViewMode = url.searchParams.get('viewMode');
  if (requestedViewMode && !spatialCommandViewModeValues.includes(requestedViewMode as SpatialCommandViewMode)) correctionCodes.push('invalid-view-mode');
  const viewMode: SpatialCommandViewMode = spatialCommandViewModeValues.includes(requestedViewMode as SpatialCommandViewMode)
    ? requestedViewMode as SpatialCommandViewMode
    : configuration.visualConfiguration.defaultViewMode;
  const requestedEntityId = url.searchParams.get('candidateEntity');
  if (requestedEntityId && (mode === 'executive'
    || sourceLayer.truthStatus !== candidateLayerTruthStatus
    || !configuration.candidateEntities.some((entity) => entity.candidateId === requestedEntityId))) {
    correctionCodes.push('invalid-candidate-entity');
  }
  const candidateEntityId = mode !== 'executive'
    && sourceLayer.truthStatus === candidateLayerTruthStatus
    && requestedEntityId
    && configuration.candidateEntities.some((entity) => entity.candidateId === requestedEntityId)
    ? requestedEntityId
    : null;
  const requestedJourneyStep = url.searchParams.get('journeyStep');
  if (requestedJourneyStep && (mode !== 'journey'
    || !configuration.narrativeJourney.steps.some((step) => step.stepId === requestedJourneyStep))) {
    correctionCodes.push('invalid-journey-step');
  }
  const journeyStepId = configuration.narrativeJourney.steps.some((step) => step.stepId === requestedJourneyStep)
    ? requestedJourneyStep!
    : configuration.narrativeJourney.steps[0]?.stepId ?? '';
  const requestedEditingMode = url.searchParams.get('edit');
  if (requestedEditingMode && !spatialCommandEditingModeValues.includes(requestedEditingMode as SpatialCommandEditingMode)) {
    correctionCodes.push('invalid-editing-mode');
  }
  const editingMode = spatialCommandEditingModeValues.includes(requestedEditingMode as SpatialCommandEditingMode)
    && sourceLayer.truthStatus === candidateLayerTruthStatus
    ? requestedEditingMode as SpatialCommandEditingMode
    : 'none';
  if (requestedEditingMode === 'candidate-anchors' && sourceLayer.truthStatus !== candidateLayerTruthStatus) {
    correctionCodes.push('editing-requires-candidate-layer');
  }
  const requestedFocusMode = url.searchParams.get('focus');
  if (requestedFocusMode && requestedFocusMode !== 'map') correctionCodes.push('invalid-focus-mode');
  return {
    mode,
    sourceLayerId: sourceLayer.sourceLayerId,
    candidateEntityId,
    journeyStepId,
    viewMode,
    editingMode,
    focusMode: requestedFocusMode === 'map',
    correctionCodes
  };
}

export function switchSpatialSourceLayer(
  state: SpatialLayerSelectionState,
  nextSourceLayerId: string,
  configuration: SpatialCommandExperienceConfiguration
): SpatialLayerSelectionState {
  const currentLayer = configuration.sourceLayers.find((layer) => layer.sourceLayerId === state.activeSourceLayerId);
  const nextLayer = configuration.sourceLayers.find((layer) => layer.sourceLayerId === nextSourceLayerId);
  if (!nextLayer) return state;
  const suspendedCandidateEntityId = currentLayer?.truthStatus === candidateLayerTruthStatus
    ? state.visibleCandidateEntityId ?? state.suspendedCandidateEntityId
    : state.suspendedCandidateEntityId;
  if (nextLayer.truthStatus !== candidateLayerTruthStatus) {
    return {
      activeSourceLayerId: nextLayer.sourceLayerId,
      visibleCandidateEntityId: null,
      suspendedCandidateEntityId
    };
  }
  const restored = suspendedCandidateEntityId
    && configuration.candidateEntities.some((entity) => entity.candidateId === suspendedCandidateEntityId)
    ? suspendedCandidateEntityId
    : null;
  return {
    activeSourceLayerId: nextLayer.sourceLayerId,
    visibleCandidateEntityId: restored,
    suspendedCandidateEntityId: restored
  };
}

export function transitionSpatialJourneyState(
  state: SpatialJourneyPlaybackState,
  action: SpatialJourneyPlaybackAction,
  stepIds: readonly string[]
): SpatialJourneyPlaybackState {
  const fallbackStepId = stepIds[0] ?? '';
  const currentIndex = Math.max(0, stepIds.indexOf(state.stepId));
  if (action.type === 'play') {
    return {
      stepId: stepIds.includes(state.stepId) ? state.stepId : fallbackStepId,
      playing: currentIndex < stepIds.length - 1,
      manuallySelectedEntityId: null
    };
  }
  if (action.type === 'pause' || action.type === 'hide') return { ...state, playing: false };
  if (action.type === 'select-entity') {
    return { ...state, playing: false, manuallySelectedEntityId: action.candidateEntityId };
  }
  if (action.type === 'select-step') {
    return stepIds.includes(action.stepId)
      ? { stepId: action.stepId, playing: false, manuallySelectedEntityId: null }
      : state;
  }
  if (action.type === 'reset') {
    return { stepId: fallbackStepId, playing: false, manuallySelectedEntityId: null };
  }
  const offset = action.type === 'next' || action.type === 'advance' ? 1 : -1;
  const nextIndex = Math.max(0, Math.min(stepIds.length - 1, currentIndex + offset));
  return {
    stepId: stepIds[nextIndex] ?? fallbackStepId,
    playing: action.type === 'advance' && nextIndex < stepIds.length - 1,
    manuallySelectedEntityId: null
  };
}

export const spatialOperatorLabels = {
  'duplicate-confirmed': 'نسخة مطابقة موثقة',
  'preview-ready': 'معاينة جاهزة',
  'founder-approved-working-source': 'مصدر عمل معتمد للمراجعة',
  'founder-selected-working-candidate': 'مصدر عمل مرشح',
  'concept-reference-only': 'مرجع مفاهيمي',
  'field-reference-and-evidence-candidate': 'أدلة ميدانية مرشحة',
  'normalized-image-anchor': 'مرساة بصرية غير معايرة',
  'manual-derived-from-candidate-raster': 'موضع مراجعة مشتق يدويًا',
  proposed: 'مقترح',
  probable: 'مرجح',
  conflicted: 'متعارض',
  unresolved: 'غير محسوم',
  missing: 'مفقود',
  unknown: 'غير معروف'
} as const;

export function spatialOperatorLabel(value: string): string {
  return spatialOperatorLabels[value as keyof typeof spatialOperatorLabels] ?? 'حالة تقنية متاحة في تفاصيل المصدر';
}
