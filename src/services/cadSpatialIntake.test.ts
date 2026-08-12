import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  kapApprovedCadAuthorityAssertion,
  kapStableZoneIds,
  kapWorkingCadAuthorityAssertion,
  kapWorkingCadIntake
} from '../data/kapWorkingCadIntake';
import type {
  CadConversionAdapter,
  CadConversionRequest,
  DerivedSpatialArtifact,
  SpatialEntityMapping,
  SpatialTransformManifest
} from '../types/spatialAuthoring';
import {
  CadSpatialIntakeError,
  acceptExpectedCadHash,
  appendCadAuthorityAssertion,
  applyDisplayTransform,
  assertSpatialMappingScope,
  buildSpatialProjectionLineage,
  deriveEffectiveCadAuthority,
  findSpatialMappingConflicts,
  materializeSpatialProjectionOutputs,
  missingXrefWarnings,
  registerCadSourceLocation,
  reverseDisplayTransform,
  routeAuthorityAllowsActivation,
  runCadConversion,
  supersedeSpatialMapping,
  validateDerivedArtifactLineage,
  validateSpatialMapping
} from './cadSpatialIntake';

const source = kapWorkingCadIntake.source;
const scope = { projectId: source.projectId, eventId: source.eventId, venueId: source.venueId };

function mappedFixture(overrides: Partial<SpatialEntityMapping> = {}): SpatialEntityMapping {
  return {
    ...kapWorkingCadIntake.mappings[0]!,
    geometryReference: 'GEOMETRY-FICTIONAL-001',
    layerReferences: ['LAYER-FICTIONAL-001'],
    mappingStatus: 'candidate',
    mappedBy: 'ACTOR-LOCAL-TEST',
    changeReason: 'اختبار خيالي فقط',
    confidence: 'low',
    ...overrides
  };
}

describe('Stage 3E.4 CAD source identity and authority', () => {
  it('accepts the declared SHA-256 and rejects a different hash', () => {
    expect(acceptExpectedCadHash(source.contentHash, source.contentHash)).toBe(true);
    expect(() => acceptExpectedCadHash(source.contentHash, '0'.repeat(64))).toThrowError(CadSpatialIntakeError);
  });

  it('links the same content at a second path without creating a duplicate source identity', () => {
    const secondLocation = { ...kapWorkingCadIntake.locations[1]!, locationId: 'LOCATION-KAP-DWG-SECOND-TEST' };
    const result = registerCadSourceLocation([source], [kapWorkingCadIntake.locations[0]!], { ...source, sourceId: 'SOURCE-FAKE-DUPLICATE' }, secondLocation);
    expect(result.sources).toHaveLength(1);
    expect(result.sourceId).toBe(source.sourceId);
    expect(result.locations).toHaveLength(2);
    expect(result.locations[1]?.sourceId).toBe(source.sourceId);
  });

  it('preserves the original capture reference and appends working then founder-approved assertions without rewriting source identity', () => {
    const workingHistory = appendCadAuthorityAssertion(source, [], kapWorkingCadAuthorityAssertion);
    const approvedHistory = appendCadAuthorityAssertion(source, workingHistory, kapApprovedCadAuthorityAssertion);
    expect(source.captureStatus).toBe('approved-source-capture');
    expect(source.originalCaptureRef).toBe('pilot-input/manifests/kap-cad-intake-v1.json');
    expect(approvedHistory).toEqual([
      kapWorkingCadAuthorityAssertion,
      kapApprovedCadAuthorityAssertion
    ]);
    expect(kapApprovedCadAuthorityAssertion).toMatchObject({
      sourceId: source.sourceId,
      sourceHash: source.contentHash,
      supersedesAssertionId: kapWorkingCadAuthorityAssertion.authorityAssertionId
    });
    expect(() => appendCadAuthorityAssertion(source, approvedHistory, kapApprovedCadAuthorityAssertion)).toThrowError(/append-only/);
  });

  it('derives approved-working permitted use without engineering, route, or baseline authority', () => {
    const effective = deriveEffectiveCadAuthority(source, [kapWorkingCadAuthorityAssertion]);
    expect(effective.classification).toBe('approved-working-baseline');
    expect(effective.permittedUses).toContain('candidate-zone-mapping');
    expect(effective.prohibitedUses).toEqual(expect.arrayContaining(['route-authority', 'live-operational-baseline', 'safety-certification']));
    expect(effective.engineeringAuthority).toBe('none');
    expect(effective.mappingApproval).toBe('none');
  });
});

