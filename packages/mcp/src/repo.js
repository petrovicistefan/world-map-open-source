/**
 * Thin filesystem access to overlays/ + schemas/. No second data store.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "fs";
import { join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import {
  TAXONOMY,
  getCategory,
  validateFeature,
  validateFeatureCollection,
  featureTemplate,
} from "../../sdk/src/index.js";

const packageDir = fileURLToPath(new URL("..", import.meta.url));

/** Repo root: WORLD_MAP_ROOT env, or two levels up from packages/mcp. */
export function getRepoRoot() {
  if (process.env.WORLD_MAP_ROOT) return resolve(process.env.WORLD_MAP_ROOT);
  return resolve(packageDir, "../..");
}

export function loadTaxonomyFile() {
  const path = join(getRepoRoot(), "schemas/taxonomy.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function walkGeojson(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkGeojson(p, out);
    else if (name.endsWith(".geojson")) out.push(p);
  }
  return out;
}

/**
 * @param {string} [category]
 */
export function listOverlayFiles(category) {
  const root = getRepoRoot();
  const base = category
    ? join(root, "overlays", category)
    : join(root, "overlays");
  return walkGeojson(base).map((abs) => ({
    path: relative(root, abs).split("\\").join("/"),
    absolute: abs,
    category: relative(join(root, "overlays"), abs).split(/[/\\]/)[0],
  }));
}

/**
 * @param {string} overlayPath relative to repo root, e.g. overlays/places/berlin.geojson
 */
export function readOverlay(overlayPath) {
  const root = getRepoRoot();
  const abs = resolve(root, overlayPath);
  const overlaysRoot = resolve(root, "overlays");
  if (!abs.startsWith(overlaysRoot)) {
    throw new Error("path must be under overlays/");
  }
  if (!abs.endsWith(".geojson")) {
    throw new Error("path must be a .geojson file");
  }
  if (!existsSync(abs)) {
    throw new Error(`file not found: ${overlayPath}`);
  }
  return {
    path: relative(root, abs).split("\\").join("/"),
    data: JSON.parse(readFileSync(abs, "utf8")),
  };
}

/**
 * Collect all feature ids currently in the repo.
 */
export function allFeatureIds() {
  const ids = new Map();
  for (const { path, absolute } of listOverlayFiles()) {
    const data = JSON.parse(readFileSync(absolute, "utf8"));
    for (const feat of data.features || []) {
      const id = feat?.properties?.id;
      if (id) ids.set(id, path);
    }
  }
  return ids;
}

/**
 * Validate a FeatureCollection on disk (SDK + duplicate ids across repo).
 * @param {string} overlayPath
 */
