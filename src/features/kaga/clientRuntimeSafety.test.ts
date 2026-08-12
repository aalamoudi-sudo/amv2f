import { describe, expect, it } from 'vitest';
import {
  assertSafeKagaRuntimePaths,
  kagaForbiddenRuntimeMetadataKeys,
  kagaProductionRuntimeAssets,
  kagaProductionSanitizedGeoJsonAssets,
  runtimePathViolation,
} from '../../../scripts/kaga-final/client-runtime-manifest';

describe('KAGA client runtime allowlist', () => {
  it('copies only the reviewed production public resources', () => {
    const sources = kagaProductionRuntimeAssets.map(({ source }) => source);
    expect(sources).toContain('kaga/assets');
    expect(sources).toContain('kaga/illustrated-map/illustrated-composite.webp');
    expect(sources).toContain('kaga/spatial-registered-v1/executive-masterplan.svg');
    expect(sources).toContain('kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf');
    expect(sources).not.toContain('kaga/illustrated-map');
    expect(sources).not.toContain('kaga/spatial-registered-v1');
    expect(kagaProductionSanitizedGeoJsonAssets.map(({ source }) => source)).toEqual([
      'kaga/spatial-registered-v1/registered-gardens.geojson',
      'kaga/spatial-registered-v1/registered-crescent.geojson',
    ]);
  });

  it.each([
    'specifications/kap-disney-style-map-input-spec.txt',
    'visual-direction/kap-cover-review.png',
    'kaga/spatial-v2/selected-layers.json',
    'kaga/spatial-v2/source-linework.geojson',
    'kaga/spatial-registered-v1/registered-spatial-metadata.json',
    'kaga/illustrated-map/manifest.json',
    'kaga/illustrated-map/registration.json',
    'reports/kaga-final/QA_FINAL.md',
    'tests/e2e/kaga-final-production.spec.ts',
    'docs/ILLUSTRATOR_MAP_AUDIT.md',
    'raw/Kaig-mastersite (2).3dm',
    'raw/map new V01.ai',
  ])('rejects forbidden public path %s', (path) => {
    expect(runtimePathViolation(path)).toBeTruthy();
    expect(() => assertSafeKagaRuntimePaths([path])).toThrow(/Forbidden KAGA client runtime content/);
  });

  it('accepts the client runtime contract', () => {
    expect(() => assertSafeKagaRuntimePaths([
      'index.html',
      'assets/index-abc123.js',
      'kaga/assets/core/source.webp',
      'kaga/illustrated-map/illustrated-composite.webp',
      'kaga/spatial-registered-v1/executive-masterplan.svg',
      'kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf',
    ])).not.toThrow();
  });

  it('defines the internal spatial metadata that sanitized runtime GeoJSON must remove', () => {
    expect(kagaForbiddenRuntimeMetadataKeys).toEqual(expect.arrayContaining([
      'sourceObjectIndex',
      'sourceLayer',
      'footprintId',
      'sourceRhinoSha256',
    ]));
  });
});
