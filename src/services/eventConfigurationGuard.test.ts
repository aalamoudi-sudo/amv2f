import { describe, expect, it } from 'vitest';
import { referenceEventPackageGuardTerms } from '../data/referenceEventPackages';
import { EventPackageActivationController } from './eventPackageActivation';
import { validateEventPackage } from './eventPackageValidation';
import { createEventRuntimeConfiguration } from './eventRuntimeConfiguration';

describe('event-agnostic platform core guard', () => {
  it('keeps reference event names and instance IDs inside package data', () => {
    const genericCoreSource = [
      createEventRuntimeConfiguration,
      validateEventPackage,
      EventPackageActivationController
    ].map((implementation) => implementation.toString()).join('\n');
    for (const term of referenceEventPackageGuardTerms) {
      expect(genericCoreSource, `${term} leaked into generic core logic`).not.toContain(term);
    }
  });
});
