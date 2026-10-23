// 3D files for other tools, written by hand: a voxel grid as MagicaVoxel's .vox (a model at most 256
// cells a side, its colors from the materials; a bigger grid cut in models of 256 placed by a scene
// graph), a mesh as Wavefront .obj (+ .mtl) and glTF 2.0 binary (.glb: one primitive per material,
// positions, normals, indices, a base color each; several moments of a loop as a mesh each, shown in
// turn by an animation). pxl's world is
// [x, y ahead, z up], MagicaVoxel's z is up too; .obj and .glb are Y-up (glTF's +Z toward the viewer),
// so a point goes out as (x, z, -y). Each has a reader of what it needs to check a file back.
import { type Color, LIN } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Mesh3, Voxels } from "./grids.ts";
import { SPLAT_LIGHT, type Splats, splatLight } from "./splats.ts";

const rgb = (c: Color): [number, number, number] => [c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255];
/** MagicaVoxel's model limit, cells a side. */
export const VOX_MAX = 256;

/**
 * A grid as .vox: SIZE, XYZI (a cell each, its color 1 + its material), RGBA (the materials' colors,
 * then grey). Past 256 cells a side, cut in models of 256 at most, each placed by MagicaVoxel's scene
 * graph (a transform over a group, a transform and a shape per model: its `_t` the model's middle,
 * the whole grid's middle at the origin across, its floor at 0).
 */
