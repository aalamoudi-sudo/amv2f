# Universal Project Portfolio Model

## Purpose

Mayadeen Event Intelligence OS is one reusable platform. A project selects and configures platform capabilities; it never creates a copied application or a project-specific deployment.

The canonical hierarchy is:

```text
Organization
-> Project
-> Event Instance
-> Venue
-> Zone / Route / Asset
-> Operational Objects
```

`Project`, `Event Instance`, and `Venue` are separate records. A project may own several events, venues, operational packs, and event themes. Operational objects remain inside the selected project and event boundary.

## ProjectWorkspace contract

The typed contract is `ProjectWorkspace` in `src/types/projectWorkspace.ts`.

| Field | Meaning |
| --- | --- |
| `projectId` | Stable platform project identifier |
| `organizationId` | Owning organization identifier |
| `nameAr`, `nameEn`, `description` | Project identity and useful description |
| `projectStatus` | Commercial and lifecycle state: `draft`, `candidate`, `active`, `paused`, `completed`, or `archived` |
| `truthContext` | Data truth boundary: `temporary-demo`, `baseline`, or `scenario` |
| `projectType` | Event-agnostic portfolio classification |
| `eventIds`, `venueIds`, `defaultEventId` | Explicit project relationships |
| `themeId` | Default event-theme package reference |
| `operationalPackIds` | Runtime, experience, and other project pack references |
| `sourceReferences` | Source identity, classification, status, and note |
| `owner` | Owning organization display identity |
| `dateRange` | Project date range, time zone, and assumption disclosure |
| `createdAt`, `updatedAt`, `revision`, `contentHash` | Version and integrity metadata |

The local contract also carries `sourceClassification` and `sourceStateAr` so portfolio presentation can distinguish a real candidate from demo and reference projects without inferring truth from lifecycle status.

Project lifecycle status is not operational readiness. `active` never means a zone is ready, and `candidate` never means operational approval.

## Registry

`ProjectRegistry` is a replaceable local repository boundary. It supports listing, stable-ID lookup, event and venue resolution, default-event resolution, theme resolution, pack ownership checks, and reverse event lookup. A future backend may implement the same read contract without changing workspace components.

Construction fails when it finds:

- Duplicate project, event, venue, pack, or theme IDs.
- A dangling event, venue, theme, default-event, or pack reference.
- An event, venue, or pack attached across project boundaries.
- A pack whose event is not owned by the same project.
- A theme whose event boundary conflicts with the project event.

## Registered local projects

| Project | Event | Venue | Classification | Lifecycle |
| --- | --- | --- | --- | --- |
| `PROJECT-KAP-OPENING-2026` | `EVENT-KAP-OPENING-2026` | `VENUE-KAP-001` | Real candidate | `candidate` |
| `PROJECT-REFERENCE-EXHIBITION-001` | `EVENT-EXHIBITION-DEMO-001` | `VENUE-EXHIBITION-DEMO-001` | Demo | `active` lifecycle only |
| `PROJECT-REFERENCE-CONFERENCE-001` | `EVENT-CONFERENCE-DEMO-001` | `VENUE-CONFERENCE-DEMO-001` | Reference | `paused` |
| `PROJECT-REFERENCE-FESTIVAL-001` | `EVENT-FESTIVAL-DEMO-001` | `VENUE-FESTIVAL-DEMO-001` | Reference | `archived` |
| `PROJECT-DEMO-LOCAL-001` | `EVENT-DEMO-001` | `VENUE-DEMO-001` | Demo | `active` lifecycle only |
| `PROJECT-DEMO-EXPERIENCE-001` | `EVENT-DEMO-EXPERIENCE-001` | `VENUE-DEMO-EXPERIENCE-001` | Demo | `active` lifecycle only |
| `PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001` | `EVENT-CONFERENCE-TEST-001` | `VENUE-CONFERENCE-TEST-001` | Reference | `paused` |

`PROJECT-KAP-OPENING-2026` is a documented candidate identifier created because no externally approved project ID exists in the current repository truth. It is not claimed as externally approved.

KAP retains these constraints:

- The project is `candidate`.
- Its truth context is non-operational and no readiness or live state is invented.
- The current DWG source is provisional and has no approved geometry authority.
- The five experience areas remain logical relationships, not mapped geometry.
- Demo and reference projects cannot share KAP events, venues, packs, sources, or theme assets.

## CAD readiness chain

An approved CAD source may later connect only through this project-scoped chain:

```text
PROJECT-KAP-OPENING-2026
-> EVENT-KAP-OPENING-2026
-> VENUE-KAP-001
-> approved CAD source
-> spatial adapter
-> existing permanent zone IDs
```

UX.1C does not ingest, approve, or reclassify CAD. A future approved source replaces the provisional relationship inside KAP; it does not become a global platform asset.
