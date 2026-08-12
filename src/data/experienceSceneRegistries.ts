import { sha256PayloadSync } from '../services/integrationHash';
import type { ExperiencePack, SceneAssetManifest } from '../types/experienceTwin';
import type {
  ExperienceSceneAsset,
  SceneAssetRegistry,
  SceneAssetRevision,
  SceneComparisonPair,
  SceneHotspot,
  SceneMediaKind,
  SceneTransition,
  SceneValidationContext
} from '../types/experienceScene';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from './experienceTwinPacks';
import {
  kapDesignAssetId,
  kapDesignDerivative,
  kapDesignSourceRecord
} from './kapDesignExperience';

const KAP_SOURCE_HASH = '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d';
const CONFERENCE_SOURCE_HASH = 'c14fb2b0f4b5460bb8d114c3023cde054b43cf00c334b6a772225490f5903954';
const CONFERENCE_THUMBNAIL = { contentHash: 'f70e4807fe8fcd92c49789cd2dfb310649e7b73e2e14103254de7a24c0a9d7d9', byteSize: 4_260, mimeType: 'image/png' };

const derivativeFacts: Record<string, { contentHash: string; byteSize: number; mimeType: string }> = {
  'SCENE-KAP-P5': { contentHash: '20d0bd35a98c9af5bb53e5da93567bd04151402dca9fad865242f27fa7846796', byteSize: 1_606_096, mimeType: 'image/png' },
  'SCENE-KAP-P8': { contentHash: '0f9c667defdcae8ae4f15a2258de3fe7f775529259195349dc8c69a5da075191', byteSize: 968_909, mimeType: 'image/png' },
  'SCENE-KAP-P10': { contentHash: '21fa718aafc4453b73577ce1c6b4f7e8d178f314df9338d9b9165819ce0acafc', byteSize: 501_278, mimeType: 'image/png' },
  'SCENE-KAP-P12': { contentHash: '3d5836587ba1e7bfd7d3ae546513bb1a17cab86523727b3a6a48e4c60b1ba20b', byteSize: 175_953, mimeType: 'image/png' },
  'SCENE-KAP-P13': { contentHash: '5b537fe56726e1a686df6204e0767a7f55071163d465c13aeea25cd8954ba727', byteSize: 230_264, mimeType: 'image/png' },
  'SCENE-KAP-P33': { contentHash: 'b24fd96c1e8868c506a8a66d9619c7dc0027c9ea2f9a04a0b902a0b28c94270c', byteSize: 470_119, mimeType: 'image/png' },
  'SCENE-KAP-P34': { contentHash: '4a4a252456762d8d995a46b2f56b86b2d9cad5f0771b7fd78b30cd79f9bd8f08', byteSize: 478_629, mimeType: 'image/png' },
  'SCENE-KAP-P52': { contentHash: 'd8854fe21b9bbccf9c73ab9e5bd245880b6aa7e9fc51f1c393939a635affad87', byteSize: 1_090_677, mimeType: 'image/png' },
  'SCENE-KAP-P53': { contentHash: '289b9ce7216c94ea5bf28b62042b0b7bd271d2b41e828c1d89a81e4fd74ff894', byteSize: 1_755_527, mimeType: 'image/png' },
  'SCENE-KAP-P54': { contentHash: 'af1d9d23617e608e6d92bb1a9d1e8ffdce656c35171ebdb4e362fde397023c2f', byteSize: 1_837_824, mimeType: 'image/png' },
  'SCENE-KAP-P55': { contentHash: '6c5a83861974c96d48ae55042e977bf4de7a344a38b0a9b2b05df8b8dd2f4f29', byteSize: 1_666_079, mimeType: 'image/png' },
  'SCENE-KAP-P56': { contentHash: 'e31368d7a956d0888e8094a94fa733232b7904af62ba0fd9a230f78743c208eb', byteSize: 1_871_982, mimeType: 'image/png' },
  'SCENE-KAP-P57': { contentHash: '68f71253d36cb6d3bb52e6ad08479aff8d0dfefd98c42eef6fa3ed205f9ec1a0', byteSize: 1_152_581, mimeType: 'image/png' },
  'SCENE-KAP-P58': { contentHash: '3c680abdea3fe8cb7d6ec211f7da59b6717f081b538e859514142ac826d3922b', byteSize: 1_509_565, mimeType: 'image/png' },
  'SCENE-KAP-P59': { contentHash: '4a550592856ac22b0228016cb3a1d6f58ff9b9e53fddd3fd0829803b58427392', byteSize: 1_259_391, mimeType: 'image/png' },
  'SCENE-KAP-P60': { contentHash: '2054cb64104e8d6dc2948a8626a1ccb659cb30b317f84c226e4192ed3158bfd3', byteSize: 2_145_983, mimeType: 'image/png' },
  'SCENE-KAP-P61': { contentHash: '06f067f0c5e573284a7da707dc1ee568a0f5304a5b5152441fe92f32554279b4', byteSize: 1_715_869, mimeType: 'image/png' },
  'SCENE-KAP-P62': { contentHash: 'e6ccaf56d99690e5e0e72dd558b86917559c0ca764e0d4ac3749d926e154bfb0', byteSize: 2_105_617, mimeType: 'image/png' },
  'SCENE-KAP-P63': { contentHash: '11995ba4c22e8cc1d00b29545dee8fed1ef6808ed8ca2a1e47cd70750df7b561', byteSize: 1_071_102, mimeType: 'image/png' },
  'SCENE-KAP-P65': { contentHash: '39ee1dbb9542561203e908931584dbd2c6e47ea9cc0221d1a6d62f251873ead8', byteSize: 1_640_500, mimeType: 'image/png' },
  'SCENE-CONFERENCE-FICTIONAL-FLAT': { contentHash: '2ca74f7fa7f0d92705702b67885ddfaccb28f5fe0494bbf5be67bea8e6942298', byteSize: 27_206, mimeType: 'image/png' },
  'SCENE-CONFERENCE-FICTIONAL-PANORAMA': { contentHash: 'fe6aba3474faff0e5f241e671aec12c0325da3c2d6250eb610bcb5f19616d919', byteSize: 561_419, mimeType: 'image/jpeg' },
  'SCENE-CONFERENCE-FICTIONAL-GLB': { contentHash: '27c141b1c1996870b07fb52b5a4b7feedd1f44115f8156a74d3293e0054a755a', byteSize: 1_648, mimeType: 'model/gltf-binary' },
  'SCENE-CONFERENCE-FICTIONAL-DESIGN-APPROVED': { contentHash: 'f0ed5ab91346a8815263a1be038677dc1584da2ea650b4484b747c031b3dbfb4', byteSize: 27_202, mimeType: 'image/png' },
  [kapDesignAssetId]: { contentHash: kapDesignDerivative.sha256, byteSize: kapDesignDerivative.byteSize, mimeType: kapDesignDerivative.mimeType }
};

