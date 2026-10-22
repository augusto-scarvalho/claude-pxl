// Sheets: a picture of many sprites apart on a clear or flat ground (a game's ripped sheet, an artist's
// set of frames, a tileset laid out with gaps) taken apart into its sprites and measured, for what a
// study of the game's art wants to know: how big its figures are, how many frames a move has, how many
// colors a sprite gets, how far apart they were laid out. Labels (the ripper's text) and the boxes
// drawn round frames are told apart and left out.
import { type Color, TRANSPARENT } from "./color.ts";
import type { Img } from "./image.ts";

export interface Box { x0: number; y0: number; x1: number; y1: number; n: number; colors: number }
export interface SheetRead { sprites: Box[]; rows: Box[][]; labels: number; boxes: number; ground: Color }

const W = (b: Box) => b.x1 - b.x0 + 1, H = (b: Box) => b.y1 - b.y0 + 1;

/** The sprites of a sheet, or null when the picture isn't one (one picture, not many things apart). */
export function sliceSheet(img: Img, ground: Color | null): SheetRead | null {
  const { w, h } = img, n = w * h;
  const bg = ground ?? TRANSPARENT, empty = (c: Color) => (ground === null ? (c & 255) < 128 : c === ground);
  if (ground === null && !img.data.some((c) => (c & 255) < 128)) return null;
  // what isn't ground, in 8-connected pieces
  const label = new Int32Array(n).fill(-1), parts: Box[] = [], stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (label[s] >= 0 || empty(img.data[s])) continue;
    const id = parts.length, colors = new Set<Color>(), b: Box = { x0: w, y0: h, x1: -1, y1: -1, n: 0, colors: 0 };
    label[s] = id; stack.push(s);
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i - x) / w;
      b.n++; colors.add(img.data[i]);
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          const j = yy * w + xx;
          if (label[j] < 0 && !empty(img.data[j])) { label[j] = id; stack.push(j); }
        }
    }
    b.colors = colors.size;
    parts.push(b);
  }
  if (parts.length < 4) return null;
  // boxes drawn round frames: a frame of 1 px lines, its inside empty
  const box = (b: Box) => W(b) >= 8 && H(b) >= 8 && b.n <= 2 * (W(b) + H(b)) + 4 && b.colors <= 2;
  // labels: small marks of a color or two, several side by side on one line (letters)
  const small = (b: Box) => H(b) <= 9 && W(b) <= 9 && b.colors <= 2;
  const letter = (b: Box) => small(b) && parts.filter((o) => o !== b && small(o) && Math.abs(o.y1 - b.y1) <= 2 && Math.min(Math.abs(o.x0 - b.x1), Math.abs(b.x0 - o.x1)) <= 3).length >= 1;
  let labels = 0, boxes = 0;
  const kept = parts.filter((b) => (box(b) ? (boxes++, false) : letter(b) ? (labels++, false) : true));
  // a part inside another's box, or a few stray pixels at its edge, is that sprite's (a blade's
  // smear, a strand of hair, a dust puff under the feet)
  kept.sort((a, b) => b.n - a.n);
  const sprites: Box[] = [];
  for (const b of kept) {
    const host = sprites.find((s) => (b.x0 >= s.x0 && b.x1 <= s.x1 && b.y0 >= s.y0 && b.y1 <= s.y1) || (b.n <= 4 && b.x0 <= s.x1 + 2 && b.x1 >= s.x0 - 2 && b.y0 <= s.y1 + 2 && b.y1 >= s.y0 - 2));
    if (host) { host.x0 = Math.min(host.x0, b.x0); host.y0 = Math.min(host.y0, b.y0); host.x1 = Math.max(host.x1, b.x1); host.y1 = Math.max(host.y1, b.y1); host.n += b.n; host.colors = Math.max(host.colors, b.colors); }
    else sprites.push({ ...b });
  }
  const real = sprites.filter((s) => s.n >= 12);
  if (real.length < 4 || Math.max(...real.map((s) => W(s) * H(s))) > 0.5 * n) return null;
  // rows: sprites whose spans of rows overlap the row's first sprite's middle, left to right
  real.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows: Box[][] = [];
  for (const s of real) {
    const row = rows.find((r) => { const m = (r[0].y0 + r[0].y1) / 2; return s.y0 <= m && s.y1 >= m; });
    if (row) row.push(s); else rows.push([s]);
  }
  for (const r of rows) r.sort((a, b) => a.x0 - b.x0);
  return { sprites: real, rows, labels, boxes, ground: bg };
}

