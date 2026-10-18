// pxl check: the checks describe makes, on every scene and rig of a file (and the front marker of any
// other asset that has one), the warnings only, from one load of the project. A scene is checked at
// every frame of its loop, each distinct placement once: the checks that warn (facing, front marker,
// lit side, feet, lettering) depend only on the placement (what it looks like, where) and the world.
import type { Project } from "../core/project.ts";
import { orientWords, placementChecks } from "../core/describe.ts";
import { rigLines } from "../core/rig.ts";
import { frontWords, rampSteps } from "../core/checks.ts";
import { PxError } from "../core/errors.ts";
import { frameTime } from "./shot.ts";

export interface CheckResult { lines: string[]; warnings: number; checked: string }

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
 * that name (not those it includes), unless `names` are given. `frame`: that frame of each animated
 * scene only, instead of all of them.
 */
export function checkProject(p: Project, opts: { names?: string[]; frame?: number; file?: string } = {}): CheckResult {
  const lines: string[] = [];
  let scenes = 0, rigs = 0, others = 0, frames = 0, distinct = 0;
  // by default what the file itself defines (what it includes is checked where it's defined)
  const own = (n: string) => !opts.file || (p.assets.get(n)?.loc ?? "").split(":")[0] === opts.file;
  for (const name of opts.names ?? p.order.filter(own)) {
    const def = p.assets.get(name);
    if (!def) throw new PxError(`unknown asset '${name}'`);
    const rig = p.rigs.get(name), steps = rampSteps(def.pal);
    if (rig) {
      // its parts: each slot's line from describe's RIG section
      rigs++;
      for (const l of rigLines(rig, { has: (n) => p.has(n), image: (n, flip) => (flip ? p.image(n).flip("x") : p.image(n)) }, steps)) {
        const slot = /^ {2}(\w+): /.exec(l)?.[1];
        for (const w of l.split("; ").filter((s) => s.includes("WARNING"))) lines.push(`${name} › ${slot ?? "-"} › ${w.slice(w.indexOf("WARNING"))}`);
      }
      continue;
    }
    if (def.kind !== "scene") {
      // a part or a prop: only its own front marker (its light and its feet are read where it's placed)
      const img = p.image(name);
      if (!img.sockets?.front) continue;
      others++;
      const w = frontWords(img);
      if (w.startsWith("WARNING")) lines.push(`${name} › ${w}`);
      continue;
    }
    scenes++;
    const tl = p.timeline(name), count = !tl ? 1 : tl.durations ? tl.durations.length : Math.max(1, Math.round(tl.loop / tl.step));
    const seen = new Map<string, string[]>(), found = new Map<string, Set<number>>(), at = new Map<string, Set<string>>();
    for (const f of opts.frame !== undefined && tl ? [opts.frame] : [...Array(count).keys()]) {
      const b = p.build(name, 0, tl ? frameTime(p, name, f) : 0);
      const unlit = new Set(b.layers.filter((l) => l.unlit).map((l) => l.name));
      frames++;
      for (const q of b.placements) {
        const key = `${q.name}|${q.layer}|${q.x},${q.y}|${q.img.w}x${q.img.h}|${hash(q.img.data)}`;
        let ws = seen.get(key);
        if (!ws) {
          const o = q.img.orient;
          ws = [...placementChecks(q, def.opts.world, steps, unlit.has(q.layer ?? "")), ...(o ? orientWords(o).split(", ") : [])].filter((w) => w.startsWith("WARNING"));
          seen.set(key, ws);
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
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  return { lines, warnings: lines.length,
    checked: `${n(scenes, "scene")} (${n(frames, "frame")}, ${n(distinct, "distinct placement")}), ${n(rigs, "rig")}, ${n(others, "other asset")} with a front marker` };
}
