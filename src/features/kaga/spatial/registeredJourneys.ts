import { journeys } from '../data/journeys';
import { getEventProposalPlaceForStop } from '../data/eventProposalPlaceWhitelist';
import type { JourneyId, JourneyStop } from '../data/spatialTypes';
import { legacyPointToSourceSpatial } from './sourceSpatialModel';

export type SpatialCoordinate = readonly [number, number];
export type AnchorConfidence = 'exact' | 'high' | 'approximate';
export type RegisteredSegmentKind =
  | 'offSiteApproach'
  | 'parkingArrival'
  | 'internalCirculation'
  | 'optionalBranch'
  | 'exit';

export interface RegisteredJourneyStop {
  journeyId: JourneyId;
  stopId: string;
  code: string;
  eventSourcePages: number[];
  eventLabel: string;
  durationMinutes?: number;
  detailAr?: string;
  canonicalPlaceId: string;
  mapPoint: SpatialCoordinate;
  physicalEntityId?: string;
  anchorSource: string;
  anchorConfidence: AnchorConfidence;
  registrationNotes: string;
  pathProgress: number;
}

export interface RegisteredJourneySegment {
  journeyId: JourneyId;
  segmentId: string;
  fromStopId: string;
  toStopId: string;
  kind: RegisteredSegmentKind;
  geometry: SpatialCoordinate[];
  geometrySource: 'rhino-pathway' | 'event-authored';
  eventSourcePages: number[];
  physicalSource: string;
  registrationMethod: string;
  confidence: AnchorConfidence;
}

export interface RegisteredJourney {
  journeyId: JourneyId;
  titleAr: string;
  eventSourcePages: number[];
  color: string;
  presentationDurationSeconds: number;
  sourceCoordinateSpace: 'KAGA-SOURCE-2D-V1';
  registrationStatus: 'pathway-registered' | 'physically-anchored';
  stops: RegisteredJourneyStop[];
  segments: RegisteredJourneySegment[];
  geometry: SpatialCoordinate[];
  pathD: string;
}

export interface RouteRegistrationAudit {
  journeyId: JourneyId;
  reviewPriority: number;
  eventSourcePages: number[];
  evidenceReviewed: string[];
  outcome: 'preserved-event-authored' | 'frozen-pathway-registered';
  strongestDefensibleConfidence: AnchorConfidence;
  automaticShortestPathUsed: false;
  notes: string;
}

const distance = (left: SpatialCoordinate, right: SpatialCoordinate) =>
  Math.hypot(right[0] - left[0], right[1] - left[1]);

const cumulativeDistances = (points: SpatialCoordinate[]) => {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1]! + distance(points[index - 1]!, points[index]!));
  }
  return cumulative;
};

const segmentKind = (index: number, stopCount: number, toStop: JourneyStop): RegisteredSegmentKind => {
  if (index === 0) return 'offSiteApproach';
  if (toStop.title.includes('المواقف') || toStop.title.includes('النزول')) return 'parkingArrival';
  if (index === stopCount - 2) return 'exit';
  return 'internalCirculation';
};

const sampleEventSvgPath = (path: string): SpatialCoordinate[] => {
  const tokens = path.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const sampled: SpatialCoordinate[] = [];
  let index = 0;
  let command = '';
  let current: SpatialCoordinate = [0, 0];
  const number = () => Number(tokens[index++]);
  const register = (point: SpatialCoordinate) => {
    const migrated = legacyPointToSourceSpatial({ x: point[0], y: point[1] });
    sampled.push([Number(migrated.x.toFixed(3)), Number(migrated.y.toFixed(3))]);
  };
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index]!)) command = tokens[index++]!.toUpperCase();
    if (command === 'M') {
      current = [number(), number()];
      register(current);
      command = 'L';
      continue;
    }
    if (command === 'L') {
      current = [number(), number()];
      register(current);
      continue;
    }
    if (command === 'C') {
      const start = current;
      const controlOne: SpatialCoordinate = [number(), number()];
      const controlTwo: SpatialCoordinate = [number(), number()];
      const end: SpatialCoordinate = [number(), number()];
      for (let step = 1; step <= 14; step += 1) {
        const t = step / 14;
        const inverse = 1 - t;
        register([
          inverse ** 3 * start[0] + 3 * inverse ** 2 * t * controlOne[0] + 3 * inverse * t ** 2 * controlTwo[0] + t ** 3 * end[0],
          inverse ** 3 * start[1] + 3 * inverse ** 2 * t * controlOne[1] + 3 * inverse * t ** 2 * controlTwo[1] + t ** 3 * end[1],
        ]);
      }
      current = end;
      continue;
    }
    throw new Error(`Unsupported KAGA route command: ${command}`);
  }
  return sampled;
};

