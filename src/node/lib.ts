// pxl lib: the library (lib/) as a catalog of its cards, by subject; one entry's card, with what a build
// of it reads (size, pivot, contract, frames, roles, its source); a 3D entry drafted at a cell it lacks.
// No art file: it reads pxl's own lib/.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { PxError, didYouMean } from "../core/errors.ts";
import { animTimeline, buildAsset } from "../core/build.ts";
import { Trace } from "../core/trace.ts";
import type { Card, Project } from "../core/project.ts";
import { loadProject } from "./load.ts";
import { writeOutputs } from "./output.ts";

export const LIB = join(import.meta.dirname, "..", "..", "lib");
/** A path as the user's shell reaches it from where pxl runs. */
const rel = (abs: string) => relative(process.cwd(), abs).split(sep).join("/");
const THREE = new Set(["surface", "mesh", "voxels", "volume", "draw3d", "splats", "decal"]);

/** A library entry: its card, its file, how a scene takes it (`include(...)`, from the file's header) and the names it goes under. */
export interface Entry { name: string; card: Card; file: string; subject: string; take?: string; as?: string; opts?: string; genres: string[] }

/** A lib file's own header line `include("<path>/lib/...", { ... })`: how a scene takes it, and its `as`. */
function takeOf(abs: string): { take?: string; as?: string; opts?: string } {
  const head = readFileSync(abs, "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(2).trim()).join(" ");
  const m = /include\("<path>\/(lib\/[^"]+)"(, \{[^}]*\})?\)/.exec(head);
  return m ? { take: `include("${rel(join(LIB, "..", m[1]))}"${m[2] ?? ""})`, as: /as: "(\w+)"/.exec(m[2] ?? "")?.[1], opts: m[2] } : {};
}

/** Every lib file loaded (no builds): its own cards as entries, and the genres of lib/profiles. */
export function catalog(): { files: Map<string, string[]>; entries: Entry[]; genres: Map<string, { cell: string; file: string }> } {
  const files = new Map<string, string[]>(), entries: Entry[] = [], genres = new Map<string, { cell: string; file: string }>();
  const subjects = readdirSync(LIB, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  for (const subject of subjects) for (const f of readdirSync(join(LIB, subject)).filter((f) => f.endsWith(".px.js")).sort()) {
    files.set(subject, [...(files.get(subject) ?? []), f.replace(/\.px\.js$/, "")]);
    const abs = join(LIB, subject, f), p = loadProject(abs), mine = (loc?: string) => !!loc && p.fileOf(loc) === abs, { take, as, opts } = takeOf(abs);
    for (const c of p.cards.values()) if (mine(c.loc)) {
      // the genres its cells' drawings name (genre: "hd2d"), for --genre
      const genres = [...new Set(Object.values(c.cells).flatMap((v) => (v.asset ? members(p, v.asset) : [])).map((n) => p.assets.get(n)?.opts.genre).filter((g) => g !== undefined))];
      entries.push({ name: c.kind === "builder" || !as ? c.name : `${as}.${c.name}`, card: c, file: abs, subject, take, as, opts, genres });
    }
    for (const g of p.genres.values()) if (mine(g.loc)) genres.set(g.name, { cell: `${(g.camera as { kind?: string } | undefined)?.kind ?? "?"}/${g.grid ?? "?"}`, file: abs });
  }
  return { files, entries, genres };
}

const cellsOf = (c: Card) => Object.entries(c.cells).map(([k, v]) => `${k} ${v.status}`);
/** `is` cut to `n` characters, at a comma. */
const short = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(", ", n) > 20 ? s.lastIndexOf(", ", n) : s.lastIndexOf(" ", n)));

