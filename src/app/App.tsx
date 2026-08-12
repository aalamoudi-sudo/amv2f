import { useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AppShell } from './AppShell';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useScenarioRunner } from '../hooks/useScenarioRunner';
import { KagaExperience } from '../features/kaga/KagaExperience';

export function App() {
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'مَيادين | واجهة القرار المكاني';
  }, []);

  const showKagaExperience = import.meta.env.VITE_KAGA_EXECUTIVE === 'true' || window.location.pathname.startsWith('/kaga');

  return (
    <ErrorBoundary>
      {showKagaExperience ? <KagaExperience /> : <PlatformApp />}
    </ErrorBoundary>
  );
}

function PlatformApp() {
  useScenarioRunner();
  useKeyboardShortcuts();
  return <AppShell />;
}
