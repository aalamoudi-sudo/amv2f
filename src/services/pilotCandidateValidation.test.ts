import { describe, expect, it } from 'vitest';
import { createKapPilotCandidate, kapStableEntityIds } from '../data/kapPilotCandidate';
import {
  comparePilotCadManifests,
  promotePilotCadManifest,
  rollbackPilotCadManifest
} from './pilotCadReplacement';
import {
  attemptPilotCandidateFreeze,
  buildPilotCandidatePreview,
  createPilotCandidateSourceHash,
  evaluatePilotFreezeGates,
  validatePilotEventPackageCandidate
} from './pilotCandidateValidation';
import type { PilotCadManifest, PilotEventPackageCandidate } from '../types/pilotCandidate';

function codes(candidate: PilotEventPackageCandidate) {
  return validatePilotEventPackageCandidate(candidate).issues.map((current) => current.code);
}

function approvedSyntheticCad(candidate: PilotEventPackageCandidate): PilotCadManifest {
  return {
    ...structuredClone(candidate.cadManifest),
    manifestId: 'CAD-MANIFEST-SYNTHETIC-APPROVED-TEST',
    sourceRef: 'SOURCE-SYNTHETIC-APPROVED-TEST',
    contentHash: 'b'.repeat(64),
    revision: 'A1-TEST',
    sourceStatus: 'final-approved-source',
    epsg: 'EPSG:32638',
    northAuthority: 'SURVEY-NORTH-TEST',
    originAuthority: 'SURVEY-ORIGIN-TEST',
    embeddedGeolocationTrusted: false,
    mappingProfileId: 'MAPPING-SYNTHETIC-TEST',
    geometryVersion: 'synthetic-test-v2',
    mappedEntityIds: [...candidate.stableEntityIds]
  };
}