const kapBindingOverrides: Record<string, string[]> = {
  'SCENE-KAP-P53': ['STEP-KAP-PREOPEN-ARRIVAL', 'STEP-KAP-REGIONAL-ARRIVAL', 'STEP-KAP-PRESS-ARRIVAL'],
  'SCENE-KAP-P54': ['STEP-KAP-REGIONAL-VIP-REGISTER', 'STEP-KAP-PRESS-VIP-REGISTER'],
  'SCENE-KAP-P55': ['STEP-KAP-REGIONAL-VIP-REGISTER', 'STEP-KAP-PRESS-VIP-REGISTER'],
  'SCENE-KAP-P56': ['STEP-KAP-PREOPEN-MODEL', 'STEP-KAP-REGIONAL-MODEL', 'STEP-KAP-PRESS-MODEL'],
  'SCENE-KAP-P57': ['STEP-KAP-REGIONAL-MEMORIAL', 'STEP-KAP-PRESS-MEMORIAL'],
  'SCENE-KAP-P58': ['STEP-KAP-PRESS-DINNER'],
  'SCENE-KAP-P59': ['STEP-KAP-PREOPEN-AGES', 'STEP-KAP-REGIONAL-AGES', 'STEP-KAP-PRESS-AGES'],
  'SCENE-KAP-P60': ['STEP-KAP-PREOPEN-RECOGNITION'],
  'SCENE-KAP-P61': ['STEP-KAP-PREOPEN-PHOTO'],
  'SCENE-KAP-P62': ['STEP-KAP-PRESS-MEDIA-VENUE'],
  'SCENE-KAP-P63': ['STEP-KAP-PRESS-MEDIA-VENUE']
};

