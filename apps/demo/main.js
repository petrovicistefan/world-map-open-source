import { OVERLAY_MANIFEST, layerPaint } from "./overlays-config.js";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  center: [13.405, 52.52],
  zoom: 12,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

map.on("load", async () => {
  for (const entry of OVERLAY_MANIFEST) {
    const data = await fetch(entry.url).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${entry.url}`);
      return r.json();
    });

    const sourceId = `src-${entry.id}`;
    const layerId = `lyr-${entry.id}`;

    map.addSource(sourceId, { type: "geojson", data });
    map.addLayer({
      id: layerId,
      type: "circle",
      source: sourceId,
      paint: layerPaint(entry.id),
    });

    map.on("click", layerId, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties || {};
      const html = `<strong>${p.name ?? "Feature"}</strong><br/>
        <code>${p.id ?? ""}</code><br/>
        ${p.category}/${p.kind}<br/>
        source: ${p.source ?? "—"}`;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  }

  document.querySelectorAll("[data-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-layer");
      const visibility = input.checked ? "visible" : "none";
      if (map.getLayer(`lyr-${id}`)) {
        map.setLayoutProperty(`lyr-${id}`, "visibility", visibility);
      }
    });
  });
});
