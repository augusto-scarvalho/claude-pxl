// Normal maps: per-pixel surface directions that make lighting() rake across relief (bricks,
// domes, bevels) instead of lighting everything flat. Generated from shape (bump) or painted
// with numpad direction grids (normals); stored on the image (Img.norm) so they travel with it.
import { TRANSPARENT, oklab, pack } from "./color.ts";
import { PxError } from "./errors.ts";
import { Img } from "./image.ts";
import type { BumpOpts } from "./model.ts";

/** Write normal (nx, ny, nz) (any length, ny pointing down) for pixel i; nz is kept >= ~0. */
export function setNormal(n: Int8Array, i: number, nx: number, ny: number, nz: number): void {
  const len = Math.hypot(nx, ny, nz) || 1;
  n[i * 3] = Math.round((nx / len) * 127);
  n[i * 3 + 1] = Math.round((ny / len) * 127);
  n[i * 3 + 2] = Math.max(1, Math.round((nz / len) * 127)); // 0 is "no normal"
}

/**
 * Numpad directions for normals() grids: the way the surface faces. 8 = up, 3 = down-right,
 * 5 = straight at the viewer; lowercase-style softer tilts use the shifted row (q w e / a s d / z x c).
 */
const DIRS: Record<string, [number, number, number]> = {};
const steep = 1, soft = 0.4;
for (const [keys, t] of [["789456123", steep], ["qweasdzxc", soft]] as const)
  [...keys].forEach((ch, k) => {
    const dx = (k % 3) - 1, dy = Math.floor(k / 3) - 1;
    DIRS[ch] = [dx * t, dy * t, 1];
  });

/** Normal for a direction grid char, null = skip ("." / space), "none" = clear ("0"). */
export function dirOf(ch: string): [number, number, number] | null | "none" {
  if (ch === "." || ch === " ") return null;
  if (ch === "0") return "none";
  const d = DIRS[ch];
  if (!d) throw new PxError(`normals: unknown direction '${ch}' (numpad 1-9 steep, qweasdzxc soft, 0 clears, . skips)`);
  return d;
}

/**
 * Generate normals over `mask` pixels from a height field:
 * - "bevel": edges slope down over `w` px, flat top (bricks, panels, buttons)
 * - "dome": each connected blob bulges like a pillow / sphere (barrels, fruit, rocks)
 * - "luma": brighter = higher, from the art's own shading (hand-shaded sprites)
 * - "hybrid": the silhouette's volume plus the painting's shading (see hybrid())
 * Pixels outside the mask (and outside the image) count as height 0 for bevel/dome.
 */
export function bump(img: Img, mask: Uint8Array, o: BumpOpts): void {
  const { w, h } = img, n = w * h;
  const shape = o.shape ?? "dome", depth = o.depth ?? 1;
  if (shape === "hybrid") return hybrid(img, mask, o);
  const own = HYBRID_OPTS.filter((k) => o[k] !== undefined);
  if (own.length) throw new PxError(`bump: ${own.join(", ")} only shape "hybrid" reads; "${shape}" ignores it`);
  const ht = new Float32Array(n);
  if (shape === "luma") {
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      const c = img.data[i];
      ht[i] = (0.3 * (c >>> 24) + 0.59 * ((c >>> 16) & 255) + 0.11 * ((c >>> 8) & 255)) / 255 * 4;
    }
  } else if (shape === "bevel" || shape === "dome") {
    const d = distance(mask, w, h);
    if (shape === "bevel") {
      const bw = Math.max(1, o.w ?? 2);
      for (let i = 0; i < n; i++) ht[i] = Math.min(d[i], bw);
    } else {
      // Per blob: a circular profile over its own deepest distance.
      const blob = new Int32Array(n).fill(-1), peak: number[] = [];
      for (let s = 0; s < n; s++) {
        if (!mask[s] || blob[s] >= 0) continue;
        const id = peak.length, stack = [s];
        let top = 0;
        blob[s] = id;
        while (stack.length) {
          const i = stack.pop()!, x = i % w;
          top = Math.max(top, d[i]);
          for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
            if (j >= 0 && j < n && mask[j] && blob[j] < 0) { blob[j] = id; stack.push(j); }
        }
        peak.push(top);
      }
      for (let i = 0; i < n; i++) {
        if (!mask[i]) continue;
        const R = peak[blob[i]], t = 1 - d[i] / (R + 0.5);
        ht[i] = (R + 0.5) * Math.sqrt(Math.max(0, 1 - t * t));
      }
    }
  } else throw new PxError(`bump shape must be "bevel", "dome", "luma" or "hybrid", got '${shape}'`);

  const nm = img.normals();
  const at = (x: number, y: number, i: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return shape === "luma" ? ht[i] : 0;
    const j = y * w + x;
    return mask[j] ? ht[j] : shape === "luma" ? ht[i] : 0;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const gx = (at(x + 1, y, i) - at(x - 1, y, i)) / 2, gy = (at(x, y + 1, i) - at(x, y - 1, i)) / 2;
      setNormal(nm, i, -gx * depth, -gy * depth, 1);
    }
}

