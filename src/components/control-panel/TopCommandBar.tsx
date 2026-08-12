import { ChevronLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, RotateCcw, Wrench } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { GlobalCommandSearch } from '../command-experience/GlobalCommandSearch';
import { PresentationPresetSelector } from '../command-experience/PresentationPresetSelector';
import { TechnicalAdministrationDrawer } from '../command-experience/TechnicalAdministrationDrawer';
import { isOperationalPackEnabled, useEventStore } from '../../store/useEventStore';
import {
  productAreaForWorkspace,
  productAreas,
  type CommandWorkspace,
  type PresentationPreset,
  workspaceTitle
} from '../../ux/commandExperience';
import { SystemStatusIndicator } from './SystemStatusIndicator';

interface TopCommandBarProps {
  activeWorkspace: CommandWorkspace;
  shellContext: 'launcher' | 'experience-candidate' | 'operational';
  experiencePackageRole?: 'experience' | 'demo' | 'reference';
  dashboardCollapsed: boolean;
  inspectorCollapsed: boolean;
  presentationPreset: PresentationPreset;
  projectSwitcher: ReactNode;
  hasProjectContext: boolean;
  readinessAvailable: boolean;
  onPresentationPresetChange: (preset: PresentationPreset) => void;
  onOpenLauncher: () => void;
  onOpenExecutive: () => void;
  onOpenCommand: () => void;
  onOpenSpatial: () => void;
  onOpenReadiness: () => void;
  onOpenDecisions: () => void;
  onOpenValidation: () => void;
  onOpenIntegration: () => void;
  onOpenIoT: () => void;
  onOpenConfiguration: () => void;
  onOpenAuthoring: () => void;
  onOpenVisualSystem: () => void;
  onOpenExperience: () => void;
  onSearchNavigate: (workspace: CommandWorkspace, experienceEventId?: string) => void;
  onToggleDashboard: () => void;
  onToggleInspector: () => void;
}

