import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  conferenceExperienceSceneRegistry,
  createSceneValidationContext,
  kapExperienceSceneRegistry
} from '../data/experienceSceneRegistries';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from '../data/experienceTwinPacks';
import { conferenceStoryMapDefinition, kapStoryMapDefinition } from '../data/storyMapDefinitions';
import type { ExperienceSceneAsset, SceneAssetRegistry } from '../types/experienceScene';
import {
  createExperienceSceneGateway,
  LocalExperienceSceneGateway,
  type ExperienceSceneAdapter,
  type SceneAdapterLoadRequest
} from './experienceSceneGateway';
import {
  createSceneAssetCandidateRevision,
  deepFreezeSceneRevision,
  LocalSceneRevisionRepository,
  quarantineSceneAsset
} from './experienceSceneAuthoring';
import { createExperienceSelection, selectionBelongsToPack, writeExperienceSelectionToUrl } from './experienceSelection';
import { validateExperienceSceneAsset, validateExperienceSceneRegistry, validateSceneComparisonPair } from './experienceSceneValidation';

const conferenceContext = createSceneValidationContext(conferenceExperienceTwinPack, conferenceExperienceSceneRegistry);
const kapContext = createSceneValidationContext(kapExperienceTwinPack, kapExperienceSceneRegistry);

function cloneAsset(assetId = 'SCENE-CONFERENCE-FICTIONAL-PANORAMA'): ExperienceSceneAsset {
  return structuredClone(conferenceExperienceSceneRegistry.assets.find((asset) => asset.assetId === assetId)!);
}

function issueCodes(asset: ExperienceSceneAsset, context = conferenceContext): string[] {
  return validateExperienceSceneAsset(asset, context).issues.map((item) => item.code);
}

afterEach(() => vi.unstubAllGlobals());

