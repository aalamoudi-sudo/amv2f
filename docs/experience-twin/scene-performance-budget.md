# Scene Performance Budget

## Measured Build Delta

Measured on 2026-07-31 using Node 26 runtime, Vite production build, and gzip.
The baseline was the detached EX.1B checkpoint `359368af`; it was measured in a
temporary clean worktree and removed afterward.

| Artifact | EX.1B gzip | EX.1C gzip | Delta |
| --- | ---: | ---: | ---: |
| Initial `index` JS | 560,745 B | 561,778 B | +1,033 B |
| Initial `index` CSS | 15,151 B | 15,179 B | +28 B |
| Initial combined | 575,896 B | 576,957 B | +1,061 B / **0.184%** |
| Experience workspace route JS | 38,978 B | 53,211 B | +14,233 B, lazy route |
| Scene viewer | n/a | 9,115 B | lazy |
| Panorama surface | n/a | 2,018 B | lazy |
| Web3D surface | n/a | 22,434 B | lazy |

The initial combined target of no more than 2% is met. No dependency changed.

## Technical Fixture

- 360 JPEG: 561,419 B, `4096x2048`.
- Candidate flat PNG: 27,206 B, `1600x900`.
- Approved-example flat PNG: 27,202 B, `1600x900`.
- Thumbnail PNG: 4,260 B, `640x360`.
- GLB: 1,648 B.
- Total ignored fixture directory: approximately 624 KiB.

The files are generated deterministically and are not in the initial bundle or
Git.

## Runtime Policy

- Viewer, panorama, and Web3D are dynamic imports.
- Selected content loads after MIME, byte-size, and SHA-256 verification.
- Only a lightweight selected variant is requested; adjacent large media are
  not retained.
- Obsolete requests use `AbortController` cancellation.
- Panorama cache and model geometry/material/texture resources are cleared on
  unmount; gateway state is disposed when selection changes.
- Models never auto-load at mobile widths without confirmation.
- Reduced-motion disables transitions/animation.

## Local Timing

The final Playwright production run loaded the 561 KiB panorama, navigated its
hotspot, and opened the 1.6 KiB GLB within 3.3 seconds after page readiness at
the required desktop resolutions. This includes UI actions and is not a
network benchmark.

## Remaining Risks

Real 8K panoramas and production GLBs can exceed decode/GPU memory budgets.
EX.1D must define variant generation, texture caps, model complexity limits,
device policy, and intake-side validation before accepting large KAP assets.
