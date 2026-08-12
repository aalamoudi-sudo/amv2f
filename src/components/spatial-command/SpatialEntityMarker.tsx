import { AlertTriangle, CircleHelp } from 'lucide-react';
import { forwardRef, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { CandidateSpatialEntity } from '../../types/sourceIntake';

export const SpatialEntityMarker = forwardRef<HTMLButtonElement, {
  entity: CandidateSpatialEntity;
  selected: boolean;
  emphasized: boolean;
  dimmed: boolean;
  journeyActive: boolean;
  groupIndex: number;
  offsetX: number;
  offsetY: number;
  markerScale: number;
  labelVisible: boolean;
  clusterId: string | null;
  clusterSummarized: boolean;
  independent: boolean;
  editing: boolean;
  onSelect: () => void;
  onNavigate: (direction: 1 | -1 | 'first' | 'last') => void;
  onAnchorDragStart: () => void;
  onAnchorDragPreview: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onAnchorDragCommit: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}>(function SpatialEntityMarker({
  entity,
  selected,
  emphasized,
  dimmed,
  journeyActive,
  groupIndex,
  offsetX,
  offsetY,
  markerScale,
  labelVisible,
  clusterId,
  clusterSummarized,
  independent,
  editing,
  onSelect,
  onNavigate,
  onAnchorDragStart,
  onAnchorDragPreview,
  onAnchorDragCommit
}, ref) {
  const activePointerId = useRef<number | null>(null);
  if (!entity.normalizedAnchor) return null;
  const groupColors = ['#376f45', '#4d6685', '#7b648e', '#3a8690', '#9b7230', '#77716e'];
  const markerColor = independent
    ? '#9b7230'
    : entity.mappingStatus === 'conflicted'
    ? '#a84235'
    : entity.mappingStatus === 'unresolved'
      ? '#77716e'
      : groupColors[groupIndex >= 0 ? groupIndex % groupColors.length : groupColors.length - 1];
  const stateLabel = independent
    ? 'مستقل'
    : entity.mappingStatus === 'conflicted'
      ? 'متعارض'
      : entity.mappingStatus === 'unresolved'
        ? 'غير محسوم'
        : 'مرشح';
  return (
    <button
      ref={ref}
      data-testid={`spatial-command-marker-${entity.sourceNumber}`}
      data-candidate-id={entity.candidateId}
      data-cluster-id={clusterId ?? undefined}
      data-pointer-interactive={clusterSummarized ? 'false' : 'true'}
      type="button"
      disabled={clusterSummarized}
      tabIndex={clusterSummarized ? -1 : 0}
      aria-hidden={clusterSummarized || undefined}
      className={[
        'sc-marker',
        independent ? 'is-independent' : `is-${entity.mappingStatus}`,
        editing ? 'is-editable' : '',
        clusterSummarized ? 'is-cluster-summarized' : '',
        labelVisible ? 'is-label-visible' : '',
        selected ? 'is-selected' : '',
        emphasized ? 'is-emphasized' : '',
        dimmed ? 'is-dimmed' : '',
        journeyActive ? 'is-journey-active' : ''
      ].filter(Boolean).join(' ')}
      style={{
        '--marker-x': `${entity.normalizedAnchor.x * 100}%`,
        '--marker-y': `${entity.normalizedAnchor.y * 100}%`,
        '--marker-offset-x': `${offsetX}px`,
        '--marker-offset-y': `${offsetY}px`,
        '--marker-scale': markerScale,
        '--marker-group': groupIndex,
        '--marker-color': markerColor
      } as React.CSSProperties}
      aria-label={`${entity.sourceNumber}. ${entity.labelAr}، كيان مكاني ${stateLabel}`}
      aria-pressed={selected}
      onClick={() => {
        if (!clusterSummarized) onSelect();
      }}
      onPointerDown={(event) => {
        if (!editing || clusterSummarized) return;
        event.preventDefault();
        event.stopPropagation();
        activePointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect();
        onAnchorDragStart();
      }}
      onPointerMove={(event) => {
        if (!editing || activePointerId.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        onAnchorDragPreview(event);
      }}
      onPointerUp={(event) => {
        if (!editing || activePointerId.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        activePointerId.current = null;
        onAnchorDragCommit(event);
      }}
      onPointerCancel={(event) => {
        if (!editing || activePointerId.current !== event.pointerId) return;
        activePointerId.current = null;
        onAnchorDragCommit(event);
      }}
      onLostPointerCapture={(event) => {
        if (!editing || activePointerId.current !== event.pointerId) return;
        activePointerId.current = null;
        onAnchorDragCommit(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          onNavigate(1);
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          onNavigate(-1);
        }
        if (event.key === 'Home') {
          event.preventDefault();
          onNavigate('first');
        }
        if (event.key === 'End') {
          event.preventDefault();
          onNavigate('last');
        }
      }}
    >
      <span>{entity.sourceNumber}</span>
      <strong>{entity.labelAr}</strong>
      {!independent && entity.mappingStatus === 'conflicted'
        ? <AlertTriangle aria-hidden="true" />
        : !independent && entity.mappingStatus === 'unresolved'
          ? <CircleHelp aria-hidden="true" />
          : null}
    </button>
  );
});
