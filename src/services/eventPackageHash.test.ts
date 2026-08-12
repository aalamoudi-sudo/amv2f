import { describe, expect, it } from 'vitest';
import { loadReferenceEventPackages } from '../data/referenceEventPackages';
import { createEventPackageContentHash, isEventPackageContentHash, withEventPackageContentHash } from './eventPackageHash';

describe('content-addressed event package identity', () => {
  it('is deterministic and follows the legal EVENT-PACKAGE-v1 identity', async () => {
    const [eventPackage] = await loadReferenceEventPackages();
    const first = await createEventPackageContentHash(eventPackage!);
    const second = await createEventPackageContentHash(structuredClone(eventPackage!));
    expect(first).toBe(second);
    expect(first).toBe(eventPackage!.packageContentHash);
    expect(isEventPackageContentHash(first)).toBe(true);
  });

  it('changes when legal package content changes', async () => {
    const [eventPackage] = await loadReferenceEventPackages();
    const changed = structuredClone(eventPackage!);
    changed.eventInstance.eventNameAr = `${changed.eventInstance.eventNameAr} المعدلة`;
    expect(await createEventPackageContentHash(changed)).not.toBe(eventPackage!.packageContentHash);
  });

  it('ignores volatile preview timestamps but not governance fields', async () => {
    const [eventPackage] = await loadReferenceEventPackages();
    const previewChanged = structuredClone(eventPackage!);
    previewChanged.previewGeneratedAt = '2099-01-01T00:00:00.000Z';
    expect(await createEventPackageContentHash(previewChanged)).toBe(eventPackage!.packageContentHash);
    const governanceChanged = structuredClone(eventPackage!);
    governanceChanged.changeReason = 'تغيير قانوني في محتوى الحزمة.';
    const rehashed = await withEventPackageContentHash(governanceChanged);
    expect(rehashed.packageContentHash).not.toBe(eventPackage!.packageContentHash);

    const nestedConfigurationChanged = structuredClone(eventPackage!);
    (nestedConfigurationChanged.operationalPackConfiguration.configurationByPackId['spatial-foundation'] as unknown as Record<string, unknown>).previewGeneratedAt = '2099-01-01T00:00:00.000Z';
    expect(await createEventPackageContentHash(nestedConfigurationChanged)).not.toBe(eventPackage!.packageContentHash);
  });
});
