import type { EventPackage } from '../types/eventPackage';
import { eventPackageIdentityVersion } from '../types/eventPackage';
import { sha256Payload } from './integrationHash';

export function canonicalEventPackageContent(eventPackage: EventPackage): unknown {
  const content = structuredClone(eventPackage) as Partial<EventPackage>;
  delete content.packageContentHash;
  delete content.previewGeneratedAt;
  return content;
}

export async function createEventPackageContentHash(eventPackage: EventPackage): Promise<string> {
  const hash = await sha256Payload(canonicalEventPackageContent(eventPackage));
  return `EVENT-PACKAGE-${eventPackageIdentityVersion}-${hash}`;
}

export function isEventPackageContentHash(value: unknown): value is string {
  return typeof value === 'string' && /^EVENT-PACKAGE-v1-[a-f0-9]{64}$/i.test(value);
}

export async function withEventPackageContentHash(eventPackage: EventPackage): Promise<EventPackage> {
  const candidate = structuredClone(eventPackage);
  candidate.packageContentHash = await createEventPackageContentHash(candidate);
  return candidate;
}
