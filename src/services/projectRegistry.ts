import type { EventThemePackage } from '../types/eventThemePackage';
import type {
  ProjectEventRecord,
  ProjectOperationalPackRecord,
  ProjectVenueRecord,
  ProjectWorkspace
} from '../types/projectWorkspace';
import { projectStatusValues, projectTruthContextValues, projectTypeValues } from '../types/projectWorkspace';

export type ProjectRegistryIssueCode =
  | 'duplicate-project-id'
  | 'duplicate-event-id'
  | 'duplicate-venue-id'
  | 'duplicate-pack-id'
  | 'invalid-project-contract'
  | 'dangling-event-reference'
  | 'dangling-venue-reference'
  | 'dangling-theme-reference'
  | 'dangling-pack-reference'
  | 'default-event-mismatch'
  | 'cross-project-event'
  | 'cross-project-venue'
  | 'cross-project-pack'
  | 'event-venue-mismatch'
  | 'theme-event-mismatch';

export interface ProjectRegistryIssue {
  code: ProjectRegistryIssueCode;
  path: string;
  messageAr: string;
}

export class ProjectRegistryError extends Error {
  readonly issues: ProjectRegistryIssue[];

  constructor(issues: ProjectRegistryIssue[]) {
    super(issues[0]?.messageAr ?? 'فشل تحقق سجل المشاريع.');
    this.name = 'ProjectRegistryError';
    this.issues = issues;
  }
}

export interface ProjectRegistryInput {
  projects: ProjectWorkspace[];
  events: ProjectEventRecord[];
  venues: ProjectVenueRecord[];
  packs: ProjectOperationalPackRecord[];
  themes: readonly EventThemePackage[];
  fallbackTheme: EventThemePackage;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function cloneProject(project: ProjectWorkspace): ProjectWorkspace {
  return structuredClone(project);
}

export class ProjectRegistry {
  private readonly projects: Map<string, ProjectWorkspace>;
  private readonly events: Map<string, ProjectEventRecord>;
  private readonly venues: Map<string, ProjectVenueRecord>;
  private readonly packs: Map<string, ProjectOperationalPackRecord>;
  private readonly themes: Map<string, EventThemePackage>;
  private readonly fallbackTheme: EventThemePackage;

  constructor(input: ProjectRegistryInput) {
    const issues = ProjectRegistry.validate(input);
    if (issues.length) throw new ProjectRegistryError(issues);
    this.projects = new Map(input.projects.map((project) => [project.projectId, structuredClone(project)]));
    this.events = new Map(input.events.map((event) => [event.eventId, structuredClone(event)]));
    this.venues = new Map(input.venues.map((venue) => [venue.venueId, structuredClone(venue)]));
    this.packs = new Map(input.packs.map((pack) => [pack.packId, structuredClone(pack)]));
    this.themes = new Map(input.themes.map((theme) => [theme.themeId, structuredClone(theme)]));
    this.fallbackTheme = structuredClone(input.fallbackTheme);
  }

