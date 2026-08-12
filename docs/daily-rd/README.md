# Daily R&D Workflow

## Purpose

This directory stores focused daily research memos and the Lead Integrator's executive consolidation. It is a decision record, not a feature backlog. Research must not modify production code or imply implementation approval.

## Daily Sequence

1. Each named agent writes one focused memo for the research day.
2. The memo labels evidence, inference, assumptions, proposals, and unverified hypotheses.
3. The Lead Integrator checks overlap, contradictions, roadmap stage, reversibility, and build/buy/partner implications.
4. The Lead Integrator writes one executive consolidation.
5. Ahmed decisions are recorded against the relevant innovation-backlog and build/buy/partner entries.
6. Approved experiments are scoped without expanding the active sprint; unapproved technology remains research-only.

## File Naming

Use:

- `YYYY-MM-DD-<agent-slug>.md` for an individual memo.
- `YYYY-MM-DD-executive-consolidation.md` for the Lead Integrator report.

## Required Agent Memo

Every memo must contain:

- Agent role.
- Date.
- Research topic.
- Global benchmark reviewed.
- Why the topic matters now.
- Evidence.
- Key finding.
- Gap in the current Mayadeen platform.
- Opportunity for differentiation.
- Operational value.
- Technical dependency.
- Risk.
- Simplest alternative.
- Build / buy / partner recommendation.
- Suggested roadmap stage.
- One proposed experiment.
- One decision requiring Ahmed's approval.
- Classification: `Critical now`, `Recommended soon`, `Strategic later`, or `Not recommended`.

## Memo Template

```markdown
# <Research Topic>

## Agent
- Role:
- Date:

## Scope
- Research topic:
- Global benchmark reviewed:
- Why this matters now:

## Findings
- Evidence:
- Inference:
- Assumptions:
- Key finding:
- Current Mayadeen gap:

## Decision Value
- Opportunity for differentiation:
- Primary user:
- Operational problem:
- Decision improved:
- Resulting action:
- Measurable outcome:
- Failure cost:
- Simplest alternative:

## Delivery Judgment
- Technical dependency:
- Build / buy / partner / delay:
- Suggested roadmap stage:
- Reversibility:
- One proposed experiment:
- Stop condition:

## Ahmed Decision
- Decision required:
- Approval status:

## Classification
- Critical now | Recommended soon | Strategic later | Not recommended
```

## Required Executive Consolidation

The Lead Integrator report must contain:

1. Executive summary.
2. Most important global technology reviewed.
3. Strongest opportunity for Mayadeen.
4. Most dangerous assumption.
5. Highest-value recommendation.
6. Technology not recommended and why.
7. Build / buy / partner insight.
8. Decisions requiring Ahmed.
9. Tomorrow's research priorities.
10. Impact on the approved six-stage roadmap.

## Classification Rules

- **Critical now:** A governance or evidence dependency that blocks a current claim or approved decision test.
- **Recommended soon:** A validated or strongly supported improvement that should be researched before the next approved planning decision.
- **Strategic later:** Valuable only after a later roadmap stage or a stronger operational foundation.
- **Not recommended:** Fails the operational-value test, has unacceptable risk, or is weaker than a simpler alternative.

## Baseline Note

The first charter-establishment record is intentionally a governance memo, not a claim that all benchmark categories have been independently researched. Future benchmark claims require cited sources and a focused memo.
