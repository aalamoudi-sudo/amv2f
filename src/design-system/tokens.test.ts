import { describe, expect, it } from 'vitest';
import { contrastRatio, mayadeenColorTokens } from './tokens';

describe('Mayadeen command visual tokens', () => {
  it('keeps primary and secondary text above AA contrast on core command surfaces', () => {
    expect(contrastRatio(mayadeenColorTokens.textPrimary, mayadeenColorTokens.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(mayadeenColorTokens.textSecondary, mayadeenColorTokens.surface1)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps interactive and spatial tokens distinct from truth and severity systems', () => {
    expect(mayadeenColorTokens.brandPrimary).not.toBe(mayadeenColorTokens.truthVerified);
    expect(mayadeenColorTokens.brandPrimary).not.toBe(mayadeenColorTokens.severityNormal);
    expect(mayadeenColorTokens.truthCandidate).not.toBe(mayadeenColorTokens.truthScenario);
  });

  it('keeps the focus ring visible against the command canvas', () => {
    expect(contrastRatio(mayadeenColorTokens.focusRing, mayadeenColorTokens.canvas)).toBeGreaterThanOrEqual(3);
  });
});
