# Global Benchmark Landscape

## Purpose

This is the standing benchmark map for Mayadeen Event Intelligence Twin. It defines what to study, what each benchmark category is expected to do exceptionally well, and the event-operational gap Mayadeen must challenge.

This is not a vendor scorecard and not evidence that Mayadeen exceeds any benchmark. The category descriptions below are the approved charter research scope. Future factual claims about products, performance, licensing, or procurement require current primary sources and must be labelled as evidence.

## Benchmark Method

For every benchmark review, record:

- The exact product, version, paper, documentation, or deployment being reviewed.
- The operational problem the capability solves.
- The primary user and decision.
- Required data, authority, and evidence.
- Build, buy, partner, or delay options.
- The simplest alternative.
- Adoption, procurement, vendor-dependency, and failure risks.
- The roadmap stage and Ahmed approval gate.

Never turn a benchmark capability into a Mayadeen product claim without a measured Mayadeen result.

## Category Reviews

### 1. NVIDIA Omniverse and OpenUSD

**Study focus:** Large-scale 3D scene composition, OpenUSD asset structure, physical and visual simulation, collaboration, and digital-to-physical workflows.

**Charter evidence:** The approved R&D scope identifies these as benchmark capabilities.

**Mayadeen challenge:** Build an event-specific spatial model where every gate, hall, route, zone, stage, asset, incident, task, supplier, permit, risk, decision, and evidence record has operational meaning. Geometry remains a representation layer, not the product.

**Questions:** Can an open scene representation preserve stable operational IDs, ownership, source, version, and approval across imported models? What is the smallest useful OpenUSD adoption before it creates asset-pipeline overhead?

**Mayadeen disposition:** Research only until an approved model-import and ontology experiment demonstrates measurable value over the current GLB/glTF and typed-data foundation.

### 2. Cesium and 3D Tiles

**Study focus:** City-scale geospatial environments, streaming, multi-resolution spatial visualization, and city-to-site-to-building navigation across maps, BIM, photogrammetry, and point clouds.

**Mayadeen challenge:** Create a continuous operational view from city, surrounding roads, transport, parking, gate, venue, hall, zone, and asset to incident or decision.

**Questions:** Which spatial scale changes a real decision? What latency, level-of-detail, and device constraints apply to command-center displays? When is a 2D map clearer than a streamed 3D environment?

**Mayadeen disposition:** Strategic research. Do not add geospatial streaming to the current sprint.

### 3. Palantir Ontology

**Study focus:** Objects, relationships, actions, permissions, workflows, and the connection of data to decisions and execution.

**Mayadeen challenge:** Create an Event Ontology and Spatial Decision Graph. Every object should eventually support identity, owner, responsible party, source, timestamp, evidence, confidence, approval, relationships, actions, operational impact, and history.

**Questions:** Which objects and actions are shared across event types? What is the minimum ontology that improves a real decision without becoming a generic enterprise model? How should approval and authority be represented?

**Mayadeen disposition:** Critical foundation research. Define contracts before implementing integrations or permissions.

### 4. AnyLogic and Advanced Crowd Simulation

**Study focus:** Agent-based modelling, pedestrian flow, evacuation, bottlenecks, capacity, and what-if analysis.

**Mayadeen challenge:** Do not stop at simulation output. Connect future simulation to recommendation, approval, assigned action, field evidence, verification, and impact measurement.

**Questions:** Which scenario decisions need simulation rather than a deterministic exercise? What input quality is required before output is safe to use? How will uncertainty and calibration be shown?

**Mayadeen disposition:** Stage 4 research. Current scripted scenarios are not simulations.

### 5. NVIDIA Metropolis, DeepStream, and Computer Vision

**Study focus:** Multi-camera processing, object detection, crowd estimation, flow direction, queues, anomalies, edge processing, and event-based video intelligence.

**Mayadeen challenge:** Translate observations into operational events such as density threshold exceeded, exit obstruction, queue time breach, unusual movement, person fall, gate throughput reduction, or restricted-area entry.

**Required future contract:** Location, timestamp, confidence, evidence, threshold, recommended response, and human approval where required.

