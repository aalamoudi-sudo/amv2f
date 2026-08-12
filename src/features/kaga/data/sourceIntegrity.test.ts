import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assetManifest,
  eventDays,
  exhibitionQuestions,
  experiences,
  galleryEnvironments,
  identityApplications,
  invitationSource,
  invitationWorkflow,
  launchLayers,
  royalMomentSource,
  sourceAmbiguities,
  sourceTraceability,
} from './index';
import { journeyById } from './journeys';
import type { SourceReference } from '../types';

function expectSource(source: SourceReference) {
  expect(source.pdfPages.length).toBeGreaterThan(0);
  expect(source.pdfPages.every((page) => Number.isInteger(page) && page >= 1 && page <= 132)).toBe(true);
}

describe('KAGA content source integrity', () => {
  it('models exactly four source-backed days with valid journey links', () => {
    expect(eventDays).toHaveLength(4);
    expect(new Set(eventDays.map((day) => day.id)).size).toBe(4);
    for (const day of eventDays) {
      expectSource(day.source);
      expect(day.title).not.toBe('');
      expect(day.summary).not.toBe('');
      for (const journeyId of day.journeyIds ?? []) expect(journeyId in journeyById).toBe(true);
      for (const entryPoint of day.entryPoints ?? []) {
        expect(entryPoint.source).toBeDefined();
        if (entryPoint.source) expectSource(entryPoint.source);
      }
    }
  });

  it('retains source metadata on all significant interactive content', () => {
    expect(exhibitionQuestions).toHaveLength(7);
    expect(galleryEnvironments.length).toBeGreaterThanOrEqual(8);
    expect(identityApplications.length).toBeGreaterThanOrEqual(8);
    expect(experiences.length).toBeGreaterThanOrEqual(8);
    expect(invitationWorkflow).toHaveLength(6);
    expect(launchLayers.map((layer) => layer.id)).toEqual(['xr', 'drones', 'fireworks']);
    expectSource(royalMomentSource);

    for (const item of experiences) expectSource(item.source);
    for (const question of exhibitionQuestions) expectSource(question.source);
    expectSource(invitationSource);
    for (const step of invitationWorkflow) expect(step.trim()).not.toBe('');
    for (const layer of launchLayers) expectSource(layer.source);
    for (const application of identityApplications) {
      expectSource(application.source);
      for (const proposal of application.proposals) expectSource(proposal.source);
    }
    for (const environment of galleryEnvironments) {
      expectSource(environment.source);
      expect(environment.images.length).toBeGreaterThan(0);
      for (const image of environment.images) expectSource(image.source);
    }
  });

  it('keeps every manifest asset unique and available offline', () => {
    expect(assetManifest.length).toBeGreaterThan(90);
    expect(new Set(assetManifest.map((asset) => asset.id)).size).toBe(assetManifest.length);
    expect(new Set(assetManifest.map((asset) => asset.path)).size).toBe(assetManifest.length);
    for (const asset of assetManifest) {
      expectSource(asset.source);
      expect(asset.alt.trim()).not.toBe('');
      expect(asset.path).toMatch(/^\/kaga\/assets\/.+\.webp$/);
      expect(existsSync(resolve(process.cwd(), 'public', asset.path.slice(1)))).toBe(true);
    }
  });

  it('publishes traceability records and explicitly records source ambiguities', () => {
    expect(sourceTraceability.length).toBeGreaterThan(0);
    expect(sourceAmbiguities.length).toBeGreaterThan(0);
    for (const record of sourceTraceability) expectSource(record.source);
    for (const ambiguity of sourceAmbiguities) {
      expect(ambiguity.description.trim()).not.toBe('');
      expectSource(ambiguity.source);
    }
  });
});