/** pxl lib [--genre g] [--cell camera/grid]: the entries by subject, a line each. */
export function libList(opts: { genre?: string; cell?: string } = {}): string[] {
  const m = opts.cell === undefined ? undefined : /^(\w+)(?:\/(\d+|\?))?$/.exec(opts.cell);
  if (m === null) throw new PxError(`--cell is <camera>/<grid> (side/32) or a camera alone (side: any grid), got "${opts.cell}"`);
  const { files, entries, genres } = catalog();
  let keep = (_: Entry) => true, said = "";
  if (opts.genre !== undefined) {
    const g = genres.get(opts.genre);
    if (!g) throw new PxError(`--genre: no genre '${opts.genre}' in lib/profiles${didYouMean(opts.genre, genres.keys())} (there are: ${[...genres.keys()].join(", ") || "none"})`);
    // its cell, and what names the genre
    keep = (e) => g.cell in e.card.cells || e.genres.includes(opts.genre!);
    said = ` at genre ${opts.genre}'s cell ${g.cell}, or naming it`;
  }
  if (m) {
    const was = keep;
    keep = (e) => was(e) && Object.keys(e.card.cells).some((k) => (m[2] === undefined ? k.startsWith(`${m[1]}/`) : k === opts.cell));
    said += ` at ${opts.cell}`;
  }
  const out = [`pxl's library (lib/), by subject${said}: an entry a line. pxl lib <entry>: its card.`, "Cells: camera/grid, ✓ approved, ◐ a 3D render to look at, ✎ by hand over a 3D draft."];
  const w = Math.max(20, ...entries.map((e) => e.name.length)) + 2;
  for (const [subject, fs] of files) {
    const es = entries.filter((e) => e.subject === subject && keep(e)), gs = [...genres].filter(([, g]) => g.file.includes(`${sep}${subject}${sep}`));
    if (said && !es.length) continue;
    out.push(`${subject.padEnd(13)} lib/${subject}: ${fs.join(" ")}${gs.length ? `; genres ${gs.map(([n, g]) => `${n} (${g.cell})`).join(", ")}` : ""}`);
    for (const e of es) {
      const cells = cellsOf(e.card).join(" ");
      out.push(`  ${e.name.padEnd(w)} ${e.card.kind.padEnd(10)} ${cells.padEnd(28)} ${short(e.card.is, Math.max(30, 118 - w - 42 - Math.max(0, cells.length - 28)))}`);
    }
  }
  return out;
}

/** The assets a cell's asset stands for: itself, a group's members, a turnaround's or a figure's (rig3d) drawings. */
export function members(p: Project, name: string): string[] {
  if (p.assets.has(name)) return [name];
  const F = p.figures.get(name);
  if (F) return F.moves.flatMap((M) => M.heads.map((h) => `${name}_${M.m}_${h.name}`)).filter((n) => p.assets.has(n));
  const T = p.turnarounds.get(name);
  if (T) return T.heads.map((h) => `${name}_${h.name}`);
  const font = p.fonts.get(name);
  if (font) return [font.asset];
  return p.groups.get(name)?.members ?? [];
}

/** An entry by its full name (lamps._lamp, make3d.oak), or by its own name when only one has it. */
export function findEntry(name: string, entries = catalog().entries): Entry {
  const e = entries.find((e) => e.name === name) ?? (entries.filter((e) => e.card.name === name).length === 1 ? entries.find((e) => e.card.name === name) : undefined);
  if (!e) throw new PxError(`no entry '${name}' in the library${didYouMean(name, entries.map((e) => e.name))} (pxl lib lists them)`);
  return e;
}

/**
 * What an asset is drawn with: the ops a build of its frame 0 painted with, its base followed to its
 * source, the 3D ones apart; or frozen (a render kept as a PNG), or imported (a png).
 */
