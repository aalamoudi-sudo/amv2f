import type { CSSProperties } from 'react';

export const presentationFidelity = {
  colors: {
    pageIvory: '#F3EBDD',
    quietSurface: '#F8F3E9',
    presentationGreen: '#07594F',
    secondaryTeal: '#3F9185',
    softTurquoise: '#84B9AD',
    goldEdge: '#C6A25D',
    activeOrange: '#E96C19',
    titleText: '#16221F',
    bodyText: '#5C625C',
    warmNeutral: '#D8CCB9',
  },
  typography: {
    family: "'DIN Next Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif",
    heroTitle: '500 clamp(3.8rem, 5.1vw, 6.4rem)/1.18 var(--kaga-pf-font)',
    chapterTitle: '500 clamp(2.8rem, 4vw, 4.8rem)/1.22 var(--kaga-pf-font)',
    editorialTitle: '500 clamp(1.9rem, 2.8vw, 3.35rem)/1.35 var(--kaga-pf-font)',
    mapTitle: '500 clamp(1.7rem, 2.2vw, 2.75rem)/1.38 var(--kaga-pf-font)',
    sectionTitle: '500 clamp(2.8rem, 4vw, 4.8rem)/1.22 var(--kaga-pf-font)',
    editorialHeading: '500 clamp(1.9rem, 2.8vw, 3.35rem)/1.35 var(--kaga-pf-font)',
    body: '400 clamp(.94rem, 1vw, 1.15rem)/1.9 var(--kaga-pf-font)',
    metadata: '400 clamp(.76rem, .78vw, .9rem)/1.7 var(--kaga-pf-font)',
    microNavigation: '400 clamp(.64rem, .68vw, .78rem)/1.6 var(--kaga-pf-font)',
    micro: '400 clamp(.64rem, .68vw, .78rem)/1.6 var(--kaga-pf-font)',
  },
  spacing: {
    pageEdge: 'clamp(1.5rem, 3.35vw, 4.25rem)',
    editorialGap: 'clamp(1.4rem, 2.5vw, 3.4rem)',
    verticalRhythm: 'clamp(1.1rem, 2.1vh, 2rem)',
    textMeasure: '38rem',
  },
  lines: {
    goldKeyline: '1px',
    greenDivider: '2px',
  },
  composition: {
    editorial: '56fr 44fr',
    wideVisual: '63fr 37fr',
    map: '72fr 28fr',
    cinematic: '68fr 32fr',
  },
} as const;

export type PresentationFidelity = typeof presentationFidelity;

export const presentationFidelityCssVariables = {
  '--kaga-pf-page': presentationFidelity.colors.pageIvory,
  '--kaga-pf-surface': presentationFidelity.colors.quietSurface,
  '--kaga-pf-green': presentationFidelity.colors.presentationGreen,
  '--kaga-pf-teal': presentationFidelity.colors.secondaryTeal,
  '--kaga-pf-turquoise': presentationFidelity.colors.softTurquoise,
  '--kaga-pf-gold': presentationFidelity.colors.goldEdge,
  '--kaga-pf-orange': presentationFidelity.colors.activeOrange,
  '--kaga-pf-title': presentationFidelity.colors.titleText,
  '--kaga-pf-body': presentationFidelity.colors.bodyText,
  '--kaga-pf-warm-neutral': presentationFidelity.colors.warmNeutral,
  '--kaga-pf-font': presentationFidelity.typography.family,
  '--kaga-pf-hero-title': presentationFidelity.typography.heroTitle,
  '--kaga-pf-chapter-title': presentationFidelity.typography.chapterTitle,
  '--kaga-pf-editorial-title': presentationFidelity.typography.editorialTitle,
  '--kaga-pf-map-title': presentationFidelity.typography.mapTitle,
  '--kaga-pf-body-type': presentationFidelity.typography.body,
  '--kaga-pf-metadata': presentationFidelity.typography.metadata,
  '--kaga-pf-micro-nav': presentationFidelity.typography.microNavigation,
  '--kaga-pf-page-edge': presentationFidelity.spacing.pageEdge,
  '--kaga-pf-editorial-gap': presentationFidelity.spacing.editorialGap,
  '--kaga-pf-vertical-rhythm': presentationFidelity.spacing.verticalRhythm,
  '--kaga-pf-text-measure': presentationFidelity.spacing.textMeasure,
  '--kaga-pf-gold-keyline': presentationFidelity.lines.goldKeyline,
  '--kaga-pf-green-divider': presentationFidelity.lines.greenDivider,
} as CSSProperties;
