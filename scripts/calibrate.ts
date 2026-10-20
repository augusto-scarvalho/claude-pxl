// How well `pxl study` takes apart pxl's own animations, measured against what their source says:
// each thing stamped (its box and the pixels that are its own, frame by frame), and the light (what
// changes only because the light does: the frame before lighting didn't change there). Each piece study
// finds is matched to the thing it covers best, frame by frame (box IoU); a thing found in pieces, or
// a piece over several things, is counted; its captures are compared with the thing's own pixels (mask
// IoU, and how much of each is the other's).
// Run: node scripts/calibrate.ts [asset ...] [--map DIR] (all, or only those; --map draws where the light
// was found right (green), what a thing changed taken for light (red), a shadow or effect taken for it
// (amber), light missed (blue), things (gray), shadows and effects (brown); -v lists every thing)
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Color, TRANSPARENT } from "../src/core/color.ts";
import { Img } from "../src/core/image.ts";
import { type BuildCtx, buildAsset } from "../src/core/build.ts";
import { replay } from "../src/core/steps.ts";
import { Trace } from "../src/core/trace.ts";
import { study } from "../src/core/study.ts";
import { dE } from "../src/core/vision.ts";
import { loadProject } from "../src/node/load.ts";
import { encodePng } from "../src/node/png.ts";
import { readFileSync, writeFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scenes: [string, string][] = [
  ["halloween/party.px.js", "party"],
  ["perspective/road.px.js", "road"],
  ["tropical/forest.px.js", "forest"],
  ["cave.px.js", "cave"],
  ["no_magic.px.js", "no_magic_night"],
  ["sunset/sunset.px.js", "sunset"],
  ["cyberpunk/sodium_hour.px.js", "sodium_hour"],
  ["perspective/park.px.js", "park"],
  ["rig/tournament.px.js", "tournament"],
];

type Box = [number, number, number, number];
const iou = (a: Box, b: Box) => {
  const w = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  return (w * h) / (a[2] * a[3] + b[2] * b[3] - w * h || 1);
};
type Piece = NonNullable<ReturnType<typeof study>["layers"]>["pieces"][number];
const differ = (a: Color, b: Color) => a !== b && ((a & 255) < 128 !== (b & 255) < 128 || dE(a, b) > 0.05);
// each pixel's commonest color, as study takes it (48 frames spread across the clip, the lowest of a tie)
const mode = (frames: Img[]) => {
  const N = frames.length, S = Array.from({ length: Math.min(N, 48) }, (_, i) => Math.floor((i * N) / Math.min(N, 48)));
  const WH = frames[0].w * frames[0].h, out = new Uint32Array(WH), vals = new Uint32Array(S.length);
  for (let p = 0; p < WH; p++) {
    S.forEach((t, i) => (vals[i] = frames[t].data[p]));
    vals.sort();
    let best = vals[0], run = 0, cur = 1;
    for (let i = 1; i <= vals.length; i++) { if (i < vals.length && vals[i] === vals[i - 1]) cur++; else { if (cur > run) { run = cur; best = vals[i - 1]; } cur = 1; } }
    out[p] = best;
  }
  return out;
};
const frames0 = (n: number, size: number) => Array.from({ length: n }, () => new Uint8Array(size));
const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0}%`;

const args = process.argv.slice(2), verbose = args.includes("-v") && !!args.splice(args.indexOf("-v"), 1), mi0 = args.indexOf("--map"), mapDir = mi0 >= 0 ? args.splice(mi0, 2)[1] : undefined, only = args;
for (const [file, name] of scenes.filter(([, n]) => !only.length || only.includes(n))) {
  // the frame before lighting needs a trace of every frame (slow: every painting step kept), so only
  // where the scene lights itself
  const lights = /lighting\(/.test(readFileSync(join(root, "examples", file), "utf8")), p = loadProject(join(root, "examples", file), { trace: lights });
  const tl = p.build(name).anim!;
  const times: number[] = [];
  if (tl.durations) { let t = 0; for (const ms of tl.durations) { times.push(t); t += ms; } }
  else for (let i = 0; i < Math.max(1, Math.min(400, Math.round(tl.loop / tl.step))); i++) times.push(i * tl.step);
  // built here with a trace for every frame (the project keeps one for the first only), on the scene's clock
  const def = p.assets.get(name)!, builds = times.map((t) => (lights ? buildAsset(p as unknown as BuildCtx, def, 0, new Trace(), t, def.kind !== "anim" ? tl : undefined) : p.build(name, 0, t)));
  const same = builds.every((b, i) => { if (i % 7) return true; const ref = p.build(name, 0, times[i]).img.data; return b.img.data.every((c, q) => c === ref[q]); });
  if (!same) console.log(`${name}: (frames built with a trace differ from the project's)`);
  const frames = builds.map((b) => b.img), W = frames[0].w, H = frames[0].h, WH = W * H, N = frames.length;
  // the frame before lighting
  const unlit = builds.map((b) => {
    let out = b.img, prev: Img | undefined, lit = false;
    if (b.trace) replay(b.trace, (s, im) => { if (!lit && (s.label === "light map" || s.label === "lighting")) { lit = true; if (prev) out = prev; } if (s.w === W && s.h === H) prev = im.copy(); });
    return out;
  });
  // the things in the source: each stamp (by asset, layer and its turn among the same) with the pixels it owns in each frame
  const things = new Map<string, Map<number, number[]>>(), stamps = new Map<string, Set<string>>(), glowAt = frames0(builds.length, WH);
  builds.forEach((b, t) => {
    const blended = new Set(b.layers.filter((l) => l.how === "blended").map((l) => l.name)), owner = new Int32Array(WH).fill(-1), turn = new Map<string, number>();
    const keys = b.placements.map((pl) => { const k = `${pl.name}@${pl.layer ?? ""}`, i = turn.get(k) ?? 0; turn.set(k, i + 1); return `${k}#${i + 1}`; });
    b.placements.forEach((pl, i) => { const sig = `${pl.x},${pl.y},${pl.img.data.reduce((a, c) => (a * 31 + c) >>> 0, 7)}`; (stamps.get(keys[i]) ?? stamps.set(keys[i], new Set()).get(keys[i])!).add(sig); });
    b.placements.forEach((pl, i) => {
      if (blended.has(pl.layer ?? "")) { for (let y = 0; y < pl.img.h; y++) for (let x = 0; x < pl.img.w; x++) { const X = pl.x + x, Y = pl.y + y; if (X >= 0 && Y >= 0 && X < W && Y < H && pl.img.data[y * pl.img.w + x] !== TRANSPARENT) glowAt[t][Y * W + X] = 1; } return; }
      for (let y = 0; y < pl.img.h; y++) for (let x = 0; x < pl.img.w; x++) {
        const X = pl.x + x, Y = pl.y + y;
        if (X >= 0 && Y >= 0 && X < W && Y < H && pl.img.data[y * pl.img.w + x] !== TRANSPARENT) owner[Y * W + X] = i;
      }
    });
    for (let q = 0; q < WH; q++) if (owner[q] >= 0) { const k = keys[owner[q]], m = things.get(k) ?? things.set(k, new Map()).get(k)!; (m.get(t) ?? m.set(t, []).get(t)!).push(q); }
  });
  const boxOf = (px: number[]): Box => { let x0 = W, y0 = H, x1 = -1, y1 = -1; for (const q of px) { const x = q % W, y = Math.floor(q / W); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
  // the ones that move or change (not the backdrop): stamped somewhere else or as another drawing from
  // frame to frame, or not in every frame (a thing passing in front of another doesn't make it move)
  const moving = [...things].filter(([k, m]) => {
    const sizes = [...m.values()].map((px) => px.length).sort((a, b) => a - b);
    if (sizes[sizes.length >> 1] < 6 || [...m.values()].some((px) => px.length > WH / 2)) return false;
    return stamps.get(k)!.size > 1 || m.size < N;
  });
  const r = study({ name, frames, ms: times.map((_, i) => (times[i + 1] ?? tl.loop) - times[i]), kind: "pxl" }), d = r.layers;
  if (!d) { console.log(`${name}: no decomposition (study read the whole view as moving)`); continue; }
  const pieces = d.pieces;
  // a piece's box in a frame: going somewhere, its track; in place, what its capture there holds (what
  // changes is often a part of it: an arm, a head), in the frames it was captured in only
  const boxesOf = (q: (typeof pieces)[0]) => {
    if (q.speed) return { all: true, at: new Map(q.track.map((e) => [e[0], [e[1], e[2], e[3], e[4]] as Box])) };
    const at = new Map<number, Box>();
    q.cuts.forEach((c, j) => { const [t, x0, y0] = q.cutsAt[j], px: number[] = []; for (let i = 0; i < c.w * c.h; i++) if ((c.data[i] & 255) >= 128) px.push((y0 + Math.floor(i / c.w)) * W + x0 + (i % c.w)); if (px.length) at.set(t, boxOf(px)); });
    return { all: false, at };
  };
  const tracks = pieces.map(boxesOf);
  // each thing's best piece: mean box IoU over the frames it shows in (in place: those it was captured in)
  const best = moving.map(([k, m]) => {
    const scores = tracks.map(({ all, at }) => { let s = 0, n = 0; for (const [t, px] of m) { const b = at.get(t); if (b) { s += iou(boxOf(px), b); n++; } else if (all) n++; } return n ? s / n : 0; });
    const i = scores.reduce((b, v, j) => (v > scores[b] ? j : b), 0);
    return { k, m, i, score: scores[i] ?? 0, scores };
  });
  const found = best.filter((b) => b.score >= 0.5), loose = best.filter((b) => b.score >= 0.2 && b.score < 0.5);
  // split: more than one piece mostly inside a thing; merged: a piece that is the best of several things
  const inside = (a: Box, b: Box) => { const w = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])); return (w * h) / (a[2] * a[3] || 1); };
  const split = best.filter(({ m }) => { const all = boxOf([...m.values()].flat()); return pieces.filter((q) => inside(q.box, all) >= 0.6 && q.box[2] * q.box[3] < all[2] * all[3]).length >= 2; });
  const merged = new Map<number, string[]>();
  for (const b of best) if (b.score >= 0.2) (merged.get(b.i) ?? merged.set(b.i, []).get(b.i)!).push(b.k);
  // masks: each capture of a thing's piece against the thing's own pixels that frame
  let mi = 0, mn = 0, mp = 0, mr = 0;
  for (const b of [...found, ...loose]) {
    const q = pieces[b.i];
    if (q.kind === "light") continue;
    q.cuts.forEach((c, j) => {
      const [t, x0, y0] = q.cutsAt[j], own = new Set(b.m.get(t) ?? []);
      let both = 0, any = own.size, cap = 0;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if ((c.data[y * c.w + x] & 255) >= 128) { const g = (y0 + y) * W + x0 + x; cap++; if (own.has(g)) both++; else any++; }
      if (any) { mi += both / any; mp += cap ? both / cap : 0; mr += own.size ? both / own.size : 0; mn++; }
    });
  }
  const lamps = pieces.filter((q) => q.source);
  for (const b of best) {
    if (b.score >= 0.5) continue;
    // a thing that shines (a pumpkin, a glowing mushroom): a light round it, from it, over most of it
    const bx = boxOf([...b.m.values()].flat()), j = lamps.findIndex((q) => q.source![0] >= bx[0] - 3 && q.source![0] < bx[0] + bx[2] + 3 && q.source![1] >= bx[1] - 3 && q.source![1] < bx[1] + bx[3] + 3 && iou(q.box, bx) * (q.box[2] * q.box[3] + bx[2] * bx[3]) / (1 + iou(q.box, bx)) >= 0.5 * bx[2] * bx[3]);
    if (j >= 0) { b.i = pieces.indexOf(lamps[j]); b.score = 0.5; found.push(b); const l = loose.indexOf(b); if (l >= 0) loose.splice(l, 1); }
  }
  const asLight = found.filter((b) => pieces[b.i].kind === "light").length;
  const out = [`${name}: ${N} frames ${W}x${H}; ${moving.length} things move in the source: ${found.length} found (box IoU >= 0.5${asLight ? `, or ${asLight} as lights shining from them` : ""}), ${loose.length} loosely (0.2-0.5), ${moving.length - found.length - loose.length} missed; mean box IoU of those found ${(found.reduce((a, b) => a + b.score, 0) / (found.length || 1)).toFixed(2)}; ${split.length} in several pieces; ${[...merged.values()].filter((v) => v.length > 1).length} pieces over several things; masks IoU ${(mi / (mn || 1)).toFixed(2)} (${pct(mp, mn)} of a capture is the thing, ${pct(mr, mn)} of the thing is in it) over ${mn} captures; ${pieces.length} pieces found in all`];
  // the light: what changes only because the light does, against what study took for light
  // each changed pixel's cause: a thing (a moving stamp is there, or was and has gone), the light alone
  // (the frame before lighting didn't change), or neither (a shadow cast, an effect drawn in code)
  const uMode = mode(unlit), fMode = mode(frames), ever = new Uint8Array(WH), now = frames.map(() => new Uint8Array(WH));
  for (const [, m] of moving) for (const [t, px] of m) for (const q of px) { ever[q] = 1; now[t][q] = 1; }
  const glowEver = new Uint8Array(WH);
  for (const g of glowAt) for (let q = 0; q < WH; q++) glowEver[q] |= g[q];
  const cause = (t: number, q: number) => {
    const u = differ(unlit[t].data[q], uMode[q]);
    if ((now[t][q] && differ(frames[t].data[q], fMode[q])) || (ever[q] && u)) return "thing";
    // a light or a shadow stamped in a layer that only lights or darkens is the light's too
    return u && !glowEver[q] ? "other" : differ(frames[t].data[q], fMode[q]) || u ? "light" : "";
  };
  let gl = 0, rl = 0, hit = 0, thing = 0, lost = 0, other = 0, otherRel = 0, still = 0;
  for (let t = 0; t < N; t++) for (let q = 0; q < WH; q++) {
    const c = cause(t, q), rel = d.light.relit[t]?.[q] === 1;
    if (c === "light") gl++;
    if (rel) { rl++; if (c === "light") hit++; }
    if (c === "thing") { thing++; if (rel) lost++; }
    if (c === "other") { other++; if (rel) otherRel++; }
    if (c === "" && rel) still++;
  }
  if (mapDir) {
    const ts = [0, N >> 2, N >> 1, (3 * N) >> 2], img = new Img(W * 2, H * ts.length);
    ts.forEach((t, k) => { for (let q = 0; q < WH; q++) {
      const x = q % W, y = Math.floor(q / W), c = frames[t].data[q], why = cause(t, q), rel = d.light.relit[t]?.[q] === 1;
      img.set(x, k * H + y, c);
      img.set(W + x, k * H + y, rel ? (why === "light" ? 0x50d050ff : why === "thing" ? 0xe04040ff : 0xd0a040ff) : why === "light" ? 0x4070f0ff : why === "thing" ? 0x707070ff : why === "other" ? 0x7a5a3aff : ((((c >>> 26) & 63) << 24) | (((c >>> 18) & 63) << 16) | (((c >>> 10) & 63) << 8) | 255) >>> 0);
    } });
    writeFileSync(join(mapDir, `${name}_light.png`), encodePng(img));
  }
  if (gl || rl) out.push(`  light: ${pct(gl, N * WH)} of the pixels change only with the light; found ${pct(hit, gl)} of those; of what was taken for light, ${pct(hit, rl)} is light, ${pct(otherRel, rl)} a shadow cast or an effect, ${pct(lost, rl)} things${still ? `, ${pct(still, rl)} nothing changed` : ""}; ${pct(lost, thing)} of what things change was taken for light`);
  if (verbose) for (const b of best) { const bx = boxOf([...b.m.values()].flat()), q = pieces[b.i]; out.push(`    ${b.k} ${bx[2]}x${bx[3]} at ${bx[0]},${bx[1]} in ${b.m.size} frames: ${q ? `#${b.i + 1} ${q.kind} ${q.box[2]}x${q.box[3]} at ${q.box[0]},${q.box[1]}, IoU ${b.score.toFixed(2)}` : "none"}`); }
  const missed = best.filter((b) => b.score < 0.2).sort((a, b) => b.m.size - a.m.size).slice(0, 6);
  if (missed.length) out.push(`  missed: ${missed.map((b) => { const bx = boxOf([...b.m.values()].flat()); return `${b.k} (${bx[2]}x${bx[3]} at ${bx[0]},${bx[1]}, best IoU ${b.score.toFixed(2)})`; }).join("; ")}`);
  const splits = split.slice(0, 4);
  if (splits.length) out.push(`  in pieces: ${splits.map((b) => b.k).join(", ")}`);
  const many = [...merged].filter(([, v]) => v.length > 1).slice(0, 4);
  if (many.length) out.push(`  together in one piece: ${many.map(([i, v]) => `${pieces[i].box[2]}x${pieces[i].box[3]} at ${pieces[i].box[0]},${pieces[i].box[1]}: ${v.join(", ")}`).join("; ")}`);
  console.log(out.join("\n"));
}
