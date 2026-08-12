import type {
  ExperienceSceneAsset,
  SceneAssetRegistry,
  SceneAssetRevision,
  SceneComparisonPair,
  SceneMediaKind,
  SceneValidationContext,
  SceneValidationIssue,
  SceneValidationResult
} from '../types/experienceScene';
import { validateExperienceSceneSchema } from './experienceSceneSchema';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const panoramaMimeTypes = new Set(['image/jpeg', 'image/webp', 'image/avif']);
const gltfMimeTypes = new Set(['model/gltf+json', 'model/gltf-binary']);
const videoMimeTypes = new Set(['video/mp4', 'video/webm']);

function issue(code: string, path: string, messageAr: string, severity: SceneValidationIssue['severity'] = 'blocking'): SceneValidationIssue {
  return { code, path, messageAr, severity };
}

function appendUnknownReferences(
  issues: SceneValidationIssue[],
  values: readonly string[],
  known: ReadonlySet<string>,
  path: string,
  labelAr: string
): void {
  values.filter((value) => !known.has(value)).forEach((value) => {
    issues.push(issue('scene-reference-unknown', path, `${labelAr} غير معروف داخل سياق المشروع: ${value}.`));
  });
}

export function sceneVariantUriIsSafe(uri: string | null): boolean {
  if (uri === null) return true;
  const normalized = uri.toLowerCase();
  return (uri.startsWith('/local-assets/experience-scenes/') || uri.startsWith('/local-assets/experience/'))
    && !uri.includes('..')
    && !uri.includes('\\')
    && !normalized.includes('%2e%2e')
    && !normalized.startsWith('http:')
    && !normalized.startsWith('https:')
    && !normalized.startsWith('file:')
    && !normalized.includes('/users/')
    && !normalized.includes('token=')
    && !normalized.includes('signature=');
}

function mimeTypeAllowed(mediaKind: SceneMediaKind, mimeType: string | null): boolean {
  if (mimeType === null) return false;
  if (mediaKind === 'flat-render') return imageMimeTypes.has(mimeType);
  if (mediaKind === 'equirectangular-panorama' || mediaKind === 'actual-360-capture' || mediaKind === 'cubemap-panorama') return panoramaMimeTypes.has(mimeType);
  if (mediaKind === 'gltf-scene') return gltfMimeTypes.has(mimeType);
  if (mediaKind === 'reference-video') return videoMimeTypes.has(mimeType);
  return false;
}

function sourceIsActualCapture(asset: ExperienceSceneAsset): boolean {
  return asset.source?.provenanceKind === 'field-capture'
    && (asset.source.captureClassification === 'actual-capture-reported' || asset.source.captureClassification === 'actual-capture-verified');
}

function validateRevision(asset: ExperienceSceneAsset, revisions: readonly SceneAssetRevision[]): SceneValidationIssue[] {
  const issues: SceneValidationIssue[] = [];
  const matching = revisions.filter((revision) => revision.assetId === asset.assetId);
  const sameRevision = matching.filter((revision) => revision.revision === asset.revision);
  if (sameRevision.length > 1 && new Set(sameRevision.map((revision) => revision.contentHash)).size > 1) {
    issues.push(issue('scene-revision-overwrite', '/revision', 'لا يجوز إعادة كتابة رقم مراجعة مشهد بمحتوى مختلف.'));
  }
  if (asset.revision === 1 && asset.parentRevisionId !== null) {
    issues.push(issue('scene-root-parent-invalid', '/parentRevisionId', 'المراجعة الأولى لا يجوز أن تشير إلى مراجعة سابقة.'));
  }
  if (asset.revision > 1) {
    const parent = revisions.find((revision) => revision.revisionId === asset.parentRevisionId && revision.assetId === asset.assetId);
    if (!parent || parent.revision !== asset.revision - 1) {
      issues.push(issue('scene-parent-revision-invalid', '/parentRevisionId', 'المراجعة السابقة غير موجودة أو لا تسبق المراجعة الحالية مباشرة.'));
    }
  }
  return issues;
}

