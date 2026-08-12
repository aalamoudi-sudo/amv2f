# Event Package Import and Activation

The local workflow is:

```text
Select or import JSON
→ parse
→ schema validation
→ semantic/reference validation
→ pack dependency resolution
→ difference preview
→ runtime health check
→ atomic temporary-demo activation
→ local confirmation
```

The previously active runtime remains active until all blocking checks pass. A failed validator or runtime application records a local blocked result and changes nothing.

Rollback swaps back to the previous validated runtime. Reset activates the fictional exhibition reference package. History is a local demo record only; it is not durable deployment history or an audit trail.

There is no baseline promotion command. Imported packages are not written into the Stage 3C.1 persisted baseline namespace.
