# Overlay reference

Canonical taxonomy: `schemas/taxonomy.json`.  
**Product focus:** women, children, caregivers (`family` is priority).

## Sources

| `source` | Meaning |
|----------|---------|
| `survey` | On-site or trusted human verification |
| `osm-gap` | Useful detail missing/weak in OSM |
| `agent` | Drafted by an AI agent (needs review) |
| `import` | Bulk/curated import with documented provenance |

## Kind allow-list (MVP)

**family (priority):** `playground` · `indoor_play` · `changing_table` · `nursing_room` · `family_restroom` · `stroller_friendly` · `kids_cafe` · `pediatric_clinic` · `midwife` · `birth_center` · `parent_child_course` · `family_center`

**places:** `cafe` · `family_cafe` · `coworking` · `library` · `toilet` · `drinking_water` · `atm` · `wifi` · `pharmacy`

**nature:** `viewpoint` · `trailhead` · `swim` · `picnic` · `dark_sky` · `park_gate`

**transport:** `bike_parking` · `ev_charger` · `carshare` · `micromobility`

**culture:** `mural` · `venue` · `memorial` · `exhibition`

**community:** `mutual_aid` · `tool_library` · `repair_cafe` · `cooling_center` · `free_wifi` · `parent_support` · `women_support` · `diaper_bank` · `toy_library`

## Later (do not use until enabled)

`services`, `food`, `sport`, `events`, `hazards`, `accessibility`, `food_rescue`, `health`

## Safety

- Never map confidential shelters / safe houses
- No PII of minors or private homes
- `women_support` / `parent_support` = publicly listed orgs only

## Id convention

`{category}/{city}-{slug}` — e.g. `family/berlin-goerlitzer-park-playground`

## Non-goals

- Duplicating the entire OSM POI corpus
- Live emergency feeds without `hazards` policy
- Storing basemap tiles in-repo
