# KAGA FINAL EXPERIENCE — Client Runtime Audit

## Production copy policy

`dist-kaga-final` is built with an explicit public-asset allowlist. Vite does not copy the repository-wide `public/` directory in the final production mode.

Allowed runtime resources:

- generated `index.html` and hashed `assets/` bundles;
- approved KAGA visual assets under `kaga/assets/`;
- six optimized illustrated-map WebP layers;
- `executive-masterplan.svg`, `registered-gardens.geojson`, and the unresolved/empty `registered-crescent.geojson` from `KAGA-SPATIAL-REGISTERED-V1`;
- the authoritative inauguration PDF used by «الوثيقة الأصلية».

## Removed from the public runtime

- `specifications/`;
- `visual-direction/`;
- the complete raw `kaga/spatial-v2/` Gate-1 extraction package;
- `selected-layers.json` and `source-linework.geojson`;
- spatial audit/registration metadata not requested by the executive runtime;
- illustrated-map source manifest/registration metadata not requested by the executive runtime;
- reports, tests, docs, source code, raw `.3dm`, and raw `.ai` files.

## Spatial runtime conclusion

Normal executive workflows request the registered executive SVG, registered garden geometry, and optimized illustrated WebP layers. No normal workflow requests the Gate-1 raw extraction files. The internal Crescent provenance lookup now resolves to the registered, explicitly unresolved Crescent dataset rather than the raw Gate-1 candidate.

The public `registered-gardens.geojson` is generated during the production build from the approved geometry. Runtime feature properties are limited to `canonicalGardenId` and `titleAr`; internal object indexes, layer names, candidate IDs, hashes, registration methods, and confidence notes remain only in the developer sources.

## HTTP proof

Required runtime URLs returned `200`. The four requested forbidden URLs returned `404` against the clean `dist-kaga-final` static server. Additional internal manifest and registered-metadata URLs are also absent.

## Automated gates

- build-time allowlist copy;
- post-build filesystem verifier;
- client ZIP verifier and CRC test;
- Vitest allowlist/forbidden-pattern contract;
- Playwright required-URL/forbidden-URL test;
- Playwright clean-runtime console, page error, request failure, and KAGA asset response smoke.
