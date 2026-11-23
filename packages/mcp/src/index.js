#!/usr/bin/env node
/**
 * World Map Open Source — file-backed MCP server (stdio).
 * Thin I/O over schemas/ + overlays/; reuses packages/sdk validation.
 *
 * Env: WORLD_MAP_ROOT (optional) — absolute path to repo root.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getRepoRoot,
  loadTaxonomyFile,
  listOverlayFiles,
  readOverlay,
  validateOverlayFile,
  getMapStyleHints,
  proposeFeature,
  featureTemplate,
} from "./repo.js";

const server = new McpServer({
  name: "world-map-open-source",
  version: "0.1.0",
});

function text(payload) {
  return {
    content: [
      {
        type: "text",
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

server.tool(
  "list_layers",
  "Return overlay category taxonomy (MVP kinds, review_policy) from schemas/taxonomy.json",
  {},
  async () => {
    const taxonomy = loadTaxonomyFile();
    return text({
      repoRoot: getRepoRoot(),
      version: taxonomy.version,
      default_license: taxonomy.default_license,
      id_convention: taxonomy.id_convention,
      sources: taxonomy.sources,
      categories: taxonomy.categories,
      later_categories: taxonomy.later_categories,
    });
  },
);

server.tool(
  "list_overlays",
  "List GeoJSON overlay files under overlays/ (optional category filter)",
  {
    category: z
      .enum([
        "services",
        "family",
        "places",
        "nature",
        "transport",
        "culture",
        "community",
      ])
      .optional()
      .describe("MVP category (services = women-useful; family = kids spaces)"),
  },
  async ({ category }) => {
    const files = listOverlayFiles(category);
    return text({
      repoRoot: getRepoRoot(),
      count: files.length,
      overlays: files.map((f) => ({ path: f.path, category: f.category })),
    });
  },
);

server.tool(
  "get_overlay",
  "Read one FeatureCollection from overlays/ (path relative to repo root)",
  {
    path: z
      .string()
      .describe("e.g. overlays/places/berlin.geojson"),
  },
  async ({ path }) => {
    try {
      const { path: p, data } = readOverlay(path);
      return text({
        path: p,
        featureCount: data.features?.length ?? 0,
        collection: data,
      });
    } catch (e) {
      return text({ ok: false, error: String(e.message || e) });
    }
  },
);

server.tool(
  "validate_overlay",
  "Validate a GeoJSON overlay file (SDK taxonomy checks + cross-file unique ids)",
  {
    path: z
      .string()
      .describe("e.g. overlays/nature/berlin.geojson"),
  },
  async ({ path }) => {
    try {
      return text(validateOverlayFile(path));
    } catch (e) {
      return text({ ok: false, error: String(e.message || e) });
    }
  },
);

server.tool(
  "get_map_style",
  "Return OpenFreeMap base style URL + overlay color hints for MapLibre demos",
  {},
  async () => text(getMapStyleHints()),
);

server.tool(
  "propose_feature",
  "Validate a GeoJSON Feature draft; optionally append to overlays/<category>/<dataset> (never commits or pushes)",
  {
    feature: z
      .any()
      .describe("GeoJSON Feature object with properties.id, category, kind, etc."),
    category: z
      .enum([
        "services",
        "family",
        "places",
        "nature",
        "transport",
        "culture",
        "community",
      ])
      .optional()
      .describe("Override/enforce category (services for women; family for kids)"),
    dataset: z
      .string()
      .optional()
      .describe("Filename under the category folder (default berlin.geojson)"),
    write: z
      .boolean()
      .optional()
      .describe("If true, append to disk when validation passes. Default false (dry-run)."),
  },
  async ({ feature, category, dataset, write }) => {
    const result = proposeFeature(feature, {
      category,
      dataset,
      write: write === true,
    });
    if (!result.ok && !feature?.properties) {
      result.example = featureTemplate(category || "family");
    }
    return text(result);
  },
);

console.error(
  `[world-map-mcp] repo=${getRepoRoot()} stdio ready (list_layers, list_overlays, get_overlay, validate_overlay, get_map_style, propose_feature)`,
);

const transport = new StdioServerTransport();
await server.connect(transport);