/** Chamfer distance (1, √2) from each mask pixel to the nearest non-mask pixel or the border. */
function distance(mask: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h), D = Math.SQRT2;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 1e9 : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i]) d[i] = Math.min(d[i], get(x - 1, y) + 1, get(x, y - 1) + 1, get(x - 1, y - 1) + D, get(x + 1, y - 1) + D);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i]) d[i] = Math.min(d[i], get(x + 1, y) + 1, get(x, y + 1) + 1, get(x + 1, y + 1) + D, get(x - 1, y + 1) + D);
    }
  return d;
}

/** What only "hybrid" reads: [default, min, max], Sprite Fusion's. */
const HYBRID: Record<string, [number, number, number]> = {
  shapeRadius: [4, 0.5, 512], shapeStrength: [1.15, 0, 8], shapeSoftness: [1.15, 0, 8], detailStrength: [6, 0, 8], detailScale: [0.6, 0.6, 8],
};
const HYBRID_OPTS = Object.keys(HYBRID) as (keyof BumpOpts)[];

/**
 * The way Sprite Fusion's sprite normals makes them (github.com/Hugo-Dz/spritefusion-sprite-normals,
 * MIT, read at d14b067), written again here with its settings and defaults, so a map made here
 * matches one made there to within a level (pxl keeps normals in 8 bits). Each 8-connected island
 * apart, in a field padded so no blur reaches a neighbour: a volume rising from the edge (the exact
 * distance in, eased by a log so it levels off past `shapeRadius`, blurred by `shapeSoftness`), plus
 * the shading (Oklab lightness about its middle, blurred by opacity at `detailScale` and twice that)
 * times `detailStrength`; Sobel slopes steepened by `depth` (its normal strength).
 */
