# Brand Source Register: Stage UX.1B

## Purpose

This register records the local visual evidence used by the founder-review prototype. It separates source authority from implementation-token authority: an authoritative PDF does not make a color sampled from its rendered pixels an official color code.

## Source register

| Source | Pages inspected | Observed visual language | Source class | Asset and rights position |
| --- | --- | --- | --- | --- |
| `/Users/mayadeen/Downloads/الدليل الارشادي لـ ميادين.pdf` | 1, 4, 7, 9, 12, 27, 31, 40, 44, 61 | Deep navy-purple fields, vivid corporate purple, white and warm-light editorial pages, restrained turquoise, large Arabic headings, asymmetric image-led composition, event photography | Authoritative corporate source | Internal review use was explicitly requested. Corporate ownership is indicated by the document context; external redistribution and production font licensing were not independently verified. |
| `/Users/mayadeen/Downloads/MAYADEEN-BRANDMARK.pdf` | 1 | Standalone Mayadeen brandmark with a purple treatment | Authoritative corporate asset | Used as an internal-review asset. The supplied PDF does not contain a separate rights statement or official color-code declaration. |
| `/Users/mayadeen/Downloads/شعار ميادين.pdf` | 1 | Standalone Arabic Mayadeen logo variant with a light purple treatment | Authoritative corporate asset | Used as an internal-review asset. External redistribution status was not established from the file. |
| `/Users/mayadeen/Downloads/حفل تدشين حدائق الملك عبدالله (كاقا)V03 copy.pdf` | 1-8, 10, 14, 20, 30-32 | Garden and architectural imagery, botanical forms, ivory space, green and gold event identity, pale mint surfaces, and a staged narrative progression | Candidate event source | Presentation imagery is `review-only`. The PDF does not state production reuse or redistribution rights. |

Representative pages were rendered locally before design decisions were made. No source was interpreted from memory alone.

## Render-sampled colors

The values below are pixel samples from local PDF renders. They are reproducible review inputs, not claims of official brand specifications.

| Sample | Value | Sample source | Classification in UX.1B | Permitted use |
| --- | --- | --- | --- | --- |
| Mayadeen purple | `#503399` | Corporate guide, representative page 9 render | Candidate implementation token from an authoritative source | Mayadeen shell primary action and restrained identity accent |
| Mayadeen turquoise | `#5CC3BE` | Corporate guide, representative page 9 render | Candidate implementation token from an authoritative source | Restrained accent; never a truth or severity state |
| Mayadeen light purple | `#7256CE` | Corporate guide render | Review-only sample | Comparison and source review only |
| Mayadeen cover navy-purple | `#251847` | Corporate guide cover render | Review-only sample | Source comparison; not adopted as the global application background |
| Brandmark render purple | `#665EC7` | Brandmark page 1 render | Review-only sample | Preserve the supplied asset; do not recolor it by this value |
| Arabic logo render purple | `#876BF2` | Arabic logo page 1 render | Review-only sample | Preserve the supplied asset; do not recolor it by this value |
| KAP garden green | `#46803F` | KAP presentation render | Candidate event token | KAP identity only; never `verified` or `ready` |
| KAP deep natural green | `#006E3F` | KAP presentation render | Candidate event token | KAP hero and narrative surfaces |
| KAP warm gold | `#D19400` | KAP presentation render | Candidate event token | KAP emphasis only; never `warning` |
| KAP pale mint | `#F2F8F5` | KAP presentation render | Candidate event token | KAP soft surfaces |
| KAP ivory | `#FCF8EF` | KAP presentation render | Candidate event token | KAP page surface |

## Review assets

| Repository asset | Origin | Status | Use boundary |
| --- | --- | --- | --- |
| `public/visual-direction/mayadeen-brandmark-review.png` | Render of `MAYADEEN-BRANDMARK.pdf`, page 1 | Authoritative shape, internal-review raster derivative | Founder-review workspace only |
| `public/visual-direction/mayadeen-arabic-logo-review.png` | Render of `شعار ميادين.pdf`, page 1 | Authoritative shape, internal-review raster derivative | Founder-review workspace only |
| `public/visual-direction/kap-cover-review.png` | Render of KAP presentation, page 1 | Candidate, `review-only` | KAP reference screens only; not a reusable platform image |
| `public/visual-direction/kap-botanical-review.png` | Render of KAP presentation, representative botanical page | Candidate, `review-only` | KAP narrative and projection-preview reference only |

## Authority rules

- No sampled HEX value is described as an official Mayadeen or KAP color code.
- Mayadeen corporate assets do not become event assets, and KAP assets do not become Mayadeen Core assets.
- KAP presentation images cannot leak into another event theme or the neutral fallback.
- `review-only` assets must be replaced or explicitly cleared before any production rollout.
- Truth, trust, readiness, and severity remain governed by platform semantics rather than either brand palette.
