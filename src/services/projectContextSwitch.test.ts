import { describe, expect, it, vi } from 'vitest';
import { kapProjectId, projectRegistry } from '../data/projectRegistry';
import { resolveProjectConfiguration } from './projectRuntimeResolver';
import { projectSwitchStepValues, switchProjectContext } from './projectContextSwitch';

describe('atomic project switching', () => {
  it('runs the required transition in order and commits only at the end', async () => {
    const calls: string[] = [];
    const result = await switchProjectContext({ projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', force: false }, {
      validate: () => true,
      hasUnsavedWork: () => false,
      stopStreams: () => { calls.push('stop'); return Promise.resolve(); },
      clearProjectScope: () => calls.push('clear'),
      resolveConfiguration: () => { calls.push('resolve'); return resolveProjectConfiguration(projectRegistry, kapProjectId, 'EVENT-KAP-OPENING-2026'); },
      activateRuntime: () => { calls.push('runtime'); },
      activateTheme: () => calls.push('theme'),
      updateUrl: () => calls.push('url'),
      commit: () => calls.push('commit'),
      onStep: (step) => calls.push(step)
    });
    expect(result.status).toBe('switched');
    expect(calls.filter((call) => projectSwitchStepValues.includes(call as (typeof projectSwitchStepValues)[number]))).toEqual(projectSwitchStepValues);
    expect(calls.at(-1)).toBe('commit');
    expect(calls.indexOf('clear')).toBeLessThan(calls.indexOf('resolve'));
    expect(calls.indexOf('theme')).toBeLessThan(calls.indexOf('url'));
  });

  it('cancels before streams or state are touched when unsaved work exists', async () => {
    const stopStreams = vi.fn(() => Promise.resolve());
    const clearProjectScope = vi.fn();
    const result = await switchProjectContext({ projectId: kapProjectId, eventId: null, force: false }, {
      validate: () => true,
      hasUnsavedWork: () => true,
      stopStreams,
      clearProjectScope,
      resolveConfiguration: () => resolveProjectConfiguration(projectRegistry, kapProjectId, null),
      activateRuntime: vi.fn(), activateTheme: vi.fn(), updateUrl: vi.fn(), commit: vi.fn()
    });
    expect(result.status).toBe('requires-confirmation');
    expect(stopStreams).not.toHaveBeenCalled();
    expect(clearProjectScope).not.toHaveBeenCalled();
  });

  it('ends in a cleared neutral state when configuration resolution fails', async () => {
    const clearProjectScope = vi.fn();
    const commit = vi.fn();
    const result = await switchProjectContext({ projectId: kapProjectId, eventId: null, force: true }, {
      validate: () => true, hasUnsavedWork: () => false, stopStreams: () => Promise.resolve(), clearProjectScope,
      resolveConfiguration: () => Promise.reject(new Error('failed')), activateRuntime: vi.fn(), activateTheme: vi.fn(), updateUrl: vi.fn(), commit
    });
    expect(result.status).toBe('rejected');
    expect(clearProjectScope).toHaveBeenCalledTimes(2);
    expect(commit).not.toHaveBeenCalled();
  });
});
