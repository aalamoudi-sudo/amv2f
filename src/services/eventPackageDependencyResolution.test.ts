import { describe, expect, it } from 'vitest';
import { loadReferenceEventPackages } from '../data/referenceEventPackages';
import { withEventPackageContentHash } from './eventPackageHash';
import { eventPackageVersionSatisfies } from './eventPackageDependencyResolution';
import { validateEventPackage, validateEventPackageCollection } from './eventPackageValidation';

describe('event package dependency resolution', () => {
  it('blocks missing, self, duplicate, unsupported, and incompatible dependencies', async () => {
    const [base] = await loadReferenceEventPackages();
    const missing = structuredClone(base!);
    missing.dependencies = [{ packageId: 'EVENT-PACKAGE-MISSING', versionRange: '^1.0.0' }];
    const missingResult = await validateEventPackage(await withEventPackageContentHash(missing));
    expect(missingResult.issues.map((currentIssue) => currentIssue.code)).toContain('missing-package-dependency');

    const invalid = structuredClone(base!);
    invalid.dependencies = [
      { packageId: invalid.packageId, versionRange: '1.0.0' },
      { packageId: 'EVENT-PACKAGE-MISSING', versionRange: '>=1' },
      { packageId: 'EVENT-PACKAGE-MISSING', versionRange: '>=1' }
    ];
    const invalidResult = await validateEventPackage(await withEventPackageContentHash(invalid));
    expect(invalidResult.issues.map((currentIssue) => currentIssue.code)).toEqual(expect.arrayContaining([
      'package-self-dependency',
      'unsupported-package-version-range',
      'duplicate-package-dependency'
    ]));
  });

  it('resolves exact and compatible ranges and detects collection cycles', async () => {
    const [firstBase, secondBase] = await loadReferenceEventPackages();
    const first = structuredClone(firstBase!);
    const second = structuredClone(secondBase!);
    first.dependencies = [{ packageId: second.packageId, versionRange: '^1.0.0' }];
    second.dependencies = [{ packageId: first.packageId, versionRange: '~1.0.0' }];
    const results = await validateEventPackageCollection([
      await withEventPackageContentHash(first),
      await withEventPackageContentHash(second)
    ]);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('package-dependency-cycle');
    expect(results.get(1)?.valid).toBe(false);
  });

  it('applies deterministic semver-compatible exact, tilde, and caret boundaries', () => {
    expect(eventPackageVersionSatisfies('1.2.4', '1.2.4')).toBe(true);
    expect(eventPackageVersionSatisfies('1.2.5', '1.2.4')).toBe(false);
    expect(eventPackageVersionSatisfies('1.2.9', '~1.2.4')).toBe(true);
    expect(eventPackageVersionSatisfies('1.3.0', '~1.2.4')).toBe(false);
    expect(eventPackageVersionSatisfies('1.9.0', '^1.2.4')).toBe(true);
    expect(eventPackageVersionSatisfies('2.0.0', '^1.2.4')).toBe(false);
    expect(eventPackageVersionSatisfies('0.2.9', '^0.2.4')).toBe(true);
    expect(eventPackageVersionSatisfies('0.3.0', '^0.2.4')).toBe(false);
    expect(eventPackageVersionSatisfies('0.0.4', '^0.0.4')).toBe(true);
    expect(eventPackageVersionSatisfies('0.0.5', '^0.0.4')).toBe(false);
  });
});
