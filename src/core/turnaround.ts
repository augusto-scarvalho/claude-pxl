// A turnaround: a thing in 3D (a field, a built thing, a world's part) seen from N headings and drawn
// as a family of sprites (anims when it moves on the clock) any scene can stamp, as directions() turns
// a drawing in the picture's plane. A heading is where the thing faces on the picture's ground, by the
// compass of a map: "n" away from us, "e" to the right, "s" toward us (its front, as it was built:
// toward -y), clockwise; the camera goes round it and its light with it, so every sprite is lit from
// the same side of the picture. The sizes come from the thing's box seen at every heading (and every
// moment of its loop), one size for the family, its pivot where the thing's origin, its foot, lands.
import { PxError } from "./errors.ts";
import { type Clock, STILL, Sdf, compile } from "./sdf.ts";
import { type Perspective, perspective } from "./perspective.ts";
import { type SurfaceView, corners, surfaceSize } from "./surface.ts";

/** The 16 headings of the compass rose, 22.5 degrees apart, clockwise from "n". */
export const COMPASS = ["n", "nne", "ne", "ene", "e", "ese", "se", "sse", "s", "ssw", "sw", "wsw", "w", "wnw", "nw", "nnw"];

/**
 * The headings: n of them from "n" (an iso view's 4 its diagonals, ne se sw nw: one to a quarter of its
 * grid), or those named (compass names or degrees). Named by the compass when every one is on it, else
 * by their index, as directions() names its sprites.
 */
export function headingsOf(n: unknown, headings: unknown, iso: boolean): { deg: number; name: string }[] {
  let degs: number[];
  if (headings !== undefined) {
    if (!Array.isArray(headings) || !headings.length) throw new PxError(`turnaround: headings is a list of compass names (${COMPASS.join(", ")}) or degrees clockwise from n, got ${JSON.stringify(headings)}`);
    degs = headings.map((h) => {
      const d = typeof h === "string" && COMPASS.includes(h) ? COMPASS.indexOf(h) * 22.5 : h;
      if (typeof d !== "number" || !Number.isFinite(d)) throw new PxError(`turnaround: a heading is a compass name (${COMPASS.join(", ")}) or degrees clockwise from n, got ${JSON.stringify(h)}`);
      return ((d % 360) + 360) % 360;
    });
  } else {
    if (!(Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 360)) throw new PxError(`turnaround: n is how many headings, 1 to 360 (4, 8, 16), got ${JSON.stringify(n)}`);
    const k = n as number, off = k === 4 && iso ? 45 : 0;
    degs = Array.from({ length: k }, (_, i) => ((i * 360) / k + off) % 360);
  }
  if (new Set(degs).size !== degs.length) throw new PxError(`turnaround: a heading given twice, got ${JSON.stringify(headings)}`);
  const compass = degs.every((d) => Math.abs(d / 22.5 - Math.round(d / 22.5)) < 1e-9);
  return degs.map((deg, i) => ({ deg, name: compass ? COMPASS[Math.round(deg / 22.5) % 16] : String(i) }));
}

/** Is the field its own mirror across its front-to-back plane (x = 0), distances and materials, at each of these moments? */
export function mirrorSymmetric(f: Sdf, clocks: Clock[]): boolean {
  const N = 9, h = 0.01;
  for (const c of clocks) {
    const C = compile(f, c), { lo, hi } = C;
    if (![...lo, ...hi].every(Number.isFinite)) return false;
    const nrm = (x: number, y: number, z: number) => [C.d(x + h, y, z) - C.d(x - h, y, z), C.d(x, y + h, z) - C.d(x, y - h, z), C.d(x, y, z + h) - C.d(x, y, z - h)];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
      const x = lo[0] + ((hi[0] - lo[0]) * (i + 0.5)) / N, y = lo[1] + ((hi[1] - lo[1]) * (j + 0.5)) / N, z = lo[2] + ((hi[2] - lo[2]) * (k + 0.5)) / N, d = C.d(x, y, z);
      if (Math.abs(d - C.d(-x, y, z)) > 0.02) return false;
      if (Math.abs(d) < 0.1 && C.mats.length > 1) {
        const a = nrm(x, y, z), b = nrm(-x, y, z);
        if (C.m(x, y, z, a[0], a[1], a[2]) !== C.m(-x, y, z, b[0], b[1], b[2])) return false;
      }
    }
  }
  return true;
}

/**
 * How high the thing reaches over its origin, m: an n x n grid of columns over its box, each traced
 * down from the box's top to the surface (the box is loose round an intersection: a roof's wedge).
 */
export function topOf(f: Sdf, n = 16): number {
  const C = compile(f), { lo, hi } = C;
  if (![...lo, ...hi].every(Number.isFinite)) return NaN;
  let top = -Infinity;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = lo[0] + ((hi[0] - lo[0]) * (i + 0.5)) / n, y = lo[1] + ((hi[1] - lo[1]) * (j + 0.5)) / n;
    for (let z = hi[2]; z > Math.max(lo[2], top); ) {
      const d = C.d(x, y, z);
      if (d <= 1e-3) { top = z; break; }
      z -= Math.max(d, 1e-3);
    }
  }
  return top;
}

