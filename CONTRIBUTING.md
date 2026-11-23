# Contributing

## Principle

**Simplest path wins.** No builds. Edit GeoJSON → validate → PR → pin on map.

```
overlays/manifest.json               ← index for agents / embeds (re-fetch to update)
overlays/<category>/berlin.geojson   ← data
schemas/taxonomy.json                ← layers + kinds + icon
schemas/overlay.schema.json          ← validation
scripts/validate-overlays.mjs        ← only “tooling” you need
apps/demo/                           ← full demo
apps/embed/                          ← drop-in map for other sites
```

## Two paths for agents (and humans)

### 1. Show the map only (no PR)

Load our published files — **do not fork** just to display pins:

- Manifest: `https://petrovicistefan.github.io/world-map-open-source/overlays/manifest.json`
- Embed: `https://petrovicistefan.github.io/world-map-open-source/apps/embed/`
- Or locally: serve repo root → `http://localhost:5173/apps/embed/`
- MCP: `get_embed_snippet` returns iframe/HTML with absolute URLs

When we merge new GeoJSON, your next `fetch` picks it up (no rebuild of your demo).

### 2. Add or change data (PR required)

1. Open `overlays/<category>/berlin.geojson` (`services`, `family`, `places`, `nature`, `transport`, `culture`, `community`).
2. Append a Feature with: `id`, `name`, `category`, `kind`, `source`, `license`.
3. Id format: `category/city-slug` (e.g. `family/berlin-tiergarten-playground`).
4. `kind` must be in that category’s list in `schemas/taxonomy.json`.
5. Optional family depth under `properties.extra` (when verified):  
   `changing_location`, `fenced`, `shade`, `age_min` / `age_max`, `nursing_privacy`, `stroller`, `wheelchair` — see `docs/PLAN.md` §6.5.
6. Validate:

```bash
npm install --no-save ajv@8 ajv-formats@3   # once locally / CI
node scripts/validate-overlays.mjs
```

7. Open a **PR** (never silent-push to `main`). For `community`: label `needs-human-review`.

Agents: `"source": "agent"`. No PII. No confidential shelters.

Day-to-day pin edits only touch `.geojson`. Update `overlays/manifest.json` only when adding a **new category/file URL**.

## Add a new layer (category)

1. Add folder `overlays/<id>/` + `berlin.geojson`.
2. Add category to `schemas/taxonomy.json` with `kinds`, **`icon`**, **`color`**.
3. Drop SVG at `assets/icons/<id>.svg`.
4. Add an entry to `overlays/manifest.json`.
5. Run `node scripts/validate-overlays.mjs`.

No webpack, no TypeScript build, no backend.

## Optional helpers

- `packages/sdk` — plain ESM validate helpers (no build).
- `packages/mcp` — optional stdio tools for agents (`npm install` in that folder only if you use MCP). Still file-backed; never auto-commit/push. Tools include `search_features`, `find_nearest`, `get_embed_snippet`, `propose_feature`.

## Docs

- Plan: `docs/PLAN.md`
- Local Cursor rules/skills (optional, gitignored): `.cursor/`
