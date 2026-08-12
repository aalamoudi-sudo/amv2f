import type { ProjectRegistry } from './projectRegistry';

export const projectPreferenceStorageKey = 'mayadeen-project-portfolio-preferences:v1';

export interface ProjectPortfolioPreferences {
  lastProjectId: string | null;
  recentProjectIds: string[];
  lastOpenedAtByProject: Record<string, string>;
}

const emptyPreferences = (): ProjectPortfolioPreferences => ({ lastProjectId: null, recentProjectIds: [], lastOpenedAtByProject: {} });

export function readProjectPreferences(storage: Pick<Storage, 'getItem'>, registry: ProjectRegistry): ProjectPortfolioPreferences {
  try {
    const raw = storage.getItem(projectPreferenceStorageKey);
    if (!raw) return emptyPreferences();
    const candidate = JSON.parse(raw) as Partial<ProjectPortfolioPreferences>;
    const available = new Set(registry.list().filter((project) => project.projectStatus !== 'archived').map((project) => project.projectId));
    const recentProjectIds = Array.isArray(candidate.recentProjectIds)
      ? candidate.recentProjectIds.filter((id): id is string => typeof id === 'string' && available.has(id)).slice(0, 6)
      : [];
    const lastProjectId = typeof candidate.lastProjectId === 'string' && available.has(candidate.lastProjectId)
      ? candidate.lastProjectId
      : null;
    const lastOpenedAtByProject = Object.fromEntries(Object.entries(candidate.lastOpenedAtByProject ?? {}).filter(([id, value]) => available.has(id) && typeof value === 'string'));
    return { lastProjectId, recentProjectIds, lastOpenedAtByProject };
  } catch {
    return emptyPreferences();
  }
}

export function recordOpenedProject(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  registry: ProjectRegistry,
  projectId: string,
  openedAt = new Date().toISOString()
): ProjectPortfolioPreferences {
  const project = registry.findById(projectId);
  if (!project || project.projectStatus === 'archived') return readProjectPreferences(storage, registry);
  const current = readProjectPreferences(storage, registry);
  const next = {
    lastProjectId: projectId,
    recentProjectIds: [projectId, ...current.recentProjectIds.filter((id) => id !== projectId)].slice(0, 6),
    lastOpenedAtByProject: { ...current.lastOpenedAtByProject, [projectId]: openedAt }
  };
  storage.setItem(projectPreferenceStorageKey, JSON.stringify(next));
  return next;
}