export function encodeVox(V: Voxels, colors: Color[]): Uint8Array {
  const [nx, ny, nz] = V.n, X = nx, XY = nx * ny;
  // the models: blocks of 256 a side with a cell in them
  const models: { o: number[]; s: number[]; xyz: number[] }[] = [];
  for (let bz = 0; bz < nz; bz += VOX_MAX) for (let by = 0; by < ny; by += VOX_MAX) for (let bx = 0; bx < nx; bx += VOX_MAX) {
    const s = [Math.min(VOX_MAX, nx - bx), Math.min(VOX_MAX, ny - by), Math.min(VOX_MAX, nz - bz)], xyz: number[] = [];
    for (let k = 0; k < s[2]; k++) for (let j = 0; j < s[1]; j++) for (let i = 0; i < s[0]; i++) {
      const v = V.cells[(bz + k) * XY + (by + j) * X + bx + i];
      if (v) xyz.push(i, j, k, Math.min(255, v));
    }
    if (xyz.length || (!bx && !by && !bz)) models.push({ o: [bx, by, bz], s, xyz });
  }
  const many = models.length > 1, bytes: number[] = [];
  const i32 = (v: number) => { bytes.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255); };
  const str = (t: string) => { i32(t.length); for (const ch of t) bytes.push(ch.charCodeAt(0)); };
  const dict = (d: Record<string, string>) => { i32(Object.keys(d).length); for (const [k, v] of Object.entries(d)) { str(k); str(v); } };
  // a chunk: its id, its content's size (filled in after), no children
  const chunk = (id: string, body: () => void) => {
    for (const ch of id) bytes.push(ch.charCodeAt(0));
    const at = bytes.length;
    i32(0); i32(0); body();
    const n = bytes.length - at - 8;
    bytes.splice(at, 4, n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255);
  };
  for (const m of models) {
    chunk("SIZE", () => m.s.forEach(i32));
    chunk("XYZI", () => { i32(m.xyz.length / 4); for (const v of m.xyz) bytes.push(v); });
  }
  if (many) {
    chunk("nTRN", () => { i32(0); dict({}); i32(1); i32(-1); i32(-1); i32(1); dict({}); });
    chunk("nGRP", () => { i32(1); dict({}); i32(models.length); models.forEach((_, k) => i32(2 + 2 * k)); });
    models.forEach((m, k) => {
      const t = [0, 1, 2].map((e) => m.o[e] + (m.s[e] >> 1) - (e < 2 ? V.n[e] >> 1 : 0));
      chunk("nTRN", () => { i32(2 + 2 * k); dict({}); i32(3 + 2 * k); i32(-1); i32(0); i32(1); dict({ _t: t.join(" ") }); });
      chunk("nSHP", () => { i32(3 + 2 * k); dict({}); i32(1); i32(k); dict({}); });
    });
  }
  chunk("RGBA", () => { for (let p = 0; p < 256; p++) { const [r, g, b] = p < colors.length ? rgb(colors[p]) : [128, 128, 128]; bytes.push(r, g, b, 255); } });
  const out = new Uint8Array(20 + bytes.length), dv = new DataView(out.buffer);
  out.set([86, 79, 88, 32]); dv.setInt32(4, 150, true); out.set([77, 65, 73, 78], 8); dv.setInt32(12, 0, true); dv.setInt32(16, bytes.length, true);
  out.set(bytes, 20);
  return out;
}
/** What a .vox says: its size (the span of its voxels, its models put in place), how many voxels, the colors used, its models; `cells` each voxel's place [x, y, z] as the scene graph puts it. */
export function readVox(b: Uint8Array): { size: [number, number, number]; count: number; colors: number; models: number; cells: number[][] } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), tag = (at: number) => String.fromCharCode(...b.subarray(at, at + 4));
  if (tag(0) !== "VOX " || tag(8) !== "MAIN") throw new PxError("not a .vox file");
  let at = 20;
  const sizes: number[][] = [], vox: number[][][] = [], used = new Set<number>(), shapeModel = new Map<number, number>(), trn = new Map<number, { child: number; t: number[] }>();
  while (at + 12 <= b.length) {
    const t = tag(at), len = dv.getInt32(at + 4, true), body = at + 12;
    let p = body;
    const i32 = () => { p += 4; return dv.getInt32(p - 4, true); }, str = () => { const n = i32(); p += n; return String.fromCharCode(...b.subarray(p - n, p)); };
    const dict = () => { const d: Record<string, string> = {}; for (let k = i32(); k > 0; k--) { const key = str(); d[key] = str(); } return d; };
    if (t === "SIZE") sizes.push([i32(), i32(), i32()]);
    if (t === "XYZI") { const n = i32(), v: number[][] = []; for (let i = 0; i < n; i++, p += 4) { v.push([b[p], b[p + 1], b[p + 2]]); used.add(b[p + 3]); } vox.push(v); }
    if (t === "nTRN") { const id = i32(); dict(); const child = i32(); i32(); i32(); i32(); trn.set(id, { child, t: (dict()._t ?? "0 0 0").split(" ").map(Number) }); }
    if (t === "nSHP") { const id = i32(); dict(); i32(); shapeModel.set(id, i32()); }
    at = body + len;
  }
  // each voxel where its model's transform puts it (the model's middle at _t), or as it is with no graph
  const place = vox.map((): number[] => [0, 0, 0]);
  for (const { child, t } of trn.values()) { const m = shapeModel.get(child); if (m !== undefined) place[m] = t.map((v, e) => v - (sizes[m][e] >> 1)); }
  const cells = vox.flatMap((v, m) => v.map((q) => q.map((c, e) => c + place[m][e])));
  const span = (e: number) => { let lo = Infinity, hi = -Infinity; for (const q of cells) { lo = Math.min(lo, q[e]); hi = Math.max(hi, q[e]); } return hi - lo + 1; };
  const size = (vox.length === 1 || !cells.length ? sizes[0] ?? [0, 0, 0] : [span(0), span(1), span(2)]) as [number, number, number];
  return { size, count: cells.length, colors: used.size, models: vox.length, cells };
}

/** A point out to Y-up: (x, z, -y). */
const yUp = (P: Float32Array, i: number): [number, number, number] => [P[i * 3], P[i * 3 + 2], -P[i * 3 + 1]];
const used = (M: Mesh3) => [...new Set(M.quadMat)].sort((a, b) => a - b);
const matName = (M: Mesh3, k: number) => M.mats[k] || "default";

