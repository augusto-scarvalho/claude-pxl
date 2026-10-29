// pxl check: the checks describe makes, on every scene and rig of a file (and the front marker of any
// other asset that has one), the warnings only, from one load of the project. A scene is checked at
// every frame of its loop, each distinct placement once: the checks that warn (facing, front marker,
// lit side, feet, lettering) depend only on the placement (what it looks like, where) and the world.
import { type Project, cellOf } from "../core/project.ts";
import { MANY, STAND, lightFor, orientWords, placementChecks, standWords } from "../core/describe.ts";
import { rigLines } from "../core/rig.ts";
import { frontWords, rampSteps } from "../core/checks.ts";
import { PxError, didYouMean } from "../core/errors.ts";
import { dE, lineFlaws } from "../core/vision.ts";
import { toHex } from "../core/color.ts";
import type { Item, World } from "../core/model.ts";
import { type Knob, fixRule, runExpects, turnKnob } from "../core/world3d.ts";
import { type Frame2d, type Knob2d, type Rule2d, type Shift, fixRule2d, moveInSource, nameAll, namesOf, runRules2d } from "../core/expect.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { loadProject } from "./load.ts";
import { drawnWith, members } from "./lib.ts";
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
  fixes?: { text: string; knob?: Knob; to?: number; held?: boolean; move?: { part: string; key: Knob2d["key"]; i?: number; label: string; by: number; loc: string }; why?: string }[];
  /** A scene's rules that don't hold, "scene › rule" (what --fix's changes are checked against, rebuilt). */
  failed?: string[];
}

/** An asset's frames (a still one's image). */
const frameImgs = (p: Project, n: string) => (p.assets.get(n)!.kind === "anim" ? p.drawn(n).map((f) => f.img) : [p.image(n)]);

/**
 * The checks of the genre an asset names, on its frames: "ground", the feet (its drawing's lowest row) on
 * one row in every frame; "footprint", that lowest row down to where it meets the ground (its footprint
 * box, a turnaround()'s), within a px, in every frame (what is nearer us may hang lower: a bumper seen
 * from above).
 */
function genreLines(p: Project, name: string, ran: { genre: number }): string[] {
  const gn = p.assets.get(name)!.opts.genre!, g = p.genres.get(gn), out: string[] = [];
  if (!g) return [`${name} › WARNING: genre '${gn}' is no genre() here${didYouMean(gn, p.genres.keys())}${p.genres.size ? ` (there are: ${[...p.genres.keys()].join(", ")})` : ""}: its checks didn't run`];
  const fr = frameImgs(p, name), low = fr.map((im) => { const b = im.bounds(); return b ? b.y + b.h - 1 : -1; });
  // what each frame says, the frames that say the same together: "113 (frames 2-4), 114 (frames 0-1, 5-6)"
  const said = (say: (i: number) => string | undefined) => {
    const m = new Map<string, number[]>();
    fr.forEach((_, i) => { const s = say(i); if (s !== undefined) m.set(s, [...(m.get(s) ?? []), i]); });
    return [...m].map(([s, fs]) => `${s}${fr.length > 1 ? ` (frame${fs.length > 1 ? "s" : ""} ${ranges(fs)})` : ""}`);
  };
  if (g.checks.includes("ground") && fr.length > 1) {
    ran.genre += fr.length;
    const rows = said((i) => `${low[i]}`);
    if (rows.length > 1) out.push(`${name} › WARNING: genre '${gn}': its feet aren't on one ground line: its lowest row is ${rows.join(", ")}; a move keeps them on one row`);
  }
  if (g.checks.includes("footprint")) {
    ran.genre += fr.length;
    const none = fr.filter((im) => !im.boxes?.footprint).length;
    if (none) out.push(`${name} › WARNING: genre '${gn}': ${none === fr.length ? "it has" : `${none} of its frames have`} no footprint (a box "footprint" where it meets the ground: a turnaround()'s in an orthographic view, or c.setBox)`);
    const off = said((i) => { const f = fr[i].boxes?.footprint?.[0]; return f && low[i] + 1 < f[1] + f[3] - 1 ? `${low[i]}, its footprint's ${f[1] + f[3] - 1}` : undefined; });
    if (off.length) out.push(`${name} › WARNING: genre '${gn}': its drawing doesn't reach where it meets the ground: its lowest row is ${off.join("; ")}: drawn lifted, or its wheels or feet hidden or cut, it floats there`);
  }
  return out;
}

/**
 * A png at a density not its own (scenes §19), unless its genre says the mix (mix: true): imported blown up
 * (every k x k block one color: its pixels k px beside the others' 1), or shrunk alone from a finer drawing
 * (`shrink: k` over blocks of more than one color: its detail a finer grid's). Undefined: none to check.
 */
