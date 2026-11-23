#!/usr/bin/env node
// Validate overlays GeoJSON against schemas/overlay.schema.json + unique ids.
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL("..", import.meta.url));
const schemaPath = join(root, "schemas/overlay.schema.json");
const overlaysDir = join(root, "overlays");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".geojson")) out.push(p);
  }
  return out;
}

const files = walk(overlaysDir);
if (files.length === 0) {
  console.error("No overlay files found");
  process.exit(1);
}

let failed = false;
const ids = new Map();

for (const file of files) {
  const rel = relative(root, file);
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (!validate(data)) {
    failed = true;
    console.error(`SCHEMA FAIL: ${rel}`);
    for (const err of validate.errors?.slice(0, 8) ?? []) {
      console.error(`  ${err.instancePath || "/"} ${err.message}`);
    }
    continue;
  }
  console.log(`OK schema: ${rel}`);

  for (const [i, feat] of (data.features || []).entries()) {
    const fid = feat?.properties?.id;
    if (!fid) {
      failed = true;
      console.error(`MISSING id: ${rel} feature[${i}]`);
      continue;
    }
    if (ids.has(fid)) {
      failed = true;
      console.error(`DUPLICATE id ${fid}: ${ids.get(fid)} and ${rel}`);
    } else {
      ids.set(fid, rel);
    }
  }
}

if (failed) process.exit(1);
console.log(`OK — ${ids.size} unique feature ids across ${files.length} files`);
