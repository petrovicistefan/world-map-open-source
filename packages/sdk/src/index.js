/** MVP category slugs (see docs/PLAN.md). */
export const MVP_CATEGORIES = [
  "places",
  "nature",
  "transport",
  "culture",
  "community",
];

/**
 * @param {string} [category]
 * @returns {string[]}
 */
export function listCategories(category) {
  if (!category) return [...MVP_CATEGORIES];
  return MVP_CATEGORIES.includes(category) ? [category] : [];
}

/**
 * Load a GeoJSON overlay from a URL or filesystem path string (fetch-based).
 * @param {string} url
 * @returns {Promise<object>}
 */
export async function loadOverlay(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`loadOverlay failed: ${res.status} ${url}`);
  return res.json();
}

/**
 * Minimal required-field check (full JSON Schema lives in schemas/).
 * @param {object} feature
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateFeature(feature) {
  const errors = [];
  if (feature?.type !== "Feature") errors.push("type must be Feature");
  if (!feature?.geometry) errors.push("geometry required");
  const p = feature?.properties ?? {};
  for (const key of ["id", "name", "category", "kind", "source", "license"]) {
    if (!p[key]) errors.push(`properties.${key} required`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Map overlay ids to MapLibre geojson source descriptors.
 * @param {Array<{ id: string, data: object }>} overlays
 */
export function toMapLibreSources(overlays) {
  return Object.fromEntries(
    overlays.map((o) => [o.id, { type: "geojson", data: o.data }]),
  );
}
