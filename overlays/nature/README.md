# Category: `nature`

Outdoors and landscape-oriented features.

| Kind | Use for |
|------|---------|
| `viewpoint` | Scenic lookouts |
| `trailhead` | Trail / path starts |
| `swim` | Swim spots (lakes, beaches) |
| `picnic` | Picnic lawns / areas |
| `dark_sky` | Dark-sky watching sites |
| `park_gate` | Notable park entrances |

**Review:** open (humans + agents). Prefer `source: survey` or `osm-gap`.

## How agents append

1. Edit [`berlin.geojson`](berlin.geojson) or add a new FeatureCollection under this folder.
2. Set `category: nature` and a kind from the table above.
3. Id format: `nature/{city}-{slug}`.
4. Validate → PR → merge → visible on demo.

See `docs/PLAN.md` and `.cursor/skills/add-overlay`.
