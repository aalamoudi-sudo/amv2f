# Event Theme Package

## Contract purpose

`EventThemePackage` is a typed, event-agnostic UI contract for event identity. It does not represent an event package, operational pack, readiness state, decision, evidence record, source adapter, or backend record.

The contract is defined in `src/types/eventThemePackage.ts`, validated in `src/services/eventThemePackage.ts`, and populated with local review fixtures in `src/data/eventThemePackages.ts`.

## Fields

| Field | Purpose |
| --- | --- |
| `themeId` | Permanent theme package identifier |
| `version` | Theme package version |
| `eventId` | Exact event boundary; every event asset and pattern must match it |
| `status` | `temporary-demo`, `candidate`, `approved`, or `retired` |
| `sourceReferences` | Source file, pages, classification, rights status, and note |
| `owner` | Theme package owner |
| `approvedBy` | Explicit approver; required for `approved` |
| `approvedAt` | Explicit approval timestamp; required for `approved` |
| `coreCompatibilityVersion` | Supported Core Foundation compatibility version |
| `brandTokens` | Exact stable Mayadeen Shell tokens; event overrides are rejected |
| `eventTokens` | Event page, primary, secondary, accent, and soft readable color pairs |
| `spatialTokens` | Canvas, logical node, relationship, and geometry-absent readable color pairs |
| `imagery` | Source-linked, event-scoped local event image descriptors; Mayadeen shell logos live outside the event package |
| `patterns` | Source-linked, event-scoped decorative descriptors |
| `typography` | Local/system font stacks and approval status |
| `assetRightsStatus` | Aggregate asset rights position |
| `fallbackTheme` | Safe fallback package identity and version |
| `contentHash` | Content-addressed identity field for future packaging |
| `rollbackTarget` | Explicit safe theme target |

## Validation gates

The local validator blocks a package when any of these conditions exists:

| Gate | Rejected condition |
| --- | --- |
| Shape | Missing required field, unknown top-level field, unsupported status, or unsupported Core version |
| Core integrity | Any change to Mayadeen shell or focus tokens |
| Semantic integrity | Any nested truth, severity, readiness, or protected operational token name |
| Readability | Missing foreground, invalid HEX pair, or contrast below `4.5:1` for normal text |
| Event isolation | Package, image, or pattern `eventId` differs from the requested event |
| Provenance | Unknown provenance, missing source reference, or source reference absent from the register |
| Rights | Package, source, image, or pattern with `unknown` rights status |
| Remote content | Unapproved remote image URL or any remote font URL |
| Approval | `approved` status without `approvedBy` and `approvedAt` |
| Recovery | Missing fallback, content hash, or rollback target |

Validation cannot make a candidate theme approved. It can only establish that the package is structurally safe to render for review.

## Status behavior

| Status | Meaning |
| --- | --- |
| `temporary-demo` | Explicit non-production theme used for local demonstration or neutral fallback |
| `candidate` | Reviewable theme with no production approval claim |
| `approved` | Theme carrying an explicit approver and timestamp; founder approval policy still applies to rollout |
| `retired` | Theme retained for traceability but not selected for new rendering |

The KAP theme is `THEME-KAP-HYBRID-LIGHT-CANDIDATE@0.1.0`, scoped to `EVENT-KAP-OPENING-2026`, with `approvedBy: null` and `approvedAt: null`.

## Fallback and rollback

Theme resolution accepts an `eventId`, a local theme catalog, and a validated neutral fallback. A missing or invalid theme returns `safe-fallback`. The neutral fallback carries no KAP imagery, pattern, green, or gold. An invalid fallback is a hard error rather than a silent theme leak.

`rollbackTarget` records the intended safe visual target. It does not execute deployment rollback and is not connected to storage or a service.

## Backend boundary

UX.1B does not add a theme API, database table, upload flow, remote asset service, or live integration. Any backend activation, approval workflow, signing, content-hash generation, or distribution mechanism requires a separate architecture decision and implementation sprint.
