import { BadgeCheck, CircleHelp, CircleX, FileClock, GitBranch, Radio, ShieldAlert, Siren, TriangleAlert, Unplug, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { immutableOperationalSemantics } from '../../services/eventThemePackage';
import type { EventThemePackage } from '../../types/eventThemePackage';
import type { ExperienceIntelligencePack } from '../../types/experienceIntelligence';

export type VisualReviewDrawerSection = 'sources' | 'semantics' | 'isolation' | 'governance';

interface VisualReviewDrawerProps {
  open: boolean;
  section: VisualReviewDrawerSection;
  theme: EventThemePackage;
  comparisonTheme: EventThemePackage;
  pack: ExperienceIntelligencePack;
  onSectionChange: (section: VisualReviewDrawerSection) => void;
  onClose: () => void;
}

const drawerSections: Array<{ value: VisualReviewDrawerSection; label: string }> = [
  { value: 'sources', label: 'المصادر والرموز' },
  { value: 'semantics', label: 'الحقيقة والشدة' },
  { value: 'isolation', label: 'عزل الفعاليات' },
  { value: 'governance', label: 'الحوكمة والنقص' }
];

const semanticIcons: Record<keyof typeof immutableOperationalSemantics, LucideIcon> = {
  reported: Radio,
  unverified: CircleHelp,
  verified: BadgeCheck,
  provisional: FileClock,
  scenario: GitBranch,
  quarantined: ShieldAlert,
  warning: TriangleAlert,
  critical: Siren,
  disconnected: Unplug,
  rejected: CircleX
};

function tokenEntries(theme: EventThemePackage) {
  return [
    ['Mayadeen purple', theme.brandTokens.primaryAction, 'عينة من الدليل · مرشح'],
    ['Mayadeen turquoise', theme.brandTokens.accent, 'عينة من الدليل · مرشح'],
    ['KAP garden green', theme.eventTokens.primary, 'عينة من عرض KAP · مرشح'],
    ['KAP deep green', theme.eventTokens.secondary, 'عينة من عرض KAP · مرشح'],
    ['KAP warm gold', theme.eventTokens.accent, 'عينة من عرض KAP · مرشح'],
    ['KAP ivory', theme.eventTokens.page, 'عينة من عرض KAP · مرشح'],
    ['KAP pale mint', theme.eventTokens.soft, 'عينة من عرض KAP · مرشح']
  ] as const;
}

function ThemeMiniature({ theme, label }: { theme: EventThemePackage; label: string }) {
  const style = {
    '--vd-mini-page': theme.eventTokens.page.background,
    '--vd-mini-ink': theme.eventTokens.page.foreground,
    '--vd-mini-primary': theme.eventTokens.primary.background,
    '--vd-mini-primary-ink': theme.eventTokens.primary.foreground,
    '--vd-mini-accent': theme.eventTokens.accent.background
  } as CSSProperties;

  return (
    <article className="vd-theme-miniature" style={style} data-theme-id={theme.themeId}>
      <div className="vd-theme-miniature-bar"><span>{label}</span><small>{theme.status}</small></div>
      <div className="vd-theme-miniature-body">
        <span className="vd-theme-miniature-mark" />
        <h3>{theme.eventId === 'EVENT-KAP-OPENING-2026' ? 'حدائق الملك عبدالله' : 'مؤتمر مرجعي غير مرتبط'}</h3>
        <p>هذه المعاينة تختبر الهوية فقط، ولا تنقل بيانات أو حالات من فعالية أخرى.</p>
        <button type="button" tabIndex={-1}>إجراء مرجعي</button>
      </div>
    </article>
  );
}

export function VisualReviewDrawer({
  open,
  section,
  theme,
  comparisonTheme,
  pack,
  onSectionChange,
  onClose
}: VisualReviewDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="vd-drawer-layer">
      <button type="button" className="vd-drawer-backdrop" onClick={onClose} aria-label="إغلاق درج المراجعة" />
      <aside ref={drawerRef} data-testid="visual-review-drawer" className="vd-review-drawer" role="dialog" aria-modal="true" aria-labelledby="vd-drawer-title">
        <header className="vd-drawer-heading">
          <div>
            <p className="vd-overline">Progressive disclosure</p>
            <h2 id="vd-drawer-title">مرجع السمة وحدود الحقيقة</h2>
          </div>
          <button ref={closeRef} data-testid="visual-review-drawer-close" type="button" onClick={onClose} aria-label="إغلاق"><X aria-hidden="true" /></button>
        </header>

        <nav className="vd-drawer-tabs" aria-label="أقسام مرجع السمة">
          {drawerSections.map((item) => (
            <button
              key={item.value}
              data-testid={`drawer-section-${item.value}`}
              type="button"
              className={section === item.value ? 'is-active' : undefined}
              aria-pressed={section === item.value}
              onClick={() => onSectionChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="vd-drawer-content">
          {section === 'sources' ? (
            <div data-testid="theme-source-review" className="vd-drawer-section">
              <div className="vd-drawer-intro">
                <h3>سجل المصادر المرئية</h3>
                <p>الملفات أصلية محليًا، لكن قيم HEX أدناه عينات من الرندرة وليست أكواد هوية رسمية منشورة.</p>
              </div>
              <div className="vd-source-list">
                {theme.sourceReferences.map((source) => (
                  <article key={source.sourceId}>
                    <div><strong><bdi dir="auto">{source.fileName}</bdi></strong><span>{source.classification}</span></div>
                    <p>الصفحات: {source.pageReferences.length ? source.pageReferences.join('، ') : 'لا ينطبق'}</p>
                    <small>{source.noteAr}</small>
                  </article>
                ))}
              </div>
              <div className="vd-token-review">
                {tokenEntries(theme).map(([name, color, status]) => (
                  <div key={name}>
                    <span style={{ background: color.background }} />
                    <strong>{name}</strong>
                    <bdi dir="ltr">{color.background}</bdi>
                    <small>{status}</small>
                  </div>
                ))}
              </div>
              <div className="vd-asset-review">
                <img src="/visual-direction/mayadeen-brandmark-review.png" alt="علامة ميادين من المصدر المحلي" />
                <img src="/visual-direction/mayadeen-arabic-logo-review.png" alt="شعار ميادين العربي من المصدر المحلي" />
                <p>أصول ميادين: authoritative للاستخدام الداخلي. صور KAP: review-only، وحقوق إعادة الاستخدام الإنتاجي غير مثبتة في العرض.</p>
              </div>
            </div>
          ) : null}

          {section === 'semantics' ? (
            <div data-testid="semantic-token-review" className="vd-drawer-section">
              <div className="vd-drawer-intro">
                <h3>نظام حقيقة وشدة غير قابل للتخصيص</h3>
                <p>كل حالة تحمل تسمية ورمزًا وشكلًا. ألوان KAP لا تحل محل هذه الدلالات.</p>
              </div>
              <div className="vd-semantic-grid">
                {(Object.entries(immutableOperationalSemantics) as Array<[keyof typeof immutableOperationalSemantics, (typeof immutableOperationalSemantics)[keyof typeof immutableOperationalSemantics]]>).map(([key, semantic]) => {
                  const Icon = semanticIcons[key];
                  const style = { '--vd-semantic-color': semantic.color } as CSSProperties;
                  return (
                    <article key={key} style={style} data-semantic={key}>
                      <span className={`vd-semantic-shape vd-shape-${semantic.shape}`}><Icon aria-hidden="true" /></span>
                      <div><strong>{semantic.labelAr}</strong><bdi dir="ltr">{key}</bdi></div>
                    </article>
                  );
                })}
              </div>
              <div className="vd-semantic-warning">
                <span style={{ background: theme.eventTokens.primary.background }} />
                <p><strong>أخضر KAP هوية فعالية.</strong> لا يعني متحققًا أو جاهزًا أو طبيعيًا.</p>
                <span style={{ background: theme.eventTokens.accent.background }} />
                <p><strong>ذهبي KAP تأكيد بصري.</strong> لا يعني تحذيرًا.</p>
              </div>
            </div>
          ) : null}

          {section === 'isolation' ? (
            <div data-testid="theme-isolation-review" className="vd-drawer-section">
              <div className="vd-drawer-intro">
                <h3>اختبار عزل سمة الفعالية</h3>
                <p>غلاف ميادين ثابت. تتغير طبقة الحدث فقط، ولا تنتقل ألوان KAP أو أصوله إلى المؤتمر المرجعي.</p>
              </div>
              <div className="vd-theme-comparison">
                <ThemeMiniature theme={theme} label="KAP candidate" />
                <ThemeMiniature theme={comparisonTheme} label="Non-KAP reference" />
              </div>
              <dl className="vd-isolation-facts">
                <div><dt>غلاف ميادين</dt><dd>متطابق</dd></div>
                <div><dt>ألوان الحدث</dt><dd>معزولة حسب eventId</dd></div>
                <div><dt>الحقيقة والشدة</dt><dd>غير قابلة للتجاوز</dd></div>
                <div><dt>fallback</dt><dd>محايد ولا يستخدم KAP</dd></div>
              </dl>
            </div>
          ) : null}

          {section === 'governance' ? (
            <div data-testid="theme-governance-review" className="vd-drawer-section">
              <div className="vd-drawer-intro">
                <h3>ما يمنع الاعتماد المكاني والتشغيلي</h3>
                <p>هذه البيانات من حزمة Experience Intelligence الحالية، وليست مؤشرات تشغيلية جديدة.</p>
              </div>
              <div className="vd-governance-summary">
                <article><strong>{pack.governanceSnapshot.blockedFreezeGateCount}/{pack.governanceSnapshot.freezeGateCount}</strong><span>بوابات تجميد متوقفة</span></article>
                <article><strong>{pack.governanceSnapshot.unmappedEntityCount}</strong><span>مناطق منطقية غير مربوطة</span></article>
                <article><strong>{pack.governanceSnapshot.quarantinedEvidenceCount}</strong><span>دليل محجور</span></article>
              </div>
              <ul className="vd-missing-list">
                {pack.governanceSnapshot.missingInputsAr.map((item) => <li key={item}><CircleX aria-hidden="true" />{item}</li>)}
              </ul>
              <details data-testid="technical-id-disclosure" className="vd-technical-disclosure">
                <summary>إظهار المعرفات التقنية والمصدر</summary>
                <dl>
                  <div><dt>themeId</dt><dd><bdi dir="ltr" className="vd-technical">{theme.themeId}</bdi></dd></div>
                  <div><dt>eventId</dt><dd><bdi dir="ltr" className="vd-technical">{pack.eventId}</bdi></dd></div>
                  <div><dt>venueId</dt><dd><bdi dir="ltr" className="vd-technical">{pack.venueId}</bdi></dd></div>
                  <div><dt>packId</dt><dd><bdi dir="ltr" className="vd-technical">{pack.packId}</bdi></dd></div>
                  <div><dt>contentHash</dt><dd><bdi dir="ltr" className="vd-technical">{theme.contentHash}</bdi></dd></div>
                </dl>
              </details>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
