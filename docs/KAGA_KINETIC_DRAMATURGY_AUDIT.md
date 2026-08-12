# KAGA Kinetic Dramaturgy Audit

## Scope and invariants

This audit covers only the live 92-second Executive Delight sequence. It changes camera, crop, focus, route-reveal emphasis, typography hierarchy, and annotation focus. Guest Journey geometry, stops, durations, `pathProgress`, source relationships, and the approved Visual Rebirth art direction remain unchanged.

The sequence is intentionally described as presentation choreography, not as source event time or a simulation.

## Motion vocabulary

| Token | Purpose | Motion character |
|---|---|---|
| `cinematicDescent` | opening to site | long, restrained match movement |
| `siteReveal` | photographic to illustrated world | precise spatial correspondence |
| `spatialApproach` | map travel and source-image reframing | controlled scale and focus shift |
| `journeyTrace` | route emergence | progressive source-route drawing |
| `arrivalSettle` | arrival at C | deceleration followed by a short hold |
| `apertureExpand` | map to experience | spatial-origin mask expansion |
| `xrayFocus` | annotation sequence | active focus with architectural residue |
| `spatialCollapse` | experience to map | reverse aperture toward the same anchor |
| `royalTease` | final source-material reveal | warm, restrained concluding emphasis |

## Two-second temporal sample

