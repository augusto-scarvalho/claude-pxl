// Sheets: a picture of many sprites apart on a clear or flat ground (a game's ripped sheet, an artist's
// set of frames, a tileset laid out with gaps) taken apart into its sprites and measured, for what a
// study of the game's art wants to know: how big its figures are, how many frames a move has, how many
// colors a sprite gets, how far apart they were laid out. Labels (the ripper's text) and the boxes
// drawn round frames are told apart and left out.
import { type Color, TRANSPARENT } from "./color.ts";
import type { Img } from "./image.ts";

export interface Box { x0: number; y0: number; x1: number; y1: number; n: number; colors: number; /** the share of its commonest color */ main?: number; /** its pixels, as drawn and mirrored */ hash?: number; flipped?: number }
export interface SheetRead { sprites: Box[]; rows: Box[][]; labels: number; boxes: number; masks: number; ground: Color; /** every color taken for ground */ grounds: Set<Color> }

const W = (b: Box) => b.x1 - b.x0 + 1, H = (b: Box) => b.y1 - b.y0 + 1;

/** The sprites of a sheet, or null when the picture isn't one (one picture, not many things apart). */
export function sliceSheet(img: Img, ground: Color | null): SheetRead | null {
  const { w, h } = img, n = w * h;
  // the ground: what is clear, the flat color given, and any color covering an eighth of the sheet by
  // itself in one great field, a twenty-fifth of it unbroken (a ripper's panels and the color between
  // them; no sprite's color is that much of a sheet, and a tight sheet's outline, as common, is in bits)
  const counts = new Map<Color, number>();
  let see = 0;
  for (const c of img.data) if ((c & 255) >= 128) { counts.set(c, (counts.get(c) ?? 0) + 1); see++; }
  const field = (col: Color) => {
    const seen = new Uint8Array(n), st: number[] = [];
    let best = 0;
    for (let s = 0; s < n; s++) {
      if (seen[s] || img.data[s] !== col) continue;
      let k = 0;
      seen[s] = 1; st.push(s);
      while (st.length) {
        const i = st.pop()!, x = i % w;
        k++;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && !seen[j] && img.data[j] === col) { seen[j] = 1; st.push(j); }
      }
      if (k > best) best = k;
    }
    return best;
  };
  const clear = see < n, grounds = new Set([...counts].filter(([, k]) => k >= 0.12 * n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c).filter((c) => field(c) >= 0.04 * n));
  if (ground !== null) grounds.add(ground);
  if (!clear && !grounds.size) return null;
  const empty = (c: Color) => (c & 255) < 128 || grounds.has(c), bg = ground ?? (clear ? TRANSPARENT : [...grounds][0]);
  // what isn't ground, in 8-connected pieces
  const label = new Int32Array(n).fill(-1), parts: Box[] = [], stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (label[s] >= 0 || empty(img.data[s])) continue;
    const id = parts.length, colors = new Map<Color, number>(), b: Box = { x0: w, y0: h, x1: -1, y1: -1, n: 0, colors: 0 };
    label[s] = id; stack.push(s);
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i - x) / w;
      b.n++; colors.set(img.data[i], (colors.get(img.data[i]) ?? 0) + 1);
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          const j = yy * w + xx;
          if (label[j] < 0 && !empty(img.data[j])) { label[j] = id; stack.push(j); }
        }
    }
    b.colors = colors.size;
    // (with what is that color at a lower strength: a compressed texture fades a mask's edge toward
    // the dark ground, through tones of the one hue)
    const top = [...colors].reduce((a, c) => (c[1] > a[1] ? c : a))[0], T = [top >>> 24, (top >>> 16) & 255, (top >>> 8) & 255];
    const shade = (c: Color) => {
      const C = [c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255], t = (C[0] + C[1] + C[2]) / Math.max(1, T[0] + T[1] + T[2]);
      return t <= 1.05 && Math.abs(C[0] - t * T[0]) + Math.abs(C[1] - t * T[1]) + Math.abs(C[2] - t * T[2]) <= 24;
    };
    b.main = [...colors].reduce((s, [c, k]) => s + (shade(c) ? k : 0), 0) / b.n;
    parts.push(b);
  }
  if (parts.length < 4) return null;
  // boxes drawn round frames: a frame of 1 px lines, its inside empty
  const box = (b: Box) => W(b) >= 8 && H(b) >= 8 && b.n <= 2 * (W(b) + H(b)) + 4 && b.colors <= 2;
  // labels: small marks of a color or two, several side by side on one line (letters)
  const small = (b: Box) => H(b) <= 9 && W(b) <= 9 && b.colors <= 2;
  const letter = (b: Box) => small(b) && parts.filter((o) => o !== b && small(o) && Math.abs(o.y1 - b.y1) <= 2 && Math.min(Math.abs(o.x0 - b.x1), Math.abs(b.x0 - o.x1)) <= 3).length >= 1;
  // silhouettes in one color (a mask of where each sprite is: for its shadow, a material), but for a
  // compressed texture's few stray tones at the edge: not art to measure
  const mask = (b: Box) => (b.main ?? 0) >= 0.95 && W(b) >= 6 && H(b) >= 6 && b.n >= 24;
  let labels = 0, boxes = 0, masks = 0;
  const kept = parts.filter((b) => (box(b) ? (boxes++, false) : letter(b) ? (labels++, false) : mask(b) ? (masks++, false) : true));
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
  // each one's pixels hashed as drawn and mirrored: a sprite another's mirror image is the same drawing turned
  for (const b of real) {
    let a = 2166136261, f = 2166136261;
    for (let y = b.y0; y <= b.y1; y++) for (let x = 0; x <= b.x1 - b.x0; x++) {
      const p = img.data[y * w + b.x0 + x], q = img.data[y * w + b.x1 - x];
      a = Math.imul(a ^ (empty(p) ? 0 : p), 16777619); f = Math.imul(f ^ (empty(q) ? 0 : q), 16777619);
    }
    b.hash = a >>> 0; b.flipped = f >>> 0;
  }
  // rows: sprites whose spans of rows overlap the row's first sprite's middle, left to right
  real.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows: Box[][] = [];
  for (const s of real) {
    const row = rows.find((r) => { const m = (r[0].y0 + r[0].y1) / 2; return s.y0 <= m && s.y1 >= m; });
    if (row) row.push(s); else rows.push([s]);
  }
  for (const r of rows) r.sort((a, b) => a.x0 - b.x0);
  return { sprites: real, rows, labels, boxes, masks, ground: bg, grounds };
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
  const left = [r.labels ? `${r.labels} label mark${r.labels === 1 ? "" : "s"} (text)` : "", r.boxes ? `${r.boxes} box${r.boxes === 1 ? "" : "es"} drawn round frames` : "", r.masks ? `${r.masks} one-color silhouette${r.masks === 1 ? "" : "s"} (masks of where each sprite is)` : ""].filter(Boolean);
  lines.push(`  ${sprites.length} sprites apart on ${r.ground === TRANSPARENT ? "clear" : "a flat ground"}, in ${rows.length} row${rows.length === 1 ? "" : "s"}${left.length ? `; ${left.join(" and ")} left out` : ""}.`);
  // sizes: by height first (a figure's), each with its widths
  const hs = bands(sprites.map(H)).slice(0, 4).map(([lo, hi, k]) => {
    const ws = sprites.filter((s) => H(s) >= lo && H(s) <= hi).map(W);
    return `${k} of ${span(Math.min(...ws), Math.max(...ws))} x ${span(lo, hi)}`;
  });
  lines.push(`  Sizes (their ink, w x h): ${hs.join("; ")}${bands(sprites.map(H)).length > 4 ? "; ..." : ""}. Height: median ${median(sprites.map(H))} px, the tallest ${Math.max(...sprites.map(H))}.`);
  // whole figures and parts: the commonest height among the tall ones is a figure's; what is under half
  // of it, in numbers, is pieces to build frames from (heads, arms, weapons), as FFT builds its frames
  // (the tallest height common enough: a quarter as many as the commonest; a few big things, a tree
  // or a panel, aren't the figure)
  const hb = bands(sprites.map(H)), figure = hb.filter(([, , k]) => k >= 0.25 * hb[0][2]).sort((a, b) => b[1] - a[1])[0];
  const small = figure ? sprites.filter((s) => H(s) < 0.5 * figure[0]) : [];
  const tiles = small.filter((s) => W(s) % 8 === 0 && H(s) % 8 === 0).length >= 0.6 * small.length;
  const upright = figure ? median(sprites.filter((s) => H(s) >= figure[0] && H(s) <= figure[1]).map((s) => H(s) / W(s))) >= 1.2 : false;
  const parts = upright && !tiles ? small.length : 0;
  const tileset = tiles && small.length >= 0.4 * sprites.length;
  if (tileset) {
    const size = new Map<string, number>();
    for (const t of small) { const k = `${W(t)}x${H(t)}`; size.set(k, (size.get(k) ?? 0) + 1); }
    lines.push(`  Tiles: ${small.length} of them cut on an 8 px grid, most ${[...size].sort((a, b) => b[1] - a[1])[0][0]}: a tileset, its pieces laid out apart.`);
  }
  if (figure && parts >= 0.4 * sprites.length && figure[2] >= 3)
    lines.push(`  Parts: ${parts} of them are under half a figure's height (${span(figure[0], figure[1])} px, ${figure[2]} whole figures): pieces drawn apart, to build frames from (heads, arms, weapons at offsets: FFT's way, its SHP cropping pieces of the sheet, its SEQ timing the frames) or laid over them (effects, shadows).`);
  // mirror images: drawn both ways, or one way and flipped when played
  const asym = sprites.filter((s) => s.hash !== s.flipped), drawn = new Set(sprites.map((s) => s.hash)), pairs = asym.filter((s) => drawn.has(s.flipped)).length;
  if (asym.length >= 4) lines.push(pairs >= 2 ? `  Mirrors: ${pairs} of its ${asym.length} sprites that aren't symmetric have their mirror image here too: drawn both ways.` : `  Mirrors: none of its ${asym.length} sprites that aren't symmetric has its mirror image here: a side drawn one way, the other flipped when played.`);
  // rows: how many in each, and whether a row's sprites are one size (an animation's frames, a move to a row)
  const same = rows.filter((row) => row.length >= 2 && Math.max(...row.map(H)) - Math.min(...row.map(H)) <= 3 && Math.max(...row.map(W)) - Math.min(...row.map(W)) <= 6);
  const counts = rows.map((row) => row.length);
  lines.push(`  Rows, top down: ${counts.slice(0, 16).join(", ")}${counts.length > 16 ? ", ..." : ""}${same.length >= rows.length / 2 && !tileset ? `; in ${same.length} of them the sprites are one size within a few px: a move to a row, its frames (median ${median(same.map((row) => row.length))})` : ""}.`);
  // spacing: the gap to the next sprite in a row, and between rows
  const gx = rows.flatMap((row) => row.slice(1).map((s, i) => s.x0 - row[i].x1 - 1)).filter((g) => g >= 0);
  const gy = rows.slice(1).map((row, i) => Math.min(...row.map((s) => s.y0)) - Math.max(...rows[i].map((s) => s.y1)) - 1).filter((g) => g >= 0);
  if (gx.length) lines.push(`  Spacing: ${median(gx)} px between sprites in a row (median)${gy.length ? `, ${median(gy)} px between rows` : ""}.`);
  const cs = sprites.map((s) => s.colors);
  lines.push(`  Colors: ${span(Math.min(...cs), Math.max(...cs))} to a sprite (median ${median(cs)}), ${colorsAll} in the whole sheet.`);
  const tall = figure && parts >= 0.4 * sprites.length ? figure[1] : median(sprites.map(H));
  pxl.push(`A figure ${tall} px tall (its ink), the frames of a move side by side: sheet(name, ["move_*"], { pad: ${gx.length ? Math.min(4, median(gx)) : 1}, rows: "tag" }) lays out the same.`);
  if (figure && parts >= 0.4 * sprites.length) pxl.push(`Frames from parts: each part a sprite, each frame an anim frame() stamping them at their offsets (or a rig with them in its slots).`);
  if (asym.length >= 4 && pairs < 2) pxl.push(`One side drawn: the other is stamp(..., { flip: "x" }), or twin: "name_l" for a sprite lit from one side.`);
  return { lines, pxl };
}
