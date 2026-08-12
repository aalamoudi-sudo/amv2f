import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runtimeConsumers = [
  '../components/decisions/DecisionCenter.tsx',
  '../components/readiness/ReadinessWorkspace.tsx',
  '../components/validation/OperationalValidationWorkspace.tsx',
  '../components/integration/OperationalCaptureLab.tsx',
  '../components/scenario-player/ScenarioControls.tsx',
  '../hooks/useScenarioRunner.ts',
  '../components/executive-dashboard/OperationalSnapshot.tsx',
  '../three/scene/EventSceneViewport.tsx',
  '../three/projection/ProjectionToolbar.tsx'
];

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('active runtime anti-hardcoding boundary', () => {
  it('keeps fallback event, venue, route, and scenario fixtures outside operational consumers', () => {
    for (const path of runtimeConsumers) {
      const content = source(path);
      expect(content, `${path} imported the fallback route catalog`).not.toMatch(/data\/routes/);
      expect(content, `${path} imported fallback scenario definitions`).not.toMatch(/data\/scenarios/);
      expect(content, `${path} embedded the legacy event identity`).not.toContain('EVENT-DEMO-001');
      expect(content, `${path} embedded the legacy venue identity`).not.toContain('VENUE-DEMO-001');
    }
  });

  it('keeps all three reference package identities out of generic runtime consumers', () => {
    const forbidden = ['EVENT-EXHIBITION', 'EVENT-CONFERENCE', 'EVENT-FESTIVAL', 'VENUE-EXHIBITION', 'VENUE-CONFERENCE', 'VENUE-FESTIVAL'];
    const combined = runtimeConsumers.map(source).join('\n');
    forbidden.forEach((term) => expect(combined).not.toContain(term));
  });
});
