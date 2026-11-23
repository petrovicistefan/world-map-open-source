/** MVP overlay manifest — paths relative to apps/demo/ (serve repo root). */
export const OVERLAY_MANIFEST = [
  { id: "places", url: "../../overlays/places/sample-berlin.geojson" },
  { id: "nature", url: "../../overlays/nature/sample-berlin.geojson" },
  { id: "transport", url: "../../overlays/transport/sample-berlin.geojson" },
  { id: "culture", url: "../../overlays/culture/sample-berlin.geojson" },
  { id: "community", url: "../../overlays/community/sample-berlin.geojson" },
];

const COLORS = {
  places: "#0d6e6e",
  nature: "#2f7d32",
  transport: "#1565c0",
  culture: "#6a1b9a",
  community: "#c62828",
};

export function layerPaint(categoryId) {
  return {
    "circle-radius": 7,
    "circle-color": COLORS[categoryId] ?? "#333",
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#fff",
  };
}