/** Groups of numbers no more than `gap` apart (and within 15% of each other), each [low, high, count]. */
function bands(vs: number[], gap = 2): [number, number, number][] {
  const s = [...vs].sort((a, b) => a - b), out: [number, number, number][] = [];
  for (const v of s) {
    const last = out[out.length - 1];
    if (last && v - last[1] <= gap && v <= last[0] * 1.15 + gap) { last[1] = v; last[2]++; } else out.push([v, v, 1]);
  }
  return out.sort((a, b) => b[2] - a[2]);
}
const span = (lo: number, hi: number) => (lo === hi ? `${lo}` : `${lo}-${hi}`);
const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];

/** The report's lines on a sheet: its sprites' sizes, rows, spacing and colors, and how to lay one out in pxl. */
export function sheetLines(r: SheetRead, colorsAll: number): { lines: string[]; pxl: string[] } {
  const { sprites, rows } = r, lines: string[] = [], pxl: string[] = [];
  const left = [r.labels ? `${r.labels} label mark${r.labels === 1 ? "" : "s"} (text)` : "", r.boxes ? `${r.boxes} box${r.boxes === 1 ? "" : "es"} drawn round frames` : ""].filter(Boolean);
  lines.push(`  ${sprites.length} sprites apart on ${r.ground === TRANSPARENT ? "clear" : "a flat ground"}, in ${rows.length} row${rows.length === 1 ? "" : "s"}${left.length ? `; ${left.join(" and ")} left out` : ""}.`);
  // sizes: by height first (a figure's), each with its widths
  const hs = bands(sprites.map(H)).slice(0, 4).map(([lo, hi, k]) => {
    const ws = sprites.filter((s) => H(s) >= lo && H(s) <= hi).map(W);
    return `${k} of ${span(Math.min(...ws), Math.max(...ws))} x ${span(lo, hi)}`;
  });
  lines.push(`  Sizes (their ink, w x h): ${hs.join("; ")}${bands(sprites.map(H)).length > 4 ? "; ..." : ""}. Height: median ${median(sprites.map(H))} px, the tallest ${Math.max(...sprites.map(H))}.`);
  // rows: how many in each, and whether a row's sprites are one size (an animation's frames, a move to a row)
  const same = rows.filter((row) => row.length >= 2 && Math.max(...row.map(H)) - Math.min(...row.map(H)) <= 3 && Math.max(...row.map(W)) - Math.min(...row.map(W)) <= 6);
  const counts = rows.map((row) => row.length);
  lines.push(`  Rows, top down: ${counts.slice(0, 16).join(", ")}${counts.length > 16 ? ", ..." : ""}${same.length >= rows.length / 2 ? `; in ${same.length} of them the sprites are one size within a few px: a move to a row, its frames (median ${median(same.map((row) => row.length))})` : ""}.`);
  // spacing: the gap to the next sprite in a row, and between rows
  const gx = rows.flatMap((row) => row.slice(1).map((s, i) => s.x0 - row[i].x1 - 1)).filter((g) => g >= 0);
  const gy = rows.slice(1).map((row, i) => Math.min(...row.map((s) => s.y0)) - Math.max(...rows[i].map((s) => s.y1)) - 1).filter((g) => g >= 0);
  if (gx.length) lines.push(`  Spacing: ${median(gx)} px between sprites in a row (median)${gy.length ? `, ${median(gy)} px between rows` : ""}.`);
  const cs = sprites.map((s) => s.colors);
  lines.push(`  Colors: ${span(Math.min(...cs), Math.max(...cs))} to a sprite (median ${median(cs)}), ${colorsAll} in the whole sheet.`);
  pxl.push(`A figure ${median(sprites.map(H))} px tall (its ink), the frames of a move side by side: sheet(name, ["move_*"], { pad: ${gx.length ? Math.min(4, median(gx)) : 1}, rows: "tag" }) lays out the same.`);
  return { lines, pxl };
}
