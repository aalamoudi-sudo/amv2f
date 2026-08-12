import { Box, CircleDashed, FileClock, Layers3, Link2, Map, MapPinned, Route, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { EventThemePackage } from '../../types/eventThemePackage';
import type { ExperienceIntelligencePack, ExperiencePoint } from '../../types/experienceIntelligence';

export type SpatialReviewMode = '2d' | '3d' | 'hybrid';

interface SpatialCommandReviewScreenProps {
  theme: EventThemePackage;
  pack: ExperienceIntelligencePack;
  mode: SpatialReviewMode;
  selectedPointId: string;
  onModeChange: (mode: SpatialReviewMode) => void;
  onPointChange: (experiencePointId: string) => void;
  onOpenTechnicalDetails: () => void;
  onOpenSpatialAuthoring?: () => void;
}

const spatialModes = [
  { value: '2d', label: '2D', icon: Map },
  { value: '3d', label: '3D', icon: Box },
  { value: 'hybrid', label: 'هجين', icon: Layers3 }
] as const;

function geometryMessage(mode: SpatialReviewMode): { title: string; detail: string; icon: typeof Map } {
  if (mode === '2d') {
    return {
      title: 'لا توجد خريطة 2D معتمدة',
      detail: 'محتوى DWG مسموح للعمل المنصي، لكن لا توجد طبقات محوّلة أو نقاط ربط مراجعة للمناطق الخمس.',
      icon: Map
    };
  }
  if (mode === '3d') {
    return {
      title: 'لا يوجد مشهد 3D معتمد',
      detail: 'مراجع الأصول الجزئية لا تسمح ببناء موقع أو مسار أو نموذج تشغيل للفعالية.',
      icon: Box
    };
  }
  return {
    title: 'العرض الهجين ينتظر المصدرين',
    detail: 'سيجمع 2D و3D بعد اعتماد الربط الهندسي. حاليًا يعرض العلاقة المنطقية فقط.',
    icon: Layers3
  };
}

function selectedPoint(pack: ExperienceIntelligencePack, selectedPointId: string): ExperiencePoint {
  return pack.experiencePoints.find((point) => point.experiencePointId === selectedPointId) ?? pack.experiencePoints[0]!;
}

export function SpatialCommandReviewScreen({
  theme,
  pack,
  mode,
  selectedPointId,
  onModeChange,
  onPointChange,
  onOpenTechnicalDetails,
  onOpenSpatialAuthoring
}: SpatialCommandReviewScreenProps) {
  const [relationshipLayerVisible, setRelationshipLayerVisible] = useState(true);
  const [sourceLayerVisible, setSourceLayerVisible] = useState(true);
  const selected = selectedPoint(pack, selectedPointId);
  const emptyState = geometryMessage(mode);
  const EmptyIcon = emptyState.icon;

  return (
    <section data-testid="visual-screen-spatial" className="vd-screen vd-spatial-screen" aria-labelledby="vd-spatial-title">
      <header className="vd-spatial-heading">
        <div>
          <p className="vd-overline">Spatial Command Workspace</p>
          <h1 id="vd-spatial-title">المكان أولًا، مع حدود الحقيقة</h1>
          <p>مساحة مركزة لحزمة <strong>{pack.eventNameAr}</strong> دون اختراع موقع أو مسار.</p>
        </div>
        <div className="vd-spatial-mode-switch" aria-label="اختيار تمثيل المكان">
          {spatialModes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              data-testid={`spatial-mode-${value}`}
              type="button"
              aria-pressed={mode === value}
              className={mode === value ? 'is-active' : undefined}
              onClick={() => onModeChange(value)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="vd-spatial-workspace">
        <div data-testid="spatial-review-canvas" data-spatial-mode={mode} className={`vd-spatial-canvas vd-spatial-canvas-${mode}`}>
          <div className="vd-canvas-toolbar">
            <div className="vd-canvas-state">
              <CircleDashed aria-hidden="true" />
              <span>هندسة غير متاحة</span>
              <small>working source · mapping pending</small>
            </div>
            <div className="vd-layer-controls" aria-label="طبقات العلاقة">
              <button
                type="button"
                aria-pressed={relationshipLayerVisible}
                className={relationshipLayerVisible ? 'is-active' : undefined}
                onClick={() => setRelationshipLayerVisible((value) => !value)}
              >
                <Link2 aria-hidden="true" />العلاقات المنطقية
              </button>
              <button
                type="button"
                aria-pressed={sourceLayerVisible}
                className={sourceLayerVisible ? 'is-active' : undefined}
                onClick={() => setSourceLayerVisible((value) => !value)}
              >
                <FileClock aria-hidden="true" />حالة المصدر
              </button>
            </div>
          </div>

          <div className="vd-spatial-empty-state">
            <span className="vd-spatial-orbit" aria-hidden="true" />
            <EmptyIcon aria-hidden="true" />
            <p className="vd-overline">{mode === '2d' ? '2D SAFE STATE' : mode === '3d' ? '3D SAFE STATE' : 'HYBRID SAFE STATE'}</p>
            <h2>{emptyState.title}</h2>
            <p>{emptyState.detail}</p>
            <span className="vd-nonspatial-label"><Route aria-hidden="true" />لا يوجد Route معتمد للرسم</span>
          </div>

          {relationshipLayerVisible ? (
            <ol className="vd-logical-relationship" aria-label="التسلسل المنطقي غير المكاني">
              {pack.experiencePoints.map((point, index) => (
                <li key={point.experiencePointId} className={point.experiencePointId === selected.experiencePointId ? 'is-selected' : undefined}>
                  <button type="button" onClick={() => onPointChange(point.experiencePointId)} aria-pressed={point.experiencePointId === selected.experiencePointId}>
                    <span>{index + 1}</span>
                    <strong>{point.nameAr}</strong>
                    {sourceLayerVisible ? <small>مرشح · غير مربوط</small> : null}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="vd-layer-hidden-message">طبقة العلاقات المنطقية مخفية. لم تُستبدل بهندسة تجريبية.</p>
          )}

          <div className="vd-canvas-footnote">
            <span>اللوحة الداكنة محصورة داخل مساحة المكان</span>
            <span>لا temporary-demo geometry مستخدمة</span>
          </div>
        </div>

        <aside className="vd-zone-inspector" aria-labelledby="vd-zone-inspector-title">
          <div className="vd-inspector-index">{String(selected.sequence).padStart(2, '0')}</div>
          <p className="vd-overline">المنطقة المحددة</p>
          <h2 id="vd-zone-inspector-title">{selected.nameAr}</h2>
          <p className="vd-zone-description">كيان منطقي مؤكد داخل الحزمة المرشحة، من دون إحداثيات أو مضلع أو سعة أو حالة تشغيلية.</p>

          <dl className="vd-inspector-facts">
            <div>
              <dt>حالة المصدر</dt>
              <dd><span className="vd-truth-marker vd-truth-marker-candidate"><FileClock aria-hidden="true" />مرشح</span></dd>
            </div>
            <div>
              <dt>الربط الهندسي</dt>
              <dd><span className="vd-truth-marker vd-truth-marker-provisional"><CircleDashed aria-hidden="true" />معلّق</span></dd>
            </div>
            <div>
              <dt>المسار</dt>
              <dd>غير معتمد</dd>
            </div>
            <div>
              <dt>المحتوى</dt>
              <dd>{selected.contentStatus === 'partial' ? 'جزئي' : selected.contentStatus === 'missing' ? 'مفقود' : 'غير محسوم'}</dd>
            </div>
          </dl>

          <div className="vd-inspector-callout">
            <MapPinned aria-hidden="true" />
            <p><strong>الموقع غير مثبت على المخطط.</strong> اختيار المنطقة يغيّر سياق المراجعة فقط.</p>
          </div>

          <button data-testid="spatial-technical-details" type="button" className="vd-secondary-action" onClick={onOpenTechnicalDetails}>
            <SlidersHorizontal aria-hidden="true" />إظهار المصدر والمعرّفات
          </button>

          {onOpenSpatialAuthoring ? <button data-testid="spatial-authoring-open" type="button" className="vd-secondary-action" onClick={onOpenSpatialAuthoring}>
            <Map aria-hidden="true" />فتح مواءمة المخطط
          </button> : null}

          <div className="vd-event-color-note" style={{ background: theme.eventTokens.soft.background, color: theme.eventTokens.soft.foreground }}>
            أخضر KAP هنا للهوية فقط، وليس إشارة إلى “متحقق” أو “جاهز”.
          </div>
        </aside>
      </div>
    </section>
  );
}
