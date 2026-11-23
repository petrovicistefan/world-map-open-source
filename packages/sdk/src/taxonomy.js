/**
 * Inline copy of schemas/taxonomy.json — keep in sync.
 */
export const TAXONOMY = {
  "version": "0.3.1",
  "default_license": "ODbL-1.0",
  "id_convention": "{category}/{city}-{slug}",
  "product_focus": [
    "women",
    "children"
  ],
  "sources": [
    "survey",
    "osm-gap",
    "agent",
    "import"
  ],
  "categories": [
    {
      "id": "services",
      "status": "mvp",
      "review_policy": "open",
      "priority": 1,
      "description": "Everyday local services especially useful to women — salon, tailor, laundry, midwife, physio — curated pins, not every shop",
      "kinds": [
        "hairdresser",
        "beauty_salon",
        "nail_salon",
        "tailor",
        "laundry",
        "dry_clean",
        "shoe_repair",
        "jewelry_repair",
        "physiotherapy",
        "yoga_studio",
        "midwife",
        "gyn_clinic",
        "cosmetics_shop"
      ],
      "icon": "assets/icons/services.svg",
      "color": "#7b1fa2"
    },
    {
      "id": "family",
      "status": "mvp",
      "review_policy": "open",
      "priority": 1,
      "description": "Spaces for children: playgrounds, indoor play, creche / Kita / after-school — plus practical facilities when out with kids",
      "kinds": [
        "playground",
        "indoor_play",
        "creche",
        "kita",
        "after_school",
        "changing_table",
        "nursing_room",
        "family_restroom",
        "stroller_friendly",
        "pediatric_clinic"
      ],
      "icon": "assets/icons/family.svg",
      "color": "#e91e63"
    },
    {
      "id": "places",
      "status": "mvp",
      "review_policy": "open",
      "description": "Everyday amenities (pharmacy, cafés, toilets, libraries)",
      "kinds": [
        "cafe",
        "coworking",
        "library",
        "toilet",
        "drinking_water",
        "atm",
        "wifi",
        "pharmacy"
      ],
      "icon": "assets/icons/places.svg",
      "color": "#0d6e6e"
    },
    {
      "id": "nature",
      "status": "mvp",
      "review_policy": "open",
      "description": "Outdoors and landscape-oriented features",
      "kinds": [
        "viewpoint",
        "trailhead",
        "swim",
        "picnic",
        "dark_sky",
        "park_gate"
      ],
      "icon": "assets/icons/nature.svg",
      "color": "#2f7d32"
    },
    {
      "id": "transport",
      "status": "mvp",
      "review_policy": "open",
      "description": "Micromobility and last-mile infrastructure often incomplete on basemaps",
      "kinds": [
        "bike_parking",
        "ev_charger",
        "carshare",
        "micromobility"
      ],
      "icon": "assets/icons/transport.svg",
      "color": "#1565c0"
    },
    {
      "id": "culture",
      "status": "mvp",
      "review_policy": "open",
      "description": "Art, venues, and cultural landmarks curated by contributors",
      "kinds": [
        "mural",
        "venue",
        "memorial",
        "exhibition"
      ],
      "icon": "assets/icons/culture.svg",
      "color": "#6a1b9a"
    },
    {
      "id": "community",
      "status": "mvp",
      "review_policy": "human_required",
      "description": "Mutual aid and civic services. Agents draft only. Never publish secret refuge coordinates.",
      "kinds": [
        "mutual_aid",
        "tool_library",
        "repair_cafe",
        "cooling_center",
        "free_wifi",
        "women_support"
      ],
      "icon": "assets/icons/community.svg",
      "color": "#c62828"
    }
  ],
  "later_categories": [
    "food",
    "sport",
    "accessibility",
    "events",
    "hazards",
    "food_rescue"
  ],
  "layer_contract": {
    "description": "When creating a new overlay category/layer, set id, kinds, review_policy, icon (SVG under assets/icons/), and color. The demo loads icon onto the map as a MapLibre symbol.",
    "required_fields": [
      "id",
      "kinds",
      "review_policy",
      "icon",
      "color",
      "description",
      "status"
    ]
  }
};

/** @type {string[]} */
export const MVP_CATEGORIES = TAXONOMY.categories.map((c) => c.id);

const ID_PATTERN = /^[a-z0-9]+(?:[/_-][a-z0-9]+)*$/;

export function getCategory(category) {
  return TAXONOMY.categories.find((c) => c.id === category);
}

export function listKinds(category) {
  return getCategory(category)?.kinds ?? [];
}

/** @param {string} [category="services"] */
export function featureTemplate(category = "services") {
  const kinds = listKinds(category);
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {
      id: `${category}/city-slug`,
      name: "",
      category,
      kind: kinds[0] ?? "",
      source: "agent",
      verified_at: "",
      license: TAXONOMY.default_license,
      extra: { city: "" },
    },
  };
}

export { ID_PATTERN };
