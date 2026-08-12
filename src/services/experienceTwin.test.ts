import { describe, expect, it } from 'vitest';
import sourceManifest from '../../pilot-input/manifests/kap-experience-source-v1.json';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from '../data/experienceTwinPacks';
import { declutterExperienceMarkers, findExperienceTwinConfiguration } from '../data/experienceTwinConfigurations';
import type { ExperiencePack, SceneAssetManifest } from '../types/experienceTwin';
import {
  createExperiencePackCandidateRevision,
  exportSanitizedExperiencePack,
  previewExperiencePackDifference,
  resetExperiencePackCandidate
} from './experiencePackAuthoring';
import { projectExperienceTruth } from './experienceProjection';
import {
  experienceSceneAdapters,
  experienceSceneGateway,
  futureExperienceSceneAdapters,
  selectSceneAssetForMode,
  validateSceneAssetManifest
} from './experienceSceneGateway';
import { createExperienceSelection, selectionBelongsToPack, writeExperienceSelectionToUrl } from './experienceSelection';
import {
  createDigitalRehearsalState,
  digitalRehearsalTruthLabel,
  reduceDigitalRehearsal
} from './digitalRehearsal';
import {
  experiencePackContentHash,
  materializeExperiencePack,
  validateExperiencePack
} from './experienceTwinValidation';

const KAP_ZONES = ['ZONE-ARRIVAL-001', 'ZONE-AGES-TUNNEL-001', 'ZONE-SHOW-001', 'ZONE-PHOTO-MEDIA-001', 'ZONE-DINNER-VIP-001'] as const;
const KAP_ENTITIES = Array.from({ length: 11 }, (_, index) => `ENTITY-KAP-OP-${String(index + 1).padStart(3, '0')}`);
const validationOptions = { allowedZoneIds: KAP_ZONES, allowedEntityIds: KAP_ENTITIES, forbiddenAnchoredZoneIds: ['ZONE-SHOW-001'] };

function clonePack(pack = kapExperienceTwinPack): ExperiencePack {
  return structuredClone(pack);
}

function sceneFixture(medium: SceneAssetManifest['medium']): SceneAssetManifest {
  const source = structuredClone(kapExperienceTwinPack.sceneAssets.find((asset) => asset.sourcePage === 52)!);
  source.assetId = `SCENE-TEST-${medium}`;
  source.medium = medium;
  source.eventDayIds = [kapExperienceTwinPack.eventDays[0]!.eventDayId];
  source.relatedEntityIds = ['ENTITY-KAP-OP-001'];
  source.localPreviewUri = `/local-assets/experience/test/${source.assetId}`;
  return source;
}

