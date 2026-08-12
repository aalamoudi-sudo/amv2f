# KAGA Legendary Gate L1 QA

## Scope

Prince journey only. No propagation to the other five journeys or unfinished
lenses.

## Required checks

| Check | Gate requirement |
| --- | --- |
| Source fingerprint verification | Event PDF, Knowledge Guide and Rhino match recorded hashes. |
| Story provenance | Every beat has at least one non-empty source reference. |
| Temporal truth | Only source window bounds use clock time; source and presentation durations remain distinct. |
| State continuity | Director -> explore -> knowledge/experience -> return -> resume preserves beat, stop, progress and focus. |
| Cross-index integrity | Every shown experience, knowledge and visual ID resolves to approved data. |
| Route integrity | No change under KAGA spatial data, registered journeys or source map assets. |
| Normal motion | E2E runs with `reducedMotion: no-preference`. |
| RTL | Arabic-first `lang=ar`, `dir=rtl`; no new mixed-direction source values. |
| Build | KAGA V2 production build with Legendary lazy-loaded. |

## Visual review states

The review package records entry, Director start, temporal choreography,
arrival, spatial reveal, full experience, X-ray, map return, deterministic
queries, interruption/resume, hidden evidence mode and finale at 1920x1080 and
2560x1080.

## Final Gate L1 result

| Gate | Result |
| --- | --- |
| TypeScript | PASS |
| Scoped ESLint | PASS |
| KAGA Vitest | PASS - 18 files, 105 tests |
| Legendary unit tests | PASS - 7 tests |
| Legendary normal-motion E2E | PASS - 2 resolutions |
| Production build | PASS - 2,173 modules transformed |
| Screenshot dimensions | PASS - 15 PNGs at 1920x1080 and 15 PNGs at 2560x1080 |
| Frozen spatial/event diff | PASS - no changed path under spatial, data, knowledge, or registered web geometry |
| Console/page errors | PASS - none in the standard Legendary workflow |

## Known limitations

- Stop B remains an approximate event-authored physical anchor; L1 does not
  upgrade its frozen registration confidence.
- Only the Prince journey and Guest lens are authored.
- The source event does not provide intermediate clock times, so none are shown.
- Director Mode intentionally pauses for the signature experience inspection;
  it resumes only after the viewer returns.
