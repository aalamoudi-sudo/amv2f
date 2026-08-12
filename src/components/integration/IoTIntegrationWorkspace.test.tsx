import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEventStoreState, useEventStore } from '../../store/useEventStore';
import { IoTIntegrationWorkspace } from './IoTIntegrationWorkspace';

class LocalEventSourceMock {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  addEventListener(): void {}
  close(): void {}
}

describe('Stage 3F.1 IoT source selection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEventStore.setState(createInitialEventStoreState());
    vi.stubGlobal('EventSource', LocalEventSourceMock);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('gateway unavailable')));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps the selected local gateway isolated when it becomes unavailable and never falls back to simulation', async () => {
    const user = userEvent.setup();
    render(<IoTIntegrationWorkspace />);
    await user.click(screen.getByTestId('iot-source-gateway'));

    await waitFor(() => expect(screen.getByTestId('iot-gateway-unavailable')).toHaveTextContent('البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة'));
    expect(screen.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'http-sse');
    expect(screen.queryByTestId('iot-local-only-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('iot-data-source-selector')).toHaveAttribute('dir', 'rtl');
  });

  it('only returns to simulation after an explicit operator choice', async () => {
    const user = userEvent.setup();
    render(<IoTIntegrationWorkspace />);
    await user.click(screen.getByTestId('iot-source-gateway'));
    await waitFor(() => expect(screen.getByTestId('iot-gateway-unavailable')).toBeVisible());
    await user.click(screen.getByTestId('iot-source-simulator'));
    await waitFor(() => expect(screen.getByTestId('iot-local-only-label')).toBeVisible());
    expect(screen.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'none');
  });

  it('uses the shared entity selection without mixing the simulator and gateway sources', async () => {
    const user = userEvent.setup();
    render(<IoTIntegrationWorkspace />);

    await waitFor(() => expect(screen.getByTestId('iot-device-DEVICE-IOT-ENV-001')).toBeVisible());
    act(() => useEventStore.getState().selectEntity('ZONE-002'));
    await waitFor(() => expect(screen.getByTestId('iot-spatial-link')).toHaveAttribute('data-entity-id', 'ZONE-002'));

    await user.click(screen.getByTestId('iot-device-DEVICE-IOT-DISABLED-001'));
    expect(useEventStore.getState().selectedEntityId).toBe(screen.getByTestId('iot-spatial-link').getAttribute('data-entity-id'));
    expect(screen.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'none');
  });

  it('shows the Stage 3F.2 readiness banner without claiming a live source', () => {
    render(<IoTIntegrationWorkspace />);
    expect(screen.getByTestId('stage-3f2-status-banner')).toHaveTextContent('STAGE_3F2_STATUS=READY_FOR_REAL_SOURCE');
    expect(screen.getByTestId('stage-3f2-status-banner')).toHaveTextContent('القالب الآمن فقط');
  });
});
