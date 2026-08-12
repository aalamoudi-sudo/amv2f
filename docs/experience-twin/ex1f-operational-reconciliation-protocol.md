# EX.1F Operational Reconciliation Protocol

## Deterministic Input

The preview binds a source fingerprint, current projection hash, sorted incoming facts and stable source locators. Identical inputs produce the same item hash and preview fingerprint.

Each item shows:

- Source page, slide, sheet/row or JSON pointer.
- Existing canonical value.
- Incoming source value.
- Difference type.
- Day, persona, moment and destination scope.
- Decision and readiness context.
- Operational and client-presentation impact.
- Required authority.
- Recommended candidate action.

## Allowed Recommendations

The engine may add a candidate fact, preserve a matching fact, create a conflict, mark a prior candidate as superseded, request authority review, reject a source fact or request evidence. It does not approve the recommendation or mutate the canonical projection.

## Conflict Preservation

Conflicting schedules, routes, identities, ownership or authority claims remain visible. Founder decisions are not overwritten silently. Claimed approval in a document remains a claim until the applicable authority contract resolves.
