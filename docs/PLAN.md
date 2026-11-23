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

**Product focus:** services useful to women + spaces for children (playgrounds, Kita/creche, changing/nursing). Curated pins that fill OSM gaps — not a full amenity mirror.

---

## 2. Agent loop (primary pillar)

Any agent (or site) should be able to:

1. **Consume** — drop this map into *their* demo in minutes (no fork required just to show pins).
2. **Contribute** — if they have a new place, validate + open a **PR proposal** (never silent push to `main`).

**Rule:** showing the map does **not** require a PR; adding data **does**.

```
GitHub Pages / raw URLs
        │
        ▼
 overlays/manifest.json  ──►  drop-in MapLibre snippet  ──►  agent / site demo
                                      │
                                      │  (optional: new pin)
                                      ▼
                         propose_feature / validate
                                      │
                                      ▼
                         fork / branch → Pull Request → CI → human merge
```

### 2.1 Consume (fast post into a demo)

Stable **overlay manifest** + **copy-paste embed** (no API server, no auth, no tile cache):

| Artifact | Purpose |
|----------|---------|
| `overlays/manifest.json` | `{ id, category, url, color, icon }` list + taxonomy URL (Pages/raw absolute URLs) |
| `apps/embed/` (or docs snippet) | Thin static HTML/JS: OpenFreeMap + `fetch(manifest)` → MapLibre layers |
| MCP `get_embed_snippet` | Returns the HTML/JS fragment with correct absolute base URLs |
| Docs page | “Agent: show this map in 5 minutes” + ODbL / OpenFreeMap attribution |

Agents and third-party demos fetch **one manifest file**, then the GeoJSON URLs it lists.

### 2.2 Contribute (push proposal)

Git remains the collaboration model:

1. Draft a Feature (`propose_feature` dry-run via MCP or `.cursor/skills/add-overlay`).
2. Validate (MCP / `scripts/validate-overlays.mjs` / CI).
3. Fork or branch → append to `overlays/<category>/<city>.geojson` → **open PR** (template in `CONTRIBUTING.md`).
4. `community` → human review; other MVP categories → open + CI.

v0.3: MCP `prepare_contribution` / `open_pr` creates a branch + **draft PR** via `gh` when credentials exist — still **never** force-push or auto-merge.

Agent skill must document the two-phase flow: **embed first**, **PR only when adding data**.

### 2.3 Update & load pipeline (easy updates, fast map)

Goal: a pin change should be **one GeoJSON edit → validate → merge**, and consumers (demo, embed, third-party agents) should see it **without republishing their own site**. The map must feel instant on a normal mobile connection.

#### End-to-end update path

```
edit overlays/<cat>/<city>.geojson
        │
        ▼
  validate (local script / MCP / CI)     ~1–5 s
        │
        ▼
  merge PR → push main
        │
        ▼
  GitHub Pages deploy (existing workflow)  typically ~1–3 min
        │
        ▼
  Pages serves new GeoJSON + manifest
        │
        ▼
  Consumer refresh / next fetch          no rebuild of their demo
```

| Step | Who | Speed target |
|------|-----|--------------|
| Edit one Feature in GeoJSON | Human or agent | seconds (file edit, no build) |
| Validate schema + unique ids | `scripts/validate-overlays.mjs` or MCP | &lt; 5 s locally |
| CI on PR | GitHub Actions | ~1 min |
| Publish after merge | Pages deploy on `main` | ~1–3 min to live URLs |
| Third-party / agent demo picks up data | Re-`fetch` manifest + GeoJSON | **zero** redeploy of their page if they load from our Pages URLs |

**Easy update rules**

1. **One file per city/category** — append a Feature; don’t invent new pipelines.
2. **Manifest is the only index** consumers need; regenerating it (v0.2) is a tiny JSON rewrite when categories/URLs change — day-to-day pin edits only touch `.geojson`.
3. **No bundler / no compile** — merge = static files on Pages.
4. **Consumers pin our Pages base URL** (or raw), not a vendored copy of overlays — so upstream merges propagate on next load.
5. Optional later: `?v=<git-sha>` or short `Cache-Control` on GeoJSON so updates aren’t stuck behind long CDN caches (document in Pages/headers notes for v0.2).

