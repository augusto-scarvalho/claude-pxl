// Terraria-style lighting: light spreads over a grid of cells from lamps (and the sky). Open cells
// cost a fixed amount (so `r` is the reach); solid cells keep only a fraction of what enters,
// so brighter light reaches deeper into blocks while their interiors still go dark. The result
// multiplies the image's RGB. Pixels with normals (bump / normals) are shaded by the direction each
// light comes from: facing it brightens, facing away darkens, flat stays as without normals.
import { type Color, TRANSPARENT, channels, pack } from "./color.ts";
import { PxError } from "./errors.ts";
import { Img, type Lamp } from "./image.ts";
import type { LightingOpts } from "./model.ts";
import type { Palette } from "./palette.ts";
import { colorList } from "./util.ts";

export interface LightResult {
  /** The lit image. */
  img: Img;
  /** Light per pixel as an image (for the viewer / debugging). */
  map: Img;
}

/** Per-pixel masks (1 = set): solid blocks light, wall stops sky light, unlit ignores lighting. */
export interface LightMasks {
  solid: Uint8Array;
  wall: Uint8Array;
  unlit?: Uint8Array;
}

/** Light `img`; lamps are in image pixel coordinates. */
export function applyLighting(img: Img, masks: LightMasks, lamps: Lamp[], o: LightingOpts, pal: Palette): LightResult {
  const { solid, wall, unlit } = masks;
  const cell = Math.max(1, Math.floor(o.cell ?? 4));
  const gw = Math.ceil(img.w / cell), gh = Math.ceil(img.h / cell), n = gw * gh;
  // `block` is the loss per 8px (one Terraria tile), so depth doesn't change with the cell size.
  const keep = (1 - Math.min(0.999, clamp01(o.block ?? 0.4))) ** (cell / 8);
  const diag = (o.shape ?? "round") === "round";

  // Per-cell solidity (majority of the cell's pixels) and wall coverage.
  const solidCell = new Uint8Array(n), wallCell = new Uint8Array(n);
  for (let cy = 0; cy < gh; cy++)
    for (let cx = 0; cx < gw; cx++) {
      let s = 0, w = 0, t = 0;
      for (let y = cy * cell; y < Math.min(img.h, (cy + 1) * cell); y++)
        for (let x = cx * cell; x < Math.min(img.w, (cx + 1) * cell); x++) {
          const i = y * img.w + x;
          s += solid[i];
          w += wall[i];
          t++;
        }
      solidCell[cy * gw + cx] = s * 2 >= t ? 1 : 0;
      wallCell[cy * gw + cx] = w * 2 >= t ? 1 : 0;
    }

  // Light per cell, RGB in 0..(power), combined by max like Terraria.
  const L = new Float32Array(n * 3);
  // Normal-mapped images keep every source separately: each pixel needs the light's direction.
  const relief = img.norm ? Math.max(0, o.relief ?? 1) : 0;
  const sources: { f: Float32Array; rgb: [number, number, number]; dir: (x: number, y: number) => [number, number, number] }[] = [];
  const mix = (field: Float64Array, rgb: [number, number, number], dir: (x: number, y: number) => [number, number, number]) => {
    const eased = relief ? new Float32Array(n) : undefined;
    for (let i = 0; i < n; i++) {
      if (field[i] <= 0) continue;
      const f = field[i], v = f >= 1 ? f : 1 - (1 - f) ** 2; // ease-out: rooms stay bright, edges fall off fast
      if (eased) eased[i] = v;
      for (let k = 0; k < 3; k++) L[i * 3 + k] = Math.max(L[i * 3 + k], v * rgb[k]);
    }
    if (eased) sources.push({ f: eased, rgb, dir });
  };
  const rgbOf = (c: Color, k = 1): [number, number, number] => {
    const [r, g, b] = channels(c);
    return [(r / 255) * k, (g / 255) * k, (b / 255) * k];
  };
  const color = (spec: string | undefined, what: string): Color => {
    const c = pal.resolve(spec ?? "#fff");
    if (c === null || c === TRANSPARENT) throw new PxError(`lighting: ${what} must be a visible color, got '${spec}'`);
    return c;
  };

  for (const l of lamps) {
    const cx = Math.floor(l.x / cell), cy = Math.floor(l.y / cell);
    if (cx < 0 || cy < 0 || cx >= gw || cy >= gh) continue;
    const field = spread(gw, gh, solidCell, [cy * gw + cx], l.power, cell / l.r, keep, diag);
    mix(field, rgbOf(l.color), (x, y) => unit(l.x - x, l.y - y, l.z ?? 8));
  }

  const sky = o.sky ?? 0;
  if (sky > 0) {
    // Cells open to the sky: from the top of each column down to the first solid or wall cell.
    const open: number[] = [];
    for (let cx = 0; cx < gw; cx++)
      for (let cy = 0; cy < gh; cy++) {
        const i = cy * gw + cx;
        if (solidCell[i] || wallCell[i]) break;
        open.push(i);
      }
    if (open.length) {
      const field = spread(gw, gh, solidCell, open, sky, cell / (o.skyReach ?? 24), keep, diag);
      // where the sky light comes from, on screen (y down), as `light` is everywhere else
      const [sx, sy] = o.skyDir ?? [0, -1], sd = unit(sx, sy, 1);
      mix(field, rgbOf(color(o.skyColor, "skyColor")), () => sd);
    }
  }

  const amb = o.ambient ?? 0;
  const a = amb > 0 ? rgbOf(color(o.ambientColor, "ambientColor"), amb) : [0, 0, 0];
  if (amb > 0) for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) L[i * 3 + k] = Math.max(L[i * 3 + k], a[k]);

  // Per-pixel value of a cell array (stride values per cell): blocky or bilinear between cell centers.
  const sample = (arr: Float32Array, stride: number, x: number, y: number, k: number): number => {
    if (!o.smooth) return arr[(Math.floor(y / cell) * gw + Math.floor(x / cell)) * stride + k];
    const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / cell - 0.5)), fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / cell - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const g = (cx: number, cy: number) => arr[(cy * gw + cx) * stride + k];
    return (g(x0, y0) * (1 - tx) + g(x1, y0) * tx) * (1 - ty) + (g(x0, y1) * (1 - tx) + g(x1, y1) * tx) * ty;
  };
  const at = (x: number, y: number, k: number) => sample(L, 3, x, y, k);

  // Light on a normal-mapped pixel: each source scaled by how much the surface faces it, relative
  // to a flat surface (so flat normals match unmapped art); ambient is directionless.
  const nm = img.norm, lit: [number, number, number] = [0, 0, 0];
  const shaded = (x: number, y: number, i: number): [number, number, number] => {
    const nx = nm![i * 3] / 127, ny = nm![i * 3 + 1] / 127, nz = nm![i * 3 + 2] / 127;
    lit[0] = a[0]; lit[1] = a[1]; lit[2] = a[2];
    for (const s of sources) {
      const v = sample(s.f, 1, x, y, 0);
      if (v <= 0) continue;
      const [dx, dy, dz] = s.dir(x + 0.5, y + 0.5);
      const f = v * Math.max(0, 1 + relief * (Math.max(0, nx * dx + ny * dy + nz * dz) - dz));
      for (let k = 0; k < 3; k++) lit[k] = Math.max(lit[k], f * s.rgb[k]);
    }
    return lit;
  };

  const emit = new Set<Color>();
  for (const k of colorList(o.emit ?? "")) {
    const c = pal.resolve(k);
    if (c !== null) emit.add(c);
  }

  const out = new Img(img.w, img.h), map = new Img(img.w, img.h);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      const [lr, lg, lb] = relief && nm![i * 3 + 2] > 0 ? shaded(x, y, i) : [at(x, y, 0), at(x, y, 1), at(x, y, 2)];
      map.data[i] = pack(byte(lr * 255), byte(lg * 255), byte(lb * 255));
      const c = img.data[i];
      if (c === TRANSPARENT || emit.has(c) || unlit?.[i]) {
        out.data[i] = c;
        continue;
      }
      const [r, g, b, a] = channels(c);
      out.data[i] = pack(byte(r * lr), byte(g * lg), byte(b * lb), a);
    }
  return { img: out, map };
}