const pointAtPolylineProgress = (points: SpatialCoordinate[], progress: number): SpatialCoordinate => {
  const cumulative = cumulativeDistances(points);
  const target = (cumulative.at(-1) ?? 0) * progress;
  for (let index = 1; index < cumulative.length; index += 1) {
    if (target > cumulative[index]!) continue;
    const startLength = cumulative[index - 1]!;
    const segmentLength = cumulative[index]! - startLength;
    const ratio = segmentLength === 0 ? 0 : (target - startLength) / segmentLength;
    const from = points[index - 1]!;
    const to = points[index]!;
    return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
  }
  return points.at(-1)!;
};

const buildJourney = (journey: (typeof journeys)[number]): RegisteredJourney => {
  const sampledEventPath = sampleEventSvgPath(journey.playbackPath);
  const sampledProgress = cumulativeDistances(sampledEventPath).map((value, _index, values) => value / values.at(-1)!);
  const anchorPoints = journey.stops.map((stop) => pointAtPolylineProgress(sampledEventPath, stop.pathProgress));
  const geometry: SpatialCoordinate[] = [anchorPoints[0]!];
  const stopVertexIndexes: number[] = [0];
  journey.stops.slice(1).forEach((stop, index) => {
    const previousProgress = journey.stops[index]!.pathProgress;
    sampledEventPath.forEach((point, pointIndex) => {
      const pointProgress = sampledProgress[pointIndex]!;
      if (pointProgress > previousProgress && pointProgress < stop.pathProgress) geometry.push(point);
    });
    geometry.push(anchorPoints[index + 1]!);
    stopVertexIndexes.push(geometry.length - 1);
  });
  const lastStopProgress = journey.stops.at(-1)!.pathProgress;
  sampledEventPath.forEach((point, pointIndex) => {
    if (sampledProgress[pointIndex]! > lastStopProgress) geometry.push(point);
  });
  const cumulative = cumulativeDistances(geometry);
  const totalLength = cumulative.at(-1) ?? 1;

  const stops: RegisteredJourneyStop[] = journey.stops.map((stop, index) => {
    const canonicalPlace = getEventProposalPlaceForStop(journey.id, stop.code);
    if (!canonicalPlace) throw new Error(`Missing Event Proposal place mapping: ${journey.id}:${stop.code}`);
    const physicalEntityId = canonicalPlace.kind === 'garden' && canonicalPlace.executiveMapEligible
      ? canonicalPlace.id
      : undefined;
    return {
      journeyId: journey.id,
      stopId: stop.id,
      code: stop.code,
      eventSourcePages: stop.source.pdfPages,
      eventLabel: stop.title,
      durationMinutes: stop.durationMinutes,
      detailAr: stop.detailAr,
      canonicalPlaceId: canonicalPlace.id,
      mapPoint: anchorPoints[index]!,
      physicalEntityId,
      anchorSource: physicalEntityId
        ? 'Knowledge Guide page 13 + Rhino source curve'
        : 'Event PDF control point migrated into KAGA-SOURCE-2D-V1',
      anchorConfidence: physicalEntityId ? 'high' : 'approximate',
      registrationNotes: physicalEntityId
        ? 'محطة مرتبطة بكيان حديقة مسجل عالي الثقة.'
        : 'المحطة مثبتة ماديًا داخل حدود المخطط؛ لا يُدّعى تطابق مساحي مساحي/مساحي survey.',
      pathProgress: Number((cumulative[stopVertexIndexes[index]!]! / totalLength).toFixed(8)),
    };
  });

  const segments: RegisteredJourneySegment[] = stops.slice(0, -1).map((stop, index) => {
    const next = stops[index + 1]!;
    const startVertex = stopVertexIndexes[index]!;
    const endVertex = stopVertexIndexes[index + 1]!;
    const isWorkers = journey.id === 'workers';
    return {
      journeyId: journey.id,
      segmentId: `${journey.id}-registered-${index + 1}`,
      fromStopId: stop.stopId,
      toStopId: next.stopId,
      kind: segmentKind(index, stops.length, journey.stops[index + 1]!),
      geometry: geometry.slice(startVertex, endVertex + 1),
      geometrySource: isWorkers ? 'rhino-pathway' : 'event-authored',
      eventSourcePages: journey.source.pdfPages,
      physicalSource: isWorkers
        ? 'S19093-0200S-Pathways and Service Access Roads$0$L-SECONDARY ROAD HATCH'
        : 'KAGA-SOURCE-2D-V1 masterplan frame',
      registrationMethod: isWorkers
        ? 'manual-source-pathway-trace-preserving-event-stop-order'
        : 'event-control-point-registration-no-shortest-path',
      confidence: isWorkers ? 'high' : 'approximate',
    };
  });

  return {
    journeyId: journey.id,
    titleAr: journey.title,
    eventSourcePages: journey.source.pdfPages,
    color: journey.color,
    presentationDurationSeconds: journey.presentationDurationSeconds,
    sourceCoordinateSpace: 'KAGA-SOURCE-2D-V1',
    registrationStatus: journey.id === 'workers' ? 'pathway-registered' : 'physically-anchored',
    stops,
    segments,
    geometry,
    pathD: geometry.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' '),
  };
};