#### Load path (how fast the map appears)

Two parallel tracks on first paint:

| Track | What | Typical size / cost |
|-------|------|---------------------|
| **Basemap** | OpenFreeMap vector tiles via MapLibre | CDN; progressive (map usable before overlays) |
| **Overlays** | `manifest.json` then N small GeoJSON files in **parallel** `fetch` | Manifest ≪ 5 KB; Berlin MVP ~7 files, tens of KB total today |

**Load budget (v0.2 target for Berlin-scale overlays)**

1. Paint basemap shell as soon as MapLibre + style resolve (don’t block on overlays).
2. Fetch `manifest.json` first (~one RTT).
3. Fetch all listed GeoJSON **in parallel** (`Promise.all`); add sources/layers as each arrives (or all-at-once if simpler — prefer parallel).
4. Overlay payload stay **curated and small** (points, not city extracts). Soft ceiling: prefer &lt; ~200 KB total overlay JSON per city for “feels instant”; split by city/category before inventing tiles.
5. Icons: reuse taxonomy SVG once per category (already in demo); don’t download per-pin images.
6. No runtime geocoding, no Overpass on the critical path — pins are pre-authored GeoJSON.

```
t0     MapLibre + OFM style          → basemap visible
t0+ε   fetch manifest                → know overlay URLs
t0+ε'  parallel fetch *.geojson      → pins appear (often same second on broadband)
```

If overlays grow later: still prefer more **city files** over a monolithic dump; never move the critical path onto a custom tile farm.

---

## 3. Demand vs fit

| Demand signal | Examples | Fit for us? |
|---------------|----------|-------------|
| Drop map into third-party demos / agent UIs | Embeds, agent sandboxes | **Primary** — manifest + embed |
| Easy data updates that propagate without consumer rebuilds | Git → Pages → re-fetch | **Primary** — static GeoJSON + short update path (§2.3) |
| Fast first load (basemap then pins) | Progressive MapLibre + small overlays | **Primary** — parallel fetch, curated size (§2.3) |
| Propose curated pins back upstream | Agent → PR | **Primary** — validate → PR |
| Family outing amenity **detail** (changing location men/unisex, nursing privacy, playground fenced/shade/age) | KidMap, Kidibou, MaterMap, PapaMap; OSM `changing_table:location` often missing | **Yes** — curated `extra.*` on pins; fill gaps, don’t mirror all playgrounds |
| Women-useful local services | Salon, tailor, laundry, midwife | **Yes** — denser `services` / `family` |
| Agent map tools: list / filter / nearest / provenance | Mappt MCP, PoGeo, Geoapify | **Yes** — extend our file-backed MCP (~10 tools) |
| Realtime multiplayer map edit | Mapforge, Atlasdraw, GeoLibre, Driades | **No** — git PRs are the collab model |
| Full GIS / routing / geocoder farm | gis-mcp (90+ tools), Geoapify | **No** — deep-link to Apple/Google Maps; reuse OpenFreeMap |

Differentiation: **git-native curated overlays + agent validation**, focused on women/children — not another collaborative GIS canvas.

---

## 4. Local vs Repo Split

### LOCAL (agent tooling)

| Path | Purpose | Git? |
|------|---------|------|
| `docs/PLAN.md` | Full product plan + taxonomy | **Commit** (shared roadmap) |
| `.cursor/` | Local Cursor rules/skills/MCP config | **Never commit** (gitignored) |
| Agent stores / personal notes | Private agent memory | **Never commit** |

Shared conventions for contributors live in `CONTRIBUTING.md`, `docs/PLAN.md`, and category READMEs under `overlays/`.

### REPO (implementation — what ships to GitHub)

| Path | Purpose | Status |
|------|---------|--------|
| `README.md` | Project intro + quick start | MVP ✅ |
| `CONTRIBUTING.md` | How to add overlays + PR template | MVP ✅ |
| `schemas/` | JSON Schema for overlays & features | MVP ✅ |
| `overlays/<category>/` | Curated GeoJSON FeatureCollections | MVP ✅ |
| `overlays/manifest.json` | Stable URL list for agents/embeds | v0.2 |
| `apps/demo/` | MapLibre demo consuming overlays | MVP ✅ |
| `apps/embed/` | Minimal drop-in map for third parties | v0.2 |
| `packages/sdk/` | Thin helpers (load, validate, style) | MVP ✅ (stub) |
| `.github/workflows/` | CI: schema validate overlays | MVP ✅ |
| `packages/mcp` | File-backed agent tools | MVP ✅ (stub) |

