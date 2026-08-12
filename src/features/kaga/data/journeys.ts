import { mapPoints } from "./spatialMap";
import { pointAtPathProgress } from "./svgPathGeometry";
import type { JourneyBranch, JourneyId, JourneyStop, SpatialJourney } from "./spatialTypes";

const source = (page: number, notes?: string) => ({ pdfPages: [page], sourceLabel: `مخطط الرحلة - صفحة ${page}`, notes });

const anchoredStop = (
  page: number,
  code: string,
  title: string,
  base: keyof typeof mapPoints,
  path: string,
  pathProgress: number,
  durationMinutes?: number,
  experienceId?: string,
  isMajor = Boolean(experienceId) || (durationMinutes ?? 0) >= 20,
  branchId?: string,
  detailAr?: string,
): JourneyStop => {
  const mapPoint = mapPoints[base];
  const location = pointAtPathProgress(path, pathProgress);
  return {
    id: `STOP-${page}-${code}`,
    code,
    title,
    durationMinutes,
    detailAr,
    pathProgress,
    branchId,
    isMajor,
    point: {
      ...mapPoint,
      id: `${mapPoint.id}-${page}-${code}`,
      x: location.x,
      y: location.y,
      source: source(page),
    },
    experienceId,
    source: source(page),
  };
};

const workersPath = "M126 116 C215 130 305 105 390 75 C455 85 505 105 510 150 C515 185 530 205 548 220 C570 260 600 282 640 315 C600 350 550 375 550 385 C555 435 600 485 624 490 C660 455 676 393 690 355 C725 310 778 270 842 252 C810 285 765 310 756 340 C765 375 800 395 820 395 C805 430 775 440 748 425 C705 420 675 390 690 355 C650 330 610 280 565 210 C520 190 490 170 470 130 C455 100 420 85 356 95";
const workersNaturePath = "M470 205 C410 310 300 380 250 510 C215 600 165 680 185 770";
const mayorPath = "M126 116 C230 145 350 175 470 205 C505 215 525 220 545 220 C565 250 580 270 596 285 C620 300 635 308 640 315 C605 340 580 355 595 360 C570 375 550 385 550 385 C545 420 575 470 624 490 C660 455 670 390 690 355 C735 310 785 270 842 252 C815 285 770 315 756 350 C770 380 800 395 820 395 C725 405 640 405 560 400 C470 395 390 380 300 420 C250 445 220 440 220 405 C220 340 235 275 255 190";
const princePath = "M126 116 C220 135 270 175 250 250 C220 330 210 410 225 445 C320 450 440 420 560 410 C625 405 665 425 685 455 C650 430 640 390 650 350 C680 300 750 260 842 252 C800 280 760 320 760 350 C780 385 810 395 820 395 C790 430 760 450 730 430 C700 405 690 360 700 330 C680 310 655 310 640 315 C605 340 580 365 550 385 C545 420 580 470 624 490 C590 450 565 420 550 385 C500 390 430 380 350 395 C285 405 235 420 225 445 C220 365 225 280 270 155";
const guestsPath = "M126 116 C260 145 410 175 552 222 C585 250 620 310 650 385 C660 420 675 445 690 460 C650 430 635 390 650 350 C690 300 760 260 842 252 C800 285 760 320 760 350 C780 385 810 395 820 395 C785 430 755 450 725 430 C690 400 680 350 700 330 C675 300 650 300 640 315 C605 345 575 365 550 385 C545 425 575 475 624 490 C645 495 665 490 680 485 C625 430 600 360 610 300 C600 270 580 250 560 240 C530 190 480 145 430 100 C385 70 350 55 310 55";
const mayorMediaPath = "M126 116 C245 128 405 162 550 202 C568 216 578 226 583 238 C595 253 608 268 620 280 C635 290 642 300 645 308 C620 322 590 315 570 308 C564 355 578 420 610 448 C640 430 655 355 665 302 C700 262 742 240 785 239 C760 270 724 300 711 327 C732 352 770 352 805 339 C780 368 744 376 711 327 C692 350 680 400 680 447 C650 420 635 370 645 315 C610 300 585 275 565 235 C525 210 480 192 430 188 C360 190 290 230 245 290 C225 325 230 360 255 390 C280 420 275 455 245 475 C210 495 190 465 190 420 C190 330 210 220 250 150";
const mediaPath = "M126 116 C215 130 305 105 390 75 C455 85 505 105 510 150 C515 185 530 205 548 220 C570 260 600 285 640 315 C605 340 575 365 550 385 C545 430 575 475 624 490 C660 450 675 395 690 355 C730 310 785 270 842 252 C810 285 765 320 756 350 C770 380 800 395 820 395 C800 420 770 445 748 425 C720 410 700 385 690 355 C650 330 610 275 565 205 C525 180 490 150 465 120 C430 95 390 90 355 95";
const mediaNaturePath = "M470 205 C410 310 300 380 250 510 C215 600 165 680 185 770";

