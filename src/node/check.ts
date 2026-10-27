// pxl check: the checks describe makes, on every scene and rig of a file (and the front marker of any
// other asset that has one), the warnings only, from one load of the project. A scene is checked at
// every frame of its loop, each distinct placement once: the checks that warn (facing, front marker,
// lit side, feet, lettering) depend only on the placement (what it looks like, where) and the world.
import type { Project } from "../core/project.ts";
import { MANY, STAND, lightFor, orientWords, placementChecks, standWords } from "../core/describe.ts";
import { rigLines } from "../core/rig.ts";
import { frontWords, rampSteps } from "../core/checks.ts";
import { PxError } from "../core/errors.ts";
import { dE, lineFlaws } from "../core/vision.ts";
import { toHex } from "../core/color.ts";
import type { Item, World } from "../core/model.ts";
import { type Knob, fixRule, runExpects, turnKnob } from "../core/world3d.ts";
import { type Knob2d, type Named, type Rule2d, type Shift, fixRule2d, moveInSource, nameAll, namesOf, runRules2d } from "../core/expect.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { loadProject } from "./load.ts";
import { FLAWS, jointsOf, poseFlaws, viewRows, viewWarnings } from "../core/rig3d.ts";

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
  /**
   * With `fix`: each failing expect3d rule's one number that makes it hold (fixRule), or none found; a
   * scene's rule's (expect), a placement moved `by` px along x or y, its stamp at `loc`, or `why` not.
   */
  fixes?: { text: string; knob?: Knob; to?: number; held?: boolean; move?: { part: string; key: "x" | "y"; by: number; loc: string }; why?: string }[];
  /** A scene's rules that don't hold, "scene › rule" (what --fix's changes are checked against, rebuilt). */
  failed?: string[];
}

const hash = (d: Uint32Array) => { let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; };
/** 3, 4, 5, 9 -> "3-5, 9" */
/** The most frames of a scene whose loop was cut at 60 s that check reads. */
const CAPPED_FRAMES = 600;

const ranges = (fs: number[]) => fs.reduce<[number, number][]>((r, f) => {
  const last = r[r.length - 1];
  if (last && f === last[1] + 1) last[1] = f; else r.push([f, f]);
  return r;
}, []).map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");

/**
 * --fix on a scene's rules: each failing one, on the scene the fixes before it left, fixed by moving one
 * placement it names (fixRule2d) whose number the art file writes (moveInSource); else what would fix it
 * and why it can't be written, or that nothing does.
 */
function fixScene(p: Project, rules: Rule2d[], rs: ReturnType<typeof runRules2d>, named: { f: number; at: Map<string, Named> }[], wo: World | undefined, out: NonNullable<CheckResult["fixes"]>): void {
  const sh: Shift = new Map(), srcs = new Map<string, string | undefined>();
  const source = (f: string) => {
    if (!srcs.has(f)) { const abs = p.files.find((a) => basename(a) === f); try { srcs.set(f, abs && readFileSync(abs, "utf8")); } catch { srcs.set(f, undefined); } }
    return srcs.get(f);
  };
  // where a name's stamp is (the first frame that places it)
  const locOf = (n: string) => { for (const fr of named) { const q = fr.at.get(n); if (q && typeof q !== "string") return q.p.loc; } return undefined; };
  const why = (k: Knob2d) => {
    const loc = locOf(k.part), src = loc && source(loc.split(":")[0]);
    if (!loc) return `${k.part} is placed by a function (c.stamp), its ${k.key} the code's`;
    if (src === undefined) return `${loc}: its file can't be read`;
    const m = moveInSource(src as string, loc, k.key, 0);
    return typeof m === "string" ? m : undefined;
  };
  rs.forEach((r, i) => {
    if (r.ok) return;
    if (runRules2d([rules[i]], named, wo, sh)[0].ok) return void out.push({ text: r.text, held: true });
    const knobs = namesOf([rules[i]]).flatMap((part) => (["x", "y"] as const).map((key): Knob2d => ({ part, key, value: 0 })));
    const f = fixRule2d(rules, rules[i], named, wo, sh, knobs.filter((k) => !why(k)));
    if (f) {
      const { part, key } = f.knob, s = sh.get(part) ?? [0, 0];
      sh.set(part, key === "x" ? [s[0] + f.to, s[1]] : [s[0], s[1] + f.to]);
      return void out.push({ text: r.text, move: { part, key, by: f.to, loc: locOf(part)! } });
    }
    const g = fixRule2d(rules, rules[i], named, wo, sh, knobs.filter((k) => why(k)));
    out.push({ text: r.text, why: g ? `${g.knob.part}'s ${g.knob.key} ${g.to > 0 ? "+" : ""}${g.to} px would make it hold, but ${why(g.knob)}: change it by hand` : "no one move of a placement it names makes it hold (within 64 px, keeping the rules that hold)" });
  });
}

