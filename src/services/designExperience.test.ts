import { createHash } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  kapDesignAssetId,
  kapDesignAssetManifest,
  kapDesignDerivative,
  kapDesignExperienceConfiguration,
  kapDesignScene,
  kapDesignSourceRecord
} from '../data/kapDesignExperience';
import { findExperienceTwinConfiguration } from '../data/experienceTwinConfigurations';
import { createSceneValidationContext, kapExperienceSceneRegistry } from '../data/experienceSceneRegistries';
import { kapExperienceTwinPack } from '../data/experienceTwinPacks';
import { kapStoryMapDefinition } from '../data/storyMapDefinitions';
import type { ExperienceSceneAsset, SceneAssetVariant } from '../types/experienceScene';
import { inspectGlbBinary, materializeDesignAssetManifest, validateDesignDerivative, validateDesignExperienceConfiguration } from './designAssetValidation';
import { mayAutoplayDesignCameraTour, normalizeDesignCameraTourSpeed, stepDesignCameraTour } from './designCameraTour';
import { isSafeDesignAssetRelativePath, isSafeDesignRuntimeUri, sameDesignAssetFingerprint } from './designAssetStagingPolicy';
import { createExperienceSceneGateway, Web3DSceneAdapter } from './experienceSceneGateway';
import { createExperienceSelection, writeExperienceSelectionToUrl } from './experienceSelection';

function minimalGlb(options: { externalUri?: string } = {}): Uint8Array {
  const document = {
    asset: { version: '2.0' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      { count: 3, min: [-1, 0, -1], max: [1, 2, 1] },
      { count: 3 }
    ],
    materials: [{}],
    buffers: options.externalUri ? [{ uri: options.externalUri, byteLength: 12 }] : []
  };
  const encoded = new TextEncoder().encode(JSON.stringify(document));
  const paddedLength = Math.ceil(encoded.byteLength / 4) * 4;
  const output = new Uint8Array(20 + paddedLength);
  const view = new DataView(output.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, output.byteLength, true);
  view.setUint32(12, paddedLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  output.fill(0x20, 20);
  output.set(encoded, 20);
  return output;
}

afterEach(() => vi.restoreAllMocks());

describe('Stage EX.1F Wave C.1 design truth and manifests', () => {
  it('registers exact founder-approved source and diagnostic derivative facts', () => {
    expect(kapDesignSourceRecord).toMatchObject({
      authorityStatus: 'founder-approved-design-source',
      observedByteSize: 328_192_677,
      observedSha256: 'e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e',
      mayChangeReadiness: false,
      mayChangeBaseline: false
    });
    expect(kapDesignDerivative).toMatchObject({
      authorityStatus: 'derived-diagnostic-candidate',
      byteSize: 3_050_340,
      sha256: '7b4147af359beba58e0864a85eb725569d08ebbe6eec3d2d93b443eb08c45bca',
      sourceMeshCount: 376,
      vertexCount: 127_783,
      triangleCount: 125_130,
      materialCount: 22,
      externalDependencyCount: 0,
      spatialRegistrationStatus: 'unregistered'
    });
  });

  it('validates the canonical manifest and rejects re-hashed truth promotion', () => {
    expect(validateDesignExperienceConfiguration(kapDesignExperienceConfiguration).valid).toBe(true);
    const tampered = structuredClone(kapDesignExperienceConfiguration);
    tampered.scenes[0]!.engineeringStatus = 'engineering-approved';
    const manifestPayload = structuredClone(tampered.manifests[0]!);
    Reflect.deleteProperty(manifestPayload, 'contentHash');
    tampered.manifests[0]!.contentHash = materializeDesignAssetManifest(manifestPayload).contentHash;
    expect(validateDesignExperienceConfiguration(tampered).issues.map((item) => item.code)).toContain('design-scene-truth-promotion-invalid');
  });

  it('rejects manifest and source-lineage fingerprint changes', () => {
    const tampered = structuredClone(kapDesignExperienceConfiguration);
    tampered.manifests[0]!.contentHash = '0'.repeat(64);
    tampered.derivatives[0]!.sourceSha256 = 'f'.repeat(64);
    expect(validateDesignExperienceConfiguration(tampered).issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      'design-manifest-hash-mismatch',
      'design-derivative-source-hash-mismatch'
    ]));
  });

  it('keeps the Mamar Al-Osour relation proposed, medium confidence and non-spatial', () => {
    expect(kapDesignExperienceConfiguration.relations).toHaveLength(2);
    expect(kapDesignExperienceConfiguration.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'ENTITY-KAP-OP-006', status: 'proposed', confidence: 'medium', createsSpatialRoute: false, createsApprovedGeometry: false }),
      expect.objectContaining({ targetId: 'ZONE-AGES-TUNNEL-001', status: 'proposed', confidence: 'medium', createsSpatialRoute: false, createsApprovedGeometry: false })
    ]));
  });

  it('keeps the scene shared across four days without route, panorama or readiness mutation', () => {
    expect(kapDesignScene.eventDayIds).toEqual([
      'DAY-KAP-2026-10-31',
      'DAY-KAP-2026-11-01',
      'DAY-KAP-2026-11-02',
      'DAY-KAP-2026-11-03'
    ]);
    expect(kapDesignScene).toMatchObject({ routeStatus: 'none', panoramaStatus: 'missing', operationalStatus: 'cannot-determine', engineeringStatus: 'unregistered' });
    expect(findExperienceTwinConfiguration(kapDesignScene.projectId, kapDesignScene.eventId, kapDesignScene.venueId)?.readinessDisposition).toBe('cannot-determine');
  });
});

