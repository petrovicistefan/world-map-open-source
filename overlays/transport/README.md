# Category: `transport`

Micromobility and last-mile infrastructure often incomplete on basemaps.

| Kind | Use for |
|------|---------|
| `bike_parking` | Bike racks / parking |
| `ev_charger` | EV charging points |
| `carshare` | Carshare pods / stations |
| `micromobility` | Scooter / bike-share hubs |

**Review:** open (humans + agents). Prefer gaps vs OSM (`source: osm-gap`) or surveyed pins.

## How agents append

1. Edit [`berlin.geojson`](berlin.geojson) or add a new dataset here.
2. Set `category: transport` and an allowed kind.
3. Id format: `transport/{city}-{slug}`.
4. Validate → PR → merge → visible on demo.

See `docs/PLAN.md` and `CONTRIBUTING.md`.
