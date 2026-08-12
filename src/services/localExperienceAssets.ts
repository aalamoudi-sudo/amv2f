const localExperienceAssets = import.meta.glob<string>(
  '../local-pilot-assets/**/*.{png,jpg,jpeg,webp}',
  {
    eager: true,
    query: '?url',
    import: 'default'
  }
);

export function resolveLocalExperienceAsset(assetKey: string | null): string | null {
  if (!assetKey) return null;
  return localExperienceAssets[`../local-pilot-assets/${assetKey}`] ?? null;
}
