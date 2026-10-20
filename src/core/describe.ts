// A whole asset as text an agent can read at once (`pxl describe`). Objects first, with what a
// reader would otherwise work out by counting characters already worked out: where each one shows
// (inclusive x and y ranges), where its feet are, what covers it and what it covers, its nearest
// neighbours with the gap and the side, how it stands out after lighting (brightness and color)
// and how much it moves. Repeated small things (grass, bulbs) fold into one line each. Then cell
// maps for the layout (object on top, color, light), the painting steps grouped by source line,
// and a region's exact pixels on request (`at`). Object lists beat raw grids for models reading
// layout (ARC: LLMs and the Abstraction and Reasoning Corpus, arXiv 2305.18354).
import type { BuildOut } from "./build.ts";
import type { Placement } from "./canvas.ts";
import { type Color, TRANSPARENT, oklab, toHex } from "./color.ts";
import { Img, type Orient } from "./image.ts";
import type { World } from "./model.ts";
import { type Steps, dirWords, frontWords, lightWords, rampSteps } from "./checks.ts";
import type { Palette } from "./palette.ts";
import { replay } from "./steps.ts";

export interface DescribeOpts {
  /** Cell size of the maps, in px (default 8). */
  cell?: number;
  /** Also print the exact pixels (palette keys, before lighting) of this region: x, y, w, h. */
  at?: [number, number, number, number];
  /** Tile size for the repeats of a plain image (default 16). */
  tile?: number;
  /** The asset at each frame of its loop, for motion (same placements in the same order). */
  frames?: BuildOut[];
  /** What an earlier describe saw: CHANGES then says what is different now. */
  prev?: Snapshot;
  /** A line to print under the header (how the image was read). */
  note?: string;
  /** Busy scenes: one line per object (nearest neighbour only), no color and light maps, no steps. */
  brief?: boolean;
  /** Which frame of the loop `b` is (for the header). */
  frame?: number;
  /** The scene's world scale: objects with a real `height` get told how tall they should be. */
  world?: World;
  /** Lines to print under the header (a rig's slots). */
  extra?: string[];
}

/** What describe saw, kept to tell later what changed: objects by label, and the pixels. */
export interface Snapshot {
  objects: { label: string; x0: number; y0: number; x1: number; y1: number; n: number; hash: string }[];
  img: Img;
  unlit: Img;
}

const SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=?";
const lum = (c: Color) => (0.2126 * ((c >>> 24) & 255) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255)) / 255;
const digit = (v: number) => String(Math.max(0, Math.min(9, Math.floor(v * 10))));
const mean3 = (cs: Color[]): [number, number, number] => {
  const t = [0, 0, 0];
  for (const c of cs) { const o = oklab(c); t[0] += o[0]; t[1] += o[1]; t[2] += o[2]; }
  return [t[0] / cs.length, t[1] / cs.length, t[2] / cs.length];
};
/** Many copies of one small thing (a brush, a string of lights): one line, not one per copy. */
export const MANY = 6;

/** Degrees its top leans from straight up, clockwise (0 upright, 90 top to the right, 180 upside down). */
const tiltOf = (o: Orient) => Math.round((Math.atan2(o.u[0], -o.u[1]) * 180) / Math.PI);

/**
 * How a placed thing is turned, in words: where it faces, which way its top points, which of its
 * sides is toward us, and whether it is a mirror image. Picture space: x right, y down, z into the
 * picture, so a body's right is front x top; the side with z < 0 is the near one.
 */
export function orientWords(o: Orient): string {
  const w: string[] = [];
  if (o.f) {
    const [fx, fy, fz] = o.f;
    w.push(Math.abs(fz) > Math.max(Math.abs(fx), Math.abs(fy)) ? (fz < 0 ? "facing us" : "facing away")
      : Math.abs(fx) >= Math.abs(fy) ? `facing ${fx > 0 ? "right" : "left"}` : `facing ${fy > 0 ? "down" : "up"}`);
  }
  const t = tiltOf(o), a = Math.abs(t), to = t > 0 ? "right" : "left";
  w.push(a <= 5 ? "upright" : a >= 175 ? "upside down" : Math.abs(a - 90) <= 5 ? `lying, its top to the ${to}` : `leaning ${a}° to the ${to}`);
  if (o.f) {
    const [fx, fy, fz] = o.f, [ux, uy, uz] = o.u, r = [fy * uz - fz * uy, fz * ux - fx * uz, fx * uy - fy * ux];
    if (r[2] < -0.5) w.push("its right side toward us, its left away");
    else if (r[2] > 0.5) w.push("its left side toward us, its right away");
    else if (Math.abs(r[0]) > 0.5) w.push(`its right hand on our ${r[0] > 0 ? "right" : "left"}`);
  }
  if (o.mirrored) w.push("mirrored: what was drawn as its right side now plays its left");
  if (o.mirrored && o.text) w.push("WARNING: mirrored lettering reads backwards");
  return w.join(", ");
}

/**
 * The pixel checks on one placement, in words (those that fail start with "WARNING"): its front
 * marker against its facing; its lit side against the world's light, unless it is on an unlit layer
 * (sparks, a smear, a glow give light or have none); its feet against where it was stamped (a pivot
 * below the sole floats it) and against the ground. describe and pxl check both use this.
 */
