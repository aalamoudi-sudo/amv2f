import { Box, Cable, Cpu, FileCog, Palette, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface TechnicalAdministrationDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenConfiguration: () => void;
  onOpenAuthoring: () => void;
  onOpenIntegration: () => void;
  onOpenIoT: () => void;
  onOpenProjection: () => void;
  onOpenVisualSystem: () => void;
  integrationEnabled: boolean;
  projectionEnabled: boolean;
}

export function TechnicalAdministrationDrawer({
  open,
  onClose,
  onOpenConfiguration,
  onOpenAuthoring,
  onOpenIntegration,
  onOpenIoT,
  onOpenProjection,
  onOpenVisualSystem,
  integrationEnabled,
  projectionEnabled
}: TechnicalAdministrationDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeHandlerRef = useRef(onClose);

  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHandlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const navigate = (action: () => void) => {
    action();
    onClose();
  };

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (!focusable?.length) return;
    const ordered = Array.from(focusable);
    const first = ordered[0]!;
    const last = ordered.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button type="button" aria-label="إغلاق الإدارة التقنية" className="command-technical-scrim" onClick={onClose} />
      <aside ref={dialogRef} data-testid="technical-administration-drawer" className="command-technical-drawer" role="dialog" aria-modal="true" aria-labelledby="technical-administration-title" onKeyDown={trapFocus}>
        <header className="border-b border-command-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="command-eyebrow">منفصلة عن التشغيل اليومي</p>
              <h2 id="technical-administration-title" className="mt-1 text-lg font-semibold text-command-text">الإدارة التقنية</h2>
            </div>
            <button ref={closeRef} data-testid="technical-drawer-close" type="button" onClick={onClose} className="command-icon-button" aria-label="إغلاق الإدارة التقنية">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 text-xs leading-6 text-command-muted">تنظيم واجهة محلية للمختبرات والتهيئة. لا يمثل نظام صلاحيات أو مصادقة أو تفويض إنتاجي.</p>
        </header>
        <nav aria-label="مساحات الإدارة التقنية" className="flex-1 space-y-2 overflow-y-auto p-4 command-scrollbar">
          <TechnicalEntry testId="configuration-open" icon={Box} title="تهيئة الفعاليات والحزم" description="اختيار وتحقق الحزم التشغيلية المنظمة." onClick={() => navigate(onOpenConfiguration)} />
          <TechnicalEntry testId="pilot-authoring-open" icon={FileCog} title="تأليف حزمة الطيار" description="تأليف مرشح مع مصدر وحوكمة صريحين." onClick={() => navigate(onOpenAuthoring)} />
          <TechnicalEntry testId="integration-open" icon={Cable} title="مختبر التكامل" description="تدفقات تحقق محلية، لا تغذية تشغيلية حية." onClick={() => navigate(onOpenIntegration)} disabled={!integrationEnabled} />
          <TechnicalEntry testId="iot-open" icon={Cpu} title="مختبر إنترنت الأشياء" description="محاكاة محلية أو بوابة دائمة، بلا جهاز خارجي." onClick={() => navigate(onOpenIoT)} disabled={!integrationEnabled} />
          <TechnicalEntry testId="projection-open" icon={SlidersHorizontal} title="إعدادات الإسقاط" description="معاينة محلية منفصلة عن كاميرا المشغل." onClick={() => navigate(onOpenProjection)} disabled={!projectionEnabled} />
          <TechnicalEntry testId="visual-system-open" icon={Palette} title="مرجع النظام المرئي" description="tokens وحالات المكونات، منفصل عن التشغيل اليومي." onClick={() => navigate(onOpenVisualSystem)} />
        </nav>
        <footer className="border-t border-command-line p-4 text-xs leading-6 text-command-muted">
          <p><ShieldCheck className="ml-2 inline h-4 w-4 text-command-accent" aria-hidden="true" />لا جهاز حقيقي ولا Broker ولا سحابة ولا بيانات اعتماد في المتصفح.</p>
        </footer>
      </aside>
    </>
  );
}

function TechnicalEntry({
  testId,
  icon: Icon,
  title,
  description,
  onClick,
  disabled = false
}: {
  testId: string;
  icon: typeof Box;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="command-action-card flex w-full items-start gap-3 text-right disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-command-accent" aria-hidden="true" />
      <span>
        <span className="block text-sm font-semibold text-command-text">{title}</span>
        <span className="mt-1 block text-xs leading-6 text-command-muted">{description}</span>
      </span>
    </button>
  );
}
