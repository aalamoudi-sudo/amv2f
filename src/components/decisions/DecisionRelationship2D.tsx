import { ArrowLeft } from 'lucide-react';
import type { DecisionEntityRelation, DecisionRecord } from '../../types/decision';
import type { SpatialEntityRecord } from '../../types/spatial';
import { decisionRelationLabelsAr } from '../../services/decisionRelationshipMigration';

const impactLabels = { none: 'لا يوجد', low: 'منخفض', medium: 'متوسط', high: 'مرتفع' } as const;
const relationTone: Record<DecisionEntityRelation['relationType'], string> = {
  'execution-target': 'border-command-amber/70 text-command-amber',
  affected: 'border-command-accent/70 text-command-accent',
  dependency: 'border-command-severity-critical/60 text-command-severity-critical',
  'evidence-source': 'border-command-truth-reported/60 text-command-truth-reported'
};

interface DecisionRelationship2DProps {
  decision: DecisionRecord;
  links: DecisionEntityRelation[];
  entities: SpatialEntityRecord;
  onSelectEntity: (entityId: DecisionEntityRelation['entityId']) => void;
}

export function DecisionRelationship2D({ decision, links, entities, onSelectEntity }: DecisionRelationship2DProps) {
  return (
    <div data-testid="decision-2d-relationship" className="command-spatial-plan min-h-[360px] overflow-hidden rounded border border-command-line p-5">
      <div className="grid min-h-[310px] items-center gap-6 md:grid-cols-[minmax(260px,0.8fr)_minmax(360px,1.2fr)] md:gap-10">
        <div className="w-full max-w-sm rounded border border-command-accent bg-command-accent/15 p-5 text-center shadow-command">
          <p className="text-xs font-semibold text-command-accent">القرار</p>
          <h3 className="mt-2 text-lg font-semibold text-command-text">{decision.title}</h3>
          <p className="mt-2 text-xs leading-6 text-command-muted">{decision.problemStatement}</p>
          <span className="mt-3 inline-flex rounded border border-command-line px-2 py-1 text-xs text-command-amber">أثر متوقع: {impactLabels[decision.expectedImpact.level]}</span>
        </div>
        <div className="w-full space-y-2">
          <p className="text-center text-xs font-semibold text-command-text">العناصر والعلاقات واتجاه الأثر</p>
          {links.length ? links.map((link) => (
            <div key={link.relationId} className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2">
              <ArrowLeft className={`h-5 w-5 ${relationTone[link.relationType].split(' ').at(-1)}`} aria-label="اتجاه العلاقة من القرار إلى العنصر" />
              <button
                data-testid={`decision-related-2d-${link.entityId}`}
                data-relation-type={link.relationType}
                type="button"
                onClick={() => onSelectEntity(link.entityId)}
                className={`flex w-full items-center justify-between gap-3 rounded border bg-command-panelStrong p-3 text-right transition hover:bg-command-panel ${relationTone[link.relationType]}`}
              >
                <span>
                  <span className="block font-semibold text-command-text">{entities[link.entityId]?.nameAr ?? 'عنصر مكاني'}</span>
                  <span className="mt-1 block text-xs font-semibold">{decisionRelationLabelsAr[link.relationType]}</span>
                  <span className="mt-1 block text-xs text-command-muted">{link.descriptionAr}</span>
                </span>
                <span className="ltr shrink-0 text-xs font-semibold">{link.entityId}</span>
              </button>
            </div>
          )) : <p className="rounded border border-dashed border-command-line p-4 text-center text-sm text-command-muted">لا توجد علاقة مكانية مرتبطة.</p>}
        </div>
      </div>
      <p className="mt-3 text-center text-xs leading-6 text-command-muted">العلاقة هنا تمثيل تعاقدي مبسط، وليست محرك graph معقداً أو إثباتاً للأثر.</p>
    </div>
  );
}
