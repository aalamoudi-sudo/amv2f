import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const cancelHandlerRef = useRef(onCancel);

  useEffect(() => {
    cancelHandlerRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => cancelRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelHandlerRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
    };
  }, [open]);

  if (!open) {
    return null;
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-5" role="presentation">
      <section
        ref={dialogRef}
        aria-modal="true"
        role="dialog"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-[14px] border border-command-borderStrong bg-command-panelStrong p-5 shadow-command"
        onKeyDown={trapFocus}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-command-amber" aria-hidden="true" />
            <div>
              <h2 id="confirm-dialog-title" className="text-base font-semibold text-command-text">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-command-muted">{message}</p>
            </div>
          </div>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="command-icon-button min-h-9 min-w-9"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="command-button"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="command-button border-command-severity-attention bg-command-severity-attention font-semibold text-command-inverse hover:border-command-severity-attention hover:bg-command-severity-attention"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
