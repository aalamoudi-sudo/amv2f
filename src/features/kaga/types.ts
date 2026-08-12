export interface SourceReference {
  pdfPages: number[];
  sourceLabel?: string;
  notes?: string;
}

export type KagaSection =
  | 'days'
  | 'map'
  | 'royal'
  | 'launch'
  | 'experiences'
  | 'mobile'
  | 'invitations'
  | 'identity'
  | 'museum';

export interface ExperienceItem {
  id: string;
  title: string;
  description: string;
  location?: string;
  image?: string;
  source: SourceReference;
}

export interface GalleryEnvironment {
  id: string;
  title: string;
  description?: string;
  images: Array<{ src: string; alt: string; source: SourceReference }>;
  source: SourceReference;
}

export interface ExhibitionQuestion {
  id: string;
  question: string;
  response: string;
  source: SourceReference;
}

export interface IdentityApplication {
  id: string;
  title: string;
  category: string;
  proposals: Array<{ label: string; image: string; source: SourceReference }>;
  source: SourceReference;
}
