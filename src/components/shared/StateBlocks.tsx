import { AlertTriangle, CheckCircle2, Loader2, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

interface StateBlockProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function LoadingState({ title = 'جاري التحميل', message = 'يتم تجهيز بيانات التشغيل.' }: Partial<StateBlockProps>) {
  return (
    <div className="command-panel flex min-h-40 items-center justify-center p-6 text-center">
      <div>
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-command-accent" aria-hidden="true" />
        <p className="text-sm font-semibold text-command-text">{title}</p>
        <p className="mt-1 text-xs leading-6 text-command-muted">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }: StateBlockProps) {
  return (
    <div className="rounded-[10px] border border-dashed border-command-quiet bg-command-panel/70 p-5 text-center">
      <SearchX className="mx-auto mb-3 h-6 w-6 text-command-muted" aria-hidden="true" />
      <p className="text-sm font-semibold text-command-text">{title}</p>
      <p className="mt-1 text-xs leading-6 text-command-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, message, action }: StateBlockProps) {
  return (
    <div role="alert" className="rounded-[10px] border border-command-severity-critical/60 bg-command-severity-critical/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-command-severity-critical" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-command-text">{title}</p>
          <p className="mt-1 text-xs leading-6 text-command-muted">{message}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function SuccessState({ title, message, action }: StateBlockProps) {
  return (
    <div className="rounded-[10px] border border-command-severity-normal/60 bg-command-severity-normal/10 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-command-severity-normal" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-command-text">{title}</p>
          <p className="mt-1 text-xs leading-6 text-command-muted">{message}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
