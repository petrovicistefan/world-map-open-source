/**
 * Drop-in map: OpenFreeMap + overlays/manifest.json.
 * Serve repo root, or set ?base=https://petrovicistefan.github.io/world-map-open-source
 */
const DEFAULT_PAGES_BASE =
  "https://petrovicistefan.github.io/world-map-open-source";

function resolveBase() {
  const params = new URLSearchParams(location.search);
  if (params.get("base")) return params.get("base").replace(/\/$/, "");
  // Relative: apps/embed → repo root is ../..
  return new URL("../..", location.href).href.replace(/\/$/, "");
}

function joinUrl(base, path) {
  return `${base}/${String(path).replace(/^\//, "")}`;
}

const base = resolveBase();
const manifestUrl = joinUrl(base, "overlays/manifest.json");

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [13.405, 52.52],
  zoom: 12,
  bearing: 0,
  pitch: 0,
  maxPitch: 0,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
});

map.addControl(
  new maplibregl.NavigationControl({
    showCompass: false,
    visualizePitch: false,
  }),
  "top-right",
);

function flattenBasemap() {
  map.setPitch(0);
  map.setBearing(0);
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.type === "fill-extrusion" && map.getLayer(layer.id)) {
      map.removeLayer(layer.id);
    }
  }
}

map.on("style.load", flattenBasemap);

map.on("load", async () => {
  flattenBasemap();

  const manifest = await fetch(manifestUrl).then((r) => {
    if (!r.ok) throw new Error(`manifest ${r.status}`);
    return r.json();
  });

  if (Array.isArray(manifest.center) && manifest.center.length >= 2) {
    map.jumpTo({
      center: manifest.center,
      zoom: manifest.zoom ?? 12,
    });
  }

  // Parallel GeoJSON fetch — basemap already visible
  await Promise.all(
    (manifest.overlays || []).map(async (entry) => {
      const data = await fetch(joinUrl(base, entry.url)).then((r) => {
        if (!r.ok) throw new Error(`${entry.url} ${r.status}`);
        return r.json();
      });
      const sourceId = `src-${entry.id}`;
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: `lyr-${entry.id}`,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 7,
          "circle-color": entry.color || "#333",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
      map.on("click", `lyr-${entry.id}`, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        const [lon, lat] = f.geometry.coordinates;
        const maps = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
        new maplibregl.Popup()
          .setLngLat([lon, lat])
          .setHTML(
            `<strong>${p.name || p.id}</strong><br/><code>${p.id || ""}</code><br/>` +
              `${p.category || entry.id}/${p.kind || ""}<br/>` +
              `<a href="${maps}" target="_blank" rel="noopener">Directions</a>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", `lyr-${entry.id}`, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", `lyr-${entry.id}`, () => {
        map.getCanvas().style.cursor = "";
      });
    }),
  );

  console.info("[embed] loaded from", manifestUrl, "base=", base, base === DEFAULT_PAGES_BASE ? "(pages)" : "");
});
