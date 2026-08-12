import { describe, expect, it } from 'vitest';
import {
  kapCandidateSpatialIntake,
  kapCandidateSpatialValidation,
  kapExperienceObjectIds
} from '../data/kapCandidateSpatialIntake';
import {
  acceptExpectedSourceFingerprint,
  linkEvidenceWithoutReadinessMutation,
  reconcileSourceAssetManifest,
  registerSourceAsset,
  sanitizeFieldEvidenceAsset,
  toBrowserSafeFieldEvidenceRecord,
  validateCandidateRelationships,
  validateCandidateSpatialEntities,
  validateCandidateSpatialIntakePackage,
  validateSourceAssetManifest
} from './sourceIntake';
import {
  sourceAuthorityStatusValues,
  sourceIngestionStatusValues,
  type FieldEvidenceAsset,
  type SourceAssetManifest,
  type VerifiedSourceFingerprintObservation
} from '../types/sourceIntake';

function sourceAsset(sourceAssetId: string): SourceAssetManifest {
  const asset = kapCandidateSpatialIntake.sourceAssets.find((entry) => entry.sourceAssetId === sourceAssetId);
  if (!asset) throw new Error(`Missing source fixture: ${sourceAssetId}`);
  return structuredClone(asset);
}

function byteObservation(asset: SourceAssetManifest): VerifiedSourceFingerprintObservation {
  if (asset.observedByteSize === null || asset.observedSha256 === null) throw new Error('Fixture is not byte-verified.');
  return {
    sourceAssetId: asset.sourceAssetId,
    byteSize: asset.observedByteSize,
    sha256: asset.observedSha256,
    verifiedFromBytes: true
  };
}

describe('Stage 3E.4A immutable source intake', () => {
  it('validates the committed source manifests and required authority and ingestion vocabularies', () => {
    expect(kapCandidateSpatialIntake.sourceAssets).toHaveLength(6);
    kapCandidateSpatialIntake.sourceAssets.forEach((asset) => expect(validateSourceAssetManifest(asset)).toMatchObject({ valid: true, issues: [] }));
    expect(sourceAuthorityStatusValues).toEqual([
      'founder-approved-project-governance-source',
      'founder-approved-cad-source',
      'founder-approved-working-source',
      'founder-selected-working-candidate',
      'concept-reference-only',
      'field-reference-and-evidence-candidate',
      'missing',
      'rejected',
      'superseded'
    ]);
    expect(sourceIngestionStatusValues).toEqual([
      'missing',
      'downloading',
      'hash-mismatch',
      'validated',
      'duplicate-confirmed',
      'quarantined',
      'preview-ready',
      'blocked'
    ]);
    expect(sourceAsset('SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001')).toMatchObject({
      authorityStatus: 'founder-approved-project-governance-source',
      expectedByteSize: 6_403_790,
      expectedSha256: '8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb',
      privacyStatus: 'restricted'
    });
  });

  it('accepts the exact zoning PDF size and SHA-256', () => {
    const zoning = sourceAsset('SOURCE-ASSET-KAP-ZONING-CANDIDATE-001');
    expect(acceptExpectedSourceFingerprint(zoning, byteObservation(zoning))).toBe(true);
    expect(zoning).toMatchObject({
      expectedByteSize: 188_146_868,
      observedByteSize: 188_146_868,
      expectedSha256: '1f37e95a7d00c38df4700a8a1ba66aac606639e8b43b5b9ee2bd59c1d35ae6ad',
      observedSha256: '1f37e95a7d00c38df4700a8a1ba66aac606639e8b43b5b9ee2bd59c1d35ae6ad'
    });
  });

  it('turns a hash mismatch into a blocking state and never silently accepts it', () => {
    const zoning = sourceAsset('SOURCE-ASSET-KAP-ZONING-CANDIDATE-001');
    const mismatched = reconcileSourceAssetManifest({ ...zoning, observedSha256: '0'.repeat(64) });
    expect(mismatched).toMatchObject({ ingestionStatus: 'hash-mismatch', contentStatus: 'rejected' });
    expect(mismatched.validationErrors).toContain('source-hash-mismatch');
    expect(() => acceptExpectedSourceFingerprint(mismatched, byteObservation(mismatched))).toThrowError(/لم يُقبل المصدر/);
  });

  it('confirms the Drive DWG as a duplicate without creating a false content revision', () => {
    const duplicate = sourceAsset('SOURCE-ASSET-KAP-DWG-DRIVE-001');
    const canonical: SourceAssetManifest = {
      ...duplicate,
      sourceAssetId: 'SOURCE-KAP-DWG-PROVISIONAL-001',
      sourceName: 'Kaig-master 2.dwg',
      contentStatus: 'content-verified',
      ingestionStatus: 'validated',
      duplicateOfSourceAssetId: null
    };
    const incoming: SourceAssetManifest = {
      ...duplicate,
      contentStatus: 'content-verified',
      ingestionStatus: 'validated',
      duplicateOfSourceAssetId: null
    };
    const registration = registerSourceAsset([canonical], incoming, byteObservation(incoming));
    expect(registration).toMatchObject({
      canonicalSourceAssetId: canonical.sourceAssetId,
      duplicateConfirmed: true,
      contentRevisionCreated: false
    });
    expect(registration.assets[1]).toMatchObject({
      ingestionStatus: 'duplicate-confirmed',
      contentStatus: 'duplicate',
      duplicateOfSourceAssetId: canonical.sourceAssetId
    });
  });

  it('keeps public Drive availability separate from authority and exposes the anonymous-writer risk', () => {
    kapCandidateSpatialIntake.sourceAssets.filter((asset) => asset.provider === 'google-drive').forEach((asset) => {
      expect(asset.providerPermissionRisk).toBe('DRIVE-PERMISSION-ANONYMOUS-WRITER');
      expect(asset.notes.join(' ')).toContain('DRIVE-PERMISSION-ANONYMOUS-WRITER');
    });
    expect(sourceAsset('SOURCE-ASSET-KAP-ZONING-CANDIDATE-001').authorityStatus).toBe('founder-selected-working-candidate');
  });

  it('rejects manifest-only acceptance without matching byte-verification evidence', () => {
    const zoning = sourceAsset('SOURCE-ASSET-KAP-ZONING-CANDIDATE-001');
    expect(() => acceptExpectedSourceFingerprint(zoning, {
      ...byteObservation(zoning),
      sha256: '0'.repeat(64)
    })).toThrowError(/دليل قياس البايتات/);
  });
});

