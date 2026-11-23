# World Map MCP (file-backed)

Thin MCP server over this repo’s `schemas/` + `overlays/`. Reuses SDK validation. **No second database. No silent push. No app build** — optional Node process only.

Prefer editing GeoJSON directly when possible; MCP is a convenience facade.

## Tools

| Tool | Purpose |
|------|---------|
| `list_layers` | Taxonomy (categories, kinds, review_policy) |
| `list_overlays` | List `overlays/**/*.geojson` |
| `get_overlay` | Read one FeatureCollection |
| `validate_overlay` | Schema/taxonomy + unique id checks |
| `get_map_style` | OpenFreeMap style URL + layer colors |
| `propose_feature` | Validate a Feature; optional `write=true` append (no commit) |

## Setup

```bash
cd packages/mcp
npm install
```

Optional: `WORLD_MAP_ROOT=/absolute/path/to/WorldMapOpenSource` if the server is not launched from this monorepo layout.

## Cursor / Claude Desktop

Add to MCP config (example):

```json
{
  "mcpServers": {
    "world-map": {
      "command": "node",
      "args": ["/ABS/PATH/WorldMapOpenSource/packages/mcp/src/index.js"],
      "env": {
        "WORLD_MAP_ROOT": "/ABS/PATH/WorldMapOpenSource"
      }
    }
  }
}
```

## Inspector (manual test)

```bash
cd packages/mcp
npm run inspect
```

## Agent rules

- Prefer `propose_feature` with `write=false` first; only write when the user asks.
- Never commit or push from MCP tools.
- `community` → `source: "agent"` + `extra.needs_review: true` + human review PR.
