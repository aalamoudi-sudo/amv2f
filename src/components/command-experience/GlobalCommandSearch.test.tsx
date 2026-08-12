import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEventStoreState, useEventStore } from '../../store/useEventStore';
import { GlobalCommandSearch } from './GlobalCommandSearch';

function resetStore() {
  window.localStorage.clear();
  useEventStore.setState(createInitialEventStoreState());
}

describe('global command search', () => {
  beforeEach(() => {
    resetStore();
  });

  it('opens from Ctrl+K, supports keyboard navigation, and synchronizes the selected entity', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<GlobalCommandSearch onNavigate={onNavigate} />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByTestId('global-search-input');
    await user.type(input, 'ZONE-002');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onNavigate).toHaveBeenCalledWith('spatial', undefined);
    expect(useEventStore.getState().selectedEntityId).toBe('ZONE-002');
    expect(screen.queryByTestId('global-search-dialog')).not.toBeInTheDocument();
  });

  it('provides an Arabic-safe empty state without changing the selected event context', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<GlobalCommandSearch onNavigate={onNavigate} />);

    await user.click(screen.getByTestId('global-search-open'));
    await user.type(screen.getByTestId('global-search-input'), 'معرف لا وجود له');

    expect(await screen.findByTestId('global-search-empty')).toHaveTextContent('لا توجد نتيجة ضمن السياق الحالي');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(useEventStore.getState().selectedEntityId).toBe('ZONE-001');
  });

  it('closes from Escape outside the input and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<GlobalCommandSearch onNavigate={vi.fn()} />);

    const trigger = screen.getByTestId('global-search-open');
    await user.click(trigger);
    await user.click(screen.getByTestId('global-search-close'));
    await user.click(trigger);
    await user.tab({ shift: true });
    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('global-search-dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
