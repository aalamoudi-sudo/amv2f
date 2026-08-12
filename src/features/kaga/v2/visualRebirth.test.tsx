import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VisualMuseum } from '../interactive/VisualMuseum';
import { KagaV2Intro } from './KagaV2Intro';

describe('KAGA Visual Rebirth prototype', () => {
  it('opens as a source-backed cinematic world without application chrome', () => {
    render(
      <KagaV2Intro
        onEnterEvent={vi.fn()}
        onExploreGardens={vi.fn()}
        onWatchDelight={vi.fn()}
      />,
    );

    const opening = screen.getByRole('region', { name: 'تدشين حدائق الملك عبدالله' });
    expect(opening).toHaveAttribute('data-visual-rebirth', 'opening');
    expect(screen.getByTestId('source-native-opening')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('تدشينحدائقالملك عبدالله');
  });

  it('lets the Visual Museum render own the screen until angles are requested', () => {
    render(
      <VisualMuseum
        environments={[{
          id: 'vip',
          title: 'منطقة كبار الشخصيات',
          description: 'مشهد مصدره العرض الأصلي',
          source: { pdfPages: [85] },
          images: [
            { src: '/one.webp', alt: 'المشهد الأول', source: { pdfPages: [85] } },
            { src: '/two.webp', alt: 'المشهد الثاني', source: { pdfPages: [86] } },
          ],
        }]}
      />,
    );

    const museum = screen.getByTestId('visual-museum');
    const strip = museum.querySelector('.kaga-museum-strip');
    expect(museum).toHaveAttribute('data-visual-rebirth', 'museum');
    expect(screen.getByTestId('visual-museum-world')).toBeInTheDocument();
    expect(strip).toHaveAttribute('data-visible', 'false');
    expect(strip).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'زوايا المشهد' }));
    expect(strip).toHaveAttribute('data-visible', 'true');
    expect(strip).toHaveAttribute('aria-hidden', 'false');
  });
});