describe('Stage EX.1A experience pack', () => {
  it('validates the KAP candidate pack and deterministic content hash', () => {
    const result = validateExperiencePack(kapExperienceTwinPack, validationOptions);
    expect(result.valid).toBe(true);
    expect(experiencePackContentHash(kapExperienceTwinPack)).toBe(kapExperienceTwinPack.contentHash);
    expect(materializeExperiencePack(clonePack()).contentHash).toBe(kapExperienceTwinPack.contentHash);
    expect(kapExperienceTwinPack).toMatchObject({ packageStatus: 'candidate', frozen: false, activated: false, baseline: false, operationalApproval: 'none' });
  });

  it('registers the exact candidate source fingerprint without a raw source path', () => {
    expect(sourceManifest.expectedByteSize).toBe(35_931_866);
    expect(sourceManifest.expectedSha256).toBe('9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d');
    expect(sourceManifest.observedSha256).toBe(sourceManifest.expectedSha256);
    expect(JSON.stringify(sourceManifest)).not.toContain('/Users/');
    expect(sourceManifest.previewPages).toEqual([5, 8, 10, 12, 13, 33, 34, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65]);
  });

  it('preserves all four source scenarios without summing attendance or treating it as capacity', () => {
    expect(kapExperienceTwinPack.scenarios.map((scenario) => [scenario.scenarioType, scenario.durationDays, scenario.sourceDeclaredAttendance.value])).toEqual([
      ['basic', 4, 650],
      ['celebratory', 4, 700],
      ['integrated', 7, 2150],
      ['expanded', 9, 2150]
    ]);
    expect(kapExperienceTwinPack.scenarios.every((scenario) => scenario.sourceDeclaredAttendance.classification === 'source-declared-not-capacity')).toBe(true);
    expect(kapExperienceTwinPack.defaultSelection.scenarioId).toBe('SCENARIO-KAP-BASIC-2026');
  });

  it('registers the exact four-day candidate and keeps unknown attendance unknown', () => {
    expect(kapExperienceTwinPack.eventDays.map((day) => [day.date, day.sourceDeclaredAttendance.value, day.sourceDeclaredAttendance.qualifier])).toEqual([
      ['2026-10-31', 350, 'more-than'],
      ['2026-11-01', null, 'unknown'],
      ['2026-11-02', 100, 'exact'],
      ['2026-11-03', 200, 'exact']
    ]);
    expect(kapExperienceTwinPack.eventDays[2]!.sourceTimeWindow).toMatchObject({ start: '18:00', end: '21:00' });
    expect(kapExperienceTwinPack.eventDays[3]!.sourceTimeWindow).toMatchObject({ start: '17:00', end: '21:00' });
    expect(kapExperienceTwinPack.eventDays[1]).toMatchObject({
      operationalJourneyStatus: 'not-applicable',
      visitorJourneyStatus: 'not-applicable',
      spatialRouteRequired: false,
      sharedVisitorTransitionRequired: false,
      contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition'
    });
    expect(kapExperienceTwinPack.journeySteps).toHaveLength(40);
  });

  it('separates experience personas from all nine operational lenses', () => {
    const personaTypes = new Set(kapExperienceTwinPack.personas.map((persona) => persona.personaType));
    const lensIds = new Set(kapExperienceTwinPack.operationalLenses.map((lens) => lens.lensId));
    expect(kapExperienceTwinPack.operationalLenses).toHaveLength(9);
    expect([...personaTypes].some((persona) => lensIds.has(persona as never))).toBe(false);
    expect(personaTypes).toEqual(new Set(['employee-and-family', 'royal-vip', 'regional-leadership', 'media-and-content', 'host-and-organizer']));
  });

  it('orders every journey deterministically and binds each step to its own day', () => {
    for (const journey of kapExperienceTwinPack.journeys) {
      const steps = journey.journeyStepIds.map((id) => kapExperienceTwinPack.journeySteps.find((step) => step.journeyStepId === id)!);
      expect(steps.map((step) => step.order)).toEqual(steps.map((_, index) => index + 1));
      expect(steps.every((step) => step.eventDayId === journey.eventDayId)).toBe(true);
    }
  });

  it('reuses existing zones and entities without creating duplicate core objects', () => {
    const referencedZones = new Set(kapExperienceTwinPack.journeySteps.flatMap((step) => step.relatedZoneIds));
    const referencedEntities = new Set(kapExperienceTwinPack.journeySteps.flatMap((step) => step.relatedEntityIds));
    expect([...referencedZones].every((id) => KAP_ZONES.includes(id as never))).toBe(true);
    expect([...referencedEntities].every((id) => KAP_ENTITIES.includes(id))).toBe(true);
    expect(Object.keys(kapExperienceTwinPack)).not.toContain('entities');
    expect(Object.keys(kapExperienceTwinPack)).not.toContain('zones');
  });

  it('keeps every ZONE-SHOW-001 relationship unanchored', () => {
    const showSteps = kapExperienceTwinPack.journeySteps.filter((step) => step.relatedZoneIds.includes('ZONE-SHOW-001'));
    expect(showSteps.length).toBeGreaterThan(0);
    expect(showSteps.every((step) => step.spatialStatus === 'unresolved-no-anchor' && step.relatedEntityIds.length === 0)).toBe(true);
    const tampered = clonePack();
    const show = tampered.journeySteps.find((step) => step.relatedZoneIds.includes('ZONE-SHOW-001'))!;
    show.spatialStatus = 'candidate-anchor';
    const result = validateExperiencePack(materializeExperiencePack(tampered), validationOptions);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'experience-unresolved-zone-anchored')).toBe(true);
  });

  it('rejects cross-project scene scope and unresolved references', () => {
    const tampered = clonePack();
    tampered.sceneAssets[0]!.projectId = 'PROJECT-FOREIGN';
    tampered.journeySteps[0]!.relatedEntityIds = ['ENTITY-FOREIGN-001'];
    const result = validateExperiencePack(materializeExperiencePack(tampered), validationOptions);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('experience-scene-scope-mismatch');
    expect(result.issues.map((issue) => issue.code)).toContain('experience-reference-unresolved');
  });

  it('keeps the eight candidate areas non-geometric and non-capacity-bearing', () => {
    expect(kapExperienceTwinPack.experienceAreas.map((area) => area.labelAr)).toEqual(['الوصول', 'الاستقبال', 'التفعيلات', 'جولة الحدائق', 'الاستراحة', 'العشاء', 'الدرونز', 'الألعاب النارية']);
    expect(kapExperienceTwinPack.experienceAreas.every((area) => area.geometryStatus === 'none' && area.capacityStatus === 'unknown' && area.routeStatus === 'unapproved' && area.cadAlignmentStatus === 'not-established')).toBe(true);
  });
});

