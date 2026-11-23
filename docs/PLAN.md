# World Map Open Source — Product Plan

> Collaborative, git-native map overlays on top of OpenFreeMap + MapLibre.  
> We do **not** rebuild OSM or run a tile farm.

---

## 1. Vision

A thin open-source layer on top of free basemaps where **humans and AI agents** contribute curated GeoJSON overlays via pull requests. Differentiation:

| We reuse | We own |
|----------|--------|
| OpenFreeMap / OSM tiles | Overlay taxonomy + schemas |
| MapLibre GL | Thin TypeScript SDK |
| GitHub PRs / CI | Agent contribution conventions |

**Tagline:** *The map base is free. The curated layers are the product.*

---

## 2. Local vs Repo Split

### LOCAL (agent tooling — create first)

| Path | Purpose | Git? |
|------|---------|------|
| `docs/PLAN.md` | Full product plan + taxonomy | **Commit** (shared roadmap) |
| `.cursor/plans/` | Cursor-facing plan pointer | **Commit** |
| `.cursor/rules/` | Agent conventions for this repo | **Commit** |
| `.cursor/skills/` | How to add overlays / layers | **Commit** |
| Agent stores / personal notes | Private agent memory | **Never commit** |

**Recommendation:** Commit `.cursor/rules` and `.cursor/skills` so every contributor (human or agent) gets the same conventions. Keep personal Cursor agent stores and secrets out of git (see `.gitignore`).

### REPO (implementation — what ships to GitHub)

| Path | Purpose | MVP? |
|------|---------|------|
| `README.md` | Project intro + quick start | Yes |
| `CONTRIBUTING.md` | How to add overlays | Yes |
| `schemas/` | JSON Schema for overlays & features | Yes |
| `overlays/<category>/` | Curated GeoJSON FeatureCollections | Yes |
| `apps/demo/` | MapLibre demo consuming overlays | Yes |
| `packages/sdk/` | Thin TS helpers (load, validate, style) | Yes (stub) |
| `.github/workflows/` | CI: schema validate overlays | Yes |
| MCP server | File-backed agent tools | Later |

Remote: https://github.com/petrovicistefan/world-map-open-source.git

---

## 3. Architecture (MVP)

```
┌─────────────────────────────────────────────┐
│  Demo (MapLibre)                            │
│  + OpenFreeMap style (base tiles)           │
│  + SDK.loadOverlays() → GeoJSON sources     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  overlays/<category>/*.geojson              │
│  validated by schemas/ + CI                 │
└─────────────────────────────────────────────┘
```

**Principles**

1. Never invent a tile server or fork OSM data into this repo.
2. One FeatureCollection file per logical dataset under a category folder.
3. Properties are schema-validated; unknown keys allowed only under `properties.extra`.
4. Agents propose overlays via PR; humans review sensitive categories.

---

## 4. Layer & Category Taxonomy

### 4.1 Layer model

| Layer type | Source | Editable in-repo? |
|------------|--------|-------------------|
| **Base** | OpenFreeMap / OSM via MapLibre style | No |
| **Overlay categories** | GeoJSON under `overlays/` | Yes |
| **App / user namespaces** | `overlays/_ns/<app-id>/` (later) | Yes (namespaced) |

Toggleable in the UI = one MapLibre source+layer group per category (or per file).

### 4.2 Categories (folders under `overlays/`)

#### MVP (start here — 5 curated folders)

| # | Slug / id | Features belong here | Example properties | Contributors | Priority |
|---|-----------|----------------------|--------------------|--------------|----------|
| 1 | `places` | Cafés, coworking, libraries, free toilets, drinking water, ATMs with known fees | `name`, `kind`, `opening_hours?`, `website?`, `verified_at`, `source` | Humans + agents | **MVP** |
| 2 | `nature` | Viewpoints, trailheads, swimming spots, picnic areas, dark-sky sites | `name`, `kind`, `access`, `difficulty?`, `season?` | Humans + agents | **MVP** |
| 3 | `transport` | Bike parking, EV chargers, carshare pods, micromobility hubs (gaps vs OSM) | `name`, `kind`, `operator?`, `capacity?`, `fee?` | Humans + agents | **MVP** |
| 4 | `culture` | Murals, indie venues, memorials, temporary exhibition pins | `name`, `kind`, `artist?`, `start_date?`, `end_date?` | Humans + agents | **MVP** |
| 5 | `community` | Mutual-aid drop points, free Wi‑Fi, tool libraries, repair cafés, cooling centers | `name`, `kind`, `org?`, `contact?`, `hours?` | Humans (agents draft only) | **MVP** |

#### Later (design now, folders optional / empty)