| Time | Scene | cameraState | primaryVisualSubject | cropState | routeState | textHierarchy | visualDifferenceFromPrevious |
|---:|---|---|---|---|---|---|---|
| 00 | Opening | cinematic-majesty | aerial source image | full-bleed wide | hidden | identity absent | opening composition begins |
| 02 | Opening | cinematic-majesty | title and aerial | slow descent | hidden | monumental title | title resolves over settling image |
| 04 | Opening | cinematic-majesty | site signal | center correspondence | hidden | title + site signal | spatial correspondence becomes visible |
| 06 | Map | site-reveal | whole site | full spatial overview | latent | title releases | aerial yields to illustrated site |
| 08 | Map | site-reveal | illustrated layers | overview settles | latent | journey identity enters | spatial layers gain clarity |
| 10 | Map | route-origin | stop A | crop toward A | origin only | journey title leads | camera moves to route origin |
| 12 | Map | route-origin | A and journey identity | origin hold | origin only | title + start action | itinerary resolves intentionally |
| 14 | Map | route-awakening | first segment | closer A crop | A active / first trace | current stop leads | route begins drawing |
| 16 | Map | route-awakening | A toward B | increased map scale | current segment | current + next | rail advances with route |
| 18 | Map | approach-b | approach to B | focus transfers to B | A→B active | next gains weight | camera changes spatial subject |
| 20 | Map | approach-b | B | local B crop | A→B near complete | B anticipated | B becomes visually legible |
| 22 | Map | travel-ab | moving marker | moving focus | A→B active | UI reduced | camera and route travel together |
| 24 | Map | travel-ab | approved path | progressive crop | A→B active | utility secondary | focus follows `pathProgress` |
| 26 | Map | travel-ab | B handoff | B transition crop | A→B completes | B current | route context changes at B |
| 28 | Map | travel-bc | B→C movement | deeper C approach | B→C active | C anticipated | scale and origin shift toward C |
| 30 | Map | travel-bc | route to reception | tight travel crop | B→C active | map dominates | interface recedes |
| 32 | Map | arrival-approach | C vicinity | local arrival crop | current segment slows | C title latent | route behind softens |
| 34 | Map | arrival-approach | marker at C | tighter C focus | deceleration | C title prepares | marker decelerates visibly |
| 36 | Map | arrival-settle | stop C | C hero crop | C reached | stop identity leads | arrival composition becomes distinct |
| 38 | Map | arrival-settle | C title and duration | settled C crop | past softened | title + 60 minutes | typography arrives after focus |
| 40 | Map | arrival-settle | C anchor | short calm hold | C current | duration precise | intentional breath before aperture |
| 42 | Transition | aperture-origin | C anchor | circular origin | C visible below | stop title supporting | aperture originates at real anchor |
| 44 | Transition | aperture-origin | image texture | expanding circular crop | C partially visible | title withheld | source texture enters aperture |
| 46 | Transition | aperture-expand | Ardah image | expanding to full field | route receding | title withheld | map remains perceptually connected |
| 48 | Experience | experience-wide | wide Ardah scene | establishing wide | hidden | title latent | image consumes visual field |
| 50 | Experience | experience-wide | Ardah + title | wide safe crop | hidden | monumental title | title enters last |
| 52 | X-Ray | xray-place | location context | wide | hidden | title reduces / location active | X-Ray hierarchy begins |
| 54 | X-Ray | xray-place | location relationship | wide hold | hidden | location annotation leads | leader geometry resolves |
| 56 | X-Ray | xray-journey | performers | closer performers crop | hidden | journey active | image focus moves to performers |
| 58 | X-Ray | xray-protocol | ceremonial axis | flag-emphasis crop | hidden | protocol active | vertical ceremonial focus appears |
| 60 | X-Ray | xray-protocol | protocol relationship | flag crop hold | hidden | protocol + faint residue | previous annotations become architecture |
| 62 | X-Ray | xray-experience | group context | contextual group crop | hidden | experience active | crop releases toward group |
| 64 | X-Ray | xray-content | wide context | wide release | hidden | content active | scene reopens for final relation |
| 66 | X-Ray | xray-content | intelligent drawing | wide hold | hidden | five-beat residue | fifth source-backed relation completes |
| 68 | Return | spatial-collapse | image toward C | contracting aperture | C emerging below | annotations release | reverse spatial transformation starts |
| 70 | Return | spatial-collapse | map beneath image | smaller anchor crop | C route visible | experience title absent | route geometry reappears |
| 72 | Map | return-c | stop C | restored C crop | same C progress | stop hierarchy restored | exact spatial context returns |
| 74 | Map | return-c | onward direction | C releases | next segment anticipated | D becomes next | no post-return plateau |
| 76 | Map | garden-approach | C→D route | moving D focus | C→D active | UI secondary | journey immediately continues |
| 78 | Map | garden-approach | moving marker | progressive D crop | C→D active | D anticipated | camera travels on approved geometry |
| 80 | Map | garden-glimpse | D / حديقة الخيارات | D local crop | nearing D | garden name leads | new spatial subject appears |
| 82 | Map | garden-glimpse | verified options garden | brief destination hold | D reached | name + 6 minutes | high-confidence garden glimpse settles |
| 84 | Tease | royal-trace | inauguration model | full source visual | route quiets | Royal title latent | map yields to approved Royal material |
| 86 | Tease | royal-trace | model illumination | slow source crop | hidden | supporting line enters | warm ceremonial emphasis develops |
| 88 | Tease | royal-hold | لحظة التدشين | final visual hold | hidden | monumental Royal title | final subject and hierarchy resolve |
| 90 | Tease | royal-hold | Royal source visual | restrained hold | hidden | title remains | intentional open-ending breath |
| 92 | Complete | royal-hold | final identity | stable source frame | hidden | final identity | live sequence completes |

## Plateau finding

Automated unit validation enforces contiguous camera states with a maximum duration of six seconds. The two prior plateaus are removed:

- The map interval is now split into origin, awakening, approach B, travel A→B, travel B→C, arrival approach, and arrival settle.
- The experience interval is now a wide establishing shot followed by five three-second X-Ray beats using four safe crops of the same approved image.

No interval exceeds six seconds without a camera-state or primary-subject change. The six-second opening is the only maximum-length hold and retains continuous restrained image settling as its narrative reason. `STATIC_PLATEAU` count: **0 unjustified sections**.
