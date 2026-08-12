import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { findDigitalRehearsalPlan } from '../../data/digitalRehearsalPlans';
import { declutterExperienceMarkers, findExperienceTwinConfiguration } from '../../data/experienceTwinConfigurations';
import { createExperienceSelection } from '../../services/experienceSelection';
import { deriveRouteDesignConvergence } from '../../services/experienceRouteDesignConvergence';
import { projectExperienceTruth } from '../../services/experienceProjection';
import { resolveMissionContext } from '../../services/missionContext';
import { deriveMissionGraphProjection, deriveMissionTruthContext, resolveMissionMomentId } from '../../services/missionGraphProjection';
import type { MissionCanvasRouteState, MissionContext, MissionLens } from '../../types/missionControl';
import { MissionCanvas } from './MissionCanvas';

const configuration = findExperienceTwinConfiguration('PROJECT-KAP-OPENING-2026', 'EVENT-KAP-OPENING-2026', 'VENUE-KAP-001')!;
const location = new URL('http://local.test/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001&mission=canvas&missionView=world&missionPresentation=command&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E&entity=ENTITY-KAP-OP-006&zone=ZONE-AGES-TUNNEL-001');
const selection = createExperienceSelection(configuration.pack, location, configuration.storyMapDefinition, configuration.sceneRegistry, configuration.designExperience, configuration.operationalJourneyPackage);
const routeProjection = deriveRouteDesignConvergence(selection, configuration.operationalJourneyPackage, configuration.designExperience);
const rehearsalPlan = findDigitalRehearsalPlan(selection.projectId, selection.eventId);
const truthContext = deriveMissionTruthContext(configuration.pack, selection, routeProjection, configuration.sourceStatusAr);
const operationalProjection = projectExperienceTruth(configuration.pack, {
  readinessDisposition: configuration.readinessDisposition,
  readinessExplanationAr: configuration.readinessExplanationAr,
  knownDecisionIds: [],
  knownEvidenceIds: [],
  sourceStatusAr: configuration.sourceStatusAr
}).find((candidate) => candidate.journeyStepId === selection.journeyStepId) ?? null;
const context = resolveMissionContext({
  pack: configuration.pack,
  selection,
  location,
  momentId: resolveMissionMomentId(rehearsalPlan, selection),
  sceneId: routeProjection.designScene?.sceneId ?? null,
  decisionId: null,
  truthContext
}).context!;
const projection = deriveMissionGraphProjection({
  context,
  pack: configuration.pack,
  selection,
  projectLabelAr: configuration.projectLabelAr,
  eventLabelAr: configuration.eventWindowAr,
  readinessDisposition: configuration.readinessDisposition,
  readinessExplanationAr: configuration.readinessExplanationAr,
  sourceStatusAr: configuration.sourceStatusAr,
  markers: declutterExperienceMarkers(configuration.mapMarkers),
  routeProjection,
  operationalProjection,
  designExperience: configuration.designExperience,
  rehearsalPlan
});

function Harness({
  presentation = 'command',
  initialView = 'world',
  onSelectWaypoint = vi.fn()
}: {
  presentation?: MissionCanvasRouteState['presentation'];
  initialView?: MissionCanvasRouteState['view'];
  onSelectWaypoint?: (waypointId: string) => void;
}) {
  const [lens, setLens] = useState<MissionLens>('experience');
  const [mode, setMode] = useState<MissionContext['missionMode']>('plan');
  const [routeState, setRouteState] = useState<MissionCanvasRouteState>({ enabled: true, view: initialView, presentation, worldSurface: 'living-map', truthOpen: false });
  const currentProjection = { ...projection, context: { ...projection.context, missionLens: lens, missionMode: mode } };
  return (
    <MissionCanvas
      configuration={configuration}
      pack={configuration.pack}
      selection={selection}
      projection={currentProjection}
      routeProjection={routeProjection}
      markers={declutterExperienceMarkers(configuration.mapMarkers)}
      routeState={routeState}
      scene={<div data-testid="mission-test-web3d">Web3D</div>}
      errorAr={null}
      onSelectDay={vi.fn()}
      onSelectPersona={vi.fn()}
      onSelectWaypoint={onSelectWaypoint}
      onOpenDesignScene={vi.fn()}
      onReturnToWorldMap={() => {
        setLens('experience');
        setRouteState((current) => ({ ...current, view: 'world', presentation: 'client' }));
      }}
      onMissionChange={(patch) => {
        if (patch.missionLens) setLens(patch.missionLens);
        if (patch.missionMode) setMode(patch.missionMode);
        setRouteState((current) => ({ ...current, ...patch }));
      }}
    />
  );
}

