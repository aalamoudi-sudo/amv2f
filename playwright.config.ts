import { defineConfig, devices } from '@playwright/test';

const node = JSON.stringify(process.execPath);
const lightweightArtifacts = process.env.PLAYWRIGHT_LIGHTWEIGHT_ARTIFACTS === '1';
const externalBaseUrl = process.env.KAGA_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    colorScheme: 'dark',
    // Explicit review screenshots still run in lightweight mode; only
    // Playwright's automatic failure recording is disabled for constrained labs.
    trace: lightweightArtifacts ? 'off' : 'on-first-retry',
    screenshot: lightweightArtifacts ? 'off' : 'only-on-failure',
    video: lightweightArtifacts ? 'off' : 'retain-on-failure'
  },
  webServer: externalBaseUrl ? undefined : {
    // Use the active Node binary so the local preview server does not depend on
    // a package-manager wrapper preserving PATH in desktop test environments.
    command: `${node} ./node_modules/tsx/dist/cli.mjs scripts/prepare-ex1c-technical-fixtures.ts && ${node} ./node_modules/typescript/bin/tsc -b && ${node} ./node_modules/vite/bin/vite.js build && ${node} ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173`,
    cwd: process.cwd(),
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 240_000
  },
  projects: [
    {
      name: 'chromium-1920x1080',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1
      }
    },
    {
      name: 'chromium-2560x1080',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1080 },
        deviceScaleFactor: 1
      }
    },
    {
      name: 'chromium-1366x768',
      testMatch: ['**/stage-ux1-command-experience.spec.ts', '**/stage-ux1-visual-review.spec.ts', '**/stage-ux1a-command-visual-system.spec.ts', '**/stage-ux1a-visual-review.spec.ts', '**/stage-ux1b-visual-direction.spec.ts', '**/stage-ux1b-visual-review.spec.ts', '**/stage-ux1c-project-portfolio.spec.ts', '**/stage-ux1c-visual-review.spec.ts', '**/stage3e4-kap-spatial-authoring.spec.ts', '**/stage3e4-visual-review.spec.ts', '**/stage3e4a-kap-candidate-spatial-intake.spec.ts', '**/stage3e4a-visual-review.spec.ts', '**/stage3e4b-spatial-command-experience.spec.ts', '**/stage3e4b-visual-review.spec.ts', '**/stage3e4c-founder-spatial-truth-map-control.spec.ts', '**/stage3e4c-visual-review.spec.ts', '**/stage3f2-source-readiness.spec.ts', '**/stage3g0-evidence-derived-readiness-command.spec.ts', '**/stage3g0-visual-review.spec.ts', '**/stage3g0a-founder-interaction-density.spec.ts', '**/stage3g0a-visual-review.spec.ts', '**/stage3g1-kap-operational-readiness-pack.spec.ts', '**/stage3g1-visual-review.spec.ts', '**/stage3g1a-readiness-pack-integrity.spec.ts', '**/stage3g1a-visual-review.spec.ts', '**/stage3g1b-authority-contract-integrity.spec.ts', '**/stage3g1b-visual-review.spec.ts', '**/stage3g1c-authority-waiver-trigger-integrity.spec.ts', '**/stage3g1c-visual-review.spec.ts', '**/stage3g1d-local-trust-root-custody.spec.ts', '**/stage3g1d-visual-review.spec.ts', '**/stage3g1e-authority-source-revision-custody.spec.ts', '**/stage3g1e-visual-review.spec.ts', '**/stage-ex1a-additive-experience-twin.spec.ts', '**/stage-ex1b-interactive-story-map.spec.ts', '**/stage-ex1c-truth-governed-scenes.spec.ts', '**/stage-ex1d-four-day-digital-rehearsal.spec.ts', '**/stage-ex1f-final-integrated-experience-twin.spec.ts', '**/stage-ex1f-wave-a1-visual-hierarchy.spec.ts', '**/stage-ex1f-delivery-accelerator.spec.ts', '**/stage-ex1f-wave-c1-design-web3d.spec.ts', '**/stage-ex1f-wave-c1-visual-review.spec.ts', '**/stage-ex1f-wave-bc-convergence.spec.ts', '**/mission-canvas-living-reveal.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1
      }
    },
    {
      name: 'chromium-1440x900-kaga-final',
      testMatch: ['**/kaga-final-production.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1
      }
    }
  ]
});
