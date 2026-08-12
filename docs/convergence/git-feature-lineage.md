# خط نسب KAP Convergence RC1

## التدقيق قبل التغيير

| البند | النتيجة |
|---|---|
| `main` | `894fa504e331e6cf890753db8726b2e4de6e5bc1`، لم يتغير |
| Wave B | `d45fcc4f682695afcf42f47dcaf004495154dee3`، نظيف من التغييرات المتتبعة |
| Wave C | `44e64e64423da336b40dd83cbdc4e82b62173942`، نظيف |
| merge base الفعلي | `508777bf822197812f1360a649462766d5e758b3` |
| فرع التقارب | `codex/kap-convergence-rc1` |
| worktree | `/Users/mayadeen/Documents/mayadeen-event-intelligence-twin-stage-convergence` |

محتوى `tmp/` والملفات الخاصة والمشتقات المحلية المهملة لم يُحذف أو يُضف إلى Git.

## التزامات Wave B الفريدة

1. `ca133354` — controlled delivery accelerator.
2. `f6e14589` — Majed V.11 candidate intake.
3. `ff9ac2ed` — founder correction: 1 November route not applicable.
4. `d45fcc4f` — inclusive duration accounting and 275-minute media journey.

## التزامات Wave C الفريدة

1. `3cb99fce` — verified founder-approved design-source Web3D derivative.
2. `ec97bfeb` — local Blob asset audit distinction.
3. `44e64e64` — review metrics and bundle hardening.

## الدمج المتحكم السابق

أعيد تطبيق التزامات Wave C زمنيًا فوق Wave B، من دون merge إلى `main`:

| أصل Wave C | التزام التقارب |
|---|---|
| `3cb99fce` | `c1f1c45c` |
| `ec97bfeb` | `d6f6a986` |
| `44e64e64` | `b5021519` |

ثم أضاف `272e284efd443e2ee6fb5ef0199983f75ac2bc0a` محول
`experienceRouteDesignConvergence` وسياق اختيار موحدًا. يحتوي هذا الرأس على
تاريخ Wave B كاملًا وعلى التزامات Wave C المعاد تطبيقها؛ لذلك اختير كأساس أكثر
أمانًا لفرع RC1 بدل تكرار cherry-pick وإنشاء تاريخ متوازٍ آخر.

## تحليل التعارض وحله

- ملفات تكوين Experience Twin: جُمعت `OperationalJourneyCandidatePackage` و
  `DesignExperienceConfiguration` في تكوين واحد؛ لم يُحذف أي منهما.
- اختيار URL: أضيفت الرحلة التشغيلية والمحطة إلى `ExperienceSelectionContext`
  بدل مخزن محلي موازٍ.
- عارض المشهد: بقي `ExperienceSceneGateway` المسار الوحيد للأصل؛ لم يُنشأ عارض
  3D ثانٍ.
- حقيقة 1 نوفمبر: بقي تصحيح المؤسس نافذًا؛ لا fallback إلى يوم أو رحلة أخرى.
- الحقيقة المكانية: يعيد المحول دائمًا `routeGeometry = null` و
  `createsSpatialRoute = false`.
- الرجوع من المشهد: يعيد نفس day/persona/journey/waypoint/entity/zone ولا يغيّر
  readiness أو baseline أو decision.

## أعمال موجودة خارج main

التدقيق وجد رؤوسًا مهمة غير مدمجة في `main`، منها:

- `codex/stage-ex1a-additive-four-day-experience-twin` عند Wave B.
- `codex/stage-ex1f-founder-approved-design-web3d` عند Wave C.
- `codex/stage-ex1f-wave-bc-convergence` عند التقارب المشترك.
- `codex/kap-convergence-rc1` عند نقطة المراجعة الحالية.
- `codex/stage-cx1-executive-client-confidence-room` كعمل عميل مستقل غير مختار
  لهذا التقارب.

لم تُحذف هذه الفروع ولم يُفترض أن كل عمل تجريبي فيها جزء من الإصدار.

## الرجوع الآمن

نقطة ما قبل RC1 هي `272e284e`. الرجوع يكون باختيار هذا الالتزام أو حذف worktree
المعزول بعد موافقة صريحة؛ لا يحتاج ولا يبرر reset أو rebase أو تعديل `main`.
الأصول الخاصة تبقى خارج Git، وسجل V.02/V.11 وسلسلة مراجعات Web3D لا يعاد
كتابتهما.