/** A mesh as .obj and its .mtl: the vertices with their normals, a usemtl and its quads per material. */
export function encodeObj(M: Mesh3, name: string, colors: Color[]): { obj: string; mtl: string } {
  const f = (v: number) => +v.toFixed(5), V = M.positions.length / 3, lines = [`# pxl: ${name}, ${V} vertices, ${M.quads.length / 4} quads, Y up`, `mtllib ${name}.mtl`, `o ${name}`];
  for (let i = 0; i < V; i++) lines.push(`v ${yUp(M.positions, i).map(f).join(" ")}`);
  for (let i = 0; i < V; i++) lines.push(`vn ${yUp(M.normals, i).map(f).join(" ")}`);
  const mtl: string[] = [];
  for (const k of used(M)) {
    lines.push(`usemtl ${matName(M, k)}`);
    for (let q = 0; q < M.quadMat.length; q++) if (M.quadMat[q] === k) lines.push(`f ${[0, 1, 2, 3].map((c) => { const v = M.quads[q * 4 + c] + 1; return `${v}//${v}`; }).join(" ")}`);
    const [r, g, b] = rgb(colors[k] ?? 0x808080ff).map((c) => +(c / 255).toFixed(4));
    mtl.push(`newmtl ${matName(M, k)}`, `Kd ${r} ${g} ${b}`, "Ka 0 0 0", "Ks 0 0 0", "d 1", "");
  }
  return { obj: lines.join("\n") + "\n", mtl: mtl.join("\n") };
}

/**
 * A mesh as glTF 2.0 binary: positions and normals shared, a primitive (two triangles a quad) per
 * material, each a base color in linear light. Several meshes (the moments of a loop, `fps` a second)
 * go as a node each under one, shown in turn by an animation (their scales stepped between 0 and 1),
 * which loops in any viewer; a material by its name across them (`colors` per mesh, or one list).
 */
export function encodeGlb(M: Mesh3 | Mesh3[], name: string, colors: Color[] | Color[][], fps = 8): Uint8Array {
  const Ms = Array.isArray(M) ? M : [M], Cs = (Array.isArray(colors[0]) ? colors : Ms.map(() => colors)) as Color[][];
  const names: string[] = [], matColor: Color[] = [];
  const views: { buffer: 0; byteOffset: number; byteLength: number; target?: number }[] = [], accessors: Record<string, unknown>[] = [], parts: ArrayBufferView[] = [];
  let off = 0;
  const view = (a: ArrayBufferView, target?: number) => { views.push({ buffer: 0, byteOffset: off, byteLength: a.byteLength, ...(target ? { target } : {}) }); parts.push(a); off += a.byteLength; return views.length - 1; };
  const meshes = Ms.map((m, f) => {
    const V = m.positions.length / 3, pos = new Float32Array(V * 3), nor = new Float32Array(V * 3);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < V; i++) {
      const p = yUp(m.positions, i), n = yUp(m.normals, i);
      pos.set(p, i * 3); nor.set(n, i * 3);
      for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], pos[i * 3 + e]); hi[e] = Math.max(hi[e], pos[i * 3 + e]); }
    }
    const P = accessors.push({ bufferView: view(pos, 34962), componentType: 5126, count: V, type: "VEC3", min: lo, max: hi }) - 1;
    const N = accessors.push({ bufferView: view(nor, 34962), componentType: 5126, count: V, type: "VEC3" }) - 1;
    const primitives = used(m).map((k) => {
      const t: number[] = [];
      for (let q = 0; q < m.quadMat.length; q++) if (m.quadMat[q] === k) { const [a, b, c, d] = m.quads.subarray(q * 4, q * 4 + 4); t.push(a, b, c, a, c, d); }
      const ix = new Uint32Array(t), mn = matName(m, k);
      if (!names.includes(mn)) { names.push(mn); matColor.push(Cs[f][k] ?? 0x808080ff); }
      return { attributes: { POSITION: P, NORMAL: N }, indices: accessors.push({ bufferView: view(ix, 34963), componentType: 5125, count: ix.length, type: "SCALAR" }) - 1, material: names.indexOf(mn) };
    });
    return { name: Ms.length > 1 ? `${name}_${f}` : name, primitives };
  });
  const lin = (c: number) => +LIN[c].toFixed(5);
  const materials = names.map((mn, i) => { const [r, g, b] = rgb(matColor[i]); return { name: mn, pbrMetallicRoughness: { baseColorFactor: [lin(r), lin(g), lin(b), 1], metallicFactor: 0, roughnessFactor: 1 } }; });
  let nodes: Record<string, unknown>[] = [{ mesh: 0, name }], animations: Record<string, unknown>[] | undefined;
  if (Ms.length > 1) {
    // a key at each moment's start and one at the loop's end; each node's scale 1 on its own moment
    const n = Ms.length, T = new Float32Array(n + 1).map((_, k) => k / fps);
    const input = accessors.push({ bufferView: view(T), componentType: 5126, count: n + 1, type: "SCALAR", min: [0], max: [n / fps] }) - 1;
    nodes = [{ name, children: Ms.map((_, f) => f + 1) }, ...Ms.map((_, f) => ({ mesh: f, name: `${name}_${f}`, ...(f ? { scale: [0, 0, 0] } : {}) }))];
    const samplers = Ms.map((_, f) => {
      const S = new Float32Array((n + 1) * 3).map((_, q) => (Math.floor(q / 3) % n === f ? 1 : 0));
      return { input, output: accessors.push({ bufferView: view(S), componentType: 5126, count: n + 1, type: "VEC3" }) - 1, interpolation: "STEP" };
    });
    animations = [{ name: "loop", samplers, channels: Ms.map((_, f) => ({ sampler: f, target: { node: f + 1, path: "scale" } })) }];
  }
  const json = {
    asset: { version: "2.0", generator: "pxl" }, scene: 0, scenes: [{ nodes: [0] }], nodes, meshes, materials,
    buffers: [{ byteLength: off }], bufferViews: views, accessors, ...(animations ? { animations } : {}),
  };
  // chunks padded to 4 bytes: the JSON with spaces, the binary with zeros
  const js = new TextEncoder().encode(JSON.stringify(json)), jl = Math.ceil(js.length / 4) * 4, bl = Math.ceil(off / 4) * 4;
  const out = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4e4f534a, true); out.set(js, 20); out.fill(0x20, 20 + js.length, 20 + jl);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004e4942, true);
  let at = 28 + jl;
  for (const a of parts) { out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), at); at += a.byteLength; }
  return out;
}
/** What a .glb says: its first mesh's vertices and triangles, its materials (counted from its accessors), its box, its meshes and how long its animation runs (s), checked against its header. */
export function readGlb(b: Uint8Array): { vertices: number; triangles: number; materials: number; min: number[]; max: number[]; meshes: number; seconds: number } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2 || dv.getUint32(8, true) !== b.length) throw new PxError("not a glTF 2.0 binary");
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + jl)));
  const bl = dv.getUint32(20 + jl, true);
  if (dv.getUint32(24 + jl, true) !== 0x004e4942 || bl < json.buffers[0].byteLength) throw new PxError(".glb: its binary chunk is missing or short");
  const prims = json.meshes[0].primitives, acc = json.accessors, anim = json.animations?.[0];
  return {
    vertices: acc[prims[0].attributes.POSITION].count, triangles: prims.reduce((t: number, p: { indices: number }) => t + acc[p.indices].count / 3, 0), materials: json.materials.length,
    min: acc[prims[0].attributes.POSITION].min, max: acc[prims[0].attributes.POSITION].max, meshes: json.meshes.length, seconds: anim ? acc[anim.samplers[0].input].max[0] : 0,
  };
}
/** What an .obj says: its vertices and faces. */
export function readObj(s: string): { vertices: number; faces: number; materials: number } {
  const l = s.split("\n");
  return { vertices: l.filter((x) => x.startsWith("v ")).length, faces: l.filter((x) => x.startsWith("f ")).length, materials: l.filter((x) => x.startsWith("usemtl ")).length };
}

