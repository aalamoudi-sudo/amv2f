import type { CSSProperties, ReactNode } from 'react';
import './organicPresentationFrame.css';

export type OrganicPresentationFrameVariant =
  | 'crescent'
  | 'sweep'
  | 'portal'
  | 'folio';

export type OrganicFrameVariant = OrganicPresentationFrameVariant;

export type OrganicPresentationFrameTone = 'ivory' | 'green' | 'transparent';

export interface OrganicPresentationFrameProps {
  /** A source visual, map, render, video, animation, or full-screen scene. */
  visual: ReactNode;
  /** Optional editorial panel kept separate from the visual surface. */
  content?: ReactNode;
  /** Short visible or screen-reader caption for the source visual. */
  caption?: ReactNode;
  variant?: OrganicPresentationFrameVariant;
  tone?: OrganicPresentationFrameTone;
  visualPosition?: 'start' | 'end';
  fullBleed?: boolean;
  className?: string;
  style?: CSSProperties;
  labelledBy?: string;
  ariaLabel?: string;
}

/**
 * Reusable presentation geometry derived from KAGA's curved image/text
 * compositions. It only owns composition and masking; the supplied visual
 * remains interactive and retains its own semantics.
 */
export function OrganicPresentationFrame({
  visual,
  content,
  caption,
  variant = 'crescent',
  tone = 'ivory',
  visualPosition = 'start',
  fullBleed = false,
  className,
  style,
  labelledBy,
  ariaLabel,
}: OrganicPresentationFrameProps) {
  const classes = [
    'kaga-organic-frame',
    `kaga-organic-frame--${variant}`,
    `kaga-organic-frame--${tone}`,
    `kaga-organic-frame--visual-${visualPosition}`,
    fullBleed ? 'kaga-organic-frame--full-bleed' : '',
    content ? 'kaga-organic-frame--with-content' : 'kaga-organic-frame--visual-only',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={classes}
      style={style}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
    >
      <div className="kaga-organic-frame__visual-shell">
        <div className="kaga-organic-frame__gold-edge" aria-hidden="true" />
        <div className="kaga-organic-frame__visual">{visual}</div>
        {caption ? (
          <div className="kaga-organic-frame__caption">{caption}</div>
        ) : null}
      </div>
      {content ? (
        <div className="kaga-organic-frame__content">{content}</div>
      ) : null}
    </section>
  );
}
