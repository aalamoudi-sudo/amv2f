import { describe, expect, it } from 'vitest';
import { scenarioDefinitions } from '../data/scenarios';
import { createIdleScenarioRuntime, createScenarioRuntime, getScenarioProgress } from './scenarioEngine';

describe('scenario engine helpers', () => {
  it('creates an idle Arabic runtime message', () => {
    expect(createIdleScenarioRuntime()).toMatchObject({
      scenarioId: null,
      playback: 'idle',
      messageAr: 'لا يوجد سيناريو نشط حالياً.'
    });
  });

  it('calculates scenario progress by current step', () => {
    const scenario = scenarioDefinitions[0]!;

    expect(getScenarioProgress(scenario, 0)).toBe(25);
    expect(getScenarioProgress(scenario, 3)).toBe(100);
  });

  it('starts a runtime from the first structured step', () => {
    const scenario = scenarioDefinitions[2]!;
    const runtime = createScenarioRuntime(scenario);

    expect(runtime.scenarioId).toBe('evacuation');
    expect(runtime.playback).toBe('playing');
    expect(runtime.messageAr).toContain('طوارئ');
    expect(runtime.highlightedEntityIds).toContain('ZONE-004');
  });
});
