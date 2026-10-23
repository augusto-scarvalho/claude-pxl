// A field made into other things (sdf.ts): a voxel grid, its occupancy sampled at each cell's middle
// with the material there; and a mesh, its surface found between the corners of a grid by surface nets
// (a vertex in each cell the surface crosses, at the middle of where it crosses the cell's edges, then
// moved onto it; a quad across each edge it crosses). Cells may be of any size in meters, one number or
// [x, y, z] (flat slabs, tall bricks); the grid's resolution follows from the field's box. Both are
// made at a moment of the clock, and lined up on multiples of the size, so a field moving a little
// moves its cells by whole cells and nothing shimmers.
import { PxError } from "./errors.ts";
import { type Clock, type Compiled, STILL, Sdf, type V3, article, compile } from "./sdf.ts";

/** A voxel grid: n cells along each axis, each `size` m, from `origin` (its low corner, in the field's frame); a cell 0 when empty, else 1 + its material's index in `mats` ("" for none). */
export class Voxels {
  readonly kind = "voxels";
  readonly n: V3;
  readonly size: V3;
  readonly origin: V3;
  readonly cells: Uint8Array;
  readonly mats: string[];
  constructor(n: V3, size: V3, origin: V3, cells: Uint8Array, mats: string[]) { this.n = n; this.size = size; this.origin = origin; this.cells = cells; this.mats = mats; }
  /** how many cells are filled */
  get count(): number { let k = 0; for (const v of this.cells) if (v) k++; return k; }
  /** its box in meters, the field's frame */
  bounds(): [V3, V3] { return [[...this.origin] as V3, this.origin.map((o, e) => o + this.n[e] * this.size[e]) as V3]; }
  at(i: number, j: number, k: number): number { return i < 0 || j < 0 || k < 0 || i >= this.n[0] || j >= this.n[1] || k >= this.n[2] ? 0 : this.cells[(k * this.n[1] + j) * this.n[0] + i]; }
  /** its outside as a mesh: faces of a material in one plane merged into rectangles */
  mesh(): Mesh3 { return voxelFaces(this); }
  /** mesh()'s faces of it, a block world */
  get faces(): { mat: string; pts: V3[] }[] { return this.mesh().faces; }
}

/** A mesh in meters (the field's frame): quads of 4 vertex indices, each of a material; a normal at each vertex. `faces` are what mesh() draws. */
export class Mesh3 {
  readonly kind = "mesh";
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly quads: Uint32Array;
  readonly quadMat: Uint16Array;
  readonly mats: string[];
  constructor(positions: Float32Array, normals: Float32Array, quads: Uint32Array, quadMat: Uint16Array, mats: string[]) { this.positions = positions; this.normals = normals; this.quads = quads; this.quadMat = quadMat; this.mats = mats; }
  /** mesh()'s faces: a quad each, its material by name (one with none takes the first of the field's) */
  get faces(): { mat: string; pts: V3[] }[] {
    const P = this.positions, out: { mat: string; pts: V3[] }[] = [];
    for (let q = 0; q < this.quads.length / 4; q++) out.push({ mat: this.mats[this.quadMat[q]] || this.mats.find(Boolean) || "", pts: [0, 1, 2, 3].map((k) => { const v = this.quads[q * 4 + k] * 3; return [P[v], P[v + 1], P[v + 2]] as V3; }) });
    return out;
  }
}

/** The size option: one number or [x, y, z], each above 0. */
export function sizeOf(size: unknown, what: string): V3 {
  const s = typeof size === "number" ? [size, size, size] : size;
  if (!Array.isArray(s) || s.length !== 3 || !s.every((v) => typeof v === "number" && v > 0 && Number.isFinite(v)))
    throw new PxError(`${what}: size is a cell's size in m, one number or [x, y, z] (a flat slab [0.1, 0.1, 0.05]), got ${JSON.stringify(size)}`);
  return s as V3;
}
/** At most this many cells: past it, a bigger size. */
const MAX_CELLS = 16e6;
function needField(f: unknown, what: string): asserts f is Sdf {
  if (!(f instanceof Sdf)) throw new PxError(`${what} is made from a distance field (sdf.sphere(...) and the rest)${f && typeof f === "object" && "kind" in f ? `, not ${article((f as { kind: string }).kind)}` : ""}`);
}
/**
 * The grid a field's box needs at a size, and how many cells: across (x, y) a cell's middle on each
 * multiple of the size, so the upright through the origin (a trunk, a house's middle) runs down the
 * middle of a column of cells; up (z) a cell's foot on each multiple, so the ground (z 0) is a floor.
 */