/**
 * --fix's moves of a scene's placements written into the art files (each stamp's number once, by the sum
 * of its moves), checked rebuilt first: written only if each fixed rule holds and none that held fails
 * (a number another placement shares, or a stamp drawn by where it stands, would). The lines to print.
 */
export function writeMoves(file: string, p: Project, r: CheckResult, frame?: number): string[] {
  const sum = new Map<string, { part: string; key: "x" | "y"; by: number; loc: string }>();
  for (const f of r.fixes ?? []) if (f.move) { const m = f.move, k = `${m.loc} ${m.key}`; sum.set(k, { ...m, by: (sum.get(k)?.by ?? 0) + m.by }); }
  // the last in a file first: a number written longer doesn't move the stamps before it
  const at = (loc: string) => loc.split(":").slice(1).map(Number), texts = new Map<string, string>(), said: string[] = [];
  for (const m of [...sum.values()].sort((u, v) => at(v.loc)[0] - at(u.loc)[0] || at(v.loc)[1] - at(u.loc)[1])) {
    const abs = p.files.find((f) => basename(f) === m.loc.split(":")[0])!, w = moveInSource(texts.get(abs) ?? readFileSync(abs, "utf8"), m.loc, m.key, m.by);
    if (typeof w === "string") return [`fix: not written: ${m.part}: ${w}`];
    texts.set(abs, w.src);
    said.push(`${m.part}'s ${m.key} ${w.from} -> ${w.to} (${basename(abs)}:${w.line})`);
  }
  if (!said.length) return [];
  const fixed = new Set((r.fixes ?? []).filter((f) => f.move || f.held).map((f) => f.text)), scenes = [...new Set(r.failed!.map((t) => t.split(" › ")[0]))];
  const after = checkProject(loadProject(file, { checksOnly: true }, (abs) => texts.get(abs) ?? readFileSync(abs, "utf8")), { names: scenes, frame });
  const wrong = after.failed!.filter((t) => fixed.has(t.slice(t.indexOf(" › ") + 3)) || !r.failed!.includes(t));
  if (wrong.length) return [`fix: not written: rebuilt with ${said.join(", ")}, ${wrong.join("; ")} doesn't hold (a number another placement shares, or a stamp drawn by where it stands?): change it by hand`];
  for (const [abs, t] of texts) writeFileSync(abs, t);
  return [`fix: wrote ${said.join(", ")}; check again`];
}

/**
 * The warnings, one line each: `asset › where › what`, `where` being the placement or the rig slot,
 * and, for an animated scene, the frames it happens at. `file`: only the assets defined in the file of
 * that name (not those it includes), unless `names` are given. `frame` / `frames`: those frames of
 * each animated scene only, instead of all of them.
 */