  static validate(input: ProjectRegistryInput): ProjectRegistryIssue[] {
    const issues: ProjectRegistryIssue[] = [];
    const add = (code: ProjectRegistryIssueCode, path: string, messageAr: string) => issues.push({ code, path, messageAr });
    duplicateValues(input.projects.map((project) => project.projectId)).forEach((id) => add('duplicate-project-id', '$.projects', `معرّف المشروع مكرر: ${id}`));
    duplicateValues(input.events.map((event) => event.eventId)).forEach((id) => add('duplicate-event-id', '$.events', `معرّف الفعالية مكرر: ${id}`));
    duplicateValues(input.venues.map((venue) => venue.venueId)).forEach((id) => add('duplicate-venue-id', '$.venues', `معرّف الموقع مكرر: ${id}`));
    duplicateValues(input.packs.map((pack) => pack.packId)).forEach((id) => add('duplicate-pack-id', '$.packs', `معرّف الحزمة مكرر: ${id}`));

    const projects = new Map(input.projects.map((project) => [project.projectId, project]));
    const events = new Map(input.events.map((event) => [event.eventId, event]));
    const venues = new Map(input.venues.map((venue) => [venue.venueId, venue]));
    const packs = new Map(input.packs.map((pack) => [pack.packId, pack]));
    const themes = new Map(input.themes.map((theme) => [theme.themeId, theme]));
    themes.set(input.fallbackTheme.themeId, input.fallbackTheme);

    input.projects.forEach((project, projectIndex) => {
      const path = `$.projects[${projectIndex}]`;
      if (!project.projectId || !project.organizationId || !project.nameAr || !project.nameEn || !project.description
        || !project.owner.organizationId || project.owner.organizationId !== project.organizationId
        || !project.dateRange.timeZone || !project.createdAt || !project.updatedAt || project.revision < 1 || !project.contentHash
        || !projectStatusValues.includes(project.projectStatus)
        || !projectTruthContextValues.includes(project.truthContext)
        || !projectTypeValues.includes(project.projectType)
        || !project.eventIds.length || !project.venueIds.length || !project.defaultEventId || !project.themeId
        || !project.sourceReferences.length) {
        add('invalid-project-contract', path, `عقد المشروع ${project.projectId || projectIndex} غير مكتمل.`);
      }
      if (!project.eventIds.includes(project.defaultEventId)) add('default-event-mismatch', `${path}.defaultEventId`, 'الفعالية الافتراضية ليست ضمن فعاليات المشروع.');
      project.eventIds.forEach((eventId) => {
        const event = events.get(eventId);
        if (!event) add('dangling-event-reference', `${path}.eventIds`, `مرجع فعالية غير موجود: ${eventId}`);
        else if (event.projectId !== project.projectId) add('cross-project-event', `${path}.eventIds`, `الفعالية ${eventId} تعود إلى مشروع آخر.`);
      });
      project.venueIds.forEach((venueId) => {
        const venue = venues.get(venueId);
        if (!venue) add('dangling-venue-reference', `${path}.venueIds`, `مرجع موقع غير موجود: ${venueId}`);
        else if (venue.projectId !== project.projectId) add('cross-project-venue', `${path}.venueIds`, `الموقع ${venueId} يعود إلى مشروع آخر.`);
      });
      const theme = themes.get(project.themeId);
      if (!theme) add('dangling-theme-reference', `${path}.themeId`, `مرجع الثيم غير موجود: ${project.themeId}`);
      else if (theme.themeId !== input.fallbackTheme.themeId && theme.eventId !== project.defaultEventId) add('theme-event-mismatch', `${path}.themeId`, 'الثيم لا يطابق الفعالية الافتراضية للمشروع.');
      project.operationalPackIds.forEach((packId) => {
        const pack = packs.get(packId);
        if (!pack) add('dangling-pack-reference', `${path}.operationalPackIds`, `مرجع حزمة غير موجود: ${packId}`);
        else if (pack.projectId !== project.projectId || !project.eventIds.includes(pack.eventId)) add('cross-project-pack', `${path}.operationalPackIds`, `الحزمة ${packId} خارج نطاق المشروع.`);
      });
    });

    input.events.forEach((event, eventIndex) => {
      const project = projects.get(event.projectId);
      if (!project || !project.eventIds.includes(event.eventId)) add('cross-project-event', `$.events[${eventIndex}]`, `الفعالية ${event.eventId} غير مرتبطة بمشروعها من الطرفين.`);
      event.venueIds.forEach((venueId) => {
        const venue = venues.get(venueId);
        if (!venue || venue.projectId !== event.projectId || !project?.venueIds.includes(venueId)) add('event-venue-mismatch', `$.events[${eventIndex}].venueIds`, `الموقع ${venueId} لا ينتمي إلى مشروع الفعالية.`);
      });
      if (event.runtimePackageId) {
        const pack = packs.get(event.runtimePackageId);
        if (!pack) add('dangling-pack-reference', `$.events[${eventIndex}].runtimePackageId`, `حزمة Runtime غير موجودة: ${event.runtimePackageId}`);
        else if (pack.projectId !== event.projectId || pack.eventId !== event.eventId) add('cross-project-pack', `$.events[${eventIndex}].runtimePackageId`, 'حزمة Runtime خارج نطاق الفعالية.');
      }
      if (event.experiencePackId) {
        const pack = packs.get(event.experiencePackId);
        if (!pack) add('dangling-pack-reference', `$.events[${eventIndex}].experiencePackId`, `حزمة تجربة غير موجودة: ${event.experiencePackId}`);
        else if (pack.projectId !== event.projectId || pack.eventId !== event.eventId) add('cross-project-pack', `$.events[${eventIndex}].experiencePackId`, 'حزمة التجربة خارج نطاق الفعالية.');
      }
      if (event.readinessPackId) {
        const pack = packs.get(event.readinessPackId);
        if (!pack) add('dangling-pack-reference', `$.events[${eventIndex}].readinessPackId`, `حزمة الجاهزية غير موجودة: ${event.readinessPackId}`);
        else if (pack.projectId !== event.projectId || pack.eventId !== event.eventId || pack.kind !== 'readiness') {
          add('cross-project-pack', `$.events[${eventIndex}].readinessPackId`, 'حزمة الجاهزية خارج نطاق الفعالية أو من نوع غير صحيح.');
        }
      }
    });

    return issues;
  }

  list(): ProjectWorkspace[] {
    return [...this.projects.values()].map(cloneProject);
  }

  findById(projectId: string): ProjectWorkspace | null {
    const project = this.projects.get(projectId);
    return project ? cloneProject(project) : null;
  }

  findProjectByEventId(eventId: string): ProjectWorkspace | null {
    const event = this.events.get(eventId);
    return event ? this.findById(event.projectId) : null;
  }

  getEvents(projectId: string): ProjectEventRecord[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    return project.eventIds.map((eventId) => structuredClone(this.events.get(eventId)!));
  }

  getVenues(projectId: string): ProjectVenueRecord[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    return project.venueIds.map((venueId) => structuredClone(this.venues.get(venueId)!));
  }

  resolveEvent(projectId: string, eventId?: string | null): ProjectEventRecord | null {
    const project = this.projects.get(projectId);
    if (!project) return null;
    const requested = eventId ?? project.defaultEventId;
    if (!project.eventIds.includes(requested)) return null;
    return structuredClone(this.events.get(requested)!);
  }

  resolveTheme(projectId: string, eventId?: string | null): EventThemePackage | null {
    const project = this.projects.get(projectId);
    const event = project ? this.resolveEvent(projectId, eventId) : null;
    if (!project || !event) return null;
    const theme = project.themeId === this.fallbackTheme.themeId
      ? this.fallbackTheme
      : this.themes.get(project.themeId);
    if (!theme) return null;
    if (theme.themeId === this.fallbackTheme.themeId) return structuredClone(this.fallbackTheme);
    return theme.eventId === event.eventId ? structuredClone(theme) : null;
  }

  assertEventInProject(projectId: string, eventId: string): boolean {
    return Boolean(this.projects.get(projectId)?.eventIds.includes(eventId) && this.events.get(eventId)?.projectId === projectId);
  }

  assertVenueInProject(projectId: string, venueId: string): boolean {
    return Boolean(this.projects.get(projectId)?.venueIds.includes(venueId) && this.venues.get(venueId)?.projectId === projectId);
  }

  assertPackInProject(projectId: string, packId: string): boolean {
    return this.packs.get(packId)?.projectId === projectId;
  }
}
