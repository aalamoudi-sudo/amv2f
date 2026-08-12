# سياسة Offline والتعارض

## ما يحفظه السجل غير المتصل

device/source time، platform receipt time، `offlineSequence`, idempotency key، payload hash، state context، correlation/causation. لا يستبدل وقت الجهاز وقت المنصة.

## replay

1. تحقق من العقد والبصمة والهوية.
2. افحص idempotency/source identity.
3. قارن prior disposition بالحالة المشتقة الحالية.
4. إذا تطابقت precondition، أعد التشغيل مرة واحدة عبر pipeline نفسه.
5. إذا سبق السجل، تجاهله بأمان.
6. إذا تعارض، احفظ الادعاءين وأرسل `ConflictRecord` إلى review.

`offlineSequence` إما `null` أو عدد صحيح موجب. sequence سالب أو غير صحيح مرفوض قبل بناء الحدث. retry يحتفظ بهوية الأمر المنطقي أو مفتاح idempotency، ويستخدم محاولة تسليم منفصلة عند الإخراج. فشل factory أو append لا يسمم المفتاح.

## ممنوع

- blind last-write-wins.
- تعديل حدث سابق.
- تحويل scenario إلى baseline.
- اعتبار وقت الجهاز أو actor string وقتاً سلطوياً أو هوية إنتاجية.
- تسوية آلية لتعارض يحتاج سلطة بشرية.
- وصف هذه المحاكاة بأنها production offline sync.

## ما يلزم للإنتاج لاحقًا

durable queue، signed device identity، server sequence، concurrency tokens، conflict ownership/SLA، retry/backoff، encryption، clock policy، recovery testing، ومراقبة. كلها خارج Stage 3D.
