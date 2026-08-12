# Future Imported Models

Place future studio-provided `.glb` or `.gltf` files in this folder.

The current procedural site is intentionally isolated from the rest of the application. When the real model arrives, create a model adapter under `src/three/models/` that:

- Loads the GLB/GLTF scene.
- Normalizes origin, units, scale, and orientation.
- Maps model nodes or authored metadata to the stable entity IDs in `src/data/entities.ts`.
- Leaves operational data in typed data/services instead of embedding it in meshes.
