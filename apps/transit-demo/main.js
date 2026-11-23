const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const ROUTES_URL = new URL("./data/berlin-routes.geojson", import.meta.url).href;

/** Urban bus cruise on city streets (km/h). Geographic — zoom does not change it. */
const BUS_SPEED_KMH = 22;
/** Pause at each stop (seconds) — bus grows while dwelling. */
const DWELL_S = 1;
/** Circle radii (px): normal vs stopped at station. */
const BUS_RADIUS = 9;
const BUS_RADIUS_STOP = 15;
const BUS_HALO = 13;
const BUS_HALO_STOP = 20;

/** @typedef {{ lon: number, lat: number }} LngLat */

/**
 * @param {number[][]} coords
 * @returns {{ points: LngLat[], cum: number[], total: number }}
 */
function buildPath(coords) {
  const points = coords.map(([lon, lat]) => ({ lon, lat }));
  const cum = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineM(points[i - 1], points[i]);
    cum.push(total);
  }
  return { points, cum, total };
}

/** @param {LngLat} a @param {LngLat} b */
function haversineM(a, b) {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * @param {{ points: LngLat[], cum: number[], total: number }} path
 * @param {number} distM meters along path
 * @returns {[number, number]}
 */
function pointAtDistance(path, distM) {
  const { points, cum, total } = path;
  if (total <= 0) return [points[0].lon, points[0].lat];
  let d = ((distM % total) + total) % total;
  if (d <= 0) return [points[0].lon, points[0].lat];
  let i = 1;
  while (i < cum.length && cum[i] < d) i++;
  const d0 = cum[i - 1];
  const d1 = cum[i];
  const seg = d1 - d0 || 1;
  const u = (d - d0) / seg;
  const a = points[i - 1];
  const b = points[i];
  return [a.lon + (b.lon - a.lon) * u, a.lat + (b.lat - a.lat) * u];
}

/**
 * Project stop points onto a route path → distances + dwell windows.
 * @param {{ points: LngLat[], cum: number[], total: number }} path
 * @param {Array<{ coordinates: number[] }>} stops
 */
function stopDistancesOnPath(path, stops) {
  /** @type {number[]} */
  const dists = [];
  for (const stop of stops) {
    const [lon, lat] = stop.coordinates;
    let best = 0;
    let bestD = Infinity;
    // Sample along path for nearest vertex (stops sit on vertices in our data).
    for (let i = 0; i < path.points.length; i++) {
      const p = path.points[i];
      const d = haversineM(p, { lon, lat });
      if (d < bestD) {
        bestD = d;
        best = path.cum[i];
      }
    }
    dists.push(best);
  }
  dists.sort((a, b) => a - b);
  // Deduplicate near-identical stops.
  const unique = [];
  for (const d of dists) {
    if (!unique.length || Math.abs(d - unique[unique.length - 1]) > 40) {
      unique.push(d);
    }
  }
  return unique;
}

/**
 * Map continuous driving meters → position that accounts for dwell at stops.
 * Driving clock advances only while moving; dwell freezes position.
 *
 * @param {number} driveM meters of pure driving time accumulated
 * @param {number} pathLen total route length
 * @param {number[]} stopDists stop distances along path
 * @param {number} dwellM equivalent meters “consumed” while dwelling (speed * dwell_s)
 * @returns {{ dist: number, dwelling: boolean }}
 */
function positionWithDwell(driveM, pathLen, stopDists, dwellM) {
  if (pathLen <= 0) return { dist: 0, dwelling: false };
  if (!stopDists.length || dwellM <= 0) {
    return {
      dist: ((driveM % pathLen) + pathLen) % pathLen,
      dwelling: false,
    };
  }

  const lapCost = pathLen + stopDists.length * dwellM;
  let rem = ((driveM % lapCost) + lapCost) % lapCost;
  let cursor = 0;
  for (let i = 0; i < stopDists.length; i++) {
    const nextStop = stopDists[i];
    const seg = Math.max(0, nextStop - cursor);
    if (rem <= seg) return { dist: cursor + rem, dwelling: false };
    rem -= seg;
    if (rem <= dwellM) return { dist: nextStop, dwelling: true };
    rem -= dwellM;
    cursor = nextStop;
  }
  // After last stop → end of path, then wrap (brief dwell at terminus)
  const tail = Math.max(0, pathLen - cursor);
  if (rem <= tail) return { dist: cursor + rem, dwelling: false };
  rem -= tail;
  if (rem <= dwellM) return { dist: pathLen > 0 ? pathLen : 0, dwelling: true };
  return { dist: 0, dwelling: false };
}

/** Keep the viewport where buses + stops stay readable. */
const MIN_ZOOM = 12;
const MAX_ZOOM = 16;
const START_ZOOM = 12.8;

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  center: [13.39, 52.515],
  zoom: START_ZOOM,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  maxBounds: [
    [13.2, 52.42],
    [13.6, 52.6],
  ],
  bearing: 0,
  pitch: 0,
  maxPitch: 0,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  renderWorldCopies: false,
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
  try {
    if (typeof map.setTerrain === "function") map.setTerrain(null);
  } catch {
    /* no terrain */
  }
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.type === "fill-extrusion" && map.getLayer(layer.id)) {
      map.removeLayer(layer.id);
    }
  }
}

