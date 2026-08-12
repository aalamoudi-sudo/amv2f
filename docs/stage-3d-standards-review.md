# مراجعة R&D للمعايير والمفاهيم — Stage 3D

**التصنيف:** Evidence-led architecture review؛ لا formal conformance.

| المرجع | Evidence من المصدر | تطبيق Mayadeen | الفجوة/حد الادعاء |
| --- | --- | --- | --- |
| [GS1 EPCIS 2.0](https://ref.gs1.org/standards/epcis/2.0.0/) | نموذج event لتسجيل what/when/where/why في business process | أبعاد event + business step/disposition/source | لا GS1 identifiers/CBV/query/certification |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/) | Entity/Activity/Agent وgeneration/use/association/derivation/primary source/revision/role | `ProvenanceBundle` بنفس المفاهيم الأساسية | لا RDF/OWL/PROV constraints أو serialization |
| [OGC SensorThings](https://www.ogc.org/standards/sensorthings/) | فصل Thing/Location/Sensor/Datastream/Observation وواجهة sensing/tasking | sensor source يبقى observation غير موثوق ومكاني المرجع | لا SensorThings API/entities/HTTP/MQTT conformance |
| [buildingSMART BCF](https://info.buildingsmart.org/standards/bsi-standards/bim-collaboration-format/) | بروتوكول openBIM للقضايا والتنسيق والviewpoints | spatial reference/evidence viewpoint وروابط entity/event | لا BCF topics/viewpoints/IFC exchange |
| [Palantir Action Types](https://www.palantir.com/docs/foundry/action-types/overview) | governed actions بدل property edits، rules/permissions/submission criteria | `ActionGateway` + preconditions/authority/evidence | لا Palantir integration أو ontology runtime |
| [Siemens Electronic Work Instructions](https://www.siemens.com/en-us/technology/electronic-work-instructions/) | step-by-step operator guidance متصل بprocess planning/MOM | instruction ID/version، required sequence، judgment-only input | لا MES/MOM أو certified work instruction |

## Key finding

**Inference:** التمييز الأقوى ليس استنساخ أي معيار، بل ربط observation/provenance/trust/action/spatial projection في عقد حدث-تشغيلي خاص بالفعاليات. **Unverified hypothesis:** هذا يخفض زمن التحقق وأخطاء التنفيذ مقارنة بchecklist؛ يلزم field experiment.

## أبسط بديل

CSV موحد + checklist + مجلد evidence. يبقى البديل المرجعي حتى يثبت المختبر قيمة adapter/conformance/replay مكانياً.

## Build / buy / partner

- Build canonical event/trust/action/projection/conformance.
- Buy mature source/hardware capability بعد gate.
- Partner for reality capture, sensing, BIM/BCF mapping, AV/physical testing.
- Delay live integrations and formal certification.

## قرار أحمد

اختيار use case واحد للIntegration Lab، معيار/مورّد واحد للدراسة، بيانات sandbox، success/failure thresholds، وميزانية زمنية. لا إذن شراء أو تكامل ضمن هذه المراجعة.
