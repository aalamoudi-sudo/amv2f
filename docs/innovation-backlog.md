# Innovation Backlog

## Governance

This backlog is a research register, not an implementation plan. Every item remains unapproved until Ahmed explicitly authorizes a technical experiment or implementation. Items are grouped by strategic priority, not by the order in which they should be built during the current sprint.

Evidence levels:

- **Evidence:** Supported by current Mayadeen documentation or a measured test.
- **Inference:** A reasoned opportunity that still needs validation.
- **Hypothesis:** Requires a focused experiment.
- **Proposal:** Future direction without a current implementation commitment.

## 1. Critical Foundation

| Idea | Problem / user / decision | Value | Dependency | Risk | Stage | Evidence level | Ahmed approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Event Ontology contract | Disconnected spatial entities do not yet express shared event objects and actions. User: CTO and operations leads. Decision: which object/action vocabulary should anchor an event? | A reusable operational language and less future rebuild risk. | Stable IDs, baseline/scenario/demo separation, owner/source/evidence semantics. | A generic enterprise ontology creates complexity without improving a decision. | 3 | Build contract first; integrate later | Inference from current spatial/data model | Not approved |
| Provenance and approval contract | Readiness, status, risk, capacity, and route values lack source, owner, evidence, confidence, and approval context. User: shift leader and quality lead. Decision: can a displayed claim be trusted and acted on? | Prevents unsupported operational claims and enables accountable use. | Agreed field criticality, authority model, evidence types, revision policy. | False confidence or an approval model that operators bypass. | 3-5 | Build minimum contract; no backend now | Evidence: current data-model and operations-review gaps | Not approved |
| 2D/3D decision benchmark | It is unproven when 3D adds value over a 2D plan, list, or checklist. User: operator and shift leader. Decision: which view should be used for a canonical task? | Measures decision time, accuracy, comprehension, and cognitive load before adding complexity. | One real event decision, approved 2D reference, task script, operator participants. | Biased test design or measuring presentation preference instead of operational outcome. | 1-2 | Build a research protocol; no product expansion | Hypothesis | Not approved |

## 2. Near-Term Differentiation

| Idea | Problem / user / decision | Value | Dependency | Risk | Stage | Evidence level | Ahmed approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Spatial Decision Graph | A decision is not currently connected to location, dependencies, people, evidence, risk, and impact. User: command-center lead. Decision: what is affected and who must act? | Makes spatial context operational rather than decorative. | Event Ontology, decision owner, evidence contract, relationships. | Graph becomes a visual novelty with no action or closure. | 3-5 | Build core domain contract | Proposal | Not approved |
| Scenario-to-Action contract | Current scenarios sequence attention but do not create accountable actions. User: exercise facilitator and shift leader. Decision: what action follows an approved scenario outcome? | Bridges exercise learning to operations without calling scripted playback simulation. | Scenario state separation, approval, owner, SLA, evidence, closure. | Exercise output is treated as a live instruction without approval. | 4-5 | Build contract; durable workflow later | Inference from current scenario review | Not approved |
| Route Approval Pack | Temporary route points cannot support safety, capacity, accessibility, or authority claims. User: HSE, security, crowd, and logistics leads. Decision: may this route be briefed or activated? | Establishes route trust and clear authority before operational use. | Geometry source/version, direction, capacity, accessibility, authority, evidence, review date. | An outdated route or missing restriction creates unsafe movement. | 3-5 | Build pack; partner for GIS/CAD adapters if needed | Evidence: current route gap | Not approved |
| Reusable Event Operating Pack | Each event risks repeating setup and losing lessons. User: project manager and operations director. Decision: what can be reused safely for the next event? | Reduces setup effort and turns event knowledge into a product asset. | Approved object vocabulary, templates, role model, thresholds, reporting, governance. | Reusing unsafe assumptions or stale event geometry. | 3-5 | Build domain templates; partner for adapters | Proposal | Not approved |

## 3. Strategic Research