describe('MissionCanvas', () => {
  it('keeps entity 006 selected while the user traverses all five lenses', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const canvas = screen.getByTestId('mission-canvas');
    const worldStage = screen.getByTestId('mission-world-stage');
    expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
    expect(screen.getByTestId('mission-now-rail').querySelectorAll('article')).toHaveLength(3);

    for (const lens of ['spatial', 'operations', 'decision', 'future', 'experience'] as const) {
      await user.click(screen.getByTestId(`mission-lens-${lens}`));
      expect(screen.getByTestId('mission-world-stage')).toBe(worldStage);
      expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
      expect(canvas).toHaveAttribute('data-mission-lens', lens);
    }
  });

  it('uses V.11 letters on known anchors and keeps unknown geometry in the journey rail', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const point = screen.getByTestId('mission-map-point-E');
    expect(point.querySelector('i')).toHaveTextContent('E');
    expect(point.querySelector('i')).not.toHaveTextContent('5');
    expect(document.querySelector('.mission-story-line')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('mission-journey-expand'));
    expect(screen.getByTestId('mission-journey-rail')).toHaveTextContent('الموقع أو المسار غير محسوم');
    expect(screen.getByTestId('mission-rail-waypoint-O')).toHaveTextContent('O');
    expect(screen.getByTestId('mission-journey-rail')).toHaveTextContent('الرحلة ممتدة حتى O');
    for (const marker of document.querySelectorAll('.mission-map-point i')) {
      expect(marker.textContent).toMatch(/^[A-O]$/);
    }
  });

  it('shows honest live and future boundaries without mutating truth', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByTestId('mission-mode-select'), 'live');
    expect(screen.getByRole('status')).toHaveTextContent('لا يوجد مصدر حي متصل');

    await user.click(screen.getByTestId('mission-lens-future'));
    expect(screen.getByTestId('mission-future-lens')).toHaveTextContent('محرك المحاكاة غير متصل');
    await user.click(screen.getByTestId('mission-open-tangible'));
    expect(screen.getByTestId('mission-tangible-surface')).toHaveAttribute('data-projection-version', projection.context.projectionVersion);
    expect(screen.getByTestId('mission-tangible-surface')).toHaveTextContent('لا يوجد جهاز متصل');
    expect(screen.getByTestId('mission-world-stage')).toBeInTheDocument();
  });

  it('keeps source truth one click away and hides the exception rail in client presentation', async () => {
    const user = userEvent.setup();
    render(<Harness presentation="client" />);
    expect(screen.queryByTestId('mission-now-rail')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('mission-truth-toggle'));
    expect(screen.getByTestId('mission-truth-drawer')).toHaveTextContent('التسجيل الهندسي غير متوفر');
    expect(screen.getByTestId('mission-truth-drawer')).toHaveTextContent('المصدر المرشح لا يثبت الجاهزية');
    expect(screen.getByTestId('mission-truth-drawer')).toHaveTextContent('ثقة المصدر');
    expect(screen.getByTestId('mission-truth-drawer')).toHaveTextContent('ثقة العلاقة');
  });

  it('keeps source numbering behind opaque presentation boundaries until Truth Map is requested', async () => {
    const user = userEvent.setup();
    render(<Harness initialView="entry" />);
    expect(screen.getByTestId('mission-entry-source-mask')).toBeInTheDocument();
    expect(screen.getByTestId('mission-entry-presentation-artwork')).toHaveAttribute('data-derivative-truth', 'presentation-only');
    expect(screen.getByTestId('mission-entry-presentation-artwork')).toHaveAttribute('data-source-marker-mask-count', '11');
    expect(screen.getByTestId('mission-entry-presentation-artwork')).toHaveAttribute('data-source-sha256', '2b34dfa56ae479817d536d56172cb250f0b19efcf324e43c5b9ac15bf5f21772');

    await user.click(screen.getByTestId('mission-start-journey'));
    expect(screen.getByTestId('mission-world-map')).toHaveAttribute('data-source-legend', 'masked');
    expect(screen.getByTestId('mission-source-legend-mask')).toBeInTheDocument();
    expect(screen.getByTestId('mission-living-presentation-artwork')).toHaveAttribute('data-source-marker-mask-count', '11');
    expect(screen.getByTestId('mission-living-presentation-artwork')).toHaveAttribute('data-mask-coordinate-space', 'intrinsic-image-pixels');

    await user.click(screen.getByRole('button', { name: 'خريطة الحقيقة' }));
    expect(screen.getByTestId('mission-world-map')).toHaveAttribute('data-source-legend', 'visible');
    expect(screen.queryByTestId('mission-source-legend-mask')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mission-living-presentation-artwork')).not.toBeInTheDocument();
    expect(screen.getByTestId('mission-truth-source-artwork')).toHaveAttribute('data-source-sha256', '2b34dfa56ae479817d536d56172cb250f0b19efcf324e43c5b9ac15bf5f21772');
  });

  it('reaches O and activates it with keyboard navigation rather than a pointer click', async () => {
    const user = userEvent.setup();
    const onSelectWaypoint = vi.fn();
    render(<Harness onSelectWaypoint={onSelectWaypoint} />);

    await user.click(screen.getByTestId('mission-journey-expand'));
    await user.tab({ shift: true });
    expect(screen.getByTestId('mission-rail-waypoint-O')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByTestId('mission-rail-waypoint-N')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('mission-rail-waypoint-O')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelectWaypoint).toHaveBeenLastCalledWith('JOURNEY-KAP-20261031-WORKERS-V11-WP-O');
  });
});
