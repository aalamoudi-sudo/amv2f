import type {
  AdapterManifest,
  CaptureEnvelope,
  InputAdapter,
  OutputAdapter,
  PhysicalSceneCommand,
  ProjectionOutputBundle,
  SpatialOutputCommand,
  ValidationIssue
} from '../types/integration';
import type { IntegrationLabConfiguration } from '../types/integrationLab';
import type { SpatialEntityId } from '../types/spatial';
import { stableSerialize } from './integrationHash';
import {
  validateAdapterManifest,
  validateOperationalEvent,
  validatePhysicalSceneCommand,
  validateSpatialOutputCommand
} from './integrationValidation';
import { operationalEventFromObservation, operationalEventIdFromObservation } from './adapterSdk';
import { LocalOperationalEventRepository } from './operationalEventRepository';
import { queueOfflineEnvelope, reconcileOfflineEntry } from './offlineReconciliation';
import type { EvidenceResolver } from './evidenceResolver';
import { ProvenanceResolver, provenanceRequestForEvent } from './provenanceResolver';
import { projectionsAreSynchronized } from './canonicalStateProjection';

export interface ConformanceCheck {
  checkId: string;
  labelAr: string;
  passed: boolean;
  detailAr: string;
}

export interface AdapterConformanceReport {
  adapterId: string;
  passed: boolean;
  checks: ConformanceCheck[];
  issues: ValidationIssue[];
}

function check(checkId: string, labelAr: string, passed: boolean, detailAr: string): ConformanceCheck {
  return { checkId, labelAr, passed, detailAr };
}

