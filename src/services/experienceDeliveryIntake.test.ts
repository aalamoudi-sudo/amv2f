import { describe, expect, it } from 'vitest';
import operationalTemplateJson from '../../pilot-input/manifests/kap-operational-delivery-manifest-template-v1.json';
import studioTemplateJson from '../../pilot-input/manifests/kap-studio-3d-delivery-manifest-template-v1.json';
import { kapExperienceDeliveryReadinessProjection, kapFourDayExperienceTruthProjection } from '../data/experienceReviewProjections';
import { kapNovember1FounderTruthCorrection } from '../data/kapNovember1FounderTruthCorrection';
import type {
  DeliveryRoleCandidate,
  ExperienceDeliveryValidationContext,
  OperationalDeliveryManifest,
  Studio3DDeliveryManifest
} from '../types/experienceDelivery';
import { ExperienceDeliveryIntakeGateway, validateExperienceDeliveryReadinessProjection, validateOperationalDeliveryManifest, validateStudio3DDeliveryManifest } from './experienceDeliveryIntake';

const operationalTemplate = operationalTemplateJson as OperationalDeliveryManifest;
const studioTemplate = studioTemplateJson as Studio3DDeliveryManifest;

function context(): ExperienceDeliveryValidationContext {
  return {
    projectId: kapFourDayExperienceTruthProjection.projectId,
    eventId: kapFourDayExperienceTruthProjection.eventId,
    venueId: kapFourDayExperienceTruthProjection.venueId,
    knownDayIds: new Set(kapFourDayExperienceTruthProjection.days.map((day) => day.dayId)),
    knownPersonaIds: new Set(kapFourDayExperienceTruthProjection.personas.map((persona) => persona.personaDefinitionId)),
    knownDestinationIds: new Set(kapFourDayExperienceTruthProjection.destinations.map((destination) => destination.destinationId))
  };
}

const role: DeliveryRoleCandidate = {
  actorRef: 'ACTOR-FICTIONAL-SOURCE-001',
  roleRef: 'ROLE-FICTIONAL-DELIVERY-001',
  classification: 'source-backed-candidate',
  sourceTraceIds: ['TRACE-FICTIONAL-001']
};

function validOperationalManifest(): OperationalDeliveryManifest {
  const dayId = kapFourDayExperienceTruthProjection.days[0]!.dayId;
  const personaId = kapFourDayExperienceTruthProjection.personas[0]!.personaDefinitionId;
  const destinationId = kapFourDayExperienceTruthProjection.destinations[0]!.destinationId;
  const hash = 'a'.repeat(64);
  const filename = 'fictional-operations-r1.xlsx';
  const sourceId = 'SOURCE-FICTIONAL-OPERATIONS-R1';
  const size = 12_400;
  return {
    ...structuredClone(operationalTemplate),
    manifestId: 'OPERATIONAL-DELIVERY-FICTIONAL-R1',
    sourceId,
    filename,
    hash,
    size,
    revision: 1,
    authority: 'source-backed-working-candidate',
    approvalStatus: 'candidate',
    day: dayId,
    persona: [personaId],
    destinationIds: [destinationId],
    owner: role,
    responsibleParty: { ...role, roleRef: 'ROLE-FICTIONAL-RESPONSIBLE-001' },
    verificationAuthority: { ...role, roleRef: 'ROLE-FICTIONAL-VERIFIER-001' },
    approvalAuthority: { ...role, roleRef: 'ROLE-FICTIONAL-APPROVER-001' },
    schedule: [{
      scheduleEntryId: 'SCHEDULE-FICTIONAL-001',
      dayId,
      personaIds: [personaId],
      momentId: null,
      startsAtReported: null,
      endsAtReported: null,
      timeZone: null,
      status: 'candidate',
      sourceTraceIds: ['TRACE-FICTIONAL-001']
    }],
    routeCandidate: [{
      routeCandidateId: 'ROUTE-FICTIONAL-CANDIDATE-001',
      dayId,
      personaIds: [personaId],
      destinationIds: [destinationId],
      status: 'candidate',
      geometryStatus: 'source-reference-only',
      sourceTraceIds: ['TRACE-FICTIONAL-001']
    }],
    evidenceRule: [{
      evidenceRuleId: 'EVIDENCE-RULE-FICTIONAL-001',
      evidenceType: 'source-record',
      verificationRequired: true,
      approvalRequired: true,
      sourceTraceIds: ['TRACE-FICTIONAL-001']
    }],
    sourceInventory: {
      sourceRecordId: sourceId,
      localOpaqueSourceId: `LOCAL-SOURCE-${hash.slice(0, 16)}`,
      originalFilename: filename,
      safeDisplayFilename: filename,
      sourceType: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      byteSize: size,
      sha256: hash,
      fingerprintState: 'verified',
      sourceOwner: 'fictional',
      suppliedBy: 'local-test-identity',
      suppliedAt: '2026-08-01T09:00:00+03:00',
      revision: 'R1',
      claimedApprovalStatus: 'candidate',
      verifiedAuthorityStatus: 'source-backed-working-candidate',
      confidentialityClassification: 'internal',
      retentionClassification: 'review-session',
      relevantDayIds: [dayId],
      relevantPersonaIds: [personaId],
      relevantDestinationIds: [destinationId],
      relevantWorkstreamIds: [],
      extractionStatus: 'structured-preview-ready',
      conflictStatus: 'none',
      acceptanceStatus: 'awaiting-founder-review',
      modifiedAtReported: null,
      pathDisclosure: 'redacted'
    }
  };
}

