# Story Map Accessibility

## Keyboard

When the map owns focus:

- `+` or `=` zooms in.
- `-` zooms out.
- `0` fits all.
- `F` fits the selected landmark or all landmarks.
- Arrow keys pan.
- `Escape` exits authoring, closes a popover, or clears selection safely.

Landmarks are native buttons with Arabic accessible names and pressed state.
Enter and Space use native button activation. Shortcuts are not captured while
an input, select, or button owns focus.

## Screen Reader And Non-Visual Use

- The map has an application label that explains keyboard operation.
- The active story stop is announced through an `aria-live` region.
- Selected landmarks use `aria-pressed`.
- Disabled 360, 3D, and future layers remain discoverable with truthful labels.
- A details element provides an ordered textual alternative for every route,
  including unanchored stops.
- Technical IDs and hashes remain outside the default operator surface.

## Visual Access

- Touch targets are sized for pointer and touch use.
- Selection combines color, halo, shape, label, and pressed state.
- Independent landmarks use a different shape.
- Warning/unresolved states do not rely on color alone.
- Reduced-motion removes route and visitor animation while preserving state.
- High-contrast media rules strengthen route and focus treatment.
- The map preserves aspect ratio and avoids horizontal page overflow at the
  required desktop widths.

## Known Boundary

The interface supports accessible operation of the Story Map software. It does
not claim that any displayed journey is an approved accessible field route.
That claim requires separate route, engineering, accessibility, evidence, and
authority inputs.
