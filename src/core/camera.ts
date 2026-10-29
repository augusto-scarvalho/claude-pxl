// A scene's camera (side-scrollers, platformers): the picture is a window onto a bigger world, moved each
// frame to follow a target as a game's camera does. The behaviours and their names are Itay Keren's ("Scroll
// Back: The Theory and Practice of Cameras in Side-Scrollers", 2015): a camera window, a look-ahead that turns
// with the target (dual forward focus), platform snapping, lerp smoothing. The window (16 px wide, 64 tall in
// the air), the speed limit (6 px a frame) and the look-ahead (64 px) are Sonic's, as the Sonic Physics Guide
// gives them for Sonic 2 and Sonic CD at 60 fps; the lerp (a tenth of the way a frame at 60 fps), the rest
// point and the turn are pxl's choices. Speeds are kept a second, so they hold at any fps.
import { PxError } from "./errors.ts";

/** The target at a frame: its feet [x, y] in the world, and with a third value whether it stands on something. */
export type Target = (f: number) => readonly unknown[] | null | undefined;
export interface CameraOpts {
  /** the world's size, px (the picture, the scene's w x h, is the window onto it) */
  world: [number, number];
  /** what it follows: a function of the frame giving [x, y] (a route's `at`) or [x, y, onGround], or a stamp's id */
  follow?: Target | string;
  /** where the target rests on the picture, a share of its width and height (default [0.5, 0.66]) */
  rest?: [number, number];
  /** the box round that point the target moves in without moving the camera, px (default [16, 64]: Sonic's) */
  window?: [number, number];
  /** px the camera looks ahead of the target, the way it last went (default 64: Sonic CD's extended camera) */
  ahead?: number;
  /** px the target goes back before the look-ahead turns round (default 16) */
  turn?: number;
  /** share of the way to where it should be the camera goes a frame (default 0.1 a frame at 60 fps) */
  ease?: number;
  /** the most px a frame it moves (default 360 px a second: Sonic's ground tracking, 6 px a frame at 60 fps) */
  speed?: number;
  /** platform snap: y follows when the target lands somewhere, not while it jumps (default true) */
  snap?: boolean;
  /** with no third value: frames the target's y stays put before it counts as standing (default 3) */
  settle?: number;
}
export const CAMERA_OPTS = ["world", "follow", "rest", "window", "ahead", "turn", "ease", "speed", "snap", "settle"];

const pair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);

/**
 * The camera's top-left in the world at each frame, whole px, worked out frame by frame from 0 (it carries
 * its way and its speed from one frame to the next): `ms` a frame (for the defaults given a second), `view`
 * the picture's size, `target` the follow (an id already turned into a function).
 */
export function cameraPath(o: CameraOpts, view: [number, number], ms: number, target: Target): (f: number) => [number, number] {
  const bad = (what: string, v: unknown) => new PxError(`camera: ${what}, got ${JSON.stringify(v)}`);
  if (!pair(o.world) || !(o.world[0] > 0 && o.world[1] > 0)) throw bad("world is the world's [w, h] in px", o.world);
  const k = ms / (1000 / 60), [w, h] = view, [W, H] = o.world;
  const num = (key: "ahead" | "turn" | "speed" | "settle", def: number) => {
    const v = o[key] ?? def;
    if (!(Number.isFinite(v) && v >= 0)) throw bad(`${key} is a number of ${key === "settle" ? "frames" : "px"}, 0 or more`, v);
    return v;
  };
  const rest = o.rest ?? [0.5, 0.66], win = o.window ?? [16, 64];
  if (!pair(rest)) throw bad("rest is where the target rests on the picture, [x, y] shares of its size", rest);
  if (!pair(win) || win.some((v) => v < 0)) throw bad("window is the box [w, h] px the target moves in freely", win);
  const ease = o.ease ?? 1 - 0.9 ** k;
  if (!(ease > 0 && ease <= 1)) throw bad("ease is the share of the way it goes a frame, above 0 up to 1", ease);
  const ahead = num("ahead", 64), turn = num("turn", 16), speed = num("speed", Math.max(1, Math.round(6 * k))), settle = num("settle", 3);
  const R = [rest[0] * w, rest[1] * h], snap = o.snap ?? true;
  const clampX = (x: number) => Math.min(Math.max(0, W - w), Math.max(0, x)), clampY = (y: number) => Math.min(Math.max(0, H - h), Math.max(0, y));
  // the state carried: where it is and where it heads for, the way the target last went and its farthest point that way, its y and for how long
  let cam: number[] | undefined, goal = [0, 0], dir = 1, far = 0, lastY = NaN, still = 0;
  const out: [number, number][] = [];
  const step = (f: number) => {
    const t = target(f);
    if (t && !(t.length >= 2 && Number.isFinite(t[0]) && Number.isFinite(t[1]))) throw bad(`follow gives [x, y] or [x, y, onGround] (frame ${f})`, t);
    if (t) {
      const tx = t[0] as number, ty = t[1] as number;
      // the look-ahead turns round once the target has gone `turn` px back from its farthest (dual forward focus)
      if (!cam) far = tx;
      if (dir * (tx - far) > 0) far = tx;
      else if (dir * (far - tx) >= turn) { dir = -dir; far = tx; }
      still = ty === lastY ? still + 1 : 0;
      lastY = ty;
      const ground = t.length > 2 ? !!t[2] : still >= settle;
      // x: the point ahead kept in the window round the rest point (where it is first seen, at the rest point)
      const P = tx + dir * ahead;
      if (!cam) goal = [P - R[0], ty - R[1]];
      const gx = Math.min(Math.max(goal[0], P - R[0] - win[0] / 2), P - R[0] + win[0] / 2);
      // y: on the ground, the target back at its rest; in the air (or snap off), only out of the window
      const gy = snap && ground ? ty - R[1] : Math.min(Math.max(goal[1], ty - R[1] - win[1] / 2), ty - R[1] + win[1] / 2);
      goal = [clampX(gx), clampY(gy)];
      // (where it is first seen, the camera starts on it)
      cam ??= [...goal];
    }
    // eased toward it, no more than `speed` px a frame
    if (cam) for (const i of [0, 1]) cam[i] += Math.max(-speed, Math.min(speed, (goal[i] - cam[i]) * ease));
    out[f] = cam ? [clampX(Math.round(cam[0])), clampY(Math.round(cam[1]))] : [0, 0];
  };
  return (f: number) => {
    if (!(Number.isInteger(f) && f >= 0)) throw bad("a frame is a whole number from 0", f);
    for (let i = out.length; i <= f; i++) step(i);
    return out[f];
  };
}
