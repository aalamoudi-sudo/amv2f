import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, children, action, className = '' }: PanelProps) {
  return (
    <section className={`command-panel ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-command-line/70 px-4 py-3">
        <div className="min-w-0">
          {eyebrow ? <p className="command-eyebrow leading-4">{eyebrow}</p> : null}
          <h2 className="mt-1 text-base font-semibold leading-6 text-command-text">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}