describe('Stage 3E.4A candidate spatial model and mapping isolation', () => {
  it('validates exactly eleven stable candidate entities without approved geometry', () => {
    expect(kapCandidateSpatialValidation).toMatchObject({ valid: true, issues: [] });
    expect(kapCandidateSpatialIntake.candidateEntities).toHaveLength(11);
    expect(kapCandidateSpatialIntake.candidateEntities.map((entity) => entity.candidateId)).toEqual(
      Array.from({ length: 11 }, (_, index) => `ENTITY-KAP-OP-${String(index + 1).padStart(3, '0')}`)
    );
    expect(kapCandidateSpatialIntake.candidateEntities.every((entity) =>
      entity.geometryStatus === 'normalized-image-anchor'
      && entity.anchorMethod === 'manual-derived-from-candidate-raster'
      && entity.authorityStatus === 'founder-selected-working-candidate'
    )).toBe(true);
  });

  it('rejects an out-of-range raster anchor and any approved geometry promotion', () => {
    const invalidAnchor = structuredClone(kapCandidateSpatialIntake.candidateEntities);
    invalidAnchor[0]!.normalizedAnchor = { ...invalidAnchor[0]!.normalizedAnchor!, x: 1.2, y: 0.5 };
    expect(validateCandidateSpatialEntities(invalidAnchor, kapCandidateSpatialIntake.sourceAssets, {
      projectId: kapCandidateSpatialIntake.projectId,
      eventId: kapCandidateSpatialIntake.eventId,
      venueId: kapCandidateSpatialIntake.venueId
    }).map((entry) => entry.code)).toContain('candidate-anchor-invalid');

    const approved = structuredClone(kapCandidateSpatialIntake.candidateEntities);
    approved[0]!.geometryStatus = 'approved-geometry';
    expect(validateCandidateSpatialEntities(approved, kapCandidateSpatialIntake.sourceAssets, {
      projectId: kapCandidateSpatialIntake.projectId,
      eventId: kapCandidateSpatialIntake.eventId,
      venueId: kapCandidateSpatialIntake.venueId
    }).map((entry) => entry.code)).toContain('candidate-approved-geometry-prohibited');
  });

  it('keeps scale, CRS, approval and calibration explicitly incomplete', () => {
    expect(kapCandidateSpatialIntake.overlay).toMatchObject({
      northSymbolStatus: 'present',
      scaleStatus: 'unknown',
      crsStatus: 'unknown',
      approvalStatus: 'missing',
      geometryCalibrationStatus: 'incomplete'
    });
  });

  it('supports one-to-many relationships, shows the terminology conflict and leaves show unresolved', () => {
    const arrival = kapCandidateSpatialIntake.relationships.find((relationship) => relationship.experienceObjectId === 'ZONE-ARRIVAL-001');
    const dinner = kapCandidateSpatialIntake.relationships.find((relationship) => relationship.experienceObjectId === 'ZONE-DINNER-VIP-001');
    const ages = kapCandidateSpatialIntake.relationships.find((relationship) => relationship.experienceObjectId === 'ZONE-AGES-TUNNEL-001');
    const show = kapCandidateSpatialIntake.relationships.find((relationship) => relationship.experienceObjectId === 'ZONE-SHOW-001');
    expect(arrival?.candidateEntityIds).toHaveLength(2);
    expect(dinner?.candidateEntityIds).toHaveLength(3);
    expect(ages).toMatchObject({ state: 'conflicted', conflictCodes: ['TERMINOLOGY-TUNNEL-VS-WALKWAY'] });
    expect(show).toMatchObject({ state: 'unresolved', candidateEntityIds: [] });
  });

  it('rejects authority-confirmed relationships and cross-project package leakage', () => {
    const promoted = structuredClone(kapCandidateSpatialIntake.relationships);
    promoted[0]!.state = 'authority-confirmed';
    expect(validateCandidateRelationships(promoted, kapCandidateSpatialIntake.candidateEntities, {
      projectId: kapCandidateSpatialIntake.projectId,
      eventId: kapCandidateSpatialIntake.eventId,
      venueId: kapCandidateSpatialIntake.venueId
    }, kapExperienceObjectIds).map((entry) => entry.code)).toContain('relationship-authority-promotion-prohibited');

    const foreign = structuredClone(kapCandidateSpatialIntake);
    foreign.sourceAssets[0]!.projectId = 'PROJECT-FOREIGN';
    expect(validateCandidateSpatialIntakePackage(foreign, kapExperienceObjectIds).issues.map((entry) => entry.code)).toContain('source-cross-project-scope');
  });

  it('binds normalized anchors to the exact optional preview fingerprint', () => {
    const changedPreview = structuredClone(kapCandidateSpatialIntake);
    changedPreview.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!.previewSha256 = '0'.repeat(64);
    expect(validateCandidateSpatialIntakePackage(changedPreview, kapExperienceObjectIds).issues.map((entry) => entry.code)).toContain('candidate-anchor-preview-mismatch');
  });

  it('rejects unsafe preview URLs and previews on blocked sources', () => {
    const remotePreview = structuredClone(kapCandidateSpatialIntake);
    remotePreview.sourceLayers.find((layer) => layer.truthStatus === 'candidate')!.previewUrl = 'https://example.test/candidate.jpg';
    expect(validateCandidateSpatialIntakePackage(remotePreview, kapExperienceObjectIds).issues.map((entry) => entry.code)).toContain('source-preview-url-unsafe');

    const blockedPreview = structuredClone(kapCandidateSpatialIntake);
    blockedPreview.sourceAssets.find((asset) => asset.sourceRole === 'candidate-operational-zoning')!.ingestionStatus = 'blocked';
    expect(validateCandidateSpatialIntakePackage(blockedPreview, kapExperienceObjectIds).issues.map((entry) => entry.code)).toContain('source-preview-blocked');
  });

  it('rejects suppression of the reviewed Drive risk or its blocked gate', () => {
    const suppressed = structuredClone(kapCandidateSpatialIntake);
    suppressed.sourceAssets.find((asset) => asset.provider === 'google-drive')!.providerPermissionRisk = 'none-recorded';
    expect(validateCandidateSpatialIntakePackage(suppressed, kapExperienceObjectIds).issues.map((entry) => entry.code)).toContain('source-integrity-risk-suppressed');

    const missingGate = structuredClone(kapCandidateSpatialIntake);
    missingGate.blockedGateIds = missingGate.blockedGateIds.filter((gateId) => gateId !== 'DRIVE-PERMISSION-ANONYMOUS-WRITER');
    expect(validateCandidateSpatialIntakePackage(missingGate, kapExperienceObjectIds).issues.map((entry) => entry.code)).toContain('source-integrity-risk-gate-missing');
  });

  it('preserves the five existing experience object IDs without converting candidate entities into them', () => {
    const experienceIdSet = new Set<string>(kapExperienceObjectIds);
    expect(kapExperienceObjectIds).toEqual([
      'ZONE-ARRIVAL-001',
      'ZONE-AGES-TUNNEL-001',
      'ZONE-SHOW-001',
      'ZONE-PHOTO-MEDIA-001',
      'ZONE-DINNER-VIP-001'
    ]);
    expect(kapCandidateSpatialIntake.candidateEntities.some((entity) => experienceIdSet.has(entity.candidateId))).toBe(false);
    kapCandidateSpatialIntake.candidateEntities.forEach((entity) => {
      expect(Object.keys(entity)).not.toEqual(expect.arrayContaining(['readiness', 'capacity', 'routeId']));
    });
  });
});

