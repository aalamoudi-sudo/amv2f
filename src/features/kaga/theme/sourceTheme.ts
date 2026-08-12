import type { CSSProperties } from 'react';

/**
 * Source-derived presentation colors sampled from the rendered event proposal.
 * See docs/KAGA_SOURCE_COLOR_AUDIT.md for page references and sampling notes.
 */
export const sourceTheme = {
  routeMap: {
    background: '#F4ECE8',
    surface: '#F8F3EF',
    primaryGreen: '#34947C',
    secondaryTeal: '#1F5B6C',
    activeOrange: '#E4701A',
    markerNavy: '#083C58',
    mapGray: '#BCB8B4',
    mapGrayBlue: '#98A0B0',
    goldHairline: '#B99A5B',
    titleColor: '#1F5B6C',
    bodyColor: '#2A3435',
    mutedText: '#6F7775',
    divider: '#D7CCC5',
  },
  editorial: {
    background: '#E6D7C8',
    surface: '#EFE5DA',
    primaryGreen: '#2C544F',
    secondaryTeal: '#689D97',
    activeOrange: '#E4701A',
    markerNavy: '#083C58',
    mapGray: '#BCB8B4',
    goldHairline: '#B99A5B',
    titleColor: '#2C6962',
    bodyColor: '#374844',
    mutedText: '#6D736E',
    divider: '#CDBEAE',
  },
  cinematic: {
    background: '#271F1C',
    surface: '#3B312C',
    primaryGreen: '#244C48',
    secondaryTeal: '#5B8D87',
    activeOrange: '#D8782F',
    markerNavy: '#083C58',
    mapGray: '#ADA59E',
    goldHairline: '#C0A46A',
    titleColor: '#FFF9F0',
    bodyColor: '#EFE6DA',
    mutedText: '#C9BEB2',
    divider: '#7F6D5A',
  },
  identity: {
    background: '#F5EFE9',
    surface: '#FBF8F3',
    primaryGreen: '#2C544F',
    secondaryTeal: '#689D97',
    activeOrange: '#E4701A',
    markerNavy: '#083C58',
    mapGray: '#BCB8B4',
    goldHairline: '#B99A5B',
    titleColor: '#2C544F',
    bodyColor: '#35443F',
    mutedText: '#767A75',
    divider: '#D9CEC3',
  },
} as const;

export type SourceTheme = typeof sourceTheme;

export const sourceThemeCssVariables: CSSProperties & Record<`--${string}`, string> = {
  '--kaga-source-route-page': sourceTheme.routeMap.background,
  '--kaga-source-route-surface': sourceTheme.routeMap.surface,
  '--kaga-source-route-green': sourceTheme.routeMap.primaryGreen,
  '--kaga-source-route-teal': sourceTheme.routeMap.secondaryTeal,
  '--kaga-source-route-orange': sourceTheme.routeMap.activeOrange,
  '--kaga-source-route-navy': sourceTheme.routeMap.markerNavy,
  '--kaga-source-route-map-gray': sourceTheme.routeMap.mapGray,
  '--kaga-source-route-map-gray-blue': sourceTheme.routeMap.mapGrayBlue,
  '--kaga-source-route-gold': sourceTheme.routeMap.goldHairline,
  '--kaga-source-route-divider': sourceTheme.routeMap.divider,
  '--kaga-source-editorial-page': sourceTheme.editorial.background,
  '--kaga-source-editorial-green': sourceTheme.editorial.primaryGreen,
  '--kaga-source-editorial-teal': sourceTheme.editorial.secondaryTeal,
  '--kaga-source-editorial-body': sourceTheme.editorial.bodyColor,
  '--kaga-source-cinematic-page': sourceTheme.cinematic.background,
  '--kaga-source-cinematic-title': sourceTheme.cinematic.titleColor,
  '--kaga-source-identity-page': sourceTheme.identity.background,

  // Existing Presentation Fidelity surfaces consume these aliases. Replacing
  // their approximations here propagates the sampled source palette without
  // altering approved screen composition or behavior.
  '--kaga-pf-page': sourceTheme.routeMap.background,
  '--kaga-pf-surface': sourceTheme.routeMap.surface,
  '--kaga-pf-green': sourceTheme.editorial.primaryGreen,
  '--kaga-pf-teal': sourceTheme.editorial.secondaryTeal,
  '--kaga-pf-turquoise': '#83B5AD',
  '--kaga-pf-gold': sourceTheme.editorial.goldHairline,
  '--kaga-pf-orange': sourceTheme.routeMap.activeOrange,
  '--kaga-pf-title': sourceTheme.editorial.titleColor,
  '--kaga-pf-body': sourceTheme.editorial.bodyColor,
  '--kaga-pf-warm-neutral': sourceTheme.editorial.divider,
  '--kaga-v2-bg': sourceTheme.routeMap.background,
  '--kaga-v2-surface': sourceTheme.routeMap.surface,
  '--kaga-v2-green': sourceTheme.editorial.primaryGreen,
  '--kaga-v2-teal': sourceTheme.editorial.secondaryTeal,
  '--kaga-v2-gold': sourceTheme.editorial.goldHairline,
  '--kaga-v2-text': sourceTheme.editorial.titleColor,
  '--kaga-v2-text-secondary': sourceTheme.editorial.mutedText,
  '--kaga-v2-border-gold': sourceTheme.editorial.goldHairline,
};
