import { useId, type ReactNode } from 'react';
import './presentationFidelity.css';

export type PresentationContourVariant = 'hero' | 'chapter' | 'map' | 'cinematic';
export type PresentationPageArchetype =
  | 'editorial'
  | 'event-day'
  | 'route-map'
  | 'render-cinematic';

const archetypeByVariant: Record<PresentationContourVariant, PresentationPageArchetype> = {
  hero: 'editorial',
  chapter: 'event-day',
  map: 'route-map',
  cinematic: 'render-cinematic',
};

interface PresentationImageCutoutProps {
  children: ReactNode;
  className?: string;
}

export function PresentationImageCutout({ children, className = '' }: PresentationImageCutoutProps) {
  return <div className={`kaga-pf-image-cutout ${className}`.trim()}>{children}</div>;
}

interface PresentationCurveProps {
  variant: PresentationContourVariant;
}

const curves: Record<PresentationContourVariant, { ribbon: string; companion: string; gold: string }> = {
  hero: {
    ribbon: 'M0 794 C252 718 458 886 723 836 C885 805 891 633 925 470 C966 272 950 91 829 0 L785 0 C887 105 895 268 858 452 C819 642 817 748 671 780 C444 830 258 681 0 748 Z',
    companion: 'M0 836 C258 756 451 922 735 868 C926 831 936 652 970 480 C1007 291 998 120 902 0 L858 0 C949 119 956 282 919 465 C881 655 874 779 703 814 C456 866 274 718 0 790 Z',
    gold: 'M0 833 C255 755 450 915 731 861 C919 825 928 646 963 477 C1000 292 991 120 895 0',
  },
  chapter: {
    ribbon: 'M0 121 C292 148 528 86 748 101 C883 111 922 166 915 281 C903 476 882 670 906 900 L876 900 C851 671 873 474 884 279 C889 197 844 181 735 173 C508 156 280 195 0 169 Z',
    companion: 'M0 103 C294 131 530 69 754 84 C898 94 940 158 932 284 C920 479 899 673 923 900 L906 900 C882 670 903 476 915 281 C922 166 883 111 748 101 C528 86 292 148 0 121 Z',
    gold: 'M0 102 C294 130 530 68 754 83 C898 93 940 157 932 283 C920 478 899 672 923 900',
  },
  map: {
    ribbon: 'M1148 0 C1163 178 1140 345 1146 520 C1150 666 1162 788 1174 900 L1188 900 C1176 786 1164 664 1160 519 C1154 344 1177 176 1162 0 Z',
    companion: 'M1162 0 C1177 176 1154 344 1160 519 C1164 664 1176 786 1188 900 L1195 900 C1183 784 1171 662 1167 518 C1161 343 1184 175 1169 0 Z',
    gold: 'M1173 0 C1188 175 1165 343 1171 518 C1175 661 1187 783 1199 900',
  },
  cinematic: {
    ribbon: 'M0 0 H865 C1005 170 985 344 912 520 C842 690 811 793 857 900 H719 C680 778 723 628 784 484 C854 318 879 163 751 0 Z',
    companion: 'M830 0 C958 163 936 331 869 495 C806 652 756 784 801 900 H904 C855 792 897 666 962 508 C1033 337 1056 162 932 0 Z',
    gold: 'M842 0 C973 164 949 335 879 501 C814 659 769 786 815 900',
  },
};

export function PresentationGoldEdge({ variant }: PresentationCurveProps) {
  return <path className="kaga-pf-curve__gold" d={curves[variant].gold} pathLength="1" />;
}

export function PresentationSectionCurve({ variant }: PresentationCurveProps) {
  return (
    <svg
      className="kaga-pf-curve"
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="kaga-pf-curve__ribbon" d={curves[variant].ribbon} />
      <path className="kaga-pf-curve__companion" d={curves[variant].companion} />
      <PresentationGoldEdge variant={variant} />
    </svg>
  );
}

export interface PresentationContourFrameProps {
  variant: PresentationContourVariant;
  visual: ReactNode;
  content: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function PresentationContourFrame({
  variant,
  visual,
  content,
  className = '',
  ariaLabel,
}: PresentationContourFrameProps) {
  const id = useId();
  return (
    <section
      className={`kaga-pf-frame kaga-pf-frame--${variant} ${className}`.trim()}
      data-presentation-contour={variant}
      data-presentation-archetype={archetypeByVariant[variant]}
      aria-label={ariaLabel}
      data-frame-id={id}
    >
      <PresentationImageCutout className="kaga-pf-frame__visual">{visual}</PresentationImageCutout>
      <div className="kaga-pf-frame__content">{content}</div>
      <PresentationSectionCurve variant={variant} />
    </section>
  );
}
