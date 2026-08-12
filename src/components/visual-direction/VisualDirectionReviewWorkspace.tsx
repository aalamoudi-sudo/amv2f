import { FileSearch, LayoutDashboard, Map, PanelsTopLeft } from 'lucide-react';
import { startTransition, useEffect, useState, type CSSProperties } from 'react';
import { conferenceReferenceEventTheme, eventThemePackages, mayadeenShellAssets, neutralFallbackEventTheme } from '../../data/eventThemePackages';
import { kapExperienceIntelligencePack } from '../../data/experienceIntelligencePacks';
import { resolveEventThemePackage } from '../../services/eventThemePackage';
import { ExecutiveCommandReviewScreen } from './ExecutiveCommandReviewScreen';
import { KapExperienceJourneyReviewScreen } from './KapExperienceJourneyReviewScreen';
import { SpatialCommandReviewScreen, type SpatialReviewMode } from './SpatialCommandReviewScreen';
import { VisualReviewDrawer, type VisualReviewDrawerSection } from './VisualReviewDrawer';
import './visualDirection.css';

type VisualReviewScreen = 'executive' | 'spatial' | 'experience';

const reviewScreens = [
  { value: 'executive', label: 'القيادة التنفيذية', caption: 'الأثر والقرار', icon: LayoutDashboard },
  { value: 'spatial', label: 'المكان', caption: '2D · 3D · هجين', icon: Map },
  { value: 'experience', label: 'رحلة الزائر', caption: 'قصة التجربة', icon: PanelsTopLeft }
] as const;

const resolvedKapTheme = resolveEventThemePackage(
  kapExperienceIntelligencePack.eventId,
  eventThemePackages,
  neutralFallbackEventTheme
);

function screenFromLocation(): VisualReviewScreen {
  const value = new URL(window.location.href).searchParams.get('screen');
  return value === 'spatial' || value === 'experience' ? value : 'executive';
}

function spatialModeFromLocation(): SpatialReviewMode {
  const value = new URL(window.location.href).searchParams.get('view');
  return value === '3d' || value === 'hybrid' ? value : '2d';
}

function journeyIndexFromLocation(maximum: number): number {
  const value = Number.parseInt(new URL(window.location.href).searchParams.get('stage') ?? '1', 10);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maximum - 1, value - 1));
}

function reviewStyle(): CSSProperties {
  const theme = resolvedKapTheme.theme;
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

export function VisualDirectionReviewWorkspace() {
  const pack = kapExperienceIntelligencePack;
  const theme = resolvedKapTheme.theme;
  const [screen, setScreen] = useState<VisualReviewScreen>(screenFromLocation);
  const [spatialMode, setSpatialMode] = useState<SpatialReviewMode>(spatialModeFromLocation);
  const [selectedPointId, setSelectedPointId] = useState(pack.experiencePoints[0]!.experiencePointId);
  const [journeyIndex, setJourneyIndex] = useState(() => journeyIndexFromLocation(pack.experiencePoints.length));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState<VisualReviewDrawerSection>('sources');

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'مَيادين | مراجعة Hybrid Light Command';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('workspace', 'visual-direction');
    url.searchParams.set('concept', 'hybrid-light');
    url.searchParams.set('screen', screen);
    if (screen === 'spatial') url.searchParams.set('view', spatialMode);
    else url.searchParams.delete('view');
    if (screen === 'experience') url.searchParams.set('stage', String(journeyIndex + 1));
    else url.searchParams.delete('stage');
    window.history.replaceState({}, '', url);
  }, [journeyIndex, screen, spatialMode]);

  useEffect(() => {
    const syncFromLocation = () => {
      startTransition(() => {
        setScreen(screenFromLocation());
        setSpatialMode(spatialModeFromLocation());
        setJourneyIndex(journeyIndexFromLocation(pack.experiencePoints.length));
      });
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [pack.experiencePoints.length]);

  const changeScreen = (nextScreen: VisualReviewScreen) => {
    startTransition(() => setScreen(nextScreen));
  };

  const openDrawer = (section: VisualReviewDrawerSection) => {
    setDrawerSection(section);
    setDrawerOpen(true);
  };

  const logo = mayadeenShellAssets.brandmark;

  return (
    <main
      data-testid="visual-direction-workspace"
      data-concept="hybrid-light"
      data-theme-resolution={resolvedKapTheme.resolution}
      className="visual-direction-review"
      style={reviewStyle()}
      lang="ar"
      dir="rtl"
    >
      <a className="vd-skip-link" href="#visual-review-content">تخطي إلى شاشة المراجعة</a>
      <header className="vd-shell-header">
        <div className="vd-brand-lockup">
          <img src={logo.uri} alt={logo.altAr} />
          <div>
            <span>Mayadeen Event Intelligence OS</span>
            <small>Visual direction approval prototype</small>
          </div>
        </div>

        <nav className="vd-screen-navigation" aria-label="الشاشات المرجعية الثلاث">
          {reviewScreens.map(({ value, label, caption, icon: Icon }) => (
            <button
              key={value}
              data-testid={`visual-screen-tab-${value}`}
              type="button"
              className={screen === value ? 'is-active' : undefined}
              aria-current={screen === value ? 'page' : undefined}
              onClick={() => changeScreen(value)}
            >
              <Icon aria-hidden="true" />
              <span>{label}<small>{caption}</small></span>
            </button>
          ))}
        </nav>

        <div className="vd-review-actions">
          <span className="vd-founder-state">بانتظار قرار المؤسس</span>
          <button data-testid="visual-review-drawer-open" type="button" onClick={() => openDrawer('sources')}>
            <FileSearch aria-hidden="true" />مرجع السمة
          </button>
        </div>
      </header>

      <div id="visual-review-content" tabIndex={-1} className="vd-screen-host">
        {screen === 'executive' ? (
          <ExecutiveCommandReviewScreen
            theme={theme}
            pack={pack}
            onOpenGovernance={() => openDrawer('governance')}
            onOpenSpatial={() => changeScreen('spatial')}
            onOpenJourney={() => changeScreen('experience')}
          />
        ) : null}
        {screen === 'spatial' ? (
          <SpatialCommandReviewScreen
            theme={theme}
            pack={pack}
            mode={spatialMode}
            selectedPointId={selectedPointId}
            onModeChange={setSpatialMode}
            onPointChange={setSelectedPointId}
            onOpenTechnicalDetails={() => openDrawer('governance')}
          />
        ) : null}
        {screen === 'experience' ? (
          <KapExperienceJourneyReviewScreen
            theme={theme}
            pack={pack}
            currentIndex={journeyIndex}
            onIndexChange={setJourneyIndex}
            onOpenGovernance={() => openDrawer('governance')}
          />
        ) : null}
      </div>

      <VisualReviewDrawer
        open={drawerOpen}
        section={drawerSection}
        theme={theme}
        comparisonTheme={conferenceReferenceEventTheme}
        pack={pack}
        onSectionChange={setDrawerSection}
        onClose={() => setDrawerOpen(false)}
      />

      {resolvedKapTheme.resolution === 'safe-fallback' ? (
        <div className="vd-fallback-banner" role="status">تعذر تطبيق سمة KAP؛ تم استخدام fallback محايد وآمن.</div>
      ) : null}
    </main>
  );
}