function validateRights(asset: ExperienceSceneAsset): SceneValidationIssue[] {
  const issues: SceneValidationIssue[] = [];
  if (asset.rights.status !== asset.rightsStatus || asset.rights.owner !== asset.rightsOwner || asset.rights.expiresAt !== asset.rightsExpiry) {
    issues.push(issue('scene-rights-projection-mismatch', '/rights', 'حالة الحقوق المختصرة لا تطابق عقد الحقوق القانوني.'));
  }
  if (asset.rightsStatus === 'expired' || asset.rightsStatus === 'blocked') {
    issues.push(issue('scene-rights-blocked', '/rightsStatus', 'حقوق هذا الأصل منتهية أو محجوبة، لذلك لا يمكن عرضه.'));
  }
  if (asset.rightsExpiry) {
    const expiry = Date.parse(asset.rightsExpiry);
    if (!Number.isFinite(expiry)) issues.push(issue('scene-rights-expiry-invalid', '/rightsExpiry', 'تاريخ انتهاء الحقوق غير صالح.'));
  }
  if (asset.approvalStatus === 'approved' && asset.truthClass !== 'design-approved' && asset.truthClass !== 'actual-verified') {
    issues.push(issue('scene-truth-approval-conflict', '/approvalStatus', 'حالة الاعتماد لا تتوافق مع تصنيف حقيقة المشهد.'));
  }
  if (asset.truthClass === 'design-approved' && asset.approvalStatus !== 'approved') {
    issues.push(issue('scene-design-approval-missing', '/approvalStatus', 'تصنيف التصميم المعتمد يحتاج إلى حالة اعتماد صريحة.'));
  }
  return issues;
}

