# Product Operations Review

## Executive Operational Assessment

Mayadeen currently supports an Arabic RTL spatial decision and operational exercise interface. It is useful for spatial briefing, local review, and scripted tabletop preparation. It is not yet ready to serve as a source of operational truth for a command center.

The current release uses typed temporary demo data, local persistence, a procedural 3D scene, three route definitions, and three scripted scenarios. The implementation now distinguishes `temporary-demo`, `baseline`, and `scenario` state in the store. That distinction is necessary, but it does not provide source authority, approval, audit history, handover, or incident control.

The operational recommendation is to keep the present scope intact and validate one real decision workflow using 2D and 3D together. Do not expand into backend, live feeds, audit, simulation, or projection calibration in this sprint.

## Maturity Scores

Scale: 0 means absent; 10 means source-backed, approved, repeatable in a live command-center workflow.

| Dimension | Score | Assessment |
| --- | ---: | --- |
| Overall operational maturity | 3/10 | Strong interaction foundation; no source authority or operational governance. |
| Command-center usability | 5/10 | Clear RTL panels, selection, routes, scenarios, and collapsible layout; no shift workflow or escalation. |
| Decision support | 4/10 | Supports spatial focus and briefing; displayed metrics do not yet carry decision evidence. |
| Data trust | 2/10 | Temporary demo data and local persistence; no source, timestamp, confidence, or approval record. |
| Scenario maturity | 3/10 | Structured scripted exercises with useful sequencing; no approved playbook or outcome capture. |
| Route maturity | 2/10 | Temporary points and relationships; no approved geometry, capacity, accessibility, or authority. |
| Shift-operation readiness | 1/10 | No handover, SLA, escalation, closure verification, or audit history. |

## Role Review

| Role | Current decision supported | Operational limitation |
| --- | --- | --- |
| Command-center operator | Which entity or route should receive attention now? | No trusted source, timestamp, authority, or incident record. |
| Shift leader | Which area should be briefed or followed up? | No handover state, open actions, SLA, or closure status. |
| Project manager | Which workstream appears delayed? | `responsibleParty` is a display label, not an accountable owner with evidence. |
| Zone supervisor | What local status or readiness value should be displayed? | Direct local editing has no approval boundary or completion proof. |
| Crowd-management lead | Which visitor route should be shown in a briefing? | No flow measurement, capacity validation, accessibility, or current restriction. |
| Security lead | Which gate or security-related area needs attention? | No incident ownership, escalation chain, or authority-backed status. |
| HSE lead | Which evacuation route and assembly points should be discussed? | The route is not safety-approved geometry and the exercise is not an approved playbook. |
| Quality lead | Is a readiness item actually complete? | No evidence attachment, acceptance criteria, verifier, or closure record. |
| Logistics lead | Where is the service route and which area is delayed? | No vehicle clearance, time window, capacity, obstruction, or responsible authority. |
| Executive decision-maker | What spatial story should be presented in a review? | Suitable for briefing only; the data must not be presented as verified readiness. |

## Capability Decision Contracts

### Operational 3D and Spatial Selection

- **User and decision:** Command-center operator or executive briefing lead; identify the spatial relationship and focus the next discussion.
- **Required data and authority:** Stable IDs, approved geometry or a clearly marked temporary model, coordinate reference, zone ownership, and a named authority for spatial changes.
- **Expected action:** Select an entity, inspect its local state, compare adjacent routes, and hand the issue to the responsible team.
- **Evidence required:** Approved plan or model reference, version/date, and a record that the selected entity matches the physical plan.
- **Escalation path:** Spatial discrepancy to the project/venue model owner; operational discrepancy to the zone or discipline owner; safety discrepancy to HSE.
- **Measurable outcome:** Time to locate a named entity and percentage of operators who identify it correctly using both views.
- **Risk if incorrect:** Operators brief the wrong location or assume spatial relationships that do not exist.

### Zone Readiness, Status, and Risk

- **User and decision:** Shift leader, project manager, or zone supervisor; prioritize follow-up, not authorize opening.
- **Required data and authority:** Defined readiness rubric, status lifecycle, risk method, source, updated time, owner, evidence, and approval authority.
- **Expected action:** Review the exception, assign the follow-up to the owner, and escalate when the threshold or SLA is exceeded.
- **Evidence required:** Completion evidence, verifier, source reference, confidence, approval state, and closure confirmation.
- **Escalation path:** Zone supervisor to project manager; HSE/security issues to the relevant discipline lead; unresolved cross-zone conflicts to the shift leader.
- **Measurable outcome:** Time to produce a trusted priority list, agreement between the interface and the signed operational pack, and percentage of items closed with evidence.
- **Risk if incorrect:** A local score is mistaken for permission to operate or a serious gap is hidden by an aggregate.

### Routes

