# Event Template and Instance Model

## Platform Core

Owns generic rendering, readiness, decision integrity, capture validation, package validation, state isolation, and activation. It contains no reference event name, venue ID, or event-specific workflow branch.

## Event Template

Defines reusable event-category behavior: event type, lifecycle profile, default operational packs, supported spatial entity types, and required roles. A template can support many future instances.

## Event Instance

Defines one occurrence: event identity and names, venue, start/end time, time zone, template reference, and state context. The reference instances are fictional.

## Operational Pack

Defines an independently versioned reusable capability and its dependencies. It does not contain an event's entities or names.

## Temporary Seed Data

Supplies readiness, decisions, and capture fixtures for local evaluation only. Each seed has source, creator, creation time, approval status, revision, context, and classification.

The same venue may later host different instances, and the same template may later instantiate against different venues, after a backend and formal governance boundary exist.