function validateMedia(asset: ExperienceSceneAsset): SceneValidationIssue[] {
  const issues: SceneValidationIssue[] = [];
  const missing = asset.availabilityStatus === 'missing';
  if (!missing && !mimeTypeAllowed(asset.mediaKind, asset.mimeType)) {
    issues.push(issue('scene-mime-unsupported', '/mimeType', 'نوع ملف المشهد غير مدعوم أو لا يطابق نوع الوسيط المعلن.'));
  }
  if (!missing && (!asset.sourceId || !asset.sourceFingerprint || !asset.source)) {
    issues.push(issue('scene-source-identity-missing', '/source', 'هوية المصدر ومراجعته وبصمته مطلوبة قبل إتاحة المشهد.'));
  }
  if (!missing && ['locally-available', 'loadable'].includes(asset.availabilityStatus) && !asset.contentHash) {
    issues.push(issue('scene-content-hash-missing', '/contentHash', 'بصمة محتوى الأصل المحلي مطلوبة قبل التحميل.'));
  }
  if (asset.source && (asset.source.sourceId !== asset.sourceId || asset.source.sourceFingerprint !== asset.sourceFingerprint)) {
    issues.push(issue('scene-source-projection-mismatch', '/source', 'هوية المصدر المختصرة لا تطابق سجل المصدر المرتبط.'));
  }
  if (asset.variants.some((variant) => !sceneVariantUriIsSafe(variant.uri))) {
    issues.push(issue('scene-local-uri-unsafe', '/variants', 'مسار الأصل يجب أن يكون نسبيًا ومحليًا ومقيدًا بمجلد مشاهد التجربة.'));
  }
  if (asset.variants.some((variant) => variant.externalDependencies.length > 0)) {
    issues.push(issue('scene-external-dependency-blocked', '/variants', 'المراجع الشبكية أو الخارجية داخل أصل المشهد محجوبة افتراضيًا.'));
  }
  if (asset.variants.some((variant) => variant.contentHash && asset.contentHash && variant.quality !== 'thumbnail' && variant.contentHash !== asset.contentHash)) {
    issues.push(issue('scene-variant-hash-mismatch', '/variants', 'بصمة نسخة العرض لا تطابق بصمة محتوى الأصل المسجل.'));
  }

  const panorama = asset.mediaKind === 'equirectangular-panorama' || asset.mediaKind === 'actual-360-capture';
  if (panorama && !missing) {
    if (!asset.width || !asset.height || !asset.aspectRatio || Math.abs(asset.width / asset.height - 2) > 0.02 || Math.abs(asset.aspectRatio - 2) > 0.02) {
      issues.push(issue('scene-panorama-aspect-invalid', '/aspectRatio', 'المشهد البانورامي الحقيقي يجب أن يكون بنسبة أبعاد 2:1 تقريبًا.'));
    }
    if (asset.orientation?.projection !== 'equirectangular') {
      issues.push(issue('scene-panorama-projection-invalid', '/orientation', 'إسقاط البانوراما لا يطابق الإسقاط الكروي equirectangular.'));
    }
    if (asset.source?.captureClassification === 'design-render') {
      issues.push(issue('scene-flat-render-masquerading-as-panorama', '/source/captureClassification', 'لا يجوز عرض صورة منظور مسطحة على أنها مشهد 360.'));
    }
    if ((asset.width ?? 0) < 4096 || (asset.height ?? 0) < 2048) {
      issues.push(issue('scene-panorama-resolution-low', '/width', 'دقة البانوراما أقل من 4096x2048 وقد لا تكفي للمراجعة.', 'warning'));
    }
  }
  if (!missing && asset.mediaKind === 'actual-360-capture' && !sourceIsActualCapture(asset)) {
    issues.push(issue('scene-actual-360-provenance-missing', '/source', 'تصنيف الالتقاط الفعلي 360 يحتاج إلى مصدر ميداني موثق، وليس تصميمًا أو ملفًا مجهولًا.'));
  }
  if (!missing && (asset.truthClass === 'actual-reported' || asset.truthClass === 'actual-verified') && !sourceIsActualCapture(asset)) {
    issues.push(issue('scene-actual-truth-provenance-missing', '/truthClass', 'لا يمكن تقديم مشهد على أنه فعلي دون سلسلة مصدر التقاط ميداني صالحة.'));
  }
  if (asset.truthClass === 'actual-verified' && (asset.source?.captureClassification !== 'actual-capture-verified' || !asset.lastVerifiedAt)) {
    issues.push(issue('scene-actual-verification-missing', '/lastVerifiedAt', 'الحقيقة الفعلية المتحققة تحتاج إلى مصدر التقاط متحقق وتاريخ تحقق صالح.'));
  }
  if ((asset.truthClass === 'design-candidate' || asset.truthClass === 'design-approved') && asset.source?.provenanceKind === 'field-capture') {
    issues.push(issue('scene-design-truth-source-conflict', '/truthClass', 'تصنيف التصميم لا يتوافق مع سجل مصدر ميداني فعلي.'));
  }
  if (!missing && asset.mediaKind === 'cubemap-panorama') {
    const faces = asset.variants.filter((variant) => variant.cubemapFace !== null);
    const names = new Set(faces.map((variant) => variant.cubemapFace));
    const dimensions = new Set(faces.map((variant) => `${variant.width}x${variant.height}`));
    if (faces.length !== 6 || names.size !== 6 || dimensions.size !== 1 || faces.some((face) => face.width !== face.height)) {
      issues.push(issue('scene-cubemap-faces-invalid', '/variants', 'خريطة المكعب تحتاج إلى ستة أوجه مربعة ومتطابقة.'));
    }
  }
  if (!missing && asset.mediaKind === 'gltf-scene') {
    if (!asset.units || asset.units.status === 'unknown') {
      issues.push(issue('scene-gltf-units-missing', '/units', 'يجب إعلان وحدات نموذج GLB/GLTF قبل إتاحته.'));
    }
    if (asset.coordinateStatus === 'unknown') {
      issues.push(issue('scene-gltf-coordinate-status-missing', '/coordinateStatus', 'حالة إحداثيات النموذج مطلوبة حتى لو كانت غير مسجلة هندسيًا.'));
    }
  }
  if (asset.mediaKind === 'flat-render' && asset.orientation?.projection === 'equirectangular') {
    issues.push(issue('scene-flat-render-projection-conflict', '/orientation', 'المرجع المسطح لا يجوز أن يحمل إسقاط بانوراما كروية.'));
  }
  if (['invalid', 'quarantined'].includes(asset.availabilityStatus) && !asset.fallbackAssetId) {
    issues.push(issue('scene-fallback-missing', '/fallbackAssetId', 'الأصل غير القابل للتحميل يحتاج إلى بديل صريح أو حالة فقدان آمنة.'));
  }
  return issues;
}

