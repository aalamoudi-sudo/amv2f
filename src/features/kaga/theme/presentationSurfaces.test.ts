import { describe, expect, it } from 'vitest';
import { presentationArchetypeBySurface, presentationSurfaceAttributes } from './presentationSurfaces';

describe('KAGA presentation surface contract', () => {
  it('maps every PF-2 executive surface to the approved source archetype', () => {
    expect(Object.keys(presentationArchetypeBySurface)).toHaveLength(16);
    expect(presentationArchetypeBySurface.masterplan).toBe('route-map');
    expect(presentationArchetypeBySurface['garden-detail']).toBe('quiet-identity');
    expect(presentationArchetypeBySurface['royal-moment']).toBe('editorial-render');
    expect(presentationArchetypeBySurface['mobile-exhibition']).toBe('quiet-identity');
    expect(presentationArchetypeBySurface['visual-museum']).toBe('editorial-render');
  });

  it('exposes deterministic DOM attributes for visual QA', () => {
    expect(presentationSurfaceAttributes('invitation-experience')).toEqual({
      'data-presentation-surface': 'invitation-experience',
      'data-presentation-archetype': 'quiet-identity',
    });
  });
});
