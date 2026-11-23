---
name: add-overlay
description: >-
  Add or update curated GeoJSON map overlays under overlays/<category>/ following
  project schemas and taxonomy. Use when adding places, nature, transport, culture,
  or community features; creating overlay files; validating FeatureCollections;
  or when the user asks to contribute map data / layers / POIs to this repo.
---

# Add Overlay

## Simplicity

No builds. Fastest path: edit `overlays/<category>/*.geojson` → `node scripts/validate-overlays.mjs` → summarize for PR. Do not add bundlers, APIs, or databases.

## When to use

User wants new map pins/features, a new overlay file, or fixes to existing GeoJSON under `overlays/`.

## Workflow

Copy and track:

```
Overlay progress:
- [ ] 1. Pick category (MVP: places|nature|transport|culture|community)
- [ ] 2. Choose file path overlays/<category>/<dataset>.geojson
- [ ] 3. Add Feature(s) with required properties
- [ ] 4. Validate against schemas/overlay.schema.json (+ taxonomy kinds)
- [ ] 5. Ensure properties.id unique repo-wide
- [ ] 6. Summarize for human review (esp. community)
```

### 1. Pick category

| Folder | Use for | Review |
|--------|---------|--------|
| `family` | **Priority** — playgrounds, nursing/changing, kids café, midwife, pediatric | open |
| `places` | Amenities: pharmacy, family café, toilets, libraries | open |
| `nature` | Viewpoints, trailheads, swim/picnic, dark-sky | open |
| `transport` | Bike parking, EV, carshare, micromobility hubs | open |
| `culture` | Murals, venues, memorials, exhibitions | open |
| `community` | Parent/women support, diaper bank, toy library | **human review** |

Product focus: **women, children, caregivers**. Never map confidential refuges.

Do not create `hazards` unless the plan/phase explicitly allows it.

Berlin test city datasets: `overlays/<category>/berlin.geojson`.

### 2. Feature template

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [13.405, 52.52] },
  "properties": {
    "id": "places/berlin-example-slug",
    "name": "Human-readable name",
    "category": "places",
    "kind": "drinking_water",
    "source": "survey",
    "verified_at": "2026-03-20",
    "license": "ODbL-1.0",
    "extra": { "city": "Berlin" }
  }
}
```

Coordinates are `[longitude, latitude]` (GeoJSON order).

### 3. Kind allow-list (MVP)

Canonical list: `schemas/taxonomy.json` (also [reference.md](reference.md)). Prefer an existing `kind`; only extend with a note in the category README **and** taxonomy.

### 4. Validation

- Schema: `schemas/overlay.schema.json` (kinds constrained per category)
- Taxonomy: `schemas/taxonomy.json`
- SDK: `validateFeature` / `validateFeatureCollection` in `packages/sdk`
- MCP: `packages/mcp` tools (`list_layers`, `validate_overlay`, `propose_feature`, …) — same files, no silent push
- `category` must equal parent folder name
- No PII (phones of private people, home addresses framed as private)
- Agents set `source: "agent"` when drafting from models/tools
- For `community`: also set `extra.needs_review: true` and open a draft PR with `needs-human-review`

### 5. After editing

- Do not commit/push unless the user asks
- Point reviewers to the new/changed file paths and feature ids
- After merge + green CI, pins are visible on `apps/demo/`

## Additional resources

- [reference.md](reference.md) — kinds, sources, non-goals
- [examples.md](examples.md) — sample FeatureCollections
- Project plan: `docs/PLAN.md`
