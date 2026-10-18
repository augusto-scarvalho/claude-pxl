// Assets as Aseprite files (.aseprite), so a person can keep editing what was drawn: its layers, its
// frames with their durations, a tag with the playback direction, the palette with its keys as
// color names, 9-slice margins and pivot as a slice. Format: Aseprite's docs/ase-file-specs.md.
// One way only: pxl never reads these back.
import { deflateSync } from "node:zlib";
import { type Color, TRANSPARENT } from "../core/color.ts";
import { Img } from "../core/image.ts";
import type { Project } from "../core/project.ts";

interface AseLayer {
  name: string;
  /** 1 visible, 2 editable, 64 reference. */
  flags: number;
  opacity: number;
  /** Where the layer's images sit on the canvas. */
  at: number;
  cels: Img[];
}

const VISIBLE = 3, HIDDEN = 2, REFERENCE = 67;
const DIRECTION = { forward: 0, reverse: 1, pingpong: 2 };

/**
 * The layers to write, frame by frame. Each pxl layer drawn as it is becomes a layer, over what it
 * was drawn on ("background"). What the asset changed on top of them (its outline, shade or light
 * layers, glow, lighting) goes to one layer over them, in the colors it left: the file shows the
 * built frames exactly. Blended and hidden layers come along hidden, reference layers as Aseprite
 * reference layers. Mirrors, flips, turns and crops move the art away from its layers: those assets
 * become one layer, and `flat` says why.
 */
function aseLayers(p: Project, name: string, frames: { t: number }[]): { layers: AseLayer[]; flat?: string } {
  const def = p.assets.get(name)!, builds = frames.map((f) => p.build(name, 0, f.t));
  const one = (flat?: string) => ({ layers: [{ name, flags: VISIBLE, opacity: 255, at: 0, cels: builds.map((b) => b.img) }], flat });
  const first = builds[0];
  if (!first.layers.length && !first.refs) return one();
  const moved = ["mx", "my", "flip", "rot", "angle", "crop"].filter((k) => def.opts[k as keyof typeof def.opts]);
  if (moved.length) return one(`${moved.join(", ")} moves the art away from its layers`);
  const d = def.opts.outline || def.opts.outline8 ? 1 : 0, names = first.layers.map((l) => l.name).join();
  const over: Img[] = [];
  let drawnOver = false;
  for (const b of builds) {
    if (b.layers.map((l) => l.name).join() !== names) return one("its layers differ between frames");
    const below = (b.under ?? new Img(b.img.w - 2 * d, b.img.h - 2 * d)).copy();
    for (const l of b.layers) if (!l.how) below.blit(l.img, 0, 0);
    // what the layers don't explain: drawn over them, or around them (an outline)
    const o = new Img(b.img.w, b.img.h);
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        const c = b.img.data[y * o.w + x], u = below.inside(x - d, y - d) ? below.get(x - d, y - d) : TRANSPARENT;
        if (c === u) continue;
        if (c === TRANSPARENT) return one(`pixels its layers drew were erased after them (${x}, ${y})`);
        o.data[y * o.w + x] = c;
        if (u !== TRANSPARENT) drawnOver = true;
      }
    over.push(o);
  }
  const layers: AseLayer[] = [];
  const add = (name: string, flags: number, at: number, cels: Img[], opacity = 255) => {
    if (cels.some((c) => c.data.some((v) => v !== TRANSPARENT))) layers.push({ name, flags, opacity, at, cels });
  };
  add("background", VISIBLE, d, builds.map((b) => b.under ?? new Img(1, 1)));
  first.layers.forEach((l, i) => add(l.name, l.how ? HIDDEN : VISIBLE, d, builds.map((b) => b.layers[i].img)));
  add(def.opts.outline || def.opts.outline8 ? (drawnOver ? "outline + effects" : "outline") : "effects", VISIBLE, 0, over);
  first.refs?.forEach((r, i) => add(r.name, REFERENCE, d, builds.map((b) => b.refs![i].img), Math.round(r.k * 255)));
  return { layers };
}

