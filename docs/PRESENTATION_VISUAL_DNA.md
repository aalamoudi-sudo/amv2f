# KAGA Presentation Visual DNA

## Scope and source

This audit is derived from a complete visual review of all 132 rendered pages of
`Rev06 Inauguration of King Abdullah Gardens تدشين حدائق الملك عبدالله copy.pdf`.
It is the corrected visual implementation contract for PF-1.1 only: Intro, Four Days and the
Masterplan/Journey surface. It does not alter event content, route geometry,
knowledge registration or application structure.

The audit used full-document contact sheets and high-resolution inspection of
pages 1, 3–8, 15, 20, 23, 25–26, 32, 34–35, 42, 45, 48, 64, 66, 77–78, 85,
99, 108, 111, 115, 118, 126 and 132.

## Evidence by presentation family

| Presentation family | Representative pages | Visual evidence |
| --- | --- | --- |
| Opening and closing | 1, 132 | One dominant aerial image; formal white identity; large title placed into the image rather than a web hero container. |
| Day and agenda chapters | 3–6, 23, 32 | Large quiet ivory field, limited text block, orange section emphasis, asymmetric image/content split and a flowing green transition between both fields. |
| Route maps | 7, 8, 25, 26, 34, 35 | Map occupies roughly two thirds of the page; text is directly on cream, not in a card; route markers are dark teal; fine separators and sparse metadata preserve the map as hero. |
| Hospitality and activations | 42, 45, 48 | Full-bleed imagery alternates with quiet cream editorial pages. Copy is short and aligned to the dominant composition, not overlaid as dashboard chrome. |
| Identity applications | 64–76 | High negative-space ratio, few objects, small formal identity placement and selective orange/green labels. |
| Render environments | 77–131, especially 85, 99, 108, 111, 115, 118, 126 | A repeated but not mechanical contour grammar: source image on the left, cream field on the right, a broad deep-teal sweep, a secondary muted-turquoise sweep and a hairline gold contour. One large green title often carries the entire right field. |

## Source page archetypes

The presentation identity is a family of page grammars, not one universal
organic frame. A composition must declare its archetype before it selects a
contour variant.

### A. Editorial / render

Representative pages: 85, 99, 108, 111, 115, 118 and 126.

- One dominant source render and a large cream editorial field.
- A clearly authored green/teal boundary with one extremely thin gold edge.
- A large quiet Arabic title carries the editorial field; supporting copy is
  sparse.
- The contour is structural because it separates image from editorial copy.

PF-1.1 mapping: `hero → editorial`, with a thinner image-framing contour than
PF-1. The image and contour remain legible as separate layers.

### B. Route / map

Representative pages: 7, 8, 25, 26, 34 and 35.

- The map is the dominant surface on a flat quiet ivory field.
- Journey information occupies a clear right-side column without a boxed app
  sidebar.
- Thin rules, a restrained orange active cue, stop hierarchy and small formal
  navigation provide the identity.
- A broad multi-band contour does not cross or obstruct the map.

PF-1.1 mapping: `map → route-map`. Its vector geometry is intentionally a
shallow separator only; the map/content ratio is 72/28 at the two review widths.

### C. Event day / chapter

Representative pages: 3–6, 23 and 32.

- A selected day is one ceremonial chapter, not one of four equal cards.
- The day number and date establish the rhythm, followed by a compact fact set.
- Source imagery and the route preview form one dominant visual relationship.
- Organic geometry frames the chapter but remains fourth in hierarchy after
  the selected day, route map and day facts.

PF-1.1 mapping: `chapter → event-day`, using a reduced horizontal and vertical
curve weight.

### D. Quiet identity

Representative pages: 64–76.

- Extensive negative space, sparse objects and minimal formal identity.
- Small section navigation and selective green/orange labels.
- No requirement for a large image contour.

This archetype is documented for future propagation but is not applied to a
new module in PF-1.1.

## Composition contract

- **Primary page split:** visual 54–68%, editorial field 32–46%, selected by
  content type rather than by a fixed app grid.