export function TopCommandBar({
  activeWorkspace,
  shellContext,
  experiencePackageRole,
  dashboardCollapsed,
  inspectorCollapsed,
  presentationPreset,
  projectSwitcher,
  hasProjectContext,
  readinessAvailable,
  onPresentationPresetChange,
  onOpenLauncher,
  onOpenExecutive,
  onOpenCommand,
  onOpenSpatial,
  onOpenReadiness,
  onOpenDecisions,
  onOpenValidation,
  onOpenIntegration,
  onOpenIoT,
  onOpenConfiguration,
  onOpenAuthoring,
  onOpenVisualSystem,
  onOpenExperience,
  onSearchNavigate,
  onToggleDashboard,
  onToggleInspector
}: TopCommandBarProps) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const technicalTriggerRef = useRef<HTMLButtonElement>(null);
  const resetCamera = useEventStore((state) => state.resetCamera);
  const enterProjectionMode = useEventStore((state) => state.enterProjectionMode);
  const decisionsEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'decision-engine'));
  const integrationEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'operational-capture'));
  const projectionEnabled = useEventStore((state) => isOperationalPackEnabled(state, 'projection-preview'));
  const candidate = shellContext === 'experience-candidate';
  const operational = shellContext === 'operational';
  const currentArea = productAreaForWorkspace(activeWorkspace);

  const navigateArea = (area: string) => {
    if (area === 'leadership') onOpenExecutive();
    if (area === 'operations') onOpenCommand();
    if (area === 'place') onOpenSpatial();
    if (area === 'experience') onOpenExperience();
    if (area === 'technical') setTechnicalOpen(true);
  };

  const changePreset = (preset: PresentationPreset) => {
    onPresentationPresetChange(preset);
    if (preset === 'technical') setTechnicalOpen(true);
  };

  const closeTechnicalDrawer = () => {
    setTechnicalOpen(false);
    window.setTimeout(() => technicalTriggerRef.current?.focus(), 0);
  };

  return (
    <>
      <header className="flex shrink-0 flex-col border-b border-command-line bg-command-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="command-eyebrow">مَيادين · نظام تشغيل ذكاء الفعاليات</p>
            <h1 className="mt-1 text-lg font-semibold leading-6 text-command-text">{workspaceTitle(activeWorkspace)}</h1>
          </div>
          {projectSwitcher}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!candidate || hasProjectContext ? <GlobalCommandSearch onNavigate={onSearchNavigate} /> : null}
            {!candidate || hasProjectContext ? <PresentationPresetSelector value={presentationPreset} onChange={changePreset} /> : null}
            <SystemStatusIndicator presentation={shellContext} experiencePackageRole={experiencePackageRole} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-command-line/70 px-4 py-2" aria-label="المجالات الرئيسية">
          {activeWorkspace !== 'portfolio' && activeWorkspace !== 'launcher' ? <button data-testid="launcher-open" type="button" onClick={onOpenLauncher} className="command-navigation-button" title="العودة إلى محفظة المشاريع">محفظة المشاريع</button> : null}
          {!candidate || hasProjectContext ? productAreas.map((area) => {
            const Icon = area.icon;
            const active = currentArea === area.id;
            const testId = area.id === 'leadership'
              ? 'executive-open'
              : area.id === 'operations'
                ? 'command-open'
                : area.id === 'place'
                  ? 'spatial-open'
                  : area.id === 'experience'
                    ? 'experience-open'
                    : 'technical-drawer-open';
            return (
              <button
                key={area.id}
                ref={area.id === 'technical' ? technicalTriggerRef : undefined}
                data-testid={testId}
                type="button"
                onClick={() => navigateArea(area.id)}
                aria-current={active ? 'page' : undefined}
                className={'command-navigation-button ' + (active ? 'command-navigation-button-active' : '')}
                title={area.descriptionAr}
              >
                {area.id === 'technical' ? <Wrench className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                <span>{area.labelAr}</span>
              </button>
            );
          }) : null}
        </div>

        {operational && !candidate ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-command-line/70 bg-command-bg/30 px-4 py-2" aria-label="اختصارات العمليات">
            <span className="mr-1 text-xs font-semibold text-command-muted">العمليات:</span>
            <button data-testid="readiness-open" type="button" onClick={onOpenReadiness} disabled={!readinessAvailable} className="command-button min-h-8 px-2.5 py-1.5 text-xs">الجاهزية</button>
            <button data-testid="decisions-open" type="button" onClick={onOpenDecisions} disabled={!decisionsEnabled} className="command-button min-h-8 px-2.5 py-1.5 text-xs">القرارات</button>
            <button data-testid="validation-open" type="button" onClick={onOpenValidation} disabled={!decisionsEnabled} className="command-button min-h-8 px-2.5 py-1.5 text-xs">التحقق</button>
            {activeWorkspace === 'command' ? <>
              <span className="h-5 w-px bg-command-line" aria-hidden="true" />
              <button data-testid="panel-toggle-dashboard" type="button" onClick={onToggleDashboard} className="command-icon-button min-h-8 min-w-8" aria-label={dashboardCollapsed ? 'فتح لوحة التشغيل' : 'طي لوحة التشغيل'} title={dashboardCollapsed ? 'فتح لوحة التشغيل' : 'طي لوحة التشغيل'}>
                {dashboardCollapsed ? <PanelRightOpen className="h-4 w-4" aria-hidden="true" /> : <PanelRightClose className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button data-testid="panel-toggle-inspector" type="button" onClick={onToggleInspector} className="command-icon-button min-h-8 min-w-8" aria-label={inspectorCollapsed ? 'فتح لوحة التفاصيل' : 'طي لوحة التفاصيل'} title={inspectorCollapsed ? 'فتح لوحة التفاصيل' : 'طي لوحة التفاصيل'}>
                {inspectorCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button type="button" onClick={resetCamera} className="command-button min-h-8 px-2.5 py-1.5 text-xs" aria-label="إعادة ضبط الكاميرا" title="إعادة ضبط الكاميرا"><RotateCcw className="ml-1 h-3.5 w-3.5" aria-hidden="true" />إعادة ضبط الكاميرا</button>
            </> : null}
            <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-command-muted">إعدادات المختبرات تحت الإدارة التقنية <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /></span>
          </div>
        ) : null}
      </header>

      {!candidate || hasProjectContext ? <TechnicalAdministrationDrawer
        open={technicalOpen}
        onClose={closeTechnicalDrawer}
        onOpenConfiguration={onOpenConfiguration}
        onOpenAuthoring={onOpenAuthoring}
        onOpenIntegration={onOpenIntegration}
        onOpenIoT={onOpenIoT}
        onOpenProjection={enterProjectionMode}
        onOpenVisualSystem={onOpenVisualSystem}
        integrationEnabled={integrationEnabled}
        projectionEnabled={projectionEnabled && operational}
      /> : null}
    </>
  );
}
