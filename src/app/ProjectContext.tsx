import { createContext, useContext } from 'react';
import type { ResolvedProjectConfiguration } from '../types/projectWorkspace';

export interface ActiveProjectContextValue {
  configuration: ResolvedProjectConfiguration | null;
  switching: boolean;
}

export const ActiveProjectContext = createContext<ActiveProjectContextValue>({ configuration: null, switching: false });

export function useActiveProject(): ActiveProjectContextValue {
  return useContext(ActiveProjectContext);
}
