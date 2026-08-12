import { describe, expect, it } from 'vitest';
import { loadReferenceEventPackages } from '../data/referenceEventPackages';
import { validateCaptureEnvelopeIntegrity } from './integrationValidation';
import { withEventPackageContentHash } from './eventPackageHash';
import { validateEventPackage, validateEventPackageCollection } from './eventPackageValidation';

async function changedPackage(mutator: (eventPackage: Awaited<ReturnType<typeof loadReferenceEventPackages>>[number]) => void) {
  const [eventPackage] = await loadReferenceEventPackages();
  const candidate = structuredClone(eventPackage!);
  mutator(candidate);
  return withEventPackageContentHash(candidate);
}

describe('universal event package validation', () => {
  it('loads exhibition, conference, and festival through one contract and runtime boundary', async () => {
    const packages = await loadReferenceEventPackages();
    expect(packages.map((eventPackage) => eventPackage.eventType)).toEqual(['exhibition', 'conference', 'festival']);
    for (const eventPackage of packages) {
      const result = await validateEventPackage(eventPackage);
      expect(result.valid, result.issues.map((currentIssue) => `${currentIssue.code}: ${currentIssue.messageAr}`).join('\n')).toBe(true);
      expect(result.runtime?.scopeKey).toBe(`${eventPackage.eventInstance.eventInstanceId}::${eventPackage.eventInstance.venueId}::temporary-demo`);
      expect(result.runtime?.identity.stateContext).toBe('temporary-demo');
      expect(Object.keys(result.runtime?.entities ?? {})).toHaveLength(eventPackage.spatialConfiguration.entities.length);
    }
  });

  it('passes each fictional capture fixture through the existing Stage 3D integrity validator', async () => {
    const packages = await loadReferenceEventPackages();
    for (const eventPackage of packages) {
      const capture = eventPackage.temporaryDemoSeedData.captureFixtures[0]!.record;
      expect(await validateCaptureEnvelopeIntegrity(capture)).toEqual([]);
    }
  });

  it('rejects an invalid template-instance link and unknown venue', async () => {
    const candidate = await changedPackage((eventPackage) => {
      eventPackage.eventInstance.eventTemplateId = 'EVENT-TEMPLATE-UNKNOWN';
      eventPackage.eventInstance.venueId = 'VENUE-UNKNOWN';
    });
    const result = await validateEventPackage(candidate);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['invalid-event-instance-template', 'unknown-venue']));
  });

  it('rejects malformed event dates and incomplete package approval provenance', async () => {
    const candidate = await changedPackage((eventPackage) => {
      eventPackage.eventInstance.startAt = 'not-a-valid-time';
      eventPackage.approvalStatus = 'approved';
      eventPackage.approvedBy = null;
      eventPackage.approvedAt = null;
    });
    const result = await validateEventPackage(candidate);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'invalid-event-instance-dates',
      'invalid-package-approval'
    ]));
  });

  it('rejects duplicate entities and unknown spatial, route, readiness, decision, and requirement references', async () => {
    const candidate = await changedPackage((eventPackage) => {
      eventPackage.spatialConfiguration.entities.push(structuredClone(eventPackage.spatialConfiguration.entities[0]!));
      eventPackage.routeConfiguration.routes[0]!.relatedEntityIds.push('ZONE-UNKNOWN');
      eventPackage.requirementConfiguration[0]!.entityId = 'ZONE-UNKNOWN';
      eventPackage.temporaryDemoSeedData.readinessRecords[0]!.record.zoneId = 'ZONE-UNKNOWN';
      eventPackage.temporaryDemoSeedData.decisionRecords[0]!.record.relationships[0]!.entityId = 'ZONE-UNKNOWN';
      eventPackage.spatialConfiguration.modelReferences[0]!.entityNodeMap['ZONE-UNKNOWN'] = 'UnknownNode';
      eventPackage.eventTemplate.supportedSpatialEntityTypes = eventPackage.eventTemplate.supportedSpatialEntityTypes.filter((entityType) => entityType !== 'hall');
    });
    const result = await validateEventPackage(candidate);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'duplicate-entity-id',
      'unknown-route-entity',
      'unknown-requirement-entity',
      'readiness-unknown-zone',
      'decision-unknown-entity',
      'model-unknown-entity-reference',
      'entity-type-not-supported-by-template'
    ]));
  });

  it('rejects cross-event, cross-context, and baseline seed records', async () => {
    const crossEvent = await changedPackage((eventPackage) => {
      eventPackage.temporaryDemoSeedData.decisionRecords[0]!.record.eventId = 'EVENT-OTHER';
    });
    const crossEventResult = await validateEventPackage(crossEvent);
    expect(crossEventResult.issues.map((currentIssue) => currentIssue.code)).toContain('cross-event-relationship');

    const invalidWrapper = structuredClone(crossEvent);
    invalidWrapper.temporaryDemoSeedData.decisionRecords[0]!.record.stateContext = 'baseline';
    invalidWrapper.temporaryDemoSeedData.decisionRecords[0]!.stateContext = 'baseline' as 'temporary-demo';
    const wrapperResult = await validateEventPackage(await withEventPackageContentHash(invalidWrapper));
    expect(wrapperResult.schemaValid).toBe(false);
    expect(wrapperResult.issues.map((currentIssue) => currentIssue.code)).toContain('event-package-schema-invalid');
  });

  it('rejects missing roles, invalid authority rules, unknown integration profiles, and output profiles', async () => {
    const candidate = await changedPackage((eventPackage) => {
      eventPackage.roleConfiguration = eventPackage.roleConfiguration.filter((role) => role.roleId !== 'role-approver');
      eventPackage.authorityConfiguration[0]!.separationOfDutyRules[0]!.prohibitedCounterpartyRoleId = 'role-decision-owner';
      eventPackage.integrationProfileConfiguration[0]!.adapterType = 'spatial-3d';
      eventPackage.integrationProfileConfiguration[0]!.outputProfileId = 'output-unknown';
    });
    const result = await validateEventPackage(candidate);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'missing-required-role',
      'invalid-authority-rule',
      'invalid-integration-profile',
      'unknown-output-profile'
    ]));
  });

  it('does not satisfy an operational-pack dependency with a disabled integration profile', async () => {
    const candidate = await changedPackage((eventPackage) => {
      eventPackage.integrationProfileConfiguration[0]!.enabled = false;
    });
    const result = await validateEventPackage(candidate);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toContain('missing-required-integration-profile');
  });

  it('never throws and blocks adversarial nested package shapes with structured Arabic issues', async () => {
    const [base] = await loadReferenceEventPackages();
    const candidates: unknown[] = [
      null,
      {},
      { ...structuredClone(base!), spatialConfiguration: null },
      { ...structuredClone(base!), requirementConfiguration: [null] },
      { ...structuredClone(base!), temporaryDemoSeedData: { readinessRecords: 'wrong', decisionRecords: [], captureFixtures: [] } }
    ];
    const emptyModel = structuredClone(base!) as unknown as Record<string, unknown>;
    ((emptyModel.spatialConfiguration as Record<string, unknown>).modelReferences as unknown[]) = [{}];
    candidates.push(emptyModel);
    const missingNodeMap = structuredClone(base!) as unknown as Record<string, unknown>;
    delete (((missingNodeMap.spatialConfiguration as Record<string, unknown>).modelReferences as Array<Record<string, unknown>>)[0]!).entityNodeMap;
    candidates.push(missingNodeMap);
    const malformedSeed = structuredClone(base!) as unknown as Record<string, unknown>;
    (((malformedSeed.temporaryDemoSeedData as Record<string, unknown>).decisionRecords as Array<Record<string, unknown>>)[0]!).record = { decisionId: 'DECISION-INCOMPLETE' };
    candidates.push(malformedSeed);

    for (const candidate of candidates) {
      const result = await validateEventPackage(candidate);
      expect(result.valid).toBe(false);
      expect(result.runtime).toBeNull();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.every((currentIssue) => currentIssue.messageAr.trim().length > 0)).toBe(true);
    }
  });

  it('rejects dangling package scenarios, unknown output profiles, and unsupported pack configuration fields', async () => {
    const scenarioCandidate = await changedPackage((eventPackage) => {
      const scenario = eventPackage.operationalPackConfiguration.configurationByPackId['scenario-player']!.scenarioPlayer!.scenarios[0]!;
      scenario.steps[0]!.focusEntityId = 'ZONE-UNKNOWN';
      scenario.steps[0]!.showRoutes = ['ROUTE-UNKNOWN'];
    });
    const scenarioResult = await validateEventPackage(scenarioCandidate);
    expect(scenarioResult.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'scenario-unknown-entity',
      'scenario-unknown-route'
    ]));

    const outputCandidate = await changedPackage((eventPackage) => {
      eventPackage.integrationProfileConfiguration[0]!.outputProfileId = 'output-profile-unknown';
    });
    expect((await validateEventPackage(outputCandidate)).issues.map((currentIssue) => currentIssue.code)).toContain('unknown-output-profile');

    const unsupportedConfiguration = structuredClone(scenarioCandidate) as unknown as Record<string, unknown>;
    const configuration = ((unsupportedConfiguration.operationalPackConfiguration as Record<string, unknown>).configurationByPackId as Record<string, Record<string, unknown>>)['spatial-foundation']!;
    configuration.unsupportedRuntimeShape = true;
    const unsupportedResult = await validateEventPackage(unsupportedConfiguration);
    expect(unsupportedResult.schemaValid).toBe(false);
    expect(unsupportedResult.issues[0]?.messageAr).toContain('بنية الحزمة');
  });

  it('rejects duplicate package IDs in an import collection', async () => {
    const [eventPackage] = await loadReferenceEventPackages();
    const results = await validateEventPackageCollection([eventPackage!, structuredClone(eventPackage!)]);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('duplicate-package-id');
    expect(results.get(1)?.valid).toBe(false);
  });
});