function validStudioManifest(): Studio3DDeliveryManifest {
  const hash = 'b'.repeat(64);
  const filename = 'fictional-panorama-r1.jpg';
  const sourceId = 'SOURCE-FICTIONAL-PANORAMA-R1';
  const size = 18_000_000;
  return {
    ...structuredClone(studioTemplate),
    manifestId: 'STUDIO-DELIVERY-FICTIONAL-R1',
    sourceId,
    authority: 'source-backed-working-candidate',
    filename,
    format: 'jpeg-equirectangular',
    hash,
    size,
    version: '1',
    software: 'replaceable-studio-tool',
    softwareVersion: '1',
    renderEngine: 'replaceable-renderer',
    destinationId: kapFourDayExperienceTruthProjection.destinations[0]!.destinationId,
    sceneId: 'SCENE-FICTIONAL-001',
    dayVariant: [kapFourDayExperienceTruthProjection.days[0]!.dayId],
    personaVariant: [kapFourDayExperienceTruthProjection.personas[0]!.personaDefinitionId],
    cameraId: 'CAMERA-FICTIONAL-001',
    cameraPosition: { x: 0, y: 0, z: 1.65 },
    cameraHeight: 1.65,
    cameraHeading: 0,
    fieldOfView: 90,
    northDirection: 0,
    units: 'meter',
    scale: 1,
    origin: { x: 0, y: 0, z: 0 },
    coordinateReference: 'candidate-local-frame',
    dimensions: { width: 8_192, height: 4_096 },
    rightsStatus: 'client-review-approved',
    approvalStatus: 'candidate',
    optimizationStatus: 'review-ready',
    spatialRegistrationStatus: 'candidate',
    navmeshStatus: 'not-provided',
    collisionStatus: 'not-provided',
    projectionMappingStatus: 'not-provided',
    sourceInventory: {
      sourceRecordId: sourceId,
      localOpaqueSourceId: `LOCAL-SOURCE-${hash.slice(0, 16)}`,
      originalFilename: filename,
      safeDisplayFilename: filename,
      sourceType: 'studio-asset',
      mimeType: 'image/jpeg',
      byteSize: size,
      sha256: hash,
      fingerprintState: 'verified',
      sourceOwner: 'fictional',
      suppliedBy: 'local-test-identity',
      suppliedAt: '2026-08-01T09:00:00+03:00',
      revision: 'R1',
      claimedApprovalStatus: 'candidate',
      verifiedAuthorityStatus: 'source-backed-working-candidate',
      confidentialityClassification: 'internal',
      retentionClassification: 'review-session',
      relevantDayIds: [kapFourDayExperienceTruthProjection.days[0]!.dayId],
      relevantPersonaIds: [kapFourDayExperienceTruthProjection.personas[0]!.personaDefinitionId],
      relevantDestinationIds: [kapFourDayExperienceTruthProjection.destinations[0]!.destinationId],
      relevantWorkstreamIds: [],
      extractionStatus: 'metadata-extracted',
      conflictStatus: 'none',
      acceptanceStatus: 'awaiting-founder-review',
      modifiedAtReported: null,
      pathDisclosure: 'redacted'
    }
  };
}