/** An asset (sprite, anim, scene) as an .aseprite file; `flat` says why it came out as one layer. */
export function encodeAseprite(p: Project, name: string): { data: Buffer; flat?: string } {
  const def = p.assets.get(name)!, b = p.build(name);
  const frames = !b.anim ? [{ ms: 100, t: 0 }] : def.kind === "anim" ? p.drawn(name) : p.frames(name);
  const { layers, flat } = aseLayers(p, name, frames);
  const img = b.img, w = img.w, h = img.h;
  const pal = def.pal.order.slice(0, 256).map((k) => ({ k, c: def.pal.keys.get(k)! }));

  const first: Buffer[] = [];
  first.push(chunk(0x2007, u16(1), u16(0), u32(0), zeros(8))); // sRGB
  if (pal.length)
    first.push(chunk(0x2019, u32(pal.length), u32(0), u32(pal.length - 1), zeros(8),
      ...pal.flatMap(({ k, c }) => [u16(1), rgba(c), str(k)])));
  for (const l of layers) first.push(chunk(0x2004, u16(l.flags), u16(0), u16(0), u16(0), u16(0), u16(0), u8(l.opacity), zeros(3), str(l.name)));
  if (def.kind === "anim")
    first.push(chunk(0x2018, u16(1), zeros(8), u16(0), u16(frames.length - 1), u8(DIRECTION[p.direction(name)]), u16(0), zeros(6), zeros(3), u8(0), str(name)));
  if (img.slice || img.pivot) {
    const [l, t, r, bm] = img.slice ?? [0, 0, 0, 0];
    first.push(chunk(0x2022, u32(1), u32((img.slice ? 1 : 0) | (img.pivot ? 2 : 0)), u32(0), str(name),
      u32(0), i32(0), i32(0), u32(w), u32(h),
      ...(img.slice ? [i32(l), i32(t), u32(w - l - r), u32(h - t - bm)] : []),
      ...(img.pivot ? [i32(Math.floor(img.pivot[0])), i32(Math.floor(img.pivot[1]))] : [])));
  }

  // Cels cropped to what they hold; a cel the same as an earlier frame's links to it.
  const seen = layers.map(() => new Map<string, number>());
  const body = frames.map((f, i) => {
    const chunks = i === 0 ? [...first] : [];
    layers.forEach((l, li) => {
      const box = l.cels[i].bounds();
      if (!box) return;
      const cel = l.cels[i].sub(box.x, box.y, box.w, box.h), x = l.at + box.x, y = l.at + box.y;
      const key = `${x},${y},${box.w},${box.h},${cel.hash()}`, linked = seen[li].get(key);
      const head = [u16(li), i16(x), i16(y), u8(255)];
      if (linked !== undefined) return chunks.push(chunk(0x2005, ...head, u16(1), i16(0), zeros(5), u16(linked)));
      seen[li].set(key, i);
      const raw = Buffer.alloc(cel.data.length * 4);
      cel.data.forEach((c, j) => raw.writeUInt32BE(c >>> 0, j * 4));
      chunks.push(chunk(0x2005, ...head, u16(2), i16(0), zeros(5), u16(cel.w), u16(cel.h), deflateSync(raw)));
    });
    const data = Buffer.concat(chunks);
    return Buffer.concat([u32(16 + data.length), u16(0xf1fa), u16(Math.min(chunks.length, 0xffff)), u16(f.ms), zeros(2), u32(chunks.length), data]);
  });
  const all = Buffer.concat(body);
  const head = Buffer.concat([u32(128 + all.length), u16(0xa5e0), u16(frames.length), u16(w), u16(h), u16(32), u32(1),
    u16(frames[0].ms), u32(0), u32(0), u8(0), zeros(3), u16(pal.length), u8(1), u8(1), i16(0), i16(0), u16(0), u16(0), zeros(84)]);
  return { data: Buffer.concat([head, all]), flat };
}

const num = (n: number, f: (b: Buffer) => void) => { const b = Buffer.alloc(n); f(b); return b; };
const u8 = (v: number) => Buffer.from([v & 255]);
const u16 = (v: number) => num(2, (b) => b.writeUInt16LE(v));
const i16 = (v: number) => num(2, (b) => b.writeInt16LE(v));
const u32 = (v: number) => num(4, (b) => b.writeUInt32LE(v));
const i32 = (v: number) => num(4, (b) => b.writeInt32LE(v));
const zeros = (n: number) => Buffer.alloc(n);
const rgba = (c: Color) => num(4, (b) => b.writeUInt32BE(c >>> 0));
const str = (s: string) => { const t = Buffer.from(s, "utf8"); return Buffer.concat([u16(t.length), t]); };
const chunk = (type: number, ...parts: Buffer[]) => { const data = Buffer.concat(parts); return Buffer.concat([u32(data.length + 6), u16(type), data]); };
