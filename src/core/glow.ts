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
 * Return `img` with a halo around every pixel whose color is one of `keys`. `keyed` gives each
 * pixel's palette color when `img` has left the palette (lit by lighting()); defaults to img.
 */
export function applyGlow(img: Img, keys: string | string[], o: GlowOpts, pal: Palette, keyed: Uint32Array = img.data): Img {
  const src = new Set<Color>();
  for (const k of colorList(keys)) {
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
  const inside = o.where === undefined ? undefined : regionPred(o.where)
  const strength = o.strength ?? 0.5, bands = Math.max(0, Math.floor(o.bands ?? 0));
  let tint: Color | undefined;
  if (o.color !== undefined) {
    const c = pal.resolve(o.color);
    if (c === null || c === TRANSPARENT) throw new PxError(`glow color must be a visible color, got '${o.color}'`);
    tint = c;
  }

  // Strongest contribution per pixel (max, like lamps), weight falling off as (1 - d/r)^2.
  const { w, h, data } = img;
  const weight = new Float32Array(w * h), rgb = new Float32Array(w * h * 3);
  const R = Math.ceil(r);
  for (let sy = 0; sy < h; sy++)
    for (let sx = 0; sx < w; sx++) {
      const c = keyed[sy * w + sx];
      if (!src.has(c) || (inside && !inside(sx, sy))) continue;
      const [cr, cg, cb] = channels(tint ?? c);
      for (let y = Math.max(0, sy - R); y <= Math.min(h - 1, sy + R); y++)
        for (let x = Math.max(0, sx - R); x <= Math.min(w - 1, sx + R); x++) {
          const d = Math.hypot(x - sx, y - sy);
          if (d > r) continue;
          let f = (1 - d / (r + 1)) ** 2;
          if (bands) f = Math.ceil(f * bands) / bands;
          const i = y * w + x;
          if (f > weight[i]) weight[i] = f;
          rgb[i * 3] = Math.max(rgb[i * 3], f * cr);
          rgb[i * 3 + 1] = Math.max(rgb[i * 3 + 1], f * cg);
          rgb[i * 3 + 2] = Math.max(rgb[i * 3 + 2], f * cb);
        }
    }

  const out = img.copy();
  const steps = o.ramp;
  const up = steps ? pal.stepMap(1) : undefined;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c === TRANSPARENT || src.has(keyed[i]) || kept.has(keyed[i]) || weight[i] === 0) continue;
    if (up) {
      // Whole steps near the source, ordered dither on the fractional step: crisp, in palette.
      const s = weight[i] * steps!, x = i % w, y = (i - x) / w;
      let n = Math.floor(s) + (bayer(x, y) < s - Math.floor(s) ? 1 : 0), v = c;
      while (n-- > 0) v = up.get(v) ?? v;
      out.data[i] = v;
      continue;
    }
    // Screen blend: brightens toward the glow color without ever overshooting white.
    const [br, bg, bb, a] = channels(c);
    const scr = (b: number, g: number) => 255 - ((255 - b) * (255 - Math.min(255, g * strength))) / 255;
    out.data[i] = pack(byte(scr(br, rgb[i * 3])), byte(scr(bg, rgb[i * 3 + 1])), byte(scr(bb, rgb[i * 3 + 2])), a);
  }
  return out;
}

function byte(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}
