# KAP Readiness Pack Preparation Model

## Model Identity

- Model: `READINESS-PACK-PREPARATION-v1`.
- Pack: `READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1`.
- Revision: `1`.
- Pack fingerprint:
  `78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc`.
- Authority requirement policy: `AUTHORITY-REQUIREMENT-POLICY-v1`.
- Authority trigger policy: `AUTHORITY-TRIGGER-POLICY-v1`.
- Authority trigger fingerprint:
  `49c4ff2a7b75b236f549e68e5e5f73934589e03b917edb2404694d409562d937`.
- Proposed legal denominator: 18 requirements.
- Overall preparation completeness: `61.7%`.
- Operational readiness: `cannot-determine`.

The overall value is the mean of the ten percentage coverage metrics below.
Count diagnostics are displayed separately and are never averaged as
percentages.

## Coverage

| Metric | Numerator | Denominator | Result |
| --- | ---: | ---: | ---: |
| Source coverage | 18 | 18 | 100.0% |
| Workstream coverage | 18 | 18 | 100.0% |
| Owner coverage | 16 | 18 | 88.9% |
| Responsible-party coverage | 16 | 18 | 88.9% |
| Verification-authority coverage | 7 | 18 | 38.9% |
| Approval-authority coverage | 5 | 18 | 27.8% |
| External-acceptance coverage | 4 | 18 | 22.2% |
| Evidence-rule coverage | 5 | 18 | 27.8% |
| Spatial-scope coverage | 4 | 18 | 22.2% |
| Dependency coverage | 18 | 18 | 100.0% |

Diagnostics:

- Open conflicts: 5.
- Missing critical fields: 35 field occurrences across requirements and
  authorities.

## Denominator Policy

Included active classifications:

- `source-backed`: 15.
- `founder-directed`: 2.
- `conflicting`: 1.

Excluded:

- `template-proposed`: 3.
- `missing`: 3.
- `superseded`: 0.

An excluded item remains visible. It cannot enter the legal denominator until
an authorized revision changes its classification with source or authority
evidence.

## Transparency

Every metric snapshot stores:

- Numerator and denominator.
- Included item IDs.
- Excluded item IDs.
- Formula version.
- Arabic explanation.
- An explicit statement that the result is not operational readiness.

No metric accepts manual percentage input. The same canonical pack produces
the same values.

All diagnostic arrays are recomputed from canonical requirements, policies,
source traces, spatial relationships, governance assertions, and configured
authority slots. Stored arrays are checked projections only. Emptying or
falsifying them cannot improve the metric or pass an eligibility gate.

The nine authority obligations are derived independently from the manifest.
`requiredAuthorities` must exactly project the policy contract. The KAP pack
has all nine declarations but zero valid assignments, so the Stage 3G.1B
correction changes neither the `61.7%` preparation metric nor the existing
15 pre-freeze and 5 pre-activation blocker counts.

Stage 3G.1C adds 72 deterministic trigger facts across the 18 legal
requirements and four conditional authority kinds. Ten facts are active:
four client-acceptance, four engineering, one HSE, and one route trigger.
Required or triggered authorities cannot be waived. This typed projection
does not enter the preparation-percentage formula and therefore does not
change `61.7%`.
Its legal validation is bound to an external revision anchor in the committed
catalog, so regenerating the projection and content hash inside the manifest
cannot replace the trusted trigger baseline.

## Readiness Boundary

Preparation completeness describes how completely the pack has been defined.
It does not describe site completion, safety, evidence validity, approval, or
opening suitability. Until every eligibility gate passes and the pack is
frozen and activated by an authorized actor, operational readiness remains
unknown rather than zero.
