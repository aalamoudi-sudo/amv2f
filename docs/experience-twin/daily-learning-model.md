# Daily Learning Model

## Inputs

A `DailyLearningRecord` may be derived only from a completed or aborted,
hash-valid rehearsal run. Its source run ID, event day, observations, issues,
tested contingencies, unresolved blockers, missing evidence, missing owners,
missing scenes, and source limitations remain explicit.

Learning states are:

- `observed`
- `proposed`
- `accepted-for-next-rehearsal`
- `rejected`
- `superseded`

## Derivation

Derivation is deterministic. It summarizes existing append-only run records; it
does not infer field facts or use AI. An empty run produces no invented lesson.
The record has its own revision and content hash and retains the source run
hash.

## Next-Day Proposal

`NextDayImprovementProposal` is a preview linking one daily learning record to
a later candidate day. It contains proposed changes and explicit review state.
Creating it does not alter the target `EventDayPlan`, its moments, source
references, timing, readiness, or operational status.

The UI always labels the proposal as requiring explicit review. Acceptance for
a later rehearsal would require a new plan revision outside the run history;
it cannot overwrite the current frozen-for-rehearsal revision.

## Exclusions

Daily learning is not operational evidence, a readiness assessment, a safety
instruction, a client approval, a decision approval, or a baseline change. It
uses local untrusted timestamps and local repository custody only.
