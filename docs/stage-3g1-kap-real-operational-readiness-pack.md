# Stage 3G.1: KAP Real Operational Readiness Pack

## Delivery Status

- Target status: `READY_FOR_FOUNDER_STAGE_3G1C_REVIEW`.
- Starting main: `ef9a5c2ebd5913e7d0f54c6f5caf363081b4902c`.
- Feature branch: `codex/stage-3g1-kap-real-operational-readiness-pack`.
- Pack ID: `READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1`.
- Pack revision: `1`.
- Pack fingerprint:
  `78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc`.
- Authority policy: `AUTHORITY-REQUIREMENT-POLICY-v1`.
- Authority trigger policy: `AUTHORITY-TRIGGER-POLICY-v1`.
- Authority trigger fingerprint:
  `49c4ff2a7b75b236f549e68e5e5f73934589e03b917edb2404694d409562d937`.
- Source-registry fingerprint:
  `9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97`.
- Source-trace fingerprint:
  `900cd8a205b170e4893fb2a938a98628925a504dfb13b20ee045131b3f7d5530`.
- Pack status: `candidate`.
- Operational readiness: `cannot-determine`.

This stage creates a governed KAP readiness-pack candidate. It does not approve
KAP operational readiness, activate a baseline, or authorize Stage 4.

## Source Intake

The source files were fingerprinted before extraction:

| Source | Size | SHA-256 | Result |
| --- | ---: | --- | --- |
| Governance PPTX | 6,403,790 | `8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb` | Matches the registered source |
| Working CAD DWG | 99,452,545 | `a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d` | Matches the registered working source |
| Employee reference XLSX | 15,661 | `fac606e4517e8d6e2f070dab4582d980b932c8eca2d9f5a0f3ea0fb18a746aec` | First registered observation |

The deterministic extractor reads PPTX slide, shape, table, and row structure,
and only the approved XLSX name and role cells. Two runs over identical bytes
produce extraction fingerprint
`f675a2e608690274aff804dd005b9acb8960d293c89db24e62d0044e47798813`.
Raw binaries, exported source pages, contact details, and unrelated HR rows
remain outside Git and browser fixtures.

## Candidate Content

The pack contains:

- 24 requirements in total.
- 18 requirements in the proposed legal denominator.
- 15 `source-backed` requirements.
- 2 `founder-directed` requirements.
- 1 `conflicting` requirement.
- 3 `template-proposed` requirements, excluded from the legal denominator.
- 3 `missing` requirements, excluded until a source or authority adopts them.
- 10 source-backed workstreams.
- 11 existing KAP candidate operational entities.
- 5 existing experience objects, unchanged.

Founder-directed assignments are recorded separately from source-backed
authority:

- ماجد قاسم: operations workstream.
- إبراهيم الغمري: creative-content workstream.
- محمد إبراهيم: project actor reference only.

The execution workstream remains conflicted because the approved deck identifies
محمد إبراهيم in the organization view and جوزيف حداد in the workstream table.
Neither is selected automatically.

Four additional source-traced governance conflicts remain unresolved:
multiple responsible parties in RACI usage, overlapping escalation timing,
approval-scope ambiguity, and the ambiguous project-manager role. Eight
governance gaps remain explicit and are never inferred as resolved.

## Truth Boundary

Pack preparation and operational readiness are independent:

- Preparation completeness is `61.7%` under
  `READINESS-PACK-PREPARATION-v1`.
- Operational readiness remains `cannot-determine`.
- Unknown is not zero.
- There are no eligible field assessments, verified evidence records, formal
  operational approvals, or opening decisions.
- A source-backed requirement is not proof of completion.
- A named person is not automatically a verifier or approver.
- Deliverable approval is not HSE, engineering, route, client operational
  acceptance, or opening authority.
- Candidate spatial anchors do not establish approved geometry or completion.
- Decision drafts do not change readiness, pack activation, or baseline.
- Stored `missing*`, conflict, gap, and gate arrays are diagnostics only.
  Runtime validation recomputes them from canonical requirements, policies,
  authorities, traces, spatial relationships, and governance assertions.
- Authority obligations are derived from the platform policy. The manifest
  cannot delete a kind, alias several kinds to one slot, or replace an
  explicit authorized non-applicability declaration with absence.
- Conditional authority applicability is derived from typed, revisioned
  trigger facts. A required or actively triggered authority cannot be waived.
- Trigger facts are accepted only against the committed external revision
  anchor; the candidate manifest cannot rewrite its own trigger baseline.
- A waiver must resolve to an assigned canonical resolver authority, verified
  legal evidence, matching provenance and scope, valid chronology, and valid
  separation of duties. KAP currently has none of these waiver inputs.
- The lifecycle is `candidate -> review -> frozen-candidate ->
  activated-baseline`. Every transition creates a new immutable revision.
- Even a valid activated requirements baseline remains `cannot-determine`
  until a future authorized evidence-assessment engine evaluates it.

## Product Result

The Arabic RTL workspace `إعداد حزمة الجاهزية التشغيلية` provides:

- An executive summary separating preparation from readiness.
- Source fingerprints, authority limits, and exact locators.
- Workstream and authority matrices.
- Requirement search, filtering, details, evidence rules, and dependencies.
- Candidate-only editing with validation, immutable revisions, diff, and
  rollback.
- Evidence, verification, approval, and external-acceptance contracts.
- Existing spatial-object highlighting with no fallback marker.
- Separate pre-freeze and pre-activation gates with exact failure reasons and
  accepted next actions.
- Typed trigger counts and fail-closed waiver resolver, evidence, and
  chronology status.
- Explicit state-tampering and source-lineage rejection without fallback.
- Local Decision drafts that preserve context but mutate no legal truth.
- A technical drawer for hashes, IDs, and extraction details.

## Architecture

Generic contracts and deterministic services live in `src/types` and
`src/services`. KAP data lives in manifests and runtime configuration.
`OperationalReadinessPack` contains no KAP-specific branch.

The local revision store deep-freezes caller-independent canonical snapshots.
It is a replaceable authoring adapter, not a legal audit repository. A future
repository may persist the same immutable revisions and events without
changing the pack, eligibility, preparation, or UI contracts.

The fictional non-KAP conference fixture proves the engine can validate and
derive a different event package without KAP-specific Core logic.

## Excluded Scope

This stage adds no AI, prediction, simulation, live IoT, external integration,
device control, production identity, automatic approval, engineering geometry,
operational baseline, or Stage 4 capability.
