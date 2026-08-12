import type { ReactNode } from 'react';
import { ActiveProjectContext, type ActiveProjectContextValue } from './ProjectContext';

export function ActiveProjectProvider({ value, children }: { value: ActiveProjectContextValue; children: ReactNode }) {
  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>;
}
