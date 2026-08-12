# Legendary State Model

`LegendarySession` is the only orchestration state. The approved registered map
store remains untouched.

## Principal states

- `paused`: entry, a returned spatial context, or a manually paused chapter.
- `directed`: `requestAnimationFrame` advances cinematic progress and beats.
- `explore`: Director progression stops while map, experience, knowledge or a
  deterministic spatial query is inspected.

The Guest lens is the only polished L1 lens. The type contract also reserves
Story, Place and Experience for later gates without exposing unfinished UI.

## Interruption contract

On `استكشف`, `openExperience`, or `openKnowledge`, the store snapshots:

- active beat;
- active stop;
- cinematic progress;
- spatial focus;
- prior mode.

`العودة إلى الرحلة` restores the snapshot and remains paused. `متابعة القصة`
restores the same snapshot again and changes only the mode to `directed`.
Progress is neither duplicated nor restarted.

## Map-to-experience continuity

The source-true map remains mounted behind the experience reveal. The reveal's
mask origin is calculated from the active beat's frozen map point. Returning
reverses the mask toward the same origin. The journey ID, beat, stop, route
progress and focus never change during the overlay.

## Temporal truth

`actualTime` and `actualDurationMinutes` are immutable source metadata on a
beat. `presentationDurationMs` controls only cinematic compression.
`advanceLegendaryTemporalState` returns a new cinematic progress value and never
edits source timing.