function pngDensity(p: Project, name: string): string[] | undefined {
  const d = p.assets.get(name)!, o = d.opts, k = typeof o.shrink === "number" ? o.shrink : 1;
  if (!d.png || o.frozen || (o.genre !== undefined && p.genres.get(o.genre)?.mix === true)) return undefined;
  const or = "or say the mix on purpose in its genre (mix: true)";
  if (k > 1) {
    // (an export blown up k times and shrunk back is its own pixels again)
    const m = d.shrunk ?? 0;
    return m > 0.02 ? [`${name} › WARNING: shrink: ${k} scales a finer drawing down alone: ${Math.round(m * 100)}% of its ${k}x${k} blocks held more than one color, so its detail is a grid ${k} times finer than its pixels: one drawing scaled alone mixes densities (scenes §19); redraw it simpler at this one, ${or}`] : [];
  }
  const im = d.png, colors = new Set(im.data.filter((v) => (v & 255) >= 128)).size;
  for (const b of [8, 6, 5, 4, 3, 2]) if (colors > 1 && im.w % b === 0 && im.h % b === 0 && im.w >= 2 * b && im.h >= 2 * b && im.mixedBlocks(b) === 0)
    return [`${name} › WARNING: its png is drawn ${b} times as big: every ${b}x${b} block is one color, so its pixels are ${b} px beside the others' 1 (scenes §19): shrink: ${b} brings it to its own, ${or}`];
  return [];
}

/** Each drawing of a card's cell that has a density (not "?"), a family's members too: the cells it is at. */
function drawingCells(p: Project): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const c of p.cards.values()) for (const [k, v] of Object.entries(c.cells))
    if (v.asset && !k.endsWith("/?")) for (const n of members(p, v.asset)) by.set(n, [...(by.get(n) ?? []), k]);
  return by;
}

/**
 * Library entries of different densities placed in one scene (their cards' cells: a 16 px tile and a 32 px
 * one, 24 px a meter and 17), its base followed to the entry it recolors; unless a genre at one of those
 * cells says the mix (mix: true: HD-2D's sprites in a finer world). Undefined: it places no entry with one.
 */
function sceneMix(p: Project, used: Set<string>, by: Map<string, string[]>): string | undefined {
  const at = new Map<string, string[]>();
  for (const u of used) {
    let n = u, d = p.assets.get(n), cs = by.get(n);
    for (let i = 0; d && !cs && i < 8 && typeof d.opts.base === "string"; i++) { n = p.assets.has(d.opts.base) ? d.opts.base : (d.ns ?? "") + d.opts.base; d = p.assets.get(n); cs = by.get(n); }
    if (cs) at.set(u, cs);
  }
  if (!at.size) return undefined;
  const dens = (c: string) => c.slice(c.indexOf("/") + 1), all = [...at.values()], cells = new Set(all.flat());
  if ([...cells].some((c) => all.every((cs) => cs.some((x) => dens(x) === dens(c))))) return "";
  if ([...p.genres.values()].some((g) => g.mix === true && cells.has(cellOf(g)))) return "";
  const of = new Map<string, string[]>();
  for (const [n, cs] of at) of.set(cs[0], [...(of.get(cs[0]) ?? []), n]);
  return `WARNING: it places library entries of ${of.size} densities (${[...of].map(([c, ns]) => `${ns.slice(0, 3).join(", ")}${ns.length > 3 ? ", ..." : ""} at ${c}`).join("; ")}): pixels of different sizes side by side; draw them at one (scenes §19), or say the mix on purpose in a genre at one of those cells (mix: true)`;
}

/**
 * card()s against how their cells' assets are drawn (`file`: the cards that file defines): a ✎ cell that is
 * the 3D render alone (live, or frozen with no retouch over it by `base`), a ◐ cell drawn by hand, a ✓ live 3D sprite not frozen. Anims and families: the
 * examples' hashes guard them (frozen is for sprites).
 */