describe('Stage EX.1C scene truth and schema integrity', () => {
  it('validates both project-scoped registry exports through Draft 2020-12 and semantic rules', () => {
    const kap = validateExperienceSceneRegistry(kapExperienceSceneRegistry, kapContext);
    const conference = validateExperienceSceneRegistry(conferenceExperienceSceneRegistry, conferenceContext);
    expect(kap.valid).toBe(true);
    expect(conference.valid).toBe(true);
    expect(kap.schemaValid).toBe(true);
    expect(conference.schemaValid).toBe(true);
  });

  it('rejects missing source identity and unsupported MIME types', () => {
    const asset = cloneAsset();
    asset.source = null;
    asset.sourceId = null;
    asset.sourceFingerprint = null;
    asset.mimeType = 'application/x-executable';
    expect(issueCodes(asset)).toEqual(expect.arrayContaining(['scene-source-identity-missing', 'scene-mime-unsupported']));
  });

  it('rejects locally available content without a hash', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    asset.availabilityStatus = 'locally-available';
    asset.contentHash = null;
    asset.variants[0]!.contentHash = null;
    expect(issueCodes(asset)).toContain('scene-content-hash-missing');
  });

  it('enforces truth, approval and field-capture provenance independently', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    asset.truthClass = 'actual-verified';
    asset.approvalStatus = 'approved';
    asset.lastVerifiedAt = '2026-07-31T00:00:00.000Z';
    expect(issueCodes(asset)).toEqual(expect.arrayContaining(['scene-actual-truth-provenance-missing', 'scene-actual-verification-missing']));
  });

  it('blocks expired rights and a mismatched rights projection', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    asset.rightsStatus = 'expired';
    expect(issueCodes(asset)).toEqual(expect.arrayContaining(['scene-rights-blocked', 'scene-rights-projection-mismatch']));
  });

  it('accepts a real technical 2:1 panorama but rejects invalid ratio and flat masquerading', () => {
    const valid = cloneAsset();
    expect(validateExperienceSceneAsset(valid, conferenceContext).valid).toBe(true);
    const invalid = cloneAsset();
    invalid.width = 1600;
    invalid.height = 900;
    invalid.aspectRatio = 1600 / 900;
    invalid.source!.captureClassification = 'design-render';
    expect(issueCodes(invalid)).toEqual(expect.arrayContaining(['scene-panorama-aspect-invalid', 'scene-flat-render-masquerading-as-panorama']));
  });

  it('requires declared GLB units and coordinate status and blocks external dependencies', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-GLB');
    asset.units = { value: 'unknown', status: 'unknown' };
    asset.coordinateStatus = 'unknown';
    asset.variants[0]!.externalDependencies = ['https://vendor.invalid/texture.png'];
    expect(issueCodes(asset)).toEqual(expect.arrayContaining(['scene-gltf-units-missing', 'scene-gltf-coordinate-status-missing', 'scene-external-dependency-blocked']));
  });

  it('rejects absolute, traversal and signed remote asset paths', () => {
    for (const uri of ['/Users/example/model.glb', '/local-assets/experience-scenes/../secret', 'https://example.invalid/a.glb?token=x']) {
      const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-GLB');
      asset.variants[0]!.uri = uri;
      expect(issueCodes(asset)).toContain('scene-local-uri-unsafe');
    }
  });

  it('fails closed for cross-project, cross-event and unknown operational references', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    asset.projectId = 'PROJECT-FOREIGN';
    asset.eventId = 'EVENT-FOREIGN';
    asset.journeyStepIds = ['STEP-FOREIGN'];
    asset.zoneIds = ['ZONE-FOREIGN'];
    asset.entityIds = ['ENTITY-FOREIGN'];
    expect(issueCodes(asset)).toEqual(expect.arrayContaining(['scene-cross-project-binding', 'scene-cross-event-binding', 'scene-reference-unknown']));
  });

  it('detects revision overwrite and invalid parent revision', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    const overwriteContext = {
      ...conferenceContext,
      registryRevisions: [
        ...conferenceContext.registryRevisions,
        { ...conferenceContext.registryRevisions.find((revision) => revision.assetId === asset.assetId)!, contentHash: 'f'.repeat(64) }
      ]
    };
    expect(issueCodes(asset, overwriteContext)).toContain('scene-revision-overwrite');
    asset.revision = 2;
    asset.revisionId = `${asset.assetId}-R2`;
    asset.parentRevisionId = 'UNKNOWN-PARENT';
    expect(issueCodes(asset)).toContain('scene-parent-revision-invalid');
  });

  it('rejects unknown hotspot targets and malformed transitions', () => {
    const asset = cloneAsset();
    asset.hotspots[0]!.targetAssetId = 'SCENE-UNKNOWN';
    asset.transitions[0]!.hotspotId = 'HOTSPOT-UNKNOWN';
    expect(issueCodes(asset)).toEqual(expect.arrayContaining(['scene-hotspot-target-unknown', 'scene-transition-hotspot-mismatch']));
  });

  it('rejects a closed hotspot cycle without a map exit', () => {
    const registry = structuredClone(conferenceExperienceSceneRegistry);
    const first = registry.assets.find((asset) => asset.assetId === 'SCENE-CONFERENCE-FICTIONAL-PANORAMA')!;
    const second = registry.assets.find((asset) => asset.assetId === 'SCENE-CONFERENCE-FICTIONAL-GLB')!;
    first.hotspots = [first.hotspots[0]!];
    first.transitions = [first.transitions[0]!];
    second.hotspots = [{ ...first.hotspots[0]!, hotspotId: 'HOTSPOT-GLB-TO-PANORAMA', assetId: second.assetId, targetAssetId: first.assetId }];
    second.transitions = [{ transitionId: 'TRANSITION-GLB-TO-PANORAMA', sourceAssetId: second.assetId, hotspotId: 'HOTSPOT-GLB-TO-PANORAMA', targetAssetId: first.assetId, targetJourneyStepId: first.hotspots[0]!.targetJourneyStepId, transitionKind: 'previous', status: 'available', routeAuthority: 'none' }];
    expect(validateExperienceSceneRegistry(registry, conferenceContext).issues.map((item) => item.code)).toContain('scene-hotspot-cycle-unusable');
  });

  it('requires an explicit fallback for an invalid or quarantined primary asset', () => {
    const asset = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    asset.availabilityStatus = 'quarantined';
    asset.fallbackAssetId = null;
    expect(issueCodes(asset)).toContain('scene-fallback-missing');
  });
});