describe('ExperienceSceneGateway', () => {
  it('publishes all current and future adapter boundaries without a vendor runtime', () => {
    expect(experienceSceneAdapters.map((adapter) => adapter.adapterId)).toEqual(['illustrated-map', 'render-reference', 'panorama', 'web3d', 'video', 'missing']);
    expect(futureExperienceSceneAdapters.map((adapter) => adapter.adapterId)).toEqual(['cesium', 'projection', 'physical-twin', 'live-camera']);
    expect(experienceSceneGateway.adapters).toBe(experienceSceneAdapters);
  });

  it('accepts a properly bound 8192x4096 equirectangular manifest', () => {
    const asset = sceneFixture('panorama-equirectangular');
    asset.dimensions = { width: 8192, height: 4096, unit: 'pixel', status: 'source-reported' };
    asset.orientation = { projection: 'equirectangular', headingDegrees: null };
    const result = validateSceneAssetManifest(asset);
    expect(result.valid).toBe(true);
    expect(result.adapterId).toBe('panorama');
  });

  it('rejects perspective renders, missing dimensions, unsafe URLs and low resolution honestly', () => {
    const asset = sceneFixture('panorama-equirectangular');
    asset.orientation = { projection: 'perspective', headingDegrees: null };
    asset.dimensions = null;
    asset.localPreviewUri = 'https://example.com/fake-360.jpg';
    const result = validateSceneAssetManifest(asset);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['scene-preview-uri-unsafe', 'panorama-dimensions-missing', 'panorama-projection-invalid']));

    asset.localPreviewUri = '/local-assets/experience/test/panorama.jpg';
    asset.orientation = { projection: 'equirectangular', headingDegrees: null };
    asset.dimensions = { width: 2048, height: 1024, unit: 'pixel', status: 'source-reported' };
    expect(validateSceneAssetManifest(asset).issues).toContainEqual(expect.objectContaining({ code: 'panorama-resolution-low', severity: 'warning' }));
  });

  it('requires six consistent square cubemap faces', () => {
    const asset = sceneFixture('panorama-cubemap');
    asset.orientation = { projection: 'cubemap', headingDegrees: null };
    asset.cubemapFaces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((face) => ({ face: face as 'px', width: 2048, height: 2048 }));
    expect(validateSceneAssetManifest(asset).valid).toBe(true);
    asset.cubemapFaces.pop();
    expect(validateSceneAssetManifest(asset).issues.map((issue) => issue.code)).toContain('cubemap-faces-invalid');
  });

  it('keeps unknown GLB units explicit and blocks a missing unit status', () => {
    const asset = sceneFixture('glb-model');
    asset.units = { value: 'unknown', status: 'unknown' };
    expect(validateSceneAssetManifest(asset)).toMatchObject({ valid: true, issues: expect.arrayContaining([expect.objectContaining({ code: 'web3d-units-unknown', severity: 'warning' })]) });
    asset.units = null;
    expect(validateSceneAssetManifest(asset).issues.map((issue) => issue.code)).toContain('web3d-units-status-missing');
  });

  it('keeps missing KAP 360 safe while selecting only the verified Web3D design derivative', () => {
    const missing = kapExperienceTwinPack.sceneAssets.find((asset) => asset.medium === 'missing-source')!;
    expect(validateSceneAssetManifest(missing)).toMatchObject({ valid: true, renderable: false, adapterId: 'missing' });
    expect(selectSceneAssetForMode(kapExperienceTwinPack.sceneAssets, 'panorama', null)?.medium).toBe('missing-source');
    expect(selectSceneAssetForMode(kapExperienceTwinPack.sceneAssets, 'web3d', null)).toMatchObject({
      medium: 'glb-model',
      sourceAuthority: 'founder-approved-design-source',
      pose: { status: 'candidate', coordinateReference: null }
    });
  });
});