- **Quiet space:** 44–60% of an editorial field may remain empty. This space is
  intentional only when title scale and image proportion remain balanced.
- **Page edge:** approximately 3–4% of the presentation width.
- **Text measure:** 28–38rem at 1920px; long protocol titles may use up to 44rem.
- **Map composition:** map 70–76%, editorial journey index 24–30%.
- **Vertical rhythm:** one dominant title, one supporting paragraph, then facts
  or interaction. Metadata does not compete with the title.

## Colour contract

Values are calibrated from rendered source pages and intentionally avoid the
cool white and saturated emerald values common to generic web themes.

| Role | PF-1 value | Source behaviour |
| --- | --- | --- |
| Page ivory | `#F3EBDD` | Warm, slightly textured paper field. |
| Quiet surface | `#F8F3E9` | Lightest editorial field and map surround. |
| Presentation green | `#07594F` | Broad contour, formal navigation and primary text accents. |
| Secondary teal | `#3F9185` | Nested contour and spatial linework. |
| Soft turquoise | `#84B9AD` | Inner contour and low-contrast spatial hierarchy. |
| Gold edge | `#C6A25D` | Hairline precision detail only. |
| Active orange | `#E96C19` | Active section/index cue; never used as a large fill. |
| Title ink | `#16221F` | Route and information titles. |
| Body ink | `#5C625C` | Supporting copy and metadata. |

## Typography contract

- Use a safe, offline Arabic stack only:
  `'DIN Next Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif`.
- Hero title: 4.5–6.5rem at 1920px, medium weight, 1.16–1.24 line height.
- Section title: 3–4.8rem, medium weight, short text measure.
- Editorial heading: 2–3.4rem.
- Body: 0.95–1.2rem with 1.8–2 line height.
- Micro labels: 0.65–0.78rem and visually quiet.
- Dates and mixed-direction values remain isolated in their existing semantic
  components. PF-1 changes no approved content strings.

## Contour grammar by archetype

The source does not use arbitrary blobs, and it does not apply a parallel curve
stack to every page. Where the editorial/render archetype uses a contour, it is
a controlled family:

1. a broad deep-green structural sweep;
2. a narrower muted-turquoise companion sweep;
3. a single gold hairline following the contour;
4. an asymmetric S-shaped transition between image and cream field;
5. a lower sweep that anchors the composition and continues beyond the frame.

PF-1.1 keeps four authored vector variants but binds each to a distinct source
archetype: `hero/editorial`, `chapter/event-day`, `map/route-map` and
`cinematic/render-cinematic`. The map variant is fundamentally lighter than the
others: a narrow, shallow transition plus a gold hairline. The cinematic
primitive remains unpropagated at this gate.

## Image treatment

- One dominant source image per composition.
- Crop to the project content, never to PDF chrome, page numbers, partial copy
  or unrelated headings.
- Avoid stacked thumbnails in PF-1.
- Day composition may pair one clean source visual with the frozen V2 map, but
  both must read as a single editorial field.

## Navigation and interaction

The PDF uses a thin, quiet section index with an orange active marker. PF-1
retains the approved routing but visually reduces navigation on the Four Days
and Masterplan surfaces to that behaviour. Buttons and playback controls remain
semantic and keyboard accessible, but content always receives first attention.

## Motion contract

Motion animates the presentation grammar:

- image reveal through the authored crop;
- gold contour trace;
- controlled vertical title reveal;
- editorial facts in measured sequence;
- CTA last.

No bounce, float, parallax or startup-style explosion is permitted. Reduced
motion keeps the final composition without transitional movement.

## PF-1.1 freeze statement

The following are out of scope and must remain unchanged: the Rhino-derived
masterplan, `KAGA-SOURCE-2D-V1`, `KAGA-SPATIAL-REGISTERED-V1`, journey paths,
anchors, `pathProgress`, stop semantics, optional branches, garden registration,
knowledge facts and every application module outside Intro, Four Days and
Masterplan/Journey.
