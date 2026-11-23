/** Resolve repo-root paths while serving from apps/demo/. */
export const REPO_BASE = new URL("../..", import.meta.url).href.replace(
  /\/$/,
  "",
);

export const MANIFEST_URL = `${REPO_BASE}/overlays/manifest.json`;
export const TAXONOMY_URL = `${REPO_BASE}/schemas/taxonomy.json`;

/**
 * Load an SVG as a MapLibre image (HTMLImageElement).
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
export async function loadSvgImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Icon failed: ${url}`);
  const svg = await res.text();
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Image load failed: ${url}`));
      img.src = objectUrl;
    });
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * @param {string} base
 * @param {string} path
 */
export function joinUrl(base, path) {
  return `${base.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;
}