export function cardLines(p: Project, file?: string): { lines: string[]; cells: number } {
  const lines: string[] = [];
  let cells = 0;
  for (const c of p.cards.values()) {
    if (file && (c.loc ?? "").split(":")[0] !== file) continue;
    for (const [k, v] of Object.entries(c.cells)) {
      const n = v.asset === undefined ? undefined : members(p, v.asset)[0];
      if (n === undefined) continue;
      cells++;
      const d = drawnWith(p, n), live3d = d.three.length > 0 && !d.frozen, at = `${c.name}${c.loc ? ` (${c.loc})` : ""} › WARNING: its card's cell ${k} is ${v.status}`;
      if (v.status === "✎" && !d.hand.length && (d.frozen || d.three.length)) lines.push(`${at} (by hand over a 3D draft), but '${n}' is the 3D render alone: retouch it, or mark it ◐`);
      if (v.status === "◐" && !d.three.length && !d.frozen) lines.push(`${at} (a 3D render to look at), but '${n}' is drawn by hand: mark it ✓ or ✎`);
      if (v.status === "✓" && live3d && p.assets.get(n)?.kind === "sprite") lines.push(`${at}, but '${n}' is a live 3D sprite: freeze it (frozen), so an engine change can't move it`);
    }
  }
  return { lines, cells };
}

