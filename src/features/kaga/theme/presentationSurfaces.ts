export type PresentationArchetype =
  | 'editorial-render'
  | 'route-map'
  | 'event-day'
  | 'quiet-identity'
  | 'minimal-shell';

export type PresentationSurfaceId =
  | 'intro'
  | 'project-scale'
  | 'four-days'
  | 'masterplan'
  | 'garden-explorer'
  | 'garden-detail'
  | 'stop-inspector'
  | 'experiences'
  | 'crescent-story'
  | 'royal-moment'
  | 'launch-show'
  | 'mobile-exhibition'
  | 'invitation-experience'
  | 'visual-identity'
  | 'visual-museum'
  | 'presenter-shell';

export const presentationArchetypeBySurface = {
  intro: 'editorial-render',
  'project-scale': 'editorial-render',
  'four-days': 'event-day',
  masterplan: 'route-map',
  'garden-explorer': 'route-map',
  'garden-detail': 'quiet-identity',
  'stop-inspector': 'route-map',
  experiences: 'editorial-render',
  'crescent-story': 'editorial-render',
  'royal-moment': 'editorial-render',
  'launch-show': 'editorial-render',
  'mobile-exhibition': 'quiet-identity',
  'invitation-experience': 'quiet-identity',
  'visual-identity': 'quiet-identity',
  'visual-museum': 'editorial-render',
  'presenter-shell': 'minimal-shell',
} as const satisfies Record<PresentationSurfaceId, PresentationArchetype>;

export function presentationSurfaceAttributes(surface: PresentationSurfaceId) {
  return {
    'data-presentation-surface': surface,
    'data-presentation-archetype': presentationArchetypeBySurface[surface],
  } as const;
}
