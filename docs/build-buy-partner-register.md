# Build / Buy / Partner Register

## Purpose

This register forces an explicit sourcing decision for major R&D capabilities. A recommendation is not an implementation authorization. Ahmed must approve any technical experiment or production adoption.

## Decision Rules

- **Build:** Mayadeen-specific operational semantics, claims boundaries, and decision contracts that form intellectual property.
- **Buy:** Commodity capability where procurement reduces risk and does not own the domain model.
- **Partner:** Specialist capability requiring operational, physical, scientific, or integration expertise.
- **Delay:** No credible operational need, evidence, authority, or adoption case yet.
- **Adapter boundary:** External services must connect through replaceable, documented contracts and open formats where practical.

## Register

| Capability | Build internally | Buy / integrate | Partner with specialist | Delay condition | Current recommendation | Approval status | Next evidence required |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Event Ontology | Object identity, relationships, actions, owners, evidence, approval, and impact semantics | Commodity schema or graph storage only if it does not dictate domain semantics | Ontology review or event-operations design expertise | If no canonical decision object can be agreed | Build contract first | Requires Ahmed approval before experiment | One canonical event decision mapped end to end |
| Spatial model and asset identity | Stable IDs, model-to-entity mapping, state separation, import normalization contract | GLB/glTF/OpenUSD/3D Tiles tooling where mature | Specialist asset pipeline or survey support | If imported geometry does not improve a decision | Build identity and contract; use open formats; partner selectively | Research only | Two source models mapped without losing IDs or provenance |
| Geospatial streaming | Event spatial semantics and operator workflows | 3D Tiles or map infrastructure | Cesium or geospatial specialist | If site-scale 2D/3D already answers the target decision | Delay until scale is a measured need | Deferred | City-to-venue task benchmark and performance budget |
| Readiness and evidence | Claim rules, owner, source, timestamp, confidence, approval, closure semantics | Evidence storage, document management, or notification commodity services | Quality, HSE, or audit design review | If no accountable operational pack exists | Build minimum contract; no backend now | Deferred | Signed sample data pack and authority map |
| Computer vision | Event object and response contract; source-neutral confidence semantics | Detection, edge processing, video analytics | Metropolis/DeepStream or local vision specialist | If camera data has no approved response or evidence workflow | Partner/integrate later | No approval | Detection-to-action test with false-positive cost |
| Indoor location | Confidence fusion and operator interpretation contract | Wi-Fi/BLE/UWB platform | Venue connectivity or location specialist | If location error exceeds decision tolerance | Partner/integrate later | No approval | Source conflict and location-confidence experiment |
| IoT and live data adapters | Device/datastream contracts, source status, freshness, provenance, idempotency, spatial binding, local trusted gateway and durable outbox boundary | Production MQTT broker, PKI/HSM, secrets manager, PostgreSQL operations and observability after a specific lab case is approved | Sensors, gateways, network, calibration, field installation and protocol integration | If the local gateway cannot reject stale/unknown/conflicting readings or a real source adds no value over CSV | Build Stage 3F.0/3F.1 local vendor-neutral contracts and durable gateway now; buy/partner production infrastructure only after approval | Ahmed authorized local Stage 3F.1 foundation; no hardware, broker, cloud, production identity or live integration approved | Approve one use case, source owner, identity/time/security/retention policy and reversible adapter acceptance test |
| Crowd simulation | Scenario-to-action, uncertainty, approval, and impact contracts | AnyLogic or specialist simulation engine | Crowd-science and HSE specialist | If input quality cannot support a safe recommendation | Partner/integrate at Stage 4 | No approval | Calibrated case with comparison to a simple spreadsheet model |
| Durable workflows | Event actions, ownership, approval, evidence, and domain state | Temporal, Camunda, or equivalent orchestration | Workflow implementation and operations specialist | If a simple approved operating procedure is sufficient | Buy/partner engine; build domain contracts at Stage 5 | No approval | Restart, handover, SLA, and closure proof |
| Reporting and impact measurement | Event-specific measures and decision-impact semantics | BI, analytics, or reporting commodity layer | Evaluation and operations-research specialist | If no baseline or intervention measure exists | Build measure definitions; buy commodity presentation later | No approval | One before/after intervention with confounders documented |
| Spatial computing | Operational payload, approved geometry, issue, owner, and due date | visionOS/ARKit/RealityKit platform | Field AR and venue specialist | If field users cannot show lower error or rework | Partner at Stage 6 | No approval | Field task benchmark versus phone, paper, or 2D plan |
| Physical intelligent interface | Semantic mapping of state to physical representation | Hardware platform if acceptance criteria exist | Tangible-interface and fabrication specialist | If the physical view adds no measurable decision value | Core design must follow `MEIOS-PDT-STD-001`; physical implementation remains delayed until Stage 6 and a funded use case | Design standard approved; implementation not approved | Screen-only versus physical-interface decision test |
| Projection output | Current preset and clean-output semantics | Display or projector hardware later | AV and venue integration specialist | If output is briefing-only and calibration is not required | Keep as visual preset; future physical output must follow `MEIOS-PDT-STD-001`; no calibration now | Current feature; calibration deferred | Approved deployment profile, Projection Study, and room test |

## Required Approval Record

Before moving any row from research to an experiment, the daily R&D consolidation must record:

- Ahmed's decision and date.
- Operational problem and primary user.
- Decision and action being improved.
- Evidence and source status.
- Simplest alternative.
- Failure cost and reversibility.
- Procurement and vendor-dependency risk.
- Target roadmap stage.
- Test success measure and stop condition.

## Current Register Conclusion

The near-term build priority is domain contracts: Event Ontology, provenance, evidence, authority, and scenario/baseline separation. Commodity infrastructure, live sources, simulation engines, workflow engines, spatial computing, and physical interfaces remain delayed or research-only until an approved decision experiment shows measurable value.
