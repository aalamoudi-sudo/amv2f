# EX.1F Client Review Deployment

## Build

Run:

```bash
pnpm build:client-review
```

The command type-checks and builds the approved frontend, rejects raw source formats and private paths, and writes:

- `dist/client-review-build-manifest.json`
- `dist/client-review-checksums.sha256`

The profile contains no secrets, external integration requirement or raw delivery package. IoT remains visibly local/offline. Fictional operational and studio dry-run laboratories are excluded from KAP navigation in this profile; a direct laboratory query fails safely to the real zero-state overview.

## Package

Run:

```bash
pnpm package:client-review
```

The local artifact is `~/Downloads/mayadeen-ex1f-client-review-deployment-ready.zip`. It includes the static frontend, checksums, a configuration example, deployment guidance and rollback guidance.

## Hosting Requirements

- Serve the frontend over HTTPS for an authorized client-review environment.
- Route unknown SPA paths to `index.html`.
- Cache fingerprinted assets immutably and do not cache `index.html` long-term.
- Configure the asset base URL without embedding credentials.
- Apply a restrictive Content Security Policy appropriate to the approved host.
- Keep any optional local gateway private and separately authorized.
- Never expose private intake folders.

## Runtime And Browser Boundary

The required runtime is a static HTTPS host with SPA fallback. No backend, database, cloud upload or external integration is required for this review artifact. An optional local gateway remains separately deployed and visibly offline unless Ahmed authorizes it.

The review profile is verified with the bundled Chromium engine at `1366x768`, `1920x1080` and `2560x1080`. Current Chromium-based desktop browsers are the supported review target. Safari and Firefox require a separate compatibility pass before they may be stated as verified.

No public URL or external deployment is authorized by EX.1F. The maximum classification is `CLIENT_REVIEW_DEPLOYMENT_READY`, not `LIVE_OPERATIONAL_PRODUCTION_READY`.