function hybrid(img: Img, mask: Uint8Array, o: BumpOpts): void {
  const v: Record<string, number> = {};
  for (const [k, [def, lo, hi]] of Object.entries(HYBRID)) {
    const x = (o as Record<string, unknown>)[k] ?? def;
    if (typeof x !== "number" || !(x >= lo && x <= hi)) throw new PxError(`bump hybrid: ${k} must be between ${lo} and ${hi}, got ${x}`);
    v[k] = x;
  }
  const depth = o.depth ?? 1.5;
  if (!(depth >= 0 && depth <= 8)) throw new PxError(`bump hybrid: depth must be between 0 and 8, got ${depth}`);
  const { w } = img, nm = img.normals(), pad = Math.ceil(3 * Math.max(v.shapeSoftness, 2 * v.detailScale)) + 3;
  // a pixel of 3% opacity or less is no surface (Sprite Fusion's alpha threshold)
  const solid = mask.map((m, i) => (m && (img.data[i] & 255) > 0.03 * 255 ? 1 : 0));
  for (const part of islands(solid, w, img.h)) {
    let x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0;
    for (const i of part) {
      const x = i % w, y = (i - x) / w;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const W = x1 - x0 + 1 + 2 * pad, H = y1 - y0 + 1 + 2 * pad, N = W * H;
    const at = (i: number) => ((i - (i % w)) / w - y0 + pad) * W + (i % w) - x0 + pad;
    const inside = new Uint8Array(N), alpha = new Float64Array(N), lum = new Float64Array(N);
    let lo = 1, hi = 0;
    for (const i of part) {
      const j = at(i), c = img.data[i];
      inside[j] = 1; alpha[j] = (c & 255) / 255; lum[j] = oklab(c)[0];
      lo = Math.min(lo, lum[j]); hi = Math.max(hi, lum[j]);
    }
    // a height the same everywhere has no slope: centring it keeps flat art clear of rounding noise
    for (const i of part) lum[at(i)] -= (lo + hi) / 2;
    const f = edt(inside, W, H), R = v.shapeRadius;
    for (let j = 0; j < N; j++) f[j] = v.shapeStrength * R * Math.log1p(Math.max(0, f[j] - 0.5) / R);
    const field = blur(f, W, H, v.shapeSoftness), fine = blurBy(lum, alpha, W, H, v.detailScale), broad = blurBy(lum, alpha, W, H, 2 * v.detailScale);
    for (let j = 0; j < N; j++) field[j] += v.detailStrength * (0.7 * fine[j] + 0.3 * broad[j]);
    for (const i of part) {
      const j = at(i), F = field;
      const gx = (F[j - W + 1] + 2 * F[j + 1] + F[j + W + 1] - F[j - W - 1] - 2 * F[j - 1] - F[j + W - 1]) / 8;
      const gy = (F[j + W - 1] + 2 * F[j + W] + F[j + W + 1] - F[j - W - 1] - 2 * F[j - W] - F[j - W + 1]) / 8;
      setNormal(nm, i, -gx * depth, -gy * depth, 1);
    }
  }
}

/** Each 8-connected island of `m` (a diagonal pixel-art stroke stays one), as its pixels' indices. */
function islands(m: Uint8Array, w: number, h: number): number[][] {
  const seen = new Uint8Array(m.length), out: number[][] = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || seen[s]) continue;
    const part = [s];
    seen[s] = 1;
    for (let k = 0; k < part.length; k++) {
      const x = part[k] % w, y = (part[k] - x) / w;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          const j = yy * w + xx;
          if (m[j] && !seen[j]) { seen[j] = 1; part.push(j); }
        }
    }
    out.push(part);
  }
  return out;
}

/**
 * Exact distance from each pixel to the nearest one outside `inside` (Felzenszwalb and Huttenlocher,
 * "Distance transforms of sampled functions", 2012): the lower envelope of parabolas along each row,
 * then along each column. A row or column with nothing outside reads far (1e10).
 */
