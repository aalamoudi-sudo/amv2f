import type { JourneySegment, SourceReference, SpatialRegistrationTransform } from './spatialTypes';

export const GUEST_JOURNEY_V15_SHA256 = '80cbd5c243102ad531252055adf9b677ae65a621ece409591ca7bcbd3283d46a';

export const guestJourneyV15Source: SourceReference = {
  pdfPages: [26],
  slideNumbers: [4],
  sourceLabel: 'مسارات الدخول — V.15 — رحلة الضيوف',
  sourceFilename: 'مسارات  الدخول اخر نسخة V.15 (1).pptx',
  sourceSha256: GUEST_JOURNEY_V15_SHA256,
  notes: 'الشريحة 4 هي مصدر تسلسل رحلة الضيوف وألوان قطاعات الحركة؛ Rhino يبقى مصدر الإحداثيات المكانية.',
};

export const guestJourneyV15Registration: SpatialRegistrationTransform & {
  inlierControlPoints: number;
  rmsErrorCanonicalUnits: number;
  maxErrorCanonicalUnits: number;
} = {
  sourceCoordinateSpace: 'KAGA-VISITOR-V15-SLIDE-4',
  targetCoordinateSpace: 'KAGA-SOURCE-2D-V1',
  matrix: [1.147877645, 0.000297634, -0.000297634, 1.147877645, 106.504973314, 208.125033174],
  method: 'background-linework-similarity-registration-ransac',
  confidence: 'high',
  inlierControlPoints: 38,
  rmsErrorCanonicalUnits: 0.746,
  maxErrorCanonicalUnits: 2.009,
};

export const guestJourneyV15StopPoints = {
  A: { x: 205.58, y: 75.59 },
  B: { x: 595.06, y: 171.67 },
  C: { x: 718.12, y: 437.6 },
  D: { x: 856.5, y: 202.93 },
  E: { x: 768.44, y: 216.33 },
  F: { x: 713.77, y: 253.93 },
  G: { x: 650.13, y: 253.93 },
  H: { x: 608.58, y: 286.3 },
  I: { x: 648.16, y: 443.51 },
  J: { x: 720.9, y: 470.11 },
  K: { x: 620.08, y: 204.99 },
  L: { x: 326.54, y: 10.64 },
} as const;

const entryPath = 'M 205.241 73.931 L 214.069 76.138 L 287.493 97.052 C 321.168 106.293 412.268 128.135 444.805 138.202 C 477.343 148.269 472.068 154.322 482.718 157.454 C 493.367 160.586 501.063 156.386 508.702 156.995 C 516.341 157.603 517.537 158.860 528.551 161.104 C 539.566 163.347 551.106 170.621 574.788 170.457';
const golfEntryPath = 'M 612.519 177.306 C 626.007 183.460 632.758 193.825 642.878 202.084 C 661.770 218.223 694.075 253.499 703.813 272.022 C 713.550 290.545 709.474 287.431 701.304 313.221 C 693.134 339.012 669.765 374.269 710.373 426.766';
const tourPath = 'M 719.868 418.221 C 719.535 407.388 715.203 406.660 710.659 401.722 C 709.178 394.907 711.203 385.722 712.733 375.648 C 714.264 365.574 719.845 341.277 719.845 341.277 C 723.301 335.055 733.474 338.314 733.474 338.314 C 739.301 339.993 754.808 351.351 754.808 351.351 C 761.425 355.895 766.412 362.279 773.178 365.574 C 779.944 368.868 795.403 371.118 795.403 371.118 C 813.118 370.730 819.648 363.930 827.104 359.055 C 834.560 354.180 836.758 346.462 840.141 341.870 C 843.524 337.278 847.403 331.501 847.403 331.501 C 850.859 327.748 856.826 323.525 860.882 319.351 C 864.937 315.178 870.456 311.358 871.733 306.463 C 873.011 301.568 871.048 294.055 868.548 289.981 C 866.048 285.907 862.950 283.247 856.733 282.018 C 850.517 280.790 831.252 282.611 831.252 282.611 C 823.548 283.895 817.061 288.463 810.511 289.722 C 803.962 290.981 798.987 291.574 791.956 290.166 C 784.925 288.759 772.671 287.079 768.326 281.277 C 763.982 275.475 761.966 263.759 765.889 255.354 C 769.811 246.948 778.950 237.012 791.860 230.843 C 804.770 224.673 833.976 222.220 843.347 218.335 C 852.719 214.450 855.826 208.528 848.088 207.530 C 840.350 206.533 812.331 208.912 796.919 212.351 C 781.506 215.791 769.203 221.155 755.611 228.165 C 742.019 235.175 726.739 255.714 715.367 254.411 C 703.996 253.109 698.227 220.485 687.382 220.348 C 676.536 220.212 663.175 241.686 650.296 253.593 C 637.417 265.500 615.051 273.602 610.105 291.790 C 605.159 310.819 606.654 325.511 614.304 358.930 C 621.954 392.349 639.656 445.753 671.163 477.146 C 702.671 508.538 766.554 515.776 773.035 509.391 C 767.647 500.562 744.769 502.935 731.980 480.291';
const golfExitPath = 'M 718.042 464.390 C 651.796 411.468 674.621 353.987 683.683 329.693 C 694.909 299.597 702.757 292.823 694.096 273.152 C 685.434 253.481 645.850 223.948 631.713 211.665';
const finalExitPath = 'M 593.245 158.659 C 600.431 127.042 607.617 95.425 612.790 79.904 C 617.964 64.383 624.479 70.515 624.287 65.533 C 624.096 60.551 616.527 51.353 611.641 50.012 C 606.755 48.671 602.539 57.294 594.970 57.485 C 587.401 57.677 577.820 50.012 566.228 51.162 C 554.635 52.311 538.730 55.186 525.413 64.383 C 512.096 73.581 494.850 97.054 486.323 106.347 C 477.796 115.641 480.096 117.557 474.252 120.144 C 468.407 122.731 459.305 122.539 451.258 121.868 C 443.210 121.198 434.970 118.898 425.964 116.120 C 416.958 113.341 405.940 112.000 397.222 105.198 C 388.503 98.395 380.647 83.545 373.653 75.306 C 366.659 67.066 361.485 63.713 355.258 55.761 C 349.030 47.809 344.790 41.868 336.287 27.593';

