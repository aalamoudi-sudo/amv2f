# KAP CAD Inspection Report

## فحص 2026-07-21 القابل لإعادة الإنتاج

| النتيجة | المصدر | الطريقة | الأداة/الإصدار | الأساس | الثقة |
| --- | --- | --- | --- | --- | --- |
| `AC1032` | الملف المحلي المصرح | قراءة أول 6 بايت | system `xxd` | detected | high |
| DWG 2018/2019/2020 | الملف المحلي المصرح | file magic | `file 5.41` | detected | high |
| 99,452,545 bytes | filesystem metadata | `stat -f %z` | macOS `stat` | detected | high |
| SHA-256 الكامل | bytes المحلية | `shasum -a 256` | `shasum 6.02` | detected | high |

كل نتيجة أعلاه تثبت هوية الملف أو تنسيقه فقط ولا تمنح سلطة هندسية.

## مجهول حاليًا

Model Space، Paper Space، layouts، viewport scales، INSUNITS، extents، أسماء
الطبقات وحالات visible/frozen/off، Blocks، XREF declarations والتبعيات المفقودة،
Raster references، أعداد line/polyline/polygon/hatch/text/block، قيم Z، مؤشر
الشمال، الأصل، CRS/EPSG، ونقاط survey/control.

سبب المجهول: لا توجد أداة DWG محلية مثبتة ذات Tool/Version provenance. لا
تُستنتج هذه القيم من اسم الملف أو طبقة أو صورة معاينة.

## لقطة 2026-07-13 التاريخية

`pilot-input/manifests/kap-cad-intake-v1.json` سجل metre وextents و2315 طبقة
و1942 XREF-layer وبعض counts. تبقى هذه القيم ظاهرة كتاريخ التقاط منخفض الثقة،
لكن أداة استخراجها وإصدارها غير مسجلين، لذلك لا تعامل كفحص حالي ولا كسلطة.

## XREF

اكتمال XREF مجهول ومحجوب. لا يُجلب مرجع خارجي تلقائيًا. المدخل الأفضل هو
packaged DWG مع جميع التبعيات أو تقرير missing-dependency صادر من Converter
محلي موثق.
