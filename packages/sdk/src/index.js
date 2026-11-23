export {
  TAXONOMY,
  MVP_CATEGORIES,
  getCategory,
  listKinds,
  featureTemplate,
  ID_PATTERN,
} from "./taxonomy.js";

import {
  TAXONOMY,
  MVP_CATEGORIES,
  getCategory,
  listKinds,
  featureTemplate,
  ID_PATTERN,
} from "./taxonomy.js";

/**
 * @param {string} [category]
 * @returns {string[]}
 */
export function listCategories(category) {
  if (!category) return [...MVP_CATEGORIES];
  return MVP_CATEGORIES.includes(category) ? [category] : [];
}

/**
 * Load a GeoJSON overlay from a URL (fetch-based).
 * @param {string} url
 * @returns {Promise<object>}
 */
export async function loadOverlay(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`loadOverlay failed: ${res.status} ${url}`);
  return res.json();
}

/**
 * Validate a single GeoJSON Feature against taxonomy + required fields.
 * @param {object} feature
 * @param {{ expectedCategory?: string }} [opts]
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateFeature(feature, opts = {}) {
  const errors = [];
  if (feature?.type !== "Feature") errors.push("type must be Feature");
  if (!feature?.geometry) errors.push("geometry required");
  else if (!feature.geometry.type) errors.push("geometry.type required");
  else if (!("coordinates" in feature.geometry)) {
    errors.push("geometry.coordinates required");
  }

  const p = feature?.properties ?? {};
  for (const key of ["id", "name", "category", "kind", "source", "license"]) {
    if (!p[key]) errors.push(`properties.${key} required`);
  }

  if (p.id && !ID_PATTERN.test(p.id)) {
    errors.push(
      `properties.id must match ${TAXONOMY.id_convention} (kebab-case)`,
    );
  }

  if (p.category) {
    const cat = getCategory(p.category);
    if (!cat && !TAXONOMY.later_categories.includes(p.category)) {
      errors.push(`unknown category: ${p.category}`);
    }
    if (opts.expectedCategory && p.category !== opts.expectedCategory) {
      errors.push(
        `properties.category must be "${opts.expectedCategory}" (got "${p.category}")`,
      );
    }
    if (cat && p.kind && !cat.kinds.includes(p.kind)) {
      errors.push(
        `kind "${p.kind}" not allowed for category "${p.category}" (allowed: ${cat.kinds.join(", ")})`,
      );
    }
  }

  if (p.source && !TAXONOMY.sources.includes(p.source)) {
    errors.push(
      `properties.source must be one of: ${TAXONOMY.sources.join(", ")}`,
    );
  }

  if (p.verified_at && !/^\d{4}-\d{2}-\d{2}$/.test(p.verified_at)) {
    errors.push("properties.verified_at must be YYYY-MM-DD");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate a FeatureCollection (and optionally enforce folder category).
 * @param {object} collection
 * @param {{ expectedCategory?: string }} [opts]
 * @returns {{ ok: boolean, errors: string[], featureErrors: Array<{ index: number, id?: string, errors: string[] }> }}
 */
export function validateFeatureCollection(collection, opts = {}) {
  const errors = [];
  const featureErrors = [];

  if (collection?.type !== "FeatureCollection") {
    errors.push("type must be FeatureCollection");
  }
  if (!Array.isArray(collection?.features)) {
    errors.push("features must be an array");
    return { ok: false, errors, featureErrors };
  }

  const seen = new Map();
  collection.features.forEach((feat, index) => {
    const result = validateFeature(feat, opts);
    const fid = feat?.properties?.id;
    if (fid) {
      if (seen.has(fid)) {
        result.errors.push(`duplicate id "${fid}" (also at index ${seen.get(fid)})`);
        result.ok = false;
      } else {
        seen.set(fid, index);
      }
    }
    if (!result.ok) {
      featureErrors.push({ index, id: fid, errors: result.errors });
    }
  });

  return {
    ok: errors.length === 0 && featureErrors.length === 0,
    errors,
    featureErrors,
  };
}

/** Alias for agents: same as featureTemplate. */
export const FEATURE_TEMPLATE = featureTemplate;

/**
 * Map overlay ids to MapLibre geojson source descriptors.
 * @param {Array<{ id: string, data: object }>} overlays
 */
export function toMapLibreSources(overlays) {
  return Object.fromEntries(
    overlays.map((o) => [o.id, { type: "geojson", data: o.data }]),
  );
}
