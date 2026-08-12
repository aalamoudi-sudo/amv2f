import { findExperienceDeliveryReadinessProjection, findFourDayExperienceTruthProjection } from '../../data/experienceReviewProjections';
import { findExperienceDeliveryControlCenterProjection } from '../../data/experienceDeliveryAcceleratorFixtures';
import type { ExperienceMapMode, ExperienceReviewMode, ExperienceSelectionContext } from '../../types/experienceTwin';
import ExperienceIntegratedReview, { type ExperienceReviewActiveContext } from './ExperienceIntegratedReview';

interface ExperienceIntegratedReviewEntryProps {
  projectLabelAr: string;
  activeContext: ExperienceReviewActiveContext;
  selection: ExperienceSelectionContext;
  onReviewModeChange: (mode: ExperienceReviewMode) => void;
  onPresentationPauseChange: (paused: boolean) => void;
  onApplyPresentationStep: (input: { presentationStep: number; dayId: string | null; entityId: string | null; mapMode: ExperienceMapMode | null }) => void;
  onSelectDay: (dayId: string) => void;
  onSelectEntity: (entityId: string) => void;
  onStartJourney: () => void;
  onOpenDesignScene: () => void;
  designSceneAvailable: boolean;
  heroPreviewUri: string | null;
  heroPreviewAvailable: boolean;
}

export function ExperienceIntegratedReviewEntry(props: ExperienceIntegratedReviewEntryProps) {
  const projection = findFourDayExperienceTruthProjection(props.selection.projectId, props.selection.eventId, props.selection.venueId);
  const deliveryReadiness = findExperienceDeliveryReadinessProjection(props.selection.projectId, props.selection.eventId, props.selection.venueId);
  const deliveryControl = findExperienceDeliveryControlCenterProjection(props.selection.projectId, props.selection.eventId, props.selection.venueId);
  if (!projection || !deliveryReadiness || !deliveryControl) return null;
  return <ExperienceIntegratedReview projection={projection} deliveryReadiness={deliveryReadiness} deliveryControl={deliveryControl} {...props} />;
}
