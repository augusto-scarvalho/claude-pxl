import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASSET_OPTS, LAYER_OPTS, OP_OPTS, Project } from "../src/core/project.ts";
import { OPS } from "../src/core/canvas.ts";

const dts = readFileSync(new URL("../types/pxl.d.ts", import.meta.url), "utf8");
/** The body of `interface name { ... }` (and of what it extends in this file). */
const body = (name: string): string => {
  const at = dts.indexOf(`interface ${name} `);
  assert.ok(at >= 0, `types/pxl.d.ts has no interface ${name}`);
  let i = dts.indexOf("{", at), depth = 0;
  const start = i;
  do depth += dts[i] === "{" ? 1 : dts[i] === "}" ? -1 : 0; while (depth && ++i < dts.length);
  const base = /extends (?:Omit<)?(\w+)/.exec(dts.slice(at, start))?.[1];
  return dts.slice(start, i) + (base ? body(base) : "");
};
const missing = (keys: string[], text: string, as: (k: string) => RegExp) => keys.filter((k) => !as(k).test(text));
const opt = (k: string) => new RegExp(`\\b${k}\\?:`);

test("types/pxl.d.ts declares every global, op and option the runtime accepts", () => {
  // globals: functions, or objects of them (solid.stick, ...) declared as consts
  assert.deepEqual(missing(Object.keys(new Project().env()), dts, (k) => new RegExp(`(function ${k}\\(|const ${k}: )`)), [], "globals");
  assert.deepEqual(missing([...OPS, "plate", "clip"], body("PxCanvas"), (k) => new RegExp(`\\n {4}${k}\\(`)), [], "canvas methods");
  assert.deepEqual(missing(ASSET_OPTS.sprite, body("PxAssetOpts"), opt), [], "sprite options");
  assert.deepEqual(missing(ASSET_OPTS.scene, body("PxSceneOpts"), opt), [], "scene options");
  assert.deepEqual(missing(ASSET_OPTS.anim, body("PxAnimOpts"), opt), [], "anim options");
  assert.deepEqual(missing(LAYER_OPTS, body("PxLayerOpts"), opt), [], "layer options");
  assert.deepEqual(missing(Object.values(OP_OPTS).flat(), dts, (k) => new RegExp(`\\b${k}\\??:`)), [], "op options");
});
