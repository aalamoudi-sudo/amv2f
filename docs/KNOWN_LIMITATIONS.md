# KAGA Executive Experience — Known Limitations

1. **Masterplan geometry is a deterministic presentation reconstruction.** The SVG routes were traced from PDF pages 7, 8, 25, 26, 34, and 35 in one `0 0 1200 900` coordinate system. They are not surveyed coordinates, approved CAD, navigation instructions, or operational route authority.

2. **Real journey metadata and presentation playback are intentionally separate.** The on-screen animation is normalized to an executive presentation duration and must not be read as actual travel time.

3. **Royal and launch sequences are conceptual visualizations.** They communicate approved proposal intent; they are not physical simulations, projection calibration, show-control output, or a claim of implementation accuracy.

4. **The invitation flow has no backend.** It uses no real guest records and issues no real invitation, attendance confirmation, credential, or entry code.

5. **Route comparison was sacrificed before core route reliability.** One route is presented at a time. This follows the timebox priority order and does not affect individual journey playback.

6. **Mobile is functional but not the primary presentation target.** Desktop command-center resolutions received the final visual QA. Narrow mobile layouts are usable at a reduced level but were not accepted as presentation-grade.

7. **Browser fullscreen can require a user gesture or browser permission.** Presenter navigation remains functional if native fullscreen is denied.

8. **The authoritative PDF materially increases the offline package.** The source document is about 73 MB and is retained so the “الوثيقة الأصلية” action works offline. The application assets themselves are optimized WebP files.

9. **Source ambiguities are preserved rather than silently corrected.** These include the two locations shown for day two, unreadable option copy on page 20, ambiguous model units on page 45, and visible footer-number offsets in pages 118–131. See `src/features/kaga/data/sourceAmbiguities.ts` and `docs/SOURCE_MAPPING.md`.

10. **No external systems are connected.** There is no live sensor, camera, crowd, ticketing, guest, or operational feed. The product is an interactive Stage 2 executive presentation, not a live digital twin.