describe('Digital rehearsal and synchronized selection', () => {
  it('supports play, pause, next, previous, jump, compare, journey selection and reset', () => {
    const initial = createDigitalRehearsalState(kapExperienceTwinPack);
    const playing = reduceDigitalRehearsal(kapExperienceTwinPack, initial, { type: 'play' });
    const next = reduceDigitalRehearsal(kapExperienceTwinPack, playing, { type: 'next' });
    const previous = reduceDigitalRehearsal(kapExperienceTwinPack, next, { type: 'previous' });
    const target = kapExperienceTwinPack.journeys[0]!.journeyStepIds.at(-1)!;
    const jumped = reduceDigitalRehearsal(kapExperienceTwinPack, previous, { type: 'select-step', journeyStepId: target });
    const compared = reduceDigitalRehearsal(kapExperienceTwinPack, jumped, { type: 'compare-day', eventDayId: kapExperienceTwinPack.eventDays[1]!.eventDayId });
    const day2Journey = kapExperienceTwinPack.journeys[1]!;
    const selected = reduceDigitalRehearsal(kapExperienceTwinPack, compared, { type: 'select-journey', eventDayId: day2Journey.eventDayId, personaId: day2Journey.personaId, journeyId: day2Journey.journeyId });
    expect(playing.status).toBe('playing');
    expect(previous.currentJourneyStepId).toBe(initial.currentJourneyStepId);
    expect(jumped.currentJourneyStepId).toBe(target);
    expect(compared.comparedEventDayId).toBe(kapExperienceTwinPack.eventDays[1]!.eventDayId);
    expect(selected.journeyId).toBe(day2Journey.journeyId);
    expect(reduceDigitalRehearsal(kapExperienceTwinPack, selected, { type: 'reset' })).toEqual(initial);
    expect(initial.truthLabelAr).toBe(digitalRehearsalTruthLabel);
  });

  it('cannot mutate readiness, decisions, evidence, baselines or the pack', () => {
    const before = JSON.stringify(kapExperienceTwinPack);
    const state = reduceDigitalRehearsal(kapExperienceTwinPack, createDigitalRehearsalState(kapExperienceTwinPack), { type: 'next' });
    expect(JSON.stringify(kapExperienceTwinPack)).toBe(before);
    expect(state).not.toHaveProperty('readiness');
    expect(state).not.toHaveProperty('decisionApproval');
    expect(state).not.toHaveProperty('verifiedEvidence');
    expect(state).not.toHaveProperty('baseline');
  });

  it('serializes one synchronized deep-link context and rejects foreign IDs', () => {
    const input = new URL('http://localhost/?workspace=experience-twin&scenario=SCENARIO-KAP-BASIC-2026&day=DAY-KAP-2026-11-02&persona=PERSONA-KAP-REGIONAL-LEADERSHIP&journey=JOURNEY-KAP-REGIONAL-2026&step=STEP-KAP-REGIONAL-AGES&entity=ENTITY-FOREIGN-001&lens=operations&mapMode=operational&viewMode=map-focus');
    const selection = createExperienceSelection(kapExperienceTwinPack, input);
    expect(selection).toMatchObject({ eventDayId: 'DAY-KAP-2026-11-02', journeyStepId: 'STEP-KAP-REGIONAL-AGES', selectedEntityId: 'ENTITY-KAP-OP-006', lens: 'operations', mapMode: 'operational', viewMode: 'map-focus', reviewMode: 'journey' });
    const output = writeExperienceSelectionToUrl(input, selection);
    expect(output.searchParams.get('step')).toBe('STEP-KAP-REGIONAL-AGES');
    expect(output.searchParams.get('entity')).toBe('ENTITY-KAP-OP-006');
    expect(selectionBelongsToPack(kapExperienceTwinPack, selection)).toBe(true);
    expect(selectionBelongsToPack(conferenceExperienceTwinPack, selection)).toBe(false);
  });

  it('opens a clean Experience Twin entry in overview while preserving authored deep links', () => {
    const clean = createExperienceSelection(kapExperienceTwinPack, new URL('http://localhost/?workspace=experience-twin'));
    const explicit = createExperienceSelection(kapExperienceTwinPack, new URL('http://localhost/?workspace=experience-twin&day=DAY-KAP-2026-11-02&experienceMode=command'));
    expect(clean.reviewMode).toBe('overview');
    expect(explicit.reviewMode).toBe('command');
  });

  it('derives a dominant compatible surface for direct review-mode deep links', () => {
    const story = createExperienceSelection(kapExperienceTwinPack, new URL('http://localhost/?experienceMode=story'));
    const journey = createExperienceSelection(kapExperienceTwinPack, new URL('http://localhost/?experienceMode=journey'));
    const scenes = createExperienceSelection(kapExperienceTwinPack, new URL('http://localhost/?experienceMode=scenes'));
    const command = createExperienceSelection(kapExperienceTwinPack, new URL('http://localhost/?experienceMode=command'));

    expect(story).toMatchObject({ reviewMode: 'story', mapMode: 'story', viewMode: 'map-focus' });
    expect(journey).toMatchObject({ reviewMode: 'journey', mapMode: 'story', viewMode: 'map-focus' });
    expect(scenes).toMatchObject({ reviewMode: 'scenes', mapMode: 'illustrated', viewMode: 'scene-focus' });
    expect(command).toMatchObject({ reviewMode: 'command', mapMode: 'operational', viewMode: 'split' });
  });

  it('projects existing truth read-only without calculating readiness', () => {
    const projection = projectExperienceTruth(kapExperienceTwinPack, { readinessDisposition: 'cannot-determine', readinessExplanationAr: 'غير مُقيّم', knownDecisionIds: [], knownEvidenceIds: [], sourceStatusAr: 'مصدر مرشح' });
    expect(projection).toHaveLength(kapExperienceTwinPack.journeySteps.length);
    expect(projection.every((item) => item.readinessDisposition === 'cannot-determine' && item.mutationAllowed === false)).toBe(true);
    expect(projection.every((item) => !('readinessPercent' in item))).toBe(true);
  });

  it('declutters display positions without mutating candidate anchors', () => {
    const configuration = findExperienceTwinConfiguration(kapExperienceTwinPack.projectId, kapExperienceTwinPack.eventId, kapExperienceTwinPack.venueId)!;
    const before = structuredClone(configuration.mapMarkers);
    const result = declutterExperienceMarkers(configuration.mapMarkers);
    expect(result).toHaveLength(11);
    expect(configuration.mapMarkers).toEqual(before);
    expect(result.every((marker, index) => marker.x === before[index]!.x && marker.y === before[index]!.y)).toBe(true);
    expect(result.every((marker) => marker.displayX >= 0 && marker.displayX <= 1 && marker.displayY >= 0 && marker.displayY <= 1)).toBe(true);
  });
});

