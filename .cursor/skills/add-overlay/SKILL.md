---
name: add-overlay
description: >-
  Add or update curated GeoJSON map overlays under overlays/<category>/ following
  project schemas and taxonomy. Use when adding places, nature, transport, culture,
  or community features; creating overlay files; validating FeatureCollections;
  or when the user asks to contribute map data / layers / POIs to this repo.
---

# Add Overlay

## When to use

User wants new map pins/features, a new overlay file, or fixes to existing GeoJSON under `overlays/`.

## Workflow

Copy and track:

```
Overlay progress:
- [ ] 1. Pick category (MVP: places|nature|transport|culture|community)
- [ ] 2. Choose file path overlays/<category>/<dataset>.geojson
- [ ] 3. Add Feature(s) with required properties
- [ ] 4. Validate against schemas/overlay.schema.json
- [ ] 5. Ensure properties.id unique repo-wide
- [ ] 6. Summarize for human review (esp. community)
```

### 1. Pick category

| Folder | Use for |
|--------|---------|
| `places` | Amenities: water, toilets, cafés, libraries, coworking |
| `nature` | Viewpoints, trailheads, swim/picnic, dark-sky |
| `transport` | Bike parking, EV, carshare, micromobility hubs |
| `culture` | Murals, venues, memorials, exhibitions |
| `community` | Mutual aid, repair cafés, cooling centers — **human review** |

Do not create `hazards` unless the plan/phase explicitly allows it.

### 2. Feature template

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [25.0, 44.4] },
  "properties": {
    "id": "places/example-slug",
    "name": "Human-readable name",
    "category": "places",
    "kind": "drinking_water",
    "source": "survey",
    "verified_at": "2026-03-20",
    "license": "ODbL-1.0",
    "extra": {}
  }
}
```

Coordinates are `[longitude, latitude]` (GeoJSON order).

### 3. Kind allow-list (MVP)

See [reference.md](reference.md). Prefer an existing `kind`; only extend with a note in the category README.

### 4. Validation

- Schema: `schemas/overlay.schema.json`
- `category` must equal parent folder name
- No PII (phones of private people, home addresses framed as private)
- Agents set `source: "agent"` when drafting from models/tools

### 5. After editing

- Do not commit/push unless the user asks
- Point reviewers to the new/changed file paths and feature ids

## Additional resources

- [reference.md](reference.md) — kinds, sources, non-goals
- [examples.md](examples.md) — sample FeatureCollections
- Project plan: `docs/PLAN.md`
