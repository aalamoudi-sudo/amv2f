# Stage 3F.2 Recovery and Rollback Runbook

## Recovery

- Verify the gateway readiness endpoint.
- Verify SSE reconnects with cursor replay.
- Verify duplicate observations remain deduplicated.
- Verify conflicts remain quarantined.

## Rollback

- Disable the source at the pilot boundary.
- Preserve legal history.
- Do not delete accepted operational events.
- Do not rewrite the baseline.

## Shutdown

- Remove the source from the active allowlist.
- Close the pilot path.
- Leave the durable history intact for review.
