import { describe, expect, it } from 'vitest';
import { createFictionalPilotSourceBundle } from '../data/pilotAuthoringFixture';
import { validateEventPackage } from './eventPackageValidation';
import { compilePilotPackageDraft, createPilotPackageDraft, validatePilotPackageDraft } from './pilotPackageCompiler';
import { freezePilotPackage } from './pilotPackageFreeze';
import { validatePilotIdGovernance } from './pilotIdGovernance';
import { validatePilotSourceBundle } from './pilotSourceBundleValidation';

async function fixture() {
  return createFictionalPilotSourceBundle();
}

describe('Stage 3E.2 pilot authoring contracts', () => {
  it('validates a complete fictional PilotSourceBundle without claiming real data', async () => {
    const bundle = await fixture();
    const result = validatePilotSourceBundle(bundle);
    expect(result.valid, result.issues.map((current) => current.messageAr).join('\n')).toBe(true);
    expect(result.bundle?.sourceType).toBe('fictional-example');
  });

  it('keeps incomplete input in a draft instead of casting it to EventPackage', () => {
    const draft = validatePilotPackageDraft(createPilotPackageDraft({ eventNameAr: 'مسودة ناقصة' }));
    expect(draft.fieldStates.eventId).toBe('missing');
    expect(draft.fieldStates.eventNameAr).toBe('complete');
    expect(draft.issues.some((current) => current.code === 'pilot-schema-invalid')).toBe(true);
  });

  it('classifies unapproved, conflicting, and ready-to-freeze draft fields explicitly', async () => {
    const unapproved = await fixture();
    unapproved.approvalStatus = 'draft';
    expect(validatePilotPackageDraft(createPilotPackageDraft(unapproved)).fieldStates.approvalStatus).toBe('unapproved');

    const conflicting = await fixture();
    conflicting.decisionRecords[0]!.eventId = 'EVENT-OTHER-001';
    expect(validatePilotPackageDraft(createPilotPackageDraft(conflicting)).fieldStates.decisionRecords).toBe('conflicting');

    const complete = validatePilotPackageDraft(createPilotPackageDraft(await fixture()));
    expect(Object.values(complete.fieldStates).every((state) => state === 'ready-to-freeze')).toBe(true);
  });

  it('rejects duplicate stable IDs', async () => {
    const bundle = await fixture();
    bundle.entities.push(structuredClone(bundle.entities[1]!));
    const result = validatePilotIdGovernance(bundle);
    expect(result.valid).toBe(false);
    expect(result.duplicateCount).toBeGreaterThan(0);
  });

  it('rejects dangling parent, route, and decision relationships', async () => {
    const bundle = await fixture();
    bundle.entities[1]!.parentId = 'SITE-UNKNOWN';
    bundle.routes[0]!.relatedEntityIds.push('ZONE-UNKNOWN');
    bundle.decisionRecords[0]!.relationships[0]!.entityId = 'ZONE-UNKNOWN';
    const result = validatePilotIdGovernance(bundle);
    expect(result.issues.map((current) => current.code)).toEqual(expect.arrayContaining([
      'pilot-dangling-parent',
      'pilot-dangling-route-reference',
      'pilot-dangling-decision-relation'
    ]));
  });

  it('rejects cross-event decision records', async () => {
    const bundle = await fixture();
    bundle.decisionRecords[0]!.eventId = 'EVENT-OTHER-001';
    const result = validatePilotSourceBundle(bundle);
    expect(result.issues.map((current) => current.code)).toContain('pilot-decision-scope-mismatch');
  });

  it('rejects readiness without owner, source, or timestamp', async () => {
    const bundle = await fixture();
    bundle.readinessRecords[0]!.owner = '';
    bundle.readinessRecords[0]!.source = '';
    bundle.readinessRecords[0]!.updatedAt = 'unknown';
    const codes = validatePilotSourceBundle(bundle).issues.map((current) => current.code);
    expect(codes).toEqual(expect.arrayContaining(['pilot-readiness-owner-missing', 'pilot-readiness-source-missing', 'pilot-readiness-updated-at-missing']));
  });

  it('rejects a route without geometry source or authority', async () => {
    const bundle = await fixture();
    bundle.routes[0]!.geometrySource = '';
    bundle.routes[0]!.authority = '';
    const codes = validatePilotSourceBundle(bundle).issues.map((current) => current.code);
    expect(codes).toEqual(expect.arrayContaining(['pilot-route-source-missing', 'pilot-route-authority-missing']));
  });

  it('rejects invalid entity and route geometry', async () => {
    const bundle = await fixture();
    bundle.entities[0]!.scale = [0, 1, 1];
    bundle.routes[0]!.points = [[0, 0, 0]];
    const codes = validatePilotSourceBundle(bundle).issues.map((current) => current.code);
    expect(codes).toEqual(expect.arrayContaining(['pilot-invalid-entity-geometry', 'pilot-invalid-route-geometry']));
  });

  it('rejects self-approval role conflicts', async () => {
    const bundle = await fixture();
    const rule = bundle.authorities[0]!.separationOfDutyRules[0]!;
    rule.prohibitedCounterpartyRoleId = rule.actorRoleId;
    expect(validatePilotSourceBundle(bundle).issues.map((current) => current.code)).toContain('pilot-separation-of-duty-invalid');
  });

  it('rejects a decision whose declared authority equals its owner', async () => {
    const bundle = await fixture();
    bundle.decisionRecords[0]!.approvingAuthority = bundle.decisionRecords[0]!.decisionOwner;
    expect(validatePilotSourceBundle(bundle).issues.map((current) => current.code)).toContain('pilot-decision-self-approval-conflict');
  });

  it('requires explicit readiness and decision coverage for every entity', async () => {
    const bundle = await fixture();
    bundle.entityOperationalCoverage.shift();
    expect(validatePilotSourceBundle(bundle).issues.map((current) => current.code)).toContain('pilot-entity-coverage-missing');
  });

  it('compiles deterministically and excludes preview timestamps from package identity', async () => {
    const bundle = await fixture();
    const draft = createPilotPackageDraft(bundle, '2026-07-13T08:00:00.000Z');
    const first = await compilePilotPackageDraft(draft, '2026-07-13T08:10:00.000Z');
    const second = await compilePilotPackageDraft(draft, '2026-07-13T09:10:00.000Z');
    expect(first.success, first.issues.map((current) => current.messageAr).join('\n')).toBe(true);
    expect(first.eventPackage?.packageContentHash).toBe(second.eventPackage?.packageContentHash);
    expect(first.sourceBundleHash).toBe(second.sourceBundleHash);
  });

  it('changes package and source hashes after a legal revision', async () => {
    const firstBundle = await fixture();
    const secondBundle = structuredClone(firstBundle);
    secondBundle.revision = 2;
    secondBundle.changeReason = 'مراجعة خيالية ثانية موثقة.';
    const first = await compilePilotPackageDraft(createPilotPackageDraft(firstBundle));
    const second = await compilePilotPackageDraft(createPilotPackageDraft(secondBundle));
    expect(first.eventPackage?.packageContentHash).not.toBe(second.eventPackage?.packageContentHash);
    expect(first.sourceBundleHash).not.toBe(second.sourceBundleHash);
  });

  it('freezes an immutable local artifact and keeps prior revision IDs protected', async () => {
    const bundle = await fixture();
    const compilation = await compilePilotPackageDraft(createPilotPackageDraft(bundle));
    const frozen = await freezePilotPackage(bundle, compilation, 'منسق خيالي', '2026-07-13T10:00:00.000Z');
    expect(frozen.success).toBe(true);
    expect(Object.isFrozen(frozen.artifact)).toBe(true);
    expect(() => { frozen.artifact!.eventPackage.titleAr = 'تعديل محظور'; }).toThrow();
    const changed = structuredClone(bundle);
    changed.entities.shift();
    expect(validatePilotIdGovernance(changed, frozen.artifact).issues.map((current) => current.code)).toContain('pilot-frozen-id-changed');
  });

  it('refuses to freeze a source bundle that differs from the compiled source hash', async () => {
    const bundle = await fixture();
    const compilation = await compilePilotPackageDraft(createPilotPackageDraft(bundle));
    const changed = structuredClone(bundle);
    changed.changeReason = 'تغيير قانوني لم يمر بإعادة الترجمة.';
    const frozen = await freezePilotPackage(changed, compilation);
    expect(frozen.success).toBe(false);
    expect(frozen.issues.map((current) => current.code)).toContain('pilot-freeze-source-hash-mismatch');
  });

  it('rejects missing integration governance metadata', async () => {
    const bundle = await fixture();
    bundle.integrationCandidates[0]!.owner = '';
    bundle.integrationCandidates[0]!.evidencePolicy = '';
    expect(validatePilotSourceBundle(bundle).issues.map((current) => current.code)).toContain('pilot-integration-metadata-missing');
  });

  it('rejects secret fields and values without exposing them', async () => {
    const bundle = await fixture() as unknown as Record<string, unknown>;
    bundle.accessToken = 'Bearer hidden-sensitive-value';
    const result = validatePilotSourceBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.issues.map((current) => current.code)).toEqual(expect.arrayContaining(['pilot-secret-field-rejected', 'pilot-secret-value-rejected']));
    expect(JSON.stringify(result.issues)).not.toContain('hidden-sensitive-value');
  });

  it('never throws for malformed JSON-serializable source inputs', () => {
    const malformedValues = [null, [], {}, { entities: null }, { entities: [null] }, 'pilot', 42, true];
    malformedValues.forEach((value) => expect(() => validatePilotSourceBundle(value)).not.toThrow());
  });

  it('keeps compiler failures structured and never throws', async () => {
    const draft = createPilotPackageDraft({ entities: [null] as never });
    const result = await compilePilotPackageDraft(draft);
    expect(result.success).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('produces an EventPackage accepted by the frozen Stage 3E validator', async () => {
    const compilation = await compilePilotPackageDraft(createPilotPackageDraft(await fixture()));
    expect(compilation.success).toBe(true);
    const validation = await validateEventPackage(compilation.eventPackage);
    expect(validation.valid, validation.issues.map((current) => current.messageAr).join('\n')).toBe(true);
  });
});