describe('EX.1F Wave A controlled delivery intake', () => {
  it('keeps delivery readiness separate while preserving the frozen truth lineage', () => {
    expect(kapFourDayExperienceTruthProjection).toMatchObject({ projectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R4', revision: 4, operationalReadiness: 'cannot-determine' });
    expect(kapFourDayExperienceTruthProjection.contentHash).toBe('334aca7d9edefa02db442de6f250e7b8653670afa8942c990f3e196ebe690d00');
    expect(kapNovember1FounderTruthCorrection).toMatchObject({
      previousProjectionId: 'EXPERIENCE-TRUTH-KAP-FOUR-DAY-R2',
      previousContentHash: '1cc36cab8a641cdad213178a3f7352df2112e54e415ab38ef625f93ea715febf',
      operationalJourneyStatus: 'not-applicable',
      visitorJourneyStatus: 'not-applicable'
    });
    expect(kapFourDayExperienceTruthProjection.contentHash).not.toBe(kapNovember1FounderTruthCorrection.previousContentHash);
    expect('deliveryReadiness' in kapFourDayExperienceTruthProjection).toBe(false);
    expect(kapExperienceDeliveryReadinessProjection.lanes).toEqual([
      expect.objectContaining({ laneId: 'operational', status: 'preview-ready', statusMessageAr: 'استُلمت حزمة V.11 وتحققت بصمتها كمرشح عمل؛ محاسبة المدة شاملة واعتماد المسارات ما زال معلقًا.', acceptedManifestCount: 0, projectionBindingStatus: 'not-started' }),
      expect.objectContaining({ laneId: 'studio-3d', status: 'awaiting-delivery', statusMessageAr: 'مشاهد 360° والنماذج ثلاثية الأبعاد قيد التسليم والتحسين', acceptedManifestCount: 0, projectionBindingStatus: 'not-started' })
    ]);
    expect(Object.isFrozen(kapExperienceDeliveryReadinessProjection)).toBe(true);
    expect(Object.isFrozen(kapExperienceDeliveryReadinessProjection.lanes)).toBe(true);

    const tampered = structuredClone(kapExperienceDeliveryReadinessProjection);
    tampered.lanes[0]!.acceptedManifestCount = 1;
    tampered.lanes[0]!.projectionBindingStatus = 'bound-candidate';
    expect(validateExperienceDeliveryReadinessProjection(tampered).map((candidate) => candidate.code)).toContain('experience-delivery-pending-promoted');
  });

  it('keeps both KAP delivery templates blocked and projection-free while inputs are missing', () => {
    const gateway = new ExperienceDeliveryIntakeGateway(context());
    const operational = gateway.previewOperational(structuredClone(operationalTemplate));
    const studio = gateway.previewStudio3D(structuredClone(studioTemplate));

    expect(operational.valid).toBe(false);
    expect(studio.valid).toBe(false);
    expect(operational.issues.map((candidate) => candidate.code)).toContain('experience-delivery-hash-invalid');
    expect(studio.issues.map((candidate) => candidate.code)).toContain('experience-studio-format-missing');
    expect(gateway.acceptOperational(operational).accepted).toBe(false);
    expect(gateway.acceptStudio3D(studio).accepted).toBe(false);
    expect(gateway.acceptedCounts()).toEqual({ operational: 0, studio3D: 0 });
    expect(kapFourDayExperienceTruthProjection.operationalReadiness).toBe('cannot-determine');
  });

  it('previews then accepts immutable operational metadata without binding the Experience Twin', () => {
    const gateway = new ExperienceDeliveryIntakeGateway(context());
    const callerOwned = validOperationalManifest();
    const beforeProjectionHash = kapFourDayExperienceTruthProjection.contentHash;
    const result = gateway.previewOperational(callerOwned);

    expect(result).toMatchObject({ valid: true, canAcceptMetadata: true, canBindProjection: true, kind: 'operational' });
    expect(Object.isFrozen(result.manifest)).toBe(true);
    expect(Object.isFrozen(result.manifest.schedule)).toBe(true);
    callerOwned.schedule[0]!.status = 'conflicting';
    expect(result.manifest.schedule[0]!.status).toBe('candidate');
    expect(gateway.acceptOperational(result)).toMatchObject({ accepted: true, messageAr: expect.stringContaining('لم يتغير إسقاط') });
    expect(gateway.acceptedCounts()).toEqual({ operational: 1, studio3D: 0 });
    expect(kapFourDayExperienceTruthProjection.contentHash).toBe(beforeProjectionHash);
  });

  it('fails closed for foreign scope, invalid hashes and unknown references', () => {
    const foreign = validOperationalManifest();
    foreign.projectId = 'PROJECT-FOREIGN';
    foreign.hash = 'not-a-hash';
    foreign.destinationIds = ['DESTINATION-FOREIGN'];
    const issues = validateOperationalDeliveryManifest(foreign, context());
    expect(issues.map((candidate) => candidate.code)).toEqual(expect.arrayContaining([
      'experience-delivery-scope-mismatch',
      'experience-delivery-hash-invalid',
      'experience-delivery-destination-unknown'
    ]));
  });

  it('accepts only a real 2:1 review panorama and rejects a flat render masquerading as spatial media', () => {
    const valid = validStudioManifest();
    expect(validateStudio3DDeliveryManifest(valid, context())).toEqual([]);

    const validPng = structuredClone(valid);
    validPng.format = 'png-equirectangular';
    validPng.filename = 'fictional-panorama-r1.png';
    validPng.sourceInventory!.safeDisplayFilename = validPng.filename;
    validPng.sourceInventory!.originalFilename = validPng.filename;
    expect(validateStudio3DDeliveryManifest(validPng, context())).toEqual([]);

    const invalidPanorama = structuredClone(valid);
    invalidPanorama.dimensions = { width: 4_096, height: 3_000 };
    expect(validateStudio3DDeliveryManifest(invalidPanorama, context()).map((candidate) => candidate.code)).toContain('experience-studio-panorama-invalid');

    const flat = structuredClone(valid);
    flat.format = 'jpeg-flat-render';
    expect(validateStudio3DDeliveryManifest(flat, context()).map((candidate) => candidate.code)).toContain('experience-studio-flat-spatial-claim');
  });

  it('blocks missing studio dependencies and warns when a large model lacks an optimization state', () => {
    const model = validStudioManifest();
    model.format = 'glb';
    model.filename = 'fictional-model.glb';
    model.size = 55 * 1024 * 1024;
    model.optimizationStatus = 'unknown';
    model.missingDependencies = ['texture-basecolor.ktx2'];
    const issues = validateStudio3DDeliveryManifest(model, context());
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'experience-studio-model-size-warning', severity: 'warning' }),
      expect.objectContaining({ code: 'experience-studio-dependency-missing', severity: 'blocking' })
    ]));
  });

  it('does not accept a preview issued by another gateway or a caller-shaped object', () => {
    const first = new ExperienceDeliveryIntakeGateway(context());
    const second = new ExperienceDeliveryIntakeGateway(context());
    const issued = first.previewOperational(validOperationalManifest());
    expect(second.acceptOperational(issued).accepted).toBe(false);
    expect(first.acceptOperational(structuredClone(issued)).accepted).toBe(false);
    expect(first.acceptedCounts()).toEqual({ operational: 0, studio3D: 0 });
  });

  it('uses the same generic intake boundary for a non-KAP scope', () => {
    const manifest = validOperationalManifest();
    const serialized = JSON.stringify(manifest)
      .replaceAll('KAP', 'FICTIONAL')
      .replaceAll('PROJECT-FICTIONAL-OPENING-2026', 'PROJECT-FICTIONAL-EVENT-001')
      .replaceAll('EVENT-FICTIONAL-OPENING-2026', 'EVENT-FICTIONAL-001')
      .replaceAll('VENUE-FICTIONAL-001', 'VENUE-FICTIONAL-001');
    const fixture = JSON.parse(serialized) as OperationalDeliveryManifest;
    const fictionalContext: ExperienceDeliveryValidationContext = {
      projectId: fixture.projectId,
      eventId: fixture.eventId,
      venueId: fixture.venueId,
      knownDayIds: new Set(fixture.day ? [fixture.day] : []),
      knownPersonaIds: new Set(fixture.persona),
      knownDestinationIds: new Set(fixture.destinationIds)
    };
    const gateway = new ExperienceDeliveryIntakeGateway(fictionalContext);
    expect(gateway.previewOperational(fixture).valid).toBe(true);
    expect(JSON.stringify(fixture)).not.toContain('حدائق الملك عبدالله');
  });
});
