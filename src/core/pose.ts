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
  ["nose", "l_eye"], ["nose", "r_eye"], ["l_eye", "l_ear"], ["r_eye", "r_ear"], ["nose", "neck"],
  ["neck", "l_shoulder"], ["neck", "r_shoulder"], ["l_shoulder", "l_elbow"], ["l_elbow", "l_wrist"],
  ["r_shoulder", "r_elbow"], ["r_elbow", "r_wrist"], ["neck", "mid_hip"], ["mid_hip", "l_hip"], ["mid_hip", "r_hip"],
  ["l_hip", "l_knee"], ["l_knee", "l_ankle"], ["r_hip", "r_knee"], ["r_knee", "r_ankle"],
  ["l_ankle", "l_big_toe"], ["l_ankle", "l_heel"], ["r_ankle", "r_big_toe"], ["r_ankle", "r_heel"],
];

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
