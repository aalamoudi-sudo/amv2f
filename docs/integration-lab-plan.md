# خطة مختبر التكامل

## الغرض

إثبات أن مورّدًا أو نظامًا مستقبليًا يمكن استبداله دون تغيير Event Intelligence core. الخطة التالية هي planning only؛ لا تبدأ شراء أو اتصالًا حيًا.

## ما هو عامل الآن

`مختبر تدفق الحقيقة التشغيلية` يعرض registry، capabilities/health، source controls، envelopes/events، details، evidence/provenance، trust، validation، duplicates/rejections، offline/conflicts، canonical projection، 2D/3D/geospatial/physical previews، ومؤشرات محاكاة.

الحالات الحتمية: valid/invalid/duplicate/late offline/conflict/missing evidence/unknown entity/unauthorized/clock drift/correction/error declaration/corroborated/verified/approved/scenario.

## Integration Lab planning only

1. اختر capability واحدة ومشكلة تشغيلية واحدة.
2. جمد `MEIOS-CAPTURE-1.0.0` وfixtures والإجابات المرجعية.
3. اطلب documentation/sandbox فقط بعد موافقة أحمد.
4. نفذ adapter خارج core.
5. شغّل conformance + failure/retry/offline/context tests.
6. قارن مع CSV/manual import كأبسط بديل.
7. قيّم operator burden، latency، false acceptance، recovery، export وcost.
8. أوصِ build/buy/partner/delay؛ لا تنتقل تلقائيًا إلى production.

## Success measures المستقبلية

- 100% stable ID mapping للحالات المختبرة.
- صفر duplicate baseline effects.
- صفر unverified baseline mutation.
- deterministic replay متطابق.
- كل رفض يحمل code/path/سبب عربي.
- complete raw export وtested replacement.
- operator input أقل من البديل دون انخفاض correctness.

## بيانات لا تجمع في المختبر الحالي

لا personal data، لا credentials، لا camera/video، لا device identifiers حقيقية، لا location tracks، لا operational baseline، ولا confidential vendor payload.
