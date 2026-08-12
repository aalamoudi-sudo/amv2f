import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { ReadOnlyDaySpatialPreview } from './ReadOnlyDaySpatialPreview';

describe('ReadOnlyDaySpatialPreview', () => {
  it('uses the frozen V2 source masterplan and the selected day registered route geometry', () => {
    const { container } = render(<ReadOnlyDaySpatialPreview journeyIds={['prince']} titleAr="اليوم الثالث" />);

    expect(screen.getByTestId('v2-day-masterplan-base')).toHaveAttribute(
      'href',
      '/kaga/spatial-registered-v1/executive-masterplan.svg',
    );
    expect(container.querySelector('[data-journey-id="prince"] .kaga-v2-day-map-preview__route')).toHaveAttribute(
      'd',
      registeredJourneyById.prince.pathD,
    );
    expect(container.querySelectorAll('[data-journey-id="prince"] .kaga-v2-day-map-preview__stop')).toHaveLength(
      registeredJourneyById.prince.stops.length,
    );
  });

  it('shows the source-true base without inventing a route when the day has none', () => {
    const { container } = render(<ReadOnlyDaySpatialPreview titleAr="اليوم الثاني" />);
    expect(screen.getByTestId('v2-day-masterplan-base')).toBeInTheDocument();
    expect(container.querySelectorAll('.kaga-v2-day-map-preview__route')).toHaveLength(0);
  });

  it('integrates a clean source visual with the frozen spatial preview', () => {
    render(
      <ReadOnlyDaySpatialPreview
        titleAr="اليوم الثالث"
        journeyIds={['prince']}
        sourceVisualPath="/kaga/assets/gallery/vip/angle-01-p079.webp"
        sourceVisualAltAr="مشهد منطقة كبار الشخصيات"
      />,
    );

    expect(screen.getByRole('img', { name: 'مشهد منطقة كبار الشخصيات' })).toHaveAttribute(
      'src',
      '/kaga/assets/gallery/vip/angle-01-p079.webp',
    );
    expect(screen.getByTestId('v2-day-masterplan-base')).toHaveAttribute(
      'href',
      '/kaga/spatial-registered-v1/executive-masterplan.svg',
    );
  });
});