/**
 * Where the thing meets the ground (z = z0, m), a point every px (1 / ppm m) over its box: the field's
 * inside half a px up. None when it doesn't reach the ground (a lamp hanging).
 */
export function contactOf(f: Sdf, clock: Clock, ppm: number, z0 = 0): number[][] {
  const C = compile(f, clock), { lo, hi } = C, s = 1 / ppm, z = z0 + s / 2, out: number[][] = [];
  if (![lo[0], lo[1], hi[0], hi[1]].every(Number.isFinite) || lo[2] > z || hi[2] < z0) return out;
  // (along each row, a point d away from the surface skips the points nearer than d: a tree's crown over
  // a trunk is a few calls a row)
  for (let y = lo[1] + s / 2; y < hi[1]; y += s) for (let x = lo[0] + s / 2; x < hi[0]; ) {
    const d = C.d(x, y, z);
    if (d <= 0) out.push([x, y, z0]);
    x += s * Math.max(1, Math.floor(d / s));
  }
  return out;
}

/** The moments a turnaround's sprites are drawn at: its anims' frames, or the still one. */
export const clocksOf = (frames: number | undefined, fps: number): Clock[] => (frames ? Array.from({ length: frames }, (_, f) => ({ t: (f * 1000) / fps, phase: f / frames, frame: f, frames })) : [STILL]);

/** One heading's view of the thing: the camera (its own origin on the pivot), where the thing stands in it (m), and how far its light turns (degrees). */
export interface Turned { view: unknown; at: [number, number, number]; turn: number }

/**
 * Each heading's view and one size for all. Orthographic ("side", "top", "iso", { kind, pitch }): the
 * camera turned round the thing (`yaw`), its origin on the pivot. Through a perspective() camera: turned
 * as much on its eye, the thing standing where it looks on the ground, the picture cut round it.
 */
export function turnViews(view: unknown, ppm: number, f: Sdf, degs: number[], clocks: Clock[], pad: number): { w: number; h: number; pivot: [number, number]; views: Turned[] } {
  const persp = !!view && typeof view === "object" && "horizon" in view;
  if (!persp) {
    const o = (typeof view === "string" || view === undefined ? { kind: view ?? "iso" } : view) as { kind?: string; pitch?: number; yaw?: number };
    const kind = o.kind ?? "side", y0 = o.yaw ?? (kind === "iso" ? 45 : 0);
    // the camera's yaw that shows the thing's front (-y) toward heading h on the picture: 180 - h
    const yaws = degs.map((h) => 180 - h), at = (yaw: number) => ({ kind, ...(o.pitch !== undefined ? { pitch: o.pitch } : {}), yaw }) as SurfaceView;
    const S = yaws.map((yaw) => surfaceSize(f, { view: at(yaw), ppm, frames: clocks.length, pad }));
    const L = Math.max(...S.map((s) => s.pivot[0])), T = Math.max(...S.map((s) => s.pivot[1]));
    const w = L + Math.max(...S.map((s) => s.w - s.pivot[0])), h = T + Math.max(...S.map((s) => s.h - s.pivot[1]));
    return { w, h, pivot: [L, T], views: yaws.map((yaw) => ({ view: { ...(at(yaw) as object), origin: [L, T] }, at: [0, 0, 0], turn: yaw - y0 })) };
  }
  const P = view as Perspective;
  if (!(P.pitch < 0)) throw new PxError("turnaround: through a perspective() camera, one looking down (pitch below 0)");
  const yaws = degs.map((h) => 180 - h);
  const cams = yaws.map((yaw) => perspective({ w: P.w, horizon: P.horizon, eye: P.eye, focal: P.focal, vp: P.vp, pitch: P.pitch, yaw }));
  let L = 0, R = 0, T = 0, B = 0;
  const feet = cams.map((C) => C.aim(0)), seen = cams.map((C, i) => C.ground(...feet[i]));
  cams.forEach((C, i) => {
    const [fx, fy] = seen[i];
    for (const c of clocks) {
      const K = compile(f, c);
      for (const p of corners(K.lo, K.hi)) {
        const [x, y] = C.ground(p[0] + feet[i][0], p[1] + feet[i][1], p[2]);
        L = Math.max(L, fx - x); R = Math.max(R, x - fx); T = Math.max(T, fy - y); B = Math.max(B, y - fy);
      }
    }
  });
  const px = Math.ceil(L) + pad, py = Math.ceil(T) + pad, w = px + Math.ceil(R) + pad, h = py + Math.ceil(B) + pad;
  return {
    w, h, pivot: [px, py],
    views: cams.map((C, i) => ({ view: { w, horizon: C.horizon + py - seen[i][1], vp: C.vp + px - seen[i][0], eye: C.eye, focal: C.focal, pitch: C.pitch, yaw: C.yaw }, at: feet[i], turn: C.yaw - P.yaw })),
  };
}

/** A light [x, y, z] turned `deg` degrees with a camera turned that much (it stays where it was on the picture). */
export function turnLight(L: number[], deg: number): number[] {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [L[0] * c + L[1] * s, -L[0] * s + L[1] * c, L[2]];
}
