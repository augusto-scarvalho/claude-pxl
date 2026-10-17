// Pose skeletons from pose detectors (OpenPose, DWPose/rtmlib, MediaPipe-style name maps), as named
// joints for the pose() guide op. The detector itself stays outside pxl.
import { PxError } from "./errors.ts";

/** Joint name -> [x, y] or [x, y, score]. */
export type Joints = Record<string, number[]>;

/** Names used by pose(): COCO body + feet, plus neck and mid_hip. */
const COCO18 = ["nose", "neck", "r_shoulder", "r_elbow", "r_wrist", "l_shoulder", "l_elbow", "l_wrist", "r_hip", "r_knee",
  "r_ankle", "l_hip", "l_knee", "l_ankle", "r_eye", "l_eye", "r_ear", "l_ear"];
const BODY25 = ["nose", "neck", "r_shoulder", "r_elbow", "r_wrist", "l_shoulder", "l_elbow", "l_wrist", "mid_hip", "r_hip",
  "r_knee", "r_ankle", "l_hip", "l_knee", "l_ankle", "r_eye", "l_eye", "r_ear", "l_ear", "l_big_toe", "l_small_toe",
  "l_heel", "r_big_toe", "r_small_toe", "r_heel"];

export const POSE_BONES: [string, string][] = [
  ["head", "neck"], ["nose", "l_eye"], ["nose", "r_eye"], ["l_eye", "l_ear"], ["r_eye", "r_ear"], ["nose", "neck"],
  ["neck", "l_shoulder"], ["neck", "r_shoulder"], ["l_shoulder", "l_elbow"], ["l_elbow", "l_wrist"],
  ["r_shoulder", "r_elbow"], ["r_elbow", "r_wrist"], ["neck", "mid_hip"], ["mid_hip", "l_hip"], ["mid_hip", "r_hip"],
  ["l_hip", "l_knee"], ["l_knee", "l_ankle"], ["r_hip", "r_knee"], ["r_knee", "r_ankle"],
  ["l_ankle", "l_big_toe"], ["l_ankle", "l_heel"], ["r_ankle", "r_big_toe"], ["r_ankle", "r_heel"],
];

/**
 * Guide colors by side (`sides: true`): left arm magenta, right arm green, left leg orange, right
 * leg cyan, so a limb that swaps sides between frames shows. Previews only.
 */
export const SIDE_COLORS = { l_arm: "#e048d8", r_arm: "#38c048", l_leg: "#f09a28", r_leg: "#28c0e8" };
const LEG = /_(hip|knee|ankle|big_toe|small_toe|heel)$/;

/** The side color of a bone, or undefined for the spine and head. */
export function sideColor(a: string, b: string): string | undefined {
  const end = [a, b].find((n) => n.startsWith("l_") || n.startsWith("r_"));
  if (!end || /_(eye|ear)$/.test(end)) return undefined;
  return SIDE_COLORS[`${end[0]}_${LEG.test(end) ? "leg" : "arm"}` as keyof typeof SIDE_COLORS];
}

/** One direction of a pxl motion file, placed: whole-pixel joints per frame. */
export interface Motion {
  name: string;
  dir: string;
  /** Frame durations (ms). */
  ms: number[];
  /** Joints per frame, { name: [x, y] }, with the floor point moved to `at` and scaled. */
  frames: Record<string, [number, number]>[];
  /** Per frame, each joint's distance toward the viewer (larger = nearer): which limb is in front. */
  depth: Record<string, number>[];
  /** Per frame, [left, right] foot on the ground (1) or not (0). */
  contact: [number, number][];
}

/** Read a pxl motion file (format "pxl-motion/1") for one direction, scaled and placed. */
export function readMotion(src: unknown, opts: { dir?: string; scale?: number; at?: [number, number] } = {}): Motion {
  const m = src as { format?: string; name?: string; floor?: number[]; joints?: string[]; directions?: Record<string, { ms: number[]; contact: [number, number][]; frames: number[][][] }> };
  if (m?.format !== "pxl-motion/1" || !Array.isArray(m.joints) || !m.directions)
    throw new PxError('motion: not a pxl motion file (format "pxl-motion/1"); see examples/motion/');
  const dirs = Object.keys(m.directions), dir = opts.dir ?? dirs[0], d = m.directions[dir];
  if (!d) throw new PxError(`motion: no direction '${dir}' in ${m.name ?? "the file"}; it has ${dirs.join(" ")}`);
  const scale = opts.scale ?? 1, [fx, fy] = m.floor ?? [0, 0], [ax, ay] = opts.at ?? [fx, fy];
  if (!(scale > 0) || ![ax, ay].every(Number.isFinite)) throw new PxError(`motion: scale must be > 0 and at [x, y], got ${JSON.stringify(opts)}`);
  const names = m.joints;
  return {
    name: m.name ?? "",
    dir,
    ms: [...d.ms],
    frames: d.frames.map((f) => Object.fromEntries(names.map((n, i) => [n, [Math.round(ax + (f[i][0] - fx) * scale), Math.round(ay + (f[i][1] - fy) * scale)] as [number, number]]))),
    depth: d.frames.map((f) => Object.fromEntries(names.map((n, i) => [n, f[i][2] ?? 0]))),
    contact: d.contact.map((c) => [c[0], c[1]] as [number, number]),
  };
}

/**
 * Joints from a detector's output: a { name: [x, y, score?] } map, or OpenPose JSON
 * ({ people: [{ pose_keypoints_2d: [x, y, c, ...] }] }, COCO-18 or BODY_25). Fills in neck and
 * mid_hip from the shoulders / hips when the format has none.
 */
export function readJoints(src: unknown): Joints {
  let j: Joints;
  const people = (src as { people?: { pose_keypoints_2d?: unknown }[] })?.people;
  if (Array.isArray(people)) {
    const kp = people[0]?.pose_keypoints_2d;
    if (!Array.isArray(kp)) throw new PxError("pose: OpenPose JSON with no people[0].pose_keypoints_2d");
    const names = kp.length === 75 ? BODY25 : kp.length === 54 ? COCO18 : undefined;
    if (!names) throw new PxError(`pose: pose_keypoints_2d has ${kp.length / 3} points; COCO-18 (18) and BODY_25 (25) are known`);
    j = {};
    // OpenPose marks missing joints with 0, 0, 0
    names.forEach((n, i) => { if (kp[i * 3 + 2] > 0) j[n] = [kp[i * 3], kp[i * 3 + 1], kp[i * 3 + 2]]; });
  } else if (src && typeof src === "object" && !Array.isArray(src)) {
    j = {};
    for (const [n, v] of Object.entries(src)) {
      if (!Array.isArray(v) || v.length < 2 || !v.slice(0, 3).every(Number.isFinite))
        throw new PxError(`pose: joint '${n}' must be [x, y] or [x, y, score], got ${JSON.stringify(v)}`);
      j[n] = v as number[];
    }
  } else throw new PxError('pose: give a { name: [x, y, score?] } map or OpenPose JSON');
  const mid = (a: string, b: string): number[] | undefined =>
    j[a] && j[b] ? [(j[a][0] + j[b][0]) / 2, (j[a][1] + j[b][1]) / 2, Math.min(j[a][2] ?? 1, j[b][2] ?? 1)] : undefined;
  j.neck ??= mid("l_shoulder", "r_shoulder")!;
  j.mid_hip ??= mid("l_hip", "r_hip")!;
  for (const n of ["neck", "mid_hip"]) if (!j[n]) delete j[n];
  return j;
}
