# KAGA Journey Model

The masterplan uses a single SVG view box: `0 0 1200 900`. Canonical points, stops, segments, and paths are typed independently of their visual styling. The geometry was traced from the colored centerlines on the cited source pages; it is presentation geometry, not geospatial or survey data.

Each journey has:

- A permanent English `JourneyId` and Arabic title.
- Ordered primary stops with stable stop IDs, source-page references, and explicit monotonic `pathProgress` anchors.
- One or more segments classified as entry, shuttle, tour, exit, or optional.
- Source distances and durations only where stated.
- A combined SVG `playbackPath` and a separate normalized presentation duration.
- Optional branches modeled outside the default primary timeline.
- Optional links from stops to a visual experience.

| ID | Arabic journey | Source | Source metrics retained |
| --- | --- | --- | --- |
| `workers` | رحلة العاملين في الحدائق | 7 | Entry 585m/5min; shuttle 8min; tour 1400m/18min; exit 400m/5min; nature garden 25min |
| `mayor` | رحلة سمو الأمين | 8 | Entry 760m/5min; walking tour 1400m/18min; exit has no independent source metric |
| `prince` | رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين | 25 | Entry 1100m/5min; ceremonial stop B 40min; golf-cart tour 2450m/15min; exit has no independent source metric |
| `guests` | رحلة الضيوف | 26 | Entry 760m/5min; transfer 420m/3min; golf-cart tour 1400m/10min; exit 420m/3min |
| `mayorMedia` | رحلة سمو الأمين ومعالي وزير الإعلام | 34 | Entry 760m/5min; walking tour 1750m/20min; exit has no independent source metric |
| `media` | مسار الإعلاميين | 35 | Entry 760m/5min; shuttle 8min; walking tour 1550m/18min; exit 300m/3min; nature garden 25min |

Playback controls are play/pause, restart, previous/next stop, route progress, and 0.75×/1×/1.5× presentation speed. Marker position, active stop, selected stop, next/previous, and the progress slider all use the same SVG path timeline. Major stops introduce a 700ms presentation pause. `requestAnimationFrame` advances a normalized 17-23 second presentation sequence. It never modifies or reinterprets the real-world information shown alongside the route.

Workers page 7 and media page 35 each define the nature-garden trip as an optional `nature` branch. Those branch stops are excluded from default primary playback and become selectable only after activating «عرض المسار الاختياري».

Map layers are implemented as deterministic SVG groups: masterplan base, route, stops, selection/active state, playback marker, and contextual labels. Pan and zoom alter only the rendered view transform; reset restores the canonical view.
