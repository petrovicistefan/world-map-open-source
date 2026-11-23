import {
  OVERLAY_MANIFEST,
  TAXONOMY_URL,
  loadSvgImage,
} from "./overlays-config.js";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const CHIP_LABELS = {
  all: "All",
  services: "Services",
  family: "Kids",
  places: "Places",
  nature: "Nature",
  transport: "Transit",
  culture: "Culture",
  community: "Community",
};

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  center: [13.405, 52.52],
  zoom: 12,
  bearing: 0,
  pitch: 0,
  maxPitch: 0,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  // Keep the basemap flat (no tilt / extrusion UI)
  renderWorldCopies: true,
});

// Zoom only — no compass / 3D tilt
map.addControl(
  new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
  "top-right",
);

/** Strip 3D building extrusions + terrain from the basemap style. */
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

const layerIds = OVERLAY_MANIFEST.map((e) => e.id);

/** @type {string | null} */
let activeFilter = null;

/** @type {string} */
let searchQuery = "";

/** @type {Array<{ id: string, name: string, category: string, kind: string, source: string, coordinates: number[], icon: string }>} */
let allItems = [];

/** @type {maplibregl.Popup | null} */
let openPopup = null;

function categoryMeta(taxonomy, id) {
  return taxonomy.categories?.find((c) => c.id === id) ?? null;
}

function setLayerVisible(id, visible) {
  const v = visible ? "visible" : "none";
  if (map.getLayer(`lyr-${id}`)) {
    map.setLayoutProperty(`lyr-${id}`, "visibility", v);
  }
  if (map.getLayer(`lyr-${id}-circle`)) {
    map.setLayoutProperty(`lyr-${id}-circle`, "visibility", v);
  }
}

/** True if the pin is on the visible map canvas (not under the sidebar). */
function isOnVisibleMap(item) {
  const [lon, lat] = item.coordinates;
  const pt = map.project([lon, lat]);
  const canvas = map.getCanvas();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const panel = document.getElementById("results");
  const leftPad =
    panel && panel.dataset.expanded !== "false"
      ? Math.min(panel.offsetWidth + 24, w * 0.55)
      : 12;
  return pt.x >= leftPad && pt.x <= w && pt.y >= 0 && pt.y <= h;
}

/**
 * Sidebar list = pins visible on the map (+ chip filter),
 * then search narrows only among those — never outside the viewport.
 */
function visibleItems() {
  const onScreen = allItems.filter((item) => {
    if (activeFilter !== null && item.category !== activeFilter) return false;
    return isOnVisibleMap(item);
  });

  const q = searchQuery.trim().toLowerCase();
  if (!q) return onScreen;

  return onScreen.filter((item) => {
    const hay = `${item.name} ${item.kind} ${item.category}`.toLowerCase();
    return hay.includes(q);
  });
}

function syncClearButton() {
  const clearBtn = document.getElementById("search-clear");
  if (!clearBtn) return;
  clearBtn.hidden = searchQuery.trim() === "";
}

function popupHtml(item) {
  return `<strong>${item.name}</strong><br/>
    <code>${item.id}</code><br/>
    ${item.category}/${item.kind}<br/>
    source: ${item.source ?? "—"}`;
}

function focusItem(item) {
  const [lon, lat] = item.coordinates;
  map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 14) });
  if (openPopup) openPopup.remove();
  openPopup = new maplibregl.Popup()
    .setLngLat([lon, lat])
    .setHTML(popupHtml(item))
    .addTo(map);

  document.querySelectorAll(".results-list button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.id === item.id);
  });
}

