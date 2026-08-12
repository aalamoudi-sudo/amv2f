import { useState, type CSSProperties } from 'react';
import { kapExperienceIntelligencePack } from '../../data/experienceIntelligencePacks';
import { conferenceReferenceEventTheme, kapCandidateEventTheme } from '../../data/eventThemePackages';
import type { CommandWorkspace } from '../../ux/commandExperience';
import { ExecutiveCommandReviewScreen } from '../visual-direction/ExecutiveCommandReviewScreen';
import { KapExperienceJourneyReviewScreen } from '../visual-direction/KapExperienceJourneyReviewScreen';
import { SpatialCommandReviewScreen, type SpatialReviewMode } from '../visual-direction/SpatialCommandReviewScreen';
import { VisualReviewDrawer, type VisualReviewDrawerSection } from '../visual-direction/VisualReviewDrawer';
import '../visual-direction/visualDirection.css';

function kapWorkspaceStyle(): CSSProperties {
  const theme = kapCandidateEventTheme;
  return {
    '--vd-brand-primary': theme.brandTokens.primaryAction.background,
    '--vd-brand-primary-ink': theme.brandTokens.primaryAction.foreground,
    '--vd-brand-accent': theme.brandTokens.accent.background,
    '--vd-brand-accent-ink': theme.brandTokens.accent.foreground,
    '--vd-focus': theme.brandTokens.focus.background,
    '--vd-page': theme.eventTokens.page.background,
    '--vd-page-ink': theme.eventTokens.page.foreground,
    '--vd-event-primary': theme.eventTokens.primary.background,
    '--vd-event-primary-ink': theme.eventTokens.primary.foreground,
    '--vd-event-secondary': theme.eventTokens.secondary.background,
    '--vd-event-secondary-ink': theme.eventTokens.secondary.foreground,
    '--vd-event-accent': theme.eventTokens.accent.background,
    '--vd-event-accent-ink': theme.eventTokens.accent.foreground,
    '--vd-event-soft': theme.eventTokens.soft.background,
    '--vd-event-soft-ink': theme.eventTokens.soft.foreground,
    '--vd-spatial-canvas': theme.spatialTokens.canvas.background,
    '--vd-spatial-canvas-ink': theme.spatialTokens.canvas.foreground,
    '--vd-spatial-node': theme.spatialTokens.logicalNode.background,
    '--vd-spatial-node-ink': theme.spatialTokens.logicalNode.foreground,
    '--vd-spatial-link': theme.spatialTokens.relationship.background,
    '--vd-spatial-link-ink': theme.spatialTokens.relationship.foreground
  } as CSSProperties;
}

export function KapProjectWorkspace({ workspace, onNavigate }: { workspace: Extract<CommandWorkspace, 'executive' | 'spatial' | 'experience'>; onNavigate: (workspace: CommandWorkspace) => void }) {
  const [spatialMode, setSpatialMode] = useState<SpatialReviewMode>('2d');
  const [selectedPointId, setSelectedPointId] = useState(kapExperienceIntelligencePack.experiencePoints[0]!.experiencePointId);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [drawer, setDrawer] = useState<VisualReviewDrawerSection | null>(null);
  const openDrawer = (section: VisualReviewDrawerSection) => setDrawer(section);
  return <div data-testid="kap-project-workspace" data-theme-id={kapCandidateEventTheme.themeId} className="project-kap-workspace visual-direction-review" style={kapWorkspaceStyle()} lang="ar" dir="rtl">
    {workspace === 'executive' ? <button data-testid="executive-rehearsal-open" type="button" className="kap-rehearsal-entry" onClick={() => onNavigate('experience-rehearsal')}>قيادة البروفة الرقمية لأربعة أيام</button> : null}
    <div className="project-kap-content">
      {workspace === 'executive' ? <ExecutiveCommandReviewScreen theme={kapCandidateEventTheme} pack={kapExperienceIntelligencePack} onOpenGovernance={() => openDrawer('sources')} onOpenSpatial={() => onNavigate('spatial')} onOpenJourney={() => onNavigate('experience')} /> : null}
      {workspace === 'spatial' ? <SpatialCommandReviewScreen theme={kapCandidateEventTheme} pack={kapExperienceIntelligencePack} mode={spatialMode} selectedPointId={selectedPointId} onModeChange={setSpatialMode} onPointChange={setSelectedPointId} onOpenTechnicalDetails={() => openDrawer('sources')} onOpenSpatialAuthoring={() => onNavigate('spatial-authoring')} /> : null}
      {workspace === 'experience' ? <KapExperienceJourneyReviewScreen theme={kapCandidateEventTheme} pack={kapExperienceIntelligencePack} currentIndex={journeyIndex} onIndexChange={setJourneyIndex} onOpenGovernance={() => openDrawer('sources')} /> : null}
    </div>
    <VisualReviewDrawer open={drawer !== null} section={drawer ?? 'sources'} theme={kapCandidateEventTheme} comparisonTheme={conferenceReferenceEventTheme} pack={kapExperienceIntelligencePack} onSectionChange={setDrawer} onClose={() => setDrawer(null)} />
  </div>;
}
