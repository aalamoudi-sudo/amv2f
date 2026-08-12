import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KagaV2Intro } from '../v2/KagaV2Intro';
import {
  PresentationContourFrame,
  presentationFidelity,
} from '.';

describe('presentation-fidelity visual contract', () => {
  it('keeps the audited source palette and hairline gold rule explicit', () => {
    expect(presentationFidelity.colors.pageIvory).toBe('#F3EBDD');
    expect(presentationFidelity.colors.presentationGreen).toBe('#07594F');
    expect(presentationFidelity.colors.secondaryTeal).toBe('#3F9185');
    expect(presentationFidelity.colors.goldEdge).toBe('#C6A25D');
    expect(presentationFidelity.lines.goldKeyline).toBe('1px');
    expect(presentationFidelity.typography.family).toContain('Geeza Pro');
    expect(presentationFidelity.typography.family).toContain('Tahoma');
  });

  it('renders authored native-vector contour variants without flattening content', () => {
    const { container } = render(
      <PresentationContourFrame
        variant="hero"
        ariaLabel="إطار العرض"
        visual={<img src="/source.jpg" alt="المشهد" />}
        content={<h1>العنوان</h1>}
      />,
    );

    expect(screen.getByRole('region', { name: 'إطار العرض' })).toHaveAttribute('data-presentation-contour', 'hero');
    expect(screen.getByRole('region', { name: 'إطار العرض' })).toHaveAttribute('data-presentation-archetype', 'editorial');
    expect(screen.getByRole('img', { name: 'المشهد' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'العنوان' })).toBeInTheDocument();
    expect(container.querySelector('.kaga-pf-curve__ribbon')).toHaveAttribute('d');
    expect(container.querySelector('.kaga-pf-curve__companion')).toHaveAttribute('d');
    expect(container.querySelector('.kaga-pf-curve__gold')).toHaveAttribute('pathLength', '1');
  });

  it.each([
    ['hero', 'editorial'],
    ['chapter', 'event-day'],
    ['map', 'route-map'],
    ['cinematic', 'render-cinematic'],
  ] as const)('binds the %s contour to its source page archetype', (variant, archetype) => {
    const { container } = render(
      <PresentationContourFrame variant={variant} visual={<span>صورة</span>} content={<span>محتوى</span>} />,
    );
    expect(container.querySelector(`[data-presentation-contour="${variant}"]`)).toBeInTheDocument();
    expect(container.querySelector(`[data-presentation-archetype="${archetype}"]`)).toBeInTheDocument();
    expect(container.querySelectorAll('svg path')).toHaveLength(3);
  });

  it('opens with a full-bleed cinematic source image before revealing the editorial contour', () => {
    render(<KagaV2Intro onEnterEvent={() => undefined} onExploreGardens={() => undefined} />);
    const opening = screen.getByTestId('source-native-opening');
    expect(opening).toContainElement(opening.querySelector('img'));
    expect(within(opening).getByText('تدشين', { exact: false })).toBeInTheDocument();
    expect(opening.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.getByTestId('presentation-fidelity-intro')).toContainElement(
      screen.getByRole('button', { name: 'ابدأ الرحلة' }),
    );
  });
});
