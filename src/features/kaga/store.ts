import { create } from 'zustand';
import type { KagaSection } from './types';

interface KagaExperienceState {
  section: KagaSection;
  presenterMode: boolean;
  chromeHidden: boolean;
  selectedExperienceId?: string;
  setSection: (section: KagaSection) => void;
  setPresenterMode: (enabled: boolean) => void;
  toggleChrome: () => void;
  openExperience: (experienceId: string) => void;
}

export const useKagaExperienceStore = create<KagaExperienceState>((set) => ({
  section: 'days',
  presenterMode: false,
  chromeHidden: false,
  setSection: (section) => set({ section, selectedExperienceId: undefined }),
  setPresenterMode: (presenterMode) => set({ presenterMode, chromeHidden: presenterMode }),
  toggleChrome: () => set((state) => ({ chromeHidden: !state.chromeHidden })),
  openExperience: (selectedExperienceId) =>
    set({ section: 'experiences', selectedExperienceId }),
}));