/** The 3DGS layout's color: the zeroth spherical harmonic, so a viewer's 0.5 + C0 f_dc gives it back. */
const C0 = 0.28209479177387814;
const PLY_PROPS = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"];
/**
 * Splats as a .ply in the layout 3D Gaussian Splatting writes (Spark, SuperSplat and the other viewers
 * read it): position, normal, color as SH DC (degree 0: no f_rest), opacity as its logit, scales as
 * their logs, rotation as a quaternion (w, x, y, z); Y up, as .glb: the positions and normals turned
 * (x, z, -y), each rotation turned with them. Each splat's color its material's ramp at its light.
 */
export function encodePly(S: Splats, ramps: Color[][]): Uint8Array {
  const head = new TextEncoder().encode(["ply", "format binary_little_endian 1.0", `comment pxl: ${S.n} splats, Y up`, `element vertex ${S.n}`, ...PLY_PROPS.map((p) => `property float ${p}`), "end_header", ""].join("\n"));
  const out = new Uint8Array(head.length + S.n * PLY_PROPS.length * 4), dv = new DataView(out.buffer);
  out.set(head);
  // the turn from z up to y up, -90 degrees about x: (w, x, y, z)
  const qw = Math.SQRT1_2, qx = -Math.SQRT1_2;
  let at = head.length;
  const f = (v: number) => { dv.setFloat32(at, v, true); at += 4; };
  for (let i = 0; i < S.n; i++) {
    const p = S.pos, n = S.normal, r = S.rot, ramp = ramps[S.mat[i]] ?? ramps[0], lt = splatLight(S, i, SPLAT_LIGHT);
    f(p[i * 3]); f(p[i * 3 + 2]); f(-p[i * 3 + 1]);
    f(n[i * 3]); f(n[i * 3 + 2]); f(-n[i * 3 + 1]);
    const col = ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(lt * (ramp.length - 1))))];
    for (const sh of [24, 16, 8]) f((((col >>> sh) & 255) / 255 - 0.5) / C0);
    const o = Math.min(0.999, Math.max(0.001, S.opacity[i]));
    f(Math.log(o / (1 - o)));
    for (let e = 0; e < 3; e++) f(Math.log(Math.max(1e-6, S.scale[i * 3 + e])));
    const [w, x, y, z] = [r[i * 4], r[i * 4 + 1], r[i * 4 + 2], r[i * 4 + 3]];
    f(qw * w - qx * x); f(qw * x + qx * w); f(qw * y - qx * z); f(qw * z + qx * y);
  }
  return out;
}
/** What a 3DGS .ply says: its splats, its properties, its box (Y up), the mean opacity and scale. */
export function readPly(b: Uint8Array): { count: number; props: string[]; min: number[]; max: number[]; opacity: number; scale: number } {
  const text = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 4096))), end = text.indexOf("end_header\n");
  if (!text.startsWith("ply\n") || end < 0 || !text.includes("format binary_little_endian 1.0")) throw new PxError("not a binary little-endian .ply");
  const lines = text.slice(0, end).split("\n"), count = +(/element vertex (\d+)/.exec(text)?.[1] ?? NaN), props = lines.filter((l) => l.startsWith("property float ")).map((l) => l.slice(15));
  const base = new TextEncoder().encode(text.slice(0, end + 11)).length, stride = props.length * 4, dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (!(count >= 0) || base + count * stride !== b.length) throw new PxError(`.ply: ${count} vertices of ${props.length} floats don't fill its ${b.length} bytes`);
  const get = (i: number, p: string) => dv.getFloat32(base + i * stride + props.indexOf(p) * 4, true);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let op = 0, sc = 0;
  for (let i = 0; i < count; i++) {
    ["x", "y", "z"].forEach((p, e) => { const v = get(i, p); min[e] = Math.min(min[e], v); max[e] = Math.max(max[e], v); });
    op += 1 / (1 + Math.exp(-get(i, "opacity"))); sc += Math.exp(get(i, "scale_0"));
  }
  return { count, props, min, max, opacity: count ? op / count : 0, scale: count ? sc / count : 0 };
}
