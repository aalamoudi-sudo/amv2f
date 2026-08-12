# Event State Isolation

Every Stage 3E runtime is scoped by:

```text
eventInstanceId :: venueId :: stateContext
```

Activation accepts only `temporary-demo`. Readiness, decisions, relations, and capture fixtures must carry the same context.

Switching a package replaces the transient runtime atomically and resets selection, route visibility, scenario runtime, and current package records. Fresh defensive clones prevent local edits from leaking between packages.

Before the first package activation, the store captures a persistence-safe snapshot of the existing state. While a package session is active, Zustand persistence writes that original snapshot rather than package records. Storage schema 8, migration, and quarantine remain unchanged. Reload therefore restores the prior local state, not an imported package.

Scenario state remains a transient overlay and is cleared on package switch. This is local isolation, not multi-user tenancy or backend durability.