describe('Stage EX.1C gateway, comparison and synchronized selection', () => {
  const gateway = createExperienceSceneGateway(conferenceExperienceSceneRegistry, conferenceContext);
  const scope = {
    projectId: conferenceExperienceTwinPack.projectId,
    eventId: conferenceExperienceTwinPack.eventId,
    venueId: conferenceExperienceTwinPack.venueId,
    scenarioId: conferenceExperienceTwinPack.defaultSelection.scenarioId,
    eventDayId: conferenceExperienceTwinPack.defaultSelection.eventDayId,
    personaId: conferenceExperienceTwinPack.defaultSelection.personaId,
    journeyId: conferenceExperienceTwinPack.defaultSelection.journeyId,
    journeyStepId: conferenceExperienceTwinPack.defaultSelection.journeyStepId,
    touchpointId: conferenceExperienceTwinPack.journeySteps[0]!.touchpointId
  };

  it('resolves scenes by day, persona, journey and requested medium without event-name branching', () => {
    expect(gateway.resolveScene({ ...scope, preferredMediaKinds: ['flat-render'] })?.assetId).toBe('SCENE-CONFERENCE-FICTIONAL-DESIGN-APPROVED');
    expect(gateway.resolveScene({ ...scope, preferredMediaKinds: ['equirectangular-panorama'] })?.assetId).toBe('SCENE-CONFERENCE-FICTIONAL-PANORAMA');
    expect(gateway.resolveScene({ ...scope, preferredMediaKinds: ['gltf-scene'] })?.assetId).toBe('SCENE-CONFERENCE-FICTIONAL-GLB');
  });

  it('does not resolve foreign scope or leak the synthetic fixture into KAP', () => {
    expect(gateway.listAssets({ ...scope, projectId: kapExperienceTwinPack.projectId })).toEqual([]);
    expect(kapExperienceSceneRegistry.assets.some((asset) => asset.assetId.includes('CONFERENCE') || asset.source?.captureClassification === 'technical-synthetic')).toBe(false);
    expect(selectionBelongsToPack(kapExperienceTwinPack, createExperienceSelection(conferenceExperienceTwinPack))).toBe(false);
  });

  it('resolves a stable candidate hotspot transition and preserves no-route authority', () => {
    const transition = gateway.resolveTransition('SCENE-CONFERENCE-FICTIONAL-PANORAMA', 'HOTSPOT-CONFERENCE-TO-GLB');
    expect(transition).toMatchObject({ targetAssetId: 'SCENE-CONFERENCE-FICTIONAL-GLB', routeAuthority: 'none' });
    expect(gateway.listHotspots('SCENE-CONFERENCE-FICTIONAL-PANORAMA').map((item) => item.hotspotId)).toContain('HOTSPOT-CONFERENCE-EXIT-MAP');
  });

  it('permits a slider only for compatible poses and rejects a false pixel comparison claim', () => {
    const compatible = conferenceExperienceSceneRegistry.comparisonPairs[0]!;
    const incompatible = structuredClone(conferenceExperienceSceneRegistry.comparisonPairs[1]!);
    expect(validateSceneComparisonPair(compatible, conferenceExperienceSceneRegistry).valid).toBe(true);
    incompatible.pixelComparisonAllowed = true;
    expect(validateSceneComparisonPair(incompatible, conferenceExperienceSceneRegistry).issues.map((item) => item.code)).toContain('scene-comparison-pose-incompatible');
  });

  it('round-trips safe scene, hotspot, lens and comparison URL state', () => {
    const source = new URL(`http://local.test/?scene=SCENE-CONFERENCE-FICTIONAL-PANORAMA&hotspot=HOTSPOT-CONFERENCE-TO-GLB&sceneView=panorama-360&sceneTruthLens=operational-truth&sceneCompare=COMPARE-CONFERENCE-FICTIONAL-DESIGN`);
    const selection = createExperienceSelection(conferenceExperienceTwinPack, source, conferenceStoryMapDefinition, conferenceExperienceSceneRegistry);
    expect(selection).toMatchObject({ selectedSceneAssetId: 'SCENE-CONFERENCE-FICTIONAL-PANORAMA', selectedSceneHotspotId: 'HOTSPOT-CONFERENCE-TO-GLB', sceneViewerMode: 'panorama-360', sceneTruthLens: 'operational-truth', sceneComparisonPairId: 'COMPARE-CONFERENCE-FICTIONAL-DESIGN' });
    const restored = createExperienceSelection(conferenceExperienceTwinPack, writeExperienceSelectionToUrl(new URL('http://local.test/'), selection), conferenceStoryMapDefinition, conferenceExperienceSceneRegistry);
    expect(restored.selectedSceneHotspotId).toBe(selection.selectedSceneHotspotId);
    expect(restored.sceneComparisonPairId).toBe(selection.sceneComparisonPairId);
  });

  it('rejects malformed or foreign scene state without falling back to demo content', () => {
    const selection = createExperienceSelection(kapExperienceTwinPack, new URL('http://local.test/?scene=SCENE-CONFERENCE-FICTIONAL-PANORAMA&hotspot=HOTSPOT-CONFERENCE-TO-GLB'), kapStoryMapDefinition, kapExperienceSceneRegistry);
    expect(selection.selectedSceneAssetId).not.toContain('CONFERENCE');
    expect(selection.selectedSceneHotspotId).toBeNull();
  });

  it('cancels and disposes the selected scene through its adapter', async () => {
    let disposed: string | null = null;
    const adapter: ExperienceSceneAdapter = {
      adapterId: 'panorama',
      labelAr: 'اختبار',
      supportedMedia: ['equirectangular-panorama'],
      load: (request: SceneAdapterLoadRequest) => Promise.resolve({ assetId: request.asset.assetId, variantId: request.variant.variantId, status: 'ready', progress: 100, adapterId: 'panorama', uri: request.variant.uri, messageAr: 'جاهز', retryable: false }),
      dispose: (assetId) => { disposed = assetId; }
    };
    const local = new LocalExperienceSceneGateway(conferenceExperienceSceneRegistry, conferenceContext, [adapter]);
    expect((await local.loadAssetVariant('SCENE-CONFERENCE-FICTIONAL-PANORAMA', 'preview')).status).toBe('ready');
    local.disposeScene('SCENE-CONFERENCE-FICTIONAL-PANORAMA');
    expect(disposed).toBe('SCENE-CONFERENCE-FICTIONAL-PANORAMA');
  });

  it('blocks a locally fetched variant with a safe hash mismatch', async () => {
    const registry: SceneAssetRegistry = structuredClone(conferenceExperienceSceneRegistry);
    const asset = registry.assets.find((item) => item.assetId === 'SCENE-CONFERENCE-FICTIONAL-FLAT')!;
    const bytes = new Uint8Array([1, 2, 3, 4]);
    asset.byteSize = bytes.byteLength;
    asset.contentHash = 'f'.repeat(64);
    asset.variants[0]!.byteSize = bytes.byteLength;
    asset.variants[0]!.contentHash = asset.contentHash;
    const context = createSceneValidationContext(conferenceExperienceTwinPack, registry);
    vi.stubGlobal('crypto', {
      subtle: {
        digest: (_algorithm: string, data: ArrayBuffer) => {
          const digest = createHash('sha256').update(new Uint8Array(data)).digest();
          return Promise.resolve(Uint8Array.from(digest).buffer);
        }
      }
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes, { status: 200, headers: { 'content-type': 'image/png' } })));
    const local = createExperienceSceneGateway(registry, context);
    const state = await local.loadAssetVariant(asset.assetId, 'preview');
    expect(state).toMatchObject({ status: 'failed', retryable: true });
    expect(state.messageAr).toContain('بصمة');
  });
});