Remote: https://github.com/petrovicistefan/world-map-open-source.git

---

## 5. Architecture (MVP)

```
┌─────────────────────────────────────────────┐
│  Demo / Embed (MapLibre)                    │
│  + OpenFreeMap style (base tiles)           │
│  + manifest / GeoJSON → sources + layers    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  overlays/<category>/*.geojson              │
│  validated by schemas/ + CI                 │
└─────────────────────────────────────────────┘
```

**Principles**

1. **No builds** — static GeoJSON + HTML/JS; only schema/id validation as tooling.
2. Never invent a tile server or fork OSM data into this repo.
3. One FeatureCollection file per logical dataset under a category folder.
4. Properties are schema-validated; unknown keys only under `properties.extra`.
5. Agents propose overlays via PR; humans review sensitive categories.
6. Prefer the shortest path to put a pin on the map (edit file → validate → merge).
7. Agents may **show** the map via Pages URLs without contributing; contributions go through PRs.

---

## 6. Layer & Category Taxonomy

### 6.1 Layer model

| Layer type | Source | Editable in-repo? |
|------------|--------|-------------------|
| **Base** | OpenFreeMap / OSM via MapLibre style | No |
| **Overlay categories** | GeoJSON under `overlays/` | Yes |
| **App / user namespaces** | `overlays/_ns/<app-id>/` (later) | Yes (namespaced) |

Toggleable in the UI = one MapLibre source+layer group per category (or per file).

### 6.2 Categories (folders under `overlays/`)

#### MVP (shipped — 7 curated folders; focus = women + children)

| # | Slug / id | Features belong here | Example properties | Contributors | Priority |
|---|-----------|----------------------|--------------------|--------------|----------|
| 0 | `services` | **Priority — useful to women:** salon, tailor, laundry, midwife, physio, gyn clinic | `name`, `kind`, `opening_hours?`, `website?` | Humans + agents | **MVP** |
| 1 | `family` | **Priority — kids spaces:** playground, indoor play, creche/Kita, changing/nursing, pediatric | `name`, `kind`, `extra.*` | Humans + agents | **MVP** |
| 2 | `places` | Amenities (pharmacy, café, toilets, libraries, water) | `name`, `kind`, `opening_hours?`, `website?` | Humans + agents | **MVP** |
| 3 | `nature` | Viewpoints, trailheads, swimming spots, picnic areas, dark-sky sites | `name`, `kind`, `access`, `difficulty?`, `season?` | Humans + agents | **MVP** |
| 4 | `transport` | Bike parking, EV chargers, carshare pods, micromobility hubs (gaps vs OSM) | `name`, `kind`, `operator?`, `capacity?`, `fee?` | Humans + agents | **MVP** |
| 5 | `culture` | Murals, indie venues, memorials, temporary exhibition pins | `name`, `kind`, `artist?`, `start_date?`, `end_date?` | Humans + agents | **MVP** |
| 6 | `community` | Mutual aid, women support (public orgs only — no secret shelters) | `name`, `kind`, `extra.needs_review` | Humans (agents draft only) | **MVP** |

#### Later (design now, folders optional / empty)

| # | Slug / id | Features | Example properties | Contributors | Priority |
|---|-----------|----------|--------------------|--------------|----------|
| 7 | `accessibility` | Step-free routes, accessible toilets, quiet spaces | `kind`, `wheelchair`, `notes` | Humans + agents | v0.3 |
| 8 | `events` | Time-bound pins (festivals, markets) — requires `start`/`end` | `name`, `start`, `end`, `url?` | Humans + agents | Later |
| 9 | `hazards` | Flood zones, road closures, wildfire perimeters — **strict review** | `kind`, `severity`, `valid_until`, `authority` | Humans only | Later |
| 10 | `food_rescue` | Surplus food / community fridges | `name`, `hours`, `org` | Humans | Later |
| 11 | `_ns/<app>` | App-private or branded overlays (e.g. `_ns/my-tour`) | App-defined + `namespace` | App owners | Later |

