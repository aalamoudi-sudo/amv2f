# Accessibility Review

## Reviewed Controls

- Core text and focus token combinations are checked in `src/design-system/tokens.test.ts` for 4.5:1 body text and 3:1 focus visibility targets.
- Global focus-visible rules use `focus-ring`; no control depends solely on hover.
- Technical drawer and global search retain Escape and Tab focus handling.
- RTL is retained at the document and workspace levels; technical data uses LTR isolation.
- `prefers-reduced-motion: reduce` reduces transitions and animation duration.
- E2E covers Arabic RTL, keyboard focus, reduced motion, long Arabic labels, and no horizontal overflow at 1366×768, 1920×1080, and 2560×1080.

## Limits

This is an engineering accessibility review, not formal WCAG 2.2 certification. Automated contrast checks cannot establish assistive-technology quality, full color-vision usability, zoom/reflow behavior under every browser, or real operator comprehension. Those require future moderated accessibility validation with real operators and assistive technology users.
