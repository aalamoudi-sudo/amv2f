# Event Proposal Place Audit

## Authority and method

This audit freezes the original 132-page `Rev06 Inauguration of King Abdullah Gardens` proposal as the executive place-name authority. All 132 rendered pages were reviewed as six contact sheets, followed by full-resolution inspection of the six journey maps on pages 7, 8, 25, 26, 34, and 35 and the related place/activation pages.

Source hashes used for this audit:

- Event Proposal PDF: `500f2bfaeaa871e8eee8fedf5cd571b2dc11d12e33af3bb497e5a17414c545ad`
- Rhino spatial source: `e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e`
- Illustrator visual source: `be5ae3075ca9b7afa1fcfdb58b4178f67b1b6a87a7bd3d0733cdd7a3ebc46c00`

The authority chain is deliberately asymmetric:

1. Event Proposal: executive name, journey membership, stop meaning and order.
2. Rhino: physical position and geometry.
3. Illustrator: visual cartography only.
4. Knowledge Guide: enrichment after an Event Proposal place has been admitted.

## Canonical executive garden vocabulary

| Canonical ID | Executive Arabic name | Event pages | Role | Executive map status |
| --- | --- | --- | --- | --- |
| `optionsGarden` | حديقة الخيارات | 7, 8, 25, 26, 34, 35 | primary journey garden | VERIFIED |
| `plioceneGarden` | الحديقة البليوسينية | 7, 8, 25, 26, 34, 35 | primary journey garden | VERIFIED |
| `familyGarden` | الحديقة العائلية | 7, 8, 25, 26, 34, 35 | primary journey garden | UNMAPPED |
| `devonianGarden` | الحديقة الديفونية | 7, 8, 25, 26, 34, 35 | primary journey garden | VERIFIED |
| `modernGarden` | الحديقة الحديثة | 7, 8, 25, 26, 34, 35 | primary journey garden | UNMAPPED |
| `natureGarden` | حديقة الطبيعة | 7, 35 | optional external journey | UNMAPPED |

No other garden is admitted to the executive map merely because it exists in the Knowledge Guide, a Rhino layer, or Illustrator artwork.

## Canonical route-place vocabulary

The proposal also establishes route places which are not gardens: `المدخل الرئيسي`, parking and drop-off points, `الاستقبال والضيافة`, `الاستقبال والعرضة السعودية`, `مجسم الحدائق`, `النصب التذكاري`, `ممر العصور`, `ركن الذكريات`, `الصورة الأيقونية`, hospitality/VIP areas, `المؤتمر الصحفي`, `منطقة العشاء`, gift delivery, journey end, and exit segments. They are classified separately in `eventProposalPlaceWhitelist.ts`; none is promoted to a garden.

## Excluded executive garden labels

The following Knowledge Guide/Rhino entries remain valuable internal knowledge or development provenance, but are excluded from the executive Garden Explorer because their names are not admitted by the Event Proposal journey-place whitelist:

- حديقة الفراشات
- حديقة الطيور
- حديقة المتاهة
- حديقة الصوت والضوء
- الحديقة المائية
- الحديقة الكربونية
- الحديقة الجوراسية
- الحديقة الطباشيرية

Their geometry and knowledge records are not deleted. Illustrator-native text is also suppressed at runtime; only KAGA's whitelisted Arabic labels are rendered.

## Knowledge naming boundary

The executive name `الحديقة الحديثة` remains visible. The Knowledge Guide entity `حديقة الحياة الحديثة` is joined only through the reviewed alias registry, never through runtime fuzzy matching. Likewise `حديقة الطبيعة` may receive enrichment from the guide's `الحديقة الطبيعية` only through an explicit reviewed alias.

The Event Proposal includes `الحديقة العائلية`, but no defensible detailed Knowledge Guide record is joined. Its area and descriptive knowledge fields therefore remain empty.

## Page 26 control

`رحلة الضيوف` remains A–L, from `05:30 م` to `07:30 م`. Its stops, durations, movement segments, and route geometry are unchanged. Stop I is displayed using the approved Event Proposal executive term `الحديقة الحديثة`; Knowledge Guide enrichment retains its separate source name behind an explicit alias.