const optionalNatureBranch = (page: 7 | 35, path: string): JourneyBranch => ({
  id: "nature",
  title: "الرحلة الخارجية لحديقة الطبيعة",
  path,
  stops: [anchoredStop(page, page === 7 ? "P" : "Q", "الرحلة الخارجية لحديقة الطبيعة", "natureGarden", path, 1, 25, undefined, true, "nature")],
  source: source(page, "مسار اختياري مستقل عن خط التشغيل الأساسي."),
});

// All paths share the 0 0 1200 900 coordinate system. Every primary stop has an
// explicit, monotonic path anchor and its marker coordinate is derived from that
// exact same SVG geometry.
export const journeys: SpatialJourney[] = [
  {
    id: "workers",
    title: "رحلة العاملين في الحدائق",
    window: "من 03:00 م إلى 06:00 م",
    color: "#c99b49",
    presentationDurationSeconds: 22,
    focus: { x: 75, y: 40, scale: 1.12 },
    source: source(7),
    stops: [
      anchoredStop(7, "A", "المدخل الرئيسي", "mainEntrance", workersPath, 0),
      anchoredStop(7, "B", "دخول المواقف والنقل الترددي", "guestParking", workersPath, 0.1, 3),
      anchoredStop(7, "C", "التنزيل والتحميل والنقل الترددي", "reception", workersPath, 0.2, 5),
      anchoredStop(7, "D", "الاستقبال والضيافة", "reception", workersPath, 0.23, 5, "reception", true),
      anchoredStop(7, "E", "مجسم الحدائق", "gardenModel", workersPath, 0.27, 2, "garden-model", true),
      anchoredStop(7, "F", "ممر العصور", "eraWalk", workersPath, 0.31, 8, "era-walk", true),
      anchoredStop(7, "G", "الحديقة العائلية", "familyGarden", workersPath, 0.36, 10),
      anchoredStop(7, "H", "الحديقة الديفونية", "devonianGarden", workersPath, 0.41, 10),
      anchoredStop(7, "I", "الحديقة الحديثة", "modernGarden", workersPath, 0.46, 10),
      anchoredStop(7, "J", "ركن الذكريات", "memoryCorner", workersPath, 0.52, 4, "memory-corner", true),
      anchoredStop(7, "K", "الحديقة البليوسينية", "plioceneGarden", workersPath, 0.58, 10),
      anchoredStop(7, "L", "حديقة الخيارات", "optionsGarden", workersPath, 0.64, 10),
      anchoredStop(7, "M", "الصورة الأيقونية", "iconPhoto", workersPath, 0.7, 20, undefined, true),
      anchoredStop(7, "N", "الجلسات والضيافة", "hospitality", workersPath, 0.76, 17, "reception", true),
      anchoredStop(7, "O", "تسليم الهدايا", "reception", workersPath, 0.84, 5),
      anchoredStop(7, "Q", "الخروج من المواقف", "guestParking", workersPath, 1),
    ],
    segments: [
      { id: "workers-entry", kind: "entry", label: "الدخول إلى نقطة التنزيل والمواقف", path: "M126 116 C215 130 305 105 390 75", distanceMeters: 585, realDurationMinutes: 5, transport: "vehicle", source: source(7) },
      { id: "workers-shuttle", kind: "shuttle", label: "مسار النقل الترددي", path: "M390 75 C455 85 505 105 510 150 C515 185 530 205 548 220", realDurationMinutes: 8, transport: "shuttle", source: source(7, "يورد المصدر مدة النقل الترددي دون طول مستقل.") },
      { id: "workers-tour", kind: "tour", label: "مسار الجولة", path: "M548 220 C570 260 600 282 640 315 C600 350 550 375 550 385 C555 435 600 485 624 490 C660 455 676 393 690 355 C725 310 778 270 842 252 C810 285 765 310 756 340 C765 375 800 395 820 395 C805 430 775 440 748 425 C705 420 675 390 690 355", distanceMeters: 1400, realDurationMinutes: 18, transport: "walking", source: source(7) },
      { id: "workers-exit", kind: "exit", label: "مسار الخروج", path: "M690 355 C650 330 610 280 565 210 C520 190 490 170 470 130 C455 100 420 85 356 95", distanceMeters: 400, realDurationMinutes: 5, transport: "walking", source: source(7) },
      { id: "workers-nature", kind: "optional", label: "مسار رحلة حديقة الطبيعة (اختياري)", path: workersNaturePath, realDurationMinutes: 25, transport: "vehicle", source: source(7) },
    ],
    playbackPath: workersPath,
    optionalBranches: [optionalNatureBranch(7, workersNaturePath)],
  },
  {
    id: "mayor",
    title: "رحلة سمو الأمين",
    window: "من 06:00 م إلى 08:00 م",
    color: "#d6ad5a",
    presentationDurationSeconds: 20,
    focus: { x: 70, y: 45, scale: 1.15 },
    source: source(8),
    stops: [
      anchoredStop(8, "A", "المدخل الرئيسي", "mainEntrance", mayorPath, 0),
      anchoredStop(8, "B", "نقطة النزول", "reception", mayorPath, 0.18, 5),
      anchoredStop(8, "C", "الاستقبال والضيافة", "reception", mayorPath, 0.21, 7, "reception", true),
      anchoredStop(8, "D", "مجسم الحدائق", "gardenModel", mayorPath, 0.24, 5, "garden-model", true),
      anchoredStop(8, "E", "ممر العصور", "eraWalk", mayorPath, 0.28, 12, "era-walk", true),
      anchoredStop(8, "F", "الحديقة العائلية", "familyGarden", mayorPath, 0.33, 13),
      anchoredStop(8, "G", "الحديقة الديفونية", "devonianGarden", mayorPath, 0.38, 13),
      anchoredStop(8, "H", "الحديقة الحديثة", "modernGarden", mayorPath, 0.44, 13),
      anchoredStop(8, "I", "ركن الذكريات", "memoryCorner", mayorPath, 0.5, 6, "memory-corner", true),
      anchoredStop(8, "J", "الحديقة البليوسينية", "plioceneGarden", mayorPath, 0.57, 13),
      anchoredStop(8, "K", "حديقة الخيارات", "optionsGarden", mayorPath, 0.64, 13),
      anchoredStop(8, "L", "الصورة الأيقونية", "iconPhoto", mayorPath, 0.71, 20, undefined, true),
    ],
    segments: [
      { id: "mayor-entry", kind: "entry", label: "الدخول إلى نقطة التنزيل والمواقف", path: "M126 116 C230 145 350 175 470 205 C505 215 525 220 545 220", distanceMeters: 760, realDurationMinutes: 5, transport: "vehicle", source: source(8) },
      { id: "mayor-tour", kind: "tour", label: "مسار الجولة", path: "M545 220 C565 250 580 270 596 285 C620 300 635 308 640 315 C605 340 580 355 595 360 C570 375 550 385 550 385 C545 420 575 470 624 490 C660 455 670 390 690 355 C735 310 785 270 842 252 C815 285 770 315 756 350 C770 380 800 395 820 395", distanceMeters: 1400, realDurationMinutes: 18, transport: "walking", source: source(8) },
      { id: "mayor-exit", kind: "exit", label: "مسار خروج رحلة سمو الأمين", path: "M820 395 C725 405 640 405 560 400 C470 395 390 380 300 420 C250 445 220 440 220 405 C220 340 235 275 255 190", transport: "vehicle", source: source(8, "لا يورد المصدر طولاً أو مدة مستقلة لمسار الخروج.") },
    ],
    playbackPath: mayorPath,
  },
  {
    id: "prince",
    title: "رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين",
    window: "من 06:00 م إلى 07:30 م",
    color: "#e0b85d",
    presentationDurationSeconds: 18,
    focus: { x: 65, y: 40, scale: 1.14 },
    source: source(25),
    stops: [
      anchoredStop(25, "A", "المدخل الرئيسي", "mainEntrance", princePath, 0),
      anchoredStop(25, "B", "الاستقبال والعرضة السعودية", "iconPhoto", princePath, 0.25, 40, "royal-arrival", true, undefined, "مجسم الحدائق\n(سيتم نقل مؤقت لمجسم الحدائق إلى منطقة كبار الشخصيات يوم الزيارة فقط)\nالنصب التذكاري"),
      anchoredStop(25, "C", "بداية الجولة - حديقة الخيارات", "optionsGarden", princePath, 0.38, 8),
      anchoredStop(25, "D", "الحديقة البليوسينية", "plioceneGarden", princePath, 0.45, 8),
      anchoredStop(25, "E", "ممر العصور", "eraWalk", princePath, 0.58, 8, "era-walk", true),
      anchoredStop(25, "F", "الحديقة العائلية", "familyGarden", princePath, 0.65, 8),
      anchoredStop(25, "G", "الحديقة الديفونية", "devonianGarden", princePath, 0.71, 9),
      anchoredStop(25, "H", "الحديقة الحديثة - نهاية الجولة", "modernGarden", princePath, 0.78, 9, undefined, true),
    ],
    segments: [
      { id: "prince-entry", kind: "entry", label: "مسار الدخول", path: "M126 116 C220 135 270 175 250 250 C220 330 210 410 225 445 C320 450 440 420 560 410 C625 405 665 425 685 455", distanceMeters: 1100, realDurationMinutes: 5, transport: "vehicle", source: source(25) },
      { id: "prince-tour", kind: "tour", label: "مسار الجولة", path: "M685 455 C650 430 640 390 650 350 C680 300 750 260 842 252 C800 280 760 320 760 350 C780 385 810 395 820 395 C790 430 760 450 730 430 C700 405 690 360 700 330 C680 310 655 310 640 315 C605 340 580 365 550 385 C545 420 580 470 624 490", distanceMeters: 2450, realDurationMinutes: 15, transport: "golf-cart", source: source(25) },
      { id: "prince-exit", kind: "exit", label: "مسار خروج رحلة سمو أمير المنطقة", path: "M624 490 C590 450 565 420 550 385 C500 390 430 380 350 395 C285 405 235 420 225 445 C220 365 225 280 270 155", transport: "vehicle", source: source(25, "لا يورد المصدر طولاً أو مدة مستقلة لمسار الخروج.") },
    ],
    playbackPath: princePath,
  },
  {
    id: "guests",
    title: "رحلة الضيوف",
    window: "من 05:30 م إلى 07:30 م",
    color: "#d7a94f",
    presentationDurationSeconds: 17,
    focus: { x: 70, y: 45, scale: 1.15 },
    source: source(26),
    stops: [
      anchoredStop(26, "A", "المدخل الرئيسي", "mainEntrance", guestsPath, 0),
      anchoredStop(26, "B", "نقطة النزول وإركاب عربات الجولف", "reception", guestsPath, 0.16, undefined, undefined, false, undefined, "حيث يتم الاستقبال من قبل خدمة صف السيارات"),
      anchoredStop(26, "C", "الاستقبال والعرضة السعودية", "iconPhoto", guestsPath, 0.28, 60, "royal-arrival", true, undefined, "مجسم الحدائق\n(سيتم نقل مؤقت لمجسم الحدائق إلى منطقة كبار الشخصيات يوم الزيارة فقط)\nالنصب التذكاري"),
      anchoredStop(26, "D", "بداية الجولة التعريفية - حديقة الخيارات", "optionsGarden", guestsPath, 0.4, 6, undefined, false, undefined, "حديقة الخيارات"),
      anchoredStop(26, "E", "الحديقة البليوسينية", "plioceneGarden", guestsPath, 0.48, 6),
      anchoredStop(26, "F", "ممر العصور", "eraWalk", guestsPath, 0.6, 4, "era-walk", true),
      anchoredStop(26, "G", "الحديقة العائلية", "familyGarden", guestsPath, 0.67, 6),
      anchoredStop(26, "H", "الحديقة الديفونية", "devonianGarden", guestsPath, 0.72, 6),
      anchoredStop(26, "I", "الحديقة الحديثة", "modernGarden", guestsPath, 0.77, 6),
      anchoredStop(26, "J", "نقطة نهاية الرحلة", "hospitality", guestsPath, 0.82, undefined, "reception", true),
      anchoredStop(26, "K", "تسليم الهدايا", "reception", guestsPath, 0.88, 5),
      anchoredStop(26, "L", "مسار خروج رحلة الضيوف", "guestParking", guestsPath, 1),
    ],
    segments: [
      { id: "guests-entry", kind: "entry", label: "مسار الدخول", path: "M126 116 C260 145 410 175 552 222", distanceMeters: 760, realDurationMinutes: 5, transport: "vehicle", source: source(26) },
      { id: "guests-transfer", kind: "shuttle", label: "مسار التنزيل إلى بداية الجولة", path: "M552 222 C585 250 620 310 650 385 C660 420 675 445 690 460", distanceMeters: 420, realDurationMinutes: 3, transport: "golf-cart", source: source(26) },
      { id: "guests-tour", kind: "tour", label: "مسار الجولة", path: "M690 460 C650 430 635 390 650 350 C690 300 760 260 842 252 C800 285 760 320 760 350 C780 385 810 395 820 395 C785 430 755 450 725 430 C690 400 680 350 700 330 C675 300 650 300 640 315 C605 345 575 365 550 385 C545 425 575 475 624 490 C645 495 665 490 680 485", distanceMeters: 1400, realDurationMinutes: 10, transport: "golf-cart", source: source(26) },
      { id: "guests-exit", kind: "exit", label: "مسار الخروج", path: "M680 485 C625 430 600 360 610 300 C600 270 580 250 560 240 C530 190 480 145 430 100 C385 70 350 55 310 55", distanceMeters: 420, realDurationMinutes: 3, transport: "golf-cart", source: source(26) },
    ],
    playbackPath: guestsPath,
  },
  {
    id: "mayorMedia",
    title: "رحلة سمو الأمين ومعالي وزير الإعلام",
    window: "من 06:00 م إلى 09:00 م",
    color: "#d09c48",
    presentationDurationSeconds: 23,
    focus: { x: 70, y: 40, scale: 1.12 },
    source: source(34),
    stops: [
      anchoredStop(34, "A", "المدخل الرئيسي", "mainEntrance", mayorMediaPath, 0),
      anchoredStop(34, "B", "نقطة النزول والاستقبال من خدمة صف السيارات", "reception", mayorMediaPath, 0.14, 5),
      anchoredStop(34, "C", "الاستقبال والضيافة", "reception", mayorMediaPath, 0.17, 5, "reception", true),
      anchoredStop(34, "D", "مجسم الحدائق والنصب التذكاري", "gardenModel", mayorMediaPath, 0.21, 3, "garden-model", true),
      anchoredStop(34, "E", "ممر العصور", "eraWalk", mayorMediaPath, 0.25, 8, "era-walk", true),
      anchoredStop(34, "F", "الحديقة العائلية", "familyGarden", mayorMediaPath, 0.3, 10),
      anchoredStop(34, "G", "الحديقة الديفونية", "devonianGarden", mayorMediaPath, 0.35, 10),
      anchoredStop(34, "H", "الحديقة الحديثة", "modernGarden", mayorMediaPath, 0.43, 10),
      anchoredStop(34, "I", "ركن الذكريات", "memoryCorner", mayorMediaPath, 0.5, 4, "memory-corner", true),
      anchoredStop(34, "J", "الحديقة البليوسينية", "plioceneGarden", mayorMediaPath, 0.58, 10),
      anchoredStop(34, "K", "حديقة الخيارات", "optionsGarden", mayorMediaPath, 0.64, 10),
      anchoredStop(34, "L", "المؤتمر الصحفي", "pressConference", mayorMediaPath, 0.7, 30, "press-conference", true),
      anchoredStop(34, "M", "العشاء", "dinnerArea", mayorMediaPath, 0.77, 30, "dinner", true),
      anchoredStop(34, "N", "منطقة كبار الشخصيات", "hospitality", mayorMediaPath, 0.83, 20, "vip-area", true),
    ],
    segments: [
      { id: "mayor-media-entry", kind: "entry", label: "الدخول إلى نقطة التنزيل والمواقف", path: "M126 116 C245 128 405 162 550 202", distanceMeters: 760, realDurationMinutes: 5, transport: "vehicle", source: source(34) },
      { id: "mayor-media-tour", kind: "tour", label: "مسار الجولة", path: "M550 202 C568 216 578 226 583 238 C595 253 608 268 620 280 C635 290 642 300 645 308 C620 322 590 315 570 308 C564 355 578 420 610 448 C640 430 655 355 665 302 C700 262 742 240 785 239 C760 270 724 300 711 327 C732 352 770 352 805 339 C780 368 744 376 711 327 C692 350 680 400 680 447", distanceMeters: 1750, realDurationMinutes: 20, transport: "walking", source: source(34) },
      { id: "mayor-media-exit", kind: "exit", label: "مسار خروج سمو الأمين ومعالي وزير الإعلام", path: "M680 447 C650 420 635 370 645 315 C610 300 585 275 565 235 C525 210 480 192 430 188 C360 190 290 230 245 290 C225 325 230 360 255 390 C280 420 275 455 245 475 C210 495 190 465 190 420 C190 330 210 220 250 150", transport: "vehicle", source: source(34, "لا يورد المصدر طولاً أو مدة مستقلة لمسار الخروج.") },
    ],
    playbackPath: mayorMediaPath,
  },
  {
    id: "media",
    title: "مسار الإعلاميين",
    window: "من 04:30 م إلى 09:00 م",
    color: "#d2a24c",
    presentationDurationSeconds: 23,
    focus: { x: 70, y: 40, scale: 1.12 },
    source: source(35),
    stops: [
      anchoredStop(35, "A", "المدخل الرئيسي", "mainEntrance", mediaPath, 0),
      anchoredStop(35, "B", "دخول المواقف والنقل الترددي", "guestParking", mediaPath, 0.1, 3),
      anchoredStop(35, "C", "التنزيل والتحميل والنقل الترددي", "reception", mediaPath, 0.2, 5),
      anchoredStop(35, "D", "الاستقبال والضيافة", "reception", mediaPath, 0.23, 5, "reception", true),
      anchoredStop(35, "E", "مجسم الحدائق", "gardenModel", mediaPath, 0.27, 2, "garden-model", true),
      anchoredStop(35, "F", "ممر العصور", "eraWalk", mediaPath, 0.31, 8, "era-walk", true),
      anchoredStop(35, "G", "الحديقة العائلية", "familyGarden", mediaPath, 0.36, 12),
      anchoredStop(35, "H", "الحديقة الديفونية", "devonianGarden", mediaPath, 0.41, 12),
      anchoredStop(35, "I", "الحديقة الحديثة", "modernGarden", mediaPath, 0.46, 12),
      anchoredStop(35, "J", "ركن الذكريات", "memoryCorner", mediaPath, 0.52, 5, "memory-corner", true),
      anchoredStop(35, "K", "الحديقة البليوسينية", "plioceneGarden", mediaPath, 0.58, 12),
      anchoredStop(35, "L", "حديقة الخيارات", "optionsGarden", mediaPath, 0.64, 12),
      anchoredStop(35, "M", "منطقة الضيافة", "hospitality", mediaPath, 0.7, 60, "reception", true),
      anchoredStop(35, "N", "المؤتمر الصحفي", "pressConference", mediaPath, 0.75, 30, "press-conference", true),
      anchoredStop(35, "O", "منطقة العشاء", "dinnerArea", mediaPath, 0.79, 30, "dinner", true),
      anchoredStop(35, "P", "توزيع الهدايا", "reception", mediaPath, 0.85, 3),
      anchoredStop(35, "R", "الخروج من المواقف", "guestParking", mediaPath, 1),
    ],
    segments: [
      { id: "media-entry", kind: "entry", label: "الدخول إلى نقطة التنزيل والمواقف", path: "M126 116 C215 130 305 105 390 75", distanceMeters: 760, realDurationMinutes: 5, transport: "vehicle", source: source(35) },
      { id: "media-shuttle", kind: "shuttle", label: "مسار النقل الترددي", path: "M390 75 C455 85 505 105 510 150 C515 185 530 205 548 220", realDurationMinutes: 8, transport: "shuttle", source: source(35, "يورد المصدر مدة النقل الترددي دون طول مستقل.") },
      { id: "media-tour", kind: "tour", label: "مسار الجولة", path: "M548 220 C570 260 600 285 640 315 C605 340 575 365 550 385 C545 430 575 475 624 490 C660 450 675 395 690 355 C730 310 785 270 842 252 C810 285 765 320 756 350 C770 380 800 395 820 395 C800 420 770 445 748 425 C720 410 700 385 690 355", distanceMeters: 1550, realDurationMinutes: 18, transport: "walking", source: source(35) },
      { id: "media-exit", kind: "exit", label: "مسار الخروج", path: "M690 355 C650 330 610 275 565 205 C525 180 490 150 465 120 C430 95 390 90 355 95", distanceMeters: 300, realDurationMinutes: 3, transport: "walking", source: source(35) },
      { id: "media-nature", kind: "optional", label: "مسار رحلة حديقة الطبيعة", path: mediaNaturePath, realDurationMinutes: 25, transport: "vehicle", source: source(35) },
    ],
    playbackPath: mediaPath,
    optionalBranches: [optionalNatureBranch(35, mediaNaturePath)],
  },
];

export const journeyById = Object.fromEntries(journeys.map((journey) => [journey.id, journey])) as Record<JourneyId, SpatialJourney>;

export function getJourneyTimeline(journey: SpatialJourney, branchId: string | null) {
  return journey.optionalBranches?.find((branch) => branch.id === branchId)?.stops ?? journey.stops;
}

export function getJourneyPath(journey: SpatialJourney, branchId: string | null) {
  return journey.optionalBranches?.find((branch) => branch.id === branchId)?.path ?? journey.playbackPath;
}
