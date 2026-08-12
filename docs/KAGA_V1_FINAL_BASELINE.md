# KAGA V1 Final Approved Baseline

**Status:** Frozen and approved  
**Tag:** `KAGA-V1-FINAL-APPROVED`

The annotated Git tag is the canonical immutable pointer to the approved V1 commit. Resolve the commit with:

```bash
git rev-list -n 1 KAGA-V1-FINAL-APPROVED
```

## Approved deliverable hashes

```text
5f7c3f3db76d7bbf841d1f1dc4b20914b736cc7437f47ab86b60f8f5eddaeac6  KAGA-Executive-Presentation.zip
7da8ba169fc9c94ab0501878970d4812743a731dffdc3cec71cc03dd3ee54151  KAGA-Final-Developer-Archive.zip
```

## Freeze boundary

- `deliverables/KAGA-Executive-Presentation.zip` is the approved client artifact and must not be regenerated or overwritten.
- V1 `dist-kaga/`, `reports/`, screenshots, documentation, source assets, and final developer archive are preserved by the tag.
- V2 work proceeds only on branch `kaga-v2-source-true` from the tagged V1 commit.
- V2 output paths must be distinct from all V1 build, report, screenshot, and deliverable paths.
