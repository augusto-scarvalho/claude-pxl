// Colors are packed 0xRRGGBBAA unsigned integers. 0 is fully transparent.
export type Color = number;

export const TRANSPARENT: Color = 0;

export function pack(r: number, g: number, b: number, a = 255): Color {
  return (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
}

export function channels(c: Color): [number, number, number, number] {
  return [(c >>> 24) & 255, (c >>> 16) & 255, (c >>> 8) & 255, c & 255];
}

/** "#rgb", "#rgba", "#rrggbb", "#rrggbbaa" (leading # optional). */
export function parseHex(s: string): Color | undefined {
  let h = s.startsWith("#") ? s.slice(1) : s;
  if (!/^[0-9a-fA-F]+$/.test(h)) return undefined;
  if (h.length === 3 || h.length === 4) h = h.replace(/./g, (d) => d + d);
  if (h.length === 6) h += "ff";
  if (h.length !== 8) return undefined;
  const c = parseInt(h, 16) >>> 0;
  return (c & 255) === 0 ? TRANSPARENT : c;
}

export function toHex(c: Color): string {
  const [r, g, b, a] = channels(c);
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b) + (a === 255 ? "" : h(a));
}

/** Darken toward black by k (0..1); result is opaque. */
export function darken(c: Color, k: number): Color {
  const [r, g, b] = channels(c);
  return pack(r * (1 - k), g * (1 - k), b * (1 - k));
}

/**
 * `n` shades of `base`, dark to light, with `base` itself at index `at`. Darker shades turn their
 * hue toward blue-violet and lighter ones toward yellow, up to `hue` degrees at the ends (hue
 * shifting: shadows get cooler, highlights warmer, instead of only darker and lighter). By default the
 * darks gain a little saturation and the lights lose some toward white; `sat` instead makes the lights
 * that much more saturated at the end and the darks that much less (Saint11's ramps: `sat: 0.3`).
 */
export function shadeRamp(base: Color, n: number, at: number, hue = 20, sat?: number): Color[] {
  const [r, g, b] = channels(base), [h, s, l] = rgbToHsl(r, g, b);
  const toward = (target: number, amount: number) => {
    const diff = ((target - h + 540) % 360) - 180;
    return (h + Math.sign(diff) * Math.min(Math.abs(diff), amount) + 360) % 360;
  };
  return Array.from({ length: n }, (_, i) => {
    if (i === at) return base;
    const dark = i < at, k = dark ? (at - i) / at : (i - at) / (n - 1 - at);
    const L = dark ? l - l * 0.6 * k : l + (1 - l) * 0.55 * k;
    const S = Math.min(1, Math.max(0, sat === undefined ? (dark ? s * (1 + 0.1 * k) : s * (1 - 0.35 * k)) : s * (1 + (dark ? -sat : sat) * k)));
    return pack(...hslToRgb(toward(dark ? 250 : 60, hue * k), S, L));
  });
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v + m)) * 255)) as [number, number, number];
}

/** OKLab (perceptual): distances between colors read like what the eye sees. */
export const oklab = (c: Color): [number, number, number] => {
  const f = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const r = f((c >>> 24) & 255), g = f((c >>> 16) & 255), b = f((c >>> 8) & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
