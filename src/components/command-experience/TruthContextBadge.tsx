import { truthLabels, truthTone, type TruthLabel } from '../../ux/truthVocabulary';

export function TruthContextBadge({
  label,
  className = '',
  testId
}: {
  label: TruthLabel;
  className?: string;
  testId?: string;
}) {
  return (
    <span data-testid={testId} className={`truth-badge ${truthTone[label]} ${className}`}>
      <span aria-hidden="true" className="truth-badge-dot" />
      {truthLabels[label]}
    </span>
  );
}