/**
 * Max-intensity spread from `sources` (each at `start`): stepping into an open cell costs `air`,
 * a solid cell keeps only `keep` of the light (so bright light reaches deeper); light below 0.02 stops; diagonals count √2× and can't squeeze between two
 * solid cells. Every step is monotone, so Dijkstra (max-first, binary heap) is exact.
 */
function spread(gw: number, gh: number, solid: Uint8Array, sources: number[], start: number, air: number, keep: number, diag: boolean): Float64Array {
  const best = new Float64Array(gw * gh);
  const heap = new MaxHeap();
  for (const s of sources) {
    best[s] = start;
    heap.push(s, start);
  }
  const dirs = diag
    ? [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]]
    : [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];
  while (heap.size) {
    const [i, v] = heap.pop();
    if (v < best[i]) continue;
    const x = i % gw, y = (i - x) / gw;
    for (const [dx, dy, k] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      if (dx && dy && solid[y * gw + nx] && solid[ny * gw + x]) continue;
      const j = ny * gw + nx;
      // Solid cells lose a share of the light, but never less than open space would.
      const nv = solid[j] ? Math.min(v * (k === 1 ? keep : keep ** k), v - air * k) : v - air * k;
      if (nv > best[j] && nv > 0.02) {
        best[j] = nv;
        heap.push(j, nv);
      }
    }
  }
  return best;
}

class MaxHeap {
  private ids: number[] = [];
  private vals: number[] = [];
  get size(): number { return this.ids.length; }

  push(id: number, v: number): void {
    const { ids, vals } = this;
    let i = ids.length;
    ids.push(id);
    vals.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (vals[p] >= v) break;
      ids[i] = ids[p]; vals[i] = vals[p];
      i = p;
    }
    ids[i] = id; vals[i] = v;
  }

  pop(): [number, number] {
    const { ids, vals } = this;
    const top: [number, number] = [ids[0], vals[0]];
    const id = ids.pop()!, v = vals.pop()!;
    if (ids.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mv = v;
        if (l < ids.length && vals[l] > mv) { m = l; mv = vals[l]; }
        if (r < ids.length && vals[r] > mv) m = r;
        if (m === i) break;
        ids[i] = ids[m]; vals[i] = vals[m];
        i = m;
      }
      ids[i] = id; vals[i] = v;
    }
    return top;
  }
}

function unit(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function byte(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}
