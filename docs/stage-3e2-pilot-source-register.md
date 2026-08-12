# سجل مصادر KAP التجريبي

## قواعد السجل

- الملفات الخام والمقيدة تبقى خارج Git.
- البصمة تثبت المحتوى المستلم، ولا تثبت السلطة أو الاعتماد.
- `null` يعني غير معروف؛ لا تُستبدل المجهولات بقيم متوقعة.
- الصور والرندرات سياق بصري أو دليل مرشح، وليست هندسة أو مساراً أو سلامة.

## المصادر المستقبلة

| المصدر | التصنيف | SHA-256 | الاستخدام المسموح |
| --- | --- | --- | --- |
| Pilot definition JSON | `final-approved-source` | `62bda81f...a7fae` | هوية ونطاق الحزمة |
| Pilot decisions Markdown | `final-approved-source` | `aa1b5d9c...0f0d` | قرارات النطاق وحدود السلطة |
| Governance mapping XLSX | `final-approved-source` | `bfb1443d...93f33` | حوكمة وتكليفات المشروع |
| Governance PDF | `final-approved-source` | `e4bccf8b...5f40` | مرجع هيكل ومسارات اعتماد |
| Employee XLSX | `received-non-authoritative-identity-source` | `3f95c79d...cab3` | مرجع أسماء ومسميات فقط |
| `Kaig-master 2.dwg` | `provisional-until-approved-revision-arrives` | `a96a455b...a2d` | معاينة وتأليف فقط |
| CAD intake manifest | `provisional-until-approved-revision-arrives` | `473893c3...a481` | بيانات وصفية وفحص |
| Drive asset review | `visual-reference-candidate` | `c3f45d9e...4b5` | سجل مرشحين بصريين و3D |
| CAD preview PNG | `visual-reference-candidate` | `a136353a...2cec` | خلفية تأليف غير تفاعلية |

## إقرار سلطة مضاف في 2026-07-21

لم يتغير سجل DWG في الجدول ولم تنشأ بصمة جديدة. أضيف
`AUTH-KAP-DWG-WORKING-20260721` للبصمة نفسها، وصارت حالة permitted-use الفعالة
`approved-working-baseline`. يسمح ذلك بالتطوير المكاني والتصور والمواءمة المرشحة،
ولا يمنح engineering/mapping/route/HSE/client authority.

## مصادر ناقصة أو جزئية

- Floor Plans: `missing`.
- 2D Identity: `missing`.
- `AGES AND CENTURIES.skp`: `partially-available-skp-and-max`، بلا بصمة استقبال محلي.
- `PHOTOBOOTH 3.skp2.skp`: `partially-available-skp-and-max`، بلا بصمة استقبال محلي.
- `Gift_Box.max`: نطاق مشروط وبلا بصمة استقبال محلي.
- GLB/FBX/web-optimized GLB: `none`.

## حماية البيانات

لم تُنقل أرقام هاتف أو بريد أو بيانات اتصال. لا تُحفظ الصور أو الفيديو أو DWG أو
SKP أو MAX أو Twinmotion داخل Git. المسارات `pilot-input/raw/` و`private/` وملفات
الأدلة وامتدادات الأصول الخام متجاهلة.
