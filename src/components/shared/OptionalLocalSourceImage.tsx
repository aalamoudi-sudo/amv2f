import { FileImage, RefreshCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { isSafeLocalPreviewUrl } from '../../services/sourceIntake';

export type OptionalLocalSourceImageStatus = 'loading' | 'ready' | 'missing';

interface OptionalLocalSourceImageProps {
  src: string;
  alt: string;
  missingTitleAr: string;
  missingMessageAr: string;
  children?: ReactNode;
  onStatusChange?: (status: OptionalLocalSourceImageStatus) => void;
}

export function OptionalLocalSourceImage({
  src,
  alt,
  missingTitleAr,
  missingMessageAr,
  children,
  onStatusChange
}: OptionalLocalSourceImageProps) {
  const safeSource = isSafeLocalPreviewUrl(src);
  const [status, setStatus] = useState<OptionalLocalSourceImageStatus>(() => safeSource ? 'loading' : 'missing');
  const [attempt, setAttempt] = useState(0);

  const updateStatus = (nextStatus: OptionalLocalSourceImageStatus) => {
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  };

  const retry = () => {
    if (!safeSource) return;
    setStatus('loading');
    onStatusChange?.('loading');
    setAttempt((value) => value + 1);
  };

  const separator = src.includes('?') ? '&' : '?';
  const requestSrc = attempt ? `${src}${separator}reviewAttempt=${attempt}` : src;

  return (
    <div data-testid="optional-local-source-image" data-preview-state={status} className="candidate-local-preview">
      {status === 'loading' ? (
        <div data-testid="local-preview-loading" className="candidate-preview-state" aria-live="polite">
          <span className="candidate-preview-spinner" aria-hidden="true" />
          <strong>جاري تحميل مشتق المراجعة المحلي</strong>
          <p>المصدر الأصلي لا يُحمّل إلى المتصفح.</p>
        </div>
      ) : null}
      {status === 'missing' ? (
        <div data-testid="local-preview-missing" className="candidate-preview-state candidate-preview-missing" role="status">
          <FileImage aria-hidden="true" />
          <strong>{missingTitleAr}</strong>
          <p>{missingMessageAr}</p>
          <button type="button" onClick={retry} disabled={!safeSource}>
            <RefreshCcw aria-hidden="true" />
            إعادة المحاولة
          </button>
        </div>
      ) : null}
      {safeSource ? <div className={`candidate-preview-image-shell ${status === 'ready' ? 'is-ready' : ''}`}>
        <img
          key={requestSrc}
          src={requestSrc}
          alt={alt}
          onLoad={() => updateStatus('ready')}
          onError={() => updateStatus('missing')}
        />
        {status === 'ready' ? children : null}
      </div> : null}
    </div>
  );
}
