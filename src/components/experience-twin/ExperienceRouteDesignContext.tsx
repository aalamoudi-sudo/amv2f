import { AlertTriangle, Box, CheckCircle2, ChevronDown, Clock3, FileCheck2, Route, ShieldAlert } from 'lucide-react';
import type { RouteDesignConvergenceProjection } from '../../services/experienceRouteDesignConvergence';

interface ExperienceRouteDesignContextProps {
  projection: RouteDesignConvergenceProjection;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectJourney: (journeyId: string) => void;
  onSelectWaypoint: (waypointId: string) => void;
  onOpenDesignScene: () => void;
}

export function ExperienceRouteDesignContext({ projection, expanded, onExpandedChange, onSelectJourney, onSelectWaypoint, onOpenDesignScene }: ExperienceRouteDesignContextProps) {
  if (projection.status === 'journey-not-applicable') {
    return <aside className="experience-route-design-context is-not-applicable" data-testid="route-design-context-not-applicable"><CheckCircle2 /><div><span>حقيقة اليوم</span><strong>لا تنطبق رحلة تشغيلية مشتركة</strong><small>{projection.truthLabelAr} · {projection.messageAr}</small></div></aside>;
  }
  if (projection.status === 'package-unavailable' || projection.status === 'no-compatible-candidate' || projection.status === 'candidate-not-selected') {
    return <aside className="experience-route-design-context is-safe-empty" data-testid="route-design-context-safe-empty"><ShieldAlert /><div><span>سياق الرحلة</span><strong>{projection.truthLabelAr}</strong><small>{projection.messageAr}</small></div></aside>;
  }
  const { journey, waypoint } = projection;
  if (!journey) return null;
  return (
    <aside className={`experience-route-design-context ${expanded ? 'is-expanded' : ''}`} data-testid="route-design-context" data-route-geometry="none">
      <header>
        <Route />
        <div><span>V.11 · رحلة تشغيلية مرشحة</span><strong>{journey.labelAr}</strong><small>{waypoint?.sourceLabelAr ?? 'اختر محطة من التسلسل'}</small></div>
        <button type="button" aria-expanded={expanded} aria-label={expanded ? 'طي سياق الرحلة المرشحة' : 'توسيع سياق الرحلة المرشحة'} onClick={() => onExpandedChange(!expanded)}><ChevronDown /></button>
      </header>
      <div className="experience-route-design-summary">
        <label><span>الرحلة</span><select data-testid="route-design-journey-select" value={journey.journeyId} onChange={(event) => onSelectJourney(event.target.value)}>{projection.availableJourneys.map((item) => <option key={item.journeyId} value={item.journeyId}>{item.labelAr}</option>)}</select></label>
        <i><Clock3 /><b>{journey.reportedTotalMinutes} دقيقة</b><small>{journey.reportedWindow.start}–{journey.reportedWindow.end} · شامل الحركة</small></i>
        <i><Route /><b>{projection.movementLabelAr}</b><small>لا سرعة أو مسار معتمد</small></i>
      </div>
      {expanded ? <>
        <div className="experience-route-design-waypoints" aria-label="محطات الرحلة المرشحة">{journey.waypoints.map((item) => <button key={item.waypointId} type="button" data-testid={`route-waypoint-${item.waypointId}`} aria-current={waypoint?.waypointId === item.waypointId ? 'step' : undefined} onClick={() => onSelectWaypoint(item.waypointId)}><i>{item.sourceLetter}</i><span>{item.sourceLabelAr}</span><small>{item.dwellMinutes === null ? 'مدة غير مذكورة' : `${item.dwellMinutes} د`}</small></button>)}</div>
        <section className="experience-route-design-detail">
          <div><span>المحطة الحالية</span><strong>{waypoint?.sourceLabelAr ?? 'غير محددة'}</strong><small>{waypoint ? `${waypoint.semanticKind} · ${waypoint.destinationMappingStatus}` : 'لا توجد محطة صالحة'}</small></div>
          <div><span>المصدر</span><strong>{projection.sourceLabelAr}</strong><small>{projection.truthLabelAr}</small></div>
          <div><span>التعارضات المفتوحة</span><strong>{projection.activeConflictLabelsAr.length || 'لا تعارض زمني نشط'}</strong><small>{projection.activeConflictLabelsAr.join(' · ') || 'لا يعني ذلك اعتماد الرحلة.'}</small></div>
          <div><span>الاعتمادات المفقودة</span><strong>{projection.missingApprovalLabelsAr.length}</strong><small>{projection.missingApprovalLabelsAr.join(' · ')}</small></div>
        </section>
        <footer>
          <p><AlertTriangle />{projection.messageAr}</p>
          {projection.mayOpenDesignScene ? <button data-testid="route-design-open-scene" type="button" onClick={onOpenDesignScene}><Box />فتح مشهد التصميم المرتبط <small>{projection.designRelation?.status} / {projection.designRelation?.confidence}</small></button> : <span><FileCheck2 />لا توجد علاقة مشهد صريحة لهذه المحطة</span>}
        </footer>
      </> : null}
    </aside>
  );
}

export default ExperienceRouteDesignContext;
