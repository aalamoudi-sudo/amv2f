import { ArrowLeft, CalendarDays, FileClock, MapPinned, ShieldAlert, Sparkles } from 'lucide-react';
import type { EventThemePackage } from '../../types/eventThemePackage';
import type { ExperienceIntelligencePack } from '../../types/experienceIntelligence';

interface ExecutiveCommandReviewScreenProps {
  theme: EventThemePackage;
  pack: ExperienceIntelligencePack;
  onOpenGovernance: () => void;
  onOpenSpatial: () => void;
  onOpenJourney: () => void;
}

function heroImage(theme: EventThemePackage): string | undefined {
  return theme.imagery.find((asset) => asset.role === 'hero')?.uri;
}

function formatCandidateDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(parsed);
}

export function ExecutiveCommandReviewScreen({
  theme,
  pack,
  onOpenGovernance,
  onOpenSpatial,
  onOpenJourney
}: ExecutiveCommandReviewScreenProps) {
  const venueLabel = pack.eventNameAr.replace(/^حفل افتتاح وتدشين\s+/, '');
  const priorities = [
    {
      title: 'الهندسة المكانية غير معتمدة',
      detail: pack.governanceSnapshot.cadStatusAr,
      icon: MapPinned
    },
    {
      title: 'بوابات التجميد متوقفة',
      detail: 'الحزمة لا تنتقل إلى baseline أو تشغيل معتمد.',
      icon: ShieldAlert
    },
    {
      title: 'السنة تحتاج تأكيدًا سلطويًا',
      detail: pack.dateAssumptionMessageAr ?? 'لا يوجد افتراض تاريخ مسجل.',
      icon: FileClock
    }
  ] as const;

  return (
    <section data-testid="visual-screen-executive" className="vd-screen vd-executive-screen" aria-labelledby="vd-executive-title">
      <div
        className="vd-executive-hero"
        style={heroImage(theme) ? { backgroundImage: `url(${heroImage(theme)})` } : undefined}
      >
        <div className="vd-hero-shade" />
        <div className="vd-executive-hero-copy">
          <div className="vd-hero-kicker">
            <span className="vd-truth-marker vd-truth-marker-candidate"><FileClock aria-hidden="true" />حزمة مرشحة</span>
            <span>مراجعة بصرية فقط</span>
          </div>
          <p className="vd-overline">Executive Command Overview</p>
          <h1 id="vd-executive-title">{pack.eventNameAr}</h1>
          <div className="vd-event-facts" aria-label="هوية الفعالية">
            <span><CalendarDays aria-hidden="true" />{formatCandidateDate(pack.eventDate)} <b>· السنة مستنتجة</b></span>
            <span><MapPinned aria-hidden="true" />{venueLabel}</span>
            <span><ShieldAlert aria-hidden="true" />غير مفعّلة كحقيقة تشغيلية</span>
          </div>
          <p className="vd-hero-disclosure">المناطق الخمس مثبتة منطقيًا فقط. لا جاهزية، ولا سعة، ولا مستوى حشود، ولا هندسة معتمدة معروضة.</p>
          <button data-testid="executive-primary-action" type="button" className="vd-primary-action" onClick={onOpenGovernance}>
            مراجعة النواقص قبل أي اعتماد
            <ArrowLeft aria-hidden="true" />
          </button>
        </div>
        <div className="vd-hero-index" aria-label="ملخص الحالة">
          <span>الوضع الحالي</span>
          <strong>candidate</strong>
          <small>validated-draft غير متحقق</small>
        </div>
      </div>

      <div className="vd-executive-grid">
        <section className="vd-priority-section" aria-labelledby="vd-priorities-title">
          <div className="vd-section-heading">
            <div>
              <p className="vd-overline">ما يحتاج الانتباه الآن</p>
              <h2 id="vd-priorities-title">ثلاث أولويات قبل القرار</h2>
            </div>
            <span className="vd-context-note">لا تمثل مؤشرات جاهزية</span>
          </div>
          <div className="vd-priority-list">
            {priorities.map(({ title, detail, icon: Icon }, index) => (
              <article key={title} className="vd-priority-row">
                <span className="vd-priority-number">{String(index + 1).padStart(2, '0')}</span>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="vd-journey-preview" aria-labelledby="vd-journey-preview-title">
          <div className="vd-section-heading">
            <div>
              <p className="vd-overline">أين يظهر الأثر</p>
              <h2 id="vd-journey-preview-title">تسلسل تجربة منطقي</h2>
            </div>
            <Sparkles aria-hidden="true" />
          </div>
          <ol className="vd-executive-journey">
            {pack.experiencePoints.map((point, index) => (
              <li key={point.experiencePointId}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{point.nameAr}</strong>
                  <small>الموقع غير مثبت على المخطط</small>
                </div>
              </li>
            ))}
          </ol>
          <div className="vd-preview-actions">
            <button type="button" className="vd-text-action" onClick={onOpenSpatial}>فتح مساحة المكان</button>
            <button type="button" className="vd-text-action" onClick={onOpenJourney}>استعراض رحلة الزائر</button>
          </div>
        </section>
      </div>
    </section>
  );
}
