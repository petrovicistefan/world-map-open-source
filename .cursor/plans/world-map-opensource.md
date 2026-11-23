# World Map Open Source — Cursor Plan Pointer

Full product plan, taxonomy, local-vs-repo split, and MCP sketch:

→ **[docs/PLAN.md](../../docs/PLAN.md)**

## Quick reminders for agents

- **Basemap:** OpenFreeMap + MapLibre only — do not rebuild OSM/tiles.
- **Overlays:** GeoJSON under `overlays/<category>/`, schema in `schemas/`.
- **MVP categories:** `places`, `nature`, `transport`, `culture`, `community`.
- **Commit:** implementation + shared `.cursor/rules` + `.cursor/skills`.
- **Do not commit:** personal agent stores, secrets, `.env`.
- **Do not push/commit** unless the user explicitly asks.
