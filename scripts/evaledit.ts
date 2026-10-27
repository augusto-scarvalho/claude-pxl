// What an edit of a scene changed, by id (docs/evaluation-edit.md): two versions of an art file built at a
// few frames as pxl edit builds them (no light passes), each changed pixel given to the placements whose own
// pixels there differ (a shadow's copy with its thing), else the world3d part that painted it, else
// "background" (code drew it); describe --diff between them; the pixels outside what the request names
// (--touch ids); and pxl check on the after file.
//
//   node scripts/evaledit.ts <before.px.js> <after.px.js> <scene> [--touch a,b] [--frames 0,40]
import { basename } from "node:path";
import type { BuildOut } from "../src/core/build.ts";
import type { Placement } from "../src/core/canvas.ts";
import { TRANSPARENT } from "../src/core/color.ts";
import { describe, labelOf } from "../src/core/describe.ts";
import { checkProject } from "../src/node/check.ts";
import { loadProject } from "../src/node/load.ts";
import { frameCount, frameTime } from "../src/node/shot.ts";

const args = process.argv.slice(2), opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const touch = opt("--touch")?.split(",") ?? [], framesArg = opt("--frames");
const [fa, fb, scene] = args;
if (!scene) { console.error("usage: node scripts/evaledit.ts <before.px.js> <after.px.js> <scene> [--touch a,b] [--frames 0,40]"); process.exit(1); }
const A = loadProject(fa, { checksOnly: true, where: true }), B = loadProject(fb, { checksOnly: true, where: true });
const n = frameCount(A, scene), frames = framesArg ? framesArg.split(",").map(Number) : [...new Set([0, Math.floor(n / 2)])];

const labelsOf = (b: BuildOut) => {
  const groups = new Map<string, Placement[]>();
  for (const q of b.placements) { const k = `${q.name}@${q.layer ?? ""}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(q); }
  return new Map(b.placements.map((q) => [q, labelOf(q, groups.get(`${q.name}@${q.layer ?? ""}`)!)]));
};
const touched = (l: string) => touch.some((t) => l === t || l.startsWith(t + ".") || l.startsWith(t + " #"));
let outside = 0;
for (const f of frames) {
  const a = A.build(scene, 0, frameTime(A, scene, f)), b = B.build(scene, 0, frameTime(B, scene, f));
  const W = a.img.w, H = a.img.h, ch = new Uint8Array(W * H);
  for (let j = 0; j < W * H; j++) if (a.img.data[j] !== b.img.data[j]) ch[j] = 1;
  // at each changed pixel, the labels covering it, with their layer and color there
  const covers = (x: BuildOut) => {
    const out = new Map<number, { l: string; k: string }[]>();
    for (const [q, l] of labelsOf(x))
      for (let y = 0; y < q.img.h; y++) for (let xx = 0; xx < q.img.w; xx++) {
        const X = q.x + xx, Y = q.y + y, c = q.img.data[y * q.img.w + xx];
        if (c !== TRANSPARENT && X >= 0 && Y >= 0 && X < W && Y < H && ch[Y * W + X]) (out.get(Y * W + X) ?? out.set(Y * W + X, []).get(Y * W + X)!).push({ l, k: `${q.layer ?? ""}:${c}` });
      }
    return out;
  };
  const ca = covers(a), cb = covers(b), by = new Map<string, number>();
  const part = (x: BuildOut, j: number) => { const P = x.img.parts, k = P ? P.ids[j] : -1; return k >= 0 ? P!.names[k].split(".")[0] : undefined; };
  let total = 0, out = 0;
  for (let j = 0; j < W * H; j++) {
    if (!ch[j]) continue;
    total++;
    const Ea = ca.get(j) ?? [], Eb = cb.get(j) ?? [], its = (E: typeof Ea, l: string) => E.filter((e) => e.l === l).map((e) => e.k).join();
    let who = [...new Set([...Ea, ...Eb].map((e) => e.l))].filter((l) => its(Ea, l) !== its(Eb, l));
    if (!who.length) who = [...new Set([part(a, j), part(b, j)].filter((v): v is string => !!v))];
    if (!who.length) who = ["background"];
    for (const l of who) by.set(l, (by.get(l) ?? 0) + 1);
    if (touch.length && !who.some(touched)) out++;
  }
  outside += out;
  const d = describe(scene, b, B.assets.get(scene)!.pal, { prev: describe(scene, a, A.assets.get(scene)!.pal).snap }).text.split("\n");
  const i = d.findIndex((l) => l.startsWith("CHANGES")), e = d.indexOf("", i);
  console.log(`frame ${f}: ${total} px changed; by id: ${[...by].sort((u, v) => v[1] - u[1]).map(([l, k]) => `${l} ${k}`).join(", ") || "none"}${touch.length ? `; outside ${touch.join(",")}: ${out} px` : ""}`);
  if (i >= 0) console.log(d.slice(i + 1, e < 0 ? undefined : e).filter((l) => !/^\s+(pixels:|region|…)/.test(l)).join("\n"));
}
if (touch.length) console.log(`outside what the request names, over frames ${frames.join(", ")}: ${outside} px`);
const c = checkProject(loadProject(fb, { checksOnly: true }), { file: basename(fb) });
console.log(`check: ${c.lines.length} warnings (${c.coverage})${c.lines.map((l) => "\n  " + l).join("")}`);
