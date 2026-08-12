import type { Config } from 'tailwindcss';

const semantic = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'IBM Plex Sans Arabic',
          'Tajawal',
          'Noto Sans Arabic',
          'system-ui',
          'sans-serif'
        ]
      },
      colors: {
        command: {
          bg: semantic('--md-canvas'),
          canvas: semantic('--md-canvas'),
          panel: semantic('--md-surface-1'),
          panelStrong: semantic('--md-surface-2'),
          surface3: semantic('--md-surface-3'),
          line: semantic('--md-border-subtle'),
          borderStrong: semantic('--md-border-strong'),
          text: semantic('--md-text-primary'),
          muted: semantic('--md-text-secondary'),
          quiet: semantic('--md-text-muted'),
          inverse: semantic('--md-text-inverse'),
          accent: semantic('--md-brand-primary'),
          accentHover: semantic('--md-brand-hover'),
          accentPressed: semantic('--md-brand-pressed'),
          focus: semantic('--md-focus-ring'),
          amber: semantic('--md-severity-attention'),
          red: semantic('--md-severity-critical'),
          blue: semantic('--md-spatial-primary'),
          truth: {
            verified: semantic('--md-truth-verified'),
            reported: semantic('--md-truth-reported'),
            candidate: semantic('--md-truth-candidate'),
            scenario: semantic('--md-truth-scenario'),
            unknown: semantic('--md-truth-unknown')
          },
          severity: {
            normal: semantic('--md-severity-normal'),
            attention: semantic('--md-severity-attention'),
            critical: semantic('--md-severity-critical'),
            blocked: semantic('--md-severity-blocked'),
            information: semantic('--md-severity-information')
          }
        }
      },
      boxShadow: {
        command: '0 18px 50px rgba(0, 0, 0, 0.22)',
        elevated: '0 12px 30px rgba(0, 0, 0, 0.18)'
      }
    }
  },
  plugins: []
} satisfies Config;
