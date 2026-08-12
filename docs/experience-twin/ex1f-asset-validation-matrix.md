# EX.1F Asset Validation Matrix

| Asset | Inventory | Metadata | Structural validation | Preview/runtime | Required next action |
|---|---:|---:|---:|---:|---|
| GLB | Yes | Yes | Yes | Candidate only after validation and founder review | Validate rights, scale and destination mapping |
| glTF | Yes | Yes | Yes | Candidate only after local dependencies and founder review | Resolve buffers, images and external URI findings |
| FBX / OBJ / USD / USDZ / IFC | Yes | Limited | Format-dependent | Requires verified derivative path | Provide reviewed GLB where practical |
| MAX / SKP / RVT / BLEND / 3DM / C4D | Yes | Limited | No generic native validation | Requires native software/export | Supply native package plus controlled GLB export |
| Unreal / Unity project | Yes | Dependency inventory | No generic project execution | Not loaded by the browser | Supply governed runtime derivative |
| Equirectangular panorama | Yes | Dimensions, EXIF class | 2:1 and resolution | Candidate when rights/GPS pass | Supply camera heading, height and destination |
| Flat render | Yes | Dimensions | Flat classification | Enhanced 2D reference only | Never stretch into 360 |
| STL / 3MF | Yes | Limited | Inventory only in EX.1F | Not a KAP runtime scene | Follow physical deployment profile later |
| Projection UV / masks / calibration | Yes | Limited | Inventory only | No device command | Follow `MEIOS-PDT-STD-001` and approved profile |

Any invalid, rights-blocked, privacy-quarantined or dependency-incomplete asset is kept out of the canonical Scene Gateway.
