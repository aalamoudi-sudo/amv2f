import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sourceTheme, sourceThemeCssVariables } from './sourceTheme';

describe('KAGA source-derived theme', () => {
  it('preserves distinct source archetypes rather than one generic palette', () => {
    expect(sourceTheme.routeMap.background).toBe('#F4ECE8');
    expect(sourceTheme.routeMap.markerNavy).toBe('#083C58');
    expect(sourceTheme.routeMap.activeOrange).toBe('#E4701A');
    expect(sourceTheme.editorial.background).toBe('#E6D7C8');
    expect(sourceTheme.editorial.primaryGreen).toBe('#2C544F');
    expect(sourceTheme.editorial.goldHairline).toBe('#B99A5B');
    expect(sourceTheme.cinematic.background).toBe('#271F1C');
    expect(sourceTheme.routeMap.background).not.toBe(sourceTheme.editorial.background);
  });

  it('bridges the sampled source values into the approved presentation surfaces', () => {
    expect(sourceThemeCssVariables['--kaga-pf-page']).toBe(sourceTheme.routeMap.background);
    expect(sourceThemeCssVariables['--kaga-v2-gold']).toBe(sourceTheme.editorial.goldHairline);
    expect(sourceThemeCssVariables['--kaga-source-route-orange']).toBe(
      sourceTheme.routeMap.activeOrange,
    );
  });

  it('records every required PDF audit page', () => {
    const audit = readFileSync('docs/KAGA_SOURCE_COLOR_AUDIT.md', 'utf8');

    for (const page of [1, 7, 26, 85, 99, 108, 111, 115, 118, 126, 132]) {
      expect(audit).toMatch(new RegExp(`\\| ${page} \\|`));
    }
  });
});