export async function runInputAdapterConformance(
  adapter: InputAdapter,
  envelope: CaptureEnvelope,
  knownEntityIds: ReadonlySet<SpatialEntityId>,
  evidenceResolver: EvidenceResolver
): Promise<AdapterConformanceReport> {
  const manifestIssues = validateAdapterManifest(adapter.manifest);
  const first = adapter.normalize(envelope);
  const second = adapter.normalize(structuredClone(envelope));
  const ingestion = adapter.ingest(envelope);
  const retriedEnvelope = adapter.retry(envelope, 1);
  const handledError = adapter.handleError(new Error('fixture'));
  const eventId = operationalEventIdFromObservation(first);
  const provenanceBundle = adapter.createProvenance(first, eventId);
  const provenanceResolver = new ProvenanceResolver([provenanceBundle]);
  const event = operationalEventFromObservation(first, { revision: 1, provenanceRefs: [provenanceBundle.bundleId] });
  const eventIssues = validateOperationalEvent(event, knownEntityIds);
  const evidenceResolution = evidenceResolver.resolve({
    evidenceRefs: event.evidenceRefs,
    targetEntityId: event.subjects.entityId,
    stateContext: event.stateContext,
    relatedRequirementId: event.subjects.requirementId,
    instructionId: event.operationalContext.instructionId,
    instructionVersion: event.operationalContext.instructionVersion
  });
  const provenanceResolution = provenanceResolver.resolve(provenanceRequestForEvent(event));
  const unknownEntityEnvelope = structuredClone(envelope);
  unknownEntityEnvelope.payload.data.entityId = 'ZONE-CONFORMANCE-UNKNOWN';
  const unknownObservation = adapter.normalize(unknownEntityEnvelope);
  const unknownEntityEvent = operationalEventFromObservation(unknownObservation, {
    revision: 1,
    provenanceRefs: [adapter.createProvenance(unknownObservation, operationalEventIdFromObservation(unknownObservation)).bundleId]
  });
  const rejectsUnknownEntity = validateOperationalEvent(unknownEntityEvent, knownEntityIds)
    .some((currentIssue) => currentIssue.code === 'unknown-entity');
  const repository = new LocalOperationalEventRepository();
  const firstAppend = await repository.append(event);
  const duplicateAppend = await repository.append(structuredClone(event));
  const queue = queueOfflineEnvelope({ ...envelope, offlineSequence: 1 }, envelope.receivedAt);
  const reconciliation = reconcileOfflineEntry(queue, [], envelope.receivedAt);
  const checks = [
    check('manifest-valid', 'صلاحية تعريف الموائم', manifestIssues.length === 0, manifestIssues.length ? 'تعريف الموائم يحتوي أخطاء.' : 'التعريف صالح.'),
    check('schema-supported', 'إصدار العقد مدعوم', adapter.manifest.supportedSchemaVersions.includes(envelope.schemaVersion), 'تمت مقارنة الإصدار بقائمة الإصدارات المعلنة.'),
    check('capture-envelope-accepted', 'غلاف الالتقاط مقبول', ingestion.status === 'accepted-for-validation', 'أحال الموائم الغلاف إلى التحقق دون منحه حقيقة تشغيلية.'),
    check('normalization-deterministic', 'التطبيع حتمي', stableSerialize(first) === stableSerialize(second), 'أُعيد التطبيع مرتين لنفس الحمولة.'),
    check('source-record-mapped', 'سجل المصدر مربوط', first.sourceRecordId === envelope.sourceRecordId && first.sourceSystemId === envelope.sourceSystemId, 'حافظ التطبيع على هوية سجل المصدر ونظامه.'),
    check('provenance-produced', 'المصدر من إنتاج الموائم', provenanceBundle.bundleId === event.provenanceRefs[0], 'أنشأ الموائم سلسلة المصدر للحدث الناتج.'),
    check('provenance-resolved', 'سلسلة المصدر قابلة للحل', provenanceResolution.valid, provenanceResolution.valid ? 'حُلّ سجل المصدر والنشاط والموائم والحدث.' : 'سلسلة المصدر ناقصة أو غير مرتبطة.'),
    check('event-valid', 'الحدث الناتج صالح', eventIssues.length === 0, eventIssues.length ? 'الحدث الناتج رفضه العقد.' : 'الحدث اجتاز العقد.'),
    check('evidence-reference-integrity', 'مراجع الأدلة محلولة', evidenceResolution.valid, evidenceResolution.valid ? 'كل دليل موجود ومرتبط بالسياق والهدف.' : 'يوجد دليل مفقود أو غير مرتبط.'),
    check('unknown-entity-rejected', 'العنصر المجهول مرفوض', rejectsUnknownEntity, 'حاول الاختبار تمرير عنصر غير موجود في السجل المكاني.'),
    check('duplicate-safe', 'التكرار محجوب', firstAppend.status === 'appended' && duplicateAppend.status === 'duplicate', 'إعادة الإرسال لم تضف حدثاً ثانياً.'),
    check('retry-idempotent', 'إعادة المحاولة آمنة', repository.count() === 1 && retriedEnvelope.idempotencyKey === envelope.idempotencyKey && retriedEnvelope.transportMetadata.retryCount === 1, 'احتفظت الإعادة بمفتاح التكرار ورفعت عداد المحاولة.'),
    check('error-structured', 'معالجة الخطأ منظمة', handledError.code === 'adapter-error' && handledError.blocking, 'حوّل الموائم الخطأ إلى نتيجة منظمة.'),
    check('offline-behavior', 'سلوك عدم الاتصال معلن', !adapter.manifest.offlineSupport || reconciliation.outcome === 'replay', 'السجل المتأخر دخل مسار التسوية عند إعلان دعم عدم الاتصال.'),
    check('context-preserved', 'سياق الحالة محفوظ', first.stateContext === envelope.stateContext && event.stateContext === envelope.stateContext, 'لم يُعاد تصنيف السياق أثناء التطبيع.'),
    check('acknowledgement', 'إقرار الاستلام يعمل', adapter.acknowledge(envelope.envelopeId).accepted, 'أعاد الموائم إقراراً منظماً.')
  ];
  const issues = [...manifestIssues, ...eventIssues, ...evidenceResolution.issues, ...provenanceResolution.issues];
  return { adapterId: adapter.manifest.adapterId, passed: checks.every((currentCheck) => currentCheck.passed), checks, issues };
}

type OutputCommand = SpatialOutputCommand | PhysicalSceneCommand;

