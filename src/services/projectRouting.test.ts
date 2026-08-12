import { describe, expect, it } from 'vitest';
import { kapProjectId, projectRegistry, referenceExhibitionProjectId, referenceFestivalProjectId } from '../data/projectRegistry';
import { projectPreferenceStorageKey, readProjectPreferences } from './projectPreferences';
import { projectRouteUrl, resolveProjectShellRoute } from './projectRouting';

function url(search: string): URL {
  return new URL(`http://localhost/${search}`);
}

describe('project URL and local preference precedence', () => {
  it('uses an explicit URL project over the locally remembered project', () => {
    const storage = { getItem: (key: string) => key === projectPreferenceStorageKey ? JSON.stringify({ lastProjectId: referenceExhibitionProjectId, recentProjectIds: [referenceExhibitionProjectId], lastOpenedAtByProject: {} }) : null };
    expect(readProjectPreferences(storage, projectRegistry).lastProjectId).toBe(referenceExhibitionProjectId);
    const route = resolveProjectShellRoute(url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&workspace=executive`), projectRegistry);
    expect(route.projectId).toBe(kapProjectId);
    expect(route.eventId).toBe('EVENT-KAP-OPENING-2026');
    expect(route.venueId).toBe('VENUE-KAP-001');
  });

  it('rejects an invalid last-project preference', () => {
    const storage = { getItem: () => JSON.stringify({ lastProjectId: 'PROJECT-MISSING', recentProjectIds: ['PROJECT-MISSING'], lastOpenedAtByProject: { 'PROJECT-MISSING': '2026-07-20T00:00:00.000Z' } }) };
    expect(readProjectPreferences(storage, projectRegistry)).toEqual({ lastProjectId: null, recentProjectIds: [], lastOpenedAtByProject: {} });
  });

  it('does not silently fall back to a demo when project context is missing', () => {
    const route = resolveProjectShellRoute(url('?workspace=executive'), projectRegistry);
    expect(route.workspace).toBe('portfolio');
    expect(route.projectId).toBeNull();
    expect(route.errorCode).toBe('missing-project');
  });

  it('resolves a copied project deep link and rejects cross-project event IDs', () => {
    expect(resolveProjectShellRoute(url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&workspace=spatial`), projectRegistry)).toMatchObject({ workspace: 'spatial', projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', errorCode: null });
    expect(resolveProjectShellRoute(url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&workspace=spatial-command&mode=experience`), projectRegistry)).toMatchObject({ workspace: 'spatial-command', projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', venueId: 'VENUE-KAP-001', errorCode: null });
    expect(resolveProjectShellRoute(url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&workspace=spatial-authoring`), projectRegistry)).toMatchObject({ workspace: 'spatial-authoring', projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', errorCode: null });
    expect(resolveProjectShellRoute(url(`?project=${kapProjectId}&event=EVENT-EXHIBITION-DEMO-001&workspace=executive`), projectRegistry)).toMatchObject({ workspace: 'portfolio', errorCode: 'invalid-event' });
  });

  it('returns archived projects to the neutral portfolio', () => {
    expect(resolveProjectShellRoute(url(`?project=${referenceFestivalProjectId}&event=EVENT-FESTIVAL-DEMO-001&workspace=executive`), projectRegistry)).toMatchObject({ workspace: 'portfolio', projectId: null, errorCode: 'archived-project' });
  });

  it('rejects a venue that does not belong to the selected project and event', () => {
    expect(resolveProjectShellRoute(url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&venue=VENUE-EXHIBITION-DEMO-001&workspace=spatial-authoring`), projectRegistry)).toMatchObject({
      workspace: 'portfolio',
      projectId: null,
      venueId: null,
      errorCode: 'invalid-venue'
    });
  });

  it('preserves the active venue and explicit source layer in spatial deep links', () => {
    const current = url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&workspace=executive`);
    const next = projectRouteUrl(current, {
      workspace: 'spatial-authoring',
      projectId: kapProjectId,
      eventId: 'EVENT-KAP-OPENING-2026'
    }, {
      sourceLayerId: 'SOURCE-LAYER-KAP-WORKING-CAD',
      candidateEntityId: 'ENTITY-KAP-OP-001'
    });

    expect(next.searchParams.get('project')).toBe(kapProjectId);
    expect(next.searchParams.get('event')).toBe('EVENT-KAP-OPENING-2026');
    expect(next.searchParams.get('venue')).toBe('VENUE-KAP-001');
    expect(next.searchParams.get('workspace')).toBe('spatial-authoring');
    expect(next.searchParams.get('sourceLayer')).toBe('SOURCE-LAYER-KAP-WORKING-CAD');
    expect(next.searchParams.get('candidateEntity')).toBe('ENTITY-KAP-OP-001');
  });

  it('writes canonical spatial-command mode state and only keeps journey steps in journey mode', () => {
    const current = url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&workspace=executive&journeyStep=stale`);
    const journey = projectRouteUrl(current, {
      workspace: 'spatial-command',
      projectId: kapProjectId,
      eventId: 'EVENT-KAP-OPENING-2026'
    }, {
      spatialMode: 'journey',
      journeyStepId: 'arrival',
      sourceLayerId: 'SOURCE-LAYER-KAP-CANDIDATE-ZONING',
      viewMode: 'presentation',
      editingMode: 'candidate-anchors',
      focusMode: true,
      savedViewId: 'VIEW-KAP-001'
    });
    expect(journey.searchParams.get('mode')).toBe('journey');
    expect(journey.searchParams.get('journeyStep')).toBe('arrival');
    expect(journey.searchParams.get('viewMode')).toBe('presentation');
    expect(journey.searchParams.get('edit')).toBe('candidate-anchors');
    expect(journey.searchParams.get('focus')).toBe('map');
    expect(journey.searchParams.get('savedView')).toBe('VIEW-KAP-001');

    const executive = projectRouteUrl(journey, {
      workspace: 'spatial-command',
      projectId: kapProjectId,
      eventId: 'EVENT-KAP-OPENING-2026'
    }, {
      spatialMode: 'executive'
    });
    expect(executive.searchParams.get('mode')).toBe('executive');
    expect(executive.searchParams.has('journeyStep')).toBe(false);
    expect(executive.searchParams.has('candidateEntity')).toBe(false);
  });

  it('removes incompatible spatial state when switching projects or workspaces', () => {
    const current = url(`?project=${kapProjectId}&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&workspace=spatial-command&mode=journey&sourceLayer=SOURCE-LAYER-KAP-CANDIDATE-ZONING&candidateEntity=ENTITY-KAP-OP-006&journeyStep=ages&viewMode=presentation`);
    const next = projectRouteUrl(current, {
      workspace: 'executive',
      projectId: referenceExhibitionProjectId,
      eventId: 'EVENT-EXHIBITION-DEMO-001'
    }, {
      venueId: 'VENUE-EXHIBITION-DEMO-001'
    });
    expect(next.searchParams.get('project')).toBe(referenceExhibitionProjectId);
    expect(next.searchParams.get('venue')).toBe('VENUE-EXHIBITION-DEMO-001');
    ['mode', 'sourceLayer', 'candidateEntity', 'journeyStep', 'viewMode', 'edit', 'focus', 'savedView'].forEach((parameter) => {
      expect(next.searchParams.has(parameter)).toBe(false);
    });
  });
});
