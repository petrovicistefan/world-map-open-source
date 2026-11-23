/** Overlay manifest — paths relative to apps/demo/ (serve repo root). */
export const OVERLAY_MANIFEST = [
  { id: "services", url: "../../overlays/services/berlin.geojson" },
  { id: "family", url: "../../overlays/family/berlin.geojson" },
  { id: "places", url: "../../overlays/places/berlin.geojson" },
  { id: "nature", url: "../../overlays/nature/berlin.geojson" },
  { id: "transport", url: "../../overlays/transport/berlin.geojson" },
  { id: "culture", url: "../../overlays/culture/berlin.geojson" },
  { id: "community", url: "../../overlays/community/berlin.geojson" },
];

/** Taxonomy path (icon + color per layer). */
export const TAXONOMY_URL = "../../schemas/taxonomy.json";

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
