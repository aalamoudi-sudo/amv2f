import type { ReactNode } from 'react';

export interface ExperienceSourceReference {
  pdfPages: number[];
  sourceLabel?: string;
  notes?: string;
}

export interface ExperienceNavigationItem {
  id: string;
  label: string;
  shortLabel?: string;
  source?: ExperienceSourceReference;
}

export interface InaugurationDay {
  id: string;
  ordinalLabel: string;
  title: string;
  gregorianDate?: string;
  hijriDate?: string;
  location?: string;
  attendance?: string;
  summary: string;
  journeyIds?: string[];
  entryPoints?: ExperienceNavigationItem[];
  source: ExperienceSourceReference;
}

export type LaunchLayerId = "xr" | "drones" | "fireworks";

export interface LaunchLayerDefinition {
  id: LaunchLayerId;
  label: string;
  description: string;
  source: ExperienceSourceReference;
}

export interface IntroExperienceProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  backgroundImageUrl?: string;
  source?: ExperienceSourceReference;
  onEnter: () => void;
}

export interface FourDayExperienceProps {
  days: InaugurationDay[];
  activeDayId?: string;
  onDayChange?: (dayId: string) => void;
  onOpenJourney?: (journeyId: string) => void;
  onOpenLegendaryJourney?: (journeyId: string) => void;
  onOpenExperience?: (experienceId: string) => void;
  renderDayVisual?: (day: InaugurationDay, dayIndex: number) => ReactNode;
  presentationFidelity?: boolean;
}