function lattice(C: Compiled, s: V3, pad: number, what: string, centered = false): { origin: V3; n: V3 } {
  if (![...C.lo, ...C.hi].every(Number.isFinite)) throw new PxError(`${what}: the field goes on without end (a plane): intersect it with something that ends`);
  const half = (e: number) => (centered && e < 2 ? 0.5 : 0);
  const origin = C.lo.map((v, e) => (Math.floor(v / s[e] + half(e)) - half(e) - pad) * s[e]) as V3;
  const n = C.hi.map((v, e) => Math.ceil((v - origin[e]) / s[e]) + pad) as V3;
  if (n[0] * n[1] * n[2] > MAX_CELLS) throw new PxError(`${what}: ${n.join(" x ")} cells at ${s.join(" x ")} m is too many (${MAX_CELLS / 1e6} million at most): a bigger size`);
  return { origin, n };
}
/** The normal at a point by four taps (the tetrahedron), h apart. */
function normalAt(d: Compiled["d"], x: number, y: number, z: number, h: number): V3 {
  const a = d(x + h, y - h, z - h), b = d(x - h, y - h, z + h), c = d(x - h, y + h, z - h), e = d(x + h, y + h, z + h);
  const nx = a - b - c + e, ny = -a - b + c + e, nz = -a + b - c + e, l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/**
 * A field as voxels: a cell filled where the surface comes within `fill` of half a cell of its middle
 * (0: the middle inside; default 0.5, so a limb thinner than a cell keeps a line of cells and nothing
 * comes apart; 1 fattens it by half a cell), of the material there.
 */
export function voxelize(field: unknown, o: { size?: unknown; clock?: Clock; fill?: number } = {}): Voxels {
  needField(field, "sdf.voxels");
  const fill = o.fill ?? 0.5;
  if (!(fill >= 0 && fill <= 1)) throw new PxError(`sdf.voxels: fill is 0..1 (how near the surface comes to a cell's middle, in halves of a cell), got ${JSON.stringify(o.fill)}`);
  const s = sizeOf(o.size, "sdf.voxels"), C = compile(field, o.clock ?? STILL), { origin, n } = lattice(C, s, 0, "sdf.voxels", true), near = (fill * Math.min(...s)) / 2;
  const cells = new Uint8Array(n[0] * n[1] * n[2]), mats = [...C.mats], none = mats.length, h = Math.min(...s) * 0.25;
  let unnamed = false;
  for (let k = 0, q = 0; k < n[2]; k++)
    for (let j = 0; j < n[1]; j++)
      for (let i = 0; i < n[0]; i++, q++) {
        const x = origin[0] + (i + 0.5) * s[0], y = origin[1] + (j + 0.5) * s[1], z = origin[2] + (k + 0.5) * s[2];
        if (C.d(x, y, z) > near) continue;
        const nn = normalAt(C.d, x, y, z, h), m = C.m(x, y, z, nn[0], nn[1], nn[2]);
        if (m < 0) unnamed = true;
        cells[q] = 1 + (m < 0 ? none : m);
      }
  if (unnamed) mats.push("");
  if (mats.length > 255) throw new PxError(`sdf.voxels: ${mats.length} materials, 255 at most`);
  return new Voxels(n, s, origin, cells, mats);
}

/**
 * A field as a mesh by surface nets: the field sampled at the corners of cells `size` m; in each cell
 * whose corners aren't all inside or all out, a vertex where its edges cross the surface (their
 * middle), moved onto the surface along the field's slope; across each edge the surface crosses, a
 * quad of the four cells round it, turned to face out; its material at its middle.
 */
export function surfaceNets(field: unknown, o: { size?: unknown; clock?: Clock } = {}): Mesh3 {
  needField(field, "sdf.mesh");
  const s = sizeOf(o.size, "sdf.mesh"), C = compile(field, o.clock ?? STILL), { origin, n } = lattice(C, s, 1, "sdf.mesh");
  // corners: one more than cells each way
  const X = n[0] + 1, Y = n[1] + 1, Z = n[2] + 1, val = new Float32Array(X * Y * Z), h = Math.min(...s) * 0.25;
  for (let k = 0, q = 0; k < Z; k++) for (let j = 0; j < Y; j++) for (let i = 0; i < X; i++, q++) val[q] = C.d(origin[0] + i * s[0], origin[1] + j * s[1], origin[2] + k * s[2]);
  const vid = new Int32Array(n[0] * n[1] * n[2]).fill(-1), pos: number[] = [], nor: number[] = [];
  const at = (i: number, j: number, k: number) => val[(k * Y + j) * X + i];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float64Array(8);
  for (let k = 0; k < n[2]; k++)
    for (let j = 0; j < n[1]; j++)
      for (let i = 0; i < n[0]; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) { cv[c] = at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)); if (cv[c] <= 0) inside++; }
        if (inside === 0 || inside === 8) continue;
        let sx = 0, sy = 0, sz = 0, m = 0;
        for (const [a, b] of EDGES) {
          if ((cv[a] <= 0) === (cv[b] <= 0)) continue;
          const t = cv[a] / (cv[a] - cv[b]);
          sx += (a & 1) + t * ((b & 1) - (a & 1)); sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1)); sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
          m++;
        }
        let x = origin[0] + (i + sx / m) * s[0], y = origin[1] + (j + sy / m) * s[1], z = origin[2] + (k + sz / m) * s[2];
        // onto the surface: a step back along the slope by the distance (twice), kept in its cell
        for (let it = 0; it < 2; it++) {
          const v = C.d(x, y, z), g = normalAt(C.d, x, y, z, h);
          x = Math.max(origin[0] + i * s[0], Math.min(origin[0] + (i + 1) * s[0], x - g[0] * v));
          y = Math.max(origin[1] + j * s[1], Math.min(origin[1] + (j + 1) * s[1], y - g[1] * v));
          z = Math.max(origin[2] + k * s[2], Math.min(origin[2] + (k + 1) * s[2], z - g[2] * v));
        }
        vid[(k * n[1] + j) * n[0] + i] = pos.length / 3;
        pos.push(x, y, z);
        nor.push(...normalAt(C.d, x, y, z, h));
      }
  const cell = (i: number, j: number, k: number) => (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2] ? -1 : vid[(k * n[1] + j) * n[0] + i]);
  const quads: number[] = [], qm: number[] = [], mats = [...C.mats], none = mats.length;
  let unnamed = false;
  // each edge of the corner lattice the surface crosses: along x from corner (i, j, k), the cells
  // round it are (i, j-1..j, k-1..k); likewise along y and z
  for (let axis = 0; axis < 3; axis++) {
    const [u, w] = axis === 0 ? [1, 2] : axis === 1 ? [2, 0] : [0, 1];
    for (let k = 0; k < Z; k++)
      for (let j = 0; j < Y; j++)
        for (let i = 0; i < X; i++) {
          const c0 = [i, j, k], c1 = [i, j, k];
          c1[axis]++;
          if (c1[axis] >= [X, Y, Z][axis]) continue;
          const a = at(c0[0], c0[1], c0[2]), b = at(c1[0], c1[1], c1[2]);
          if ((a <= 0) === (b <= 0)) continue;
          const ring = [[0, 0], [-1, 0], [-1, -1], [0, -1]].map(([du, dw]) => { const p = [i, j, k]; p[u] += du; p[w] += dw; return cell(p[0], p[1], p[2]); });
          if (ring.some((v) => v < 0)) continue;
          // (the surface through a corner exactly: four vertices on one point, nothing to draw)
          const P = (r: number, e: number) => pos[ring[r] * 3 + e], d1 = [0, 1, 2].map((e) => P(2, e) - P(0, e)), d2 = [0, 1, 2].map((e) => P(3, e) - P(1, e));
          if (Math.hypot(d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]) < 1e-9 * s[0] * s[1]) continue;
          // facing out: inside to outside along the axis is the way out of it; u x w along the axis turns the ring that way
          if (a <= 0) quads.push(ring[0], ring[1], ring[2], ring[3]); else quads.push(ring[3], ring[2], ring[1], ring[0]);
          const mid = [0, 1, 2].map((e) => ring.reduce((t, v) => t + pos[v * 3 + e], 0) / 4), g = normalAt(C.d, mid[0], mid[1], mid[2], h), mm = C.m(mid[0], mid[1], mid[2], g[0], g[1], g[2]);
          if (mm < 0) unnamed = true;
          qm.push(mm < 0 ? none : mm);
        }
  }
  if (unnamed) mats.push("");
  return new Mesh3(new Float32Array(pos), new Float32Array(nor), new Uint32Array(quads), new Uint16Array(qm), mats);
}