| Idea | Problem / user / decision | Value | Dependency | Risk | Stage | Evidence level | Ahmed approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Spatial Operational Memory | Teams lose location-specific history across events and shifts. User: operations director. Decision: what happened here before and what worked? | Reusable operational knowledge and faster diagnosis. | Provenance, revision history, event identity, privacy and retention rules. | Historical data is incomplete or creates misleading pattern confidence. | 5 | Research and contract first | Hypothesis | Not approved |
| Operational Time Travel | Operators cannot reconstruct what was known and approved at a past moment. User: quality, executive, and incident leads. Decision: what was the state when the decision was made? | Supports accountability, after-action review, and learning. | Durable event history, source timestamps, decision records, versioned state. | Incomplete replay gives a false audit narrative. | 5 | Research only | Proposal | Not approved |
| Decision Impact Measurement | The effect of an intervention is not currently measured. User: executive decision-maker. Decision: did the intervention improve the selected outcome? | Converts activity into measurable value and supports investment decisions. | Baseline metric, intervention timestamp, comparison method, evidence, confounder handling. | Attribution is overstated or a proxy is mistaken for safety improvement. | 5 | Research protocol first | Hypothesis | Not approved |
| Spatial Confidence Fusion | Future sources may disagree on occupancy, flow, or location. User: command-center operator. Decision: is the observation reliable enough to act on? | Makes estimated versus verified state explicit and supports source-aware decisions. | Source adapters, confidence semantics, conflict rules, timestamp, evidence. | Confidence scores imply mathematical precision that the data does not support. | 3-5 | Partner/integrate later behind a built contract | Proposal | Not approved |
| Cross-Event Learning | Lessons, supplier failures, bottlenecks, and responses are not yet comparable across events. User: strategy and operations leadership. Decision: what should be changed before the next event? | Creates compounding operational advantage. | Common ontology, comparable measures, governance, privacy, event operating packs. | False comparability across different venues or operating models. | 5 | Research only | Hypothesis | Not approved |
| Digital-to-Physical Synchronization | Future 2D, 3D, field, executive, and physical views may drift. User: venue and command-center leads. Decision: which representation is authoritative for this action? | Reduces representation mismatch and briefing confusion. | Approved geometry, versioning, output contracts, physical measurement, authority. | Synchronizing an untrusted state increases the speed of a wrong decision. | 6 | Research only | Proposal | Not approved |

## 4. Rejected or Delayed

| Idea | Problem / user / decision | Value | Dependency | Risk | Stage | Evidence level | Ahmed approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Live camera or sensor ingestion now | The current product lacks approved operational contracts and evidence governance. User: not yet assigned. Decision: should a live observation change shared state? | Potentially faster observation later. | Source authority, privacy, confidence, event contracts, backend, support, procurement. | High false-confidence, privacy, reliability, and scope risk. | After Stage 3 maturity | Proposal only | Explicitly deferred; no approval |
| Call scripted sequences simulation | Current scenarios are deterministic scripted exercises without calibrated models or uncertainty. User: facilitator. Decision: what sequence should be rehearsed? | Briefing and tabletop value only. | Approved language and exercise objectives. | Misleading claims and unsafe reliance on a visual sequence. | Current briefing/training use only | Evidence: current scenario implementation | Rejected as a current label |
| Physical projection calibration now | A visual preset has no projector measurements or physical geometry evidence. User: briefing lead. Decision: what should a room see? | Visual briefing value without calibration. | Physical measurements, AV authority, calibration workflow, acceptance test. | Operators believe a preset is physically calibrated. | Stage 6 or later | Evidence: current projection architecture | Explicitly deferred |
| Force every task into 3D | Some decisions are clearer in 2D, lists, timelines, or checklists. User: every operator. Decision: which view is least ambiguous? | None unless measured; increases cognitive load. | A task-by-task view benchmark. | Slower decisions and reduced adoption. | Not recommended | Evidence: charter principle; hypothesis about task fit | Rejected as a design rule |
| Single-vendor proprietary core | Vendor platforms may provide strong layers but can constrain formats and contracts. User: CTO. Decision: which components can be replaced? | Short-term integration speed in selected cases. | Open domain contracts and adapter boundaries. | Lock-in, procurement dependence, and future rebuild risk. | Across stages | Inference | Rejected as a core architecture |

## Backlog Maintenance Rules

- Move an item only when new evidence, an approved experiment, or an Ahmed decision changes its status.
- Preserve the simplest alternative and failure cost when an item advances.
- Do not create implementation tickets from this document without explicit approval.
- Record the evidence source and date in the daily R&D memo that changes an item's classification.
