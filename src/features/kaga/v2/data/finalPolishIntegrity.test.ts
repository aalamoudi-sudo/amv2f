import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectFactById } from '../../knowledge';
import { kagaV2Assets } from '../v2Assets';

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('KAGA V2 final source-image and metric integrity', () => {
  it('stores project scale as structured metric parts for deterministic rendering', () => {
    expect(projectFactById['garden-area']).toMatchObject({
      metricValue: '+2M',
      metricUnitAr: 'م',
      metricExponent: 2,
    });
    expect(projectFactById['plant-count']?.metricValue).toBe('+1M');
    expect(projectFactById['botanical-garden-count']?.metricValue).toBe('15');
  });

  it('locks the clean embedded page-15 royal model and page-20 launch stage assets', () => {
    expect(kagaV2Assets.royalModelClean.source.sourcePages).toEqual([15]);
    expect(kagaV2Assets.launchStageClean.source.sourcePages).toEqual([20]);
    expect(sha256(resolve('public/kaga/assets/v2/royal-model-clean-p015.jpg'))).toBe(
      '88b349c7309ba2eea1c0ac1403a088896e24952dbb0232faab031a76c8e37724',
    );
    expect(sha256(resolve('public/kaga/assets/v2/launch-stage-clean-p020.jpg'))).toBe(
      'b54f7e70b5169b7d7f047bb5c3ebea8f0fde81a396db4608c8970a58415e21f2',
    );
  });

  it('does not use the full PDF-page screenshots in the V2 Crescent, Royal, or Launch surfaces', () => {
    const experience = readFileSync(resolve('src/features/kaga/v2/KagaV2Experience.tsx'), 'utf8');
    const ceremonyCss = readFileSync(resolve('src/features/kaga/experience/experience.css'), 'utf8');
    expect(experience).not.toContain('/kaga/assets/core/royal-moment-p015.webp');
    expect(ceremonyCss).not.toContain("url('/kaga/assets/core/royal-moment-p015.webp')");
    expect(ceremonyCss).not.toContain("url('/kaga/assets/core/launch-show-p020.webp')");
    expect(ceremonyCss).toContain("url('/kaga/assets/v2/royal-model-clean-p015.jpg')");
    expect(ceremonyCss).toContain("url('/kaga/assets/v2/launch-stage-clean-p020.jpg')");
  });
});