function validateHotspots(asset: ExperienceSceneAsset, context: SceneValidationContext): SceneValidationIssue[] {
  const issues: SceneValidationIssue[] = [];
  const assetIds = new Set(context.registryAssets.map((candidate) => candidate.assetId));
  const hotspotIds = new Set<string>();
  asset.hotspots.forEach((hotspot, index) => {
    if (hotspotIds.has(hotspot.hotspotId)) issues.push(issue('scene-hotspot-id-duplicate', `/hotspots/${index}/hotspotId`, 'معرّف نقطة التفاعل مكرر داخل المشهد.'));
    hotspotIds.add(hotspot.hotspotId);
    if (hotspot.assetId !== asset.assetId) issues.push(issue('scene-hotspot-source-mismatch', `/hotspots/${index}/assetId`, 'نقطة التفاعل لا تنتمي إلى أصل المشهد الحالي.'));
    if (hotspot.targetAssetId && !assetIds.has(hotspot.targetAssetId)) issues.push(issue('scene-hotspot-target-unknown', `/hotspots/${index}/targetAssetId`, 'هدف نقطة التفاعل غير معروف داخل سجل المشروع.'));
    if (hotspot.targetJourneyStepId && !context.knownJourneyStepIds.has(hotspot.targetJourneyStepId)) issues.push(issue('scene-hotspot-step-unknown', `/hotspots/${index}/targetJourneyStepId`, 'خطوة الرحلة المستهدفة غير معروفة.'));
    if (hotspot.targetTouchpointId && !context.knownTouchpointIds.has(hotspot.targetTouchpointId)) issues.push(issue('scene-hotspot-touchpoint-unknown', `/hotspots/${index}/targetTouchpointId`, 'نقطة التماس المستهدفة غير معروفة.'));
    if (hotspot.targetZoneId && !context.knownZoneIds.has(hotspot.targetZoneId)) issues.push(issue('scene-hotspot-zone-unknown', `/hotspots/${index}/targetZoneId`, 'المنطقة المستهدفة غير معروفة.'));
    if (hotspot.targetEntityId && !context.knownEntityIds.has(hotspot.targetEntityId)) issues.push(issue('scene-hotspot-entity-unknown', `/hotspots/${index}/targetEntityId`, 'العنصر المستهدف غير معروف.'));
    if (hotspot.targetType !== 'exit-to-map' && !hotspot.targetAssetId && !hotspot.targetJourneyStepId && !hotspot.targetTouchpointId && !hotspot.targetZoneId && !hotspot.targetEntityId) {
      issues.push(issue('scene-hotspot-target-missing', `/hotspots/${index}`, 'نقطة التفاعل لا تحمل هدفًا صالحًا.'));
    }
  });
  asset.transitions.forEach((transition, index) => {
    if (transition.sourceAssetId !== asset.assetId || !hotspotIds.has(transition.hotspotId)) {
      issues.push(issue('scene-transition-hotspot-mismatch', `/transitions/${index}`, 'الانتقال لا يطابق نقطة تفاعل معروفة في المشهد.'));
    }
  });
  return issues;
}

