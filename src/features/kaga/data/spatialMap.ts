import type { MapPoint, SourceReference } from "./spatialTypes";

export const MASTERPLAN_VIEWBOX = "0 0 1200 900";

export const masterplanSource: SourceReference = {
  pdfPages: [7, 8, 25, 26, 34, 35],
  sourceLabel: "المخطط العام ومسارات الحركة",
  notes:
    "إعادة بناء متجهية حتمية من المخططات الواردة في الصفحات المحددة؛ الإحداثيات مخصصة للعرض وليست إحداثيات مساحية أو تنفيذية.",
};

export const mapPoints = {
  mainEntrance: { id: "GATE-001", x: 126, y: 116, label: "المدخل الرئيسي", source: masterplanSource },
  guestParking: { id: "PARK-001", x: 390, y: 75, label: "مواقف الضيوف وخدمة صف السيارات", source: masterplanSource },
  governmentParking: { id: "PARK-002", x: 353, y: 245, label: "مواقف الجهات الحكومية", source: masterplanSource },
  staffParking: { id: "PARK-003", x: 135, y: 275, label: "مواقف فريق العمل والضيوف", source: masterplanSource },
  reception: { id: "ZONE-001", x: 548, y: 245, label: "الاستقبال والضيافة", source: masterplanSource },
  gardenModel: { id: "ASSET-001", x: 596, y: 285, label: "مجسم الحدائق", source: masterplanSource },
  eraWalk: { id: "ROUTE-001", x: 640, y: 315, label: "ممر العصور", source: masterplanSource },
  familyGarden: { id: "ZONE-002", x: 595, y: 360, label: "الحديقة العائلية", source: masterplanSource },
  devonianGarden: { id: "ZONE-003", x: 550, y: 385, label: "الحديقة الديفونية", source: masterplanSource },
  modernGarden: { id: "ZONE-004", x: 624, y: 490, label: "الحديقة الحديثة", source: masterplanSource },
  memoryCorner: { id: "ZONE-005", x: 690, y: 355, label: "ركن الذكريات", source: masterplanSource },
  plioceneGarden: { id: "ZONE-006", x: 756, y: 275, label: "الحديقة البليوسينية", source: masterplanSource },
  optionsGarden: { id: "ZONE-007", x: 842, y: 252, label: "حديقة الخيارات", source: masterplanSource },
  iconPhoto: { id: "ZONE-008", x: 820, y: 395, label: "الصورة الأيقونية", source: masterplanSource },
  hospitality: { id: "ZONE-009", x: 748, y: 425, label: "الجلسات والضيافة", source: masterplanSource },
  pressConference: { id: "ZONE-010", x: 790, y: 392, label: "المؤتمر الصحفي", source: masterplanSource },
  dinnerArea: { id: "ZONE-011", x: 750, y: 350, label: "منطقة العشاء", source: masterplanSource },
  natureGarden: { id: "ZONE-012", x: 185, y: 770, label: "حديقة الطبيعة", source: masterplanSource },
} satisfies Record<string, MapPoint>;
