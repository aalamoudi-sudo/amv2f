import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tailwind.css';

const RootApplication = import.meta.env.VITE_KAGA_V2 === 'true'
  ? lazy(() => import('./features/kaga/v2/KagaV2Experience').then((module) => ({ default: module.KagaV2Experience })))
  : import.meta.env.VITE_KAGA_EXECUTIVE === 'true'
    ? lazy(() => import('./features/kaga/KagaExperience').then((module) => ({ default: module.KagaExperience })))
  : lazy(() => import('./app/App').then((module) => ({ default: module.App })));

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Suspense fallback={<div role="status" aria-label="جارٍ تحميل التجربة" />}>
      <RootApplication />
    </Suspense>
  </React.StrictMode>
);
