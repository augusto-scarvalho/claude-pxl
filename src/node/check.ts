// pxl check: the checks describe makes, on every scene and rig of a file (and the front marker of any
// other asset that has one), the warnings only, from one load of the project. A scene is checked at
// every frame of its loop, each distinct placement once: the checks that warn (facing, front marker,
// lit side, feet, lettering) depend only on the placement (what it looks like, where) and the world.
import type { Project } from "../core/project.ts";
import { MANY, orientWords, placementChecks } from "../core/describe.ts";
import { rigLines } from "../core/rig.ts";
import { frontWords, rampSteps } from "../core/checks.ts";
import { PxError } from "../core/errors.ts";
import { dE, lineFlaws } from "../core/vision.ts";
import { toHex } from "../core/color.ts";
import type { Item } from "../core/model.ts";

/** Drawn by hand somewhere: a grid string, grid() or runs(), here or in a layer (line(), curve() and code draw their own lines clean, or as they mean to). */
const byHand = (items: Item[]): boolean => items.some((i) => typeof i === "string"
  || (typeof i === "object" && i !== null && ("__layer" in i ? byHand((i as { items: Item[] }).items) : "__op" in i && ["grid", "runs"].includes((i as { name: string }).name))));
import { frameTime } from "./shot.ts";

/** `coverage`: which rules ran and on how many, and those that couldn't (nothing to check them on) */
export interface CheckResult {
  lines: string[]; warnings: number; checked: string; coverage: string;
  /** Things to look at, not wrong for sure: a hand-drawn line's L-corners and jaggies (a corner is often meant). No exit code. */
  notes: string[];
  /** With `readings`: every placement's lit side against the scene's light, warning or not, and a tally (to tune the rule). */
  readings?: string[]; tally?: string;
}

const hash = (d: Uint32Array) => { let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; };
/** 3, 4, 5, 9 -> "3-5, 9" */
const ranges = (fs: number[]) => fs.reduce<[number, number][]>((r, f) => {
  const last = r[r.length - 1];
  if (last && f === last[1] + 1) last[1] = f; else r.push([f, f]);
  return r;
}, []).map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");

/**
 * The warnings, one line each: `asset › where › what`, `where` being the placement or the rig slot,
 * and, for an animated scene, the frames it happens at. `file`: only the assets defined in the file of
 * that name (not those it includes), unless `names` are given. `frame` / `frames`: those frames of
 * each animated scene only, instead of all of them.
 */
