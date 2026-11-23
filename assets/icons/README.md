# Layer icons

Each MVP category in `schemas/taxonomy.json` has an `icon` path (SVG) and `color`.

**When creating a new layer/category**, add:
1. Entry in `schemas/taxonomy.json` with `icon` + `color`
2. SVG file here: `assets/icons/<category-id>.svg` (64×64 recommended)
3. Folder `overlays/<category>/` + demo checkbox

The MapLibre demo loads these SVGs via `map.addImage` and draws a symbol layer per category.