map.on("style.load", flattenBasemap);

/** @type {Map<string, boolean>} */
const enabledRoutes = new Map();

/** @type {Array<{
 *   id: string,
 *   name: string,
 *   mode: string,
 *   color: string,
 *   vehicles: number,
 *   path: ReturnType<typeof buildPath>,
 *   stopDists: number[],
 *   fromName: string,
 *   toName: string,
 *   stopCount: number,
 *   feature: object
 * }>} */
let routes = [];

/** Full FeatureCollection (for stops filter). */
let rawFc = null;

let showVehicles = true;
/** Multiplier on real street speed (1 = ~22 km/h). */
let speedMul = 1;
let raf = 0;
let lastTs = 0;
/** Accumulated driving meters (geographic). */
let driveClockM = 0;

const statusEl = document.getElementById("status");
const routeListEl = document.getElementById("route-list");
const toggleVehicles = document.getElementById("toggle-vehicles");
const speedInput = document.getElementById("speed");
const speedVal = document.getElementById("speed-val");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}

function routeCollection(activeIds) {
  return {
    type: "FeatureCollection",
    features: routes.filter((r) => activeIds.has(r.id)).map((r) => r.feature),
  };
}

function stopCollection(fc, activeIds) {
  return {
    type: "FeatureCollection",
    features: (fc.features || []).filter((f) => {
      if (f.properties?.kind !== "stop") return false;
      const ids = f.properties.route_ids || [];
      return ids.some((id) => activeIds.has(id));
    }),
  };
}

function activeIdSet() {
  const s = new Set();
  for (const [id, on] of enabledRoutes) {
    if (on) s.add(id);
  }
  return s;
}

function shortStop(name) {
  return String(name || "")
    .replace(/\s*\(Berlin\).*$/i, "")
    .replace(/^S\+U\s+/i, "")
    .replace(/\s*\[Bushafen\]/i, "")
    .trim();
}