describe('Stage EX.1C immutable candidate authoring', () => {
  it('creates a new deeply frozen revision without mutating governed runtime truth', () => {
    const root = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    const proposed = structuredClone(root);
    proposed.warnings.push('تعديل وصف مرشح');
    const packBefore = JSON.stringify({ readiness: conferenceExperienceTwinPack.journeySteps[0]!.relatedRequirementIds, decisions: conferenceExperienceTwinPack.journeySteps[0]!.relatedDecisionIds, evidence: conferenceExperienceTwinPack.journeySteps[0]!.relatedEvidenceIds });
    const result = createSceneAssetCandidateRevision(root, proposed, 'تحديث وصف المراجعة', 'LOCAL-TEST-ACTOR', conferenceContext);
    expect(result.asset.revision).toBe(2);
    expect(result.asset.parentRevisionId).toBe(root.revisionId);
    expect(result).toMatchObject({ baselineMutationAllowed: false, readinessMutationAllowed: false, decisionMutationAllowed: false, evidenceMutationAllowed: false });
    expect(Object.isFrozen(result.asset)).toBe(true);
    expect(Object.isFrozen(result.asset.warnings)).toBe(true);
    expect(JSON.stringify({ readiness: conferenceExperienceTwinPack.journeySteps[0]!.relatedRequirementIds, decisions: conferenceExperienceTwinPack.journeySteps[0]!.relatedDecisionIds, evidence: conferenceExperienceTwinPack.journeySteps[0]!.relatedEvidenceIds })).toBe(packBefore);
  });

  it('prevents source identity or source hash replacement inside an asset revision', () => {
    const root = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    const proposed = structuredClone(root);
    proposed.sourceFingerprint = 'e'.repeat(64);
    expect(() => createSceneAssetCandidateRevision(root, proposed, 'محاولة استبدال المصدر', 'LOCAL-TEST-ACTOR', conferenceContext)).toThrow(/بصمة/);
  });

  it('keeps append-only history and rollback selection without rewriting revisions', () => {
    const root = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    const rootRevision = conferenceContext.registryRevisions.find((revision) => revision.revisionId === root.revisionId)!;
    const repository = new LocalSceneRevisionRepository(root, rootRevision);
    const proposed = structuredClone(root);
    proposed.orientation = { projection: 'perspective', headingDegrees: 12, northOffsetDegrees: null, pitchDegrees: null, rollDegrees: null, status: 'source-declared' };
    const result = createSceneAssetCandidateRevision(root, proposed, 'إضافة اتجاه مرشح', 'LOCAL-TEST-ACTOR', conferenceContext);
    repository.append(result);
    expect(repository.history().map((revision) => revision.revision)).toEqual([1, 2]);
    repository.selectHistoricalRevision(root.revisionId);
    expect(repository.current().revision).toBe(1);
    expect(repository.history().map((revision) => revision.revision)).toEqual([1, 2]);
  });

  it('quarantines invalid content without changing the caller-owned object', () => {
    const root = cloneAsset('SCENE-CONFERENCE-FICTIONAL-FLAT');
    const before = structuredClone(root);
    const quarantined = quarantineSceneAsset(root, [{ code: 'test', path: '/', severity: 'blocking', messageAr: 'محجوب للاختبار' }]);
    expect(quarantined.availabilityStatus).toBe('quarantined');
    expect(quarantined.warnings).toContain('محجوب للاختبار');
    expect(root).toEqual(before);
  });

  it('deep-freezes nested caller data', () => {
    const value = deepFreezeSceneRevision({ nested: { values: ['a'] } });
    expect(Object.isFrozen(value.nested)).toBe(true);
    expect(Object.isFrozen(value.nested.values)).toBe(true);
  });
});