const sourceVisual = (
  code: NonNullable<JourneySegment['sourceVisual']>['code'],
  color: string,
  pattern: NonNullable<JourneySegment['sourceVisual']>['pattern'],
  labelAr: string,
) => ({ code, color, pattern, labelAr });

export const guestJourneyV15Segments: JourneySegment[] = [
  { id: 'guests-entry', kind: 'entry', label: 'مسار الدخول إلى نقطة النزول والمواقف', path: entryPath, distanceMeters: 760, realDurationMinutes: 5, transport: 'vehicle', sourceVisual: sourceVisual('road-entry', '#00B050', 'solid', 'دخول بالسيارة'), source: guestJourneyV15Source },
  { id: 'guests-transfer', kind: 'shuttle', label: 'مسار الدخول بعربات الجولف', path: golfEntryPath, distanceMeters: 420, realDurationMinutes: 3, transport: 'golf-cart', sourceVisual: sourceVisual('golf-entry', '#00B0F0', 'solid', 'دخول بعربة الجولف'), source: guestJourneyV15Source },
  { id: 'guests-tour', kind: 'tour', label: 'مسار الجولة', path: tourPath, distanceMeters: 1400, realDurationMinutes: 10, transport: 'golf-cart', sourceVisual: sourceVisual('tour', '#7030A0', 'solid', 'جولة بعربة الجولف'), source: guestJourneyV15Source },
  { id: 'guests-golf-exit', kind: 'exit', label: 'مسار الخروج بعربات الجولف', path: golfExitPath, distanceMeters: 420, realDurationMinutes: 3, transport: 'golf-cart', sourceVisual: sourceVisual('golf-exit', '#FF0000', 'dashed', 'خروج بعربة الجولف'), source: guestJourneyV15Source },
  { id: 'guests-final-exit', kind: 'exit', label: 'مسار خروج رحلة الضيوف', path: finalExitPath, transport: 'vehicle', sourceVisual: sourceVisual('final-exit', '#FF0000', 'solid', 'الخروج النهائي'), source: guestJourneyV15Source },
];

const point = (code: keyof typeof guestJourneyV15StopPoints) => guestJourneyV15StopPoints[code];

export const guestJourneyV15PlaybackPath = [
  `M ${point('A').x} ${point('A').y}`,
  `L ${entryPath.slice(2)}`,
  `L ${point('B').x} ${point('B').y}`,
  `L ${golfEntryPath.slice(2)}`,
  `L ${point('C').x} ${point('C').y}`,
  `L ${tourPath.slice(2)}`,
  `L ${point('J').x} ${point('J').y}`,
  `L ${golfExitPath.slice(2)}`,
  `L ${point('K').x} ${point('K').y}`,
  `L ${finalExitPath.slice(2)}`,
  `L ${point('L').x} ${point('L').y}`,
].join(' ');

export const guestJourneyV15ColorCode = guestJourneyV15Segments.map((segment) => ({
  id: segment.id,
  labelAr: segment.sourceVisual!.labelAr,
  color: segment.sourceVisual!.color,
  pattern: segment.sourceVisual!.pattern,
  distanceMeters: segment.distanceMeters,
  durationMinutes: segment.realDurationMinutes,
}));
