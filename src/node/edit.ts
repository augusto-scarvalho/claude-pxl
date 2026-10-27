// pxl inspect and pxl edit. A scene's named things (a stamp, what c.as() names, a mesh() sprite, a world3d
// part): what each is, where it is, its values and where the art file writes them, its relations and
// rules, the operations it takes; then edits (core/edit.ts) written where the values live, checked
// rebuilt before anything is written, and what they changed (describe --diff, by id) and pxl check;
// refused when more changes than what they name (--dry: shown, not written).
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import type { Project } from "../core/project.ts";
import type { BuildOut } from "../core/build.ts";
import type { Placement } from "../core/canvas.ts";
import type { World } from "../core/world3d.ts";
import { PxError } from "../core/errors.ts";
import { TRANSPARENT } from "../core/color.ts";
import { MANY, describe, labelOf } from "../core/describe.ts";
import { type Rule2d, callAt, listAt, moveInSource, nameAll, namesOf, runRules2d } from "../core/expect.ts";
import { ruleText } from "../core/world3d.ts";
import { headingsOf } from "../core/turnaround.ts";
import type { Img } from "../core/image.ts";
import { type Edit, REL2D, addHeading, addStamp, addTo, checkEdit, editAsset, editPart, editStamp, entries, readLit } from "../core/edit.ts";
import { loadProject } from "./load.ts";
import { checkProject } from "./check.ts";
import { frameCount, frameTime } from "./shot.ts";

/** A thing of a scene an edit can name: its id (describe's name for it), what it is, where. */
export interface Target {
  id: string; kind: "stamp" | "drawing" | "mesh sprite" | "part"; asset: string; layer?: string;
  /** its drawing's box on the picture [x0, y0, x1, y1] and its feet (bottom middle) */
  box?: number[]; feet?: number[];
  p?: Placement; world?: { world: World; loc?: string };
  /** why its values aren't the file's to write (code places it; its call places others too) */
  why?: string;
}

const blendedOf = (b: BuildOut) => new Set(b.layers.filter((l) => l.how === "blended").map((l) => l.name));
const fileOf = (p: Project, loc: string) => p.fileOf(loc);

/** Every thing of a built scene an edit can name: its placements (not a shadow's or a light's, not the many copies of a small thing without an id), and the world3d parts drawn in it. */
export function targetsOf(p: Project, b: BuildOut): Target[] {
  const blended = blendedOf(b), groups = new Map<string, Placement[]>(), out: Target[] = [];
  for (const q of b.placements) { const k = `${q.name}@${q.layer ?? ""}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(q); }
  const own = b.placements.filter((q) => !blended.has(q.layer ?? "")), calls = new Map<string, Placement[]>();
  for (const q of own) if (q.loc && !q.via) (calls.get(q.loc) ?? calls.set(q.loc, []).get(q.loc)!).push(q);
  for (const q of own) {
    const same = groups.get(`${q.name}@${q.layer ?? ""}`)!;
    if (!q.id && same.length > MANY) continue;
    // its drawing's box, on the picture
    const bb = q.img.bounds(), W = b.img.w - 1, H = b.img.h - 1, box = bb && [Math.max(0, q.x + bb.x), Math.max(0, q.y + bb.y), Math.min(W, q.x + bb.x + bb.w - 1), Math.min(H, q.y + bb.y + bb.h - 1)];
    const shared = q.loc && !q.via ? calls.get(q.loc)! : [];
    const why = !q.loc || q.via ? `placed by code (${q.via === "as" ? "c.as() in a function" : q.via === "mesh" ? "a mesh() sprite" : "c.stamp() in a function"}${q.code ? `, ${q.code}` : ""}): its numbers are the code's`
      : shared.length > 1 ? `its stamp call at ${q.loc} places ${shared.length} things (${shared.map((s) => labelOf(s, groups.get(`${s.name}@${s.layer ?? ""}`)!)).join(", ")}): a value written there changes them all` : undefined;
    out.push({ id: labelOf(q, same), kind: q.via === "as" ? "drawing" : q.via === "mesh" ? "mesh sprite" : "stamp", asset: q.name, layer: q.layer, ...(box ? { box, feet: [Math.round((box[0] + box[2]) / 2), box[3]] } : {}), p: q, ...(why ? { why } : {}) });
  }
  // world3d parts: the pixels each part of a world the file writes painted (named "part" or "part.sub")
  const P = b.img.parts, W = b.img.w;
  if (P) {
    const boxes = new Map<string, number[]>();
    for (let i = 0; i < P.ids.length; i++) {
      if (P.ids[i] < 0) continue;
      const n = P.names[P.ids[i]].split(".")[0], x = i % W, y = (i - x) / W, r = boxes.get(n);
      if (!r) boxes.set(n, [x, y, x, y]); else { r[0] = Math.min(r[0], x); r[1] = Math.min(r[1], y); r[2] = Math.max(r[2], x); r[3] = Math.max(r[3], y); }
    }
    for (const [n, box] of boxes) {
      const w = p.worlds.find((v) => v.world.spec.parts[n]);
      if (w && !out.some((t) => t.id === n)) out.push({ id: n, kind: "part", asset: w.world.spec.parts[n].make, box, feet: [Math.round((box[0] + box[2]) / 2), box[3]], world: w });
    }
  }
  return out;
}

/** A builder's parameters, as it names them when given one it doesn't take (undefined: it doesn't say). */
function paramsOf(w: World, make: string): string[] | undefined {
  // ponytail: read from the builder's own refusal; a list on each builder if one ever doesn't refuse
  try { w.makers[make]({ "?": 1 }); } catch (e) { const m = /\(it has: ([^)]*)\)/.exec((e as Error).message); if (m) return m[1].split(", "); }
  return undefined;
}

