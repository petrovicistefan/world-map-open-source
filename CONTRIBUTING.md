# Contributing

## Principle

**Simplest path wins.** No builds. Edit GeoJSON → validate → PR → pin on map.

```
overlays/<category>/berlin.geojson   ← data
schemas/taxonomy.json                ← layers + kinds + icon
schemas/overlay.schema.json          ← validation
scripts/validate-overlays.mjs        ← only “tooling” you need
apps/demo/                           ← static HTML/JS (python -m http.server)
```

## Add a pin (fast)

1. Open `overlays/<category>/berlin.geojson` (`services`, `family`, `places`, `nature`, `transport`, `culture`, `community`).
2. Append a Feature with: `id`, `name`, `category`, `kind`, `source`, `license`.
3. Id format: `category/city-slug` (e.g. `family/berlin-tiergarten-playground`).
4. `kind` must be in that category’s list in `schemas/taxonomy.json`.
5. Validate:

```bash
npm install --no-save ajv@8 ajv-formats@3   # once locally / CI
node scripts/validate-overlays.mjs
```

6. PR. For `community`: label `needs-human-review`.

Agents: `"source": "agent"`. No PII. No confidential shelters.

## Add a new layer (category)

1. Add folder `overlays/<id>/` + `berlin.geojson`.
2. Add category to `schemas/taxonomy.json` with `kinds`, **`icon`**, **`color`**.
3. Drop SVG at `assets/icons/<id>.svg`.
4. Add chip id to `apps/demo/overlays-config.js` (one line).
5. Run `node scripts/validate-overlays.mjs`.

No webpack, no TypeScript build, no backend.

## Optional helpers

- `packages/sdk` — plain ESM validate helpers (no build).
- `packages/mcp` — optional stdio tools for agents (`npm install` in that folder only if you use MCP). Still file-backed; never auto-commit/push.

## Docs

- Skill: `.cursor/skills/add-overlay/`
- Plan: `docs/PLAN.md`
