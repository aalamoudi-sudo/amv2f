import { executiveGardenRegistrations } from '../spatial/gardenRegistration';
import { eventProposalPlaceById } from '../data/eventProposalPlaceWhitelist';

export type IllustratedMapReading = 'masterplan' | 'illustrated' | 'story';

export const illustratedMapReadings: Array<{ id: IllustratedMapReading; labelAr: string }> = [
  { id: 'masterplan', labelAr: 'المخطط' },
  { id: 'illustrated', labelAr: 'الخريطة التصويرية' },
  { id: 'story', labelAr: 'قصة التدشين' },
];

export const illustratedMapRegistration = {
  schemaVersion: '1.0.0',
  designation: 'KAGA-ILLUSTRATED-MAP-REGISTERED-V1',
  sourceRole: 'visual-cartographic-source',
  sourceSha256: 'be5ae3075ca9b7afa1fcfdb58b4178f67b1b6a87a7bd3d0733cdd7a3ebc46c00',
  canonicalCoordinateSpace: 'KAGA-SOURCE-2D-V1',
  sourceImageSize: [2800, 1998] as const,
  canonicalTransform: {
    scale: 0.3134,
    translate: [683.0, 331.1] as const,
    svgMatrix: 'matrix(0.3134 0 0 0.3134 683 331.1)',
  },
  controlPoints: [
    { id: 'central-landscape', illustrator: [1220, 960], canonical: [1065.3, 631.9] },
    { id: 'east-arrival-loop', illustrator: [2192, 986], canonical: [1370.0, 640.1] },
    { id: 'south-east-service-loop', illustrator: [2240, 1590], canonical: [1384.6, 829.4] },
    { id: 'west-approach', illustrator: [680, 920], canonical: [896.1, 619.4] },
  ],
  runtimeAssets: {
    land: '/kaga/illustrated-map/illustrated-land.webp',
    water: '/kaga/illustrated-map/illustrated-water.webp',
    paths: '/kaga/illustrated-map/illustrated-paths.webp',
    vegetation: '/kaga/illustrated-map/illustrated-vegetation.webp',
    architecture: '/kaga/illustrated-map/illustrated-architecture.webp',
    composite: '/kaga/illustrated-map/illustrated-composite.webp',
    manifest: '/kaga/illustrated-map/manifest.json',
  },
} as const;

const registeredCentroids: Record<string, readonly [number, number]> = {
  devonianGarden: [1015.727, 593.321],
  plioceneGarden: [1221.966, 484.033],
  optionsGarden: [1244.47, 571.505],
  butterflyGarden: [696.223, 916.257],
  mazeGarden: [853.467, 966.942],
  soundLightGarden: [981.555, 965.212],
};

export const illustratedRegisteredHotspots = executiveGardenRegistrations.map((garden) => ({
  id: garden.canonicalGardenId,
  titleAr: eventProposalPlaceById[garden.canonicalGardenId]!.displayNameAr,
  point: registeredCentroids[garden.canonicalGardenId]!,
  confidence: garden.confidence,
}));

export const isCanonicalRuntimeLabel = (label: string) =>
  illustratedRegisteredHotspots.some((hotspot) => hotspot.titleAr === label);

export const preserveCanonicalPointAcrossReadings = (
  point: readonly [number, number],
  reading: IllustratedMapReading,
) => {
  void reading;
  return point;
};