**Mayadeen disposition:** Partner/integrate research after the operational data contract and trust model are approved. No camera or live-feed implementation now.

### 6. Cisco Spaces and Indoor Location

**Study focus:** Wi-Fi, BLE, UWB, occupancy, movement, asset tracking, indoor analytics, and location confidence.

**Mayadeen challenge:** Create a future Spatial Confidence Fusion layer that distinguishes estimated data from verified data while combining cameras, counters, Wi-Fi, BLE, UWB, ticketing, parking, transport, and human reports.

**Questions:** What confidence can an operator act on? How are conflicting sources resolved? What is the cost of false location confidence?

**Mayadeen disposition:** Strategic research. Prefer source-agnostic contracts and replaceable adapters.

### 7. AWS IoT TwinMaker

**Study focus:** Entity models, relationships, sensor and video integration, data-source adapters, 3D scene binding, and operational dashboards.

**Mayadeen challenge:** Turn reusable event operating packs into a product asset: event template, site, zone, route, readiness, roles, playbook, thresholds, reporting, and projection scene packs.

**Questions:** Which adapters are generic and which are event-specific? Can Mayadeen preserve vendor independence while integrating proven services?

**Mayadeen disposition:** Architecture research for Stage 3 and later. No backend or IoT integration in the active sprint.

### 8. Temporal and Camunda

**Study focus:** Durable workflows, human tasks, escalation, timers, SLA, retries, failure recovery, and workflow history.

**Mayadeen challenge:** A future workflow such as incident -> assignment -> SLA -> escalation -> approval -> execution -> evidence -> verification -> closure must survive browser closure, network interruption, service restart, delayed approval, handover, and supplier non-response.

**Questions:** Which workflows need durable orchestration? What is the minimum history required for operational trust? Should Mayadeen build contracts and integrate a workflow engine later?

**Mayadeen disposition:** Stage 5 research. Do not implement a backend, audit system, or workflow engine now.

### 9. Apple visionOS, ARKit, and RealityKit

**Study focus:** Spatial interfaces, mixed-reality overlays, immersive operational views, field guidance, 3D interaction, and remote collaboration.

**Mayadeen challenge:** Future supervisors may view approved render versus actual construction, match percentage, open issues, owners, due dates, safety routes, and required actions in the real venue.

**Mayadeen disposition:** Strategic later. Core operational trust and field workflows must precede spatial-computing features.

### 10. MIT inFORM and Tangible Interfaces

**Study focus:** Physical representations of digital data, shape-changing surfaces, tangible interaction, remote physical presence, and physical visualization.

**Mayadeen challenge:** A physical interface must communicate density, risk, readiness, closure, route activation, decision state, and scenario impact. It must not be a decorative model.

**Mayadeen disposition:** Stage 6 research only. Physical procurement and interface experiments require Ahmed approval and a demonstrated operational decision value.

## Cross-Layer Gaps

The strongest benchmark gap is not any individual visualization technology. It is the connection between layers:

`observation -> trusted object -> decision -> approval -> action -> evidence -> verification -> impact -> learning`

Mayadeen must challenge each benchmark category against this complete loop. A visually impressive layer that does not improve an accountable decision is not a sufficient differentiator.

## Current Mayadeen Position

**Evidence:** Existing documentation and implementation provide an Arabic RTL spatial interface, stable spatial IDs, typed procedural entities, route and scenario structures, local state separation, complementary 2D/3D views, and projection presets.

**Inference:** The strongest near-term intellectual property opportunity is an Event Ontology plus evidence and approval contract that connects spatial objects to accountable actions. This is not yet implemented as a shared operational system.

**Unvalidated:** Whether operators will pay for or consistently use a richer spatial intelligence layer instead of a 2D map, checklist, spreadsheet, or existing command-center tools.

## Research Guardrails

- No researched technology is implementation-ready without Ahmed's explicit approval.
- No live data, cameras, sensors, counters, simulation, authentication, backend, or physical calibration is added through this landscape document.
- No benchmark comparison may imply Mayadeen already exceeds a global platform.
- Every benchmark recommendation must state build, buy, partner, or delay.
- The simplest credible alternative must remain visible.
