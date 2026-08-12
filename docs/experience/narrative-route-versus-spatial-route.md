# Narrative Route Versus Spatial Route

## Two Different Contracts

| Dimension | `PersonaJourneyRoute` / `NarrativeRouteSegment` | Governed `SpatialRoute` |
| --- | --- | --- |
| Purpose | Story order and presentation | Physical movement representation |
| Coordinates | Optional normalized illustration anchors | Registered geometry under spatial authority |
| Distance/time | Always `null` | Allowed only from qualified geometry and policy |
| Authority | `routeAuthority=none` | Explicit source, engineering, route, and approval authority |
| Safety/accessibility | Never inferred | Requires separate evidence and approval |
| Cross-site behavior | Program transition only | Requires governed transfer/route data |
| Baseline effect | None | Defined by the spatial lifecycle |

## Hard Invariants

- A narrative segment cannot carry a `spatialRouteId`.
- The renderer cannot calculate or show distance or travel time.
- Connecting two illustrated anchors does not make a path traversable.
- Reordering stops changes storytelling only.
- Dragging an anchor changes an illustrative candidate revision only.
- A dual-site transition does not prove how a guest moves between sites.
- An unresolved stop remains unanchored even when adjacent story stops have
  positions.

## Upgrade Path

Future governed route inputs may be linked as read-only references after they
pass source, registration, engineering, accessibility, HSE, and authority
boundaries. That future linkage must not rewrite the historical narrative
route or silently promote normalized points. Until then, the platform displays
the permanent disclosure:

> بروفة سردية مرشحة - لا تمثل حركة ميدانية أو زمن وصول معتمدًا
