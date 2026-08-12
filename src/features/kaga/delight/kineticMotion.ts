export const kineticMotion = {
  cinematicDescent: { duration: 7.2, ease: [0.16, 1, 0.3, 1] },
  siteReveal: { duration: 1.5, ease: [0.22, 1, 0.36, 1] },
  spatialApproach: { duration: 2.2, ease: [0.16, 1, 0.3, 1] },
  journeyTrace: { duration: 1.8, ease: [0.33, 1, 0.68, 1] },
  arrivalSettle: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
  apertureExpand: { duration: 5.2, ease: [0.76, 0, 0.24, 1] },
  xrayFocus: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
  spatialCollapse: { duration: 3.8, ease: [0.76, 0, 0.24, 1] },
  royalTease: { duration: 3.2, ease: [0.16, 1, 0.3, 1] },
} as const;

export type KineticMotionToken = keyof typeof kineticMotion;
