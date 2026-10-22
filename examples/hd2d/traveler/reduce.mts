// Two passes of a 3D render (regions in flat colors, light alone) brought down 4x to pixel art: each
// pixel takes the region most of its 4x4 block shows and a tone of that region's ramp by how lit the
// block is (cel shading: hard steps, no blends), clear where most of the block is.
import { readFileSync, readdirSync } from "node:fs";
import { decodePng } from "../../../src/node/png.ts";
import { writePng } from "../../../src/node/output.ts";
import { Img } from "../../../src/core/image.ts";
// node reduce.mts <renders dir> <out dir>: each <name>_flat.png with its <name>_light.png to <name>.png
const [dir, outDir] = process.argv.slice(2), K = 4;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const pack = ([r, g, b]: number[]) => (((r << 24) | (g << 16) | (b << 8) | 255) >>> 0);
// the regions' flat colors (as rendered) and each one's ramp, dark to light, with the light at which
// each next tone starts (0..1 of the frame's own range of light)
const REG: Record<string, { flat: string; ramp: string[]; at: number[] }> = {
  skin: { flat: "#ff0000", ramp: ["#9c5b45", "#d2966f", "#f0c79e"], at: [0.35, 0.62] },
  hair: { flat: "#00ff00", ramp: ["#24110b", "#4a2716", "#7d4a2a", "#c9934f"], at: [0.3, 0.5, 0.78] },
  cloak: { flat: "#0000ff", ramp: ["#1c2e27", "#30503d", "#4c7652", "#77a068"], at: [0.28, 0.5, 0.78] },
  tunic: { flat: "#ffff00", ramp: ["#6f5c4a", "#a68f6c", "#d8c69e"], at: [0.4, 0.72] },
  sleeve: { flat: "#ff00ff", ramp: ["#6f5c4a", "#a68f6c", "#d8c69e"], at: [0.4, 0.7] },
  trousers: { flat: "#00ffff", ramp: ["#2e2b3c", "#423f53", "#66637a"], at: [0.35, 0.65] },
  boots: { flat: "#ff8000", ramp: ["#2e1a10", "#4b2e1e", "#83542f"], at: [0.35, 0.65] },
  belt: { flat: "#8000ff", ramp: ["#2e1a10", "#4b2e1e", "#83542f"], at: [0.45, 0.8] },
};
const names = Object.keys(REG), flats = names.map((n) => hex(REG[n].flat));
const nearest = (c: number) => {
  const r = c >>> 24, g = (c >>> 16) & 255, b = (c >>> 8) & 255;
  let best = 0, bd = 1e9;
  flats.forEach(([R, G, B], i) => { const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
};
const lum = (c: number) => (0.3 * (c >>> 24) + 0.59 * ((c >>> 16) & 255) + 0.11 * ((c >>> 8) & 255)) / 255;
for (const f of readdirSync(dir).filter((f) => f.endsWith("_flat.png"))) {
  const flat = decodePng(readFileSync(`${dir}/${f}`)), light = decodePng(readFileSync(`${dir}/${f.replace("_flat", "_light")}`));
  const w = flat.w / K, h = flat.h / K, out = new Img(w, h), region = new Int8Array(w * h).fill(-1);
  // the frame's range of light, over its visible pixels
  const ls: number[] = [];
  for (let i = 0; i < flat.data.length; i++) if ((flat.data[i] & 255) >= 128) ls.push(lum(light.data[i]));
  ls.sort((a, b) => a - b);
  const lo = ls[Math.floor(ls.length * 0.04)], hi = ls[Math.floor(ls.length * 0.97)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const count = new Array(names.length).fill(0), sum = new Array(names.length).fill(0);
    let seen = 0;
    for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
      const q = (y * K + j) * flat.w + x * K + i, c = flat.data[q];
      if ((c & 255) < 128) continue;
      seen++;
      const r = nearest(c); count[r]++; sum[r] += lum(light.data[q]);
    }
    if (seen < 7) continue;
    const r = count.indexOf(Math.max(...count)), t = (sum[r] / count[r] - lo) / Math.max(1e-6, hi - lo), R = REG[names[r]];
    out.set(x, y, pack(hex(R.ramp[R.at.filter((a) => t >= a).length]))); region[y * w + x] = r;
  }
  // the head: its top row and middle (the hair's), then cleared from the base (a head drawn by hand
  // goes there); printed for the figure's file
  const hairKeys = new Set(REG.hair.ramp.map((c) => pack(hex(c)))), skinKeys = new Set(REG.skin.ramp.map((c) => pack(hex(c))))
  let top = -1, xs: number[] = []
  for (let y = 0; y < h && top < 0; y++) for (let x = 0; x < w; x++) if (hairKeys.has(out.get(x, y))) { top = y; break }
  for (let y = top; y < top + 6; y++) for (let x = 0; x < w; x++) if (hairKeys.has(out.get(x, y))) xs.push(x)
  const body: number[] = []
  const TUNIC = names.indexOf("tunic"), BELT = names.indexOf("belt")
  for (let y = top + 11; y < top + 22; y++) for (let x = 0; x < w; x++) if (region[y * w + x] === TUNIC || region[y * w + x] === BELT) body.push(x)
  // seen from behind the cloak hides the tunic: the whole body under the head then
  if (body.length < 6) for (let y = top + 11; y < top + 14; y++) for (let x = 0; x < w; x++) if (region[y * w + x] >= 0 && !hairKeys.has(out.get(x, y))) body.push(x)
  const mid = body.length ? Math.round((Math.min(...body) + Math.max(...body)) / 2) : xs.length ? Math.round((Math.min(...xs) + Math.max(...xs)) / 2) : w / 2
  for (let y = 0; y < top + 11; y++) for (let x = 0; x < w; x++) { const c = out.get(x, y); if (hairKeys.has(c) || skinKeys.has(c)) out.set(x, y, 0) }
  console.log(f.replace("_flat.png", ""), top, mid)
  writePng(`${outDir}/${f.replace("_flat", "")}`, out);
}
console.log("ok");
