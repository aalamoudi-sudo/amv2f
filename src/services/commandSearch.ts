import { createIoTLabConfiguration } from '../data/iotFixtures';
import { experienceIntelligenceCatalog } from '../data/experienceIntelligencePacks';
import type { DecisionId, DecisionRecord } from '../types/decision';
import type { RouteDefinition } from '../types/routes';
import type { SpatialEntityId, SpatialEntityRecord, ZoneReadinessRecord } from '../types/spatial';
import type { CommandWorkspace } from '../ux/commandExperience';

export type CommandSearchKind =
  | 'event'
  | 'venue'
  | 'entity'
  | 'route'
  | 'decision'
  | 'readiness'
  | 'device'
  | 'datastream'
  | 'experience-point';

export interface CommandSearchResult {
  id: string;
  kind: CommandSearchKind;
  titleAr: string;
  subtitleAr: string;
  searchText: string[];
  scope: 'operational' | 'candidate-experience' | 'local-simulator';
  eventId: string | null;
  venueId: string | null;
  workspace: CommandWorkspace;
  entityId?: SpatialEntityId;
  decisionId?: DecisionId;
  experienceEventId?: string;
}

export interface CommandSearchInput {
  entities: SpatialEntityRecord;
  routes: RouteDefinition[];
  decisions: DecisionRecord[];
  readiness: ZoneReadinessRecord[];
  activeEventId: string | null;
  activeVenueId: string | null;
  activeEventNameAr: string | null;
  mappingVersion: string;
}

export function normalizeCommandSearch(value: string): string {
  return value
    .toLocaleLowerCase('ar')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}-]+/gu, ' ')
    .trim();
}

function result(
  input: Omit<CommandSearchResult, 'searchText'> & { searchText: Array<string | null | undefined> }
): CommandSearchResult {
  return { ...input, searchText: input.searchText.filter((value): value is string => Boolean(value)) };
}

function entityKindLabel(entityId: string): string {
  if (entityId.startsWith('ZONE-')) return 'منطقة';
  if (entityId.startsWith('GATE-')) return 'بوابة';
  if (entityId.startsWith('ASSET-')) return 'أصل';
  if (entityId.startsWith('ROUTE-')) return 'مسار';
  return 'عنصر مكاني';
}

/**
 * Builds a search index only from the active client runtime and explicit
 * candidate packs. It intentionally has no remote lookup or cross-event data.
 */
