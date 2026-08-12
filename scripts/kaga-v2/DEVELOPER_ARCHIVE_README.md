# KAGA V2 Final Developer Archive

Internal engineering archive for the source-true KAGA V2 experience.

It contains the repository source tree, KAGA runtime assets, source/registration
documentation, final QA evidence, KAGA E2E specifications, and reproducible
source-image/spatial scripts. It intentionally does not contain `node_modules`,
build caches, the original Rhino `.3dm`, or client delivery ZIPs.

Build the V2 runtime with:

```sh
pnpm install
pnpm build:kaga:v2
```

The authoritative event PDF is retained under `public/kaga/source/` because the
runtime exposes it through «الوثيقة الأصلية».
