import { referenceAdapterManifests } from '../data/integrationFixtures';
import type { IntegrationProfileDefinition } from '../types/eventPackage';
import type { AdapterManifest } from '../types/integration';

export function isEnabledInputIntegrationProfile(profile: IntegrationProfileDefinition): boolean {
  return profile.enabled && (profile.direction === 'input' || profile.direction === 'bidirectional');
}

export function findExecutableInputAdapterManifest(
  profile: IntegrationProfileDefinition
): AdapterManifest | null {
  if (!isEnabledInputIntegrationProfile(profile)) return null;
  return referenceAdapterManifests.find((manifest) =>
    manifest.inputOrOutput === 'input'
    && manifest.adapterId === profile.adapterId
    && manifest.version === profile.adapterVersion
    && manifest.adapterType === profile.adapterType
    && profile.requiredSchemaVersions.every((schemaVersion) => manifest.supportedSchemaVersions.includes(schemaVersion))
  ) ?? null;
}
