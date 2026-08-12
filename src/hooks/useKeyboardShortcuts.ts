import { useEffect } from 'react';
import { useEventStore } from '../store/useEventStore';

export function useKeyboardShortcuts(): void {
  const isProjectionMode = useEventStore((state) => state.isProjectionMode);
  const exitProjectionMode = useEventStore((state) => state.exitProjectionMode);
  const clearError = useEventStore((state) => state.clearError);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isProjectionMode) {
        exitProjectionMode();
      }

      clearError();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearError, exitProjectionMode, isProjectionMode]);
}