### 6.3 Feature `kind` examples (per category)

```
services:    hairdresser | beauty_salon | nail_salon | tailor | laundry | dry_clean |
             shoe_repair | jewelry_repair | physiotherapy | yoga_studio | midwife |
             gyn_clinic | cosmetics_shop
family:      playground | indoor_play | creche | kita | after_school | changing_table |
             nursing_room | family_restroom | stroller_friendly | pediatric_clinic
places:      cafe | coworking | library | toilet | drinking_water | atm | wifi | pharmacy
nature:      viewpoint | trailhead | swim | picnic | dark_sky | park_gate
transport:   bike_parking | ev_charger | carshare | micromobility
culture:     mural | venue | memorial | exhibition
community:   mutual_aid | tool_library | repair_cafe | cooling_center | free_wifi | women_support
```

### 6.4 Shared feature property contract (MVP)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [lon, lat] },
  "properties": {
    "id": "places/berlin-brandenburg-gate-drinking-water",
    "name": "Drinking fountain — Brandenburg Gate",
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

### 6.5 Optional `properties.extra` (family / access depth)

Use only when we add **verified value** beyond the basemap. Prefer `source: "osm-gap"` or `"survey"`. Do not invent every playground in a city.

Suggested keys (document in CONTRIBUTING; keep flexible under `extra`):

| Domain | Keys | Notes |
|--------|------|--------|
| Changing table | `extra.changing_location` | Align with OSM: `female_toilet` \| `male_toilet` \| `unisex_toilet` \| `dedicated_room` \| `room` \| `outdoor` |
| Playground | `extra.fenced`, `extra.shade`, `extra.age_min`, `extra.age_max` | Booleans / numbers when known |
| Nursing | `extra.nursing_privacy` | `low` \| `medium` \| `high` (MaterMap-style) |
| Access | `extra.stroller`, `extra.wheelchair` | Booleans when known |
| Review | `extra.needs_review` | Required mindset for `community` agent drafts |

Example:

```json
"extra": {
  "changing_location": "unisex_toilet",
  "stroller": true,
  "city": "berlin"
}
```

### 6.6 Folder layout

```
overlays/
  manifest.json         # v0.2 — stable URLs for agents / embed
  services/             # priority — women-useful local services
  family/               # priority — kids spaces (playground, Kita, …)
  places/
    README.md           # category purpose + kinds
    berlin.geojson      # MVP test city
    berlin.meta.yaml
  nature/
  transport/
  culture/
  community/            # human review for agent drafts
schemas/
  taxonomy.json         # kinds + icon/color + review_policy (agent/MCP SoT)
  overlay.schema.json   # FeatureCollection + kind constraints
```

---

## 7. SDK (thin)

`packages/sdk` responsibilities:

- `listCategories()` / `getCategory()` / `listKinds(category)`
- `loadOverlay(url)` → GeoJSON
- `validateFeature` / `validateFeatureCollection` (taxonomy + required fields)
- `featureTemplate(category)` for agents
- `toMapLibreSources(overlays)` → style fragments

Taxonomy is mirrored from `schemas/taxonomy.json`. No hosting, no auth, no tile generation. Publishable package is a **v0.3** candidate.

---

## 8. Demo app

`apps/demo`: static MapLibre page

- Base style: OpenFreeMap (flat 2D — no pitch / extrusions)
- Layer chips for all MVP categories (taxonomy icon + color on the map)
- Left results list (expand/collapse) + search among **visible** pins
- Click → popup from properties
- Load overlays from relative paths (serve repo root)

v0.2 polish: deep-link **Directions** (Apple / Google Maps); optional “open now” when `opening_hours` is present.

`apps/embed/` (v0.2): minimal drop-in for third parties / agents — same OpenFreeMap + manifest, no sidebar chrome required.

---

## 9. CI

- Validate every `overlays/**/*.geojson` against `schemas/overlay.schema.json`
- Fail on duplicate `properties.id`
- Optional: bbox sanity, required fields, stale `verified_at` hint (v0.3)

---

## 10. MCP (`packages/mcp`)

File-backed MCP server (stdio) for agents. Wraps `schemas/taxonomy.json` + SDK validate. See [`packages/mcp/README.md`](../packages/mcp/README.md).

**MVP shipped** (local Cursor config via `.cursor/mcp.json`):

| Tool | Behavior |
|------|----------|
| `list_layers` | Return `taxonomy.json` categories + MVP flags |
| `list_overlays` | List GeoJSON files under `overlays/` |
| `get_overlay` | Read one FeatureCollection |
| `validate_overlay` | Run schema + id uniqueness checks (reuse SDK) |
| `get_map_style` | Return base style URL + overlay style hints |
| `propose_feature` | Validate a feature draft; optional `write=true` append (no commit/push) |

**v0.2 planned** (still file-backed, no PostGIS):

| Tool | Behavior |
|------|----------|
| `search_features` | Filter by category / kind / bbox / text (in-memory over GeoJSON) |
| `find_nearest` | Nearest N pins to lon/lat (haversine; optional kind filter) |
| `get_feature` | Lookup by `properties.id` |
| `get_embed_snippet` | HTML/JS fragment with Pages-absolute manifest + style URLs |
| `get_provenance` | source / verified_at / license summary for a file or id |

**v0.3 planned:**

| Tool | Behavior |
|------|----------|
| `prepare_contribution` | Write validated feature to a branch (no push) |
| `open_pr` | Open a **draft** PR via `gh` when credentials exist — never force-push / auto-merge |

Backed by the same `schemas/` and `overlays/` tree — MCP is a thin I/O facade, not a second data store. Keep the tool count small (~10) so agents choose reliably.

---

## 11. Contribution model

1. **Show only:** load `overlays/manifest.json` (or Pages demo/embed) — no PR.
2. **Add data:** pick category → edit `.geojson` (or MCP `propose_feature`).
3. Run / rely on CI schema validation.
4. Open PR; for `community` / future `hazards`, require human review label.
5. Agents: follow `CONTRIBUTING.md` / this plan; never invent basemap tiles; never silent-push to `main`.

---

## 12. Roadmap

| Phase | Deliverable |
|-------|-------------|
| **Now** | Plan + rules + skills + light scaffold |
| **MVP** | ✅ Taxonomy (services+family focus), Berlin overlays (7 cats), demo UX, CONTRIBUTING, CI, SDK validate, MCP stub + local Cursor config |
| **v0.2** | **Agent loop + depth + fast load:** `overlays/manifest.json`, embed snippet (`apps/embed/` or docs), MCP `search_features` / `find_nearest` / `get_feature` / `get_embed_snippet`, CONTRIBUTING + skill consume-vs-contribute, denser Berlin `services`/`family` with `extra` where useful, demo Directions deep-link, progressive overlay fetch (basemap first, parallel GeoJSON), document cache/update expectations for Pages consumers |
| **v0.3** | MCP `prepare_contribution` / `open_pr` (draft PR); `accessibility` category; second city **or** publishable SDK; verification nudge for stale `verified_at` |
| **Later** | `events`, `hazards`, `_ns/` namespaces; remote/hosted MCP only if someone hosts the repo statically (still no tile farm) |

---

## 13. Non-goals

- Hosting our own vector tile pipeline
- Competing with OSM editors for general POI editing
- Real-time multiplayer map sync (git PRs are the collaboration model)
- Storing copyrighted basemap tiles in-repo
- Geocoder or routing servers in-repo (deep-link out instead)
- Bulk import / scrape of all OSM playgrounds or POIs into `overlays/`
- A 90+ tool GIS MCP — stay thin and file-backed
- Silent push or auto-merge from agents

---

## 14. Suggested next step

1. ✅ Berlin MVP overlays on the demo (7 layers) + GitHub Pages.
2. ✅ Wire `packages/mcp` into local Cursor MCP (`.cursor/mcp.json`; see `packages/mcp/README.md`).
3. ✅ Roadmap expanded: agent consume → contribute loop + demand/fit + MCP/query/`extra` backlog.
4. **Implement v0.2:** `overlays/manifest.json` + embed snippet + MCP search/nearest/`get_embed_snippet` + skill/CONTRIBUTING wording for consume vs contribute + progressive/parallel overlay load (§2.3).
5. User asks explicitly → **commit + push** to `world-map-open-source`.