describe('Stage 3E.4 unknown spatial authority and conversion boundary', () => {
  it('keeps units, north, origin, and CRS unknown', () => {
    expect(kapWorkingCadIntake.transform).toMatchObject({ sourceUnits: 'unknown', northStatus: 'unknown', originStatus: 'unknown', crsStatus: 'unknown' });
    expect(kapWorkingCadIntake.transform.scale).toBeNull();
    expect(kapWorkingCadIntake.transform.controlPoints).toEqual([]);
  });

  it('uses a small fictional DXF fixture and preserves missing XREF warnings', async () => {
    const fixturePath = resolve(process.cwd(), 'src/test/fixtures/cad/fictional-site.dxf');
    const fixture = readFileSync(fixturePath, 'utf8');
    expect(fixture).toContain('FICTIONAL-REVIEW-LAYER');
    const adapter: CadConversionAdapter = {
      adapterId: 'ADAPTER-FICTIONAL-DXF-TEST',
      adapterVersion: '0.0.0-test',
      executionBoundary: 'local-offline',
      convert: () => Promise.resolve({
        status: 'converted', adapterId: 'ADAPTER-FICTIONAL-DXF-TEST', adapterVersion: '0.0.0-test',
        layers: [{ layerId: 'LAYER-FICTIONAL-001', name: 'FICTIONAL-REVIEW-LAYER', visible: true, frozen: false, off: false, geometryReferences: ['GEOMETRY-FICTIONAL-001'] }],
        geometry: [{ geometryReference: 'GEOMETRY-FICTIONAL-001', geometryType: 'polyline', layerId: 'LAYER-FICTIONAL-001', pointCount: 4 }],
        warningsAr: ['XREF خيالي مفقود: MISSING-XREF-FICTIONAL']
      })
    };
    const request: CadConversionRequest = { sourceId: 'SOURCE-FICTIONAL', sourceHash: '1'.repeat(64), inputFormat: 'dxf', conversionProfile: 'fictional-test-only' };
    const result = await runCadConversion(adapter, request, new AbortController().signal);
    expect(result.status).toBe('converted');
    expect(missingXrefWarnings(result)).toEqual(['XREF خيالي مفقود: MISSING-XREF-FICTIONAL']);
  });

  it('rejects cloud conversion adapters', async () => {
    const adapter = { adapterId: 'CLOUD', adapterVersion: '1', executionBoundary: 'cloud' as never, convert: () => Promise.resolve(kapWorkingCadIntake.conversion) };
    await expect(runCadConversion(adapter, { sourceId: source.sourceId, sourceHash: source.contentHash, inputFormat: 'dwg', conversionProfile: 'test' }, new AbortController().signal)).rejects.toMatchObject({ code: 'cloud-conversion-prohibited' });
  });
});