export function drawnWith(p: Project, name: string): { three: string[]; hand: string[]; frozen?: boolean; png?: boolean } {
  let d = p.assets.get(name)!;
  for (let i = 0; i < 8 && typeof d.opts.base === "string" && !d.opts.frozen; i++) d = p.assets.get(d.opts.base) ?? p.assets.get((d.ns ?? "") + d.opts.base) ?? d;
  if (d.opts.frozen) return { three: [], hand: [], frozen: true };
  if (d.png) return { three: [], hand: [], png: true };
  const tr = new Trace(), ops = new Set<string>();
  buildAsset(p, d, 0, tr);
  for (const f of tr.frames) { const m = /^([\w.]+)\(/.exec(f.label); if (m) ops.add(m[1]); }
  return { three: [...ops].filter((o) => THREE.has(o)), hand: [...ops].filter((o) => !THREE.has(o)) };
}

/** How its drawing is made, in words. */
function sourceOf(p: Project, name: string): string {
  const { three, hand, frozen, png } = drawnWith(p, name);
  if (frozen) return "3D, frozen (a render kept as a PNG)";
  if (png) return "imported (png)";
  return three.length ? (hand.length ? `hybrid: 3D (${three.join(", ")}) and by hand (${hand.join(", ")})` : `3D (${three.join(", ")})`) : `2D by hand (${hand.join(", ") || "code"})`;
}

const ms = (p: Project, n: string) => {
  const d = p.assets.get(n)!.kind === "anim" ? animTimeline(p.assets.get(n)!).durations ?? [] : [];
  return !d.length ? "" : d.every((v) => v === d[0]) ? `${d.length} x ${Math.round(d[0])} ms` : `${d.length} frames, ${d.map(Math.round).join(" ")} ms`;
};

/** pxl lib <entry>: its card, with what a build of it reads. */
export function libCard(name: string): string[] {
  const e = findEntry(name), c = e.card, p = loadProject(e.file), out = [`${e.name}: ${c.is}`];
  const row = (k: string, v: string) => out.push(`  ${k.padEnd(9)} ${v}`);
  const ns = e.as, code = (s: string) => { try { return p.scope?.(s); } catch { return undefined; } };
  const kit = ns ? (code(`Object.keys(${ns})`) as string[] | undefined) : undefined;
  if (e.take) row("take", e.take);
  if (kit?.length) row("kit", `${ns}.${kit.join(", ")}`);
  const cells = Object.entries(c.cells);
  if (c.kind === "builder") {
    const b = p.builders.get(c.name.slice(7)), built = code(`make3d[${JSON.stringify(c.name.slice(7))}]()`) as { parts?: object; sockets?: object } | undefined;
    const at = b?.loc ? `${rel(p.fileOf(b.loc) ?? e.file)}:${b.loc.split(":")[1]}` : rel(e.file);
    row("source", `3D builder (make3d.define, ${at}): drawn by turnaround() or draw3d()`);
    const params = Object.entries(b?.params ?? {}).map(([k, v]) => `${k} ${Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === "number") ? `${v[0]}..${v[1]}` : Array.isArray(v) ? v.join(" ") : JSON.stringify(v)}`);
    row("params", [...params, "seed"].join(", "));
    if (built) row("parts", `${Object.keys(built.parts ?? {}).join(", ") || "-"}; sockets ${Object.keys(built.sockets ?? {}).join(", ") || "-"}`);
    row("cells", `${cells.map(([k, v]) => `${k} ${v.status}${v.asset ? ` ${v.asset}` : ""}`).join(", ")}${cells.some(([, v]) => !v.asset) ? ` (no asset: pxl lib draft ${e.name} --cell <cell>)` : ""}`);
    if (c.tiles) row("size", `${c.tiles} tiles tall: ${[...new Set(cells.map(([k]) => k.split("/")[1]).filter((g) => g !== "?"))].map((g) => `${Math.round(c.tiles! * +g)} px at ${g}`).join(", ")}`);
  } else {
    // a family stands for its drawings: its first cell's, the s heading's of its first move, else its first
    const all = members(p, c.name), first = members(p, cells[0][1].asset!), rep = first.find((n) => /_s$/.test(n)) ?? first[0];
    row("source", rep ? sourceOf(p, rep) : "-");
    row("cells", `${cells.map(([k, v]) => `${k} ${v.status} ${v.asset}`).join(", ")}${all.length > 1 ? ` (${all.length} drawings${rep ? `, read on ${rep}` : ""})` : ""}`);
    if (rep) {
      const img = p.build(rep).img, d = p.assets.get(rep)!;
      row("size", `${img.w}x${img.h}, pivot ${img.pivot ? img.pivot.join(",") : "-"}${d.kind === "anim" ? `; ${ms(p, rep)}` : ""}${d.opts.genre ? `; genre ${d.opts.genre}` : ""}`);
      // sockets and boxes over its frames (a figure: each move's first frame, the move named)
      const F = p.figures.get(c.name), sockets = new Map<string, Set<string>>(), boxes = new Map<string, Set<string>>();
      const read = (n: string, how: string, frames: boolean) => {
        for (const im of frames && p.assets.get(n)!.kind === "anim" ? p.frames(n).map((f) => f.img) : [p.build(n).img]) {
          for (const k of Object.keys(im.sockets ?? {})) (sockets.get(k) ?? sockets.set(k, new Set()).get(k)!).add(how);
          for (const k of Object.keys(im.boxes ?? {})) (boxes.get(k) ?? boxes.set(k, new Set()).get(k)!).add(how);
        }
      };
      if (F) for (const M of F.moves) { const n = `${c.name}_${M.m}_${M.heads.find((h) => h.name === "s")?.name ?? M.heads[0].name}`; if (p.assets.has(n)) read(n, M.m, false); }
      else read(rep, "", true);
      const say = (m: Map<string, Set<string>>) => [...m].map(([k, w]) => `${k}${F ? ` (${[...w].join(", ")})` : ""}`).join(", ") || "-";
      const fp = boxes.delete("footprint"), sheet = p.sheets.find((s) => p.sheetNames(s).includes(rep));
      row("contract", `footprint ${fp ? "yes" : "-"}, sockets ${say(sockets)}, boxes ${say(boxes)}${sheet ? `; sheet ${sheet.name}${sheet.opts.rows === "tag" ? " (a row a tag)" : ""}` : ""}`);
      if (F) {
        // its moves, those at the same headings together
        const by = new Map<string, string[]>();
        for (const M of F.moves) { const hs = M.heads.length > 8 ? `${M.heads.length} headings` : M.heads.map((h) => h.name).join(" "), n = `${c.name}_${M.m}_${M.heads[0].name}`; by.set(hs, [...(by.get(hs) ?? []), `${M.m} ${p.assets.has(n) ? ms(p, n) : `${M.frames} frames`}`]); }
        row("moves", [...by].map(([hs, ms]) => `${ms.join(", ")} (${hs})`).join("; "));
      }
    }
  }
  const roles = ns ? (code(`${ns}.ROLES && ${ns}.ROLES[${JSON.stringify(c.name.replace(/^.*\./, ""))}]`) as Record<string, string> | undefined) : undefined;
  if (roles) row("roles", `${Object.entries(roles).map(([k, v]) => `${k} ${v}`).join(", ")}: base "${e.name}", swap: roleSwap(${ns}.ROLES.${c.name.replace(/^.*\./, "")}, { ${Object.keys(roles).map((k) => `${k}: ".."`).join(", ")} })`);
  const vary = typeof c.vary === "string" ? { "": c.vary } : c.vary ?? {}, ch: string[] = [];
  if (roles && !vary.color) ch.push("color (its roles)");
  if (c.kind === "builder" && !vary.shape) ch.push("shape (its params), seed");
  ch.push(...Object.entries(vary).map(([k, v]) => (k ? `${k}: ${v}` : v)));
  if (ch.length) row("vary", ch.join("; "));
  row("code", `pxl list ${rel(e.file)} (its card at line ${c.loc?.split(":")[1]})`);
  return out;
}

/** A draft's camera by the cell's: the view turnaround() draws through, the genre's camera, how it reads. */
const CAMS: Record<string, { view: (ppm: number) => string; genre: string; seen: string }> = {
  side: { view: () => `{ kind: "side", pitch: 0 }`, genre: `{ kind: "side", pitch: 0 }`, seen: "from the side" },
  topdown: { view: () => `{ kind: "side", pitch: 45 }`, genre: `{ kind: "topdown", pitch: 45 }`, seen: "from 45 degrees" },
  iso: { view: () => `"iso"`, genre: `{ kind: "iso" }`, seen: "in iso" },
  hd2d: { view: (ppm) => `perspective({ w: 320, h: 180, pitch: -38, fov: 30, ppm: ${ppm} })`, genre: `{ kind: "hd2d", pitch: -38, fov: 30 }`, seen: "through the HD-2D camera (38 degrees down, a 30 degree lens)" },
};

/**
 * pxl lib draft <entry> --cell <camera>/<grid>: a 3D entry (a make3d builder) at a cell it lacks, as an art
 * file that includes it and turns it to that camera, its card's tiles tall on that grid, in the grid's tones
 * (3 at 16-32 px), built: the ✎ draft to clean by hand, or ◐ to look at. Never into lib/.
 */
export function libDraft(name: string | undefined, cell: string | undefined, out?: string): string[] {
  if (!name) throw new PxError("lib draft needs an entry: pxl lib draft make3d.oak --cell topdown/16");
  const m = cell === undefined ? null : /^(\w+)\/(\d+)$/.exec(cell);
  if (!m || !(m[1] in CAMS)) throw new PxError(`lib draft needs --cell <camera>/<grid>: the camera ${Object.keys(CAMS).join(", ")}, the grid a tile's px (topdown/16), got ${cell === undefined ? "none" : `"${cell}"`}`);
  const e = findEntry(name), c = e.card;
  if (c.kind !== "builder") throw new PxError(`${e.name} is ${c.kind === "rig3d" || c.kind === "turnaround" ? `a ${c.kind}() family: at a new cell it is drawn in px by its own call` : "drawn in 2D: at a new density it is redrawn simpler, never drafted (scenes §19)"}; pxl lib draft takes a 3D entry, a make3d builder`);
  if (!c.tiles) throw new PxError(`${e.name}'s card gives no tiles: how many tiles tall it is drawn`);
  const [, cam, grid] = m, b = c.name.slice(7), C = CAMS[cam], p = loadProject(e.file);
  const tall = (p.scope!(`make3d[${JSON.stringify(b)}]()`) as { field: { bounds(): number[][] } }).field.bounds()[1][2];
  const px = Math.round(c.tiles * +grid), ppm = +(px / tall).toFixed(2), tones = +grid <= 32 ? 3 : undefined;
  const dir = resolve(out ?? join("out", "_draft")), base = `${b}_${cam}${grid}`, file = join(dir, `${base}.px.js`), up = relative(dir, e.file).split(sep).join("/");
  // its file as pxl's repo names it, for where an approved draft goes
  const home = relative(join(LIB, ".."), e.file).split(sep).join("/");
  const say = `pxl lib draft ${e.name} --cell ${cell}: ${c.tiles} tiles tall (its card's) on a ${grid} px grid, seen ${C.seen}${tones ? `, in ${tones} tones (16-32 px)` : ""}: the ✎ draft to clean by hand, or ◐ to look at. Change its knobs here; approved, move the turnaround into ${home} and the cell into its card.`;
  const lines = say.split(" ").reduce<string[]>((ls, w) => { if (ls.length && (ls[ls.length - 1] + " " + w).length <= 104) ls[ls.length - 1] += " " + w; else ls.push(`// ${w}`); return ls; }, []);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, [
    ...lines,
    `include("${up}"${e.opts ?? ""})`,
    `genre("${cam}/${grid}", { camera: ${C.genre}, grid: ${grid}${tones ? `, tones: ${tones}` : ""} })`,
    `turnaround("${base}", make3d.${b}(), { ...card("${c.name}").draw, view: ${C.view(ppm)}, ppm: ${ppm}, headings: ["s"], genre: "${cam}/${grid}" })`,
    "",
  ].join("\n"));
  const q = loadProject(file), s = `${base}_s`, r = writeOutputs(q, dir, { only: [s], preview: false });
  if (r.errors.length) throw r.errors[0];
  const img = q.image(s);
  return [
    `${e.name} at ${cell}: ${c.tiles} tiles (${px} px) tall, its ${tall.toFixed(1)} m at ${ppm} px/m, seen ${C.seen}${tones ? `, ${tones} tones` : ""}`,
    `  ${rel(file).padEnd(40)} the art file: change its knobs here`,
    `  ${rel(join(dir, "sprites", `${s}.png`)).padEnd(40)} ${img.w}x${img.h}, pivot ${img.pivot?.join(",") ?? "-"}${img.boxes?.footprint ? ", footprint" : ""}: the ✎ draft, or ◐ to look at`,
    `next: pxl shot ${rel(file)} ${s}. Approved: the turnaround into ${home}, the cell into its card (◐ as drawn, ✎ once retouched, ✓ frozen)`,
  ];
}