describe('Stage EX.1F Wave C.1 GLB validation and local staging policy', () => {
  it('reads a valid GLB container deterministically', () => {
    const bytes = minimalGlb();
    expect(inspectGlbBinary(bytes)).toMatchObject({ validContainer: true, sceneCount: 1, nodeCount: 1, meshCount: 1, primitiveCount: 1, vertexCount: 3, triangleCount: 1, externalUris: [] });
  });

  it('fails closed for malformed GLB and external URI dependencies', () => {
    const malformed = minimalGlb();
    malformed[0] = 0;
    expect(inspectGlbBinary(malformed).issues.map((item) => item.code)).toContain('design-glb-magic-invalid');
    expect(inspectGlbBinary(minimalGlb({ externalUri: 'https://vendor.invalid/model.bin' })).issues.map((item) => item.code)).toContain('design-glb-external-uri');
  });

  it('rejects size and structure mismatches without throwing', () => {
    const derivative = structuredClone(kapDesignDerivative);
    const result = validateDesignDerivative(derivative, minimalGlb());
    expect(result.valid).toBe(false);
    expect(result.issues.map((item) => item.code)).toEqual(expect.arrayContaining(['design-derivative-size-mismatch', 'design-derivative-fact-mismatch', 'design-derivative-bounds-mismatch']));
  });

  it('keeps private paths outside runtime and treats matching fingerprints idempotently', () => {
    expect(isSafeDesignAssetRelativePath('03_web_derivatives/scene.glb')).toBe(true);
    expect(isSafeDesignAssetRelativePath('../private/scene.glb')).toBe(false);
    expect(isSafeDesignAssetRelativePath('/Users/private/scene.glb')).toBe(false);
    expect(isSafeDesignRuntimeUri('/local-assets/experience-scenes/PROJECT/design/scene.glb')).toBe(true);
    expect(isSafeDesignRuntimeUri('/Users/private/scene.glb')).toBe(false);
    expect(sameDesignAssetFingerprint({ sha256: kapDesignDerivative.sha256, byteSize: kapDesignDerivative.byteSize }, { sha256: kapDesignDerivative.sha256, byteSize: kapDesignDerivative.byteSize })).toBe(true);
    const manifestPayload = structuredClone(kapDesignAssetManifest);
    Reflect.deleteProperty(manifestPayload, 'contentHash');
    expect(materializeDesignAssetManifest(manifestPayload).contentHash).toBe(kapDesignAssetManifest.contentHash);
  });
});