export function placementChecks(p: Placement, wo: World | undefined, steps: Steps | undefined, unlit = false): string[] {
  const light = lightFor(wo, p);
  const checks = [frontWords(p.img), light && !unlit ? lightWords(p.img, light, steps) : ""];
  const bb = p.img.bounds(), pv = p.img.pivot;
  if (bb && p.img.meters) {   // what has a real height stands on the ground: a ghost may float
    const feet = p.y + bb.y + bb.h, off = pv ? Math.round(p.y + pv[1] - feet) : 0;
    if (Math.abs(off) >= 2) checks.push(`WARNING: its feet are ${Math.abs(off)} px ${off > 0 ? "above" : "below"} where it stands (its pivot is ${Math.abs(off)} px ${off > 0 ? "below its sole" : "above it"}): it ${off > 0 ? "floats" : "sinks"}`);
    if (wo?.ground !== undefined && Math.abs(wo.ground - feet) >= 2)
      checks.push(`WARNING: its feet (y ${feet}) are ${Math.abs(wo.ground - feet)} px ${wo.ground > feet ? "above" : "below"} the ground (y ${wo.ground})`);
  }
  return checks.filter(Boolean);
}

/**
 * Which way a placement's light comes from: the world's `light` as given, or for a point light
 * (`{ at: [x, y] }`: a fire, a lamp) the way from the middle of what shows of it to that point; none
 * when the point is inside its box (the fire itself).
 */
export function lightFor(wo: World | undefined, p: Placement): [number, number] | undefined {
  const l = wo?.light;
  if (!l || Array.isArray(l)) return l;
  const bb = p.img.bounds();
  if (!bb) return undefined;
  const dx = l.at[0] - (p.x + bb.x + bb.w / 2), dy = l.at[1] - (p.y + bb.y + bb.h / 2);
  if (Math.abs(dx) <= bb.w / 2 && Math.abs(dy) <= bb.h / 2) return undefined;
  const k = Math.hypot(dx, dy);
  return [dx / k, dy / k];
}

/** px per meter where a thing stands (its feet on row y), or undefined without a usable world. */
export function pxPerMeter(world: World, y: number): number | undefined {
  if (world.scale !== undefined) return world.scale;
  if (world.horizon !== undefined && world.eye) return (y - world.horizon) / world.eye;
  return undefined;
}

