# قالب تهيئة مشروع التوأم الرقمي الفيزيائي

**معرّف القالب:** `MEIOS-PDT-CONFIG-TPL-001`

**المعيار:** `MEIOS-PDT-STD-001 v1.0.0`

ينسخ هذا الملف لكل فعالية ويملأ قبل التصميم التفصيلي أو الشراء. لا يعدل Core
Standard لاستيعاب المشروع؛ تسجل خصوصية المشروع هنا.

## 1. تعريف المشروع

| الحقل | القيمة |
| --- | --- |
| Event ID | |
| اسم الفعالية | |
| Venue ID | |
| الموقع | |
| مالك المشروع | |
| مسؤول المنصة | |
| قائد AV/Spatial | |
| تاريخ التجميد | |
| Core Standard Version | `1.0.0` |
| AEL Version | |
| Profile | `PDT-S / PDT-M / PDT-L` |

## 2. الأصل والهندسة

| الحقل | القيمة |
| --- | --- |
| Authoritative Source | |
| Source Version | |
| Source Hash | |
| Model ID / Version | |
| Runtime GLB Hash | |
| Fabrication Package Hash | |
| Physical Revision | |
| Scale | |
| North / Origin | |
| Canonical Frame | `X-East / Y-North / Z-Up` |
| Runtime Transform Version | |

## 3. المجسم

| الحقل | القيمة |
| --- | --- |
| Active Area | |
| Base Dimensions | |
| Maximum Height | |
| Module Dimensions | |
| Base Material | |
| Printed Material | |
| Surface Finish | |
| Connection Method | |
| Number of Removable Parts | |
| Physical ID Method | `Engraving / DataMatrix / Other` |

## 4. Projection Study

| الحقل | القيمة |
| --- | --- |
| Room Dimensions | |
| Show-Mode Lux | |
| Service-Mode Lux | |
| Critical Surfaces | |
| Smallest Required Detail | |
| Highest Geometry | |
| Shadow Risks | |
| Number of Projectors | |
| Lens / Throw Result | |
| Mount Positions | |
| Maintenance Clearances | |

## 5. المعدات

| الفئة | المنتج | AEL Status | Firmware/Version | البديل | الضمان |
| --- | --- | --- | --- | --- | --- |
| Printer | | | | | |
| Filament / Material | | | | | |
| Projector 1 | | | | | |
| Projector 2 | | | | | |
| Projection Adapter | | | | | |
| Output Workstation | | | | | |
| Calibration Camera | | | | | |
| Mount / Rig | | | | | |

## 6. الشبكة والطاقة

| الحقل | القيمة |
| --- | --- |
| Operator Network | |
| Projection Network | |
| Offline Operation | |
| Video Transport | |
| Measured Continuous Load | |
| Maximum Load / Surge | |
| UPS Specification | |
| Surge Protection | |
| Recovery Procedure | |

## 7. التكامل

| الحقل | القيمة |
| --- | --- |
| API Schema Version | |
| Projection Gateway Version | |
| Vendor Adapter Version | |
| Snapshot Endpoint | |
| WebSocket Endpoint | |
| Authentication Method | |
| Offline Cache Version | |
| Blackout Control | |

## 8. المعايرة

| الحقل | القيمة |
| --- | --- |
| Calibration Profile ID / Version | |
| Model Version | |
| Physical Revision | |
| Projector Serial Numbers | |
| Mount IDs / Seals | |
| Fiducial Set | |
| Calibration Date | |
| Calibrated By | |
| Reviewed By | |

## 9. نتائج القبول

| الاختبار | المطلوب | النتيجة | Pass/Fail | الدليل |
| --- | --- | --- | --- | --- |
| ID completeness | 100% | | | |
| Scale and part tolerance | Core Standard | | | |
| Critical surface coverage | 100% | | | |
| Defined surface coverage | ≥98% | | | |
| Median alignment error | ≤3 مم لـPDT-M | | | |
| P95 alignment error | ≤5 مم لـPDT-M | | | |
| Multi-projector overlap | ≤2 px إن وجد | | | |
| Platform-to-image latency | P95 ≤200 ms | | | |
| Frame rate | ≥30 fps، هدف 60 | | | |
| Eight-hour stability | Pass | | | |
| Restart recovery | ≤2 min | | | |
| Calibration restore | Pass | | | |
| Network loss / snapshot recovery | Pass | | | |
| Blackout | Pass | | | |

## 10. الاستثناءات

| Waiver ID | المتطلب | السبب | الخطر | التعويض | المالك | الانتهاء | اعتماد أحمد |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## 11. الاعتماد

| الدور | الاسم | القرار | التاريخ | التوقيع/المرجع |
| --- | --- | --- | --- | --- |
| مسؤول المنصة | | | | |
| CTO | | | | |
| قائد AV/Spatial | | | | |
| مدير المشروع | | | | |
| أحمد | | | | |