| # | Slug / id | Features | Example properties | Contributors | Priority |
|---|-----------|----------|--------------------|--------------|----------|
| 6 | `events` | Time-bound pins (festivals, markets) — requires `start`/`end` | `name`, `start`, `end`, `url?` | Humans + agents | Later |
| 7 | `hazards` | Flood zones, road closures, wildfire perimeters — **strict review** | `kind`, `severity`, `valid_until`, `authority` | Humans only | Later |
| 8 | `accessibility` | Step-free routes, accessible toilets, quiet spaces | `kind`, `wheelchair`, `notes` | Humans + agents | Later |
| 9 | `food_rescue` | Surplus food / community fridges | `name`, `hours`, `org` | Humans | Later |
| 10 | `_ns/<app>` | App-private or branded overlays (e.g. `_ns/my-tour`) | App-defined + `namespace` | App owners | Later |

### 4.3 Feature `kind` examples (per category)

```
places:      cafe | coworking | library | toilet | drinking_water | atm | wifi
nature:      viewpoint | trailhead | swim | picnic | dark_sky | park_gate
transport:   bike_parking | ev_charger | carshare | micromobility
culture:     mural | venue | memorial | exhibition
community:   mutual_aid | tool_library | repair_cafe | cooling_center | free_wifi
```

### 4.4 Shared feature property contract (MVP)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [lon, lat] },
  "properties": {
    "id": "places/bucharest-free-water-01",
    "name": "Drinking fountain — Cișmigiu",
    "category": "places",
    "kind": "drinking_water",
    "source": "survey|osm-gap|agent|import",
    "verified_at": "2026-03-20",
    "license": "ODbL-1.0",
    "extra": {}
  }
}
```

Rules:

- `id` = unique, stable, kebab-case, preferably `<category>/<slug>`.
- Geometry: Points first in MVP; LineString/Polygon allowed later for trails/areas.
- No PII (personal addresses, private phone numbers).
- Hazards and live alerts: never auto-merge from agents.

### 4.5 Folder layout

```
overlays/
  places/
    README.md                 # category purpose + kinds
    sample-bucharest.geojson  # MVP sample
  nature/
  transport/
  culture/
  community/
```

---

## 5. SDK (thin)

`packages/sdk` responsibilities (MVP stub → expand):

- `listCategories()` / `listOverlays(category?)`
- `loadOverlay(path)` → GeoJSON
- `validateFeature(feature)` against JSON Schema
- `toMapLibreSources(overlays)` → style fragments

No hosting, no auth, no tile generation.

---

## 6. Demo app

`apps/demo`: static MapLibre page

- Base style: OpenFreeMap
- Layer switcher for the 5 MVP categories
- Click → popup from properties
- Load overlays from relative paths or GitHub raw (dev)

---

## 7. CI

- Validate every `overlays/**/*.geojson` against `schemas/overlay.schema.json`
- Fail on duplicate `properties.id`
- Optional: bbox sanity, required fields

---

## 8. MCP (future — plan only)

File-backed MCP server (not implemented yet) for agents working outside Cursor:

| Tool | Behavior |
|------|----------|
| `list_layers` | Return category taxonomy + MVP flags |
| `list_overlays` | List GeoJSON files under `overlays/` |
| `get_overlay` | Read one FeatureCollection |
| `validate_overlay` | Run schema + id uniqueness checks |
| `get_map_style` | Return base style URL + overlay style hints |
| `propose_feature` | Validate a feature draft; write to a branch/path suggestion (no silent push) |

Backed by the same `schemas/` and `overlays/` tree — MCP is a thin I/O facade, not a second data store.

---

## 9. Contribution model

1. Pick category → add or edit `.geojson`.
2. Run / rely on CI schema validation.
3. Open PR; for `community` / future `hazards`, require human review label.
4. Agents: follow `.cursor/skills/add-overlay` and never invent basemap tiles.

---

## 10. Roadmap

| Phase | Deliverable |
|-------|-------------|
| **Now** | Plan + rules + skills + light scaffold (this workspace) |
| **MVP** | README, schemas, samples, demo, CONTRIBUTING, CI → first commit/push |
| **v0.2** | SDK publishable package, more cities, layer switcher polish |
| **v0.3** | Events + accessibility categories |
| **Later** | MCP server, `_ns/` namespaces, hazards with strict policy |

---

## 11. Non-goals

- Hosting our own vector tile pipeline
- Competing with OSM editors for general POI editing
- Real-time multiplayer map sync (git PRs are the collaboration model for v1)
- Storing copyrighted basemap tiles in-repo

---

## 12. Suggested next step

1. Review taxonomy (especially MVP 5 categories).
2. Flesh demo + sample overlays for one city.
3. User asks explicitly → **commit + push** to `world-map-open-source`.
4. Optionally scaffold MCP stub after MVP lands.
