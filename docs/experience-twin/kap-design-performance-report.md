# KAP Design Web3D Performance Report

## Asset budget

| Measure | Result |
| --- | --- |
| External GLB bytes | 3,050,340 (2.91 MiB) |
| Vertices | 127,783 |
| Triangles | 125,130 |
| Runtime meshes/materials | 22 / 22 |
| Runtime textures/external URIs | 0 / 0 |
| Default profile | balanced |
| Balanced DPR cap | 1.5 |
| High DPR cap | 2.0 |
| Low-power DPR cap | 1.0 |

The GLB is fetched only when its scene is active, is fingerprinted before a
Blob URL is exposed to the loader, and is not part of the JavaScript bundle.
The renderer is lazy-loaded and pauses its render loop when the document is not
visible. Object URLs and Three.js geometries/materials/textures are disposed on
scene exit.

## Measured review-machine results

Measurements against approved commit `508777bf` on the local review machine:

| Measure | Baseline | Wave C.1 | Delta |
| --- | ---: | ---: | ---: |
| Initial JavaScript gzip | 563,621 B | 564,271 B | +650 B / +0.115% |
| Initial JS + CSS gzip | 578,800 B | 579,513 B | +713 B / +0.123% |
| All emitted JS + CSS gzip | 1,060,890 B | 1,075,521 B | +14,631 B / +1.379% |
| Lazy Web3D chunk | — | 25,848 B gzip | not initial |

Three cold-context production-preview runs reached `data-model-ready=true` in
2,036 ms, 1,886 ms and 2,328 ms. The maximum was 2,328 ms, below the five-second
target. The 3,050,340-byte GLB transferred locally in 20.9–27.8 ms. All runs had
zero console errors, zero HTTP failures and zero external requests.

The final staged and unstaged production-build results are recorded by the
closure quality gates. These measurements describe this review machine and are
not a production SLA.

## Quality profiles

- `balanced`: default desktop profile, antialiasing enabled, DPR ≤ 1.5.
- `high`: explicit executive-review profile, antialiasing enabled, DPR ≤ 2.
- `low-power`: no antialiasing, DPR ≤ 1, suitable for constrained devices.

No profile changes source geometry, truth, camera identity or project state.
