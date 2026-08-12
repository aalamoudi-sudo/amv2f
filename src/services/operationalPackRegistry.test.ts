import { describe, expect, it } from 'vitest';
import type { OperationalPackDefinition } from '../types/eventPackage';
import { operationalPackRegistry, resolveOperationalPacks } from './operationalPackRegistry';

function context(enabledPackIds: string[], registry: OperationalPackDefinition[] = operationalPackRegistry) {
  return {
    enabledPackIds,
    entityTypes: ['site', 'zone'] as const,
    roleIds: ['role-operator', 'role-decision-owner', 'role-approver'],
    authorityIds: ['authority-operational'],
    integrationProfileIds: ['integration-local-capture'],
    outputProfileIds: ['output-spatial-preview', 'output-projection-preview'],
    registry
  };
}

describe('operational pack dependency resolver', () => {
  it('orders a valid reusable pack combination by its dependencies', () => {
    const result = resolveOperationalPacks(context(['spatial-foundation', 'zone-readiness', 'decision-engine']));
    expect(result.valid).toBe(true);
    expect(result.orderedPacks.map((pack) => pack.packId)).toEqual(['spatial-foundation', 'zone-readiness', 'decision-engine']);
  });

  it('detects unknown packs, duplicates, and missing dependencies', () => {
    const result = resolveOperationalPacks(context(['zone-readiness', 'zone-readiness', 'unknown-pack']));
    expect(result.valid).toBe(false);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'duplicate-pack-activation',
      'missing-pack-dependency',
      'unknown-operational-pack'
    ]));
  });

  it('detects circular dependencies and incompatibilities', () => {
    const base = operationalPackRegistry.find((pack) => pack.packId === 'spatial-foundation')!;
    const circularA: OperationalPackDefinition = { ...structuredClone(base), packId: 'cycle-a', requiredPackIds: ['cycle-b'], incompatiblePackIds: [] };
    const circularB: OperationalPackDefinition = { ...structuredClone(base), packId: 'cycle-b', requiredPackIds: ['cycle-a'], incompatiblePackIds: ['cycle-a'] };
    const result = resolveOperationalPacks(context(['cycle-a', 'cycle-b'], [circularA, circularB]));
    expect(result.valid).toBe(false);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining(['pack-dependency-cycle', 'incompatible-operational-packs']));
  });

  it('detects missing roles, entities, integration profiles, output profiles, and unsupported versions', () => {
    const result = resolveOperationalPacks({
      ...context(['spatial-foundation', 'operational-capture', 'spatial-output']),
      configurationByPackId: { 'spatial-foundation': { packVersion: '9.0.0' } },
      entityTypes: [],
      roleIds: [],
      integrationProfileIds: [],
      outputProfileIds: []
    });
    expect(result.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'unsupported-pack-version',
      'missing-required-entity-type',
      'missing-required-role',
      'missing-required-integration-profile',
      'missing-required-output-profile'
    ]));
  });
});
