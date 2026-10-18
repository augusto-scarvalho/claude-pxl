// A whole asset as text an agent can read at once (`pxl describe`), in levels, cheapest first:
// what was painted (the painting steps, grouped by source line: one line of code is one intent),
// what is where (placements, repeats folded into one line), and how it came out (cell maps of the
// object on top, the dominant color before lighting and the brightness after it, and how well each
// object stands out from what is around it). A region's exact pixels come on request (`at`).
import type { BuildOut } from "./build.ts";
import type { Placement } from "./canvas.ts";
import { type Color, TRANSPARENT, toHex } from "./color.ts";
import { Img } from "./image.ts";
import type { Palette } from "./palette.ts";
import { replay } from "./steps.ts";

export interface DescribeOpts {
  /** Cell size of the maps, in px (default 8). */
  cell?: number;
  /** Also print the exact pixels (palette keys, before lighting) of this region: x, y, w, h. */
  at?: [number, number, number, number];
  /** Tile size for the repeats of a plain image (default 16). */
  tile?: number;
}

const SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=?";
const lum = (c: Color) => (0.2126 * ((c >>> 24) & 255) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255)) / 255;
const digit = (v: number) => String(Math.max(0, Math.min(9, Math.floor(v * 10))));

export function describe(name: string, b: BuildOut, pal: Palette, opts: DescribeOpts = {}): string {
  const C = opts.cell ?? 8, img = b.img, W = img.w, H = img.h, out: string[] = [];
  // colors outside the palette (made by blending: mist, opacity) all show as "~"
  const rev = pal.reverse(), key = (c: Color) => (c === TRANSPARENT ? "." : rev.get(c) ?? "~");

  // painted: steps grouped by source line; the image just before lighting is the one whose
  // colors are still palette keys
  let unlit: Img = img;
  const groups: { loc: string; ops: Set<string>; n: number; box?: [number, number, number, number]; first: string }[] = [];
  if (b.trace) {
    let prev: Img | undefined, lit = false;
    replay(b.trace, (s, im) => {
      if (!lit && (s.label === "light map" || s.label === "lighting")) { lit = true; if (prev) unlit = prev; }
      if (s.w === W && s.h === H) prev = im.copy();
      const loc = (s.loc ?? "").replace(/:\d+$/, ""), op = s.label.replace(/\(.*$/, "").trim(), last = groups.at(-1);
      const g = last && last.loc === loc && !s.label.startsWith("layer") ? last : undefined;
      const box: [number, number, number, number] | undefined = s.box && [s.box.x, s.box.y, s.box.x + s.box.w, s.box.y + s.box.h];
      if (g) {
        g.ops.add(op); g.n++;
        if (box) g.box = g.box ? [Math.min(g.box[0], box[0]), Math.min(g.box[1], box[1]), Math.max(g.box[2], box[2]), Math.max(g.box[3], box[3])] : box;
      } else groups.push({ loc, ops: new Set([op]), n: 1, box, first: s.label });
    });
  }

  // what is where: placements grouped by asset and layer (a shadow stamp is not the figure)
  const byKey = new Map<string, Placement[]>();
  for (const p of b.placements) {
    const k = `${p.name}@${p.layer ?? ""}`;
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(p);
  }
  const keys = [...byKey.keys()], sym = new Map(keys.map((k, i) => [k, SYMBOLS[i] ?? "~"]));
  // who owns each pixel: the last placement with an opaque pixel there
  const owner = new Int16Array(W * H).fill(-1);
  b.placements.forEach((p, i) => {
    for (let y = 0; y < p.img.h; y++)
      for (let x = 0; x < p.img.w; x++) {
        const X = p.x + x, Y = p.y + y;
        if (X >= 0 && Y >= 0 && X < W && Y < H && p.img.data[y * p.img.w + x] !== TRANSPARENT) owner[Y * W + X] = i;
      }
  });
  const kOf = (i: number) => { const p = b.placements[i]; return `${p.name}@${p.layer ?? ""}`; };

  const frames = b.anim ? `, animated (frame 0 of the loop, ${b.anim.loop} ms)` : "";
  out.push(`${name} ${W}x${H}${frames}. Coordinates are x,y from the top left; boxes are x,y wxh.`);
  out.push("");
  if (groups.length) {
    out.push("PAINTED (steps in order, grouped by source line; a layer line closes that layer):");
    for (const g of groups) {
      const box = g.box ? `${g.box[0]},${g.box[1]} ${g.box[2] - g.box[0]}x${g.box[3] - g.box[1]}` : "no change";
      const what = g.n === 1 ? g.first : `${[...g.ops].join("/")} x${g.n}`;
      out.push(`  ${(g.loc.replace(/^.*[\\/]/, "") || "-").padEnd(20)} ${what.length > 60 ? what.slice(0, 59) + "…" : what.padEnd(60)} ${box}`);
    }
    out.push("");
  }

  if (keys.length) {
    out.push("PLACED (symbol, asset @ layer, size, count: top-left positions; drawing order = depth, later is in front):");
    for (const k of keys) {
      const ps = byKey.get(k)!, [n, layer] = k.split("@"), pos = ps.slice(0, 12).map((p) => `${p.x},${p.y}`).join(" ");
      out.push(`  ${sym.get(k)} ${n}${layer ? " @" + layer : ""} ${ps[0].w}x${ps[0].h} x${ps.length}: ${pos}${ps.length > 12 ? ` …+${ps.length - 12}` : ""}`);
    }
    out.push("");
  }

  // the cell maps
  const cw = Math.ceil(W / C), ch = Math.ceil(H / C);
  const map = (title: string, cellChar: (x0: number, y0: number) => string) => {
    out.push(title);
    out.push("    " + Array.from({ length: cw }, (_, i) => String(Math.floor((i * C) / 100) % 10)).join("") + "  (x / 100)");
    out.push("    " + Array.from({ length: cw }, (_, i) => String(Math.floor((i * C) / 10) % 10)).join("") + "  (x / 10)");
    for (let cy = 0; cy < ch; cy++) {
      let row = String(cy * C).padStart(3) + " ";
      for (let cx = 0; cx < cw; cx++) row += cellChar(cx * C, cy * C);
      out.push(row);
    }
    out.push("");
  };
  const cells = (x0: number, y0: number, f: (i: number) => void) => {
    for (let y = y0; y < Math.min(H, y0 + C); y++) for (let x = x0; x < Math.min(W, x0 + C); x++) f(y * W + x);
  };
  if (keys.length)
    map(`ON TOP (each cell: the placement owning most of its ${C}x${C} px, if a quarter or more; "." = only the painted background):`, (x0, y0) => {
      const n = new Map<string, number>();
      let total = 0;
      cells(x0, y0, (i) => { total++; if (owner[i] >= 0) { const k = kOf(owner[i]); n.set(k, (n.get(k) ?? 0) + 1); } });
      let best = "", most = 0;
      for (const [k, v] of n) if (v > most) { most = v; best = k; }
      return most * 4 >= total ? sym.get(best)! : ".";
    });
  map(`COLOR (each cell: its most common palette key before lighting):`, (x0, y0) => {
    const n = new Map<Color, number>();
    cells(x0, y0, (i) => n.set(unlit.data[i], (n.get(unlit.data[i]) ?? 0) + 1));
    let best: Color = TRANSPARENT, most = -1;
    for (const [c, v] of n) if (v > most) { most = v; best = c; }
    return key(best);
  });
  const used = new Map<Color, number>();
  for (const c of unlit.data) used.set(c, (used.get(c) ?? 0) + 1);
  const listed = [...used].sort((a, b) => b[1] - a[1]).filter(([c]) => key(c) !== "~");
  out.push("  keys: " + listed.map(([c]) => `${key(c)}=${c === TRANSPARENT ? "clear" : toHex(c)}`).join(" ") + (listed.length < used.size ? "  ~=blended, outside the palette" : ""));
  out.push("");
  if (unlit !== img)
    map(`LIGHT (each cell: brightness after lighting, 0 black .. 9 white):`, (x0, y0) => {
      let s = 0, n = 0;
      cells(x0, y0, (i) => { s += img.data[i] === TRANSPARENT ? 0 : lum(img.data[i]); n++; });
      return digit(s / n);
    });

  // how each placement stands out: brightness of the pixels it still owns vs a 2 px ring around them
  if (keys.length) {
    out.push("STANDS OUT (per placement after lighting: its body tone, the 75th percentile of what shows of it, / the median of the 2 px around it, 0..9; visible px):");
    const ring = (i: number) => {
      const p = b.placements[i];
      const inL: number[] = [], outL: number[] = [];
      for (let y = p.y - 2; y < p.y + p.h + 2; y++)
        for (let x = p.x - 2; x < p.x + p.w + 2; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const j = y * W + x, l = lum(img.data[j]);
          if (owner[j] === i) { inL.push(l); continue; }
          let near = false;
          for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) {
            const X = x + dx, Y = y + dy;
            if (X >= 0 && Y >= 0 && X < W && Y < H && owner[Y * W + X] === i) near = true;
          }
          if (near) outL.push(l);
        }
      const q = (a: number[], f: number) => a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * f))];
      return inL.length ? `${digit(q(inL, 0.75))}/${outL.length ? digit(q(outL, 0.5)) : "-"} ${inL.length}px` : "hidden";
    };
    for (const k of keys) {
      const idx = b.placements.map((p, i) => [p, i] as const).filter(([p]) => `${p.name}@${p.layer ?? ""}` === k).map(([, i]) => i);
      if (idx.length > 6) continue;   // brushes and strings of lights: many small copies
      out.push(`  ${sym.get(k)} ${k.replace(/@$/, "")}: ${idx.map(ring).join(", ")}`);
    }
    out.push("");
  }

  // a plain image (no build behind it): what repeats is found in the pixels, tile by tile
  if (!b.trace && !b.placements.length) {
    const T = opts.tile ?? 16, tw = Math.ceil(W / T), th = Math.ceil(H / T), ids = new Map<string, number>(), first: [number, number][] = [];
    const rows: string[] = [];
    let empty = 0;
    for (let ty = 0; ty < th; ty++) {
      let row = String(ty * T).padStart(3) + " ";
      for (let tx = 0; tx < tw; tx++) {
        const t = img.sub(tx * T, ty * T, T, T);
        if (t.data.every((c) => c === TRANSPARENT)) { row += "."; empty++; continue; }
        const h = t.hash();
        if (!ids.has(h)) { ids.set(h, ids.size); first.push([tx * T, ty * T]); }
        row += SYMBOLS[ids.get(h)!] ?? "~";
      }
      rows.push(row);
    }
    const filled = tw * th - empty;
    out.push(`TILES (${T}x${T} grid: each symbol is one distinct tile; ${ids.size} distinct of ${filled} filled${ids.size > SYMBOLS.length ? `, "~" = past the ${SYMBOLS.length}th` : ""}):`);
    out.push("    " + Array.from({ length: tw }, (_, i) => String(Math.floor((i * T) / 100) % 10)).join("") + "  (x / 100)");
    out.push("    " + Array.from({ length: tw }, (_, i) => String(Math.floor((i * T) / 10) % 10)).join("") + "  (x / 10)");
    out.push(...rows);
    out.push("  first seen at (for --at x,y," + T + "," + T + "): " + first.slice(0, SYMBOLS.length).map(([x, y], i) => `${SYMBOLS[i]} ${x},${y}`).join("  "));
    out.push("");
  }

  if (opts.at) {
    const [x0, y0, w, h] = opts.at;
    out.push(`PIXELS ${x0},${y0} ${w}x${h} (palette keys before lighting):`);
    out.push("    " + Array.from({ length: w }, (_, i) => ((x0 + i) % 10 === 0 ? String(Math.floor((x0 + i) / 10) % 10) : " ")).join(""));
    out.push("    " + Array.from({ length: w }, (_, i) => String((x0 + i) % 10)).join(""));
    for (let y = y0; y < Math.min(H, y0 + h); y++) {
      let row = String(y).padStart(3) + " ";
      for (let x = x0; x < Math.min(W, x0 + w); x++) row += key(unlit.data[y * W + x]);
      out.push(row);
    }
  }
  return out.join("\n");
}