describe('Stage 3E.4A field evidence privacy and missing visitor-map gate', () => {
  const evidenceBase: Omit<FieldEvidenceAsset, 'gpsPresent' | 'gpsHandlingStatus'> = {
    evidenceAssetId: 'EVIDENCE-FICTIONAL-METADATA-001',
    projectId: kapCandidateSpatialIntake.projectId,
    eventId: kapCandidateSpatialIntake.eventId,
    venueId: kapCandidateSpatialIntake.venueId,
    originalExternalFileId: 'EXTERNAL-FICTIONAL-001',
    originalFilename: 'field-reference-001.jpg',
    mediaType: 'image',
    contentHash: null,
    capturedAtReported: null,
    capturedAtSource: 'exif',
    privacyStatus: 'not-reviewed',
    rightsStatus: 'unknown',
    linkedEntityIds: [],
    linkedZoneIds: [],
    evidenceStatus: 'metadata-only',
    authorityStatus: 'field-reference-and-evidence-candidate',
    notes: []
  };

  it('redacts GPS into status-only browser metadata', () => {
    const evidence = sanitizeFieldEvidenceAsset(evidenceBase, true);
    expect(evidence).toMatchObject({ gpsPresent: true, gpsHandlingStatus: 'quarantined', privacyStatus: 'restricted' });
    const browserRecord = toBrowserSafeFieldEvidenceRecord(evidence);
    expect(browserRecord).not.toHaveProperty('originalExternalFileId');
    expect(browserRecord).not.toHaveProperty('originalFilename');
    expect(browserRecord).not.toHaveProperty('capturedAtReported');
    expect(JSON.stringify(browserRecord)).not.toMatch(/latitude|longitude|coordinates|EXTERNAL-FICTIONAL|field-reference-001/i);
  });

  it('links evidence without mutating readiness', () => {
    const readiness = { state: 'unknown', evidenceIds: [] as string[] };
    const linked = linkEvidenceWithoutReadinessMutation(readiness, sanitizeFieldEvidenceAsset(evidenceBase, false));
    expect(linked.readiness).toEqual(readiness);
    expect(linked.readiness).not.toBe(readiness);
    expect(readiness).toEqual({ state: 'unknown', evidenceIds: [] });
  });

  it('records the reviewed 195/6 inventory as metadata rather than a durable archive', () => {
    expect(kapCandidateSpatialIntake.fieldEvidenceInventory).toMatchObject({
      photographCount: 195,
      videoCount: 6,
      gpsPolicy: 'metadata-status-only-no-browser-coordinates',
      durableArchive: false
    });
    expect(kapCandidateSpatialIntake.fieldEvidenceInventory.categories.reduce((total, category) =>
      total + (category.mediaType === 'image' ? category.reviewedCount : 0), 0)).toBe(195);
    expect(kapCandidateSpatialIntake.fieldEvidenceInventory.categories.reduce((total, category) =>
      total + (category.mediaType === 'video' ? category.reviewedCount : 0), 0)).toBe(6);
  });

  it('keeps the editable Disney-style visitor map visibly missing', () => {
    expect(kapCandidateSpatialIntake.sourceReadiness.visitorMapStatus).toBe('missing');
    expect(kapCandidateSpatialIntake.blockedGateIds).toContain('VISITOR-MAP-EDITABLE-SOURCE-MISSING');
    expect(sourceAsset('SOURCE-ASSET-KAP-VISITOR-MAP-001')).toMatchObject({
      authorityStatus: 'missing',
      contentStatus: 'missing',
      ingestionStatus: 'missing'
    });
  });

  it('treats local previews as optional ignored derivatives', () => {
    const previews = kapCandidateSpatialIntake.sourceLayers.filter((layer) => layer.previewUrl);
    expect(previews).toHaveLength(2);
    expect(previews.every((layer) => layer.previewCommitted === false && layer.previewSha256?.length === 64)).toBe(true);
  });
});