function mediaKind(asset: SceneAssetManifest): SceneMediaKind {
  const medium = asset.medium === 'missing-source' ? asset.unavailableMedium : asset.medium;
  if (medium === 'panorama-equirectangular') return 'equirectangular-panorama';
  if (medium === 'panorama-cubemap') return 'cubemap-panorama';
  if (medium === 'gltf-model' || medium === 'glb-model') return 'gltf-scene';
  if (medium === 'video') return 'reference-video';
  return 'flat-render';
}

function linkedSteps(pack: ExperiencePack, asset: SceneAssetManifest): ExperiencePack['journeySteps'] {
  const ids = new Set([...asset.journeyStepIds, ...(kapBindingOverrides[asset.assetId] ?? [])]);
  return pack.journeySteps.filter((step) => ids.has(step.journeyStepId));
}

function legacySceneToAsset(pack: ExperiencePack, legacy: SceneAssetManifest): ExperienceSceneAsset {
  const facts = derivativeFacts[legacy.assetId];
  const missing = legacy.medium === 'missing-source';
  const steps = linkedSteps(pack, legacy);
  const journeyStepIds = steps.map((step) => step.journeyStepId);
  const journeys = pack.journeys.filter((journey) => journey.journeyStepIds.some((stepId) => journeyStepIds.includes(stepId)));
  const traceIds = legacy.sourcePage === null ? [] : pack.sourceTraces.filter((trace) => trace.sourceId === legacy.sourceId && trace.sourcePage === legacy.sourcePage).map((trace) => trace.traceId);
  const sourceFingerprint = legacy.sourceHash;
  const isTechnicalFixture = pack.packageStatus === 'fictional-test-reference';
  const isFounderDesignAsset = legacy.assetId === kapDesignAssetId;
  const rightsStatus = isTechnicalFixture ? 'approved-internal-use' : isFounderDesignAsset ? 'approved-client-presentation' : missing ? 'unknown' : 'internal-preview-only';
  const mappedMediaKind = mediaKind(legacy);
  const width = mappedMediaKind === 'gltf-scene' ? null : legacy.dimensions?.width ?? null;
  const height = mappedMediaKind === 'gltf-scene' ? null : legacy.dimensions?.height ?? null;
  const variantUri = missing ? null : legacy.localPreviewUri;
  return {
    schemaVersion: '1.0.0',
    assetId: legacy.assetId,
    projectId: legacy.projectId,
    eventId: legacy.eventId,
    venueId: legacy.venueId,
    scenarioIds: [...legacy.scenarioIds],
    eventDayIds: [...new Set([...legacy.eventDayIds, ...steps.map((step) => step.eventDayId)])],
    personaIds: [...new Set([...legacy.personaIds, ...journeys.map((journey) => journey.personaId)])],
    journeyIds: journeys.map((journey) => journey.journeyId),
    journeyStepIds,
    touchpointIds: [...new Set(steps.map((step) => step.touchpointId))],
    zoneIds: [...new Set([...legacy.relatedZoneIds, ...steps.flatMap((step) => step.relatedZoneIds)])],
    entityIds: [...new Set([...legacy.relatedEntityIds, ...steps.flatMap((step) => step.relatedEntityIds)])],
    spatialAnchorIds: [],
    sourceId: legacy.sourceId,
    sourceFingerprint,
    contentHash: missing ? null : facts?.contentHash ?? null,
    revision: legacy.revision.revision,
    revisionId: legacy.revision.revisionId,
    parentRevisionId: legacy.revision.previousRevisionId,
    createdAt: null,
    createdBy: isTechnicalFixture ? 'repository-owned-technical-fixture' : isFounderDesignAsset ? 'founder-authorized-local-design-intake' : 'local-human-review-process',
    mediaKind: mappedMediaKind,
    mimeType: missing ? null : facts?.mimeType ?? (mappedMediaKind === 'flat-render' ? 'image/png' : null),
    width,
    height,
    aspectRatio: width && height ? width / height : null,
    byteSize: missing ? null : facts?.byteSize ?? null,
    durationSeconds: null,
    truthClass: legacy.truthClass === 'design-approved' ? 'design-approved' : legacy.truthClass === 'actual-verified' ? 'actual-verified' : legacy.truthClass === 'design-candidate' ? 'design-candidate' : 'illustrative-only',
    approvalStatus: legacy.approvalStatus,
    availabilityStatus: missing ? 'missing' : 'manifest-only',
    rightsStatus,
    rightsOwner: isTechnicalFixture ? 'Mayadeen repository technical fixture' : isFounderDesignAsset ? 'Founder-authorized project design review' : null,
    rightsExpiry: null,
    coordinateStatus: mappedMediaKind === 'gltf-scene' ? 'unregistered' : 'unknown',
    units: mappedMediaKind === 'gltf-scene' ? { value: legacy.units?.value ?? 'unknown', status: legacy.units?.status ?? 'unknown' } : null,
    orientation: missing ? null : {
      projection: legacy.orientation?.projection ?? 'unknown',
      headingDegrees: legacy.orientation?.headingDegrees ?? null,
      northOffsetDegrees: null,
      pitchDegrees: null,
      rollDegrees: null,
      status: 'unknown'
    },
    cameraPose: mappedMediaKind === 'flat-render' && isTechnicalFixture ? { poseId: 'POSE-CONFERENCE-TECHNICAL-FRONT', coordinateReference: null, position: null, target: null, fieldOfViewDegrees: null, status: 'candidate' } : null,
    northOffset: null,
    source: legacy.sourceId && sourceFingerprint ? {
      sourceId: legacy.sourceId,
      sourceFingerprint,
      sourceRevision: legacy.sourceRevision ?? 'unknown',
      sourcePage: legacy.sourcePage,
      sourceTraceIds: traceIds,
      provenanceKind: isTechnicalFixture ? 'technical-fixture' : 'design-source',
      captureClassification: isTechnicalFixture ? 'technical-synthetic' : isFounderDesignAsset ? 'native-design-model' : 'design-render',
      filenameSafe: isTechnicalFixture ? null : isFounderDesignAsset ? kapDesignSourceRecord.safeFilename : 'V16-presentation.pdf',
      observedByteSize: isTechnicalFixture ? null : isFounderDesignAsset ? kapDesignSourceRecord.observedByteSize : 35_931_866,
      observedSha256: sourceFingerprint
    } : null,
    rights: {
      status: rightsStatus,
      owner: isTechnicalFixture ? 'Mayadeen repository technical fixture' : isFounderDesignAsset ? 'Founder-authorized project design review' : null,
      expiresAt: null,
      allowedUses: isTechnicalFixture ? ['internal-review'] : missing ? [] : isFounderDesignAsset ? ['internal-review', 'client-presentation'] : ['internal-review'],
      sourceTraceIds: traceIds,
      notesAr: [isTechnicalFixture ? 'نموذج تقني خيالي للاختبار فقط.' : isFounderDesignAsset ? 'اعتماد المؤسس يجيز عرض نية التصميم؛ المشتق نفسه مرشح تشخيصي غير هندسي.' : 'الاستخدام مقيد بالمعاينة الداخلية حتى استكمال مراجعة الحقوق.']
    },
    spatialBindings: [{
      bindingId: `BINDING-${legacy.assetId}-R1`,
      projectId: legacy.projectId,
      eventId: legacy.eventId,
      venueId: legacy.venueId,
      zoneIds: [...new Set([...legacy.relatedZoneIds, ...steps.flatMap((step) => step.relatedZoneIds)])],
      entityIds: [...new Set([...legacy.relatedEntityIds, ...steps.flatMap((step) => step.relatedEntityIds)])],
      spatialAnchorIds: [],
      coordinateStatus: mappedMediaKind === 'gltf-scene' ? 'unregistered' : 'unknown',
      authority: isFounderDesignAsset ? 'candidate' : 'none',
      sourceTraceIds: traceIds
    }],
    variants: [{
      variantId: `${legacy.assetId}-PREVIEW-R1`,
      quality: mappedMediaKind === 'gltf-scene' ? 'standard' : 'preview',
      uri: variantUri,
      mimeType: missing ? null : facts?.mimeType ?? null,
      contentHash: missing ? null : facts?.contentHash ?? null,
      width,
      height,
      byteSize: missing ? null : facts?.byteSize ?? null,
      availabilityStatus: missing ? 'missing' : 'manifest-only',
      cubemapFace: null,
      externalDependencies: []
    }],
    hotspots: [],
    transitions: [],
    fallbackAssetId: legacy.fallbackAssetId,
    supersededBy: null,
    lastVerifiedAt: null,
    warnings: [...legacy.notes]
  };
}

