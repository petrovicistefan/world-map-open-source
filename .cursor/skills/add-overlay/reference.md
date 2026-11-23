# Overlay reference

## Sources

| `source` | Meaning |
|----------|---------|
| `survey` | On-site or trusted human verification |
| `osm-gap` | Useful detail missing/weak in OSM |
| `agent` | Drafted by an AI agent (needs review) |
| `import` | Bulk/curated import with documented provenance |

## Kind allow-list (MVP)

**places:** `cafe` · `coworking` · `library` · `toilet` · `drinking_water` · `atm` · `wifi`

**nature:** `viewpoint` · `trailhead` · `swim` · `picnic` · `dark_sky` · `park_gate`

**transport:** `bike_parking` · `ev_charger` · `carshare` · `micromobility`

**culture:** `mural` · `venue` · `memorial` · `exhibition`

**community:** `mutual_aid` · `tool_library` · `repair_cafe` · `cooling_center` · `free_wifi`

## Later categories (do not use until enabled)

`events`, `hazards`, `accessibility`, `food_rescue`, `_ns/<app>`

## Non-goals for overlays

- Duplicating the entire OSM POI corpus
- Live emergency feeds without `hazards` policy
- Storing basemap tiles or MBTiles in-repo
