# Stage 3E.1 Architecture Review

## CTO Assessment

**Decision:** accept the Stage 3E.1 local runtime boundary for freeze, subject to repository quality gates and claim limits.

The root Stage 3E weakness was duplicated authority: the configuration workspace controller, Zustand copies, fallback catalogs, and capability workspaces could disagree. Store-owned activation and explicit runtime selectors remove that ambiguity. Complete rollback and atomic activation preserve the Stage 3C.1 baseline and schema-8 quarantine boundary.

The model is event-agnostic because event type is data, scenario IDs are strings, spatial fit is geometry-derived, route consumers accept runtime routes, and the Stage 3D adapter is configured rather than forked. The fourth test event provides evidence for this claim; it does not prove production scalability.

Strict Ajv schemas protect stable executable shapes. Existing readiness, decision, capture, evidence, provenance, and lifecycle validators retain deeper domain responsibility. This avoids casting partially checked imports while keeping established integrity logic authoritative.

The future backend boundary remains clear: replace local activation/session and repositories behind the same typed contracts. No backend, durable workflow, trusted identity, authoritative clock, or live adapter was introduced.

## Technical Debt

- The initial application bundle remains above the desired future budget.
- Package activation is session-local and intentionally not durable.
- Reference package construction is code-authored test data; real authoring tooling does not exist.
- Model references are validated metadata; runtime imported model loading is not part of Stage 3E.1.

## Bundle Review

| Output | Before Stage 3E.1 | After Stage 3E.1 | Delta |
| --- | ---: | ---: | ---: |
| Initial JavaScript, minified | 1,471.77 kB | 1,501.15 kB | +29.38 kB |
| Initial JavaScript, gzip | 410.61 kB | 417.43 kB | +6.82 kB |
| Total lazy JavaScript, minified | 449.75 kB | 463.73 kB | +13.98 kB |
| Total lazy JavaScript, gzip | 117.87 kB | 121.74 kB | +3.87 kB |

After Stage 3E.1 the lazy outputs are `EventConfigurationWorkspace` at `116.21/27.46 kB`, `OperationalCaptureLab` at `154.72/39.37 kB`, and the executable capture/schema boundary at `192.80/54.91 kB` (minified/gzip). Chunk boundaries were reorganized by imports, so individual lazy chunks are not directly comparable to the previous Ajv and lab split; the total comparison is the stable measure. No dependency or vendor SDK changed. The known initial-chunk warning remains documented and does not authorize an unrelated performance rewrite.