function revisionFor(asset: ExperienceSceneAsset): SceneAssetRevision {
  return {
    revisionId: asset.revisionId,
    assetId: asset.assetId,
    revision: asset.revision,
    parentRevisionId: asset.parentRevisionId,
    previousContentHash: null,
    contentHash: asset.contentHash,
    changeReason: null,
    createdAt: null,
    createdBy: asset.createdBy,
    timeTrust: 'not-recorded',
    status: asset.availabilityStatus === 'quarantined' ? 'quarantined' : 'candidate',
    changedFields: []
  };
}

function materializeRegistry(input: Omit<SceneAssetRegistry, 'contentHash'>): SceneAssetRegistry {
  return { ...input, contentHash: sha256PayloadSync(input) };
}

function technicalHotspots(assetId: string): { hotspots: SceneHotspot[]; transitions: SceneTransition[] } {
  const hotspots: SceneHotspot[] = [
    { hotspotId: 'HOTSPOT-CONFERENCE-TO-GLB', assetId, labelAr: 'افتح النموذج الثلاثي التقني', labelEn: 'Open technical 3D model', targetType: 'scene', targetAssetId: 'SCENE-CONFERENCE-FICTIONAL-GLB', targetJourneyStepId: 'STEP-CONFERENCE-FICTIONAL-ARRIVAL', targetTouchpointId: 'TOUCHPOINT-CONFERENCE-FICTIONAL-ARRIVAL', targetZoneId: null, targetEntityId: null, yawDegrees: 32, pitchDegrees: -4, normalizedPosition: null, targetTruthClass: 'illustrative-only', status: 'candidate' },
    { hotspotId: 'HOTSPOT-CONFERENCE-EXIT-MAP', assetId, labelAr: 'العودة إلى الخريطة السردية', labelEn: 'Return to Story Map', targetType: 'exit-to-map', targetAssetId: null, targetJourneyStepId: null, targetTouchpointId: null, targetZoneId: null, targetEntityId: null, yawDegrees: -48, pitchDegrees: 0, normalizedPosition: null, targetTruthClass: null, status: 'candidate' }
  ];
  return {
    hotspots,
    transitions: [
      { transitionId: 'TRANSITION-CONFERENCE-TO-GLB', sourceAssetId: assetId, hotspotId: 'HOTSPOT-CONFERENCE-TO-GLB', targetAssetId: 'SCENE-CONFERENCE-FICTIONAL-GLB', targetJourneyStepId: 'STEP-CONFERENCE-FICTIONAL-ARRIVAL', transitionKind: 'point-of-interest', status: 'available', routeAuthority: 'none' },
      { transitionId: 'TRANSITION-CONFERENCE-EXIT-MAP', sourceAssetId: assetId, hotspotId: 'HOTSPOT-CONFERENCE-EXIT-MAP', targetAssetId: null, targetJourneyStepId: null, transitionKind: 'exit-to-map', status: 'available', routeAuthority: 'none' }
    ]
  };
}

