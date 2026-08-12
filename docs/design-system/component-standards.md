# Component Standards

## Shared Primitives

`CommandPrimitives.tsx` provides Button, IconButton, StatusBadge, TruthBadge, SeverityIndicator, KPI card, OperationalCard, DataTrustCard, Tabs/SegmentedControl, SearchField, LoadingSkeleton, Tooltip, Toast, DrawerFrame, DialogFrame, Breadcrumb, SplitPane, EvidenceItem, DecisionTimeline, ConnectionStatus, and SpatialLegend.

## Required Anatomy

- Labels are Arabic-first and meaningful without color.
- Icons are decorative only when a text label already exists; icon-only controls require `aria-label` and `title`.
- All controls support default, hover, focus-visible, selected, disabled, loading, and error/recovery context where applicable.
- Surfaces use the spacing scale `4, 8, 12, 16, 24, 32, 48` and radii `6px` controls, `10px` cards, `14px` prominent panels.
- Dialogs and the technical drawer retain keyboard focus management. The technical drawer remains separate from daily operations and does not represent authorization.

## Extension Rule

Add a semantic primitive or shared class before adding a local visual pattern. Feature code may compose primitives but must not create a competing color or status taxonomy. The internal visual reference workspace is the review surface for token and component state changes.
