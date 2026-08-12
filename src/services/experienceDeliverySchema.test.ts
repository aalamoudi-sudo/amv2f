import { describe, expect, it } from 'vitest';
import operationalTemplate from '../../pilot-input/manifests/kap-operational-delivery-manifest-template-v1.json';
import studioTemplate from '../../pilot-input/manifests/kap-studio-3d-delivery-manifest-template-v1.json';
import {
  fictionalDeliveryValidationContext,
  fictionalOperationalDeliveryManifest,
  fictionalStudioDeliveryManifest
} from '../data/experienceDeliveryAcceleratorFixtures';
import { validateExperienceDeliverySchema } from './experienceDeliverySchema';
import { validateOperationalDeliveryManifestSafe, validateStudio3DDeliveryManifestSafe } from './experienceDeliveryIntake';

describe('EX.1F delivery executable schemas', () => {
  it('accepts structurally complete operational and studio manifests', () => {
    expect(validateExperienceDeliverySchema('operational-delivery-manifest', fictionalOperationalDeliveryManifest).valid).toBe(true);
    expect(validateExperienceDeliverySchema('studio-3d-delivery-manifest', fictionalStudioDeliveryManifest).valid).toBe(true);
  });

  it('rejects unknown properties and malformed shapes', () => {
    expect(validateExperienceDeliverySchema('operational-delivery-manifest', { ...fictionalOperationalDeliveryManifest, privatePath: '/tmp/private' }).valid).toBe(false);
    expect(validateExperienceDeliverySchema('studio-3d-delivery-manifest', { ...fictionalStudioDeliveryManifest, projectId: 1 }).valid).toBe(false);
    expect(validateExperienceDeliverySchema('studio-3d-delivery-manifest', {
      ...fictionalStudioDeliveryManifest,
      sourceInventory: { ...fictionalStudioDeliveryManifest.sourceInventory, privatePath: '/tmp/private' }
    }).valid).toBe(false);
    expect(validateExperienceDeliverySchema('studio-3d-delivery-manifest', { ...fictionalStudioDeliveryManifest, format: 'invented-native-format' }).valid).toBe(false);
  });

  it('never throws for arbitrary input and returns safe Arabic operator output', () => {
    for (const value of [null, [], {}, 'bad', 99]) {
      expect(() => validateOperationalDeliveryManifestSafe(value, fictionalDeliveryValidationContext)).not.toThrow();
      expect(validateOperationalDeliveryManifestSafe(value, fictionalDeliveryValidationContext)).toMatchObject({ valid: false, blocking: true, validatorVersion: 'EXPERIENCE-DELIVERY-VALIDATOR-v1' });
      expect(() => validateStudio3DDeliveryManifestSafe(value, fictionalDeliveryValidationContext)).not.toThrow();
    }
  });

  it('keeps the real KAP templates missing and blocked', () => {
    const kapContext = {
      projectId: operationalTemplate.projectId,
      eventId: operationalTemplate.eventId,
      venueId: operationalTemplate.venueId,
      knownDayIds: new Set<string>(), knownPersonaIds: new Set<string>(), knownDestinationIds: new Set<string>()
    };
    expect(validateOperationalDeliveryManifestSafe(operationalTemplate, kapContext)).toMatchObject({ valid: false, status: 'missing' });
    expect(validateStudio3DDeliveryManifestSafe(studioTemplate, kapContext)).toMatchObject({ valid: false, status: 'missing' });
  });

  it('blocks a file changed after fingerprinting and inventory disagreement', () => {
    const changed = structuredClone(fictionalOperationalDeliveryManifest);
    changed.sourceInventory!.fingerprintState = 'changed-after-fingerprint';
    changed.sourceInventory!.sha256 = 'f'.repeat(64);
    const result = validateOperationalDeliveryManifestSafe(changed, fictionalDeliveryValidationContext);
    expect(result.valid).toBe(false);
    expect(result.errors.map((candidate) => candidate.code)).toEqual(expect.arrayContaining(['experience-delivery-fingerprint-unverified', 'experience-delivery-inventory-fingerprint-mismatch']));
  });
});