export function edt(inside: Uint8Array, w: number, h: number): Float64Array {
  const out = new Float64Array(w * h), n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const line = (len: number) => {
    const cut = (q: number, p: number) => (f[q] + q * q - f[p] - p * p) / (2 * (q - p));
    let k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < len; q++) {
      let s = cut(q, v[k]);
      while (s <= z[k]) s = cut(q, v[--k]);
      v[++k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = inside[y * w + x] ? 1e20 : 0;
    line(w);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = out[y * w + x];
    line(h);
    for (let y = 0; y < h; y++) out[y * w + x] = Math.sqrt(d[y]);
  }
  return out;
}

/** Gaussian blur, rows then columns, nothing past the edges; under 0.05 px, a copy. */
export function blur(src: Float64Array, w: number, h: number, sigma: number): Float64Array {
  if (sigma < 0.05) return src.slice();
  const r = Math.ceil(3 * sigma), k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let t = -r; t <= r; t++) sum += k[t + r] = Math.exp(-0.5 * (t / sigma) ** 2);
  for (let t = 0; t < k.length; t++) k[t] /= sum;
  const rows = new Float64Array(w * h), out = new Float64Array(w * h);
  // sparse: a bloom's bright part is a few spots, so only the columns near what isn't 0 in a row are
  // summed, and only the rows near a row that isn't all 0 (the sums skipped are all 0: the same result)
  const busy = new Int32Array(h + 1);
  let x0 = w, x1 = -1;
  for (let y = 0; y < h; y++) {
    let a = w, b = -1;
    for (let x = 0; x < w; x++) if (src[y * w + x] !== 0) { if (a === w) a = x; b = x; }
    busy[y + 1] = busy[y] + (b >= 0 ? 1 : 0);
    if (b < 0) continue;
    a = Math.max(0, a - r); b = Math.min(w - 1, b + r);
    x0 = Math.min(x0, a); x1 = Math.max(x1, b);
    for (let x = a; x <= b; x++) {
      let s = 0;
      for (let t = Math.max(-r, -x); t <= Math.min(r, w - 1 - x); t++) s += k[t + r] * src[y * w + x + t];
      rows[y * w + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    if (busy[Math.min(h, y + r + 1)] === busy[Math.max(0, y - r)]) continue;
    for (let x = x0; x <= x1; x++) {
      let a = 0;
      for (let t = Math.max(-r, -y); t <= Math.min(r, h - 1 - y); t++) a += k[t + r] * rows[(y + t) * w + x];
      out[y * w + x] = a;
    }
  }
  return out;
}

/** Blurred in proportion to `weight`: what has none (transparent, hidden) adds nothing. */
function blurBy(src: Float64Array, weight: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const num = blur(src.map((x, i) => x * weight[i]), w, h, sigma), den = blur(weight, w, h, sigma);
  for (let i = 0; i < num.length; i++) num[i] /= Math.max(den[i], 1e-8);
  return num;
}

/**
 * A normal map's PNG (decoded) read onto `img` as data: RGB = normal * 0.5 + 0.5, green pointing up
 * (OpenGL's: normalImage()'s, Sprite Fusion's), its y flipped once to pxl's (down); each made unit
 * length unless it already is to within its 8 bits (so a map pxl wrote comes back exactly); none
 * where the map or the art is clear. The two the same size.
 */
export function readNormals(img: Img, map: Img, file: string): void {
  if (map.w !== img.w || map.h !== img.h) throw new PxError(`normals: '${file}' is ${map.w}x${map.h} and the png ${img.w}x${img.h}: a normal map is laid out as its art`);
  const n = img.normals(), v = (b: number) => (b / 255) * 2 - 1;
  for (let i = 0; i < img.data.length; i++) {
    const c = map.data[i];
    if (!(c & 255) || !(img.data[i] & 255)) continue;
    const x = v(c >>> 24), y = -v((c >>> 16) & 255), z = v((c >>> 8) & 255), q = [x, y, z].map((t) => Math.round(t * 127));
    // (three roundings of half a level at most move its length by √3 / 2)
    if (q[2] >= 1 && Math.abs(Math.hypot(q[0], q[1], q[2]) - 127) <= 0.87) n.set(q, i * 3);
    else setNormal(n, i, x, y, z);
  }
}

/**
 * The normal map as an image in the common game-engine encoding (Godot, Unity, LDtk...), the one
 * Sprite Fusion writes: RGB = normal * 0.5 + 0.5 with green pointing up, flat (128, 128, 255) where
 * none was set, and the art's own alpha (a transparent pixel is flat and clear).
 */
export function normalImage(img: Img): Img {
  const out = new Img(img.w, img.h), n = img.norm;
  const b = (v: number) => Math.min(255, Math.max(0, Math.round((v * 0.5 + 0.5) * 255)));
  for (let i = 0; i < img.data.length; i++) {
    const a = img.data[i] & 255, has = a > 0 && n && n[i * 3 + 2] > 0;
    const nx = has ? n![i * 3] / 127 : 0, ny = has ? n![i * 3 + 1] / 127 : 0, nz = has ? n![i * 3 + 2] / 127 : 1;
    out.data[i] = pack(b(nx), b(-ny), b(nz), a);
  }
  return out;
}

/** Does any pixel give light (Img.emit, effect("emit"), a spell's glow)? */
export const glows = (img: Img): boolean => !!img.emit?.some((v) => v > 0);

/**
 * What gives light as an image for an engine, beside the art and its normal map: R = G = B = how
 * much each pixel glows (Img.emit, 0 to 255), black where nothing does, the art's own alpha.
 */
export function emitImage(img: Img): Img {
  const out = new Img(img.w, img.h), e = img.emit;
  for (let i = 0; i < img.data.length; i++) {
    const v = e ? e[i] : 0;
    out.data[i] = pack(v, v, v, img.data[i] & 255);
  }
  return out;
}