export function describe(name: string, b: BuildOut, pal: Palette, opts: DescribeOpts = {}): { text: string; snap: Snapshot } {
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
  // who owns each pixel: the last placement with an opaque pixel there. A placement in a shade or
  // light layer only darkens or lights what is under it: it owns the ground it falls on, never an
  // object (a tree's shadow over a girl's legs leaves them hers)
  const blended = new Set(b.layers.filter((l) => l.how === "blended").map((l) => l.name));
  const unlitLayers = new Set(b.layers.filter((l) => l.unlit).map((l) => l.name));
  const owner = new Int16Array(W * H).fill(-1);
  for (const effects of [false, true])
    b.placements.forEach((p, i) => {
      if (blended.has(p.layer ?? "") !== effects) return;
      for (let y = 0; y < p.img.h; y++)
        for (let x = 0; x < p.img.w; x++) {
          const X = p.x + x, Y = p.y + y, j = Y * W + X;
          if (X < 0 || Y < 0 || X >= W || Y >= H || p.img.data[y * p.img.w + x] === TRANSPARENT) continue;
          if (!effects || owner[j] < 0 || blended.has(b.placements[owner[j]].layer ?? "")) owner[j] = i;
        }
    });
  const kOf = (i: number) => { const p = b.placements[i]; return `${p.name}@${p.layer ?? ""}`; };

  const frames = b.anim ? `, animated (frame ${opts.frame ?? 0} of the loop, ${b.anim.loop} ms)` : "";
  out.push(`${name} ${W}x${H}${frames}. Coordinates are x,y in px from the top left; a range a-b includes both ends.`);
  if (opts.note) out.push(opts.note);
  if (opts.extra?.length) out.push(...opts.extra);
  const steps = rampSteps(pal);
  const wo = opts.world;
  if (wo?.light) out.push(Array.isArray(wo.light)
    ? `LIGHT: from ${dirWords(wo.light[0], wo.light[1])}; each object's lit side (from its edges) is checked against it.`
    : `LIGHT: a point at ${wo.light.at.join(",")}; each object's lit side (from its edges) is checked against the way from its middle to there.`);
  if (wo?.scale !== undefined) out.push(`WORLD: flat side view, ${wo.scale} px per meter (a 1.8 m figure is ${Math.round(1.8 * wo.scale)} px tall).`);
  else if (wo?.horizon !== undefined && wo.eye)
    out.push(`WORLD: ground in perspective, horizon at y ${wo.horizon}, eye ${wo.eye} m up: a thing standing on row y is (y - ${wo.horizon}) / ${wo.eye} px per meter, ` +
      `so a 1.8 m figure is ${[Math.round(wo.horizon + (H - wo.horizon) / 3), H].map((y) => `${Math.round((1.8 * (y - wo.horizon!)) / wo.eye!)} px at y ${y}`).join(", ")}; anything at eye height sits on the horizon.`);
  out.push("");
  // objects: every placement but the many-copies ones, each with its relations worked out
  const many = new Set(keys.filter((k) => byKey.get(k)!.length > MANY));
  const shown = b.placements.map((p, i) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0, all = 0;
    const cover = new Map<number, number>();
    for (let y = 0; y < p.img.h; y++)
      for (let x = 0; x < p.img.w; x++) {
        const X = p.x + x, Y = p.y + y;
        if (X < 0 || Y < 0 || X >= W || Y >= H || p.img.data[y * p.img.w + x] === TRANSPARENT) continue;
        all++;
        const o = owner[Y * W + X];
        if (o !== i) { if (o >= 0) cover.set(o, (cover.get(o) ?? 0) + 1); continue; }
        n++; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
      }
    return { x0, y0, x1, y1, n, all, cover };
  });
  type Shown = (typeof shown)[number];
  const isMain = (i: number) => !many.has(kOf(i)) && !blended.has(b.placements[i].layer ?? "");
  const main = b.placements.map((_, i) => i).filter(isMain);
  const label = (i: number) => {
    const same = byKey.get(kOf(i))!, n = b.placements[i].name;
    return same.length > 1 ? `${n} #${same.indexOf(b.placements[i]) + 1}` : n;
  };
  // empty px between two objects' visible pixels (8-neighbour steps), up to FAR
  const FAR = 96, dist = new Map<number, Int16Array>();
  const field = (i: number) => {
    let d = dist.get(i);
    if (d) return d;
    d = new Int16Array(W * H).fill(-1);
    let q: number[] = [];
    for (let j = 0; j < W * H; j++) if (owner[j] === i) { d[j] = 0; q.push(j); }
    for (let r = 1; r <= FAR && q.length; r++) {
      const next: number[] = [];
      for (const j of q) {
        const x = j % W, y = (j - x) / W;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, k = Y * W + X;
          if (X >= 0 && Y >= 0 && X < W && Y < H && d[k] < 0) { d[k] = r; next.push(k); }
        }
      }
      q = next;
    }
    dist.set(i, d);
    return d;
  };
  const gapOf = (i: number, j: number) => {
    const d = field(i), sj = shown[j];
    let m = Infinity;
    for (let y = sj.y0; y <= sj.y1; y++) for (let x = sj.x0; x <= sj.x1; x++) { const k = y * W + x; if (owner[k] === j && d[k] >= 0 && d[k] < m) m = d[k]; }
    return m === Infinity ? Infinity : m - 1;
  };
  const side = (a: Shown, c: Shown) => {
    const dx = (c.x0 + c.x1) / 2 - (a.x0 + a.x1) / 2, dy = (c.y0 + c.y1) / 2 - (a.y0 + a.y1) / 2;
    return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "above" : "below";
  };
  const stands = (i: number) => {
    const sh = shown[i], inC: Color[] = [], outC: Color[] = [];
    for (let y = Math.max(0, sh.y0 - 2); y <= Math.min(H - 1, sh.y1 + 2); y++)
      for (let x = Math.max(0, sh.x0 - 2); x <= Math.min(W - 1, sh.x1 + 2); x++) {
        const j = y * W + x;
        if (owner[j] === i) { inC.push(img.data[j]); continue; }
        let near = false;
        for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) {
          const X = x + dx, Y = y + dy;
          if (X >= 0 && Y >= 0 && X < W && Y < H && owner[Y * W + X] === i) near = true;
        }
        if (near) outC.push(img.data[j]);
      }
    if (!inC.length || !outC.length) return "";
    // the body: its lighter three quarters (the outline is not what the eye reads)
    const body = inC.slice().sort((p, q) => lum(p) - lum(q)).slice(Math.floor(inC.length / 4));
    const q = (a: number[], f: number) => a.sort((u, v) => u - v)[Math.min(a.length - 1, Math.floor(a.length * f))];
    const [bl, ba, bb] = mean3(body), [ol, oa, ob] = mean3(outC);
    const dE = Math.round(100 * Math.hypot(bl - ol, ba - oa, bb - ob));
    return `stands out: brightness ${digit(q(inC.map(lum), 0.75))} vs ${digit(q(outC.map(lum), 0.5))} around, color difference ${dE}`;
  };
  const keysOf = (i: number) => {
    const n = new Map<string, number>(), sh = shown[i];
    for (let y = sh.y0; y <= sh.y1; y++) for (let x = sh.x0; x <= sh.x1; x++) if (owner[y * W + x] === i) { const k = key(unlit.data[y * W + x]); n.set(k, (n.get(k) ?? 0) + 1); }
    return [...n].sort((p, q) => q[1] - p[1]).slice(0, 3).map(([k]) => k).join("");
  };
  // motion over the loop: how much of its own drawing changes from one frame to the next
  const motion = (i: number) => {
    const fr = opts.frames;
    if (!fr || fr.length < 2) return "";
    let ch = 0, tot = 0, moved = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < fr.length; k++) {
      const a = fr[k].placements[i], c = fr[(k + 1) % fr.length].placements[i];
      if (!a || !c || a.name !== b.placements[i].name) return "";
      x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x); y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y);
      if (a.x !== c.x || a.y !== c.y) moved++;
      for (let j = 0; j < a.img.data.length; j++) {
        const u = a.img.data[j], v = c.img.data[j] ?? TRANSPARENT;
        if (u !== TRANSPARENT || v !== TRANSPARENT) tot++;
        if (u !== v) ch++;
      }
    }
    const share = Math.round((100 * ch) / Math.max(1, tot));
    return share === 0 && !moved ? "still" : `animated: ${share}% of its drawing changes per frame` + (moved ? `, shifts ${x1 - x0}px across, ${y1 - y0}px up/down` : "");
  };


  // what changed since an earlier describe: objects by label, then the pixels, in regions
  const snap: Snapshot = {
    objects: main.filter((i) => shown[i].n).map((i) => ({ label: label(i), x0: shown[i].x0, y0: shown[i].y0, x1: shown[i].x1, y1: shown[i].y1, n: shown[i].n, hash: b.placements[i].img.hash() })),
    img, unlit,
  };
  if (opts.prev) {
    const pv = opts.prev, before = new Map(pv.objects.map((o) => [o.label, o])), now = new Set(snap.objects.map((o) => o.label));
    const lines: string[] = [];
    for (const o of snap.objects) {
      const q = before.get(o.label);
      if (!q) { lines.push(`added ${o.label}: x ${o.x0}-${o.x1}, y ${o.y0}-${o.y1}`); continue; }
      const dx = o.x0 - q.x0, dy = o.y0 - q.y0, same = o.x1 - o.x0 === q.x1 - q.x0 && o.y1 - o.y0 === q.y1 - q.y0;
      const what: string[] = [];
      if ((dx || dy) && same) what.push(`moved ${dx >= 0 ? "+" : ""}${dx},${dy >= 0 ? "+" : ""}${dy}`);
      else if (!same || dx || dy) what.push(`now x ${o.x0}-${o.x1}, y ${o.y0}-${o.y1} (was x ${q.x0}-${q.x1}, y ${q.y0}-${q.y1})`);
      if (o.hash !== q.hash) what.push("redrawn");
      else if (o.n !== q.n) what.push(`${o.n - q.n > 0 ? "more" : "less"} of it shows (${q.n} -> ${o.n} px)`);
      if (what.length) lines.push(`${o.label}: ${what.join(", ")}`);
    }
    for (const o of pv.objects) if (!now.has(o.label)) lines.push(`removed ${o.label} (was x ${o.x0}-${o.x1}, y ${o.y0}-${o.y1})`);
    out.push("CHANGES (since the last describe of this asset):");
    if (pv.img.w !== W || pv.img.h !== H) out.push(`  size: ${pv.img.w}x${pv.img.h} -> ${W}x${H}`);
    else {
      const art = new Uint8Array(W * H), light = new Uint8Array(W * H);
      let nArt = 0, nLight = 0;
      for (let j = 0; j < W * H; j++) {
        if (unlit.data[j] !== pv.unlit.data[j]) { art[j] = 1; nArt++; }
        else if (img.data[j] !== pv.img.data[j]) { light[j] = 1; nLight++; }
      }
      out.push(`  pixels: ${nArt} changed in the drawing${unlit !== img ? `, ${nLight} more only in the light` : ""}`);
      // one color turned into another over many pixels is a palette or recolor change: one line, and
      // its pixels stay out of the regions so a small edit next to it still shows
      const pairs = new Map<string, number>();
      for (let j = 0; j < W * H; j++) if (art[j]) { const k = `${pv.unlit.data[j]}>${unlit.data[j]}`; pairs.set(k, (pairs.get(k) ?? 0) + 1); }
      const recolor = new Set([...pairs].filter(([, n]) => n >= Math.max(200, nArt / 10)).map(([k]) => k));
      for (const k of recolor) {
        const [from, to] = k.split(">").map(Number);
        out.push(`  recolor: ${toHex(from)} -> ${key(to)}=${toHex(to)} on ${pairs.get(k)} px`);
      }
      if (recolor.size) for (let j = 0; j < W * H; j++) if (art[j] && recolor.has(`${pv.unlit.data[j]}>${unlit.data[j]}`)) art[j] = 0;
      // regions: changed pixels grouped when within 2 px of each other
      const any = (j: number) => art[j] || light[j], seen = new Uint8Array(W * H), regions: { x0: number; y0: number; x1: number; y1: number; n: number; who: Map<string, number> }[] = [];
      for (let j = 0; j < W * H; j++) {
        if (!any(j) || seen[j]) continue;
        const r = { x0: W, y0: H, x1: -1, y1: -1, n: 0, who: new Map<string, number>() }, stack = [j];
        seen[j] = 1;
        while (stack.length) {
          const k = stack.pop()!, x = k % W, y = (k - x) / W;
          r.n++; r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y);
          const o = owner[k], wname = o >= 0 && isMain(o) ? label(o) : o >= 0 ? b.placements[o].name : "background";
          r.who.set(wname, (r.who.get(wname) ?? 0) + 1);
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const X = x + dx, Y = y + dy, n = Y * W + X;
            if (X >= 0 && Y >= 0 && X < W && Y < H && !seen[n] && any(n)) { seen[n] = 1; stack.push(n); }
          }
        }
        regions.push(r);
      }
      regions.sort((p, q) => q.n - p.n).slice(0, 8).forEach((r) => {
        const who = [...r.who].sort((p, q) => q[1] - p[1]).slice(0, 3).map(([w, n]) => `${w} ${n}px`).join(", ");
        out.push(`  region x ${r.x0}-${r.x1}, y ${r.y0}-${r.y1}: ${r.n} px (${who})`);
      });
      if (regions.length > 8) out.push(`  …+${regions.length - 8} smaller regions`);
    }
    out.push(...(lines.length ? lines.map((l) => "  " + l) : ["  objects: none moved, redrawn, added or removed"]));
    out.push("");
  }

  if (main.length) {
    out.push("OBJECTS (in drawing order: later ones are in front; ranges are inclusive px; feet = bottom middle):");
    for (const i of main) {
      const p = b.placements[i], sh = shown[i];
      // an anim can draw nothing at the moment described (sparks between clashes): that is not hidden
      if (!sh.n) { out.push(`  ${sym.get(kOf(i))} ${label(i)} @${p.layer ?? "-"}: ${sh.all ? `hidden (all ${sh.all} px covered)` : "nothing drawn in this frame"}`); continue; }
      const parts = [`x ${sh.x0}-${sh.x1}, y ${sh.y0}-${sh.y1} (${sh.x1 - sh.x0 + 1}x${sh.y1 - sh.y0 + 1}), feet ${Math.round((sh.x0 + sh.x1) / 2)},${sh.y1}`];
      if (sh.n < sh.all) parts.push(`${Math.round((100 * sh.n) / sh.all)}% shows`);
      parts.push(`colors ${keysOf(i)}`);
      out.push(`  ${sym.get(kOf(i))} ${label(i)} @${p.layer ?? "-"}: ${parts.join("; ")}`);
      const rel: string[] = [];
      const covers = main.filter((j) => j !== i && shown[j].cover.get(i)).map((j) => `${label(j)} (${shown[j].cover.get(i)}px of it)`);
      const coveredBy = [...sh.cover].filter(([o]) => isMain(o)).map(([o, n]) => `${label(o)} (${n}px)`);
      if (covers.length) rel.push(`in front of ${covers.join(", ")}`);
      if (coveredBy.length) rel.push(`behind ${coveredBy.join(", ")}`);
      const near = main.filter((j) => j !== i && shown[j].n).map((j) => ({ j, g: gapOf(i, j) })).filter(({ g }) => g < Infinity).sort((u, v) => u.g - v.g).slice(0, 3);
      rel.push(near.length ? "nearest: " + near.map(({ j, g }) => `${label(j)} ${g ? g + "px" : "touching"} ${side(sh, shown[j])}`).join(", ") : `nothing within ${FAR}px`);
      const shadow = b.placements.map((q, j) => [q, j] as const).filter(([q, j]) => q.name === p.name && blended.has(q.layer ?? "") && shown[j].n);
      if (shadow.length && byKey.get(kOf(i))!.length === 1) rel.push(shadow.map(([q, j]) => `its ${q.layer} shows at x ${shown[j].x0}-${shown[j].x1}, y ${shown[j].y0}-${shown[j].y1}`).join(", "));
      const st = stands(i), mo = motion(i);
      const turned = p.img.orient && (p.img.orient.f || p.img.orient.mirrored || tiltOf(p.img.orient)) ? orientWords(p.img.orient) : "";
      let size = "";
      const bb = p.img.bounds();
      const check = placementChecks(p, wo, steps, unlitLayers.has(p.layer ?? "")).join("; ");
      if (wo && p.img.meters && bb) {
        const lying = p.img.orient && Math.abs(Math.abs(tiltOf(p.img.orient)) - 90) <= 45;
        const drawn = lying ? bb.w : bb.h, feet = p.y + bb.y + bb.h, ppm = pxPerMeter(wo, feet);
        if (ppm === undefined) size = "";
        else if (ppm <= 0) size = `size: its foot (y ${feet}) is at or above the horizon (y ${wo.horizon}): it floats, or the horizon is wrong`;
        else {
          const want = p.img.meters * ppm, off = Math.round((100 * (drawn - want)) / want);
          size = `size: ${p.img.meters} m ${lying ? "long" : "tall"} is ${Math.round(want)} px where it stands (y ${feet}); drawn ${drawn} px` +
            (Math.abs(off) <= 8 ? ", right" : `, ${Math.abs(off)}% too ${off > 0 ? (lying ? "long" : "tall") : lying ? "short" : "small"}`) +
            // a wide thing (a tent, a cart, a log) is often seen at an angle: its far end rises on
            // screen and its box counts that; silhouettes can't tell that from a wrong scale
            (off > 8 && !lying && bb.w > bb.h ? " (its box, top to bottom: seen at an angle, its far end rises on screen and counts too, so compare its near end)" : "");
        }
      }
      if (opts.brief) {
        // one line: ranges, feet, the nearest neighbour, cover, contrast, motion, in short words
        const out1 = out.pop()!.replace(/; colors \S+$/, "");
        // two neighbours, not one: with one, a tie hid the other (a blind reader lost the witch)
        const n1 = near.length ? "near " + near.slice(0, 2).map(({ j, g }) => `${label(j)} ${g ? g + "px" : "touching"} ${side(sh, shown[j])}`).join(", ") : "";
        const fr = covers.length ? `front of ${main.filter((j) => j !== i && shown[j].cover.get(i)).map(label).join(",")}` : "";
        const bh = coveredBy.length ? `behind ${[...sh.cover].filter(([o]) => isMain(o)).map(([o]) => label(o)).join(",")}` : "";
        const sm = st.replace("stands out: brightness ", "lum ").replace(" vs ", "/").replace(" around, color difference ", " dE ");
        const mm = mo.replace("animated: ", "anim ").replace("% of its drawing changes per frame", "%").replace(/, shifts .*$/, " moving");
        out.push(out1 + "; " + [n1, fr, bh, sm, mm, turned, size.replace(/ where it stands \(y \d+\)/, ""), check].filter(Boolean).join("; "));
        continue;
      }
      out.push("      " + rel.join("; "));
      if (st || mo) out.push("      " + [st, mo].filter(Boolean).join("; "));
      if (turned || size || check) out.push("      " + [turned && "turned: " + turned, size, check].filter(Boolean).join("; "));
    }
    out.push("");
  }
  if (many.size) {
    out.push("MANY (small things placed many times, one line each):");
    for (const k of many) {
      const ps = byKey.get(k)!, idx = ps.map((q) => b.placements.indexOf(q)).filter((i) => shown[i].n);
      const x0 = Math.min(...idx.map((i) => shown[i].x0)), x1 = Math.max(...idx.map((i) => shown[i].x1));
      const y0 = Math.min(...idx.map((i) => shown[i].y0)), y1 = Math.max(...idx.map((i) => shown[i].y1));
      const [n, layer] = k.split("@");
      out.push(`  ${sym.get(k)} ${n} @${layer || "-"} x${ps.length}, ${ps[0].w}x${ps[0].h} each, over x ${x0}-${x1}, y ${y0}-${y1}`);
    }
    out.push("");
  }

  // layers that change what is under them (opacity, blend, shade, light): what each one reaches, and
  // how much of it what is drawn later hides (does the haze reach the castle, or is that part of it
  // behind the tents?). Under it: the last thing stamped there on an earlier layer, else the painting.
  const blends = b.layers.map((l, li) => ({ l, li })).filter(({ l }) => l.how === "blended");
  if (blends.length) {
    out.push("BLENDS (layers that change what is under them instead of drawing over it):");
    const at = new Map<string, number>();
    b.layers.forEach((l, li) => { if (!at.has(l.name)) at.set(l.name, li); });
    const plain = b.layers.map((l) => !l.how);
    for (const { l, li } of blends) {
      const under = new Int16Array(W * H).fill(-1), over = new Int16Array(W * H).fill(-1), later = new Uint8Array(W * H);
      b.placements.forEach((p, i) => {
        const pl = p.layer === undefined ? -1 : at.get(p.layer) ?? -1;
        if (pl === li || (p.layer !== undefined && !plain[pl])) return;
        const tgt = pl < li ? under : over;
        for (let y = 0; y < p.img.h; y++)
          for (let x = 0; x < p.img.w; x++) {
            const X = p.x + x, Y = p.y + y;
            if (X >= 0 && Y >= 0 && X < W && Y < H && p.img.data[y * p.img.w + x] !== TRANSPARENT) tgt[Y * W + X] = i;
          }
      });
      b.layers.forEach((k, ki) => { if (ki > li && plain[ki]) for (let j = 0; j < W * H; j++) if (k.img.data[j] !== TRANSPARENT) later[j] = 1; });
      let n = 0, hidden = 0;
      const on = new Map<string, number>(), by = new Map<string, number>(), add = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
      const name = (i: number) => (i < 0 ? "painting" : b.placements[i].name);
      for (let j = 0; j < W * H; j++) {
        if (l.img.data[j] === TRANSPARENT) continue;
        n++;
        if (later[j]) { hidden++; add(by, name(over[j])); } else add(on, name(under[j]));
      }
      const list = (m: Map<string, number>) => [...m].sort((u, v) => v[1] - u[1]).slice(0, 6).map(([k, v]) => `${k} (${v})`).join(", ") + (m.size > 6 ? `, ${m.size - 6} more` : "");
      out.push(`  ${l.name} (${l.mode}): ${n} px` + (n - hidden ? `; over ${list(on)}` : "") + (hidden ? `; ${hidden} px of it hidden by what is drawn later: ${list(by)}` : ""));
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
      // a shadow or a light (blended layers) is not an object: its cells read as background
      cells(x0, y0, (i) => { total++; const o = owner[i]; if (o >= 0 && !blended.has(b.placements[o].layer ?? "")) { const k = kOf(o); n.set(k, (n.get(k) ?? 0) + 1); } });
      let best = "", most = 0;
      for (const [k, v] of n) if (v > most) { most = v; best = k; }
      return most * 4 >= total ? sym.get(best)! : ".";
    });
  if (!opts.brief || !b.trace) map(`COLOR (each cell: its most common ${b.trace ? "palette key before lighting" : "color key"}):`, (x0, y0) => {
    const n = new Map<Color, number>();
    cells(x0, y0, (i) => n.set(unlit.data[i], (n.get(unlit.data[i]) ?? 0) + 1));
    let best: Color = TRANSPARENT, most = -1;
    for (const [c, v] of n) if (v > most) { most = v; best = c; }
    return key(best);
  });
  const used = new Map<Color, number>();
  for (const c of unlit.data) used.set(c, (used.get(c) ?? 0) + 1);
  const listed = [...used].sort((a, b) => b[1] - a[1]).filter(([c]) => key(c) !== "~");
  if (!opts.brief || !b.trace) {
    out.push("  keys: " + listed.map(([c]) => `${key(c)}=${c === TRANSPARENT ? "clear" : toHex(c)}`).join(" ") + (listed.length < used.size ? "  ~=blended, outside the palette" : ""));
    out.push("");
  }
  if (unlit !== img && !opts.brief)
    map(`LIGHT (each cell: brightness after lighting, 0 black .. 9 white):`, (x0, y0) => {
      let s = 0, n = 0;
      cells(x0, y0, (i) => { s += img.data[i] === TRANSPARENT ? 0 : lum(img.data[i]); n++; });
      return digit(s / n);
    });

  if (groups.length && !opts.brief) {
    out.push("PAINTED (steps in order, grouped by source line; a layer line closes that layer):");
    for (const g of groups) {
      const box = g.box ? `${g.box[0]},${g.box[1]} ${g.box[2] - g.box[0]}x${g.box[3] - g.box[1]}` : "no change";
      const what = g.n === 1 ? g.first : `${[...g.ops].join("/")} x${g.n}`;
      out.push(`  ${(g.loc.replace(/^.*[\\/]/, "") || "-").padEnd(20)} ${what.length > 60 ? what.slice(0, 59) + "…" : what.padEnd(60)} ${box}`);
    }
    out.push("");
  }

  // a plain image with a clear background (a sheet, a cutout): each 8-connected patch of drawn
  // pixels is a shape; identical shapes, mirrored ones too, are one dictionary entry with a list
  // of where they are
  const clear = img.data.reduce((n, c) => n + (c === TRANSPARENT ? 1 : 0), 0);
  if (!b.trace && !b.placements.length && clear > img.data.length / 10) {
    const seen = new Uint8Array(W * H), shapes = new Map<string, { img: Img; at: string[] }>();
    const flipX = (q: Img) => { const o = new Img(q.w, q.h); for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) o.data[y * q.w + x] = q.data[y * q.w + q.w - 1 - x]; return o; };
    for (let j = 0; j < W * H; j++) {
      if (seen[j] || img.data[j] === TRANSPARENT) continue;
      const stack = [j], px: number[] = [];
      seen[j] = 1;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      while (stack.length) {
        const k = stack.pop()!, x = k % W, y = (k - x) / W;
        px.push(k); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, n = Y * W + X;
          if (X >= 0 && Y >= 0 && X < W && Y < H && !seen[n] && img.data[n] !== TRANSPARENT) { seen[n] = 1; stack.push(n); }
        }
      }
      const shape = new Img(x1 - x0 + 1, y1 - y0 + 1);
      for (const k of px) { const x = k % W, y = (k - x) / W; shape.data[(y - y0) * shape.w + x - x0] = img.data[k]; }
      const h = shape.hash(), hf = flipX(shape).hash(), hit = shapes.get(h) ?? shapes.get(hf);
      const where = `${x0},${y0}${!shapes.has(h) && shapes.has(hf) ? " flipped" : ""}`;
      if (hit) hit.at.push(where); else shapes.set(h, { img: shape, at: [where] });
    }
    const list = [...shapes.values()].sort((p, q) => q.at.length - p.at.length || q.img.w * q.img.h - p.img.w * p.img.h);
    const total = list.reduce((n, sh) => n + sh.at.length, 0);
    out.push(`SHAPES (each 8-connected patch of drawn pixels; identical or mirrored ones are one entry: ${list.length} distinct of ${total}; positions are top-left):`);
    list.slice(0, 60).forEach((sh, i) => out.push(`  ${SYMBOLS[i] ?? "~"} ${sh.img.w}x${sh.img.h} x${sh.at.length}: ${sh.at.slice(0, 10).join("  ")}${sh.at.length > 10 ? ` …+${sh.at.length - 10}` : ""}`));
    if (list.length > 60) out.push(`  …+${list.length - 60} more distinct shapes`);
    out.push("");
  }

  // a plain opaque image (no build behind it): the background is what forms large patches of one
  // color (8-connected, so a dither counts as one patch); what is left, grouped into 8-connected
  // patches, are the objects; identical or mirrored ones are one entry; a grid of identical tiles
  // shows too when the image is built from them
  else if (!b.trace && !b.placements.length) {
    const big = Math.max(64, Math.round(W * H * 0.004)), comp = new Int32Array(W * H).fill(-1);
    const patches: { c: Color; n: number; x0: number; y0: number; x1: number; y1: number }[] = [];
    for (let j = 0; j < W * H; j++) {
      if (comp[j] >= 0) continue;
      const c = img.data[j], id = patches.length, r = { c, n: 0, x0: W, y0: H, x1: -1, y1: -1 }, stack = [j];
      comp[j] = id;
      while (stack.length) {
        const k = stack.pop()!, x = k % W, y = (k - x) / W;
        r.n++; r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, n = Y * W + X;
          if (X >= 0 && Y >= 0 && X < W && Y < H && comp[n] < 0 && img.data[n] === c) { comp[n] = id; stack.push(n); }
        }
      }
      patches.push(r);
    }
    const isBg = (j: number) => patches[comp[j]].n >= big;
    const bgList = patches.filter((r) => r.n >= big).sort((p, q) => q.n - p.n);
    out.push(`REGIONS (patches of one color of ${big} px or more, the background; largest first):`);
    for (const r of bgList.slice(0, 14)) out.push(`  ${key(r.c)}=${r.c === TRANSPARENT ? "clear" : toHex(r.c)} ${r.n}px over x ${r.x0}-${r.x1}, y ${r.y0}-${r.y1}`);
    if (bgList.length > 14) out.push(`  …+${bgList.length - 14} more`);
    out.push("");
    // objects: what is not background, in 8-connected patches
    const seen = new Uint8Array(W * H), shapes = new Map<string, { img: Img; at: string[]; box: [number, number, number, number]; n: number }>();
    const flipX = (q: Img) => { const o = new Img(q.w, q.h); for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) o.data[y * q.w + x] = q.data[y * q.w + q.w - 1 - x]; return o; };
    let specks = 0;
    for (let j = 0; j < W * H; j++) {
      if (seen[j] || isBg(j)) continue;
      const stack = [j], px: number[] = [];
      seen[j] = 1;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      while (stack.length) {
        const k = stack.pop()!, x = k % W, y = (k - x) / W;
        px.push(k); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, n = Y * W + X;
          if (X >= 0 && Y >= 0 && X < W && Y < H && !seen[n] && !isBg(n)) { seen[n] = 1; stack.push(n); }
        }
      }
      if (px.length <= 3) { specks++; continue; }
      const shape = new Img(x1 - x0 + 1, y1 - y0 + 1);
      for (const k of px) { const x = k % W, y = (k - x) / W; shape.data[(y - y0) * shape.w + x - x0] = img.data[k]; }
      const h = shape.hash(), hf = flipX(shape).hash(), hit = shapes.get(h) ?? shapes.get(hf);
      const where = `${x0},${y0}${!shapes.has(h) && shapes.has(hf) ? " flipped" : ""}`;
      if (hit) hit.at.push(where); else shapes.set(h, { img: shape, at: [where], box: [x0, y0, x1, y1], n: px.length });
    }
    const colorsOf = (q: Img) => {
      const n = new Map<string, number>();
      for (const c of q.data) if (c !== TRANSPARENT) n.set(key(c), (n.get(key(c)) ?? 0) + 1);
      return [...n].sort((p, r) => r[1] - p[1]).slice(0, 3).map(([k]) => k).join("");
    };
    const single = [...shapes.values()].filter((v) => v.at.length === 1).sort((p, q) => q.n - p.n);
    const repeated = [...shapes.values()].filter((v) => v.at.length > 1).sort((p, q) => q.at.length - p.at.length);
    out.push(`OBJECTS (what is not background, in 8-connected patches; largest first; touching things come out as one):`);
    for (const v of single.slice(0, 40)) out.push(`  x ${v.box[0]}-${v.box[2]}, y ${v.box[1]}-${v.box[3]} (${v.img.w}x${v.img.h}), ${v.n}px, colors ${colorsOf(v.img)}`);
    if (single.length > 40) out.push(`  …+${single.length - 40} smaller`);
    if (repeated.length) {
      out.push("  repeated (identical or mirrored):");
      for (const v of repeated.slice(0, 20)) out.push(`    ${v.img.w}x${v.img.h} x${v.at.length}, colors ${colorsOf(v.img)}: ${v.at.slice(0, 10).join("  ")}${v.at.length > 10 ? ` …+${v.at.length - 10}` : ""}`);
    }
    if (specks) out.push(`  and ${specks} specks of 1-3 px (stars, sparkles, dither ends)`);
    out.push("");

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
    if (ids.size * 2 <= filled) {
      out.push(`TILES (${T}x${T} grid: each symbol is one distinct tile; ${ids.size} distinct of ${filled} filled${ids.size > SYMBOLS.length ? `, "~" = past the ${SYMBOLS.length}th` : ""}):`);
      out.push("    " + Array.from({ length: tw }, (_, i) => String(Math.floor((i * T) / 100) % 10)).join("") + "  (x / 100)");
      out.push("    " + Array.from({ length: tw }, (_, i) => String(Math.floor((i * T) / 10) % 10)).join("") + "  (x / 10)");
      out.push(...rows);
      out.push("  first seen at (for --at x,y," + T + "," + T + "): " + first.slice(0, SYMBOLS.length).map(([x, y], i) => `${SYMBOLS[i]} ${x},${y}`).join("  "));
      out.push("");
    }
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
  return { text: out.join("\n"), snap };
}