- **User and decision:** Crowd-management, security, HSE, or logistics lead; decide which path is safe and suitable to brief.
- **Required data and authority:** Geometry source, direction, usable capacity, accessibility, restrictions, responsible authority, version, date, and approval.
- **Expected action:** Select the route, confirm its status with the authority, brief the affected teams, and escalate conflicts or closures.
- **Evidence required:** Approved CAD/GIS/marked plan, route review, capacity rationale, accessibility check, and current restriction evidence.
- **Escalation path:** Route discrepancy to the route owner; evacuation issue to HSE; security restriction to security lead; cross-discipline conflict to the shift leader.
- **Measurable outcome:** Correct route identification, briefing time, and zero unreviewed route claims in an operational pack.
- **Risk if incorrect:** Unsafe evacuation, crowd conflict, vehicle conflict, or inaccessible routing.

### Scripted Scenarios

- **User and decision:** Exercise facilitator, command-center lead, or executive briefing lead; agree on the sequence of attention and decisions to rehearse.
- **Required data and authority:** Approved exercise objective, trigger, step owner, expected decision, message, affected entities, and reset condition.
- **Expected action:** Run, pause, advance, and reset the exercise while recording decisions outside the current local demo store.
- **Evidence required:** Approved exercise brief, participant list, decision notes, and after-action observations.
- **Escalation path:** Exercise ambiguity to the facilitator; safety-critical content to HSE/security; unresolved decision ownership to the shift leader.
- **Measurable outcome:** Sequence completion, participant agreement on the next action, and time to reach the intended decision.
- **Risk if incorrect:** A scripted visual sequence is interpreted as a prediction, simulation, or approved operational playbook.

### Projection Mode

- **User and decision:** Briefing lead or executive decision-maker; choose the shared visual emphasis for a room review.
- **Required data and authority:** Display requirements, viewing distance, approved labels, and an agreed briefing owner; physical projector measurements are not present.
- **Expected action:** Select a visual preset, show the relevant routes or labels, and return to operator mode after the briefing.
- **Evidence required:** Room readability check and approved briefing content; no calibration evidence exists in this release.
- **Escalation path:** Visual issue to the briefing owner; physical output issue to the venue/AV authority.
- **Measurable outcome:** Time to prepare a legible briefing view and participant ability to identify the intended route or priority.
- **Risk if incorrect:** A visual preset is mistaken for physical calibration or presents an unreadable or misleading output.

### Command-Center Workflow and System Status

- **User and decision:** Operator and shift leader; decide what to inspect, update, brief, or reset next.
- **Required data and authority:** Shift identity, source/time, open actions, escalation rules, decision owner, handover note, and local/system health separated from operational state.
- **Expected action:** Select, inspect, update a local demo/baseline value, run an exercise, and hand off unresolved work.
- **Evidence required:** Current operational pack, change reason, owner acknowledgement, and closure verification.
- **Escalation path:** Explicit discipline owner, then shift leader, then event command authority; none is currently implemented.
- **Measurable outcome:** Completion time for a canonical task, handover completeness, and reduction in unresolved ownership.
- **Risk if incorrect:** Local edits are treated as shared truth, or the “system status” is mistaken for venue or event health.

## Meaning Review

| Item | Current meaning | Operational judgement |
| --- | --- | --- |
| Readiness | Integer 0–100 with no rubric, source, or evidence. | Demo indicator only; not a completion percentage or opening authorization. |
| Status | Enum with Arabic labels such as ready, delayed, emergency. | Useful visual classification; lifecycle, authority, and transition rules are missing. |
| Risk | Low/medium/high/critical qualitative value. | Useful attention cue; no hazard, likelihood, impact, control, or owner is attached. |
| Capacity | Static numeric value on entities and routes. | Planning hint only; no usable capacity, accessibility, time, or current occupancy basis. |
| Responsible party | Arabic display field on an entity. | Not equivalent to decision owner, incident owner, or on-call authority. |
| Routes | Temporary points, colors, types, and related IDs. | Briefing visualization only until approved geometry and authority are supplied. |
| Scenario steps | Timed scripted changes, camera focus, highlights, and route visibility. | Executive presentation, operational briefing, tabletop exercise, or training; never simulation. |
| System status | Local UI condition derived from local critical-signal count. | Must remain explicitly local; it is not event health, venue health, or live system health. |

## Scenario Classification

| Current scenario | Permitted classification | Not permitted |
| --- | --- | --- |
| `visitorJourney` | Executive presentation; operational briefing; training | Simulation; approved visitor-flow playbook |
| `siteReadiness` | Executive presentation; operational briefing | Verified readiness source; opening authorization |
| `evacuation` | Tabletop exercise; training; operational briefing | Simulation; approved evacuation playbook until HSE approval |

No current scenario has sufficient authority, source data, or outcome capture to be classified as an approved operational playbook.

