import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { eventDays } from './data/eventDays';
import { illustratedMapReadings, preserveCanonicalPointAcrossReadings } from './illustratedMap';
import { legendaryStories } from './legendary/journeys';
import { LegendarySystemExperience } from './legendary/LegendarySystemExperience';
import { legendaryLensLabels } from './legendary/legendaryLensEngine';
import { useLegendarySystemStore } from './legendary/legendarySystemStore';

const expectedJourneys = ['workers', 'mayor', 'prince', 'guests', 'mayorMedia', 'media'];

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

describe('KAGA FINAL EXPERIENCE production integration', () => {
  afterEach(() => {
    cleanup();
    act(() => useLegendarySystemStore.getState().reset());
  });

  it('keeps six independently authored, source-backed journey stories', () => {
    expect(Object.keys(legendaryStories)).toEqual(expectedJourneys);
    const signatures = Object.values(legendaryStories).map((story) => story.map((beat) => beat.id).join('|'));
    expect(new Set(signatures).size).toBe(6);
    Object.values(legendaryStories).flat().forEach((beat) => {
      expect(beat.source.length).toBeGreaterThan(0);
      expect(beat.source.every((source) => source.pdfPages.length > 0)).toBe(true);
    });
  });

  it('keeps the four lenses and four source-backed day overlay states', () => {
    expect(Object.keys(legendaryLensLabels)).toEqual(['story', 'place', 'guest', 'experience']);
    expect(eventDays.map((day) => day.journeyIds ?? [])).toEqual([
      ['workers', 'mayor'],
      [],
      ['prince', 'guests'],
      ['mayorMedia', 'media'],
    ]);
  });

  it('keeps all three map readings in the same canonical coordinate space', () => {
    const point = [1015.727, 593.321] as const;
    expect(illustratedMapReadings.map((reading) => reading.id)).toEqual(['masterplan', 'illustrated', 'story']);
    illustratedMapReadings.forEach((reading) => {
      expect(preserveCanonicalPointAcrossReadings(point, reading.id)).toBe(point);
    });
  });

  it('never exposes raw Rhino or Illustrator source files through public runtime assets', () => {
    const runtimeFiles = walk('public/kaga');
    expect(runtimeFiles.some((path) => /\.(3dm|ai)$/i.test(path))).toBe(false);
    expect(runtimeFiles.some((path) => path.endsWith('Rev06-King-Abdullah-Gardens-Inauguration.pdf'))).toBe(true);
  });

  it('keeps Evidence Mode unavailable in the default executive session', () => {
    render(<LegendarySystemExperience onExit={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'استكشف الحدث' }));
    expect(screen.queryByRole('button', { name: 'الدليل' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('legendary-project-evidence')).not.toBeInTheDocument();
  });

  it('retains Evidence Mode for explicitly enabled internal provenance review', () => {
    render(<LegendarySystemExperience evidenceModeAvailable onExit={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'استكشف الحدث' }));
    fireEvent.click(screen.getByRole('button', { name: 'الدليل' }));
    expect(screen.getByTestId('legendary-project-evidence')).toContainHTML('مقترح تدشين حدائق الملك عبدالله');
  });

  it('defines the isolated absolute-final Render output without changing historical build targets', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    const renderConfig = readFileSync('render.yaml', 'utf8');
    expect(packageJson.scripts['build:kaga:production']).toContain('VITE_KAGA_FINAL=true');
    expect(packageJson.scripts['build:kaga:absolute-final']).toContain('VITE_KAGA_ABSOLUTE_FINAL=true');
    expect(viteConfig).toContain("'dist-kaga-final'");
    expect(viteConfig).toContain("'dist-kaga-absolute-final'");
    expect(renderConfig).toContain('branch: kaga-absolute-final');
    expect(renderConfig).toContain('staticPublishPath: ./dist-kaga-absolute-final');
  });
});
