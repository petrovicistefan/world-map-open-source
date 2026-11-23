# Contributing

## Add an overlay feature

1. Choose an MVP category folder under `overlays/` (`places`, `nature`, `transport`, `culture`, `community`).
2. Edit or create a `.geojson` FeatureCollection.
3. Every feature must include: `id`, `name`, `category`, `kind`, `source`, `license`.
4. Match `category` to the folder name; use a kind from that category’s README.
5. No personal data (private phones, home addresses).
6. Open a PR. Label `needs-human-review` for `community` (and any future `hazards`).

Schema: `schemas/overlay.schema.json`  
Agent guide: `.cursor/skills/add-overlay/SKILL.md`  
Plan: `docs/PLAN.md`

## Validate locally (optional)

```bash
# requires Node 18+ and npx
npx --yes ajv-cli validate -s schemas/overlay.schema.json -d "overlays/**/*.geojson"
```

## Code / demo

Keep the SDK thin. Prefer MapLibre + OpenFreeMap. Do not add a tile server.
