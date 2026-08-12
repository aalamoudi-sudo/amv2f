export const kagaTheme = {
  colors: {
    background: '#F4F0E7',
    backgroundQuiet: '#ECE6D9',
    surface: '#FBF8F1',
    surfaceElevated: '#FFFDF8',
    greenPrimary: '#123D35',
    greenDeep: '#082B26',
    tealPrimary: '#397D78',
    tealMuted: '#83AAA4',
    goldAccent: '#B28A45',
    goldSoft: '#D8C69F',
    warmNeutral: '#C7BDAA',
    textPrimary: '#18342E',
    textSecondary: '#68746E',
    textOnDark: '#F7F2E8',
    borderGold: 'rgba(178, 138, 69, 0.52)',
    borderQuiet: 'rgba(18, 61, 53, 0.14)',
    shadow: 'rgba(25, 49, 42, 0.14)',
  },
  radii: {
    small: '0.625rem',
    medium: '1.25rem',
    large: '2.25rem',
    organic: 'clamp(2.5rem, 6vw, 7.5rem)',
    pill: '999px',
  },
  spacing: {
    xxs: '0.25rem',
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
    section: 'clamp(3rem, 7vw, 8rem)',
    viewportInline: 'clamp(1.5rem, 5vw, 6rem)',
  },
  typography: {
    displayFamily:
      "'Noto Kufi Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif",
    bodyFamily:
      "'Noto Sans Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif",
    displayLarge: 'clamp(2.75rem, 6.2vw, 7.5rem)',
    displayMedium: 'clamp(2rem, 4.2vw, 5.25rem)',
    heading: 'clamp(1.625rem, 2.6vw, 3.5rem)',
    body: 'clamp(0.975rem, 1.1vw, 1.25rem)',
    small: 'clamp(0.75rem, 0.8vw, 0.925rem)',
    displayWeight: 500,
    bodyWeight: 400,
    lineHeightCompact: 1.28,
    lineHeightBody: 1.9,
  },
  motion: {
    durationFast: 180,
    durationBase: 420,
    durationReveal: 850,
    durationScene: 1200,
    easePresentation: [0.22, 1, 0.36, 1] as const,
    easeTrace: [0.65, 0, 0.35, 1] as const,
  },
  shadow: {
    restrained: '0 1.5rem 4.5rem rgba(25, 49, 42, 0.14)',
    floating: '0 2.25rem 6rem rgba(25, 49, 42, 0.19)',
  },
} as const;

export type KagaTheme = typeof kagaTheme;

/**
 * CSS custom properties for isolated V2 presentation roots. Keeping this
 * mapping centralized prevents component-local colors from drifting away from
 * the source presentation language.
 */
export const kagaThemeCssVariables = {
  '--kaga-v2-background': kagaTheme.colors.background,
  '--kaga-v2-background-quiet': kagaTheme.colors.backgroundQuiet,
  '--kaga-v2-surface': kagaTheme.colors.surface,
  '--kaga-v2-surface-elevated': kagaTheme.colors.surfaceElevated,
  '--kaga-v2-green': kagaTheme.colors.greenPrimary,
  '--kaga-v2-green-deep': kagaTheme.colors.greenDeep,
  '--kaga-v2-teal': kagaTheme.colors.tealPrimary,
  '--kaga-v2-teal-muted': kagaTheme.colors.tealMuted,
  '--kaga-v2-gold': kagaTheme.colors.goldAccent,
  '--kaga-v2-gold-soft': kagaTheme.colors.goldSoft,
  '--kaga-v2-warm-neutral': kagaTheme.colors.warmNeutral,
  '--kaga-v2-text': kagaTheme.colors.textPrimary,
  '--kaga-v2-text-secondary': kagaTheme.colors.textSecondary,
  '--kaga-v2-text-on-dark': kagaTheme.colors.textOnDark,
  '--kaga-v2-border-gold': kagaTheme.colors.borderGold,
  '--kaga-v2-border-quiet': kagaTheme.colors.borderQuiet,
  '--kaga-v2-shadow': kagaTheme.colors.shadow,
  '--kaga-v2-font-display': kagaTheme.typography.displayFamily,
  '--kaga-v2-font-body': kagaTheme.typography.bodyFamily,
} as const;