export const registeredJourneys: RegisteredJourney[] = journeys.map(buildJourney);

export const registeredJourneyById = Object.fromEntries(
  registeredJourneys.map((journey) => [journey.journeyId, journey]),
) as Record<JourneyId, RegisteredJourney>;

/**
 * Gate 4/5 route-refinement audit.
 *
 * The Event PDF pages establish route meaning, direction, and stop sequence,
 * while the frozen Gate 2/3 pathway export establishes physical circulation.
 * The export does not carry a route-specific semantic link from a PDF segment
 * to a particular Rhino object. Consequently, the five non-workers routes are
 * intentionally preserved instead of being snapped by proximity or shortest
 * path. This record is development provenance and is not executive UI copy.
 */
export const routeRegistrationAudit: RouteRegistrationAudit[] = [
  {
    journeyId: 'workers',
    reviewPriority: 0,
    eventSourcePages: [7],
    evidenceReviewed: [
      'Frozen Gate 2/3 end-to-end manual pathway trace',
      'S19093-0200S-Pathways and Service Access Roads$0$L-SECONDARY ROAD HATCH',
    ],
    outcome: 'frozen-pathway-registered',
    strongestDefensibleConfidence: 'high',
    automaticShortestPathUsed: false,
    notes: 'Frozen by Gate 4/5 approval; no geometry, stop, or timeline change.',
  },
  ...([
    ['prince', 1, 25],
    ['mayorMedia', 2, 34],
    ['guests', 3, 26],
    ['media', 4, 35],
    ['mayor', 5, 8],
  ] as const).map(([journeyId, reviewPriority, eventPage]): RouteRegistrationAudit => ({
    journeyId,
    reviewPriority,
    eventSourcePages: [eventPage],
    evidenceReviewed: [
      `Event PDF route map page ${eventPage}`,
      'KAGA-SOURCE-2D-V1/pathways.geojson',
      'Frozen Gate 2/3 physical stop anchors',
    ],
    outcome: 'preserved-event-authored',
    strongestDefensibleConfidence: 'approximate',
    automaticShortestPathUsed: false,
    notes: 'No route-specific Rhino-object correspondence exists in the frozen evidence. Geometry is preserved rather than snapped by proximity.',
  })),
];

export const registeredOptionalBranches = journeys.flatMap((journey) =>
  (journey.optionalBranches ?? []).map((branch) => ({
    journeyId: journey.id,
    branchId: branch.id,
    titleAr: branch.title,
    kind: 'optionalBranch' as const,
    eventSourcePages: branch.source.pdfPages,
    registrationMethod: 'event-authored-branch-held-separate-from-primary-timeline',
    confidence: 'approximate' as const,
  })),
);

export function pointAtRegisteredProgress(journey: RegisteredJourney, progress: number): SpatialCoordinate {
  const bounded = Math.max(0, Math.min(1, progress));
  const cumulative = cumulativeDistances(journey.geometry);
  const target = (cumulative.at(-1) ?? 0) * bounded;
  for (let index = 1; index < cumulative.length; index += 1) {
    if (target > cumulative[index]!) continue;
    const segmentStart = cumulative[index - 1]!;
    const segmentLength = cumulative[index]! - segmentStart;
    const ratio = segmentLength === 0 ? 0 : (target - segmentStart) / segmentLength;
    const from = journey.geometry[index - 1]!;
    const to = journey.geometry[index]!;
    return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
  }
  return journey.geometry.at(-1)!;
}

export function activeRegisteredStopIndex(journey: RegisteredJourney, progress: number) {
  let activeIndex = 0;
  for (let index = 0; index < journey.stops.length; index += 1) {
    if (progress + 1e-8 < journey.stops[index]!.pathProgress) break;
    activeIndex = index;
  }
  return activeIndex;
}

export function pointToRegisteredRouteDistance(point: SpatialCoordinate, journey: RegisteredJourney) {
  let minimum = Number.POSITIVE_INFINITY;
  journey.geometry.forEach((left, index) => {
    const right = journey.geometry[index + 1];
    if (!right) return;
    const dx = right[0] - left[0];
    const dy = right[1] - left[1];
    const denominator = dx * dx + dy * dy;
    const ratio = denominator === 0
      ? 0
      : Math.max(0, Math.min(1, ((point[0] - left[0]) * dx + (point[1] - left[1]) * dy) / denominator));
    minimum = Math.min(minimum, Math.hypot(point[0] - (left[0] + dx * ratio), point[1] - (left[1] + dy * ratio)));
  });
  return minimum;
}