export function checkProject(p: Project, opts: { names?: string[]; frame?: number; frames?: number[]; file?: string; readings?: boolean; fix?: boolean } = {}): CheckResult {
  const reads = new Set<string>(), tally = { agree: 0, against: 0, unclear: 0 };
  const lines: string[] = [], notes: string[] = [];
  let scenes = 0, rigs = 0, others = 0, frames = 0, distinct = 0;
  // a rule only runs where the art says what it needs (a light, a ground, a height, a front marker):
  // count where it did, so "no warnings" isn't read as "checked"
  const ran = { front: 0, light: 0, read: 0, feet: 0, ground: 0, text: 0, parts: 0, lines: 0, stand: 0, views: 0, poses: 0 };
  let lightSaid = false, groundSaid = false, fixes: CheckResult["fixes"], rulesAll = 0, rulesHeld = 0;
  const failed: string[] = [];
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
    // an anim drawn by functions with a world (c.as() naming what they paint) is checked as a scene
    if (def.kind !== "scene" && !(def.kind === "anim" && def.opts.world)) {
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
    if (def.opts.check === false) { notes.push(`${name} › not checked (check: false)`); continue; }
    scenes++;
    const wo = def.opts.world;
    lightSaid ||= !!wo?.light;
    groundSaid ||= wo?.ground !== undefined;
    const tl = p.timeline(name), all = !tl ? 1 : tl.durations ? tl.durations.length : Math.max(1, Math.round(tl.loop / tl.step));
    // a loop cut at 60 s (its anims' frame times don't line up) can run to tens of thousands of frames:
    // say so, and check its first frames only, not for hours
    const count = tl?.capped ? Math.min(all, CAPPED_FRAMES) : all;
    if (tl?.capped) lines.push(`${name} › WARNING: its loop doesn't close within 60 s: its anims' frame times don't line up (a ${tl.step} ms step, ${all} frames); checked its first ${count} frames only. Give every anim the same fps (4, 5 or 10, or ms in 100s)`);
    const seen = new Map<string, string[]>(), found = new Map<string, Set<number>>(), at = new Map<string, Set<string>>();
    const only = opts.frames ?? (opts.frame !== undefined ? [opts.frame] : undefined), co = def.opts.check;
    // its rules (expect): at each frame checked, the placements they name
    const rules = def.opts.expect as Rule2d[] | undefined, names = rules ? namesOf(rules) : [], named: { f: number; at: Map<string, Named> }[] = [];
    // a long story checked one frame in n (check: { every: n }): what moves through it is still seen
    // at every few steps, at the cost of a short loop
    const every = typeof co === "object" && co ? co.every : 1, keep = p.named(name);
    if (!(Number.isInteger(every) && every >= 1)) throw new PxError(`scene '${name}': check: { every } is how many frames apart the checked ones are, a whole number from 1, got ${JSON.stringify(every)}`);
    for (const f of only && tl ? only : [...Array(count).keys()].filter((k) => k % every === 0)) {
      const ft = tl ? frameTime(p, name, f) : 0, b = p.build(name, 0, ft);
      // (a frame checked once, unless another asset places the scene: kept, it would push out the
      // anims its frames share; a long loop's frames ran to gigabytes)
      if (!keep) p.forget(name, ft);
      const unlit = new Set(b.layers.filter((l) => l.unlit).map((l) => l.name));
      frames++;
      if (rules) named.push({ f, at: nameAll(b.placements, new Set(b.layers.filter((l) => l.how === "blended").map((l) => l.name)), names) });
      // many copies of one small thing (a brush scattered over the ground) are texture, not objects:
      // describe lists them on one line and checks none of them, and so does this, but for where one
      // stands in a mesh() (a tuft floating past a hill's edge)
      const copies = new Map<string, number>();
      for (const q of b.placements) copies.set(`${q.name}@${q.layer}`, (copies.get(`${q.name}@${q.layer}`) ?? 0) + 1);
      for (const q of b.placements) {
        const many = copies.get(`${q.name}@${q.layer}`)! > MANY;
        if (many && !standWords(q.stand)) continue;
        const key = `${q.name}|${q.layer}|${q.x},${q.y}|${q.img.w}x${q.img.h}|${hash(q.img.data)}|${q.stand && Math.abs(q.stand.off) > STAND ? q.stand.off.toFixed(2) : ""}`;
        let ws = seen.get(key);
        if (!ws) {
          const o = q.img.orient, dark = unlit.has(q.layer ?? "");
          const all = many ? [standWords(q.stand)] : [...placementChecks(q, wo, steps, dark, b.lamps), ...(o ? orientWords(o).split(", ") : [])];
          // read against a light: the world's, or else the one it was drawn under (a mesh's, a lamp's)
          const lit = !many && !dark && wo?.light !== false && (!!wo?.light || !!lightFor(wo, q, b.lamps));
          lightSaid ||= lit;
          ws = all.filter((w) => w.startsWith("WARNING"));
          seen.set(key, ws);
          if (q.img.sockets?.front && o?.f) ran.front++;
          if (lit) { ran.light++; if (all.some((w) => /^(WARNING: )?lit (from|on)/.test(w))) ran.read++; }
          if (opts.readings && lit) {
            // what the rule read, kept or not: to see where it agrees, where it warns, where it can't tell
            const r = all.find((w) => /^(WARNING: )?lit (from|on)/.test(w)) ?? "no clear reading";
            tally[r.startsWith("WARNING") ? "against" : /as its light|toward the light/.test(r) ? "agree" : "unclear"]++;
            reads.add(`${name} › ${q.name} @${q.layer ?? "-"} › ${r}`);
          }
          if (q.img.meters || q.img.grounded) { ran.feet++; if (wo?.ground !== undefined) ran.ground++; }
          if (o?.text) ran.text++;
          if (q.stand) ran.stand++;
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
    if (rules) {
      const rs = runRules2d(rules, named, wo);
      rulesAll += rs.length; rulesHeld += rs.filter((r) => r.ok).length;
      for (const r of rs) if (!r.ok) { failed.push(`${name} › ${r.text}`); lines.push(`${name} › WARNING: expect ${r.text}: it doesn't hold (${r.detail})${count > 1 ? ` (frame${r.fails.length > 1 ? "s" : ""} ${ranges(r.fails)})` : ""}`); }
      if (opts.fix) fixScene(p, rules, rs, named, wo, (fixes ??= []));
    }
    // where it stands, when that is one place (two copies of a thing, which one), and at which frames
    for (const [k, fs] of found) {
      const ps = at.get(k)!, i = k.indexOf(" › ");
      lines.push(`${name} › ${k.slice(0, i)}${ps.size === 1 ? `, feet ${[...ps][0]}` : ""}${k.slice(i)}${count > 1 ? ` (frame${fs.size > 1 ? "s" : ""} ${ranges([...fs].sort((a, b) => a - b))})` : ""}`);
    }
  }
  // views() sets: their crown and chin on one row in every view, and kept to the set they're like
  if (!opts.names) for (const [name, V] of p.views) {
    if (opts.file && (V.loc ?? "").split(":")[0] !== opts.file) continue;
    ran.views++;
    const rows = (s: { drawn: string[]; chin?: Record<string, number> }) => new Map(s.drawn.map((n) => [n.slice(n.lastIndexOf("_") + 1), viewRows(p.image(n), s.chin?.[n])]));
    const like = V.like ? p.views.get(V.like) : undefined;
    if (V.like && !like) lines.push(`${name} › WARNING: like '${V.like}' is no views() set`);
    for (const w of viewWarnings({ name, views: [...rows(V)], baked: V.baked, ...(like ? { like: { name: V.like!, views: rows(like) } } : {}) })) lines.push(`${name} › WARNING: ${w}`);
  }
  // rig3d() figures: every pose of every move at its headings, on the ground and within the legs' reach
  if (!opts.names) for (const [name, F] of p.figures) {
    if (opts.file && (F.loc ?? "").split(":")[0] !== opts.file) continue;
    for (const M of F.moves) for (const hd of M.heads) {
      const worst = { floats: 0, reach: 0 }, at = { floats: [] as number[], reach: [] as number[] };
      for (let i = 0; i < M.frames; i++) {
        ran.poses++;
        const fl = poseFlaws(F.body, jointsOf(F.body, M.pose(i, hd.deg), hd.deg));
        for (const k of ["floats", "reach"] as const) if (fl[k] > 0.5) { at[k].push(i); worst[k] = Math.max(worst[k], fl[k]); }
      }
      for (const k of ["floats", "reach"] as const) if (at[k].length) lines.push(`${name} › ${M.m} ${hd.name} › WARNING: ${FLAWS[k](worst[k])} (frame${at[k].length > 1 ? "s" : ""} ${ranges(at[k])})`);
    }
  }
  // what building found on the way (a shade step that left its ramp), where it was asked for
  for (const w of p.warnings) {
    const sub = /^'([^']*)': (a stamp half a pixel.*)$/.exec(w.msg);
    const op = /^([a-z]+): /.exec(w.msg)?.[1] ?? "ramps";
    lines.push(sub ? `${sub[1]}${w.loc ? ` (${w.loc})` : ""} › WARNING: ${sub[2]}` : `${op}${w.loc ? ` (${w.loc})` : ""} › WARNING: ${w.msg}`);
  }
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  const run: string[] = [], not: string[] = [];
  if (ran.front + others) run.push(`front marker on ${ran.front + others}`); else not.push("front marker (nothing has one)");
  if (scenes) {
    if (lightSaid) run.push(`lit side on ${ran.light} (a clear reading on ${ran.read})`); else not.push("lit side (no light: no scene has world.light, lamps lit by lighting() or sprites in mesh())");
    if (ran.feet) run.push(`feet on ${ran.feet}${groundSaid ? ` (against the ground row on ${ran.ground})` : ""}`); else not.push("feet (nothing placed has a height)");
  }
  // expect3d's rules over their loops (a world's parts: above, on, apart, near, reaches, within)
  if (!opts.names && p.expects.length) {
    for (const e of p.expects) {
      const rs = runExpects(e.world, e.rules, e.frames, e.ms);
      rulesAll += rs.length; rulesHeld += rs.filter((r) => r.ok).length;
      let w = e.world;
      rs.forEach((r, i) => {
        if (r.ok) return;
        lines.push(`${e.name}${e.loc ? ` (${e.loc})` : ""} › WARNING: expect ${r.text}: it doesn't hold (${r.detail})`);
        // --fix: the one number that makes it hold, searched without a model, each on the world the
        // fixes before it left (one that holds by then needs none)
        if (!opts.fix) return;
        if (runExpects(w, [e.rules[i]], e.frames, e.ms)[0].ok) { (fixes ??= []).push({ text: r.text, held: true }); return; }
        const f = fixRule(w, e.rules, e.rules[i], e.frames, e.ms);
        if (f) w = turnKnob(w, f.knob, f.to);
        (fixes ??= []).push({ text: r.text, ...f });
      });
    }
  }
  if (rulesAll) run.push(`expects ${rulesAll} (${rulesHeld} held)`);
  if (ran.stand) run.push(`standing on ${ran.stand}`);
  if (ran.text) run.push(`lettering on ${ran.text}`);
  if (ran.lines) run.push(`lines on ${ran.lines}`);
  if (ran.views) run.push(`views' rows on ${ran.views}`);
  if (ran.poses) run.push(`figures' feet on ${ran.poses} poses`);
  if (rigs) run.push(`rig parts ${ran.parts}`);
  const readings = opts.readings ? { readings: [...reads], tally: `${tally.agree + tally.against + tally.unclear} placements read: ${tally.agree} lit as their light, ${tally.against} against it, ${tally.unclear} with no side to tell` } : {};
  return { ...readings, ...(fixes ? { fixes } : {}), failed, lines, notes, warnings: lines.length,
    coverage: `ran: ${run.join(", ") || "nothing"}${not.length ? `; not run: ${not.join(", ")}` : ""}`,
    checked: `${n(scenes, "scene")} (${n(frames, "frame")}, ${n(distinct, "distinct placement")}), ${n(rigs, "rig")}, ${n(others, "other asset")} with a front marker` };
}