describe('Stage 3E.4 mapping, transform, projection, and route isolation', () => {
  it('keeps all five stable zone IDs unmapped', () => {
    expect(kapWorkingCadIntake.mappings.map((mapping) => mapping.entityId)).toEqual(kapStableZoneIds);
    expect(kapWorkingCadIntake.mappings.every((mapping) => mapping.mappingStatus === 'unmapped' && mapping.geometryReference === null)).toBe(true);
  });

  it('does not allow suggested mappings to become approved automatically', () => {
    const suggested = mappedFixture({ mappingMethod: 'name-suggestion', mappingStatus: 'suggested' });
    expect(validateSpatialMapping(suggested)).toBe(true);
    expect(() => validateSpatialMapping({ ...suggested, mappingStatus: 'approved-working', reviewedBy: 'REVIEWER', approvedBy: 'APPROVER' })).toThrowError(/suggested/);
  });

  it('rejects geometry conflicts and cross-project or unstable zone mappings', () => {
    const first = mappedFixture();
    const second = mappedFixture({ mappingId: 'MAPPING-SECOND', entityId: kapStableZoneIds[1] });
    expect(findSpatialMappingConflicts([first, second])).toEqual([{ geometryReference: 'GEOMETRY-FICTIONAL-001', entityIds: [kapStableZoneIds[0], kapStableZoneIds[1]] }]);
    expect(assertSpatialMappingScope(first, scope, kapStableZoneIds)).toBe(true);
    expect(() => assertSpatialMappingScope({ ...first, projectId: 'PROJECT-FOREIGN' }, scope, kapStableZoneIds)).toThrowError(/المشروع/);
    expect(() => assertSpatialMappingScope({ ...first, entityId: 'ZONE-FOREIGN-001' }, scope, kapStableZoneIds)).toThrowError(/الثابت/);
  });

  it('applies and reverses a display-only transform without changing source coordinates', () => {
    const manifest: SpatialTransformManifest = { ...kapWorkingCadIntake.transform, sourceUnits: 'meter', scale: [2, 2, 2], rotation: [12, -8, 33], translation: [100, -40, 8] };
    const sourcePoint: [number, number, number] = [3.5, -9.25, 2];
    const displayPoint = applyDisplayTransform(sourcePoint, manifest);
    const restored = reverseDisplayTransform(displayPoint, manifest);
    expect(restored[0]).toBeCloseTo(sourcePoint[0], 10);
    expect(restored[1]).toBeCloseTo(sourcePoint[1], 10);
    expect(restored[2]).toBeCloseTo(sourcePoint[2], 10);
    expect(sourcePoint).toEqual([3.5, -9.25, 2]);
  });

  it('validates derived lineage and rejects a cross-project artifact', () => {
    const artifact: DerivedSpatialArtifact = {
      derivedArtifactId: 'DERIVED-FICTIONAL-001', parentSourceId: source.sourceId, parentSha256: source.contentHash,
      conversionTool: 'fictional-test-adapter', conversionToolVersion: '0.0.0-test', timestamp: '2026-07-21T00:00:00Z', conversionProfile: 'test', outputSha256: '2'.repeat(64),
      coordinateHandling: 'preserved', unitHandling: 'unknown', geometryCounts: { polyline: 1 }, simplificationSettings: { tolerance: 0 }, knownLossOrWarnings: [], ...scope
    };
    expect(validateDerivedArtifactLineage(artifact, source, scope)).toBe(true);
    expect(() => validateDerivedArtifactLineage({ ...artifact, projectId: 'PROJECT-FOREIGN' }, source, scope)).toThrowError(/المشروع/);
  });

  it('uses one spatial projection version across every output after local review', () => {
    const reviewed = mappedFixture({ mappingStatus: 'reviewed', reviewedBy: 'REVIEWER', revision: 2 });
    const lineage = buildSpatialProjectionLineage(scope, source.contentHash, 'TRANSFORM-v1', [reviewed]);
    expect(lineage).not.toBeNull();
    const outputs = materializeSpatialProjectionOutputs(lineage!);
    expect(new Set(outputs.map((output) => output.spatialProjectionVersion)).size).toBe(1);
    expect(new Set(outputs.map((output) => output.sourceHash))).toEqual(new Set([source.contentHash]));
    expect(outputs.map((output) => output.output)).toEqual(['experience-map', 'executive-command-map', 'spatial-2d', 'spatial-3d', 'projection-preview']);
  });

  it('records supersession without mutating the previous mapping and leaves route activation blocked', () => {
    const mapping = mappedFixture({ mappingStatus: 'reviewed', reviewedBy: 'REVIEWER' });
    const superseded = supersedeSpatialMapping(mapping, 'ACTOR-LOCAL-TEST', 'تراجع خيالي');
    expect(mapping.mappingStatus).toBe('reviewed');
    expect(superseded).toMatchObject({ mappingStatus: 'superseded', revision: mapping.revision + 1 });
    expect(routeAuthorityAllowsActivation({ routeId: 'ROUTE-FICTIONAL-001', geometryReference: 'LINE-FICTIONAL', sourceId: source.sourceId, routeAuthority: null, revision: 1, effectiveDate: '2026-07-21', approvalScope: null })).toBe(false);
  });
});