function buildKapRegistry(): SceneAssetRegistry {
  const assets = kapExperienceTwinPack.sceneAssets.map((asset) => legacySceneToAsset(kapExperienceTwinPack, asset));
  const revisions = assets.map(revisionFor);
  return materializeRegistry({
    schemaVersion: '1.0.0',
    registryId: 'SCENE-REGISTRY-KAP-EX1F-C1-R2',
    registryRevision: 2,
    projectId: kapExperienceTwinPack.projectId,
    eventId: kapExperienceTwinPack.eventId,
    venueId: kapExperienceTwinPack.venueId,
    experiencePackId: kapExperienceTwinPack.packId,
    assets,
    revisions,
    comparisonPairs: [],
    sourceFingerprint: sha256PayloadSync([KAP_SOURCE_HASH, kapDesignSourceRecord.observedSha256])
  });
}

function buildConferenceRegistry(): SceneAssetRegistry {
  const assets = conferenceExperienceTwinPack.sceneAssets.map((asset) => legacySceneToAsset(conferenceExperienceTwinPack, asset));
  const panorama = assets.find((asset) => asset.assetId === 'SCENE-CONFERENCE-FICTIONAL-PANORAMA')!;
  Object.assign(panorama, technicalHotspots(panorama.assetId));
  panorama.variants.unshift({ variantId: 'SCENE-CONFERENCE-FICTIONAL-PANORAMA-THUMB-R1', quality: 'thumbnail', uri: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/thumbnails/technical-conference-thumb.png', mimeType: CONFERENCE_THUMBNAIL.mimeType, contentHash: CONFERENCE_THUMBNAIL.contentHash, width: 640, height: 360, byteSize: CONFERENCE_THUMBNAIL.byteSize, availabilityStatus: 'manifest-only', cubemapFace: null, externalDependencies: [] });
  const flat = assets.find((asset) => asset.assetId === 'SCENE-CONFERENCE-FICTIONAL-FLAT')!;
  flat.hotspots = [{ hotspotId: 'HOTSPOT-CONFERENCE-FLAT-REFERENCE', assetId: flat.assetId, labelAr: 'مرجع نقطة الدخول الخيالية', labelEn: 'Fictional entry reference', targetType: 'touchpoint', targetAssetId: null, targetJourneyStepId: 'STEP-CONFERENCE-FICTIONAL-ARRIVAL', targetTouchpointId: 'TOUCHPOINT-CONFERENCE-FICTIONAL-ARRIVAL', targetZoneId: null, targetEntityId: null, yawDegrees: null, pitchDegrees: null, normalizedPosition: { x: 0.5, y: 0.58 }, targetTruthClass: 'illustrative-only', status: 'candidate' }];
  const approved = structuredClone(flat);
  approved.assetId = 'SCENE-CONFERENCE-FICTIONAL-DESIGN-APPROVED';
  approved.revisionId = `${approved.assetId}-R1`;
  approved.truthClass = 'design-approved';
  approved.approvalStatus = 'approved';
  approved.contentHash = derivativeFacts[approved.assetId]!.contentHash;
  approved.byteSize = derivativeFacts[approved.assetId]!.byteSize;
  approved.variants = [{ ...approved.variants[0]!, variantId: `${approved.assetId}-PREVIEW-R1`, uri: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/renders/technical-design-approved.png', contentHash: approved.contentHash, byteSize: approved.byteSize }];
  approved.hotspots = [];
  approved.transitions = [];
  approved.spatialBindings = approved.spatialBindings.map((binding) => ({ ...binding, bindingId: `BINDING-${approved.assetId}-R1` }));
  approved.warnings = ['نموذج تقني خيالي للاختبار', 'اعتماد خيالي داخل مشروع temporary-demo فقط.'];
  assets.push(approved);
  const comparisonPairs: SceneComparisonPair[] = [
    { comparisonPairId: 'COMPARE-CONFERENCE-FICTIONAL-DESIGN', projectId: flat.projectId, eventId: flat.eventId, leftAssetId: flat.assetId, rightAssetId: approved.assetId, mode: 'design-candidate-vs-approved', presentation: 'slider', cameraPoseCompatibility: 'compatible', pixelComparisonAllowed: true, evidenceStatus: 'none', warningsAr: ['نموذج تقني خيالي للاختبار؛ لا يمثل مراجعة مشروع حقيقي.'] },
    { comparisonPairId: 'COMPARE-CONFERENCE-FICTIONAL-INCOMPATIBLE-POSE', projectId: flat.projectId, eventId: flat.eventId, leftAssetId: flat.assetId, rightAssetId: panorama.assetId, mode: 'revision-vs-revision', presentation: 'side-by-side', cameraPoseCompatibility: 'incompatible', pixelComparisonAllowed: false, evidenceStatus: 'none', warningsAr: ['زاوية التصوير غير متوافقة؛ المقارنة البكسلية غير صالحة.'] }
  ];
  const revisions = assets.map(revisionFor);
  return materializeRegistry({ schemaVersion: '1.0.0', registryId: 'SCENE-REGISTRY-CONFERENCE-TECHNICAL-R1', registryRevision: 1, projectId: conferenceExperienceTwinPack.projectId, eventId: conferenceExperienceTwinPack.eventId, venueId: conferenceExperienceTwinPack.venueId, experiencePackId: conferenceExperienceTwinPack.packId, assets, revisions, comparisonPairs, sourceFingerprint: CONFERENCE_SOURCE_HASH });
}

export const kapExperienceSceneRegistry = buildKapRegistry();
export const conferenceExperienceSceneRegistry = buildConferenceRegistry();
export const experienceSceneRegistries = [kapExperienceSceneRegistry, conferenceExperienceSceneRegistry] as const;

export const kapCandidateScenePilotRoute = {
  routeId: 'SCENE-ROUTE-KAP-CANDIDATE-PILOT-R1',
  status: 'candidate' as const,
  routeAuthority: 'none' as const,
  labelAr: 'مسار مشاهد مرشح للمراجعة - ليس مسارًا ميدانيًا',
  stops: [
    { order: 1, labelAr: 'الوصول', journeyStepId: 'STEP-KAP-PRESS-ARRIVAL', sceneAssetIds: ['SCENE-KAP-P13'] },
    { order: 2, labelAr: 'الاستقبال', journeyStepId: 'STEP-KAP-PRESS-ARRIVAL', sceneAssetIds: ['SCENE-KAP-P53'] },
    { order: 3, labelAr: 'مجسم الحدائق', journeyStepId: 'STEP-KAP-PRESS-MODEL', sceneAssetIds: ['SCENE-KAP-P56'] },
    { order: 4, labelAr: 'ممر العصور', journeyStepId: 'STEP-KAP-PRESS-AGES', sceneAssetIds: ['SCENE-KAP-P59'] },
    { order: 5, labelAr: 'النصب والإعلام', journeyStepId: 'STEP-KAP-PRESS-MEMORIAL', sceneAssetIds: ['SCENE-KAP-P57', 'SCENE-KAP-P62'] },
    { order: 6, labelAr: 'العشاء وكبار الشخصيات', journeyStepId: 'STEP-KAP-PRESS-DINNER', sceneAssetIds: ['SCENE-KAP-P58', 'SCENE-KAP-P54'] },
    { order: 7, labelAr: 'المغادرة', journeyStepId: 'STEP-KAP-PRESS-FAREWELL', sceneAssetIds: ['SCENE-KAP-P13'] }
  ]
};

export function findExperienceSceneRegistry(projectId: string, eventId: string, venueId: string): SceneAssetRegistry | null {
  return experienceSceneRegistries.find((registry) => registry.projectId === projectId && registry.eventId === eventId && registry.venueId === venueId) ?? null;
}

export function createSceneValidationContext(pack: ExperiencePack, registry: SceneAssetRegistry): SceneValidationContext {
  return {
    projectId: pack.projectId,
    eventId: pack.eventId,
    venueId: pack.venueId,
    knownScenarioIds: new Set(pack.scenarios.map((item) => item.scenarioId)),
    knownEventDayIds: new Set(pack.eventDays.map((item) => item.eventDayId)),
    knownPersonaIds: new Set(pack.personas.map((item) => item.personaId)),
    knownJourneyIds: new Set(pack.journeys.map((item) => item.journeyId)),
    knownJourneyStepIds: new Set(pack.journeySteps.map((item) => item.journeyStepId)),
    knownTouchpointIds: new Set(pack.touchpoints.map((item) => item.touchpointId)),
    knownZoneIds: new Set(pack.journeySteps.flatMap((item) => item.relatedZoneIds)),
    knownEntityIds: new Set(pack.journeySteps.flatMap((item) => item.relatedEntityIds)),
    knownSpatialAnchorIds: new Set(),
    knownSourceIds: new Set(pack.sourceIds),
    registryAssets: registry.assets,
    registryRevisions: registry.revisions
  };
}
