import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEventStoreState, useEventStore } from '../../store/useEventStore';
import { OperatorDecisionFlow } from './OperatorDecisionFlow';
import { PresentationPresetSelector } from './PresentationPresetSelector';
import { TechnicalAdministrationDrawer } from './TechnicalAdministrationDrawer';
import { TruthContextBadge } from './TruthContextBadge';

function resetStore() {
  window.localStorage.clear();
  useEventStore.setState(createInitialEventStoreState());
}

describe('command experience components', () => {
  beforeEach(() => {
    resetStore();
  });

  it('labels truth states in text and never relies only on color', () => {
    render(<TruthContextBadge label="reported" />);
    expect(screen.getByText('مُبلّغ')).toBeVisible();
  });

  it('labels presentation presets as display settings rather than permissions', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PresentationPresetSelector value="operator" onChange={onChange} />);

    await user.click(screen.getByTestId('presentation-preset-executive'));
    expect(onChange).toHaveBeenCalledWith('executive');
    expect(screen.getByText('هذه إعدادات عرض وليست صلاحيات إنتاجية ولا تمنح أو تقيّد الوصول.')).toBeInTheDocument();
  });

  it('keeps technical spaces in an explicit non-permission drawer', () => {
    render(
      <TechnicalAdministrationDrawer
        open
        onClose={vi.fn()}
        onOpenConfiguration={vi.fn()}
        onOpenAuthoring={vi.fn()}
        onOpenIntegration={vi.fn()}
        onOpenIoT={vi.fn()}
        onOpenProjection={vi.fn()}
        onOpenVisualSystem={vi.fn()}
        integrationEnabled
        projectionEnabled
      />
    );

    expect(screen.getByTestId('technical-administration-drawer')).toHaveTextContent('لا يمثل نظام صلاحيات');
    expect(screen.getByTestId('configuration-open')).toBeVisible();
    expect(screen.getByTestId('visual-system-open')).toHaveTextContent('مرجع النظام المرئي');
  });

  it('closes the technical drawer from Escape without changing truth state', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const baselineBefore = structuredClone(useEventStore.getState().baselineEntities);
    render(
      <TechnicalAdministrationDrawer
        open
        onClose={onClose}
        onOpenConfiguration={vi.fn()}
        onOpenAuthoring={vi.fn()}
        onOpenIntegration={vi.fn()}
        onOpenIoT={vi.fn()}
        onOpenProjection={vi.fn()}
        onOpenVisualSystem={vi.fn()}
        integrationEnabled
        projectionEnabled
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useEventStore.getState().baselineEntities).toEqual(baselineBefore);
  });

  it('reveals provenance only on request and does not mutate baseline or verified state', async () => {
    const user = userEvent.setup();
    const baselineBefore = structuredClone(useEventStore.getState().baselineEntities);
    render(<OperatorDecisionFlow entityId="ZONE-001" />);

    expect(screen.queryByTestId('operator-flow-provenance')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('operator-flow-provenance-toggle'));
    expect(screen.getByTestId('operator-flow-provenance')).toBeVisible();
    expect(useEventStore.getState().baselineEntities).toEqual(baselineBefore);
  });
});
