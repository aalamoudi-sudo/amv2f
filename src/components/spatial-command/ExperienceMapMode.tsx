import { AlertTriangle, Camera, CircleHelp, Landmark, Link2, Sparkles } from 'lucide-react';
import type { SpatialCommandExperienceConfiguration } from '../../types/spatialCommand';
import { SpatialEntityInspector } from './SpatialEntityInspector';

const relationshipLabels = {
  proposed: 'علاقة مقترحة',
  probable: 'علاقة مرجحة',
  conflicted: 'علاقة متعارضة',
  unresolved: 'غير محسومة',
  'founder-confirmed': 'أكدها المؤسس',
  'authority-confirmed': 'أكدتها السلطة',
  rejected: 'مرفوضة'
} as const;

function destinationCountAr(count: number): string {
  if (count === 0) return 'بلا موقع';
  if (count === 1) return 'وجهة واحدة';
  if (count === 2) return 'وجهتان';
  if (count <= 10) return `${count} وجهات`;
  return `${count} وجهة`;
}

export function ExperienceMapMode({
  configuration,
  selectedEntityId,
  onSelectEntity,
  onSelectUnresolvedExperience
}: {
  configuration: SpatialCommandExperienceConfiguration;
  selectedEntityId: string | null;
  onSelectEntity: (candidateEntityId: string) => void;
  onSelectUnresolvedExperience: (experienceObjectId: string) => void;
}) {
  if (selectedEntityId) {
    return <SpatialEntityInspector configuration={configuration} candidateEntityId={selectedEntityId} />;
  }
  const independentEntityIds = configuration.entityRelationships
    .filter((entry) => entry.experienceObjectId === null)
    .flatMap((entry) => entry.candidateEntityIds);
  return (
    <section data-testid="experience-map-context" className="sc-mode-panel sc-experience-panel">
      <header>
        <span><Sparkles aria-hidden="true" /></span>
        <div>
          <small>خريطة التجربة</small>
          <h2>{configuration.experienceObjects.length} مشاهد تنظّم {configuration.candidateEntities.length} وجهة</h2>
          <p>اختر وجهة من الخريطة لفهم علاقتها ومصدرها والقرار المطلوب.</p>
        </div>
      </header>
      <div className="sc-experience-groups">
        {configuration.experienceObjects.map((object, index) => {
          const relationship = configuration.entityRelationships.find((entry) => entry.experienceObjectId === object.experienceObjectId);
          const relationshipState = relationship?.state ?? 'unresolved';
          const candidateEntityIds = relationship?.candidateEntityIds ?? [];
          return (
          <article key={object.experienceObjectId} className={`is-${relationshipState}`}>
            <button
              data-testid={`experience-object-${object.experienceObjectId}`}
              type="button"
              onClick={() => candidateEntityIds[0]
                ? onSelectEntity(candidateEntityIds[0])
                : onSelectUnresolvedExperience(object.experienceObjectId)}
            >
              <span style={{ '--group-index': index } as React.CSSProperties}>{index + 1}</span>
              <div>
                <strong>{object.labelAr}</strong>
                <small>{relationshipLabels[relationshipState]} · {destinationCountAr(candidateEntityIds.length)}</small>
              </div>
              {relationshipState === 'conflicted'
                ? <AlertTriangle aria-hidden="true" />
                : relationshipState === 'unresolved'
                  ? <CircleHelp aria-hidden="true" />
                  : <Link2 aria-hidden="true" />}
            </button>
          </article>
          );
        })}
      </div>
      <section className="sc-independent-summary">
        <Landmark aria-hidden="true" />
        <div>
          <strong>معالم مستقلة مجمّدة خارج الرحلة الحالية</strong>
          <p>{independentEntityIds.map((candidateId) => configuration.candidateEntities.find((entity) => entity.candidateId === candidateId)?.labelAr).filter(Boolean).join(' · ')}</p>
        </div>
        <span>{independentEntityIds.length}</span>
      </section>
      <section className="sc-evidence-mini">
        <Camera aria-hidden="true" />
        <div><strong>أدلة مرجعية متاحة للمراجعة</strong><small>{configuration.evidenceSummary.inventory.photographCount} صورة · {configuration.evidenceSummary.inventory.videoCount} فيديوهات · بلا GPS منشور</small></div>
      </section>
    </section>
  );
}
