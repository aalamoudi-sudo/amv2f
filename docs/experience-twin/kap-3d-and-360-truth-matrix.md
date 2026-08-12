# KAP 3D and 360 Truth Matrix

| Slot | Current state | May be shown as | Must not be shown as | Replacement input |
| --- | --- | --- | --- | --- |
| Native Rhino | verified private source; founder-approved design intent | source authority and fingerprint | browser asset, engineering model, as-built | immutable next studio revision |
| Diagnostic GLB | verified, staged locally, review-only | interactive Web3D design preview | production export, complete site, route geometry | studio GLB plus dependency manifest |
| Flat review image | verified safe derivative | flat source reference | interactive 3D or 360 | approved render revision |
| Production GLB | missing | `غير متوفر` | silently substituted candidate | studio-approved export |
| Packaged textures | missing/excluded | `غير متوفرة` | invented materials | hashed texture package and rights |
| Named cameras | missing | generated review cameras clearly labeled | visitor anchors or production cameras | studio camera manifest |
| Panorama 2:1 | missing | `بانوراما 360 غير متوفرة لهذا المشهد` | stretched/cropped embedded image | genuine equirectangular 2:1 asset |
| Engineering registration | missing | `غير مسجل هندسيًا` | surveyed or calibrated position | origin, north, CRS/control points and authority |
| Semantic identity | proposed to entity 006 and zone object | medium-confidence proposed relation | confirmed Mamar Al-Osour identity | founder/studio confirmation |
| Operational route | none | no route | camera tour or mesh silhouette as route | separately approved route source |
| Readiness | `cannot-determine` | unchanged readiness truth | completion/readiness inference | legal readiness requirements and evidence |

## Future adapter slots

The scene gateway recognizes `web3d`, `panorama-2to1`, `render-reference` and
`live-camera-metadata` as separate media capabilities. Only `web3d` is supplied
for this revision. A future asset must keep the same project-scoped scene ID or
create a traceable superseding scene revision; it may not silently replace the
truth class.
