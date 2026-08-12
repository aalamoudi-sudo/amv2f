# Operational Pack Registry

Stage 3E registers these reusable capability packs:

| Pack | Required dependency | Current boundary |
| --- | --- | --- |
| `spatial-foundation` | none | procedural 2D/3D and routes |
| `zone-readiness` | spatial foundation | temporary readiness validation |
| `decision-engine` | spatial foundation | local decision integrity |
| `operational-capture` | spatial foundation + local profile | simulated capture boundary |
| `scenario-player` | spatial foundation | scripted exercise, not simulation |
| `spatial-output` | spatial foundation | local visual outputs |
| `projection-preview` | spatial output | visual preset, no calibration |

The resolver rejects unknown or duplicate activation, missing dependency, cycle, incompatibility, unsupported version/capability, and missing entity type, role, authority, integration profile, or output profile. Every enabled pack must have executable configuration. Configuration for a disabled pack is rejected. Activation never silently repairs an invalid combination.

Pack definitions are platform-owned and versioned. Event packages choose and configure them; they do not fork the engines. UI actions subscribe to the active runtime: disabled packs are unavailable rather than displayed as executable metadata.
