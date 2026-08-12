# EX.1F Delivery Rollback Runbook

## Candidate Data Rollback

1. Stop new candidate binding attempts.
2. Identify the current immutable revision and intended historical target.
3. Verify the expected current head hash.
4. Create a new append-only rollback revision referencing the target.
5. Validate the complete candidate projection and mappings.
6. Commit atomically or leave the prior revision unchanged.
7. Record actor classification, local timestamp classification, reason and affected IDs.

Rollback never deletes revisions, source custody, conflicts or evidence history.

## Client Build Rollback

1. Retain complete build directories by build identity.
2. Verify the previous build's `client-review-checksums.sha256`.
3. Replace the complete active static directory atomically.
4. Do not mix assets from two builds.
5. Purge only the authorized host cache entries for `index.html`.
6. Verify deep links, RTL, build identity and truth banner.

## Failed Binding

If any required object, rights check, dependency, spatial registration or fingerprint fails, no partial binding is committed. Correct the package and retry with a new fingerprint/revision.
