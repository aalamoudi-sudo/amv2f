import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IllustratedMapLayers } from '../illustratedMap/IllustratedMapLayers';
import { illustratedMapRegistration } from '../illustratedMap/illustratedMapRegistration';
import { executiveDelightActs, kineticDramaturgyStates } from './executiveDelightStory';

describe('KAGA final cinematic polish contract', () => {
  it('assigns compositing roles without changing the canonical registration transform', () => {
    const markup = renderToStaticMarkup(<svg><IllustratedMapLayers reading="illustrated" /></svg>);
    expect(markup).toContain(`transform="${illustratedMapRegistration.canonicalTransform.svgMatrix}"`);
    expect(markup.match(/data-depth-plane="background"/g)).toHaveLength(1);
    expect(markup.match(/data-depth-plane="midground-base"/g)).toHaveLength(2);
    expect(markup.match(/data-depth-plane="midground-raised"/g)).toHaveLength(2);
    expect(markup).not.toContain('translateZ');
  });

  it('keeps the approved 84–92 second Royal timing and exposes only its final title', () => {
    expect(executiveDelightActs.at(-1)).toMatchObject({ id: 'tease', startsAtMs: 84_000, endsAtMs: 92_000 });
    expect(kineticDramaturgyStates.slice(-2).map(({ id, startsAtMs, endsAtMs }) => ({ id, startsAtMs, endsAtMs }))).toEqual([
      { id: 'royal-trace', startsAtMs: 84_000, endsAtMs: 88_000 },
      { id: 'royal-hold', startsAtMs: 88_000, endsAtMs: 92_000 },
    ]);
    const componentSource = readFileSync('src/features/kaga/delight/ExecutiveDelight90s.tsx', 'utf8');
    expect(componentSource).toContain('<h2>لحظة التدشين</h2>');
    expect(componentSource).not.toContain('ويبقى فصلٌ آخر');
    expect(componentSource).not.toContain('اكتشفها لاحقًا');
  });

  it('never applies blur to the Arabic UI typography', () => {
    const polishCss = readFileSync('src/features/kaga/delight/finalCinematicPolish.css', 'utf8');
    expect(polishCss).not.toMatch(/blur\s*\(/);
    expect(polishCss).toContain(".kaga-delight-tease__title h2");
  });

  it('keeps the executive journey title inside a presentation-safe width and restores an exit after the final hold', () => {
    const polishCss = readFileSync('src/features/kaga/delight/finalCinematicPolish.css', 'utf8');
    const componentSource = readFileSync('src/features/kaga/delight/ExecutiveDelight90s.tsx', 'utf8');
    expect(polishCss).toContain('width: min(25rem, 25vw)');
    expect(polishCss).toMatch(/\.kaga-delight-map-world\s*\{\s*overflow:\s*clip/);
    expect(polishCss).toContain(".kaga-delight[data-finished='true'][data-act='tease'] .kaga-delight-director");
    expect(componentSource).toContain('data-finished={finished}');
  });
});
