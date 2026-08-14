import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { journeyById } from '../data/journeys';
import { registeredJourneyById } from '../spatial/registeredJourneys';
import { GuestJourneyPanel } from './GuestJourneyPanel';

const journey = registeredJourneyById.guests;

const renderPanel = (overrides: Partial<React.ComponentProps<typeof GuestJourneyPanel>> = {}) => {
  const props: React.ComponentProps<typeof GuestJourneyPanel> = {
    journey,
    activeStop: journey.stops[0]!,
    selectedStopIndex: 0,
    progress: 0,
    playing: false,
    sourceFidelityMode: true,
    onSourceFidelityModeChange: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onRestart: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onSelectStop: vi.fn(),
    onSetProgress: vi.fn(),
    onDiscoverPlace: vi.fn(),
    onOpenExperience: vi.fn(),
    onWatchStory: vi.fn(),
    onReturnToProject: vi.fn(),
    journeyChoices: [{ id: 'guests', titleAr: journey.titleAr }],
    onSelectJourney: vi.fn(),
    ...overrides,
  };
  render(<GuestJourneyPanel {...props} />);
  return props;
};

describe('Mythic Guest Journey presentation', () => {
  it('shows the entire A-L rail and the five-second hierarchy', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'رحلة الضيوف' })).toBeInTheDocument();
    expect(screen.getByText(journeyById.guests.window)).toBeInTheDocument();
    const rail = screen.getByRole('navigation', { name: 'تسلسل محطات رحلة الضيوف' });
    expect(rail).toHaveAttribute('data-continuous-sequence', 'A-L');
    expect(screen.getAllByRole('button', { name: /^[A-L]،/ }).map((button) => button.getAttribute('aria-label')?.slice(0, 1))).toEqual(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    );
    expect(screen.getByText('المحطة الحالية')).toBeInTheDocument();
    expect(screen.getByText('التالي')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ابدأ الرحلة' })).toBeInTheDocument();
    expect(screen.getByLabelText('تقدم رحلة الضيوف')).toBeInTheDocument();
    expect(document.querySelectorAll('svg[data-transport-mode]').length).toBeGreaterThanOrEqual(16);
    expect(document.body.textContent).not.toMatch(/[🚗⛳🚶]/u);
  });

  it('uses source state for current, completed, and next rail stops without color-only meaning', () => {
    renderPanel({ activeStop: journey.stops[4]!, selectedStopIndex: 4, progress: journey.stops[4]!.pathProgress });
    expect(screen.getByRole('button', { name: /E، الحديقة البليوسينية/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /D، بداية الجولة/ })).toHaveTextContent('✓');
    expect(screen.getByRole('button', { name: /F، ممر العصور/ })).toHaveAttribute('data-state', 'next');
  });

  it('starts playback, keeps source segmentation as normal, and launches the existing story engine', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الرحلة' }));
    fireEvent.click(screen.getByRole('button', { name: 'عرض المسار الموحّد' }));
    fireEvent.click(screen.getByRole('button', { name: 'شاهد رحلة الضيوف' }));
    expect(props.onPlay).toHaveBeenCalledOnce();
    expect(props.onSourceFidelityModeChange).toHaveBeenCalledWith(false);
    expect(props.onWatchStory).toHaveBeenCalledOnce();
  });

  it('keeps deeper stop detail behind progressive disclosure', () => {
    const stop = journey.stops[2]!;
    renderPanel({ activeStop: stop, selectedStopIndex: 2, progress: stop.pathProgress });
    const more = screen.getByText('اعرف أكثر').closest('details');
    expect(more).not.toHaveAttribute('open');
    expect(within(more as HTMLElement).getByText(/مجسم الحدائق/)).toBeInTheDocument();
  });

  it('reveals only source-linked place and experience actions', () => {
    const stop = journey.stops[2]!;
    const props = renderPanel({ activeStop: stop, selectedStopIndex: 2, progress: stop.pathProgress, experienceId: 'royal-arrival' });
    fireEvent.click(screen.getByRole('button', { name: /شاهد التجربة/ }));
    expect(props.onOpenExperience).toHaveBeenCalledWith('royal-arrival');
    expect(screen.queryByRole('button', { name: /اكتشف الموقع/ })).not.toBeInTheDocument();
  });

  it('presents a quiet ending with deterministic restart and exit actions', () => {
    const props = renderPanel({ activeStop: journey.stops.at(-1)!, selectedStopIndex: 11, progress: 1 });
    expect(screen.getByTestId('mythic-guest-ending')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة الرحلة' }));
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى المشروع' }));
    expect(props.onRestart).toHaveBeenCalledOnce();
    expect(props.onReturnToProject).toHaveBeenCalledOnce();
  });
});