describe('Stage 3E.2 KAP candidate authoring integrity', () => {
  it('preserves the approved event identity and explicit date assumption', () => {
    const candidate = createKapPilotCandidate();
    expect(candidate.event).toMatchObject({
      eventId: 'EVENT-KAP-OPENING-2026',
      venueId: 'VENUE-KAP-001',
      eventNameAr: 'حفل افتتاح وتدشين حدائق الملك عبدالله',
      eventDate: '2026-10-31',
      timeZone: 'Asia/Riyadh',
      dateAssumption: true,
      assumptionReason: 'year inferred from current 2026 project context'
    });
    expect(candidate.authoringLifecycle).toBe('candidate');
    expect(candidate.stateContext).toBe('temporary-demo');
  });

  it('keeps all five stable IDs and never fabricates coordinates or polygons', () => {
    const candidate = createKapPilotCandidate();
    expect(candidate.stableEntityIds).toEqual(kapStableEntityIds);
    expect(candidate.entities.map((entity) => entity.entityId)).toEqual(kapStableEntityIds);
    candidate.entities.forEach((entity) => {
      expect(entity.geometryMappingStatus).toBe('pending');
      expect(entity.position).toBeNull();
      expect(entity.polygon).toBeNull();
      expect(entity.geometryReference).toBeNull();
    });
  });

  it('preserves exact source classifications and the provisional DWG hash', () => {
    const candidate = createKapPilotCandidate();
    expect(candidate.sources.find((source) => source.sourceType === 'governance')?.sourceStatus).toBe('final-approved-source');
    expect(candidate.sources.find((source) => source.sourceType === 'employee-register')?.sourceStatus).toBe('received-non-authoritative-identity-source');
    expect(candidate.sources.find((source) => source.sourceId === candidate.cadManifest.sourceRef)?.sourceStatus).toBe('provisional-until-approved-revision-arrives');
    expect(candidate.cadManifest.contentHash).toBe('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');
  });

  it('exposes only logical source-registry paths to the browser candidate', () => {
    const candidate = createKapPilotCandidate();
    candidate.sources.forEach((source) => {
      if (!source.sourcePath) return;
      expect(source.sourcePath).not.toMatch(/^(?:file:|\/|[A-Za-z]:\\)/);
    });
    expect(JSON.stringify(candidate)).not.toContain('/Users/');
  });

  it('validates the candidate for authoring while keeping freeze blocked', async () => {
    const candidate = await buildPilotCandidatePreview(createKapPilotCandidate());
    const result = validatePilotEventPackageCandidate(candidate);
    expect(result.validForAuthoring, result.issues.map((current) => current.messageAr).join('\n')).toBe(true);
    expect(result.readyToFreeze).toBe(false);
    expect(result.freezeGates).toHaveLength(12);
    expect(result.freezeGates.every((gate) => gate.status === 'blocked')).toBe(true);
  });

  it('creates a deterministic source identity without pretending to have an EventPackage content hash', async () => {
    const candidate = createKapPilotCandidate();
    const first = await createPilotCandidateSourceHash(candidate);
    const second = await createPilotCandidateSourceHash(structuredClone(candidate));
    expect(first).toBe(second);
    expect(first).toMatch(/^PILOT-SOURCE-v1-[a-f0-9]{64}$/);
    const preview = await buildPilotCandidatePreview(candidate);
    expect(preview.sourceBundleHash).toBe(first);
    expect(preview.packageContentHash).toBeNull();
  });

  it('changes the deterministic source identity after a legal source change', async () => {
    const first = createKapPilotCandidate();
    const second = structuredClone(first);
    second.packageVersion = '0.1.1-candidate';
    expect(await createPilotCandidateSourceHash(first)).not.toBe(await createPilotCandidateSourceHash(second));
  });

  it('allows Ahmed to approve platform pilot scope', () => {
    const candidate = createKapPilotCandidate();
    const platform = candidate.authorities.find((authority) => authority.authorityType === 'platform');
    expect(platform).toMatchObject({
      actorId: 'ACTOR-PLATFORM-AHMED-001',
      verificationStatus: 'confirmed-platform-only'
    });
    expect(codes(candidate)).not.toContain('pilot-platform-authority-misused');
  });

  it('denies using Ahmed as client or HSE authority', () => {
    const candidate = createKapPilotCandidate();
    candidate.authorities.find((authority) => authority.authorityType === 'hse')!.actorId = 'ACTOR-PLATFORM-AHMED-001';
    expect(codes(candidate)).toContain('pilot-platform-authority-misused');
  });

  it('blocks production permission based on an employee name only', () => {
    const candidate = createKapPilotCandidate();
    const assignment = candidate.roleAssignments.find((current) => current.actorId === 'ACTOR-CANDIDATE-MOHAMMED-IBRAHIM')!;
    assignment.assignmentStatus = 'production-active';
    assignment.productionPermissionGranted = true;
    expect(codes(candidate)).toEqual(expect.arrayContaining(['pilot-name-only-production-permission', 'pilot-production-assignment-incomplete']));
  });

  it('preserves the ambiguous HR matches without selecting one', () => {
    const actor = createKapPilotCandidate().actors.find((current) => current.actorId === 'ACTOR-CANDIDATE-MOHAMMED-IBRAHIM')!;
    expect(actor.identityStatus).toBe('unresolved');
    expect(actor.authoritativeIdentityId).toBeNull();
    expect(actor.possibleHrMatches).toHaveLength(2);
    expect(actor.hrJobTitleAr).toBeNull();
  });

  it('blocks marking the current DWG approved without coordinate authority', () => {
    const candidate = createKapPilotCandidate();
    candidate.cadManifest.sourceStatus = 'final-approved-source';
    expect(codes(candidate)).toContain('pilot-provisional-dwg-false-promotion');
  });

  it('blocks using a drone image or render as geometry', () => {
    const candidate = createKapPilotCandidate();
    const visual = candidate.sources.find((source) => source.sourceType === 'design-review')!;
    visual.permittedUses.push('geometry');
    expect(codes(candidate)).toContain('pilot-visual-used-as-geometry');
  });

  it('requires incomplete media evidence to remain quarantined', () => {
    const candidate = createKapPilotCandidate();
    const evidence = candidate.evidence[0]!;
    evidence.status = 'accepted';
    expect(codes(candidate)).toContain('pilot-evidence-quarantine-required');
    evidence.status = 'quarantined';
    expect(codes(candidate)).not.toContain('pilot-evidence-quarantine-required');
  });

  it('fails freeze closed and returns every open gate', async () => {
    const result = await attemptPilotCandidateFreeze(createKapPilotCandidate());
    expect(result.success).toBe(false);
    expect(result.candidate.authoringLifecycle).toBe('candidate');
    expect(result.issues.filter((current) => current.code.startsWith('pilot-freeze-blocked-'))).toHaveLength(12);
  });

  it('rejects a missing capability dependency', () => {
    const candidate = createKapPilotCandidate();
    candidate.capabilities.find((capability) => capability.capabilityId === 'candidate-package-preview')!.dependencyIds = ['unknown-capability'];
    expect(codes(candidate)).toContain('pilot-capability-dependency-missing');
  });

  it('rejects a scenario that writes into baseline', () => {
    const candidate = createKapPilotCandidate();
    candidate.scenarios.push({ scenarioId: 'SCENARIO-INVALID-BASELINE', stateContext: 'scenario', writesToStateContext: 'baseline' });
    expect(codes(candidate)).toContain('pilot-scenario-baseline-write');
  });

  it('rejects cross-event role assignments', () => {
    const candidate = createKapPilotCandidate();
    candidate.roleAssignments[0]!.eventId = 'EVENT-OTHER-001';
    expect(codes(candidate)).toContain('pilot-role-cross-event');
  });

  it('rejects duplicate and conflicting source fingerprints', () => {
    const duplicate = createKapPilotCandidate();
    duplicate.sources.push(structuredClone(duplicate.sources[0]!));
    expect(codes(duplicate)).toContain('pilot-source-id-duplicate');

    const conflict = createKapPilotCandidate();
    const source = structuredClone(conflict.sources[0]!);
    source.sourceId = 'SOURCE-KAP-CONFLICT-TEST';
    source.contentHash = 'f'.repeat(64);
    conflict.sources.push(source);
    expect(codes(conflict)).toContain('pilot-source-fingerprint-conflict');
  });

  it('rejects missing derived-source lineage', () => {
    const candidate = createKapPilotCandidate();
    candidate.derivedAssets[0]!.parentSourceIds = ['SOURCE-UNKNOWN'];
    expect(codes(candidate)).toContain('pilot-derived-lineage-missing');
  });

  it('preserves unknown values through a structured round trip', () => {
    const candidate = createKapPilotCandidate();
    const roundTrip = JSON.parse(JSON.stringify(candidate)) as PilotEventPackageCandidate;
    expect(roundTrip.cadManifest.epsg).toBeNull();
    expect(roundTrip.cadManifest.northAuthority).toBeNull();
    expect(roundTrip.entities.every((entity) => entity.position === null)).toBe(true);
    expect(roundTrip.actors.find((actor) => actor.identityStatus === 'unresolved')?.authoritativeIdentityId).toBeNull();
  });

  it('never throws for malformed candidate input', () => {
    [null, [], {}, { event: null }, { event: {}, entities: null }].forEach((value) => {
      expect(() => validatePilotEventPackageCandidate(value)).not.toThrow();
      expect(validatePilotEventPackageCandidate(value).validForAuthoring).toBe(false);
    });
  });

  it('shows a no-fabrication comparison while no approved CAD is staged', () => {
    const candidate = createKapPilotCandidate();
    const comparison = comparePilotCadManifests(candidate.cadManifest, null, candidate.stableEntityIds);
    expect(comparison.valid).toBe(false);
    expect(comparison.stagedManifestId).toBeNull();
    expect(comparison.differences.every((current) => current.changed === null)).toBe(true);
  });

  it('compares a synthetic approved manifest across the required CAD dimensions', () => {
    const candidate = createKapPilotCandidate();
    const comparison = comparePilotCadManifests(candidate.cadManifest, approvedSyntheticCad(candidate), candidate.stableEntityIds);
    expect(comparison.valid, comparison.issues.map((current) => current.messageAr).join('\n')).toBe(true);
    expect(comparison.differences.map((current) => current.field)).toEqual(expect.arrayContaining([
      'contentHash', 'revision', 'units', 'xyExtents', 'zExtents', 'layerCount', 'layerNames',
      'xrefLayerCount', 'epsg', 'northAuthority', 'originAuthority', 'missingMappedEntities', 'orphanedMappings'
    ]));
  });

  it('rejects a CAD replacement that changes the stable entity mapping', () => {
    const candidate = createKapPilotCandidate();
    const staged = approvedSyntheticCad(candidate);
    staged.mappedEntityIds = [...candidate.stableEntityIds.slice(1), 'ZONE-UNRELATED-TEST'];
    const comparison = comparePilotCadManifests(candidate.cadManifest, staged, candidate.stableEntityIds);
    expect(comparison.valid).toBe(false);
    expect(comparison.missingMappedEntityIds).toContain('ZONE-ARRIVAL-001');
    expect(comparison.orphanedMappingIds).toContain('ZONE-UNRELATED-TEST');
  });

  it('rolls back atomically when a package dependency fails', () => {
    const candidate = createKapPilotCandidate();
    const current = structuredClone(candidate.cadManifest);
    const result = promotePilotCadManifest(
      current,
      approvedSyntheticCad(candidate),
      candidate.stableEntityIds,
      { authorityType: 'engineering-geometry', authorityId: 'AUTHORITY-SYNTHETIC-TEST' },
      () => false
    );
    expect(result.promoted).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.activeManifest).toEqual(current);
  });

  it('rejects using platform approval to promote CAD', () => {
    const candidate = createKapPilotCandidate();
    const result = promotePilotCadManifest(
      candidate.cadManifest,
      approvedSyntheticCad(candidate),
      candidate.stableEntityIds,
      { authorityType: 'platform', authorityId: 'AUTHORITY-KAP-PLATFORM' },
      () => true
    );
    expect(result.promoted).toBe(false);
    expect(result.issues.map((current) => current.code)).toContain('pilot-cad-platform-approval-misused');
  });

  it('promotes and rolls back an approved synthetic CAD without mutating candidate identity or governance', () => {
    const candidate = createKapPilotCandidate();
    const originalIdentity = structuredClone(candidate.event);
    const originalRoles = structuredClone(candidate.roleAssignments);
    const promoted = promotePilotCadManifest(
      candidate.cadManifest,
      approvedSyntheticCad(candidate),
      candidate.stableEntityIds,
      { authorityType: 'engineering-geometry', authorityId: 'AUTHORITY-SYNTHETIC-TEST' },
      () => true
    );
    expect(promoted.promoted).toBe(true);
    const rolledBack = rollbackPilotCadManifest(promoted);
    expect(rolledBack.activeManifest).toEqual(candidate.cadManifest);
    expect(candidate.event).toEqual(originalIdentity);
    expect(candidate.roleAssignments).toEqual(originalRoles);
    expect(candidate.stableEntityIds).toEqual(kapStableEntityIds);
  });

  it('keeps all freeze-gate evaluation deterministic', () => {
    const candidate = createKapPilotCandidate();
    expect(evaluatePilotFreezeGates(candidate)).toEqual(evaluatePilotFreezeGates(structuredClone(candidate)));
  });
});
