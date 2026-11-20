// Glow: pixels of the given keys spill a halo onto the opaque pixels around them (flames, potions,
// moons, neon). Colour mode screens the source colour on top, which leaves the palette like
// lighting() does; ramp mode steps neighbours lighter along the ramps instead and stays in it.
import { type Color, TRANSPARENT, channels, pack } from "./color.ts";
import { PxError } from "./errors.ts";
import { Img } from "./image.ts";
import type { GlowOpts } from "./model.ts";
import type { Palette } from "./palette.ts";
import { bayer, colorList, regionPred } from "./util.ts";

/**
 * Return `img` with a halo around every pixel whose color is one of `keys` (keys or colors, or a 3D
 * material's: its ramp, what surface() drew it in). `keyed` gives each pixel's palette color when `img`
 * has left the palette (lit by lighting()); defaults to img.
 */
export function applyGlow(img: Img, keys: string | string[] | { ramp: string | string[] }, o: GlowOpts, pal: Palette, keyed: Uint32Array = img.data): Img {
  const src = new Set<Color>();
  for (const k of colorList(typeof keys === "object" && !Array.isArray(keys) ? keys.ramp : keys)) {
    const c = pal.resolve(k);
    if (c !== null && c !== TRANSPARENT) src.add(c);
  }
  // keys the halo leaves as drawn: what the glowing thing is made of (the logs and stones under the
  // flames), so its own shapes don't wash out
  const kept = new Set<Color>();
  for (const k of o.keep === undefined ? [] : colorList(o.keep)) {
    const c = pal.resolve(k);
    if (c === null || c === TRANSPARENT) throw new PxError(`glow keep: '${k}' must be a visible palette key`);
    kept.add(c);
  }
  const r = o.r ?? 6;
  if (!(r > 0)) throw new PxError(`glow r must be > 0, got ${r}`);
  const K = o.pixel ?? 1;
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`glow pixel must be a whole number >= 1, got ${JSON.stringify(o.pixel)}`);
  const inside = o.where === undefined ? undefined : regionPred(o.where);
  const strength = o.strength ?? 0.5, bands = Math.max(0, Math.floor(o.bands ?? 0));
  let tint: Color | undefined;
  if (o.color !== undefined) {
    const c = pal.resolve(o.color);
    if (c === null || c === TRANSPARENT) throw new PxError(`glow color must be a visible color, got '${o.color}'`);
    tint = c;
  }

  // Precompute the circular falloff kernel once (avoids Math.hypot / Math.pow in the inner loop).
  const { w, h, data } = img;
  const gw = K > 1 ? Math.ceil(w / K) : w, gh = K > 1 ? Math.ceil(h / K) : h;
  const R = Math.ceil(r);
  const kdx: number[] = [], kdy: number[] = [], kf: number[] = [];
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      let f = (1 - d / (r + 1)) ** 2;
      if (bands) f = Math.ceil(f * bands) / bands;
      kdx.push(dx); kdy.push(dy); kf.push(f);
    }
  const kn = kf.length;

  // Resolve source color per art-pixel cell (when K > 1, sample the block's center pixel),
  // then skip strictly interior cells surrounded on all 4 sides by the exact same effective glow color:
  // since glow takes the per-pixel max, interior cells are strictly dominated by their border neighbors.
  const cellSrc = new Uint32Array(gw * gh); // 0 = not glowing, else effective Color (tint ?? c)
  const singleColor = tint !== undefined || src.size === 1;
  const [tr, tg, tb] = tint !== undefined ? channels(tint) : src.size === 1 ? channels([...src][0]) : [0, 0, 0];
  for (let gy = 0; gy < gh; gy++) {
    const sy = Math.min(h - 1, gy * K + (K >> 1));
    for (let gx = 0; gx < gw; gx++) {
      const sx = Math.min(w - 1, gx * K + (K >> 1));
      const c = keyed[sy * w + sx];
      if (!src.has(c) || (inside && !inside(sx, sy))) continue;
      cellSrc[gy * gw + gx] = tint ?? c;
    }
  }

  // Strongest contribution per cell (max, like lamps), weight falling off as (1 - d/r)^2.
  const weight = new Float32Array(gw * gh);
  const rgb = singleColor ? undefined : new Float32Array(gw * gh * 3);
  for (let gy = 0; gy < gh; gy++) {
    const row = gy * gw;
    for (let gx = 0; gx < gw; gx++) {
      const eff = cellSrc[row + gx];
      if (!eff) continue;
      // Interior skip: if all 4 cardinal neighbors carry the exact same effective glow color,
      // every pixel other than (gx, gy) itself is closer to at least one neighbor, so this cell
      // cannot win max anywhere else (still record its own cell for mixed K > 1 blocks).
      if (gx > 0 && gx < gw - 1 && gy > 0 && gy < gh - 1 &&
        cellSrc[row + gx - 1] === eff && cellSrc[row + gx + 1] === eff &&
        cellSrc[row - gw + gx] === eff && cellSrc[row + gw + gx] === eff) {
        const i = row + gx;
        weight[i] = 1;
        if (!singleColor) {
          const o3 = i * 3, cr = eff >>> 24, cg = (eff >>> 16) & 255, cb = (eff >>> 8) & 255;
          if (cr > rgb![o3]) rgb![o3] = cr;
          if (cg > rgb![o3 + 1]) rgb![o3 + 1] = cg;
          if (cb > rgb![o3 + 2]) rgb![o3 + 2] = cb;
        }
        continue;
      }
      if (singleColor) {
        for (let k = 0; k < kn; k++) {
          const x = gx + kdx[k], y = gy + kdy[k];
          if (x < 0 || x >= gw || y < 0 || y >= gh) continue;
          const i = y * gw + x, f = kf[k];
          if (f > weight[i]) weight[i] = f;
        }
      } else {
        const cr = eff >>> 24, cg = (eff >>> 16) & 255, cb = (eff >>> 8) & 255;
        for (let k = 0; k < kn; k++) {
          const x = gx + kdx[k], y = gy + kdy[k];
          if (x < 0 || x >= gw || y < 0 || y >= gh) continue;
          const i = y * gw + x, f = kf[k];
          if (f > weight[i]) weight[i] = f;
          const o3 = i * 3, fr = f * cr, fg = f * cg, fb = f * cb;
          if (fr > rgb![o3]) rgb![o3] = fr;
          if (fg > rgb![o3 + 1]) rgb![o3 + 1] = fg;
          if (fb > rgb![o3 + 2]) rgb![o3 + 2] = fb;
        }
      }
    }
  }

  const out = img.copy();
  const steps = o.ramp;
  const up = steps ? pal.stepMap(1) : undefined;
  for (let py = 0; py < h; py++) {
    const gy = K > 1 ? Math.floor(py / K) : py, grow = gy * gw, prow = py * w;
    for (let px = 0; px < w; px++) {
      const i = prow + px, c = data[i];
      if (c === TRANSPARENT || src.has(keyed[i]) || kept.has(keyed[i])) continue;
      const gi = grow + (K > 1 ? Math.floor(px / K) : px), wt = weight[gi];
      if (wt === 0) continue;
      if (up) {
        // Whole steps near the source, ordered dither on the fractional step: crisp, in palette.
        const s = wt * steps!, n = Math.floor(s) + (bayer(K > 1 ? Math.floor(px / K) : px, gy) < s - Math.floor(s) ? 1 : 0);
        let v = c;
        for (let m = 0; m < n; m++) v = up.get(v) ?? v;
        out.data[i] = v;
        continue;
      }
      // Screen blend: brightens toward the glow color without ever overshooting white.
      const [br, bg, bb, a] = channels(c);
      const gr = singleColor ? wt * tr : rgb![gi * 3], gg = singleColor ? wt * tg : rgb![gi * 3 + 1], gb = singleColor ? wt * tb : rgb![gi * 3 + 2];
      const scr = (b: number, g: number) => 255 - ((255 - b) * (255 - Math.min(255, g * strength))) / 255;
      out.data[i] = pack(byte(scr(br, gr)), byte(scr(bg, gg)), byte(scr(bb, gb)), a);
    }
  }
  return out;
}

function byte(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}