export async function runOutputAdapterConformance<TCommand extends OutputCommand>(
  adapter: OutputAdapter<TCommand>,
  command: TCommand,
  bundle: ProjectionOutputBundle
): Promise<AdapterConformanceReport> {
  const manifestIssues = validateAdapterManifest(adapter.manifest);
  const commandIssues = 'outputType' in command
    ? validateSpatialOutputCommand(command, new Set(bundle.projection.entityStates.map((state) => state.entityId)))
    : validatePhysicalSceneCommand(command);
  const acknowledgement = adapter.deliver(command);
  const retryAcknowledgement = adapter.retryDelivery(command, 2);
  const handledError = adapter.handleError(new Error('fixture'));
  const synchronization = await projectionsAreSynchronized(bundle);
  const checks = [
    check('manifest-valid', 'صلاحية تعريف الموائم', manifestIssues.length === 0, manifestIssues.length ? 'تعريف الموائم يحتوي أخطاء.' : 'التعريف صالح.'),
    check('command-contract-valid', 'عقد أمر الإخراج صالح', commandIssues.length === 0, commandIssues.length ? 'أمر الإخراج يخالف العقد.' : 'أمر الإخراج اجتاز العقد.'),
    check('projection-version', 'هوية الإسقاط محفوظة', command.projectionVersion === bundle.projection.projectionVersion && command.projectionContentHash === bundle.projection.projectionContentHash, 'المخرج يستهلك هوية محتوى الإسقاط نفسها.'),
    check('command-content-digest', 'بصمة محتوى الأمر موجودة', /^[a-f0-9]{64}$/i.test(command.commandContentHash), 'أمر الإخراج يحمل بصمة SHA-256.'),
    check('command-identity-unique', 'هوية الأمر مرتبطة بالمحتوى', command.commandId.endsWith(command.commandContentHash), 'هوية الأمر مشتقة من بصمة محتواه.'),
    check('output-acknowledged', 'إقرار المخرج منظم', acknowledgement.status === 'acknowledged' && acknowledgement.deliveryAttemptId === command.deliveryAttemptId, 'تم إقرار محاولة التسليم الأولى.'),
    check('output-retry', 'إعادة المخرج منظمة', retryAcknowledgement.status === 'acknowledged' && retryAcknowledgement.commandId === command.commandId && retryAcknowledgement.deliveryAttemptId !== acknowledgement.deliveryAttemptId, 'احتفظت الإعادة بهوية الأمر وغيّرت هوية محاولة التسليم.'),
    check('output-synchronized', 'محتوى المخرج متزامن', synchronization, 'فُحص المحتوى والنسب والسياق والربط، لا نص الإصدار فقط.'),
    check('output-error-structured', 'خطأ المخرج منظم', handledError.code === 'output-adapter-error', 'تحول خطأ المخرج إلى نتيجة منظمة.'),
    check('no-cross-context', 'لا بيانات من سياق آخر', command.stateContext === bundle.projection.stateContext, 'سياق الأمر يطابق الإسقاط.'),
    check('no-truth-feedback', 'لا توجد حلقة عودة للحقيقة', adapter.manifest.capabilities.ingest === false && adapter.manifest.inputOrOutput === 'output', 'موائم الإخراج لا يملك قدرة ingest.'),
    check('vendor-neutral', 'المخرج محايد المورد', adapter.manifest.vendorMetadata.vendorNeutral, 'لا يحتوي التعريف اسم منتج مورّد.')
  ];
  return { adapterId: adapter.manifest.adapterId, passed: checks.every((currentCheck) => currentCheck.passed), checks, issues: [...manifestIssues, ...commandIssues] };
}

export async function runReferenceAdapterConformanceMatrix(
  configuration: IntegrationLabConfiguration,
  bundle: ProjectionOutputBundle,
  evidenceResolver: EvidenceResolver
): Promise<AdapterConformanceReport[]> {
  const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
  const inputReports = await Promise.all(configuration.inputAdapters.map(async (adapter) => runInputAdapterConformance(
    adapter,
    await configuration.createConformanceEnvelope(adapter.manifest.adapterId),
    knownEntityIds,
    evidenceResolver
  )));
  const outputReports = await Promise.all(configuration.outputAdapters.map(async (adapter) => {
    if (adapter.manifest.adapterType === 'physical-output') {
      return runOutputAdapterConformance(adapter as OutputAdapter<PhysicalSceneCommand>, bundle.physical, bundle);
    }
    const command = adapter.manifest.adapterType === 'spatial-2d'
      ? bundle.spatial2d
      : adapter.manifest.adapterType === 'spatial-3d'
        ? bundle.spatial3d
        : bundle.geospatial;
    return runOutputAdapterConformance(adapter as OutputAdapter<SpatialOutputCommand>, command, bundle);
  }));
  return [...inputReports, ...outputReports].sort((left, right) => left.adapterId.localeCompare(right.adapterId));
}

export function manifestConformanceSummary(manifests: AdapterManifest[]): { passed: number; failed: number } {
  const passed = manifests.filter((manifest) => validateAdapterManifest(manifest).length === 0).length;
  return { passed, failed: manifests.length - passed };
}
