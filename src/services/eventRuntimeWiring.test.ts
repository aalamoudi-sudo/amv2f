import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildEventPackageFromSpec,
  loadReferenceEventPackages
} from '../data/referenceEventPackages';
import { sportsTestSpec } from '../test/sportsEventPackage';
import { getScenarioPlayerPackConfiguration } from './scenarioPackValidation';
import { createInitialEventStoreState, selectRuntimeRoutes, useEventStore } from '../store/useEventStore';
import { validateEventPackage } from './eventPackageValidation';
import { getZoneRouteImpacts } from './zoneReadinessImpact';
import { createRuntimeIntegrationLabConfiguration } from './runtimeIntegrationLabConfiguration';
import { IntegrationLabEngine } from './integrationLabEngine';

async function validatedRuntime(index: number) {
  const packages = await loadReferenceEventPackages();
  const result = await validateEventPackage(packages[index]!);
  expect(result.valid, result.issues.map((currentIssue) => currentIssue.messageAr).join('\n')).toBe(true);
  return result.runtime!;
}

describe('authoritative universal event runtime wiring', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEventStore.setState(createInitialEventStoreState());
  });

  it('isolates decision creation, routes, scenarios, and projection by active event', async () => {
    const conference = await validatedRuntime(1);
    expect(useEventStore.getState().activateTemporaryEventRuntime(conference)).toBe(true);
    const state = useEventStore.getState();
    const target = Object.values(state.entities).find((entity) => entity.type === 'zone')!.id;
    const decisionId = state.createDecisionDraft({
      title: 'قرار مؤتمر محلي', description: 'اختبار نطاق المؤتمر.', decisionType: 'readiness',
      decisionOwner: 'مالك محلي', responsibleParty: 'منفذ محلي',
      relationships: [{ entityId: target, relationType: 'execution-target', impactLevel: 'medium', descriptionAr: 'هدف محلي.' }]
    });
    const decision = useEventStore.getState().decisions.find((candidate) => candidate.decisionId === decisionId)!;
    expect(decision.eventId).toBe(conference.identity.eventInstanceId);
    expect(decision.venueId).toBe(conference.identity.venueId);
    expect(useEventStore.getState().decisions.some((candidate) => candidate.eventId.includes('EXHIBITION'))).toBe(false);
    expect(selectRuntimeRoutes(useEventStore.getState()).map((route) => route.id)).toEqual(conference.routes.map((route) => route.id));
    const readiness = useEventStore.getState().zoneReadiness.find((record) => record.relatedRouteIds.length)!;
    expect(getZoneRouteImpacts(readiness, selectRuntimeRoutes(useEventStore.getState()))[0]?.route.id).toBe(readiness.relatedRouteIds[0]);

    const scenario = getScenarioPlayerPackConfiguration(conference.operationalPackConfiguration)!.scenarios[0]!;
    const baselineBefore = structuredClone(useEventStore.getState().baselineEntities);
    state.startScenario(scenario.id);
    expect(useEventStore.getState().scenarioRuntime.lastAppliedStepId).toBe(scenario.steps[0]!.id);
    expect(useEventStore.getState().baselineEntities).toEqual(baselineBefore);
    state.stopScenario();
    expect(useEventStore.getState().entities).toEqual(baselineBefore);
    expect(useEventStore.getState().projectionSettings.labelsVisible).toBe(conference.projectionProfiles[0]!.labelsVisible);
  });

  it('uses each active package route catalog for readiness impacts and visibility metrics', async () => {
    for (let index = 0; index < 3; index += 1) {
      const runtime = await validatedRuntime(index);
      expect(useEventStore.getState().activateTemporaryEventRuntime(runtime)).toBe(true);
      const state = useEventStore.getState();
      const routes = selectRuntimeRoutes(state);
      expect(routes.map((route) => route.id)).toEqual(runtime.routes.map((route) => route.id));
      expect(routes.filter((route) => state.routeVisibility[route.id]).length).toBe(
        runtime.routes.filter((route) => route.defaultVisible).length
      );
      runtime.readinessRecords.forEach((record) => {
        expect(getZoneRouteImpacts(record, routes).map((impact) => impact.route.id)).toEqual(record.relatedRouteIds);
      });
    }
  });

  it('restores the complete previous package session and clears all package state on global reset', async () => {
    const exhibition = await validatedRuntime(0);
    const festival = await validatedRuntime(2);
    const store = useEventStore.getState();
    store.activateTemporaryEventRuntime(exhibition);
    const exhibitionZone = exhibition.readinessRecords[0]!.zoneId;
    useEventStore.getState().updateZoneReadiness(exhibitionZone, { readiness: 73, changeReason: 'تعديل محلي قبل التبديل.' });
    const previousReadiness = useEventStore.getState().zoneReadiness.find((record) => record.zoneId === exhibitionZone)!.readiness;
    useEventStore.getState().activateTemporaryEventRuntime(festival);
    expect(useEventStore.getState().rollbackTemporaryEventRuntime()).toBe(true);
    expect(useEventStore.getState().activeRuntime?.identity.packageId).toBe(exhibition.identity.packageId);
    expect(useEventStore.getState().zoneReadiness.find((record) => record.zoneId === exhibitionZone)?.readiness).toBe(previousReadiness);
    expect(useEventStore.getState().decisions.every((decision) => decision.eventId === exhibition.identity.eventInstanceId)).toBe(true);

    useEventStore.getState().resetDemoData();
    expect(useEventStore.getState().activeRuntime).toBeNull();
    expect(useEventStore.getState().previousRuntimeSession).toBeNull();
    expect(Object.keys(useEventStore.getState().entities)).toContain('SITE-001');
    expect(Object.keys(useEventStore.getState().entities).some((id) => id.includes('EXH'))).toBe(false);
  });

  it('leaves the complete active runtime unchanged when activation health fails', async () => {
    const exhibition = await validatedRuntime(0);
    const festival = structuredClone(await validatedRuntime(2));
    useEventStore.getState().activateTemporaryEventRuntime(exhibition);
    const before = structuredClone({
      activeRuntime: useEventStore.getState().activeRuntime,
      entities: useEventStore.getState().entities,
      readiness: useEventStore.getState().zoneReadiness,
      decisions: useEventStore.getState().decisions,
      routes: selectRuntimeRoutes(useEventStore.getState()),
      projection: useEventStore.getState().projectionSettings
    });
    festival.decisions[0]!.eventId = 'EVENT-OTHER-SCOPE';
    expect(useEventStore.getState().activateTemporaryEventRuntime(festival)).toBe(false);
    expect({
      activeRuntime: useEventStore.getState().activeRuntime,
      entities: useEventStore.getState().entities,
      readiness: useEventStore.getState().zoneReadiness,
      decisions: useEventStore.getState().decisions,
      routes: selectRuntimeRoutes(useEventStore.getState()),
      projection: useEventStore.getState().projectionSettings
    }).toEqual(before);
  });

  it('rejects a dangling scenario at the store activation boundary', async () => {
    const exhibition = structuredClone(await validatedRuntime(0));
    exhibition.operationalPackConfiguration.configurationByPackId['scenario-player']!.scenarioPlayer!.scenarios[0]!.steps[0]!.focusEntityId = 'ZONE-UNKNOWN';
    expect(useEventStore.getState().activateTemporaryEventRuntime(exhibition)).toBe(false);
    expect(useEventStore.getState().activeRuntime).toBeNull();
    expect(useEventStore.getState().errorMessage).toContain('لا تطابق التهيئة القانونية');
  });

  it('wires each reference package into the existing integration engine without baseline writes', async () => {
    for (let index = 0; index < 3; index += 1) {
      const runtime = await validatedRuntime(index);
      const configuration = createRuntimeIntegrationLabConfiguration(runtime);
      expect(configuration?.eventId).toBe(runtime.identity.eventInstanceId);
      expect(configuration?.venueId).toBe(runtime.identity.venueId);
      expect(configuration?.runtimeContext?.roleIds).toEqual(runtime.roles.map((role) => role.roleId));
      expect(configuration?.runtimeContext?.projectionProfileId).toBe(runtime.projectionProfiles[0]?.projectionProfileId);
      expect(configuration?.physicalOutputProfile.physicalSceneId).toBe(runtime.physicalOutputProfiles[0]?.physicalOutputProfileId);
      const engine = await IntegrationLabEngine.create(configuration!);
      const snapshot = await engine.run('valid');
      expect(snapshot.events[0]?.subjects.eventRef).toBe(runtime.identity.eventInstanceId);
      expect(snapshot.events[0]?.subjects.venueId).toBe(runtime.identity.venueId);
      expect(snapshot.events[0]?.subjects.entityId).toBe(runtime.requirements[0]?.entityId);
      expect(snapshot.metrics.acceptedOperationalEvents).toBe(1);
    }
  });

  it('loads a fourth event type with offset geometry through package data only', async () => {
    const eventPackage = await buildEventPackageFromSpec(sportsTestSpec);
    const result = await validateEventPackage(eventPackage);
    expect(result.valid, result.issues.map((currentIssue) => currentIssue.messageAr).join('\n')).toBe(true);
    expect(useEventStore.getState().activateTemporaryEventRuntime(result.runtime!)).toBe(true);
    expect(useEventStore.getState().activeRuntime?.identity.eventType).toBe('sports-event-test');
    expect(selectRuntimeRoutes(useEventStore.getState()).map((route) => route.id)).toEqual(['ROUTE-SPRT-001']);
    const scenarioId = getScenarioPlayerPackConfiguration(result.runtime!.operationalPackConfiguration)!.defaultScenarioId;
    useEventStore.getState().startScenario(scenarioId);
    expect(useEventStore.getState().scenarioRuntime.scenarioId).toBe(scenarioId);
    expect(useEventStore.getState().selectedEntityId).toContain('SPRT');
  });

  it('blocks disabled package actions instead of presenting metadata as executable', async () => {
    const runtime = structuredClone(await validatedRuntime(0));
    runtime.enabledOperationalPacks = runtime.enabledOperationalPacks.filter((pack) =>
      pack.packId !== 'scenario-player'
      && pack.packId !== 'operational-capture'
      && pack.packId !== 'projection-preview'
    );
    runtime.operationalPackConfiguration.enabledPackIds = runtime.operationalPackConfiguration.enabledPackIds.filter((packId) =>
      packId !== 'scenario-player'
      && packId !== 'operational-capture'
      && packId !== 'projection-preview'
    );
    delete runtime.operationalPackConfiguration.configurationByPackId['scenario-player'];
    delete runtime.operationalPackConfiguration.configurationByPackId['operational-capture'];
    delete runtime.operationalPackConfiguration.configurationByPackId['projection-preview'];
    runtime.scenarioConfigurationCanonical = null;
    expect(useEventStore.getState().activateTemporaryEventRuntime(runtime)).toBe(true);
    const decisionBefore = structuredClone(useEventStore.getState().decisions[0]);
    const readinessBefore = useEventStore.getState().entities['ZONE-EXH-001']?.readiness;
    useEventStore.getState().startScenario('scenario-exhibition-readiness');
    expect(useEventStore.getState().scenarioRuntime.playback).toBe('idle');
    expect(useEventStore.getState().errorMessage).toContain('غير مفعّل');
    useEventStore.getState().enterProjectionMode();
    expect(useEventStore.getState().isProjectionMode).toBe(false);
    expect(createRuntimeIntegrationLabConfiguration(runtime)).toBeNull();

    runtime.enabledOperationalPacks = runtime.enabledOperationalPacks.filter((pack) => pack.packId !== 'decision-engine' && pack.packId !== 'zone-readiness');
    runtime.operationalPackConfiguration.enabledPackIds = runtime.operationalPackConfiguration.enabledPackIds.filter((packId) => packId !== 'decision-engine' && packId !== 'zone-readiness');
    delete runtime.operationalPackConfiguration.configurationByPackId['decision-engine'];
    delete runtime.operationalPackConfiguration.configurationByPackId['zone-readiness'];
    expect(useEventStore.getState().activateTemporaryEventRuntime(runtime)).toBe(true);
    useEventStore.getState().updateDecision(decisionBefore!.decisionId, { title: 'تعديل محجوب' });
    useEventStore.getState().updateEntityReadiness('ZONE-EXH-001', 5);
    expect(useEventStore.getState().decisions[0]).toEqual(decisionBefore);
    expect(useEventStore.getState().entities['ZONE-EXH-001']?.readiness).toBe(readinessBefore);
    expect(useEventStore.getState().errorMessage).toContain('غير مفعلة');
  });
});
