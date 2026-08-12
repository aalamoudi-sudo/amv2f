# Decision Object Model

This document records the implemented `DecisionRecord` contract. It introduces no new decision semantics.

The contract includes identity and explicit relationships; context and source; decision owner, responsible party, authority and assignment; problem, generic category, urgency, confidence, evidence, assumptions and constraints; options; approval; required action, due time, escalation and lifecycle; expected and actual impact; completion, verification, closure and lessons; and ordered local revision history.

`DecisionEntityRelation` carries `execution-target`, `affected`, `dependency`, or `evidence-source` meaning explicitly. It includes impact, Arabic description, source, confidence, and state context. Array position has no semantic meaning.

All actor strings and browser timestamps are local validation values, not trusted production identity or authoritative time. The lifecycle validator enforces ordered transitions and evidence references, but the store is not a durable workflow or audit system.
