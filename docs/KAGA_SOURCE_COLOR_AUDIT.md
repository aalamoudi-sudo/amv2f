# KAGA Source Color Audit

## Authority and method

The visual authority is the 132-page event proposal, `Rev06 Inauguration of King Abdullah Gardens`. The source PDF SHA-256 is `500f2bfaeaa871e8eee8fedf5cd571b2dc11d12e33af3bb497e5a17414c545ad`.

The listed pages were rendered at 144 dpi, visually inspected at native page aspect ratio, and sampled from stable flat-color regions. Anti-aliased text edges, photographic pixels, transparent overlays, and PDF navigation chrome were excluded. Values are runtime presentation tokens rather than claims about print spot colors.

## Sample register

| PDF page | Sampled use | RGB | HEX | Runtime role |
|---:|---|---:|---|---|
| 1 | Full-bleed opening image; warm shadow field | 39, 31, 28 | `#271F1C` | `cinematic.background` |
| 7 | Route-page warm field | 244, 236, 232 | `#F4ECE8` | `routeMap.background` |
| 7 | Route identity green | 52, 148, 124 | `#34947C` | `routeMap.primaryGreen` |
| 7 | Route marker navy | 8, 60, 88 | `#083C58` | `routeMap.markerNavy` |
| 26 | Active route/navigation orange | 228, 112, 26 | `#E4701A` | `routeMap.activeOrange` |
| 26 | Quiet map linework | 188, 184, 180 | `#BCB8B4` | `routeMap.mapGray` |
| 26 | Parking/secondary map mass | 152, 160, 176 | `#98A0B0` | `routeMap.mapGrayBlue` |
| 26 | Secondary route teal | 31, 91, 108 | `#1F5B6C` | `routeMap.secondaryTeal` |
| 85 | Editorial cream field | 230, 215, 200 | `#E6D7C8` | `editorial.background` |
| 85 | Deep contour green | 44, 84, 79 | `#2C544F` | `editorial.primaryGreen` |
| 85 | Inner contour teal | 104, 157, 151 | `#689D97` | `editorial.secondaryTeal` |
| 85 | Precision gold keyline | 185, 154, 91 | `#B99A5B` | `editorial.goldHairline` |
| 99 | Editorial title teal | 44, 105, 98 | `#2C6962` | `editorial.titleColor` |
| 108 | Warm editorial surface | 239, 229, 218 | `#EFE5DA` | `editorial.surface` |
| 111 | Editorial body green-gray | 55, 72, 68 | `#374844` | `editorial.bodyColor` |
| 115 | Soft turquoise visual layer | 131, 181, 173 | `#83B5AD` | shared secondary layer |
| 118 | Quiet warm divider | 205, 190, 174 | `#CDBEAE` | `editorial.divider` |
| 126 | Muted editorial text | 109, 115, 110 | `#6D736E` | `editorial.mutedText` |
| 132 | Closing full-bleed identity white | 255, 249, 240 | `#FFF9F0` | `cinematic.titleColor` |

## Archetype rules

### Route / Map

Pages 7 and 26 establish a bright warm field, soft gray site geometry, dark navy stop letters, presentation green/teal route structure, and a small orange active accent. The map remains dominant and no dark dashboard surface is introduced.

### Editorial / Render

Pages 85, 99, 108, 111, 115, 118, and 126 establish the warmer cream field, deep green outer contour, lighter teal inner contour, large turquoise/teal Arabic titles, and a hairline muted-gold edge.

### Opening / Cinematic

Pages 1 and 132 establish full-bleed photography with warm botanical/sunset tones and white identity typography. This family is reserved for opening, source-scene, and closing moments.

### Identity

Identity/application pages use extensive warm negative space, isolated source objects, sparse labeling, and the same precision keyline rather than card containers.

## Implementation policy

- `sourceTheme.routeMap` is the authority for Masterplan and journey surfaces.
- `sourceTheme.editorial` is the authority for render/experience surfaces.
- `sourceTheme.cinematic` is the authority for full-bleed ceremony states.
- `sourceTheme.identity` is the authority for sparse application and comparison states.
- The Event PDF remains the authority for labels, routes, timing, and protocol. Sampled colors do not change event content.
