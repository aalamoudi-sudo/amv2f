# Zone ID Standard

All operational entities use permanent IDs. IDs are English and stable; Arabic labels are display data.

Required prefixes:

- `SITE-###`
- `ZONE-###`
- `HALL-###`
- `GATE-###`
- `ROUTE-###`
- `STAGE-###`
- `PARK-###`
- `SERVICE-###`
- `ASSEMBLY-###`
- `ASSET-###`

Rules:

- Do not encode Arabic names in IDs.
- Do not reuse IDs after deletion.
- Keep IDs stable when replacing the procedural model with GLB/GLTF.
- Map imported model nodes to these IDs through metadata, node naming, or an adapter table.
- Keep operational status outside mesh assets.
- Preserve the same ID in the physical part register, engraved or DataMatrix
  physical label, and projection-surface mapping.
- Never identify a physical piece only by filename, color, or assembly order.
- A physical revision may replace geometry, but it must not replace the entity
  ID unless the operational identity itself changes.