export function validateExperienceSceneAsset(asset: unknown, context: SceneValidationContext): SceneValidationResult {
  const schema = validateExperienceSceneSchema('scene-asset-manifest', asset);
  if (!schema.valid || !asset || typeof asset !== 'object') {
    return { valid: false, schemaValid: false, renderable: false, quarantined: true, issues: schema.issues };
  }

  try {
    const candidate = structuredClone(asset) as ExperienceSceneAsset;
    const issues = [...schema.issues];
    if (candidate.projectId !== context.projectId) issues.push(issue('scene-cross-project-binding', '/projectId', 'أصل المشهد مرتبط بمشروع مختلف وتم حجبه.'));
    if (candidate.eventId !== context.eventId) issues.push(issue('scene-cross-event-binding', '/eventId', 'أصل المشهد مرتبط بفعالية مختلفة وتم حجبه.'));
    if (candidate.venueId !== context.venueId) issues.push(issue('scene-cross-venue-binding', '/venueId', 'أصل المشهد مرتبط بموقع مختلف وتم حجبه.'));
    appendUnknownReferences(issues, candidate.scenarioIds, context.knownScenarioIds, '/scenarioIds', 'السيناريو');
    appendUnknownReferences(issues, candidate.eventDayIds, context.knownEventDayIds, '/eventDayIds', 'اليوم');
    appendUnknownReferences(issues, candidate.personaIds, context.knownPersonaIds, '/personaIds', 'الشخصية');
    appendUnknownReferences(issues, candidate.journeyIds, context.knownJourneyIds, '/journeyIds', 'الرحلة');
    appendUnknownReferences(issues, candidate.journeyStepIds, context.knownJourneyStepIds, '/journeyStepIds', 'خطوة الرحلة');
    appendUnknownReferences(issues, candidate.touchpointIds, context.knownTouchpointIds, '/touchpointIds', 'نقطة التماس');
    appendUnknownReferences(issues, candidate.zoneIds, context.knownZoneIds, '/zoneIds', 'المنطقة');
    appendUnknownReferences(issues, candidate.entityIds, context.knownEntityIds, '/entityIds', 'العنصر');
    appendUnknownReferences(issues, candidate.spatialAnchorIds, context.knownSpatialAnchorIds, '/spatialAnchorIds', 'المرساة المكانية');
    if (candidate.sourceId && !context.knownSourceIds.has(candidate.sourceId)) issues.push(issue('scene-source-unknown', '/sourceId', 'هوية مصدر المشهد غير مسجلة في حزمة المشروع.'));
    issues.push(...validateRevision(candidate, context.registryRevisions));
    issues.push(...validateRights(candidate));
    issues.push(...validateMedia(candidate));
    issues.push(...validateHotspots(candidate, context));
    if (candidate.fallbackAssetId && !context.registryAssets.some((item) => item.assetId === candidate.fallbackAssetId && item.projectId === candidate.projectId && item.eventId === candidate.eventId)) {
      issues.push(issue('scene-fallback-unknown', '/fallbackAssetId', 'البديل المحدد غير موجود في سجل المشاهد نفسه.'));
    }
    const blocking = issues.some((item) => item.severity === 'blocking');
    const rightsPermitLoad = !['unknown', 'review-required', 'expired', 'blocked'].includes(candidate.rightsStatus);
    const availabilityPermitsLoad = ['locally-available', 'loadable', 'manifest-only'].includes(candidate.availabilityStatus);
    return {
      valid: !blocking,
      schemaValid: true,
      renderable: !blocking && rightsPermitLoad && availabilityPermitsLoad && candidate.variants.some((variant) => Boolean(variant.uri)),
      quarantined: blocking || candidate.availabilityStatus === 'quarantined',
      issues
    };
  } catch {
    return {
      valid: false,
      schemaValid: true,
      renderable: false,
      quarantined: true,
      issues: [issue('scene-validation-failed-safe', '/', 'تعذر فحص أصل المشهد بأمان، لذلك تم نقله إلى حالة محجوبة.')]
    };
  }
}

