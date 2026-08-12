# KAGA V2 Source-True baseline

## Isolation from V1

KAGA V2 starts from the immutable Git tag `KAGA-V1-FINAL-APPROVED` but writes
only to the `kaga-v2-source-true` branch and the following V2-specific paths:

- application modules: `src/features/kaga/v2/`
- production output: `dist-kaga-v2/`
- future reports: `reports/kaga-v2/`
- future deliverables: `deliverables/kaga-v2/`

The V1 production build, reports, screenshots, and approved ZIP archives are not
V2 output targets. The V1 client ZIP remains hash-pinned and filesystem-locked.

## Knowledge-guide intake

The first V2 source intake is the 24-page document **الدليل المعرفي لحدائق
الملك عبدالله V3** with SHA-256:

`213204327d095354c11ea02f14052b98bdcb319a5fec253f19a67c110a119738`

It is classified as a supplemental source. This intake does not silently
replace the approved inauguration presentation as the authority for V1 event
days, inauguration routes, or ceremonial experiences.

## Evidence model

- **Evidence:** The document reports more than 2,000,000 m² of garden area,
  more than 1,000,000 plants, and 15 botanical gardens split into 7 indoor and
  8 outdoor gardens (pages 17 and 19).
- **Evidence:** Page 10 names and gives areas for seven indoor gardens.
- **Evidence:** Page 11 names and gives areas for six outdoor gardens.
- **Evidence:** Page 19 repeats the same seven indoor names and six outdoor
  names while also stating the 7/8 total split.
- **Ambiguity `OUTDOOR-GARDEN-COUNT-001`:** The source claims eight outdoor
  gardens but supplies only six names. V2 preserves the claimed count, exposes
  the discrepancy, and does not fabricate the two missing names.

## Verification contract

Focused V2 tests pin the knowledge-guide checksum and page count, verify every
named garden has a positive area and source reference, verify the exact indoor
and named-outdoor counts, preserve `حديقة الخيارات`, and hash-check both
approved V1 archives before V2 validation passes.