function renderRouteList() {
  if (!routeListEl) return;
  routeListEl.innerHTML = "";
  for (const r of routes) {
    const km = (r.path.total / 1000).toFixed(1);
    const via = `${shortStop(r.fromName)} → ${shortStop(r.toName)}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "route-chip";
    btn.setAttribute("aria-pressed", String(enabledRoutes.get(r.id) !== false));
    btn.title = via;
    btn.innerHTML = `
      <span class="route-swatch" style="background:${r.color}"></span>
      <span class="route-meta">
        <span class="route-name">${r.name}</span>
        <span class="route-mode">${r.stopCount} stops · ~${km} km</span>
      </span>
    `;
    btn.addEventListener("click", () => {
      const next = !(enabledRoutes.get(r.id) !== false);
      enabledRoutes.set(r.id, next);
      btn.setAttribute("aria-pressed", String(next));
      refreshStaticLayers();
      updateStatusCount();
      fitActiveRoutes();
    });
    routeListEl.appendChild(btn);
  }
}

function fitActiveRoutes() {
  const ids = activeIdSet();
  const bounds = new maplibregl.LngLatBounds();
  let any = false;
  for (const r of routes) {
    if (!ids.has(r.id)) continue;
    for (const p of r.path.points) {
      bounds.extend([p.lon, p.lat]);
      any = true;
    }
  }
  if (!any || bounds.isEmpty()) return;
  map.fitBounds(bounds, {
    padding: { top: 48, right: 48, bottom: 48, left: 340 },
    minZoom: MIN_ZOOM,
    maxZoom: Math.min(13.2, MAX_ZOOM),
    duration: 600,
  });
}

function refreshStaticLayers() {
  const ids = activeIdSet();
  const routeSrc = map.getSource("transit-routes");
  const stopSrc = map.getSource("transit-stops");
  if (routeSrc) routeSrc.setData(routeCollection(ids));
  if (stopSrc && rawFc) stopSrc.setData(stopCollection(rawFc, ids));
}

function updateStatusCount() {
  const n = [...enabledRoutes.values()].filter(Boolean).length;
  const kmh = Math.round(BUS_SPEED_KMH * speedMul);
  setStatus(
    showVehicles
      ? `${n} line${n === 1 ? "" : "s"} · ~${kmh} km/h street speed`
      : `${n} line${n === 1 ? "" : "s"} · buses off`,
  );
}

/** Stops ordered for the reverse trip (terminus → origin). */
function reverseStopDists(pathLen, stopDists) {
  return stopDists
    .map((d) => Math.max(0, pathLen - d))
    .sort((a, b) => a - b);
}

function vehicleFeatures() {
  if (!showVehicles) return [];
  const ids = activeIdSet();
  const speedMs = (BUS_SPEED_KMH * speedMul * 1000) / 3600;
  const dwellM = speedMs * DWELL_S;

  /** @type {object[]} */
  const features = [];
  for (const r of routes) {
    if (!ids.has(r.id)) continue;
    const perDir = Math.max(2, r.vehicles | 0);
    const pathLen = r.path.total;
    const lapCost =
      pathLen + Math.max(1, r.stopDists.length) * Math.max(dwellM, 1);

    /** @type {{ dir: string, stops: number[] }[]} */
    const dirs = [
      { dir: "out", stops: r.stopDists },
      { dir: "back", stops: reverseStopDists(pathLen, r.stopDists) },
    ];

    for (const { dir, stops } of dirs) {
      for (let i = 0; i < perDir; i++) {
        // Stagger both direction fleets so they don't stack on the same spots.
        const phase =
          (i / perDir) * lapCost + (dir === "back" ? lapCost / (perDir * 2) : 0);
        const { dist: along, dwelling } = positionWithDwell(
          driveClockM + phase,
          pathLen,
          stops,
          dwellM,
        );
        // Reverse trip is measured 0→pathLen from the outbound terminus back.
        const dist = dir === "out" ? along : pathLen - along;
        const coords = pointAtDistance(r.path, dist);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coords },
          properties: {
            id: `${r.id}-bus-${dir}-${i}`,
            route: r.name,
            busColor: r.color,
            dir,
            dwelling: dwelling ? 1 : 0,
          },
        });
      }
    }
  }
  return features;
}

function ensureVehicleLayers() {
  if (!map.getSource("transit-vehicles")) return;
  if (map.getLayer("transit-vehicles")) return;

  if (!map.getLayer("transit-vehicles-halo")) {
    map.addLayer({
      id: "transit-vehicles-halo",
      type: "circle",
      source: "transit-vehicles",
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "dwelling"], 1],
          BUS_HALO_STOP,
          BUS_HALO,
        ],
        "circle-color": "#ffffff",
        "circle-opacity": 0.95,
      },
    });
  }

  map.addLayer({
    id: "transit-vehicles",
    type: "circle",
    source: "transit-vehicles",
    paint: {
      "circle-radius": [
        "case",
        ["==", ["get", "dwelling"], 1],
        BUS_RADIUS_STOP,
        BUS_RADIUS,
      ],
      "circle-color": ["get", "busColor"],
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#ffffff",
    },
  });
}

function tick(ts) {
  try {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(64, ts - lastTs) / 1000;
    lastTs = ts;

    // Advance by real street meters — independent of zoom.
    const speedMs = (BUS_SPEED_KMH * speedMul * 1000) / 3600;
    driveClockM += speedMs * dt;

    const vehSrc = map.getSource("transit-vehicles");
    if (vehSrc) {
      ensureVehicleLayers();
      vehSrc.setData({
        type: "FeatureCollection",
        features: vehicleFeatures(),
      });
    }
  } catch (err) {
    console.error("transit tick", err);
  } finally {
    raf = requestAnimationFrame(tick);
  }
}

async function boot() {
  const res = await fetch(ROUTES_URL);
  if (!res.ok) throw new Error(`Failed to load routes (${res.status})`);
  rawFc = await res.json();

  const stopByRoute = new Map();
  for (const f of rawFc.features || []) {
    if (f.properties?.kind !== "stop") continue;
    for (const rid of f.properties.route_ids || []) {
      if (!stopByRoute.has(rid)) stopByRoute.set(rid, []);
      stopByRoute.get(rid).push({
        coordinates: f.geometry.coordinates,
        name: f.properties.name,
        stop_index: Number(f.properties.stop_index) || 0,
      });
    }
  }

  routes = (rawFc.features || [])
    .filter(
      (f) => f.properties?.kind === "route" && f.geometry?.type === "LineString",
    )
    .map((f) => {
      const p = f.properties;
      const path = buildPath(f.geometry.coordinates);
      const stops = (stopByRoute.get(p.id) || []).slice().sort(
        (a, b) => a.stop_index - b.stop_index,
      );
      enabledRoutes.set(p.id, true);
      return {
        id: p.id,
        name: p.name,
        mode: p.mode || "bus",
        color: p.color,
        vehicles: Number(p.vehicles) || 2,
        path,
        stopDists: stopDistancesOnPath(path, stops),
        fromName: stops[0]?.name || "",
        toName: stops[stops.length - 1]?.name || "",
        stopCount: stops.length,
        feature: f,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  renderRouteList();

  const ids = activeIdSet();

  map.addSource("transit-routes", {
    type: "geojson",
    data: routeCollection(ids),
  });
  map.addSource("transit-stops", {
    type: "geojson",
    data: stopCollection(rawFc, ids),
  });
  map.addSource("transit-vehicles", {
    type: "geojson",
    data: emptyCollection(),
  });

  map.addLayer({
    id: "transit-routes-casing",
    type: "line",
    source: "transit-routes",
    paint: {
      "line-color": "#ffffff",
      "line-width": 8,
      "line-opacity": 0.92,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });

  map.addLayer({
    id: "transit-routes-line",
    type: "line",
    source: "transit-routes",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 4.5,
      "line-opacity": 0.95,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });

  map.addLayer({
    id: "transit-stops-halo",
    type: "circle",
    source: "transit-stops",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        MIN_ZOOM,
        7,
        14,
        9,
        MAX_ZOOM,
        10,
      ],
      "circle-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  });

  map.addLayer({
    id: "transit-stops",
    type: "circle",
    source: "transit-stops",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        MIN_ZOOM,
        4,
        14,
        5,
        MAX_ZOOM,
        5.5,
      ],
      "circle-color": "#202124",
    },
  });

  map.addLayer({
    id: "transit-stops-label",
    type: "symbol",
    source: "transit-stops",
    minzoom: 13,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
      "text-offset": [0, 1.25],
      "text-anchor": "top",
      "text-optional": true,
      "text-padding": 4,
    },
    paint: {
      "text-color": "#202124",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });

  ensureVehicleLayers();

  map.on("click", "transit-vehicles", (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const kmh = Math.round(BUS_SPEED_KMH * speedMul);
    const dirLabel =
      f.properties?.dir === "back" ? "inbound" : "outbound";
    new maplibregl.Popup({ closeButton: true, offset: 12 })
      .setLngLat(e.lngLat)
      .setHTML(
        `<strong>${f.properties?.route || "Bus"}</strong><br/><span style="color:#5f6368">~${kmh} km/h · ${dirLabel}</span>`,
      )
      .addTo(map);
  });

  map.on("mouseenter", "transit-vehicles", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "transit-vehicles", () => {
    map.getCanvas().style.cursor = "";
  });

  updateStatusCount();
  fitActiveRoutes();
  raf = requestAnimationFrame(tick);
}

toggleVehicles?.addEventListener("change", () => {
  showVehicles = Boolean(toggleVehicles.checked);
  updateStatusCount();
});

speedInput?.addEventListener("input", () => {
  speedMul = Number(speedInput.value) || 1;
  if (speedVal) speedVal.textContent = `${speedMul}×`;
  updateStatusCount();
});

map.on("load", () => {
  boot().catch((err) => {
    console.error(err);
    setStatus("Could not load route data");
  });
});

window.addEventListener("pagehide", () => {
  if (raf) cancelAnimationFrame(raf);
});
