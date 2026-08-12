import { deriveEffectiveCadAuthority } from '../services/cadSpatialIntake';
import type { SpatialEntityId } from '../types/spatial';
import {
  kapWorkingCadSourceHash,
  type CadAuthorityAssertion,
  type CadInspectionFinding,
  type CadSourceContentIdentity,
  type KapWorkingCadIntake,
  type SpatialEntityMapping
} from '../types/spatialAuthoring';
import { kapEventId, kapProjectId, kapVenueId } from './kapProjectIds';

export { kapEventId, kapVenueId };

export const kapStableZoneIds = [
  'ZONE-ARRIVAL-001',
  'ZONE-AGES-TUNNEL-001',
  'ZONE-SHOW-001',
  'ZONE-PHOTO-MEDIA-001',
  'ZONE-DINNER-VIP-001'
] as const satisfies readonly SpatialEntityId[];

const source: CadSourceContentIdentity = {
  sourceId: 'SOURCE-KAP-DWG-PROVISIONAL-001',
  projectId: kapProjectId,
  eventId: kapEventId,
  venueId: kapVenueId,
  fileName: 'Kaig-master 2.dwg',
  mediaType: 'application/acad',
  formatSignature: 'AC1032',
  contentHash: kapWorkingCadSourceHash,
  byteSize: 99_452_545,
  captureStatus: 'approved-source-capture',
  capturedAt: '2026-07-13T00:00:00+03:00',
  originalCaptureRef: 'pilot-input/manifests/kap-cad-intake-v1.json'
};

export const kapWorkingCadAuthorityAssertion: CadAuthorityAssertion = {
  authorityAssertionId: 'AUTH-KAP-DWG-WORKING-20260721',
  sourceId: source.sourceId,
  sourceHash: source.contentHash,
  effectiveDate: '2026-07-21',
  authorityType: 'platform-owner-working-approval',
  authorityName: 'Ahmed',
  identityTrust: 'local-declared',
  scope: 'current platform spatial development',
  validUntil: 'superseded-by-later-approved-revision',
  assertedAt: '2026-07-21T12:31:57Z',
  supersedesAssertionId: null,
  revokedAt: null
};

export const kapApprovedCadAuthorityAssertion: CadAuthorityAssertion = {
  authorityAssertionId: 'AUTH-KAP-DWG-FOUNDER-APPROVED-20260729',
  sourceId: source.sourceId,
  sourceHash: source.contentHash,
  effectiveDate: '2026-07-29',
  authorityType: 'founder-approved-cad-source',
  authorityName: 'Ahmed',
  identityTrust: 'local-byte-verified',
  scope: 'canonical CAD source identity and controlled extraction preparation',
  validUntil: 'superseded-by-later-approved-revision',
  assertedAt: '2026-07-29T00:00:00+03:00',
  supersedesAssertionId: kapWorkingCadAuthorityAssertion.authorityAssertionId,
  revokedAt: null
};

function finding(
  findingId: string,
  labelAr: string,
  value: CadInspectionFinding['value'],
  extractionMethod: string,
  tool: string,
  toolVersion: string,
  confidence: CadInspectionFinding['confidence'],
  basis: CadInspectionFinding['basis']
): CadInspectionFinding {
  return {
    findingId,
    labelAr,
    value,
    source: source.sourceId,
    extractionMethod,
    tool,
    toolVersion,
    confidence,
    basis,
    authorityEffect: 'none'
  };
}

function unknownFinding(findingId: string, labelAr: string): CadInspectionFinding {
  return finding(findingId, labelAr, null, 'لم تتوفر أداة تحويل DWG محلية موثقة', 'none', 'not-installed', 'unknown', 'unknown');
}

const mappings: SpatialEntityMapping[] = kapStableZoneIds.map((entityId, index) => ({
  mappingId: `MAPPING-KAP-CAD-${String(index + 1).padStart(3, '0')}`,
  projectId: kapProjectId,
  eventId: kapEventId,
  venueId: kapVenueId,
  entityId,
  sourceId: source.sourceId,
  sourceHash: source.contentHash,
  geometryReference: null,
  layerReferences: [],
  mappingMethod: 'manual-selection',
  mappingStatus: 'unmapped',
  mappedBy: null,
  reviewedBy: null,
  approvedBy: null,
  revision: 1,
  changeReason: 'بانتظار تحويل محلي ومراجعة هندسية مرئية صريحة.',
  confidence: 'unknown'
}));

const effectiveAuthority = deriveEffectiveCadAuthority(source, [
  kapWorkingCadAuthorityAssertion,
  kapApprovedCadAuthorityAssertion
]);

