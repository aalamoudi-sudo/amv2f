import { AlertTriangle, CheckCircle2, Compass, FileCheck2, Link2, MapPin, ShieldQuestion } from 'lucide-react';
import { spatialOperatorLabel } from '../../services/spatialCommand';
import type { SpatialCommandExperienceConfiguration } from '../../types/spatialCommand';

export function SpatialEntityInspector({
  configuration,
  candidateEntityId
}: {
  configuration: SpatialCommandExperienceConfiguration;
  candidateEntityId: string;
}) {
  const entity = configuration.candidateEntities.find((entry) => entry.candidateId === candidateEntityId);
  if (!entity) return null;
  const relationships = configuration.entityRelationships.filter((relationship) => relationship.candidateEntityIds.includes(entity.candidateId));
  const relatedObjects = relationships
    .map((relationship) => configuration.experienceObjects.find((object) => object.experienceObjectId === relationship.experienceObjectId))
    .filter((object): object is NonNullable<typeof object> => Boolean(object));
  const truthDecision = configuration.spatialTruthPack.semanticDecisions.find((decision) => decision.targetId === entity.candidateId);
  const independent = truthDecision?.spatialStatus === 'independent-landmark';
  const conflict = independent
    ? null
    : relationships.find((relationship) => relationship.conflictCodes.length)?.conflictCodes[0] ?? null;
  const requiredApproval = independent
    ? 'أي إدخال في الرحلة أو كائن تجربة يحتاج مراجعة حقيقة جديدة ومصدرًا مخولًا.'
    : relationships[0]?.requiredApprovalAr ?? 'قرار تصنيف من المؤسس ثم تحقق سلطة المصدر';
  return (
    <section data-testid="spatial-entity-inspector" className="sc-entity-inspector">
      <header>
        <span>{entity.sourceNumber}</span>
        <div>
          <small>{independent ? 'معلم مستقل' : 'كيان مكاني مرشح'}</small>
          <h2>{truthDecision?.primaryLabelAr ?? entity.labelAr}</h2>
        </div>
        <i className={`is-${truthDecision?.spatialStatus ?? entity.mappingStatus}`}>
          {independent ? 'معلم مستقل' : spatialOperatorLabel(entity.mappingStatus)}
        </i>
      </header>
      <dl>
        <div>
          <dt><MapPin aria-hidden="true" />ما هذا العنصر؟</dt>
          <dd>{entity.labelAr} كما ظهر في الوجهة رقم {entity.sourceNumber} من المخطط التشغيلي المرشح.</dd>
        </div>
        <div>
          <dt><Link2 aria-hidden="true" />ما علاقته بالتجربة؟</dt>
          <dd>{relatedObjects.length ? relatedObjects.map((object) => object.labelAr).join(' · ') : 'معلم مستقل مجمّد خارج كائنات التجربة والرحلة الحالية.'}</dd>
        </div>
        <div>
          <dt><FileCheck2 aria-hidden="true" />ما المصدر الذي وضعه هنا؟</dt>
          <dd>مخطط التقسيم التشغيلي المرشح؛ المرساة مشتقة يدويًا من صورة المراجعة.</dd>
        </div>
        <div>
          <dt><Compass aria-hidden="true" />هل موقعه معتمد؟</dt>
          <dd><strong>لا.</strong> {spatialOperatorLabel(entity.geometryStatus)} ولا تمثل نقطة مساحية أو مضلعًا.</dd>
        </div>
        <div>
          <dt><ShieldQuestion aria-hidden="true" />ما الذي ما زال مفقودًا؟</dt>
          <dd>المقياس والمرجع المكاني واعتماد المخطط والمعايرة الهندسية.</dd>
        </div>
        <div>
          <dt><CheckCircle2 aria-hidden="true" />ما القرار المطلوب؟</dt>
          <dd>{requiredApproval}</dd>
        </div>
      </dl>
      {conflict ? (
        <p className="sc-inspector-conflict">
          <AlertTriangle aria-hidden="true" />
          تعارض ظاهر: تسمية كائن التجربة القديم لا تطابق تسمية المصدر المرشح.
        </p>
      ) : null}
    </section>
  );
}
