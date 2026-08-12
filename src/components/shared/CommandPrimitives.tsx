import type { ComponentProps, ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, Radio, ShieldCheck } from 'lucide-react';
import { truthLabels, type TruthLabel } from '../../ux/truthVocabulary';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Severity = 'normal' | 'attention' | 'critical' | 'blocked' | 'information';

export function Button({ variant = 'secondary', className = '', ...props }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'command-button-primary',
    secondary: '',
    quiet: 'border-transparent bg-transparent text-command-muted hover:bg-command-surface3 hover:text-command-text',
    danger: 'border-command-severity-critical/60 bg-command-severity-critical/10 text-command-severity-critical hover:bg-command-severity-critical/15'
  };
  return <button type="button" className={`command-button ${variants[variant]} ${className}`} {...props} />;
}

export function IconButton({ label, className = '', children, ...props }: ComponentProps<'button'> & { label: string; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} className={`command-icon-button ${className}`} {...props}>{children}</button>;
}

export function StatusBadge({ severity, label, icon }: { severity: Severity; label: string; icon?: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold status-${severity}`}><span aria-hidden="true">{icon ?? <CircleAlert className="h-3.5 w-3.5" />}</span>{label}</span>;
}

export function TruthBadge({ truth }: { truth: TruthLabel }) {
  return <span className={`truth-badge truth-${truth === 'temporary-demo' ? 'demo' : truth}`}><span aria-hidden="true" className="truth-badge-dot" />{truthLabels[truth]}</span>;
}

export function SeverityIndicator({ severity, label }: { severity: Severity; label: string }) {
  const Icon = severity === 'normal' ? CheckCircle2 : severity === 'information' ? Info : CircleAlert;
  return <span className={`inline-flex items-center gap-2 text-xs status-${severity}`}><Icon className="h-4 w-4" aria-hidden="true" /><span>{label}</span></span>;
}

export function KpiCard({ label, value, detail, tone = 'information' }: { label: string; value: string; detail: string; tone?: Severity }) {
  const toneBorder: Record<Severity, string> = {
    normal: 'border-s-command-severity-normal',
    attention: 'border-s-command-severity-attention',
    critical: 'border-s-command-severity-critical',
    blocked: 'border-s-command-severity-blocked',
    information: 'border-s-command-severity-information'
  };

  return <section className={`command-kpi ${toneBorder[tone]}`}><p className="text-xs text-command-muted">{label}</p><p className="command-technical mt-1 text-xl font-semibold text-command-text">{value}</p><p className="mt-1 text-xs leading-5 text-command-muted">{detail}</p></section>;
}

export function OperationalCard({ title, eyebrow, action, children, className = '' }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`command-panel ${className}`}><header className="flex items-start justify-between gap-4 border-b border-command-line/70 px-4 py-3"><div className="min-w-0">{eyebrow ? <p className="command-eyebrow">{eyebrow}</p> : null}<h2 className="mt-1 text-base font-semibold text-command-text">{title}</h2></div>{action ? <div className="shrink-0">{action}</div> : null}</header><div className="p-4">{children}</div></section>;
}

export function DataTrustCard({ truth, source, detail }: { truth: TruthLabel; source: string; detail: string }) {
  return <section className="rounded-[10px] border border-command-line/70 bg-command-panelStrong p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-command-muted">مصدر الحقيقة</p><p className="mt-1 text-sm font-semibold text-command-text">{source}</p></div><TruthBadge truth={truth} /></div><p className="mt-3 text-xs leading-6 text-command-muted">{detail}</p></section>;
}

export function SegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <div className="inline-flex rounded-md bg-command-bg p-1 ring-1 ring-command-line/80" aria-label={label}>{options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`command-preset-button ${value === option.value ? 'command-preset-button-active' : ''}`}>{option.label}</button>)}</div>;
}

export const Tabs = SegmentedControl;

export function SearchField({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-command-muted">{label}</span><input className="command-select" {...props} /></label>;
}

export function LoadingSkeleton({ className = '' }: { className?: string }) { return <div aria-label="جارٍ التحميل" className={`command-skeleton ${className}`} />; }

export function Tooltip({ label, children }: { label: string; children: ReactNode }) { return <span className="group relative inline-flex">{children}<span role="tooltip" className="pointer-events-none absolute bottom-full mb-2 hidden w-max max-w-56 rounded bg-command-surface3 px-2 py-1 text-xs text-command-text shadow-elevated group-hover:block group-focus-within:block">{label}</span></span>; }

export function Toast({ title, message, severity = 'information' }: { title: string; message: string; severity?: Severity }) { return <div role="status" className={`rounded-[10px] border p-3 status-${severity}`}><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-command-muted">{message}</p></div>; }

export function DrawerFrame({ title, children }: { title: string; children: ReactNode }) { return <aside className="command-technical-drawer relative h-auto max-w-full border-s"><h2 className="border-b border-command-line/70 p-4 text-lg font-semibold text-command-text">{title}</h2><div className="p-4">{children}</div></aside>; }

export function DialogFrame({ title, children }: { title: string; children: ReactNode }) { return <section role="dialog" aria-modal="false" className="command-search-dialog"><h2 className="border-b border-command-line/70 px-4 py-3 text-base font-semibold text-command-text">{title}</h2><div className="p-4">{children}</div></section>; }

export function Breadcrumb({ items }: { items: string[] }) { return <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-2 text-xs text-command-muted">{items.map((item, index) => <span key={item} className="inline-flex items-center gap-2">{index ? <span aria-hidden="true" className="text-command-quiet">/</span> : null}<span className={index === items.length - 1 ? 'font-semibold text-command-text' : ''}>{item}</span></span>)}</nav>; }

export function SplitPane({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) { return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]"><div>{primary}</div><aside>{secondary}</aside></div>; }

export function EvidenceItem({ title, source, status = 'reported' }: { title: string; source: string; status?: TruthLabel }) { return <div className="flex items-start gap-3 rounded-md border border-command-line/70 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-command-blue" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-command-text">{title}</p><p className="mt-1 text-xs text-command-muted">{source}</p></div><TruthBadge truth={status} /></div>; }

export function DecisionTimeline({ items }: { items: Array<{ title: string; detail: string; severity: Severity }> }) { return <ol className="space-y-3">{items.map((item) => <li key={item.title} className="border-s border-command-line ps-4"><SeverityIndicator severity={item.severity} label={item.title} /><p className="mt-1 text-xs leading-6 text-command-muted">{item.detail}</p></li>)}</ol>; }

export function ConnectionStatus({ state, detail }: { state: 'connected' | 'disconnected' | 'recovering' | 'unavailable'; detail: string }) {
  const severity: Severity = state === 'connected' ? 'normal' : state === 'recovering' ? 'information' : state === 'disconnected' ? 'critical' : 'attention';
  const labels = { connected: 'متصل', disconnected: 'منقطع', recovering: 'يتعافى', unavailable: 'غير متاح' };
  return <div className="flex items-center gap-2"><StatusBadge severity={severity} label={labels[state]} icon={<Radio className="h-3.5 w-3.5" />} /><span className="text-xs text-command-muted">{detail}</span></div>;
}

export function SpatialLegend() { return <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-command-muted"><LegendItem color="bg-command-accent" label="تحديد حالي" /><LegendItem color="bg-command-blue" label="علاقة مكانية" /><LegendItem color="bg-command-truth-verified" label="متحقق" /><LegendItem color="bg-command-truth-candidate" label="مرشح" /><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 border-b border-dashed border-command-quiet" aria-hidden="true" />هندسة مفقودة</span></div>; }

function LegendItem({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} aria-hidden="true" />{label}</span>; }
