# Color And Truth Semantics

## Foundation Tokens

| Token | Value | Permitted use |
| --- | --- | --- |
| canvas | `#071113` | application canvas |
| surface-1 / 2 / 3 | `#0D191C` / `#122226` / `#183036` | hierarchy and grouping |
| border-subtle / strong | `#22373C` / `#31515A` | separators and structural boundaries |
| text-primary / secondary / muted / inverse | `#F3F7F6` / `#A8B8B6` / `#758785` / `#04110E` | text hierarchy |
| brand-primary / hover / pressed | `#2FD6B5` / `#25C3A5` / `#1EAA90` | explicit primary interaction only |
| focus-ring | `#73E7D1` | keyboard focus |
| spatial-primary | `#5AA9FF` | relationships, navigation, and reported spatial context |

## Truth Is Not Severity

Truth answers what kind of claim is being shown. Severity answers what operational attention it needs. Neither may be inferred from color alone: every use requires Arabic text, an icon or shape, an accessible label, and consistent placement.

| System | Token | Value | Meaning |
| --- | --- | --- | --- |
| truth | verified | `#42C98A` | verified claim |
| truth | reported | `#5AA9FF` | reported, unverified claim |
| truth | candidate | `#A98BFF` | candidate context |
| truth | scenario | `#F2B84B` | scenario claim |
| truth | unknown | `#91A09F` | unknown, baseline/demo, or missing context |
| severity | normal | `#42C98A` | normal operating condition |
| severity | attention | `#F2B84B` | attention required |
| severity | critical | `#FF6B6B` | critical condition |
| severity | blocked | `#D97878` | blocked or quarantined condition |
| severity | information | `#5AA9FF` | informational or recovery condition |

The equal numerical tones for some systems do not collapse their semantics. Components use separate `truth-*` and `status-*` classes, and tests assert the separation.

## Prohibited

- A reported observation must never use verified wording or color treatment.
- Candidate geometry must never appear approved.
- Brand emerald must not represent every normal, selected, verified, or connected state.
- Color may not be the sole signal for truth, severity, focus, connection, or selection.