function renderResultsList() {
  const list = document.getElementById("results-list");
  const title = document.getElementById("results-title");
  const countEl = document.getElementById("results-count");
  if (!list || !title || !countEl) return;

  const items = visibleItems();
  const label =
    activeFilter === null
      ? "Results in map"
      : CHIP_LABELS[activeFilter] ?? activeFilter;

  title.textContent = label;
  countEl.textContent = String(items.length);
  list.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "results-empty";
    empty.textContent = searchQuery.trim()
      ? "No matches among visible places."
      : "No places visible — pan or zoom the map.";
    list.appendChild(empty);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = item.id;
    btn.innerHTML = `
      <img src="${item.icon}" alt="" width="28" height="28" />
      <span>
        <span class="name"></span>
        <span class="meta"></span>
      </span>`;
    btn.querySelector(".name").textContent = item.name;
    btn.querySelector(".meta").textContent = `${String(item.kind).replace(/_/g, " ")} · ${item.category}`;
    btn.addEventListener("click", () => {
      setResultsExpanded(true);
      focusItem(item);
    });
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function setResultsExpanded(expanded) {
  const panel = document.getElementById("results");
  const toggle = document.getElementById("results-toggle");
  if (!panel || !toggle) return;
  panel.dataset.expanded = expanded ? "true" : "false";
  toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function applyFilter(filterId) {
  activeFilter = filterId;
  for (const id of layerIds) {
    setLayerVisible(id, filterId === null || filterId === id);
  }

  document.querySelectorAll(".chip").forEach((btn) => {
    const id = btn.getAttribute("data-filter");
    const pressed =
      (filterId === null && id === "all") ||
      (filterId !== null && id === filterId);
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  });

  renderResultsList();
  setResultsExpanded(true);

  const hint = document.getElementById("filter-hint");
  if (hint) {
    hint.textContent =
      filterId === null
        ? "Showing all layers"
        : `Showing only ${CHIP_LABELS[filterId] ?? filterId}`;
    hint.classList.add("is-visible");
    clearTimeout(hint._hideTimer);
    hint._hideTimer = setTimeout(() => {
      hint.classList.remove("is-visible");
    }, 1600);
  }
}

function buildChips(taxonomy) {
  const root = document.getElementById("chips");
  if (!root) return;
  root.innerHTML = "";

  const makeChip = (id, label, iconSrc) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.filter = id;
    btn.setAttribute("aria-pressed", id === "all" ? "true" : "false");
    if (iconSrc) {
      const img = document.createElement("img");
      img.src = iconSrc;
      img.alt = "";
      img.width = 18;
      img.height = 18;
      btn.appendChild(img);
    }
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener("click", () => {
      if (id === "all") applyFilter(null);
      else if (activeFilter === id) applyFilter(null);
      else applyFilter(id);
    });
    root.appendChild(btn);
  };

  makeChip("all", CHIP_LABELS.all, null);
  for (const entry of OVERLAY_MANIFEST) {
    const meta = categoryMeta(taxonomy, entry.id);
    const icon = meta?.icon
      ? `../../${meta.icon}`
      : `../../assets/icons/${entry.id}.svg`;
    makeChip(entry.id, CHIP_LABELS[entry.id] ?? entry.id, icon);
  }
}

document.getElementById("results-toggle")?.addEventListener("click", () => {
  const panel = document.getElementById("results");
  const open = panel?.dataset.expanded !== "true";
  setResultsExpanded(open);
});

const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");

searchInput?.addEventListener("input", () => {
  searchQuery = searchInput.value || "";
  syncClearButton();
  renderResultsList();
});

searchClear?.addEventListener("click", () => {
  searchQuery = "";
  if (searchInput) searchInput.value = "";
  syncClearButton();
  searchInput?.focus();
  renderResultsList();
});

// Sidebar follows the map viewport
map.on("moveend", () => {
  renderResultsList();
});

map.on("load", async () => {
  flattenBasemap();

  const taxonomy = await fetch(TAXONOMY_URL).then((r) => {
    if (!r.ok) throw new Error("Failed to load taxonomy");
    return r.json();
  });

  buildChips(taxonomy);
  allItems = [];

  for (const entry of OVERLAY_MANIFEST) {
    const meta = categoryMeta(taxonomy, entry.id);
    const iconPath = meta?.icon
      ? `../../${meta.icon}`
      : `../../assets/icons/${entry.id}.svg`;
    const color = meta?.color ?? "#333";

    try {
      const img = await loadSvgImage(iconPath);
      if (!map.hasImage(`icon-${entry.id}`)) {
        map.addImage(`icon-${entry.id}`, img, { sdf: false });
      }
    } catch (err) {
      console.warn("Icon load failed:", entry.id, err);
    }

    const data = await fetch(entry.url).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${entry.url}`);
      return r.json();
    });

    for (const f of data.features || []) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!p.id || !coords) continue;
      allItems.push({
        id: p.id,
        name: p.name || p.id,
        category: p.category || entry.id,
        kind: p.kind || "",
        source: p.source || "",
        coordinates: coords,
        icon: iconPath,
      });
    }

    const sourceId = `src-${entry.id}`;
    const circleId = `lyr-${entry.id}-circle`;
    const symbolId = `lyr-${entry.id}`;

    map.addSource(sourceId, { type: "geojson", data });

    map.addLayer({
      id: circleId,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": 11,
        "circle-color": color,
        "circle-opacity": 0.18,
      },
    });

    if (map.hasImage(`icon-${entry.id}`)) {
      map.addLayer({
        id: symbolId,
        type: "symbol",
        source: sourceId,
        layout: {
          "icon-image": `icon-${entry.id}`,
          "icon-size": 0.45,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    } else {
      map.addLayer({
        id: symbolId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 7,
          "circle-color": color,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
    }

    map.on("click", symbolId, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = f.properties?.id;
      const item = allItems.find((x) => x.id === id);
      if (item) {
        setResultsExpanded(true);
        focusItem(item);
      }
    });
    map.on("mouseenter", symbolId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", symbolId, () => {
      map.getCanvas().style.cursor = "";
    });
  }

  // Stable order in the list
  allItems.sort((a, b) => a.name.localeCompare(b.name));
  applyFilter(null);
});