export function validateOverlayFile(overlayPath) {
  const { path, data } = readOverlay(overlayPath);
  const category = path.split("/")[1];
  const result = validateFeatureCollection(data, {
    expectedCategory: category,
  });
  const repoIds = allFeatureIds();
  const dupes = [];
  for (const feat of data.features || []) {
    const id = feat?.properties?.id;
    if (!id) continue;
    const owner = repoIds.get(id);
    if (owner && owner !== path) {
      dupes.push({ id, alsoIn: owner });
    }
  }
  // Within-file dups already covered by SDK; cross-file:
  const ok = result.ok && dupes.length === 0;
  return {
    path,
    ok,
    ...result,
    crossFileDuplicates: dupes,
  };
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const LAYER_COLORS = {
  services: "#7b1fa2",
  family: "#e91e63",
  places: "#0d6e6e",
  nature: "#2f7d32",
  transport: "#1565c0",
  culture: "#6a1b9a",
  community: "#c62828",
};

const PAGES_BASE =
  "https://petrovicistefan.github.io/world-map-open-source";

export function getMapStyleHints() {
  return {
    baseStyleUrl: STYLE_URL,
    center: { lon: 13.405, lat: 52.52, zoom: 12 },
    city: "Berlin",
    overlayColors: LAYER_COLORS,
    demoPath: "apps/demo/",
    embedPath: "apps/embed/",
    manifestPath: "overlays/manifest.json",
    pagesBase: PAGES_BASE,
    note: "Serve repo root statically; prefer overlays/manifest.json then parallel GeoJSON fetch",
  };
}

function loadAllFeatures() {
  /** @type {Array<object>} */
  const out = [];
  for (const { path, absolute } of listOverlayFiles()) {
    const data = JSON.parse(readFileSync(absolute, "utf8"));
    for (const feat of data.features || []) {
      out.push({ ...feat, _file: path });
    }
  }
  return out;
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * @param {{ category?: string, kind?: string, q?: string, bbox?: number[], limit?: number }} opts
 * bbox = [west, south, east, north]
 */
export function searchFeatures(opts = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const q = (opts.q || "").trim().toLowerCase();
  const features = loadAllFeatures().filter((f) => {
    const p = f.properties || {};
    if (opts.category && p.category !== opts.category) return false;
    if (opts.kind && p.kind !== opts.kind) return false;
    if (q) {
      const hay = `${p.name || ""} ${p.id || ""} ${p.kind || ""} ${p.category || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (Array.isArray(opts.bbox) && opts.bbox.length === 4) {
      const [w, s, e, n] = opts.bbox;
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return false;
      const [lon, lat] = coords;
      if (lon < w || lon > e || lat < s || lat > n) return false;
    }
    return true;
  });
  return {
    count: Math.min(features.length, limit),
    totalMatched: features.length,
    features: features.slice(0, limit).map((f) => ({
      id: f.properties?.id,
      name: f.properties?.name,
      category: f.properties?.category,
      kind: f.properties?.kind,
      source: f.properties?.source,
      coordinates: f.geometry?.coordinates,
      file: f._file,
    })),
  };
}

/**
 * @param {{ lon: number, lat: number, n?: number, category?: string, kind?: string }} opts
 */
export function findNearest(opts) {
  const lon = Number(opts.lon);
  const lat = Number(opts.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return { ok: false, error: "lon and lat required" };
  }
  const n = Math.min(Math.max(opts.n ?? 5, 1), 50);
  const scored = loadAllFeatures()
    .filter((f) => {
      const p = f.properties || {};
      if (opts.category && p.category !== opts.category) return false;
      if (opts.kind && p.kind !== opts.kind) return false;
      return f.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates);
    })
    .map((f) => {
      const [flon, flat] = f.geometry.coordinates;
      return {
        id: f.properties?.id,
        name: f.properties?.name,
        category: f.properties?.category,
        kind: f.properties?.kind,
        coordinates: f.geometry.coordinates,
        file: f._file,
        distance_km: Math.round(haversineKm(lon, lat, flon, flat) * 1000) / 1000,
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, n);
  return { ok: true, lon, lat, count: scored.length, features: scored };
}

/**
 * @param {string} id
 */
export function getFeatureById(id) {
  for (const f of loadAllFeatures()) {
    if (f.properties?.id === id) {
      const { _file, ...feature } = f;
      return { ok: true, file: _file, feature };
    }
  }
  return { ok: false, error: `feature not found: ${id}` };
}

/**
 * @param {{ id?: string, path?: string }} opts
 */
export function getProvenance(opts = {}) {
  if (opts.id) {
    const found = getFeatureById(opts.id);
    if (!found.ok) return found;
    const p = found.feature.properties || {};
    return {
      ok: true,
      id: p.id,
      file: found.file,
      source: p.source,
      verified_at: p.verified_at ?? null,
      license: p.license,
      category: p.category,
      kind: p.kind,
    };
  }
  if (opts.path) {
    const { path, data } = readOverlay(opts.path);
    const sources = {};
    for (const feat of data.features || []) {
      const s = feat.properties?.source || "unknown";
      sources[s] = (sources[s] || 0) + 1;
    }
    return {
      ok: true,
      path,
      featureCount: data.features?.length ?? 0,
      sources,
      default_license: loadTaxonomyFile().default_license,
    };
  }
  return { ok: false, error: "pass id or path" };
}

/**
 * @param {{ base?: string }} opts
 */
export function getEmbedSnippet(opts = {}) {
  const base = (opts.base || PAGES_BASE).replace(/\/$/, "");
  const embedUrl = `${base}/apps/embed/?base=${encodeURIComponent(base)}`;
  const manifestUrl = `${base}/overlays/manifest.json`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>World Map OS embed</title>
  <style>html,body,#map{margin:0;height:100%}#map{position:absolute;inset:0}</style>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"><\\/script>
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
</head>
<body>
  <div id="map"></div>
  <script type="module">
    const BASE = ${JSON.stringify(base)};
    const map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [13.405, 52.52],
      zoom: 12,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
    });
    map.on("load", async () => {
      const manifest = await fetch(BASE + "/overlays/manifest.json").then((r) => r.json());
      await Promise.all((manifest.overlays || []).map(async (e) => {
        const data = await fetch(BASE + "/" + e.url).then((r) => r.json());
        map.addSource("src-" + e.id, { type: "geojson", data });
        map.addLayer({
          id: "lyr-" + e.id,
          type: "circle",
          source: "src-" + e.id,
          paint: {
            "circle-radius": 7,
            "circle-color": e.color || "#333",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#fff",
          },
        });
      }));
    });
  <\\/script>
  <p style="position:absolute;bottom:8px;left:8px;font:11px system-ui;background:#fffc;padding:4px 8px;margin:0">
    Overlays <a href="https://github.com/petrovicistefan/world-map-open-source">World Map OS</a> (ODbL) ·
    <a href="https://openfreemap.org/">OpenFreeMap</a>
  </p>
</body>
</html>`;
  return {
    pagesBase: PAGES_BASE,
    base,
    embedUrl,
    manifestUrl,
    iframe: `<iframe src="${embedUrl}" title="World Map OS" style="width:100%;height:480px;border:0" loading="lazy"></iframe>`,
    html,
    note: "Show-only: no PR needed. To add pins, validate + open a PR (never silent push).",
  };
}

export { PAGES_BASE };

/**
 * Propose a feature: validate, optionally append to a dataset file (no commit/push).
 * @param {object} feature GeoJSON Feature
 * @param {{ category?: string, dataset?: string, write?: boolean }} opts
 */
export function proposeFeature(feature, opts = {}) {
  const category =
    opts.category || feature?.properties?.category || "family";
  const cat = getCategory(category);
  if (!cat) {
    return {
      ok: false,
      errors: [`unknown category: ${category}`],
      suggestedPath: null,
    };
  }

  const validation = validateFeature(feature, { expectedCategory: category });
  const errors = [...validation.errors];

  const fid = feature?.properties?.id;
  if (fid) {
    const existing = allFeatureIds().get(fid);
    if (existing) {
      errors.push(`id "${fid}" already exists in ${existing}`);
    }
  }

  if (cat.review_policy === "human_required") {
    const extra = feature?.properties?.extra || {};
    if (feature?.properties?.source !== "agent") {
      errors.push('community (and human_required) drafts should use source: "agent"');
    }
    if (extra.needs_review !== true) {
      errors.push("set properties.extra.needs_review: true for human_required categories");
    }
  }

  const dataset = opts.dataset || "berlin.geojson";
  const suggestedPath = `overlays/${category}/${dataset}`;
  const root = getRepoRoot();
  const abs = join(root, suggestedPath);

  const result = {
    ok: errors.length === 0,
    errors,
    suggestedPath,
    review_policy: cat.review_policy,
    nextSteps:
      cat.review_policy === "human_required"
        ? [
            "Open a draft PR",
            "Label needs-human-review",
            "Do not auto-merge",
          ]
        : ["Open a PR", "Wait for CI validate-overlays", "Merge → visible on demo"],
    written: false,
  };

  if (!result.ok) return result;

  if (opts.write) {
    if (!existsSync(abs)) {
      const collection = {
        type: "FeatureCollection",
        name: `${category}-${dataset.replace(/\.geojson$/, "")}`,
        features: [feature],
      };
      writeFileSync(abs, JSON.stringify(collection, null, 2) + "\n", "utf8");
    } else {
      const data = JSON.parse(readFileSync(abs, "utf8"));
      if (!Array.isArray(data.features)) data.features = [];
      data.features.push(feature);
      writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
    }
    result.written = true;
    result.note =
      "Wrote to disk only. Do not commit/push unless the user explicitly asks.";
  } else {
    result.note =
      "Dry-run (write=false). Re-call with write=true to append to the suggested file.";
    result.templateHint = featureTemplate(category);
  }

  return result;
}

export {
  TAXONOMY,
  featureTemplate,
  LAYER_COLORS,
  STYLE_URL,
};
