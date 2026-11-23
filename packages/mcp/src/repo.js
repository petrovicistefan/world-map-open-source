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

export function getMapStyleHints() {
  return {
    baseStyleUrl: STYLE_URL,
    center: { lon: 13.405, lat: 52.52, zoom: 12 },
    city: "Berlin",
    overlayColors: LAYER_COLORS,
    demoPath: "apps/demo/",
    note: "Serve repo root statically; demo loads overlays/<category>/berlin.geojson",
  };
}

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

export { TAXONOMY, featureTemplate, LAYER_COLORS, STYLE_URL };