describe('Stage EX.1F Wave C.1 scene resolution, URLs and camera tour', () => {
  it('resolves only the KAP design scene for the exact project scope', () => {
    const context = createSceneValidationContext(kapExperienceTwinPack, kapExperienceSceneRegistry);
    const gateway = createExperienceSceneGateway(kapExperienceSceneRegistry, context);
    const resolved = gateway.resolveScene({
      projectId: kapExperienceTwinPack.projectId,
      eventId: kapExperienceTwinPack.eventId,
      venueId: kapExperienceTwinPack.venueId,
      scenarioId: kapExperienceTwinPack.defaultSelection.scenarioId,
      eventDayId: 'DAY-KAP-2026-11-01',
      personaId: null,
      journeyId: null,
      journeyStepId: null,
      touchpointId: null,
      preferredMediaKinds: ['gltf-scene']
    });
    expect(resolved?.assetId).toBe(kapDesignAssetId);
    expect(gateway.resolveScene({ projectId: 'PROJECT-FOREIGN', eventId: kapDesignScene.eventId, venueId: kapDesignScene.venueId, scenarioId: null, eventDayId: null, personaId: null, journeyId: null, journeyStepId: null, touchpointId: null, preferredMediaKinds: ['gltf-scene'] })).toBeNull();
  });

  it('round-trips scene, viewpoint, lens, quality, tour and client presentation state', () => {
    const url = new URL(`http://local.test/?scene=${kapDesignAssetId}&mapMode=web3d&viewMode=scene-focus&experienceMode=scenes&designLens=truth&designViewpoint=DESIGN-VIEW-KAP-TOP&designQuality=high&designTour=playing&designPresentation=client&designTruth=open`);
    const selected = createExperienceSelection(kapExperienceTwinPack, url, kapStoryMapDefinition, kapExperienceSceneRegistry, kapDesignExperienceConfiguration);
    expect(selected).toMatchObject({ selectedSceneAssetId: kapDesignAssetId, designSceneLens: 'truth', designSceneViewpointId: 'DESIGN-VIEW-KAP-TOP', designSceneQualityProfile: 'high', designCameraTourPlaying: true, designPresentationMode: true, designTruthDrawerOpen: true });
    const restored = createExperienceSelection(kapExperienceTwinPack, writeExperienceSelectionToUrl(new URL('http://local.test/'), selected), kapStoryMapDefinition, kapExperienceSceneRegistry, kapDesignExperienceConfiguration);
    expect(restored).toMatchObject({ selectedSceneAssetId: kapDesignAssetId, designSceneViewpointId: 'DESIGN-VIEW-KAP-TOP', designPresentationMode: true, designTruthDrawerOpen: true });
  });

  it('rejects a foreign scene URL without demo fallback', () => {
    const selected = createExperienceSelection(kapExperienceTwinPack, new URL('http://local.test/?scene=SCENE-CONFERENCE-FICTIONAL-GLB&designViewpoint=FAKE'), kapStoryMapDefinition, kapExperienceSceneRegistry, kapDesignExperienceConfiguration);
    expect(selected.selectedSceneAssetId).not.toContain('CONFERENCE');
    expect(selected.designSceneViewpointId).toBeNull();
  });

  it('steps, restarts and disables camera autoplay for reduced motion', () => {
    const tour = kapDesignExperienceConfiguration.cameraTours[0]!;
    expect(stepDesignCameraTour(tour, tour.viewpointIds[0]!, 1)).toBe(tour.viewpointIds[1]);
    expect(stepDesignCameraTour(tour, tour.viewpointIds[0]!, -1)).toBe(tour.viewpointIds[0]);
    expect(normalizeDesignCameraTourSpeed(1.5)).toBe(1.5);
    expect(normalizeDesignCameraTourSpeed(99)).toBe(1);
    expect(mayAutoplayDesignCameraTour(true, true)).toBe(false);
    expect(mayAutoplayDesignCameraTour(false, false)).toBe(false);
    expect(mayAutoplayDesignCameraTour(false, true)).toBe(true);
  });

  it('releases verified object URLs and returns a safe missing state', async () => {
    const bytes = minimalGlb();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const asset: ExperienceSceneAsset = structuredClone(kapExperienceSceneRegistry.assets.find((item) => item.assetId === kapDesignAssetId)!);
    const variant = { ...asset.variants[0]!, byteSize: bytes.byteLength, contentHash: sha256, uri: '/local-assets/experience-scenes/test.glb' } as SceneAssetVariant;
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:verified-design');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', {
      subtle: {
        digest: (_algorithm: string, data: ArrayBuffer) => {
          const digest = createHash('sha256').update(new Uint8Array(data)).digest();
          return Promise.resolve(Uint8Array.from(digest).buffer);
        }
      }
    });
    vi.stubGlobal('Blob', NodeBlob);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes as unknown as BodyInit, { status: 200, headers: { 'content-type': 'model/gltf-binary', 'content-length': String(bytes.byteLength) } })));
    const adapter = new Web3DSceneAdapter();
    expect(await adapter.load({ asset, variant, signal: new AbortController().signal })).toMatchObject({ status: 'ready', uri: 'blob:verified-design' });
    adapter.dispose(asset.assetId);
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:verified-design');
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await adapter.load({ asset, variant, signal: new AbortController().signal })).toMatchObject({ status: 'missing', retryable: false });
  });
});