/**
 * A voxel grid's outside as quads (each face between a filled cell and an empty one, in the filled
 * cell's material), faces of one material lying in one plane merged into rectangles (greedy meshing):
 * a voxel model for mesh() or a file.
 */
export function voxelFaces(V: Voxels): Mesh3 {
  const pos: number[] = [], nor: number[] = [], quads: number[] = [], qm: number[] = [], { n, size: s, origin: o } = V;
  for (let axis = 0; axis < 3; axis++)
    for (const dir of [-1, 1]) {
      const [u, w] = axis === 0 ? [1, 2] : axis === 1 ? [2, 0] : [0, 1], N = [0, 0, 0];
      N[axis] = dir;
      for (let d = 0; d < n[axis]; d++) {
        // the slice's faces: the material of each cell whose neighbour that way is empty
        const mask = new Int16Array(n[u] * n[w]);
        for (let b = 0; b < n[w]; b++)
          for (let a = 0; a < n[u]; a++) {
            const p = [0, 0, 0];
            p[axis] = d; p[u] = a; p[w] = b;
            const v = V.at(p[0], p[1], p[2]);
            p[axis] += dir;
            mask[b * n[u] + a] = v && !V.at(p[0], p[1], p[2]) ? v : 0;
          }
        for (let b = 0; b < n[w]; b++)
          for (let a = 0; a < n[u]; a++) {
            const v = mask[b * n[u] + a];
            if (!v) continue;
            let wa = 1, wb = 1;
            while (a + wa < n[u] && mask[b * n[u] + a + wa] === v) wa++;
            grow: while (b + wb < n[w]) { for (let t = 0; t < wa; t++) if (mask[(b + wb) * n[u] + a + t] !== v) break grow; wb++; }
            for (let bb = 0; bb < wb; bb++) for (let t = 0; t < wa; t++) mask[(b + bb) * n[u] + a + t] = 0;
            const corner = (da: number, db: number) => { const p = [0, 0, 0]; p[axis] = d + (dir > 0 ? 1 : 0); p[u] = a + da; p[w] = b + db; return p.map((c, e) => o[e] + c * s[e]); };
            const i0 = pos.length / 3;
            for (const [da, db] of [[0, 0], [wa, 0], [wa, wb], [0, wb]]) { pos.push(...corner(da, db)); nor.push(...N); }
            // u x w is +axis: counterclockwise seen from outside when facing +axis
            if (dir > 0) quads.push(i0, i0 + 1, i0 + 2, i0 + 3); else quads.push(i0 + 3, i0 + 2, i0 + 1, i0);
            qm.push(v - 1);
          }
      }
    }
  return new Mesh3(new Float32Array(pos), new Float32Array(nor), new Uint32Array(quads), new Uint16Array(qm), V.mats);
}
