import { ArrowLeft, CalendarDays, Map, Route, ShieldAlert } from 'lucide-react';
import { experienceIntelligenceCatalog } from '../../data/experienceIntelligencePacks';

interface ExperienceEntryPanelProps {
  onOpenExperience: (eventId: string) => void;
  onOpenAuthoring: () => void;
}

export function ExperienceEntryPanel({ onOpenExperience, onOpenAuthoring }: ExperienceEntryPanelProps) {
  const featured = experienceIntelligenceCatalog.find((entry) => entry.launchRole === 'featured-experience' && entry.pack.selectableFromLauncher);
  if (!featured) return null;
  const { pack } = featured;

  return (
    <section
      data-testid="kap-experience-entry"
      aria-label="مدخل خريطة التجربة المرشحة"
      className="grid shrink-0 gap-4 border border-command-line bg-command-panel px-4 py-3 shadow-command xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-sm border border-command-accent/50 bg-command-accent/10 px-2 py-1 text-command-accent">حزمة تجربة مرشحة</span>
          <span className="rounded-sm border border-command-amber/50 bg-command-amber/10 px-2 py-1 text-command-amber">هندسة مبدئية</span>
          <span className="rounded-sm border border-command-blue/50 bg-command-blue/10 px-2 py-1 text-command-blue">رحلة من {pack.experiencePoints.length} نقاط</span>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
          <div>
            <p className="text-xs text-command-muted">معاينة مشروع حقيقية داخل حدود المصدر</p>
            <h2 className="mt-1 text-xl font-bold text-command-text">{pack.eventNameAr}</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-command-muted">
            <CalendarDays className="h-4 w-4 text-command-accent" aria-hidden="true" />
            <bdi dir="ltr" className="font-semibold text-command-text">{pack.eventDate}</bdi>
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-command-muted">
            <Map className="h-4 w-4 text-command-amber" aria-hidden="true" />
            مخطط مبدئي غير معتمد
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-command-muted">
            <Route className="h-4 w-4 text-command-blue" aria-hidden="true" />
            رحلة مرشحة بلا مسار مكاني معتمد
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-command-muted" data-testid="kap-entry-points">
          {pack.experiencePoints.map((point, index) => <span key={point.experiencePointId}>{index + 1}. {point.nameAr}</span>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <button
          data-testid="experience-entry-open"
          type="button"
          onClick={() => onOpenExperience(pack.eventId)}
          className="command-button command-button-primary"
        >
          <span className="flex items-center gap-2"><Map className="h-4 w-4" aria-hidden="true" />فتح خريطة التجربة</span>
        </button>
        <button type="button" onClick={onOpenAuthoring} className="command-button">
          <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" aria-hidden="true" />مراجعة الحزمة<ArrowLeft className="h-4 w-4" aria-hidden="true" /></span>
        </button>
      </div>
    </section>
  );
}