export const kapWorkingCadIntake: KapWorkingCadIntake = {
  source,
  locations: [
    {
      locationId: 'LOCATION-KAP-DWG-RECOVERED-001',
      sourceId: source.sourceId,
      sourceHash: source.contentHash,
      displayName: 'Kaig-master 2.dwg · original capture location',
      storageScope: 'operator-local',
      pathDisclosure: 'restricted-local',
      observedAt: '2026-07-13T00:00:00+03:00',
      availability: 'unavailable'
    },
    {
      locationId: 'LOCATION-KAP-DWG-WORKING-20260721',
      sourceId: source.sourceId,
      sourceHash: source.contentHash,
      displayName: 'Kaig-master 2.dwg · founder-approved source location',
      storageScope: 'operator-local',
      pathDisclosure: 'restricted-local',
      observedAt: '2026-07-21T12:31:57Z',
      availability: 'available'
    }
  ],
  authorityAssertions: [kapWorkingCadAuthorityAssertion, kapApprovedCadAuthorityAssertion],
  effectiveAuthority,
  inspection: {
    reportId: 'CAD-INSPECTION-KAP-WORKING-20260721',
    sourceId: source.sourceId,
    sourceHash: source.contentHash,
    inspectedAt: '2026-07-21T12:31:57Z',
    findings: [
      finding('CAD-FINDING-FORMAT', 'إصدار DWG', 'AC1032 · AutoCAD 2018/2019/2020', 'قراءة توقيع أول 6 بايت ثم تعريف نوع الملف محليًا', 'xxd + file', 'xxd system / file 5.41', 'high', 'detected'),
      finding('CAD-FINDING-SIZE', 'حجم الملف', 99_452_545, 'stat -f %z', 'stat', 'macOS system', 'high', 'detected'),
      finding('CAD-FINDING-HASH', 'SHA-256', source.contentHash, 'shasum -a 256', 'shasum', '6.02', 'high', 'detected'),
      unknownFinding('CAD-FINDING-MODEL-SPACE', 'وجود Model Space'),
      unknownFinding('CAD-FINDING-PAPER-SPACE', 'Paper Space وLayouts'),
      unknownFinding('CAD-FINDING-INSUNITS', 'INSUNITS ووحدة الرسم'),
      unknownFinding('CAD-FINDING-EXTENTS', 'Drawing Extents'),
      unknownFinding('CAD-FINDING-LAYERS', 'أسماء الطبقات'),
      unknownFinding('CAD-FINDING-LAYER-STATES', 'الطبقات المرئية والمجمّدة والمطفأة'),
      unknownFinding('CAD-FINDING-BLOCKS', 'تعريفات Blocks'),
      unknownFinding('CAD-FINDING-XREFS', 'XREF declarations والتبعيات المفقودة'),
      unknownFinding('CAD-FINDING-RASTERS', 'Raster references'),
      unknownFinding('CAD-FINDING-ENTITY-COUNTS', 'أعداد الخطوط وPolylines وPolygons وHatches والنصوص والBlocks'),
      unknownFinding('CAD-FINDING-Z', 'قيم الارتفاع أو Z'),
      unknownFinding('CAD-FINDING-NORTH', 'مؤشر الشمال'),
      unknownFinding('CAD-FINDING-ORIGIN', 'علامات الأصل'),
      unknownFinding('CAD-FINDING-CRS', 'بيانات CRS أو EPSG'),
      unknownFinding('CAD-FINDING-CONTROL-POINTS', 'نقاط المسح أو الضبط'),
      unknownFinding('CAD-FINDING-VIEWPORTS', 'Layouts ومقاييس Viewports')
    ],
    historicalSnapshots: [{
      snapshotId: 'CAD-HISTORICAL-INSPECTION-KAP-001',
      sourceRef: 'pilot-input/manifests/kap-cad-intake-v1.json',
      capturedValues: {
        declaredUnits: 'metre',
        xyExtents: { minX: 646892.144767453, minY: 2711206.357942797, maxX: 649365.607154326, maxY: 2715321.653904935 },
        zExtents: { minZ: -1982.316189992, maxZ: 3496.676 },
        layerCount: 2315,
        xrefLayerCount: 1942,
        frozenLayerCount: 19,
        offLayerCount: 2,
        lockedLayerCount: 4,
        auditBadLayerCount: 2,
        hatchLayerCount: 143
      },
      methodStatus: 'tool-and-version-unavailable',
      confidence: 'low',
      authorityEffect: 'none'
    }],
    warningsAr: [
      'لا يجوز اعتماد قيم الفحص التاريخي كاستخراج حالي لأن أداة التحويل وإصدارها غير مسجلين.',
      'لا توجد قراءة قابلة لإعادة الإنتاج للطبقات أو XREF أو الوحدات أو المجالات في البيئة الحالية.',
      'اسم الطبقة، إن ظهر لاحقًا، لا يمنح سلطة مواءمة منطقة أو مسار.'
    ]
  },
  conversion: {
    status: 'conversion-required',
    adapterId: 'ADAPTER-LOCAL-CAD-CONVERSION-BOUNDARY',
    adapterVersion: '1.0.0',
    reasonAr: 'لا توجد أداة DWG محلية مثبتة وموثقة. بقي الملف محليًا ولم يُرفع إلى خدمة تحويل.',
    acceptableInputs: ['dxf-export', 'packaged-dwg-with-xrefs', 'approved-pdf-floor-plan']
  },
  transform: {
    sourceSpatialRef: null,
    targetSpatialRef: 'MAYADEEN-EXCHANGE-RH-M-Z-UP',
    sourceUnits: 'unknown',
    targetUnits: 'meter',
    scale: null,
    rotation: null,
    translation: null,
    northStatus: 'unknown',
    originStatus: 'unknown',
    crsStatus: 'unknown',
    controlPoints: [],
    authority: null,
    confidence: 'unknown',
    revision: 1,
    contentHash: '97f4d5c5de450abc7624461054cf3e631b87711bc5f828041f42828e1000a238'
  },
  mappings,
  derivedArtifacts: [],
  projection: null,
  freezeGates: [
    { gateId: 'GATE-KAP-CAD-WORKING-SOURCE', titleAr: 'مصدر CAD معتمد ومتحقق الهوية', status: 'source-authority-satisfied', changedOn: '2026-07-29', reasonAr: 'اعتمد المؤسس هوية المصدر نفسها بعد تحقق نسختين متطابقتين دون إنشاء مراجعة محتوى جديدة.' },
    { gateId: 'GATE-KAP-CAD-PERMITTED-USE', titleAr: 'سلطة الاستخراج والتصور المرشح', status: 'source-authority-satisfied', changedOn: '2026-07-29', reasonAr: 'اعتماد المصدر يسمح بالتحضير والاستخراج المنضبط فقط؛ لا يمنح هندسة أو جاهزية تشغيلية.' },
    { gateId: 'GATE-KAP-CAD-CONVERSION', titleAr: 'تحويل محلي قابل للتتبع', status: 'blocked', changedOn: null, reasonAr: 'لا توجد أداة تحويل محلية موثقة أو ملف DXF/PDF معتمد.' },
    { gateId: 'GATE-KAP-XREF-COMPLETE', titleAr: 'اكتمال XREF', status: 'blocked', changedOn: null, reasonAr: 'التبعيات غير قابلة للفحص حاليًا.' },
    { gateId: 'GATE-KAP-UNITS', titleAr: 'وحدة المصدر', status: 'blocked', changedOn: null, reasonAr: 'INSUNITS غير مقروء حاليًا؛ قيمة السجل التاريخية ليست سلطة.' },
    { gateId: 'GATE-KAP-NORTH-ORIGIN', titleAr: 'الشمال والأصل', status: 'blocked', changedOn: null, reasonAr: 'لا توجد سلطة شمال أو أصل.' },
    { gateId: 'GATE-KAP-CRS', titleAr: 'CRS ونقاط الضبط', status: 'blocked', changedOn: null, reasonAr: 'EPSG ونقاط الضبط غير معروفة.' },
    { gateId: 'GATE-KAP-ZONE-MAPPING', titleAr: 'مواءمة المناطق الخمس', status: 'blocked', changedOn: null, reasonAr: 'المناطق الخمس غير مربوطة بأي GeometryReference.' },
    { gateId: 'GATE-KAP-ROUTE-AUTHORITY', titleAr: 'سلطة المسارات', status: 'blocked', changedOn: null, reasonAr: 'CAD linework لا يُعد سلطة مسار.' },
    { gateId: 'GATE-KAP-SURVEY-HSE', titleAr: 'المسح وHSE والسلامة', status: 'blocked', changedOn: null, reasonAr: 'اعتماد العمل المنصي لا يمنح مسحًا أو HSE أو سلامة.' },
    { gateId: 'GATE-KAP-CONSTRUCTION', titleAr: 'اعتماد البناء والقياس الميداني', status: 'blocked', changedOn: null, reasonAr: 'لا توجد سلطة هندسية أو إنشائية رسمية.' },
    { gateId: 'GATE-KAP-FINAL-CLIENT', titleAr: 'القبول النهائي من العميل', status: 'blocked', changedOn: null, reasonAr: 'لم يصدر قبول عميل نهائي أو توقيع هندسي.' },
    { gateId: 'GATE-KAP-PRODUCTION-BASELINE', titleAr: 'تفعيل baseline المكاني', status: 'blocked', changedOn: null, reasonAr: 'لا يُفعّل baseline أو readiness من هذا الإقرار.' }
  ]
};
