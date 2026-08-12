# Typography

## Arabic-First Stack

The platform uses a local/system stack only: `IBM Plex Sans Arabic`, `Noto Sans Arabic`, `Geeza Pro`, `Tahoma`, and `system-ui`. No remote font CDN is loaded and no font asset was added in this sprint. IBM Plex Sans Arabic is preferred when an approved, correctly licensed local asset is later supplied; until then the documented fallback stack is authoritative.

## Scale

| Role | Size / line height |
| --- | --- |
| display | 32 / 40 |
| page title | 24 / 32 |
| section title | 18 / 28 |
| card title | 16 / 24 |
| body | 14 / 22 |
| label | 12 / 18 |
| technical data | 13 / 20 |

Use medium and semibold sparingly. IDs, hashes, times, and percentages use `.ltr` or `.command-technical`, which isolate bidi direction and enable tabular numerals. Do not force English identifiers into normal Arabic flow.

## Long Labels

Controls use minimum practical heights and wrap or truncate only where the full label remains available through context or `title`. A long Arabic action is covered by the component test suite.
