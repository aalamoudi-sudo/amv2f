import { Database, Map, Route, ShieldAlert, Sparkles } from 'lucide-react';
import type { SpatialCommandMode } from '../../types/spatialCommand';

const modes: Array<{ id: SpatialCommandMode; labelAr: string; icon: typeof Map }> = [
  { id: 'experience', labelAr: 'خريطة التجربة', icon: Sparkles },
  { id: 'executive', labelAr: 'خريطة القيادة', icon: ShieldAlert },
  { id: 'journey', labelAr: 'قصة رحلة الزائر', icon: Route }
];

export function SpatialCommandHeader({
  title,
  projectLabelAr,
  venueLabelAr,
  riskCount,
  mode,
  truthRevision,
  truthHash,
  candidateAnchorRevision,
  onModeChange,
  onOpenTruth
}: {
  title: string;
  projectLabelAr: string;
  venueLabelAr: string;
  riskCount: number;
  mode: SpatialCommandMode;
  truthRevision: number;
  truthHash: string;
  candidateAnchorRevision: number;
  onModeChange: (mode: SpatialCommandMode) => void;
  onOpenTruth: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <header className="sc-header">
      <div className="sc-identity">
        <span className="sc-identity-mark" aria-hidden="true"><Map /></span>
        <div>
          <p>{projectLabelAr} · {venueLabelAr}</p>
          <h2>{title}</h2>
        </div>
        <span
          data-testid="founder-truth-frozen-indicator"
          className="sc-truth-badge is-frozen"
          title={`بصمة الحقيقة ${truthHash}`}
        >
          <i aria-hidden="true" />
          قرار المؤسس مجمّد · T{truthRevision} / A{candidateAnchorRevision}
        </span>
      </div>
      <nav className="sc-mode-switcher" aria-label="أوضاع تجربة القيادة المكانية">
        {modes.map(({ id, labelAr, icon: Icon }) => (
          <button
            key={id}
            data-testid={`spatial-command-mode-${id}`}
            type="button"
            aria-pressed={mode === id}
            className={mode === id ? 'is-active' : undefined}
            onClick={() => onModeChange(id)}
          >
            <Icon aria-hidden="true" />
            <span>{labelAr}</span>
          </button>
        ))}
      </nav>
      <button
        data-testid="source-truth-drawer-open"
        type="button"
        className="sc-truth-trigger"
        onClick={(event) => onOpenTruth(event.currentTarget)}
      >
        <Database aria-hidden="true" />
        <span>تفاصيل المصدر والاعتماد</span>
        <i aria-hidden="true">{riskCount}</i>
      </button>
    </header>
  );
}