function graphHasUnusableCycle(registry: SceneAssetRegistry): boolean {
  const edges = new Map<string, string[]>();
  const hasExit = new Set<string>();
  registry.assets.forEach((asset) => {
    edges.set(asset.assetId, asset.hotspots.flatMap((hotspot) => hotspot.targetAssetId ? [hotspot.targetAssetId] : []));
    if (asset.hotspots.some((hotspot) => hotspot.targetType === 'exit-to-map')) hasExit.add(asset.assetId);
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (assetId: string, path: string[]): boolean => {
    if (visiting.has(assetId)) {
      const cycle = path.slice(path.indexOf(assetId));
      return cycle.length > 0 && cycle.every((id) => !hasExit.has(id));
    }
    if (visited.has(assetId)) return false;
    visiting.add(assetId);
    const nextPath = [...path, assetId];
    const unusable = (edges.get(assetId) ?? []).some((target) => visit(target, nextPath));
    visiting.delete(assetId);
    visited.add(assetId);
    return unusable;
  };
  return registry.assets.some((asset) => visit(asset.assetId, []));
}

export function validateExperienceSceneRegistry(registry: SceneAssetRegistry, context: Omit<SceneValidationContext, 'registryAssets' | 'registryRevisions'>): SceneValidationResult {
  const schema = validateExperienceSceneSchema('scene-registry-export', registry);
  const fullContext: SceneValidationContext = { ...context, registryAssets: registry.assets, registryRevisions: registry.revisions };
  const assetResults = registry.assets.map((asset) => validateExperienceSceneAsset(asset, fullContext));
  const issues = [...schema.issues, ...assetResults.flatMap((result) => result.issues)];
  const ids = registry.assets.map((asset) => asset.assetId);
  if (new Set(ids).size !== ids.length) issues.push(issue('scene-registry-asset-id-duplicate', '/assets', 'سجل المشاهد يحتوي معرّف أصل مكررًا.'));
  if (graphHasUnusableCycle(registry)) issues.push(issue('scene-hotspot-cycle-unusable', '/assets', 'شبكة نقاط التفاعل تحتوي دورة مغلقة بلا مخرج آمن إلى الخريطة.'));
  const blocking = issues.some((item) => item.severity === 'blocking');
  return {
    valid: schema.valid && !blocking,
    schemaValid: schema.valid,
    renderable: !blocking && assetResults.some((result) => result.renderable),
    quarantined: blocking,
    issues
  };
}

export function validateSceneComparisonPair(pair: SceneComparisonPair, registry: SceneAssetRegistry): SceneValidationResult {
  const schema = validateExperienceSceneSchema('scene-comparison-pair', pair);
  const issues = [...schema.issues];
  const left = registry.assets.find((asset) => asset.assetId === pair.leftAssetId);
  const right = registry.assets.find((asset) => asset.assetId === pair.rightAssetId);
  if (!left || !right) issues.push(issue('scene-comparison-asset-missing', '/', 'لا تتوفر أصول المقارنة المطلوبة داخل سجل المشروع.'));
  if (left && right && (left.projectId !== right.projectId || left.eventId !== right.eventId || pair.projectId !== left.projectId || pair.eventId !== left.eventId)) {
    issues.push(issue('scene-comparison-scope-mismatch', '/', 'لا يجوز مقارنة أصول من مشروعين أو فعاليتين مختلفتين.'));
  }
  if (pair.pixelComparisonAllowed && pair.cameraPoseCompatibility !== 'compatible') {
    issues.push(issue('scene-comparison-pose-incompatible', '/pixelComparisonAllowed', 'المقارنة البكسلية محجوبة لأن زاوية التصوير أو وضع الكاميرا غير متوافق.', 'blocking'));
  }
  if (pair.presentation === 'slider' && pair.cameraPoseCompatibility !== 'compatible') {
    issues.push(issue('scene-comparison-slider-incompatible', '/presentation', 'مقارنة الشريط تحتاج إلى وضع كاميرا متوافق؛ استخدم العرض جنبًا إلى جنب.', 'warning'));
  }
  const blocking = issues.some((item) => item.severity === 'blocking');
  return { valid: schema.valid && !blocking, schemaValid: schema.valid, renderable: !blocking && Boolean(left && right), quarantined: blocking, issues };
}
