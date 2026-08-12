# Stage 3E.2 — Frozen Pilot Package Authoring Trial

## Status

**Authoring system complete; KAP real-event candidate ingested as source-safe metadata; freeze remains blocked.**

The original authoring-system trial created templates and one explicitly fictional
fixture. The approved KAP intake has now added a separate `candidate` record with
five stable IDs, governed source hashes, authority boundaries, CAD metadata and
freeze gates. Raw restricted sources remain outside Git. The KAP candidate has not
been compiled, frozen, activated or described as operationally verified. See
`docs/stage-3e2-pilot-authoring-architecture.md` and
`docs/stage-3e2-pilot-validation-report.md`.

## Implemented Flow

`source files -> PilotSourceBundle -> PilotPackageDraft -> validation and ID mapping -> EventPackage compilation -> preview -> local freeze -> temporary activation -> 2D/3D/readiness/decision/scenario/integration/projection verification -> readiness report`

The compiler consumes generic typed data. The new fictional event type `controlled-public-experience` requires no branch or identifier in platform-core runtime, readiness, decision, route, scenario, integration, projection, or renderer services.

## Input Inventory

Committed files are editable templates only:

- `README.md`
- `event.json`
- `venue.json`
- `entities.csv`
- `routes.json`
- `readiness.csv`
- `decisions.json`
- `roles.csv`
- `authorities.csv`
- `integration-profiles.json`
- `projection-profile.json`
- `evidence-register.csv`
- `sources-register.csv`

Every example is marked `EXAMPLE-ONLY` or `exampleOnly: true`. Private data, evidence files, credentials, tokens, personal data, and security-sensitive geometry are ignored by Git.

## Functional Boundary

- Complete source bundles are validated by executable Ajv Draft 2020-12 schema and semantic checks.
- Incomplete values remain a `PilotPackageDraft`; unknowns remain unknown and never receive generated facts.
- Draft fields explicitly distinguish missing, invalid, unapproved, unknown, conflicting, complete, and ready-to-freeze states.
- Stable IDs, parent relationships, cross-event references, route/entity links, scenario references, evidence sources, and frozen-ID changes are checked explicitly.
- Readiness requires owner, responsible party, source, update time, action, and due date.
- Decisions require event/venue scope, problem, ownership, authority, options, source, and change reason.
- Three integration candidates are documented: input capture, spatial gateway, and physical/printed output. No live call or vendor SDK exists.
- A frozen local artifact stores package/source hashes, revision, input manifest, mapping and validation reports, limitations, warnings, packs, integration candidates, and policy summaries.
- Frozen artifacts are deeply immutable in memory. A change creates a new revision and retains the previous artifact.
- Freeze recalculates the source-bundle hash and rejects any bundle that differs from the source that passed compilation.

## Original Fictional Trial Result

The fictional fixture compiles into the frozen Stage 3E `EventPackage` contract, freezes locally, activates as `temporary-demo`, and drives the existing 2D, 3D, readiness, decision, scenario, integration, and projection paths. This proves software-path compatibility only.

The deterministic fictional artifacts used for this technical proof are:

- Source-bundle hash: `PILOT-SOURCE-v1-965091c0b973c3b5fe7cf00a8b0093b891e0024f57ab6ecf6b4bffccf057e7a5`
- EventPackage hash: `EVENT-PACKAGE-v1-74900038a22dab0973a784cf3d8f66d0ffd3aebe78326c62b964e133973e5096`

These hashes identify fictional local content. They are not digital signatures, approval evidence, trusted actor identity, or authoritative time.

## Verification Evidence

- TypeScript: passed.
- Lint: passed.
- Unit tests: `235/235` in `39` files.
- Canonical Stage 3C.1 regression: `55/55` in `8` files.
- Stage 3D.1A regression: `81/81` in `11` files.
- Stage 3E.1 final-closure regression: `27/27` in `2` files.
- Stage 3E.2 authoring tests: `21/21` in `1` file.
- Playwright: `136/136` at `1920x1080` and `2560x1080`.
- Production build: passed with the existing large-initial-chunk warning only.
- Initial JavaScript changed from `1,503.45 kB` (`418.02 kB` gzip) to `1,505.30 kB` (`418.48 kB` gzip).
- The lazy authoring workspace is `78.39 kB` (`21.01 kB` gzip).
- Visual evidence: `44` unique PNGs; dimensions, semantic states, settled rendering, and secret-text checks passed.
- 2D/3D changed-pixel ratios: `67.81%` at `1920x1080` and `61.71%` at `2560x1080`.
- Review archive: `/Users/mayadeen/Downloads/mayadeen-stage-3e2-pilot-authoring-review.zip`.
- Archive SHA-256: `10bcaa8f0b43841c2287f7f6f7afacbb2f98685ce2323599235aa8b823ca5cb2`.
- `unzip -t`: passed.

Authoring discovery metrics retain the highest observed issue count during a local session, so corrected duplicates, dangling references, and missing governance fields do not disappear from the exported trial report. Current unresolved issues remain a separate live validation view.

## Missing From Ahmed

1. Approved event and venue identity, dates, time zone, owner, and permitted use.
2. Authoritative site/entity register with stable IDs and Arabic/English labels.
3. Geometry sources, coordinate frame, model references, and model-node mapping.
4. Route geometry, direction, capacity, accessibility, authority, approval, date, and version.
5. Readiness owners, responsible parties, sources, timestamps, evidence, confidence, actions, impacts, and dependencies.
6. Decision cases, options, owners, authorities, evidence, expected impact, and lifecycle state.
7. Role/authority matrix and approved separation-of-duty rules.
8. Evidence/source registers, security/privacy classification, residency, retention, and permitted-use policy.
9. Integration candidate owners, methods, sandbox status, credential status, failure behavior, export path, and acceptance criteria.
10. Written approval to freeze the real source bundle and to activate it locally for evaluation.

Stage 4 and external integration remain out of scope.

## KAP Candidate Result

The source-safe KAP candidate is now available in the same lazy authoring
workspace. It has five stable unmapped entities, exact source classifications,
governance and authority boundaries, evidence quarantine, deterministic CAD
comparison, and twelve fail-closed freeze gates. Its source identity is
`PILOT-SOURCE-v1-23bd45aeb91076897879a9da51a557fec6bb1bbfb94f362ea8c7dd16e63b6d4d`.
It has no EventPackage content hash and has not been frozen or activated.

Final verification for the KAP addendum: `263/263` unit tests in `40` files and
`140/140` Playwright tests. The visual archive contains `32` unique KAP PNGs and
passes `unzip -t`; details are in `docs/stage-3e2-pilot-validation-report.md`.
