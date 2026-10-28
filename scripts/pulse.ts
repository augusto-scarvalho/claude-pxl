// Does an animation's relief hold still? Normals made a frame at a time (bump("hybrid"), "dome") can
// turn on a part that only moved, and under a lamp the light on it then flickers. Between each frame
// and the next: the shift that carries most of the art (a walk's bob), the pixels that shift carries
// unchanged (the pixel and its 8 neighbours the same colors: a part that only moved), and how many of
// those turned their normal by more than 10°. lighting.md has what it found on the walks.
//
//   node scripts/pulse.ts lib/characters/traveler.px.js tr_walk_e
//   node scripts/pulse.ts walk.px.js walk walk_hybrid walk_dome      one walk, each with its own normals
import { resolve } from "node:path";
import { loadProject } from "../src/node/load.ts";
import { frameCount, frameTime } from "../src/node/shot.ts";

const [file, ...names] = process.argv.slice(2);
if (!file || !names.length) { console.error("usage: node scripts/pulse.ts <art.px.js> <anim> [<anim> ...]"); process.exit(2); }
const p = loadProject(resolve(file)), TURN = Math.cos((10 * Math.PI) / 180);
for (const name of names) {
  const n = frameCount(p, name), F = Array.from({ length: n }, (_, f) => p.image(name, 0, frameTime(p, name, f))), { w, h } = F[0];
  const drawn = (c: number) => (c & 255) !== 0, shifts: string[] = [], each: number[] = [];
  let kept = 0, turned = 0, px = 0, bare = 0;
  for (let f = 0; f < n; f++) {
    const A = F[f], B = F[(f + 1) % n];
    let dx = 0, dy = 0, most = -1;
    for (let v = -3; v <= 3; v++) for (let u = -3; u <= 3; u++) {
      let m = 0;
      for (let i = 0; i < w * h; i++) if (drawn(A.data[i]) && A.data[i] === B.get((i % w) + u, ((i / w) | 0) + v)) m++;
      if (m > most) [most, dx, dy] = [m, u, v];
    }
    let t = 0;
    for (let i = 0; i < w * h; i++) {
      if (!drawn(A.data[i])) continue;
      px++;
      const x = i % w, y = (i - x) / w;
      let same = true;
      for (let v = -1; v <= 1 && same; v++) for (let u = -1; u <= 1 && same; u++) same = A.get(x + u, y + v) === B.get(x + u + dx, y + v + dy);
      if (!same) continue;
      kept++;
      // a normal's z is 0 where the pixel has none: one gained or lost counts as turned
      const a = A.norm, b = B.norm, j = (y + dy) * w + x + dx, na = !!a?.[i * 3 + 2], nb = !!b?.[j * 3 + 2];
      if (!na || !nb) { if (na || nb) t++; else bare++; continue; }
      const dot = a[i * 3] * b[j * 3] + a[i * 3 + 1] * b[j * 3 + 1] + a[i * 3 + 2] * b[j * 3 + 2];
      if (dot < TURN * Math.hypot(a![i * 3], a![i * 3 + 1], a![i * 3 + 2]) * Math.hypot(b![j * 3], b![j * 3 + 1], b![j * 3 + 2])) t++;
    }
    shifts.push(`${dx},${dy}`);
    each.push(t);
    turned += t;
  }
  const pct = (a: number, b: number) => `${((100 * a) / Math.max(1, b)).toFixed(0)}%`;
  console.log(`${name}: ${n} frames of ${w}x${h}, ${(px / n).toFixed(0)} px drawn a frame; ` +
    `the parts that only moved: ${pct(kept, px)} of them (shifts ${shifts.join(" ")})`);
  console.log(`  their normals turned by more than 10°: ${pct(turned, kept)} (each step: ${each.join(" ")} px)${bare ? `; ${pct(bare, kept)} have none` : ""}`);
}
