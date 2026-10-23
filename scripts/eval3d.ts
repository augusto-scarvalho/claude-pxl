// What an edit of a 3D scene changed, part by part (docs/evaluation-3d.md): two versions of an art
// file drawn at a few moments of the loop, each pixel by the part that painted it (Img.parts: surface(),
// splats(), volume(), decal(), draw3d()). For each part: its pixels before and after, where it is (the
// middle's x), its mean color, and of the pixels it painted before, how many it still paints the same,
// how many it paints in another color, how many another part (or the ground) shows now. Parts the
// request names are given with --touch (a prefix: "oak" is oak.canopy, oak.trunk...); every other
// part's pixels that changed are the edit's unintended changes. Then the after file's expects.
//
//   node scripts/eval3d.ts <before.px.js> <after.px.js> [scene] [after scene] [--touch oak,smoke,mist]
import { loadProject } from "../src/node/load.ts";

const args = process.argv.slice(2), ti = args.indexOf("--touch");
const touch = ti >= 0 ? args.splice(ti, 2)[1].split(",") : [];
const [fa, fb, sa = "grove", sb = sa] = args;
if (!fb) { console.error("usage: node scripts/eval3d.ts <before.px.js> <after.px.js> [scene] [after scene] [--touch a,b]"); process.exit(1); }
const A = loadProject(fa), B = loadProject(fb);
type Row = { n: [number, number]; x: [number, number]; rgb: [number[], number[]]; same: number; recolored: number; covered: number };
const rows = new Map<string, Row>();
const row = (k: string) => rows.get(k) ?? rows.set(k, { n: [0, 0], x: [0, 0], rgb: [[0, 0, 0], [0, 0, 0]], same: 0, recolored: 0, covered: 0 }).get(k)!;
const at = [0, 900, 1800, 2700];
for (const t of at) {
  const a = A.image(sa, 0, t), b = B.image(sb, 0, t);
  if (a.w !== b.w || a.h !== b.h) throw new Error(`the scenes differ in size: ${a.w}x${a.h}, ${b.w}x${b.h}`);
  const name = (img: typeof a, i: number) => { const id = img.parts?.ids[i] ?? -1; return id >= 0 ? img.parts!.names[id] : "(ground)"; };
  for (let i = 0; i < a.data.length; i++) {
    const na = name(a, i), nb = name(b, i);
    for (const [s, n, c] of [[0, na, a.data[i]], [1, nb, b.data[i]]] as const) {
      const r = row(n); r.n[s]++; r.x[s] += i % a.w;
      r.rgb[s][0] += c >>> 24; r.rgb[s][1] += (c >>> 16) & 255; r.rgb[s][2] += (c >>> 8) & 255;
    }
    const r = row(na);
    if (na !== nb) r.covered++; else if (a.data[i] !== b.data[i]) r.recolored++; else r.same++;
  }
}
const hex = (v: number[], n: number) => (n ? "#" + v.map((c) => Math.round(c / n).toString(16).padStart(2, "0")).join("") : "-");
const touched = (k: string) => touch.some((p) => k === p || k.startsWith(p + "."));
let unintended = 0, kept = 0;
console.log(`part                 px before -> after   middle x    color before -> after   same   recolored  covered`);
for (const [k, r] of [...rows].sort((p, q) => q[1].n[0] - p[1].n[0])) {
  const mid = (s: 0 | 1) => (r.n[s] ? Math.round(r.x[s] / r.n[s]) : "-");
  console.log(`${(touched(k) ? "* " : "  ") + k.padEnd(19)}${String(r.n[0]).padStart(9)} -> ${String(r.n[1]).padEnd(8)}${String(mid(0)).padStart(5)} -> ${String(mid(1)).padEnd(5)}${hex(r.rgb[0], r.n[0]).padStart(9)} -> ${hex(r.rgb[1], r.n[1]).padEnd(9)}${String(r.same).padStart(7)}${String(r.recolored).padStart(11)}${String(r.covered).padStart(9)}`);
  if (!touched(k) && k !== "(ground)") { unintended += r.recolored + r.covered; kept += r.n[0]; }
}
const ex = B.runExpects();
console.log(`\n${at.length} moments (${at.join(", ")} ms); * the parts the request names (--touch)`);
if (touch.length) console.log(`unintended: ${unintended} of the ${kept} pixels of the parts it doesn't name changed (${kept ? ((100 * unintended) / kept).toFixed(1) : 0}%)`);
console.log(`after's expects: ${ex.filter((e) => e.ok).length} of ${ex.length} held${ex.filter((e) => !e.ok).map((e) => `\n  ${e.name}: ${e.text}: ${e.detail}`).join("")}`);