export function createCommandSearchIndex(input: CommandSearchInput): CommandSearchResult[] {
  const eventId = input.activeEventId ?? input.decisions[0]?.eventId ?? null;
  const venueId = input.activeVenueId ?? input.decisions[0]?.venueId ?? null;
  const records: CommandSearchResult[] = [];
  const entityValues = Object.values(input.entities);

  if (eventId) {
    records.push(result({
      id: 'event:' + eventId,
      kind: 'event',
      titleAr: input.activeEventNameAr ?? 'فعالية ضمن السياق المحلي',
      subtitleAr: eventId,
      searchText: [input.activeEventNameAr, eventId],
      scope: 'operational',
      eventId,
      venueId,
      workspace: 'executive'
    }));
  }

  if (venueId) {
    records.push(result({
      id: 'venue:' + venueId,
      kind: 'venue',
      titleAr: 'الموقع التشغيلي',
      subtitleAr: venueId,
      searchText: [venueId, 'الموقع التشغيلي'],
      scope: 'operational',
      eventId,
      venueId,
      workspace: 'spatial'
    }));
  }

  entityValues.forEach((entity) => {
    records.push(result({
      id: 'entity:' + entity.id,
      kind: 'entity',
      titleAr: entity.nameAr,
      subtitleAr: entityKindLabel(entity.id) + ' · ' + entity.id,
      searchText: [entity.nameAr, entity.nameEn, entity.id, entity.description],
      scope: 'operational',
      eventId,
      venueId,
      workspace: 'spatial',
      entityId: entity.id
    }));
  });

  input.routes.forEach((route) => {
    records.push(result({
      id: 'route:' + route.id,
      kind: 'route',
      titleAr: route.nameAr,
      subtitleAr: 'مسار · ' + route.id,
      searchText: [route.nameAr, route.nameEn, route.id],
      scope: 'operational',
      eventId,
      venueId,
      workspace: 'spatial',
      entityId: route.id
    }));
  });

  input.decisions.forEach((decision) => {
    records.push(result({
      id: 'decision:' + decision.decisionId,
      kind: 'decision',
      titleAr: decision.title,
      subtitleAr: 'قرار · ' + decision.decisionId,
      searchText: [decision.title, decision.description, decision.decisionId, decision.decisionOwner, decision.responsibleParty],
      scope: 'operational',
      eventId: decision.eventId,
      venueId: decision.venueId,
      workspace: 'decisions',
      decisionId: decision.decisionId
    }));
  });

  input.readiness.forEach((readiness) => {
    const entity = input.entities[readiness.zoneId];
    records.push(result({
      id: 'readiness:' + readiness.zoneId,
      kind: 'readiness',
      titleAr: entity?.nameAr ?? readiness.zoneId,
      subtitleAr: 'جاهزية · ' + readiness.zoneId,
      searchText: [entity?.nameAr, entity?.nameEn, readiness.zoneId, readiness.requiredAction, readiness.responsibleParty],
      scope: 'operational',
      eventId,
      venueId,
      workspace: 'spatial',
      entityId: readiness.zoneId
    }));
  });

  const deviceConfiguration = entityValues.length
    ? createIoTLabConfiguration({
        configurationId: 'UX1-COMMAND-SEARCH',
        eventRef: eventId,
        venueId: venueId ?? 'VENUE-LOCAL-DEMO',
        mappingVersion: input.mappingVersion,
        entities: entityValues.map((entity) => ({ entityId: entity.id, labelAr: entity.nameAr }))
      })
    : null;
  deviceConfiguration?.devices.forEach((device) => {
    records.push(result({
      id: 'device:' + device.deviceId,
      kind: 'device',
      titleAr: device.nameAr,
      subtitleAr: 'جهاز محاكاة محلي · ' + device.deviceId,
      searchText: [device.nameAr, device.nameEn, device.deviceId, device.deviceClass],
      scope: 'local-simulator',
      eventId: device.eventRef,
      venueId: device.venueId,
      workspace: 'iot',
      entityId: device.spatialBinding.entityId
    }));
    device.streams.forEach((stream) => {
      records.push(result({
        id: 'stream:' + device.deviceId + ':' + stream.streamId,
        kind: 'datastream',
        titleAr: stream.nameAr,
        subtitleAr: 'قناة محاكاة محلية · ' + stream.streamId,
        searchText: [stream.nameAr, stream.nameEn, stream.streamId, stream.measurementType, device.deviceId],
        scope: 'local-simulator',
        eventId: device.eventRef,
        venueId: device.venueId,
        workspace: 'iot',
        entityId: device.spatialBinding.entityId
      }));
    });
  });

  experienceIntelligenceCatalog.forEach((entry) => {
    const pack = entry.pack;
    if (input.activeEventId && pack.eventId !== input.activeEventId) return;
    records.push(result({
      id: 'experience-event:' + pack.eventId,
      kind: 'event',
      titleAr: pack.eventNameAr,
      subtitleAr: 'حزمة تجربة ' + (pack.packageRole === 'demo' ? 'تجريبية' : pack.packageRole === 'reference' ? 'مرجعية' : 'مرشحة') + ' · ' + pack.eventId,
      searchText: [pack.eventNameAr, pack.eventId, pack.venueId],
      scope: 'candidate-experience',
      eventId: pack.eventId,
      venueId: pack.venueId,
      workspace: 'experience',
      experienceEventId: pack.eventId
    }));
    pack.experiencePoints.forEach((point) => {
      records.push(result({
        id: 'experience-point:' + point.experiencePointId,
        kind: 'experience-point',
        titleAr: point.nameAr,
        subtitleAr: 'نقطة تجربة مرشحة · ' + point.experiencePointId,
        searchText: [point.nameAr, point.experiencePointId, pack.eventNameAr, pack.eventId],
        scope: 'candidate-experience',
        eventId: pack.eventId,
        venueId: pack.venueId,
        workspace: 'experience',
        experienceEventId: pack.eventId
      }));
    });
  });

  return records;
}

export function searchCommandIndex(index: CommandSearchResult[], query: string, activeEventId: string | null): CommandSearchResult[] {
  const normalizedQuery = normalizeCommandSearch(query);
  const scoped = index.filter((item) => !activeEventId || item.eventId === activeEventId);
  if (!normalizedQuery) return scoped.slice(0, 9);
  const terms = normalizedQuery.split(/\s+/);
  return scoped
    .map((item) => {
      const haystack = normalizeCommandSearch(item.searchText.join(' '));
      const exactId = normalizeCommandSearch(item.id).includes(normalizedQuery);
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) + (exactId ? 2 : 0);
      return { item, score };
    })
    .filter(({ score }) => score >= terms.length)
    .sort((left, right) => right.score - left.score || left.item.titleAr.localeCompare(right.item.titleAr, 'ar'))
    .map(({ item }) => item)
    .slice(0, 24);
}