export function checkProject(p: Project, opts: { names?: string[]; frame?: number; frames?: number[]; file?: string; readings?: boolean } = {}): CheckResult {
  const reads = new Set<string>(), tally = { agree: 0, against: 0, unclear: 0 };
  const lines: string[] = [], notes: string[] = [];
  let scenes = 0, rigs = 0, others = 0, frames = 0, distinct = 0;
  // a rule only runs where the art says what it needs (a light, a ground, a height, a front marker):
  // count where it did, so "no warnings" isn't read as "checked"
  const ran = { front: 0, light: 0, read: 0, feet: 0, ground: 0, text: 0, parts: 0, lines: 0 };
  let lightSaid = false, groundSaid = false;
  // by default what the file itself defines (what it includes is checked where it's defined)
  const own = (n: string) => !opts.file || (p.assets.get(n)?.loc ?? "").split(":")[0] === opts.file;
  for (const name of opts.names ?? p.order.filter(own)) {
    const def = p.assets.get(name);
    if (!def) throw new PxError(`unknown asset '${name}'`);
    const rig = p.rigs.get(name), steps = rampSteps(def.pal);
    if (rig) {
      // its parts: each slot's line from describe's RIG section
      rigs++;
      ran.parts += rig.slots.length;
      for (const l of rigLines(rig, { has: (n) => p.has(n), image: (n, flip) => (flip ? p.image(n).flip("x") : p.image(n)) }, steps)) {
        const slot = /^ {2}(\w+): /.exec(l)?.[1];
        for (const w of l.split("; ").filter((s) => s.includes("WARNING"))) lines.push(`${name} › ${slot ?? "-"} › ${w.slice(w.indexOf("WARNING"))}`);
      }
      continue;
    }
    if (def.kind !== "scene") {
      // a part or a prop: its own front marker (its light and its feet are read where it's placed), and
      // its 1 px lines where it's drawn by hand, parts too (not a variant, not drawn square on purpose)
      const img = p.image(name);
      if (!def.opts.base && !def.opts.outline8 && byHand(def.items)) {
        ran.lines++;
        const fl = (def.kind === "anim" ? p.frames(name).map((f) => f.img) : [img]).map((im) => lineFlaws(im));
        const ats = (k: "corners" | "jaggies") => [...new Set(fl.flatMap((f) => f[k].map(([x, y]) => `${x},${y}`)))];
        const corners = fl.some((f) => f.corners.length < f.line * 0.1) ? ats("corners") : [], jaggies = ats("jaggies");
        const list = (v: string[]) => `at ${v.slice(0, 4).join("; ")}${v.length > 4 ? "; ..." : ""}`;
        // (a note, not a warning: a tyre's corner, a roof's, a wingtip are L-corners meant as one)
        if (corners.length) notes.push(`${name} › LOOK: ${corners.length} L-corner${corners.length > 1 ? "s" : ""} in its 1 px lines (${list(corners)}): where a smooth line steps, the elbow of three pixels in an L doubles it; delete that one. A corner the shape has (a tyre, a roof, a tip) stays (PXL help "characters 7")`);
        // two tones too close to tell apart, side by side in it (Pixel Joint's commonest critique)
        const near = new Map<string, number>(), W = img.w, at = (i: number) => img.data[i];
        for (let i = 0; i < img.data.length; i++) for (const j of [i + 1, i + W]) {
          if ((j === i + 1 && (i + 1) % W === 0) || j >= img.data.length) continue;
          const a = at(i), b = at(j);
          if (a === b || (a & 255) < 128 || (b & 255) < 128) continue;
          const k = a < b ? `${a},${b}` : `${b},${a}`;
          if (!near.has(k)) near.set(k, dE(a, b));
        }
        const key = (c: number) => [...def.pal.keys].find(([, v]) => v === c)?.[0];
        const twins = [...near].filter(([, d]) => d < 0.03).map(([k, d]) => { const [a, b] = k.split(",").map(Number); return `${key(a) ? `'${key(a)}' ` : ""}${toHex(a)} and ${key(b) ? `'${key(b)}' ` : ""}${toHex(b)} (${d.toFixed(3)})`; });
        if (twins.length) notes.push(`${name} › LOOK: ${twins.length} pair${twins.length > 1 ? "s" : ""} of tones side by side too close to tell apart (under 0.03 in OKLab): ${twins.slice(0, 3).join(", ")}${twins.length > 3 ? " ..." : ""}; merge each, or spread it if both are meant`);
        if (jaggies.length) notes.push(`${name} › LOOK: ${jaggies.length} jagg${jaggies.length > 1 ? "ies" : "y"} in its 1 px lines (${list(jaggies)}): a run out of order along a curve (3 2 4 where 2 3 4 reads smooth); unless the shape bumps there, let the runs grow or shrink steadily (PXL help "characters 7")`);
      }
      if (!img.sockets?.front) continue;
      others++;
      const w = frontWords(img);
      if (w.startsWith("WARNING")) lines.push(`${name} › ${w}`);
      continue;
    }
    scenes++;
    const wo = def.opts.world;
    lightSaid ||= !!wo?.light;
    groundSaid ||= wo?.ground !== undefined;
    const tl = p.timeline(name), count = !tl ? 1 : tl.durations ? tl.durations.length : Math.max(1, Math.round(tl.loop / tl.step));
    const seen = new Map<string, string[]>(), found = new Map<string, Set<number>>(), at = new Map<string, Set<string>>();
    const only = opts.frames ?? (opts.frame !== undefined ? [opts.frame] : undefined);
    for (const f of only && tl ? only : [...Array(count).keys()]) {
      const b = p.build(name, 0, tl ? frameTime(p, name, f) : 0);
      const unlit = new Set(b.layers.filter((l) => l.unlit).map((l) => l.name));
      frames++;
      // many copies of one small thing (a brush scattered over the ground) are texture, not objects:
      // describe lists them on one line and checks none of them, and so does this
      const copies = new Map<string, number>();
      for (const q of b.placements) copies.set(`${q.name}@${q.layer}`, (copies.get(`${q.name}@${q.layer}`) ?? 0) + 1);
      for (const q of b.placements) {
        if (copies.get(`${q.name}@${q.layer}`)! > MANY) continue;
        const key = `${q.name}|${q.layer}|${q.x},${q.y}|${q.img.w}x${q.img.h}|${hash(q.img.data)}`;
        let ws = seen.get(key);
        if (!ws) {
          const o = q.img.orient, dark = unlit.has(q.layer ?? "");
          const all = [...placementChecks(q, wo, steps, dark), ...(o ? orientWords(o).split(", ") : [])];
          ws = all.filter((w) => w.startsWith("WARNING"));
          seen.set(key, ws);
          if (q.img.sockets?.front && o?.f) ran.front++;
          if (wo?.light && !dark) { ran.light++; if (all.some((w) => /^(WARNING: )?lit (from|on)/.test(w))) ran.read++; }
          if (opts.readings && wo?.light && !dark) {
            // what the rule read, kept or not: to see where it agrees, where it warns, where it can't tell
            const r = all.find((w) => /^(WARNING: )?lit (from|on)/.test(w)) ?? "no clear reading";
            tally[r.startsWith("WARNING") ? "against" : /as its light|toward the light/.test(r) ? "agree" : "unclear"]++;
            reads.add(`${name} › ${q.name} @${q.layer ?? "-"} › ${r}`);
          }
          if (q.img.meters) { ran.feet++; if (wo?.ground !== undefined) ran.ground++; }
          if (o?.text) ran.text++;
        }
        for (const w of ws) {
          const k = `${q.name} @${q.layer ?? "-"} › ${w}`, bb = q.img.bounds();
          if (!found.has(k)) { found.set(k, new Set()); at.set(k, new Set()); }
          found.get(k)!.add(f);
          if (bb) at.get(k)!.add(`${Math.round(q.x + bb.x + bb.w / 2)},${q.y + bb.y + bb.h - 1}`);
        }
      }
    }
    distinct += seen.size;
    // where it stands, when that is one place (two copies of a thing, which one), and at which frames
    for (const [k, fs] of found) {
      const ps = at.get(k)!, i = k.indexOf(" › ");
      lines.push(`${name} › ${k.slice(0, i)}${ps.size === 1 ? `, feet ${[...ps][0]}` : ""}${k.slice(i)}${count > 1 ? ` (frame${fs.size > 1 ? "s" : ""} ${ranges([...fs].sort((a, b) => a - b))})` : ""}`);
    }
  }
  // what building found on the way (a shade step that left its ramp), where it was asked for
  for (const w of p.warnings) {
    const sub = /^'([^']*)': (a stamp half a pixel.*)$/.exec(w.msg);
    lines.push(sub ? `${sub[1]}${w.loc ? ` (${w.loc})` : ""} › WARNING: ${sub[2]}` : `ramps${w.loc ? ` (${w.loc})` : ""} › WARNING: ${w.msg}`);
  }
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  const run: string[] = [], not: string[] = [];
  if (ran.front + others) run.push(`front marker on ${ran.front + others}`); else not.push("front marker (nothing has one)");
  if (scenes) {
    if (lightSaid) run.push(`lit side on ${ran.light} (a clear reading on ${ran.read})`); else not.push("lit side (no scene declares world.light)");
    if (ran.feet) run.push(`feet on ${ran.feet}${groundSaid ? ` (against the ground row on ${ran.ground})` : ""}`); else not.push("feet (nothing placed has a height)");
  }
  if (ran.text) run.push(`lettering on ${ran.text}`);
  if (ran.lines) run.push(`lines on ${ran.lines}`);
  if (rigs) run.push(`rig parts ${ran.parts}`);
  const readings = opts.readings ? { readings: [...reads], tally: `${tally.agree + tally.against + tally.unclear} placements read: ${tally.agree} lit as their light, ${tally.against} against it, ${tally.unclear} with no side to tell` } : {};
  return { ...readings, lines, notes, warnings: lines.length,
    coverage: `ran: ${run.join(", ") || "nothing"}${not.length ? `; not run: ${not.join(", ")}` : ""}`,
    checked: `${n(scenes, "scene")} (${n(frames, "frame")}, ${n(distinct, "distinct placement")}), ${n(rigs, "rig")}, ${n(others, "other asset")} with a front marker` };
}