describe('candidate authoring and generic reuse', () => {
  it('creates an isolated candidate revision with deterministic before/after diff', () => {
    const proposed = clonePack();
    proposed.labelAr = `${proposed.labelAr} · مراجعة`;
    const differences = previewExperiencePackDifference(kapExperienceTwinPack, proposed);
    const revision = createExperiencePackCandidateRevision(kapExperienceTwinPack, proposed, 'اختبار مراجعة مرشحة', validationOptions);
    expect(differences.some((difference) => difference.path === '/labelAr')).toBe(true);
    expect(revision).toMatchObject({ revision: 3, previousContentHash: kapExperienceTwinPack.contentHash, status: 'candidate-draft' });
    expect(revision.pack).toMatchObject({ frozen: false, activated: false, baseline: false, operationalApproval: 'none' });
    expect(kapExperienceTwinPack.revision).toBe(2);
  });

  it('resets via a clone and exports a sanitized candidate without activation', () => {
    const reset = resetExperiencePackCandidate(kapExperienceTwinPack);
    reset.labelAr = 'changed';
    expect(kapExperienceTwinPack.labelAr).not.toBe('changed');
    expect(exportSanitizedExperiencePack(kapExperienceTwinPack)).not.toMatch(/\/Users\/|file:\/\//);
  });

  it('renders a non-KAP fictional conference through the same contracts and services', () => {
    const result = validateExperiencePack(conferenceExperienceTwinPack);
    expect(result.valid).toBe(true);
    const serialized = JSON.stringify(conferenceExperienceTwinPack);
    expect(serialized).not.toContain('PROJECT-KAP');
    expect(serialized).not.toContain('ENTITY-KAP');
    expect(conferenceExperienceTwinPack.labelAr).toBe('مرجع خيالي للاختبار فقط');
    expect(createExperienceSelection(conferenceExperienceTwinPack).projectId).toBe('PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001');
  });
});
