import { describe, expect, it } from 'vitest';
import pack from '../../pilot-input/manifests/kap-operational-readiness-pack-candidate-v1.json';
import sources from '../../pilot-input/manifests/kap-readiness-source-traces-v1.json';
import authorities from '../../pilot-input/manifests/kap-readiness-authority-matrix-v1.json';
import gaps from '../../pilot-input/manifests/kap-readiness-gap-register-v1.json';
import evidence from '../../pilot-input/manifests/kap-readiness-evidence-contract-v1.json';
import { validateReadinessPackManifest } from './operationalReadinessPackSchema';

describe('Operational readiness pack JSON Schema Draft 2020-12', () => {
  it.each([
    ['operational-readiness-pack', pack],
    ['source-trace-register', sources],
    ['authority-matrix', authorities],
    ['gap-register', gaps],
    ['evidence-contract', evidence]
  ] as const)('validates the committed %s manifest', (kind, manifest) => {
    expect(validateReadinessPackManifest(kind, manifest)).toEqual({
      valid: true,
      errors: []
    });
  });

  it('rejects a candidate with an invalid source hash', () => {
    const invalid = structuredClone(pack);
    invalid.sourceRegistry[0]!.observedSha256 = 'not-a-hash';
    const result = validateReadinessPackManifest('operational-readiness-pack', invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.instancePath.includes('observedSha256'))).toBe(true);
  });

  it('rejects candidate data that claims a committed raw binary', () => {
    const invalid = structuredClone(sources);
    invalid.sources[0]!.committedBinary = true;
    expect(validateReadinessPackManifest('source-trace-register', invalid).valid).toBe(false);
  });
});
