# World Map Open Source

Collaborative, **git-native GeoJSON overlays** on top of **OpenFreeMap** + **MapLibre**.

We do **not** rebuild OSM or run a tile farm. The basemap is free; curated layers are the product.

## Quick start (demo)

Serve the **repo root** so overlay GeoJSON paths resolve:

```bash
python3 -m http.server 5173
# open http://localhost:5173/apps/demo/
```

The demo loads OpenFreeMap as the base style and toggles MVP overlay categories from `overlays/`.

## MVP overlay categories

| Folder | Theme |
|--------|--------|
| `overlays/places/` | Amenities (water, toilets, libraries, …) |
| `overlays/nature/` | Viewpoints, trailheads, outdoors |
| `overlays/transport/` | Bike parking, EV, micromobility |
| `overlays/culture/` | Murals, venues, memorials |
| `overlays/community/` | Mutual aid, repair cafés (human review) |

Full taxonomy, roadmap, and MCP sketch: **[docs/PLAN.md](docs/PLAN.md)**

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Agents: use `.cursor/skills/add-overlay`.

## Repo layout

```
overlays/     curated GeoJSON by category
schemas/      JSON Schema for overlays
apps/demo/    MapLibre layer switcher demo
packages/sdk/ thin load/validate helpers (stub)
docs/PLAN.md  product plan
.cursor/      shared rules + skills for AI agents
```

## License

Overlay data default: **ODbL-1.0** (see feature `license` property).  
Code: TBD (propose MIT when publishing).
