# KAGA Source Mapping

Authoritative source: `Rev06 Inauguration of King Abdullah Gardens` (132 PDF pages, dated 6 August 2026). Included review copy SHA-256: `500f2bfaeaa871e8eee8fedf5cd571b2dc11d12e33af3bb497e5a17414c545ad`.

All page numbers below refer to PDF pages, not footer numbers. `src/features/kaga/data/sourceReferences.ts` is the machine-readable index and every rendered entity includes `SourceReference.pdfPages`.

| Experience entity | PDF pages | Implementation |
| --- | --- | --- |
| Intro and project identity | 1, 3 | Cinematic entry with source cover visual |
| Four-day overview | 4 | Four reusable day records |
| Day 1: pre-inauguration | 5-10 | Day data, workers route, mayor route, gifts/photo assets |
| Day 2: royal inauguration | 11-18 | Day data and approved-concept royal visualization |
| Launch show | 19-22 | XR, drones, and fireworks layers |
| Day 3: prince visit | 23-31 | Prince and guest journeys, protocol assets |
| Day 4: press conference | 32-40 | Distinct page-34 mayor/media-minister journey, page-35 media journey, press and dinner assets |
| Reception and hospitality | 41-43 | Reception and VIP experience records |
| Activations | 44-49 | Garden model, memorial, memory corner, era walk |
| Mobile exhibition | 50-58 | Seven-point table, seed capsule, supporting visuals |
| Invitation proposal | 59-62 | Six-stage interactive product demonstration |
| Visual identity | 63-76 | Uniforms, badges, flags, signage, buses, carts, proposals comparison |
| 3D/render visual museum | 77-131 | Eight environments and 46 optimized viewing angles |

Asset extraction is recorded in `src/features/kaga/data/assets.ts`: 101 WebP files at 1600×900, preserving the useful source frames without runtime PDF parsing.

## Exact source terms retained

- `حديقة الخيارات` is retained across all six journey families and the spatial masterplan without reinterpretation.
- Page 25 retains the full title `رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين`. Stop B includes the Saudi Ardah reception, garden model temporary-transfer note, memorial, and 40-minute duration.
- Page 26 stop C retains the same ceremonial detail with its 60-minute duration.
- Page 34 stop E is `ممر العصور`.

## Recorded ambiguities

- Page 4 describes the second day across Al-Uja Palace and King Abdullah Gardens without defining a transport order. The experience shows both locations and does not invent an itinerary.
- Some detailed wording in page 20 is outlined artwork and could not be recovered reliably. Only clearly readable, source-backed layer descriptions are used.
- The dimensions shown for the garden model on page 45 have unclear units; no physical dimensions are claimed.
- Footer numbering shifts around PDF pages 118-131. Traceability uses actual PDF page indices.
- Spatial routes are deterministic visual traces of the colored source lines, not survey coordinates and not construction geometry.
- The journey-map label is preserved exactly as `الحديقة الديفونية` throughout data and UI.