## Route Approval Contract

Before any route is called operationally approved, the record must identify:

- Geometry source and version.
- Direction and entry/exit semantics.
- Usable capacity and accessibility constraints.
- Safety/HSE approval status.
- Responsible authority and decision owner.
- Effective date and review date.
- Evidence of field or plan review.
- Current restrictions, closures, or dependencies.

The current route definitions provide temporary points, type, colors, widths, default visibility, and related IDs. They do not satisfy this approval contract.

## Future Operational Contract

The current architecture reserves a future evidence contract in `src/types/spatial.ts` and a state distinction in `EventStateContext`. The contract should later support:

- Shift handover: outgoing/incoming shift, timestamp, unresolved items, and acknowledgement.
- Approval: approval status, approver, approval time, scope, and expiry/review date.
- Escalation: trigger, severity, escalation owner, target time, and current status.
- SLA: due time, breach state, and responsible decision owner.
- Completion evidence: evidence reference, verifier, completion time, and closure verification.
- Incident ownership: incident owner, discipline, current action, and escalation chain.
- Decision ownership: decision maker, decision time, rationale, and affected entities.
- Audit history: revision history and change reason when shared operational state is introduced.
- Provenance: source, updatedAt, updatedBy when multiple operators can change data, confidence, and approval status.
- State separation: operational baseline versus scenario overlay versus temporary demo data.

These are future contracts only. No backend, audit system, or multi-user workflow should be implemented in the current sprint.

## Complementary Views

- **2D:** precise reference for approved geometry, boundaries, dimensions, and route documentation.
- **3D:** spatial comprehension, selection, relationships, and briefing attention.
- **Lists/panels:** fast scanning, comparison, and local inspection.
- **Timeline:** not implemented; any future timeline must represent dated actions and ownership, not decorative playback.
- **Projection:** shared briefing output from a visual preset, not physical calibration.

Every operational task should use the least ambiguous view. Not every task should be forced into 3D.

## Critical Operational Gaps

1. No source, timestamp, evidence, confidence, or approval is attached to current readiness, risk, or status values.
2. `responsibleParty` does not establish authority, incident ownership, or decision ownership.
3. There is no shift handover, escalation, SLA, closure verification, or audit history.
4. Routes are not approved geometry and do not contain accessibility or capacity evidence.
5. Scenarios do not capture exercise outcomes and are not approved playbooks.
6. The local system-status indicator cannot represent live event or venue health.
7. Browser E2E execution and the visual-review package remain blocked by an existing server on port 5173.

## Required Immediate Corrections

- Keep the current labels and documentation explicitly local, temporary, scripted, and preset-based.
- Keep readiness, route, and status outputs in briefing/demo use until the evidence contract is populated and approved.
- Use the existing baseline/scenario/demo state distinction in all future work.
- Require a named source, owner, authority, and evidence pack before any operational claim.
- Run browser tests against the correct worktree server before visual sign-off.

## Capability Disposition

### Demo-only

- Temporary entity positions and geometry.
- Local readiness, status, risk, and capacity values.
- Local system-status indicator.
- Scenario changes and animated route pulses.
- Projection presets.

### Suitable for Briefing

- Spatial selection and camera focus.
- Side-by-side interpretation of list, 3D scene, and route overlays.
- Scripted visitor, readiness, and evacuation exercises when explicitly labelled as exercises.
- Visual projection output when treated as a preset and checked for room readability.

### Formal Approval Required Before Operational Use

- Readiness or status claims.
- Evacuation, crowd, security, or service route claims.
- Capacity claims.
- Opening, closure, emergency, or “ready” decisions.
- Any use as a shared operational baseline or shift handover record.

## Recommended Next Operational Sprint

1. Select one real event decision and one approved 2D reference; evaluate the current 2D/3D workflow against operator time and accuracy.
2. Prepare one signed operational data pack with source, owner, timestamp, evidence, confidence, and authority for the zones and routes used in that test.
3. Run the three existing scenarios as explicitly labelled briefing/tabletop exercises and capture decision agreement and unresolved questions outside the product.
4. Re-run browser E2E with the correct worktree server and package rendered visual-review artifacts before any operational maturity claim.

This is validation of the current sprint, not a new product stage.

## Questions Requiring Ahmed's Decision

- Which event and operational decision should be the first validation target?
- Who is the accountable owner and approving authority for the first zone and route data pack?
- Should `responsibleParty` map to the future `owner` field, or remain display-only?
- Which fields are mandatory before Ahmed will approve any operational claim: source, updatedAt, owner, evidence, confidence, approval status, approver, and approval time?
- Is physical projection a real procurement requirement, or should projection remain briefing-only?
- What measurable 2D-versus-3D threshold constitutes improvement: time, accuracy, handover completeness, or briefing comprehension?
