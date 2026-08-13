export interface SourceReference {
  pdfPages: number[];
  sourceLabel?: string;
  notes?: string;
  sourceFilename?: string;
  sourceSha256?: string;
  slideNumbers?: number[];
}

export type SpatialCoordinateSpace = "KAGA-PDF-RECONSTRUCTION-1200x900" | "KAGA-VISITOR-V15-SLIDE-4";

export interface SpatialRegistrationTransform {
  sourceCoordinateSpace: SpatialCoordinateSpace;
  targetCoordinateSpace: "KAGA-SOURCE-2D-V1";
  /** SVG affine matrix: x' = ax + cy + e, y' = bx + dy + f. */
  matrix: readonly [number, number, number, number, number, number];
  method: string;
  confidence: "high" | "approximate";
}

export type JourneyId = "workers" | "mayor" | "prince" | "guests" | "mayorMedia" | "media";

export interface MapPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  source: SourceReference;
}

export interface JourneyStop {
  id: string;
  code: string;
  title: string;
  durationMinutes?: number;
  detailAr?: string;
  point: MapPoint;
  experienceId?: string;
  /** Calibrated position on the SVG playback path, from 0 to 1. */
  pathProgress: number;
  /** Optional branch identifier. Omitted for the primary playback timeline. */
  branchId?: string;
  /** Major stops introduce a short presentation pause during playback. */
  isMajor?: boolean;
  /** Authored source segment that leaves this stop. */
  outgoingSegmentId?: string;
  /** Keep a source control-point marker separate from the nearest route point. */
  preserveSourcePoint?: boolean;
  source: SourceReference;
}

export type JourneySegmentKind = "entry" | "tour" | "exit" | "shuttle" | "optional";

export interface JourneySegment {
  id: string;
  kind: JourneySegmentKind;
  label: string;
  path: string;
  distanceMeters?: number;
  realDurationMinutes?: number;
  transport: "walking" | "golf-cart" | "shuttle" | "vehicle";
  sourceVisual?: {
    code: "road-entry" | "golf-entry" | "tour" | "golf-exit" | "final-exit";
    color: string;
    pattern: "solid" | "dashed";
    labelAr: string;
  };
  source: SourceReference;
}

export interface SpatialJourney {
  id: JourneyId;
  title: string;
  window: string;
  color: string;
  presentationDurationSeconds: number;
  focus: { x: number; y: number; scale: number };
  stops: JourneyStop[];
  segments: JourneySegment[];
  playbackPath: string;
  optionalBranches?: JourneyBranch[];
  registrationTransform?: SpatialRegistrationTransform;
  contextNotesAr?: string[];
  source: SourceReference;
}

export interface JourneyBranch {
  id: string;
  title: string;
  path: string;
  stops: JourneyStop[];
  source: SourceReference;
}