/** A placement as a warning names it: its id (and its asset), else its asset. */
const who = (q: { name: string; id?: string }) => (q.id ? `${q.id} (${q.name})` : q.name);
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
 * --fix on a scene's rules: each failing one, on the scene the fixes before it left, fixed by one number
 * of a placement it names (fixRule2d: its relation's, then where it stands) that the art file writes
 * (moveInSource); else what would fix it and why it can't be written, or that nothing does.
 */
function fixScene(p: Project, rules: Rule2d[], rs: ReturnType<typeof runRules2d>, named: Frame2d[], wo: World | undefined, out: NonNullable<CheckResult["fixes"]>): void {
  const sh: Shift = new Map(), srcs = new Map<string, string | undefined>();
  const source = (loc: string) => {
    const f = loc.replace(/:\d+(:\d+)?$/, "");
    if (!srcs.has(f)) { const abs = p.fileOf(f); try { srcs.set(f, abs && readFileSync(abs, "utf8")); } catch { srcs.set(f, undefined); } }
    return srcs.get(f);
  };
  // a name's stamp (the first frame that places it): where it is in the file, and its numbers a fix may change
  const first = (n: string) => { for (const fr of named) { const q = fr.at.get(n); if (q && typeof q !== "string") return q.p; } return undefined; };
  const locOf = (n: string) => first(n)?.loc;
  const knobsOf = (part: string): Knob2d[] => [
    ...(first(part)?.rel?.knobs ?? []).map((k) => ({ ...k, part, value: 0 })),
    { part, key: "x", label: "x", value: 0, move: (d) => [d, 0] }, { part, key: "y", label: "y", value: 0, move: (d) => [0, d] }];
  const why = (k: Knob2d) => {
    const loc = locOf(k.part), src = loc && source(loc);
    if (!loc) return `${k.part} is placed by a function (c.stamp), its ${k.label} the code's`;
    if (src === undefined) return `${loc}: its file can't be read`;
    const m = moveInSource(src as string, loc, k.key, 0, k.i);
    return typeof m === "string" ? m : undefined;
  };
  rs.forEach((r, i) => {
    if (r.ok) return;
    if (runRules2d([rules[i]], named, wo, sh)[0].ok) return void out.push({ text: r.text, held: true });
    const knobs = namesOf([rules[i]]).flatMap(knobsOf);
    const f = fixRule2d(rules, rules[i], named, wo, sh, knobs.filter((k) => !why(k)));
    if (f) {
      const { part, key, i: n, label } = f.knob, s = sh.get(part) ?? [0, 0], m = f.knob.move(f.to);
      sh.set(part, [s[0] + m[0], s[1] + m[1]]);
      return void out.push({ text: r.text, move: { part, key, i: n, label, by: f.to, loc: locOf(part)! } });
    }
    const g = fixRule2d(rules, rules[i], named, wo, sh, knobs.filter((k) => why(k)));
    out.push({ text: r.text, why: g ? `${g.knob.part}'s ${g.knob.label} ${g.to > 0 ? "+" : ""}${g.to} px would make it hold, but ${why(g.knob)}: change it by hand` : "no one number of a placement it names makes it hold (within 64 px, keeping the rules that hold)" });
  });
}

/**
 * --fix's moves of a scene's placements written into the art files (each stamp's number once, by the sum
 * of its moves), checked rebuilt first: written only if each fixed rule holds and none that held fails
 * (a number another placement shares, or a stamp drawn by where it stands, would). The lines to print.
 */
export function writeMoves(file: string, p: Project, r: CheckResult, frame?: number): string[] {
  const sum = new Map<string, NonNullable<NonNullable<CheckResult["fixes"]>[number]["move"]>>();
  for (const f of r.fixes ?? []) if (f.move) { const m = f.move, k = `${m.loc} ${m.key} ${m.i}`; sum.set(k, { ...m, by: (sum.get(k)?.by ?? 0) + m.by }); }
  // the last in a file first: a number written longer doesn't move the stamps before it
  const at = (loc: string) => loc.split(":").slice(1).map(Number), texts = new Map<string, string>(), said: string[] = [];
  for (const m of [...sum.values()].sort((u, v) => at(v.loc)[0] - at(u.loc)[0] || at(v.loc)[1] - at(u.loc)[1])) {
    const abs = p.fileOf(m.loc)!, w = moveInSource(texts.get(abs) ?? readFileSync(abs, "utf8"), m.loc, m.key, m.by, m.i);
    if (typeof w === "string") return [`fix: not written: ${m.part}: ${w}`];
    texts.set(abs, w.src);
    said.push(`${m.part}'s ${m.label} ${w.from} -> ${w.to} (${p.short(abs)}:${w.line})`);
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
  const ran = { front: 0, light: 0, read: 0, feet: 0, ground: 0, text: 0, parts: 0, lines: 0, stand: 0, views: 0, poses: 0, boxes: 0, genre: 0, frozen: 0, cards: 0, density: 0 };
  let cellsBy: Map<string, string[]> | undefined;
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
      // its boxes (c.setBox) inside each frame: every frame of an anim whose first frame has one (a
      // fighter's hurtbox is on every frame)
      if (img.boxes) {
        const fr = def.kind === "anim" ? p.drawn(name).map((f) => f.img) : [img], out = new Map<string, number[]>();
        fr.forEach((im, i) => {
          for (const [k, bs] of Object.entries(im.boxes ?? {})) for (const [x, y, w, h] of bs)
            if (x < 0 || y < 0 || x + w > im.w || y + h > im.h) { const s = `'${k}' [${x}, ${y}, ${w}, ${h}] leaves its ${im.w}x${im.h} frame`; out.set(s, [...(out.get(s) ?? []), i]); }
        });
        ran.boxes += fr.length;
        for (const [s, fs] of out) lines.push(`${name} › WARNING: box ${s}${fr.length > 1 ? ` (frame${fs.length > 1 ? "s" : ""} ${ranges(fs)})` : ""}: an engine reads it as it is; keep it inside, or give the asset room (w, h)`);
      }
      // the genre() it is made for: its checks on its frames (the height across directions is a family's, below)
      if (def.opts.genre !== undefined) lines.push(...genreLines(p, name, ran));
      // a png at a density not its own: blown up, or shrunk from a finer drawing
      const pd = pngDensity(p, name);
      if (pd) { ran.density++; lines.push(...pd); }
      // a frozen cell against its live render: the engine or the recipe changed what it draws
      if (def.live && !def.freeze) {
        ran.frozen++;
        const now = p.image(def.live);
        if (now.hash() !== img.hash()) {
          const n = now.w === img.w && now.h === img.h ? now.data.reduce((k, c, i) => k + +(c !== img.data[i]), 0) : -1;
          lines.push(`${name} › WARNING: frozen: its live render '${def.live}' drifted from ${def.opts.png}: ${n < 0 ? `${now.w}x${now.h}, the frozen one ${img.w}x${img.h}` : `${n} px differ`}; look at both (pxl shot <file> ${name} ${def.live}); approved, delete the PNG and build to freeze it again`);
        }
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
    if (tl?.long) notes.push(`${name} › LOOK: ${tl.long}; check reads each of its frames (check: { every: n } reads one in n)`);
    if (tl?.capped) lines.push(`${name} › WARNING: its loop doesn't close within 60 s: its anims' frame times don't line up (a ${tl.step} ms step, ${all} frames); checked its first ${count} frames only. Give every anim the same fps (4, 5 or 10, or ms in 100s)`);
    const seen = new Map<string, string[]>(), found = new Map<string, Set<number>>(), at = new Map<string, Set<string>>(), used = new Set<string>();
    const only = opts.frames ?? (opts.frame !== undefined ? [opts.frame] : undefined), co = def.opts.check;
    // its rules (expect): at each frame checked, the placements they name
    const rules = def.opts.expect as Rule2d[] | undefined, names = rules ? namesOf(rules) : [], named: Frame2d[] = [];
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
      if (rules) named.push({ f, ...nameAll(b.placements, new Set(b.layers.filter((l) => l.how === "blended").map((l) => l.name)), names) });
      // many copies of one small thing (a brush scattered over the ground) are texture, not objects:
      // describe lists them on one line and checks none of them, and so does this, but for where one
      // stands in a mesh() (a tuft floating past a hill's edge)
      const copies = new Map<string, number>();
      for (const q of b.placements) { copies.set(`${q.name}@${q.layer}`, (copies.get(`${q.name}@${q.layer}`) ?? 0) + 1); used.add(q.name); }
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
            reads.add(`${name} › ${who(q)} @${q.layer ?? "-"} › ${r}`);
          }
          if (q.img.meters || q.img.grounded) { ran.feet++; if (wo?.ground !== undefined) ran.ground++; }
          if (o?.text) ran.text++;
          if (q.stand) ran.stand++;
        }
        for (const w of ws) {
          const k = `${who(q)} @${q.layer ?? "-"} › ${w}`, bb = q.img.bounds();
          if (!found.has(k)) { found.set(k, new Set()); at.set(k, new Set()); }
          found.get(k)!.add(f);
          if (bb) at.get(k)!.add(`${Math.round(q.x + bb.x + bb.w / 2)},${q.y + bb.y + bb.h - 1}`);
        }
      }
    }
    distinct += seen.size;
    // the library entries it places, of one density
    const mix = sceneMix(p, used, (cellsBy ??= drawingCells(p)));
    if (mix !== undefined) ran.density++;
    if (mix) lines.push(`${name} › ${mix}`);
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
  // a genre's families (a group whose members all name it: rig3d()'s moves, a turnaround()): one height
  // across the directions, how far its top stands over its pivot (its ground point) at its tallest frame
  // (no pivot: its ink's height), so the feet that land a row apart seen from behind don't count
  if (!opts.names) for (const [gname, G] of p.groups) {
    if (opts.file && (G.loc ?? "").split(":")[0] !== opts.file) continue;
    let ms: string[];
    try { ms = p.candidates(gname); } catch { continue; }
    const gn = p.assets.get(ms[0])?.opts.genre, genre = gn === undefined ? undefined : p.genres.get(gn);
    if (!genre?.checks.includes("height") || ms.length < 2 || !ms.every((m) => p.assets.get(m)?.opts.genre === gn)) continue;
    const fs = ms.map((m) => frameImgs(p, m)), hs = fs.map((f) => Math.max(...f.map((im) => { const b = im.bounds(); return !b ? 0 : im.pivot ? Math.round(im.pivot[1] - b.y) : b.h; })));
    ran.genre += fs.flat().length;
    if (new Set(hs).size > 1) lines.push(`${gname} › WARNING: genre '${gn}': its directions aren't one height: ${ms.map((m, i) => `${m.slice(m.lastIndexOf("_") + 1)} ${hs[i]}`).join(", ")} px over its ground point (the tallest frame of each); the same figure stands as tall whichever way it faces`);
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
  // include(f, { palette: "mine" }): the keys it sets that this file doesn't keep its colors, an old-and-new mix to see
  if (!opts.names) for (const m of p.mines)
    if (m.keys.length && (!opts.file || (m.loc ?? "").split(":")[0] === opts.file)) notes.push(`include '${m.path}' (palette: "mine") › LOOK: its keys ${m.keys.join(", ")} keep its colors (yours don't define them)`);
  // the cards: each cell's status against how its asset is drawn
  if (!opts.names) { const cs = cardLines(p, opts.file); lines.push(...cs.lines); ran.cards += cs.cells; }
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
  if (ran.boxes) run.push(`boxes on ${ran.boxes} frame${ran.boxes > 1 ? "s" : ""}`);
  if (ran.genre) run.push(`genres' checks on ${ran.genre} frame${ran.genre > 1 ? "s" : ""}`);
  if (ran.frozen) run.push(`frozen cells against their live render on ${ran.frozen}`);
  if (ran.cards) run.push(`cards' cells against their drawing on ${ran.cards}`);
  if (ran.density) run.push(`densities on ${ran.density}`);
  if (ran.views) run.push(`views' rows on ${ran.views}`);
  if (ran.poses) run.push(`figures' feet on ${ran.poses} poses`);
  if (rigs) run.push(`rig parts ${ran.parts}`);
  const readings = opts.readings ? { readings: [...reads], tally: `${tally.agree + tally.against + tally.unclear} placements read: ${tally.agree} lit as their light, ${tally.against} against it, ${tally.unclear} with no side to tell` } : {};
  return { ...readings, ...(fixes ? { fixes } : {}), failed, lines, notes, warnings: lines.length,
    coverage: `ran: ${run.join(", ") || "nothing"}${not.length ? `; not run: ${not.join(", ")}` : ""}`,
    checked: `${n(scenes, "scene")} (${n(frames, "frame")}, ${n(distinct, "distinct placement")}), ${n(rigs, "rig")}, ${n(others, "other asset")} with a front marker` };
}
