export interface KagaRuntimeAsset {
  source: string;
  target: string;
}

export interface KagaSanitizedGeoJsonAsset extends KagaRuntimeAsset {
  kind: 'registered-gardens' | 'unresolved-crescent';
}

/**
 * Public assets reviewed for the KAGA executive runtime. The final build uses
 * this allowlist instead of copying the repository-wide public directory.
 */
export const kagaProductionRuntimeAssets: readonly KagaRuntimeAsset[] = [
  { source: 'kaga/assets', target: 'kaga/assets' },
  ...[
    'illustrated-land.webp',
    'illustrated-water.webp',
    'illustrated-paths.webp',
    'illustrated-vegetation.webp',
    'illustrated-architecture.webp',
    'illustrated-composite.webp',
  ].map((filename) => ({
    source: `kaga/illustrated-map/${filename}`,
    target: `kaga/illustrated-map/${filename}`,
  })),
  {
    source: 'kaga/spatial-registered-v1/executive-masterplan.svg',
    target: 'kaga/spatial-registered-v1/executive-masterplan.svg',
  },
  {
    source: 'kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf',
    target: 'kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf',
  },
] as const;

export const kagaProductionSanitizedGeoJsonAssets: readonly KagaSanitizedGeoJsonAsset[] = [
  {
    source: 'kaga/spatial-registered-v1/registered-gardens.geojson',
    target: 'kaga/spatial-registered-v1/registered-gardens.geojson',
    kind: 'registered-gardens',
  },
  {
    source: 'kaga/spatial-registered-v1/registered-crescent.geojson',
    target: 'kaga/spatial-registered-v1/registered-crescent.geojson',
    kind: 'unresolved-crescent',
  },
] as const;

export const kagaRequiredRuntimePaths = [
  'index.html',
  'kaga/illustrated-map/illustrated-composite.webp',
  'kaga/spatial-registered-v1/executive-masterplan.svg',
  'kaga/spatial-registered-v1/registered-gardens.geojson',
  'kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf',
] as const;

export const kagaForbiddenRuntimeSegments = [
  'specifications',
  'visual-direction',
  'reports',
  'tests',
  'docs',
  'spatial-v2',
] as const;

export const kagaForbiddenRuntimeFilenames = [
  'selected-layers.json',
  'source-linework.geojson',
  'spatial-metadata.json',
  'registered-spatial-metadata.json',
  'manifest.json',
  'registration.json',
] as const;

export const kagaForbiddenRuntimeExtensions = ['.3dm', '.ai', '.ts', '.tsx'] as const;

export const kagaForbiddenRuntimeMetadataKeys = [
  'sourceObjectIndex',
  'sourceLayer',
  'footprintId',
  'sourceRhinoSha256',
  'registrationMethod',
  'semanticEvidence',
] as const;

export function normalizeRuntimePath(path: string) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\//, '');
}

export function runtimePathViolation(path: string): string | undefined {
  const normalized = normalizeRuntimePath(path);
  const parts = normalized.split('/').filter(Boolean);
  const filename = parts.at(-1)?.toLowerCase() ?? '';
  const extension = filename.includes('.') ? `.${filename.split('.').at(-1)}` : '';

  const forbiddenSegment = parts.find((part) =>
    kagaForbiddenRuntimeSegments.includes(part.toLowerCase() as (typeof kagaForbiddenRuntimeSegments)[number]),
  );
  if (forbiddenSegment) return `forbidden path segment: ${forbiddenSegment}`;

  if (kagaForbiddenRuntimeFilenames.includes(filename as (typeof kagaForbiddenRuntimeFilenames)[number])) {
    return `forbidden filename: ${filename}`;
  }

  if (kagaForbiddenRuntimeExtensions.includes(extension as (typeof kagaForbiddenRuntimeExtensions)[number])) {
    return `forbidden extension: ${extension}`;
  }

  return undefined;
}

export function assertSafeKagaRuntimePaths(paths: readonly string[]) {
  const violations = paths
    .map((path) => ({ path: normalizeRuntimePath(path), reason: runtimePathViolation(path) }))
    .filter((entry): entry is { path: string; reason: string } => Boolean(entry.reason));

  if (violations.length > 0) {
    throw new Error(
      `Forbidden KAGA client runtime content:\n${violations
        .map(({ path, reason }) => `- ${path} (${reason})`)
        .join('\n')}`,
    );
  }
}
