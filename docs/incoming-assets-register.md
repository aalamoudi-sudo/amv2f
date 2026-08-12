# Incoming Assets Register

Use this register when real studio and operations assets arrive.

| Asset | Expected Format | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| CAD | DWG, DXF, RVT, IFC | Studio / venue team | Pending | Needed for scale and layout validation. |
| Original 3D model | Native DCC file | Studio team | Pending | Preserve source hierarchy if possible. |
| GLB or GLTF export | `.glb` or `.gltf` | Studio team | Pending | Target runtime asset for Three.js. |
| Textures | PNG, JPG, KTX2 | Studio team | Pending | Optimize before runtime use. |
| Zone list | XLSX, CSV, JSON | Operations team | Pending | Must include stable IDs or mapping fields. |
| Renders | PNG, JPG, PDF | Studio team | Pending | Reference only, not runtime source. |
| Branding | SVG, PNG, style guide | Brand team | Pending | Apply to UI only after approval. |
| Routes | CSV, GeoJSON, JSON | Operations / safety team | Pending | Visitor, service, emergency paths. |
| Evacuation plans | PDF, CAD, marked plan | Safety team | Pending | Validate route scenario logic. |
