# Contributing

## Add an overlay feature

1. Choose an MVP category folder under `overlays/` (`places`, `nature`, `transport`, `culture`, `community`).
2. Edit or create a `.geojson` FeatureCollection (optionally add a sibling `.meta.yaml` for dataset notes).
3. Every feature must include: `id`, `name`, `category`, `kind`, `source`, `license`.
4. Prefer stable ids like `category/slug` (e.g. `places/berlin-brandenburg-gate-drinking-water`).
5. Match `category` to the folder name; use a kind from that category’s README.
6. No personal data (private phones, home addresses).
7. Open a PR. Label `needs-human-review` for `community` (and any future `hazards`).

Schema: `schemas/overlay.schema.json`  
Agent guide: `.cursor/skills/add-overlay/SKILL.md`  
Docs (EN): `apps/docs/` — includes **How agents contribute** and copy-paste website examples  
Plan: `docs/PLAN.md`

## Validate locally (optional)

```bash
# requires Node 18+ and npx
npx --yes ajv-cli validate -s schemas/overlay.schema.json -d "overlays/**/*.geojson"
```

## Code / demo

Keep the SDK thin. Prefer MapLibre + OpenFreeMap. Do not add a tile server.