type Op = { op: string; scopes: string[]; takes: string };
/** What inspect says of one thing: its values and where they're written, relations, rules, parts, operations. */
function details(p: Project, scene: string, b: BuildOut, t: Target, all: Target[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}, src = (loc: string) => { const f = fileOf(p, loc); return f ? readFileSync(f, "utf8") : undefined; };
  const others = all.filter((o) => o !== t).map((o) => o.id).sort(), ids = others.slice(0, 24).join(", ") + (others.length > 24 ? `, +${others.length - 24} more` : ""), ops: Op[] = [];
  if (t.kind === "part") {
    const w = t.world!.world, spec = w.spec.parts[t.id], file = t.world!.loc?.split(":")[0] ?? "", text = t.world!.loc ? src(t.world!.loc) : undefined;
    out.world = `world3d at ${t.world!.loc}`;
    out.at = w.place(t.id).map((v) => +v.toFixed(2));
    const head = text ? [...text.matchAll(new RegExp(`(^|[\\s{,])${t.id}\\s*:\\s*\\{`, "g"))] : [];
    if (text && head.length === 1) {
      const o = head[0].index! + head[0][0].length - 1, line = (k: number) => `${file}:${text.slice(0, k).split("\n").length}`, vals: Record<string, string> = {};
      for (const [k, e] of entries(text, o)) {
        if (k === "params" && e.text.startsWith("{")) for (const [pk, pe] of entries(text, e.vs)) vals[`params.${pk}`] = `${pe.text} (${readLit(pe.text) === undefined ? "code" : "written"}, ${line(pe.vs)})`;
        else vals[k] = `${e.text} (${readLit(e.text) === undefined ? "code" : "written"}, ${line(e.vs)})`;
      }
      out.values = vals;
    } else out.values = `its spec isn't written once as '${t.id}: { ... }' in ${file}: the code's`;
    const params = paramsOf(w, spec.make);
    const rel = (n: string) => w.spec.parts[n] as unknown as Record<string, unknown>;
    out.relation = REL.filter((k) => rel(t.id)[k] !== undefined).map((k) => `${k} ${JSON.stringify(rel(t.id)[k])}`).join("; ") || "none (it stands where its at says)";
    out.placedByIt = w.names.filter((n) => n !== t.id && REL.some((k) => { const v = rel(n)[k]; return v === t.id || (Array.isArray(v) && v[0] === t.id); }));
    const mentions = (r: unknown): boolean => JSON.stringify(r).includes(`"${t.id}"`) || JSON.stringify(r).includes(`"${t.id}.`);
    out.rules = p.expects.filter((e) => e.world.spec === w.spec).flatMap((e) => e.rules.filter(mentions).map((r) => `${e.name}: ${ruleText(r)}`));
    const built = w.built(t.id);
    out.parts = [...Object.keys(built.parts), ...Object.keys(built.details).map((d) => `${d} (details)`)];
    ops.push({ op: "move", scopes: ["instance"], takes: "by: [dx, dy] or [dx, dy, dz] m" },
      { op: "set", scopes: ["instance"], takes: `key, value: ${params ? `its builder's ${params.join(", ")}` : "its builder's parameters, seed"}` },
      { op: "relation", scopes: ["instance"], takes: `on | beside: [part, "left" | "right" | "front" | "behind", gap m] | around | attach: [part, socket] | along | apart: [part, gap m]; parts: ${w.names.filter((n) => n !== t.id).join(", ")}` },
      { op: "swap", scopes: ["instance"], takes: `asset: a builder (${Object.keys(w.makers).join(", ")})` }, { op: "as", scopes: ["instance"], takes: "as: surface | voxels | splats | mesh" });
  } else {
    const q = t.p!;
    let movable = false;
    if (t.why) out.note = t.why;
    if (q.loc && !q.via) {
      const s = src(q.loc), at = s === undefined ? undefined : callAt(s, q.loc, /^stamp\s*\(/);
      if (s !== undefined && at !== undefined) {
        const { items, end } = listAt(s, s.indexOf("(", at)), file = q.loc.split(":")[0], line = (k: number) => `${file}:${s.slice(0, k).split("\n").length}`;
        const call = s.slice(at, end + 1).replace(/\s+/g, " ");
        out.call = `${call.length > 140 ? call.slice(0, 139) + "…" : call} (${line(at)})`;
        // x, y and its relation's numbers: written in the call, in a table it reads, or not (and why)
        const vals: Record<string, string> = {}, own = s.slice(0, at).split("\n").length;
        vals.asset = `${items[0].t.trim()} (${readLit(items[0].t) === undefined ? "code" : "written"})`;
        for (const k of [{ key: "x" as const, label: "x", i: 0 }, { key: "y" as const, label: "y", i: 0 }, ...(q.rel?.knobs ?? [])]) {
          const w = moveInSource(s, q.loc, k.key, 0, k.i);
          vals[k.label] = typeof w === "string" ? `(${w.replace(/^its (x|y|\w+'s \w+) /, "")})` : `${w.from} (${w.line === own ? "written" : "a table's"}, ${file}:${w.line})`;
          if (typeof w !== "string") movable = true;
        }
        // (placed by its relation alone: a move writes x, y into its call)
        if (q.rel && items[1]?.t.trim().startsWith("{")) movable = true;
        // (placed by its relation alone: said once)
        if ((vals.x === vals.y || vals.x === vals.y.replace(/\by\b/, "x")) && vals.x.startsWith("(")) { vals["x, y"] = vals.x; delete vals.x; delete vals.y; }
        const o = items.find((x, i) => i > 0 && x.t.trim().startsWith("{"));
        if (o) for (const [k, e] of entries(s, o.s + o.t.indexOf("{"))) vals[k] = `${e.text} (${readLit(e.text) === undefined ? "code" : "written"}, ${line(e.vs)})`;
        out.values = vals;
      }
    }
    if (q.rel) { const k = REL2D.find((r) => (out.values as Record<string, string> | undefined)?.[r]) ?? "placed by"; out.relation = `${k} ${q.rel.to ?? (k === "along" ? "a path" : "the ground or a row")}`; }
    out.placedByIt = b.placements.filter((o) => o.rel?.to === t.id && !blendedOf(b).has(o.layer ?? "")).map((o) => o.id ?? o.name).sort();
    const rules = p.assets.get(scene)?.opts.expect as Rule2d[] | undefined;
    if (rules) {
      const mine = rules.filter((r) => namesOf([r]).includes(t.id));
      const rs = runRules2d(mine, [{ f: 0, ...nameAll(b.placements, blendedOf(b), namesOf(mine)) }], p.assets.get(scene)?.opts.world);
      out.rules = rs.map((r) => `${r.text}: ${r.ok ? "holds" : `fails (${r.detail})`}`);
    }
    if (q.img.parts?.names.length) out.parts = q.img.parts.names;
    const rev = (p.assets.get(q.name)?.pal ?? p.assets.get(scene)?.pal ?? p.pal).reverse(), n = new Map<string, number>();
    for (const c of q.img.data) { const k = rev.get(c); if (k) n.set(k, (n.get(k) ?? 0) + 1); }
    out.colors = [...n].sort((u, v) => v[1] - u[1]).map(([k]) => k).join("");
    if (!t.why && t.kind === "stamp") {
      // its asset's own options, when a sprite() or anim() of its name writes them (scope "asset": every copy)
      const def = p.assets.get(q.name), ds = def?.loc ? src(def.loc) : undefined, mine = ds !== undefined && typeof editAsset(ds, def!.loc!, q.name, { op: "set", target: t.id, key: "?", value: 0 }) !== "string";
      const sc = () => (mine ? ["instance", "asset"] : ["instance"]);
      const sibs = siblings(p, q.name);
      if (movable) ops.push({ op: "move", scopes: ["instance"], takes: "by: [dx, dy] px" });
      ops.push({ op: "set", scopes: sc(), takes: "key, value: an option (z, shade, seed, reseed, fx, cast, shadow, heading, ...)" },
        { op: "recolor", scopes: sc(), takes: `swap: { key: key } (its colors: ${out.colors})` },
        { op: "flip", scopes: sc(), takes: `axis: x (default${turnText(p, q.name) || (ownMirror(q.img, "x") ? `: it is its own mirror, a flip changes nothing${sibs.length ? " (swap turns it)" : ""}` : "")}) | y` });
      if (frameCount(p, q.name) > 1) ops.push({ op: "frame", scopes: ["instance"], takes: `frame: 0-${frameCount(p, q.name) - 1} | t: ms` });
      ops.push({ op: "relation", scopes: ["instance"], takes: `on | beside: [id, "left" | "right" | "above" | "below", gap] | along: [points, s, u] | apart: [id, gap] | at: "id.socket"; ids: ${ids}` },
        { op: "swap", scopes: ["instance"], takes: `asset: another asset's name${sibs.length ? ` (its siblings: ${sibs.join(", ")})` : ""}` },
        { op: "add", scopes: ["instance"], takes: `target: a new id, asset: a name | like: an id (its asset and options), beside: ["${t.id}", side, gap] | on: "${t.id}" | at: "${t.id}.socket": a new stamp by this one, its line after this one's` });
      if (!mine) out.asset = def?.loc ? `made by code at ${def.loc}: scope "asset" can't write it` : undefined;
    }
  }
  out.ops = ops;
  return out;
}
const REL = ["on", "beside", "around", "attach", "along", "apart"];

/**
 * Of a turnaround's sprite: its family, the heading a flip across turns it to and the sprite drawn there
 * (`to`; `add`: its family doesn't draw that heading yet); undefined when it faces n or s (its own mirror:
 * a flip mirrors it).
 */
function turned(p: Project, asset: string): { family: string; deg: number; to: string; add: boolean; loc?: string } | undefined {
  for (const [family, f] of p.turnarounds) {
    const h = f.heads.find((x) => `${family}_${x.name}` === asset);
    if (!h) continue;
    const deg = (360 - h.deg) % 360, m = f.heads.find((x) => Math.abs(x.deg - deg) < 1e-9) ?? headingsOf(undefined, [...f.heads.map((x) => x.deg), deg], false).at(-1)!;
    return m === h ? undefined : { family, deg, to: `${family}_${m.name}`, add: !f.heads.includes(m), loc: f.loc };
  }
  return undefined;
}
/** Does a flip across `axis` ("x", "y", "xy") draw it the same: a front or back view drawn symmetric? */
const ownMirror = (im: Img, axis: string) => im.data.every((c, j) => { const x = j % im.w, y = (j - x) / im.w; return c === im.data[(axis.includes("y") ? im.h - 1 - y : y) * im.w + (axis.includes("x") ? im.w - 1 - x : x)]; });
/** The assets a swap may turn it to: its `<name>_<x>` siblings (vendor_n's vendor_s, a turnaround's other headings), each with its facing, but those facing as it does. */
function siblings(p: Project, asset: string): string[] {
  const stem = asset.replace(/_[^_]*$/, ""), facing = (n: string) => p.assets.get(n)?.opts.facing, mine = facing(asset);
  const out = [...p.assets.values()].filter((d) => d.name !== asset && d.kind !== "scene" && (d.name === stem || (d.name.startsWith(stem + "_") && !d.name.slice(stem.length + 1).includes("_"))) && !(mine && facing(d.name) === mine));
  return out.slice(0, 8).map((d) => (facing(d.name) ? `${d.name} (facing ${facing(d.name)})` : d.name)).concat(out.length > 8 ? [`+${out.length - 8} more`] : []);
}
const turnText = (p: Project, asset: string) => { const t = turned(p, asset); return t ? `: turned to face ${t.to.slice(t.family.length + 1)}, its turnaround's ${t.to}${t.add ? " (added to its headings)" : ""}, lit as it is` : ""; };

/**
 * The scene built for one thing (`id`), drawing only what it reads: first with nothing it stamps drawn
 * (Project.stub), to see the thing's asset, what places it and its copies (their places number them,
 * "rock #2") and what places that, and what its rules name; then with those. What the others are
 * drawn as moves them, so what lists them is sorted. A drawing, a mesh sprite or a part (what covers
 * it shapes it), or a scene whose stubs fail, is built whole.
 */
// ponytail: scene code that places the thing by another's c.size() reads a stub's; keep what it names if one does
function narrow(p: Project, scene: string, id: string, at: () => { b: BuildOut; all: Target[] }): { b: BuildOut; all: Target[] } {
  const whole = () => { p.stub = undefined; p.forgetAll(); return at(); };
  if (p.worlds.some((w) => w.world.spec.parts[id])) return at();
  try {
    p.stub = () => true;
    const first = at(), t = first.all.find((x) => x.id === id);
    if (!t || t.kind !== "stamp") return t ? whole() : first;
    const rules = (p.assets.get(scene)?.opts.expect as Rule2d[] | undefined)?.filter((r) => namesOf([r]).includes(id)) ?? [];
    const ids = new Set([id, ...namesOf(rules)]), keep = new Set<string>();
    for (let n = -1; n !== keep.size + ids.size;) {
      n = keep.size + ids.size;
      for (const q of first.b.placements) if (q.name === t.p!.name || ids.has(q.id ?? q.name) || ids.has(q.name)) { keep.add(q.name); if (q.rel?.to) ids.add(q.rel.to); }
    }
    const names = new Set([...keep].flatMap((k) => p.candidates(k)));
    p.stub = (n) => !names.has(n);
    p.forgetAll();
    const out = at();
    return out.all.some((x) => x.id === id && x.asset === t.asset) ? out : whole();
  } catch { return whole(); }
}

/**
 * The comment lines a thing has in the art file (what --find reads), each with its line: the block just
 * above its call and the call line's own, then the same at its asset's definition (the statement that
 * makes it: a helper's caller, a loop).
 */
function commentsOf(p: Project, t: Target): { line: string; at: string }[] {
  const near = (loc: string | undefined, part?: string) => {
    const abs = loc && fileOf(p, loc);
    if (!abs) return [];
    const L = readFileSync(abs, "utf8").split("\n");
    let i = Number(loc.split(":")[1]) - 1;
    // a part: its spec's line in the world3d() call
    if (part) { const k = L.findIndex((l, j) => j >= i && new RegExp(`(^|[\\s{,])${part}\\s*:`).test(l)); if (k >= 0) i = k; }
    const lines = L[i]?.includes("//") ? [L[i].slice(L[i].indexOf("//"))] : [];
    for (let j = i - 1; j >= 0 && /^\s*\/\//.test(L[j]); j--) lines.unshift(L[j]);
    return lines.map((l) => ({ line: l.replace(/^\s*\/\/\s*/, ""), at: `${p.short(abs)}:${i + 1}` }));
  };
  if (t.kind === "part") return near(t.world!.loc, t.id);
  const def = p.assets.get(t.asset);
  return [...near(t.p!.loc ?? t.p!.code), ...near(def?.top ?? def?.loc)];
}
const STOP = new Set(["a", "an", "the", "of", "on", "in", "to", "at", "by", "and", "with", "its", "for", "from", "that", "this"]);

/** pxl inspect: every thing of the scene an edit can name, a line each (`find`: those whose id, asset, or the comment of its call or its asset's definition has the words, the most first); or one (`id`) in full. Text, or JSON. */
export function inspect(file: string, scene: string, o: { id?: string; json?: boolean; frame?: number; find?: string } = {}): string {
  // built for checking (no light passes), keeping where code placed a thing
  const p = loadProject(file, { checksOnly: true, where: true });
  if (!p.assets.has(scene)) throw new PxError(`unknown asset '${scene}'`);
  const f = o.frame ?? 0, at = () => { const b = p.build(scene, 0, frameTime(p, scene, f)); return { b, all: targetsOf(p, b) }; };
  const { b, all } = o.id === undefined ? at() : narrow(p, scene, o.id, at);
  const head = (t: Target) => ({ id: t.id, kind: t.kind, asset: t.asset, ...(t.layer ? { layer: t.layer } : {}), ...(t.box ? { box: t.box, feet: t.feet } : {}) });
  const where = (t: Target) => (t.box ? `x ${t.box[0]}-${t.box[2]}, y ${t.box[1]}-${t.box[3]}, feet ${t.feet!.join(",")}` : "nothing drawn");
  if (o.id === undefined) {
    // --find: each word (a plural's s dropped) looked for in its id, its asset's name and the comments of its call and its asset's definition
    const words = (o.find ?? "").toLowerCase().split(/[^\p{L}\p{N}_]+/u).filter((w) => w && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
    const found = all.map((t) => {
      const c = o.find === undefined ? [] : commentsOf(p, t), hay = `${t.id} ${t.asset}`.toLowerCase(), has = (s: string) => words.filter((w) => s.toLowerCase().includes(w));
      const said = c.filter((l) => has(l.line).length).sort((u, v) => has(v.line).length - has(u.line).length)[0];
      return { t, n: new Set([...has(hay), ...c.flatMap((l) => has(l.line))]).size, said: said && `"${said.line.length > 90 ? said.line.slice(0, 89) + "…" : said.line}" (${said.at})` };
    });
    const list = o.find === undefined ? found : found.filter((x) => x.n > 0).sort((u, v) => v.n - u.n);
    const rows = list.map(({ t, said }) => { const ops = (details(p, scene, b, t, all).ops as Op[]).map((x) => x.op); return { ...head(t), ops, ...(t.why ? { why: t.why } : {}), ...(said ? { said } : {}) }; });
    if (o.json) return JSON.stringify({ scene, frame: f, things: rows });
    const top = o.find === undefined ? `${all.length} things an edit can name`
      : list.length ? `${list.length} of its ${all.length} things match "${o.find}", the most words first`
      : `nothing matches "${o.find}" in an id, an asset or the comment above a call or an asset's definition (it has: ${all.map((t) => t.id).join(", ")})`;
    return [`${scene}, frame ${f}: ${top} (pxl inspect <file> ${scene} --id <id> for one; pxl edit <file> ${scene} <edits> changes them)`,
      ...rows.map((r) => `  ${r.id}: ${r.kind === "part" ? `a world3d part made by ${r.asset}` : `a ${r.kind} of ${r.asset} @${r.layer ?? "-"}`}, ${where(all.find((t) => t.id === r.id)!)}; ${r.ops.length ? `ops ${r.ops.join(" ")}` : r.why}${r.said ? `; ${r.said}` : ""}`)].join("\n");
  }
  const t = all.find((x) => x.id === o.id);
  if (!t) throw new PxError(`no '${o.id}' in ${scene} at frame ${f} (it has: ${all.map((x) => x.id).join(", ")})`);
  const d = details(p, scene, b, t, all);
  if (o.json) return JSON.stringify({ scene, frame: f, ...head(t), ...d });
  const lines = [`${t.id}: ${t.kind === "part" ? `a world3d part made by ${t.asset} (${d.world})` : `a ${t.kind} of ${t.asset} @${t.layer ?? "-"}`}, frame ${f}`, `  where: ${where(t)}${d.at ? `; at ${(d.at as number[]).join(", ")} m` : ""}`];
  if (d.note) lines.push(`  ${d.note}`);
  if (d.call) lines.push(`  call: ${d.call}`);
  if (d.values) lines.push(typeof d.values === "string" ? `  values: ${d.values}` : `  values: ${Object.entries(d.values as Record<string, string>).map(([k, v]) => `${k} ${v}`).join("; ")}`);
  for (const k of ["relation", "asset"]) if (d[k]) lines.push(`  ${k}: ${d[k]}`);
  for (const k of ["placedByIt", "rules", "parts"] as const) if ((d[k] as string[] | undefined)?.length) lines.push(`  ${k === "placedByIt" ? "placed by it" : k}: ${(d[k] as string[]).join("; ")}`);
  if (d.colors) lines.push(`  colors: ${d.colors}`);
  const ops = d.ops as Op[];
  lines.push(ops.length ? `  ops (pxl edit <file> ${scene} '{ "op": ..., "target": "${t.id}", ... }'):` : "  ops: none (its values are the code's)");
  for (const x of ops) lines.push(`    ${x.op} { ${x.takes} }${x.scopes.length > 1 ? `, scope ${x.scopes.join(" | ")}` : ""}`);
  return lines.join("\n");
}

/** Each placement's label: its id, else its asset's name, "#n" among its copies in its layer (describe's). */
function labelsOf(b: BuildOut): Map<Placement, string> {
  const groups = new Map<string, Placement[]>();
  for (const q of b.placements) { const k = `${q.name}@${q.layer ?? ""}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(q); }
  return new Map(b.placements.map((q) => [q, labelOf(q, groups.get(`${q.name}@${q.layer ?? ""}`)!)]));
}

/** The source lines an edit changes in one file, old (-) under new (+), each pair at its file:line. */
function lineDiff(name: string, a: string, b: string): string[] {
  const A = a.split("\n"), B = b.split("\n"), out: string[] = [];
  let i = 0, j = 0;
  while (i < A.length && i < B.length && A[i] === B[i]) i++;
  while (j < A.length - i && j < B.length - i && A[A.length - 1 - j] === B[B.length - 1 - j]) j++;
  if (A.length === B.length) { for (let k = i; k < A.length - j; k++) if (A[k] !== B[k]) out.push(`  ${name}:${k + 1}`, `  - ${A[k]}`, `  + ${B[k]}`); }
  else out.push(`  ${name}:${i + 1}`, ...A.slice(i, A.length - j).map((l) => `  - ${l}`), ...B.slice(i, B.length - j).map((l) => `  + ${l}`));
  return out;
}

/**
 * What changed between two builds of a picture, pixel by pixel, by who: at each changed pixel, the
 * labels whose own pixels there differ (a placement's, its shadow's copy with it; else a 3D part's;
 * else "background": code drew it). `mayB`, `mayA`: the labels (before, after) the edit may change: a
 * pixel under one of them is theirs to change; any other changed pixel counts against what else changed.
 * `lit`: a world3d part's light and shadow fall round it, so a pixel no placement changed is its.
 */
function changedBy(b: BuildOut, b2: BuildOut, mayB: Set<string>, mayA: Set<string>, lit = false): { by: [string, number][]; other: [string, number][] } {
  const n = b.img.w * b.img.h, ch = new Uint8Array(n), by = new Map<string, number>(), other = new Map<string, number>();
  for (let j = 0; j < n; j++) if (b.img.data[j] !== b2.img.data[j]) ch[j] = 1;
  // what covers each changed pixel: its label, and its layer and color there
  const covers = (x: BuildOut) => {
    const out = new Map<number, { l: string; k: string }[]>(), W = x.img.w, H = x.img.h;
    for (const [q, l] of labelsOf(x))
      for (let y = 0; y < q.img.h; y++) for (let xx = 0; xx < q.img.w; xx++) {
        const X = q.x + xx, Y = q.y + y, c = q.img.data[y * q.img.w + xx];
        if (c === TRANSPARENT || X < 0 || Y < 0 || X >= W || Y >= H || !ch[Y * W + X]) continue;
        (out.get(Y * W + X) ?? out.set(Y * W + X, []).get(Y * W + X)!).push({ l, k: `${q.layer ?? ""}:${c}` });
      }
    return out;
  };
  const cb = covers(b), ca = covers(b2), add = (m: Map<string, number>, l: string) => m.set(l, (m.get(l) ?? 0) + 1);
  const part = (x: BuildOut, j: number) => { const P = x.img.parts, k = P ? P.ids[j] : -1; return k >= 0 ? P!.names[k].split(".")[0] : undefined; };
  for (let j = 0; j < n; j++) {
    if (!ch[j]) continue;
    const B = cb.get(j) ?? [], A = ca.get(j) ?? [], pb = part(b, j), pa = part(b2, j), its = (E: typeof B, l: string) => E.filter((e) => e.l === l).map((e) => e.k).join();
    let who = [...new Set([...B, ...A].map((e) => e.l))].filter((l) => its(B, l) !== its(A, l));
    const placed = who.length > 0;
    if (!who.length) who = [...new Set([pb, pa].filter((v): v is string => !!v))];
    if (!who.length) who = ["background"];
    for (const l of who) add(by, l);
    const ok = B.some((e) => mayB.has(e.l)) || A.some((e) => mayA.has(e.l)) || (pb && mayB.has(pb)) || (pa && mayA.has(pa)) || who.every((l) => mayB.has(l) || mayA.has(l)) || (lit && !placed);
    if (!ok) for (const l of who) add(other, l);
  }
  const sorted = (m: Map<string, number>) => [...m].sort((u, v) => v[1] - u[1]);
  return { by: sorted(by), other: sorted(other) };
}

/** What an edit may change in a build: the labels its targets (and `allow`) name there, and what is placed by relation to them, and to that (a world3d part's by its spec). */
function mayOf(x: BuildOut, worlds: { world: World }[], seeds: Iterable<string>): Set<string> {
  const may = new Set(seeds), labels = labelsOf(x);
  for (let n = -1; n !== may.size;) {
    n = may.size;
    const keys = new Set(x.placements.filter((q) => may.has(labels.get(q)!)).map((q) => q.id ?? q.name));
    for (const q of x.placements) if (q.rel?.to && keys.has(q.rel.to)) may.add(labels.get(q)!);
    for (const { world: w } of worlds) for (const k of w.names) {
      const s = w.spec.parts[k] as unknown as Record<string, unknown>;
      if (REL.some((r) => { const v = s[r]; return (typeof v === "string" && may.has(v)) || (Array.isArray(v) && may.has(v[0])); })) may.add(k);
    }
  }
  return may;
}

/** Code without its comments (a string holding // or /* loses its end: what reads it then says no). */
const code = (s: string) => s.replace(/\/\*[^]*?\*\//g, " ").replace(/\/\/[^\n]*/g, "");
/** Is the call at src[o], closing at src[end], a statement of its own: nothing before it in its statement, its value read by nothing? */
function alone(src: string, o: number, end: number): boolean {
  const before = code(src.slice(0, o)), prev = before.trimEnd().at(-1), after = code(src.slice(end + 1)), next = after.trimStart()[0];
  const broke = (gap: string) => gap.includes("\n");
  const head = prev === undefined || ";{})".includes(prev) || (broke(before.slice(before.trimEnd().length)) && /[\w$"'\]]/.test(prev));
  const tail = next === undefined || ";}".includes(next) || (broke(after.slice(0, after.length - after.trimStart().length)) && /[\w$"'{]/.test(next) && !/^(in|instanceof)\b/.test(after.trimStart()));
  return head && tail;
}

/**
 * What an edit's new text can't draw otherwise, so the rebuild keeps its builds (p2 takes p's): every
 * asset but those whose defining call, a statement of its own, holds a changed character, and what
 * reads them (built, or a group or a name asked for whose answer changed). None kept when a change lies
 * outside such a call (a table, a const, a helper's arrow: anything may read it).
 */
// ponytail: line by line; an edit that adds or takes out a line rebuilds everything
export function unchanged(p: Project, p2: Project, texts: Map<string, string>): (name: string) => boolean {
  const none = () => false, bad = new Set<string>();
  for (const [abs, now] of texts) {
    const was = readFileSync(abs, "utf8"), A = was.split("\n"), B = now.split("\n"), file = p.short(abs);
    if (A.length !== B.length) return none;
    const calls = [...p.assets.values()].flatMap((d) => {
      const o = d.loc?.replace(/:\d+(:\d+)?$/, "") === file ? callAt(was, d.loc, /^[\w$]+\s*\(/) : undefined;
      if (o === undefined) return [];
      const open = was.indexOf("(", o), end = listAt(was, open).end;
      return [{ name: d.name, open, end, alone: alone(was, o, end) }];
    });
    for (let i = 0, at = 0; i < A.length; at += A[i].length + 1, i++) {
      if (A[i] === B[i]) continue;
      let a = 0, z = 0;
      while (a < A[i].length && A[i][a] === B[i][a]) a++;
      while (z < A[i].length - a && z < B[i].length - a && A[i].at(-1 - z) === B[i].at(-1 - z)) z++;
      const s = at + a, e = at + A[i].length - z, own = calls.filter((c) => c.open < s && e <= c.end);
      if (!own.length || !own.every((c) => c.alone)) return none;
      for (const c of own) bad.add(c.name);
    }
  }
  const answer = (q: Project, n: string) => { try { return JSON.stringify([q.has(n), q.candidates(n), q.assets.get(n)?.kind, q.assets.get(n)?.loc]); } catch (e) { return String(e); } };
  for (const [, rs] of p.reads) for (const n of rs) if (answer(p, n) !== answer(p2, n)) bad.add(n);
  for (let k = -1; k !== bad.size;) { k = bad.size; for (const [by, rs] of p.reads) if (!bad.has(by) && [...rs].some((n) => bad.has(n))) bad.add(by); }
  return (n) => !bad.has(n) && answer(p, n) === answer(p2, n);
}

/**
 * pxl edit: the edits written into the art files (all of them, or none: each checked, and the scene
 * rebuilt), saying what changed (describe --diff by id, the pixels changed by id) and pxl check. Refused,
 * nothing written, when it changes more than its targets, what is placed by them and `allow`. `dry`:
 * the source lines it would change and what, nothing written. The lines to print, and whether it held.
 */
export function edit(file: string, scene: string, given: unknown, o: { frame?: number; dry?: boolean; allow?: string[] } = {}): { lines: string[]; ok: boolean } {
  const edits = (Array.isArray(given) ? given : [given]).map(checkEdit);
  // built for checking (no light passes: what changes is the drawing's), keeping where code placed a thing
  const p = loadProject(file, { checksOnly: true, where: true });
  if (!p.assets.has(scene)) throw new PxError(`unknown asset '${scene}'`);
  const f = o.frame ?? 0, b = p.build(scene, 0, frameTime(p, scene, f)), all = targetsOf(p, b);
  const texts = new Map<string, string>(), read = (abs: string) => texts.get(abs) ?? readFileSync(abs, "utf8");
  // each edit's place in its file: the last first, so what one writes doesn't move the next's (a part's spec is found by its name)
  const anchor = (e: Edit) => { const t = all.find((x) => x.id === (e.op === "add" ? addTo(e) : e.target)); const loc = t?.kind === "part" ? undefined : e.scope === "asset" ? p.assets.get(t?.asset ?? "")?.loc : t?.p?.loc; return loc ? loc.split(":").slice(1).map(Number) : [-1, -1]; };
  const order = edits.map((e, i) => ({ e, i, a: anchor(e) })).sort((u, v) => v.a[0] - u.a[0] || v.a[1] - u.a[1] || u.i - v.i);
  const said: string[] = [], refused: string[] = [];
  for (const { e } of order) {
    const t = all.find((x) => x.id === e.target);
    const r = ((): { src: string; said: string; abs: string } | string => {
      const has = () => `it has: ${all.map((x) => x.id).join(", ")}`;
      if (e.op === "add") {
        // a new stamp, its line after the one its relation names (that one's layer)
        const to = all.find((x) => x.id === addTo(e)), lk = e.like === undefined ? undefined : all.find((x) => x.id === e.like);
        if (t || b.placements.some((q) => q.id === e.target)) return `'${e.target}' names one already: an add's target is the new one's id`;
        if (!to) return `no '${addTo(e)}' in ${scene} at frame ${f} to place it by (${has()})`;
        if (to.kind !== "stamp" || to.why) return `${to.id} isn't a stamp call of its own in the file (${to.why ?? `a ${to.kind}`}): add it by hand`;
        if (e.asset !== undefined && !p.has(e.asset)) return `no asset '${e.asset}'`;
        if (e.like !== undefined && (!lk || lk.kind !== "stamp" || lk.why)) return lk ? `like copies a stamp's call: ${lk.id}'s ${lk.why ?? `is a ${lk.kind}'s`}` : `no '${e.like}' to copy (${has()})`;
        const abs = fileOf(p, to.p!.loc!), la = lk && fileOf(p, lk.p!.loc!);
        if (!abs || (lk && !la)) return "its stamp isn't in an art file";
        const w = addStamp(read(abs), to.p!.loc!, e, lk && { src: read(la!), loc: lk.p!.loc! });
        return typeof w === "string" ? w : { ...w, abs };
      }
      if (!t) return `no '${e.target}' in ${scene} at frame ${f} (${has()})`;
      if (t.kind === "part") {
        const abs = t.world!.loc && fileOf(p, t.world!.loc);
        if (!abs) return "its world3d() isn't in an art file";
        const w = editPart(read(abs), p.short(abs), t.id, e, Object.keys(t.world!.world.makers), e.op === "set" ? paramsOf(t.world!.world, t.asset) : undefined);
        return typeof w === "string" ? w : { ...w, abs };
      }
      if (t.why) return t.why;
      const loc = e.scope === "asset" ? p.assets.get(t.asset)?.loc : t.p!.loc!, abs = loc && fileOf(p, loc);
      if (!loc || !abs) return `'${t.asset}' isn't made in an art file`;
      const info = { knobs: t.p!.rel?.knobs ?? [], anim: frameCount(p, t.asset) > 1, has: (n: string) => p.has(n) };
      const tw = e.op === "flip" && (e.axis ?? "x") === "x" && e.scope !== "asset" ? turned(p, t.asset) : undefined;
      if (tw) {
        // a turnaround's sprite flipped across is turned instead: its family's mirror heading, lit as it is (a
        // mirror would light it from the other side), the heading added to its call when it draws none there
        const absT = tw.add ? tw.loc && fileOf(p, tw.loc) : abs;
        if (!absT) return "its turnaround() isn't in an art file";
        const h = tw.add ? addHeading(read(absT), tw.loc!, tw.family, tw.deg) : undefined;
        if (typeof h === "string") return `turned, it faces a heading its family doesn't draw: ${h}`;
        const w = editStamp(h && absT === abs ? h.src : read(abs), loc, { op: "swap", target: e.target, asset: h?.asset ?? tw.to }, { ...info, has: () => true });
        if (typeof w === "string") return w;
        if (h && absT !== abs) texts.set(absT, h.src);
        return { src: w.src, said: `turned to face ${(h?.asset ?? tw.to).slice(tw.family.length + 1)}: ${h ? `${h.said}, ` : ""}${w.said}`, abs };
      }
      const w = e.scope === "asset" ? editAsset(read(abs), loc, t.asset, e) : editStamp(read(abs), loc, e, info);
      return typeof w === "string" ? w : { ...w, abs };
    })();
    if (typeof r === "string") { refused.push(`edit: ${e.target}: ${e.op} refused: ${r}`); continue; }
    texts.set(r.abs, r.src);
    said.push(`edit: ${e.target}: ${r.said}`);
  }
  if (refused.length) return { lines: [...refused, "nothing written"], ok: false };
  // rebuilt from the new text before anything is written, keeping the builds of what the edit can't reach
  let p2: Project, b2: BuildOut;
  try { p2 = loadProject(file, { checksOnly: true, where: true }, read); p2.adopt(p, unchanged(p, p2, texts)); b2 = p2.build(scene, 0, frameTime(p2, scene, f)); }
  catch (err) { return { lines: [...said, `edit: not written: rebuilt, ${(err as Error).message.split("\n")[0]}`], ok: false }; }
  const lines = [...said];
  if (o.dry) lines.push("source (- now, + after):", ...[...texts].flatMap(([abs, t]) => lineDiff(p.short(abs), readFileSync(abs, "utf8"), t)));
  // what changed: describe --diff of the scene at that frame, by id; a world's parts by world.changed()
  const pal = p.assets.get(scene)!.pal, prev = describe(scene, b, pal).snap, text = describe(scene, b2, p2.assets.get(scene)!.pal, { prev }).text.split("\n");
  const i = text.findIndex((l) => l.startsWith("CHANGES")), j = text.indexOf("", i);
  // (not its regions: they name what shows there after, which read as changed too; the by-id line says what changed)
  lines.push(...text.slice(i, j < 0 ? undefined : j).filter((l) => !/^\s+(region |…\+\d+ smaller region)/.test(l)).map((l) => l.replace("since the last describe of this asset", `describe --diff, frame ${f}`)));
  p.worlds.forEach((w, k) => { if (edits.some((e) => all.find((t) => t.id === e.target)?.world === w) && p2.worlds[k]) lines.push(`  world3d at ${w.loc}: changed ${w.world.changed(p2.worlds[k].world).join(", ") || "nothing"}`); });
  // the guard: what it may change, its targets (an asset's every copy, scope "asset"), by their labels before
  // and after (a stamp without an id: the one its call places now), what is placed by them, and `allow`
  const lb = labelsOf(b), lb2 = labelsOf(b2), seedsB = [...(o.allow ?? [])], seedsA = [...seedsB];
  const line = (q: Placement) => q.loc?.split(":").slice(0, 2).join(":"), from = (x: BuildOut, q: Placement) => x.placements.filter((r) => r.layer === q.layer && r.loc && line(r) === line(q));
  for (const e of edits) {
    const t = all.find((x) => x.id === e.target)!;
    if (e.op === "add") { seedsA.push(e.target); continue; }
    if (t.kind !== "part" && e.scope === "asset") { for (const [x, s] of [[lb, seedsB], [lb2, seedsA]] as const) for (const [q, l] of x) if (q.name === t.asset) s.push(l); continue; }
    const now = t.p && !t.p.id ? from(b2, t.p)[from(b, t.p).indexOf(t.p)] : undefined;
    seedsB.push(t.id); seedsA.push(now ? lb2.get(now)! : t.id);
  }
  const mayB = mayOf(b, p.worlds, seedsB), mayA = mayOf(b2, p2.worlds, seedsA), may = (k: string) => mayB.has(k.split(/[@.]/)[0]) || mayA.has(k.split(/[@.]/)[0]);
  // (an edit of a part, its world's other parts as they were: what no placement changed is its light and shadow)
  // ponytail: code that draws from the same numbers as the part, in such a scene, passes too
  const lit = edits.some((e) => all.find((t) => t.id === e.target)?.kind === "part") && p.worlds.every((w, k) => !p2.worlds[k] || w.world.changed(p2.worlds[k].world).every(may));
  const { by, other } = changedBy(b, b2, mayB, mayA, lit);
  const top = (m: [string, number][]) => m.slice(0, 8).map(([l, n]) => `${l} ${n}`).join(", ") + (m.length > 8 ? `, +${m.length - 8} more` : "");
  lines.push(`  pixels changed by id: ${by.length ? top(by) : "none"}`);
  if (!by.length) {
    // nothing changed in the drawing: what never will isn't written (a flip of its own mirror, z in a layer
    // sorted by y); else said, and written (its light or another frame may change)
    const e = edits.length === 1 ? edits[0] : undefined, t = e && all.find((x) => x.id === e.target), axis = e?.axis ?? "x", sibs = t ? siblings(p, t.asset) : [];
    const why = !t?.p ? undefined
      : e!.op === "flip" && ownMirror(t.p.img, axis) ? `${t.asset} is its own mirror across ${axis} (a front or back view drawn symmetric), so a flip can't turn it${sibs.length ? `; swap it for another view: ${sibs.join(", ")}` : ""}`
      : e!.op === "set" && e!.key === "z" && t.p.sort !== undefined ? `z orders a layer sorted by z, and its layer, ${t.layer}, sorts by y: what stands lower covers (move it, or stamp it in a layer drawn after)` : undefined;
    if (why) return { lines: [...lines, `edit: refused: it changes nothing: ${why}`, "nothing written"], ok: false };
    lines.push(`edit: it changes nothing in the drawing at frame ${f}: what it writes isn't read there, or changes only its light or another frame (pxl shot shows those)`);
  }
  if (other.length) return { lines: [...lines, `edit: refused: besides ${[...new Set([...mayB, ...mayA])].join(", ")} (its targets and what is placed by them), it changes ${top(other)} px (--allow "${other.map(([l]) => l).join(",")}" lets it)`, "nothing written"], ok: false };
  if (o.dry) return { lines: [...lines, "dry: nothing written"], ok: true };
  for (const [abs, t] of texts) writeFileSync(abs, t);
  lines.push(`wrote ${[...texts.keys()].map((a) => p.short(a)).join(", ")}`);
  // (the file as written is the one rebuilt: its builds serve the check)
  const c = checkProject(p2, { file: basename(file) });
  lines.push(`check: ${c.lines.length ? `${c.lines.length} warning${c.lines.length > 1 ? "s" : ""}` : "no warnings"} (${c.checked}; ${c.coverage})`, ...c.lines.map((l) => "  " + l));
  return { lines, ok: true };
}
