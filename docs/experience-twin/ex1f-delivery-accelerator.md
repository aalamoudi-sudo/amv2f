# EX.1F Delivery Accelerator

## Status

The accelerator prepares Wave B and Wave C inside EX.1F. It is not a new product stage and does not start Stage 4.

Current KAP state:

- Operational packages received: `0`.
- Studio packages received: `0`.
- Packages accepted as candidates: `0`.
- Operational packages bound: `0`.
- KAP Web3D scenes bound: `0`.
- KAP panoramas bound: `0`.
- Operational readiness: `cannot-determine`.

## One Legal Path

Operational delivery follows:

`private local source -> safe inventory -> SHA-256 -> schema and authority validation -> deterministic reconciliation -> Ahmed review -> immutable candidate revision -> atomic canonical projection binding`

Studio delivery follows:

`private local source -> safe inventory -> dependencies and SHA-256 -> format, rights and spatial validation -> optimization preview -> Ahmed review -> immutable candidate asset revision -> canonical Scene Gateway binding`

No file can write directly to Experience Twin, readiness, decisions, Story Map or Scene Gateway. The browser never reads arbitrary local files.

## Private Boundary

The ignored local roots are:

```text
private-input/operational-delivery/
private-input/studio-3d-delivery/
private-input/quarantine/
private-output/delivery-intake/
```

Raw files remain outside `src/`, `public/`, Git, client builds and review ZIPs. The inventory records only safe display names, opaque local IDs, byte size, fingerprints and governed metadata. Symbolic links, traversal, executables, unsafe archives, changed fingerprints and external URLs fail closed. A `.bin` file is permitted only as inert data inside the studio/glTF dependency context; the same extension remains blocked by the general intake policy.

## State Vocabulary

Infrastructure-ready, fictional dry-run, real package received, candidate accepted, bound for review, client approved and operationally approved are separate states. Founder acceptance permits candidate binding for review only. It is not client, engineering, HSE, opening or operational approval.

## Dry Run

Small fictional fixtures prove validation, reconciliation, duplicate/conflict handling, GLB structure, panorama classification, rights blocking, cross-project isolation, atomic binding and append-only rollback. They use a fictional project/event/venue, can be inspected only in the labelled technical dry-run laboratory, cannot bind to KAP content and are hidden from the client-review build profile.

## Operator Surface

`مركز استلام وربط الأصول` is an administrative Experience Twin view. It shows the two real KAP channels at zero and exposes fictional dry-runs only in a clearly labelled test laboratory. It does not create a second viewer or a second truth store.
