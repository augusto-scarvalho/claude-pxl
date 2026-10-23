// 3D files for other tools, written by hand: a voxel grid as MagicaVoxel's .vox (a model at most 256
// cells a side, its colors from the materials), a mesh as Wavefront .obj (+ .mtl) and glTF 2.0 binary
// (.glb: one primitive per material, positions, normals, indices, a base color each). pxl's world is
// [x, y ahead, z up], MagicaVoxel's z is up too; .obj and .glb are Y-up (glTF's +Z toward the viewer),
// so a point goes out as (x, z, -y). Each has a reader of what it needs to check a file back.
import { type Color, LIN } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Mesh3, Voxels } from "./grids.ts";

const rgb = (c: Color): [number, number, number] => [c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255];
/** MagicaVoxel's model limit, cells a side. */
export const VOX_MAX = 256;

/** A grid as .vox: SIZE, XYZI (a cell each, its color 1 + its material), RGBA (the materials' colors, then grey). */
export function encodeVox(V: Voxels, colors: Color[]): Uint8Array {
  const [nx, ny, nz] = V.n;
  if (nx > VOX_MAX || ny > VOX_MAX || nz > VOX_MAX) {
    const ext = V.n.map((n, e) => n * V.size[e]), fit = ext.map((x) => x / VOX_MAX);
    throw new PxError(`vox: ${nx} x ${ny} x ${nz} cells; MagicaVoxel holds ${VOX_MAX} a side. Its ${ext.map((x) => x.toFixed(2)).join(" x ")} m fit at a size of [${fit.map((x) => Math.ceil(x * 1000) / 1000).join(", ")}] m or more (or cut it in parts, each its own grid)`);
  }
  const n = V.count, size = 12 + 12 + (12 + 4 + 4 * n) + (12 + 1024), out = new Uint8Array(8 + 12 + size), dv = new DataView(out.buffer);
  let at = 0;
  const id = (s: string) => { for (const ch of s) out[at++] = ch.charCodeAt(0); };
  const i32 = (v: number) => { dv.setInt32(at, v, true); at += 4; };
  id("VOX "); i32(150);
  id("MAIN"); i32(0); i32(size);
  id("SIZE"); i32(12); i32(0); i32(nx); i32(ny); i32(nz);
  id("XYZI"); i32(4 + 4 * n); i32(0); i32(n);
  for (let k = 0, q = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, q++) {
    const v = V.cells[q];
    if (!v) continue;
    out[at++] = i; out[at++] = j; out[at++] = k; out[at++] = Math.min(255, v);
  }
  id("RGBA"); i32(1024); i32(0);
  for (let p = 0; p < 256; p++) {
    const [r, g, b] = p < colors.length ? rgb(colors[p]) : [128, 128, 128];
    out[at++] = r; out[at++] = g; out[at++] = b; out[at++] = 255;
  }
  return out;
}
/** What a .vox says: its size, how many voxels, the colors used. */
export function readVox(b: Uint8Array): { size: [number, number, number]; count: number; colors: number } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), tag = (at: number) => String.fromCharCode(...b.subarray(at, at + 4));
  if (tag(0) !== "VOX " || tag(8) !== "MAIN") throw new PxError("not a .vox file");
  let at = 20, size: [number, number, number] = [0, 0, 0], count = 0;
  const used = new Set<number>();
  while (at + 12 <= b.length) {
    const t = tag(at), len = dv.getInt32(at + 4, true), body = at + 12;
    if (t === "SIZE") size = [dv.getInt32(body, true), dv.getInt32(body + 4, true), dv.getInt32(body + 8, true)];
    if (t === "XYZI") { count = dv.getInt32(body, true); for (let i = 0; i < count; i++) used.add(b[body + 4 + i * 4 + 3]); }
    at = body + len;
  }
  return { size, count, colors: used.size };
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

/** A mesh as glTF 2.0 binary: positions and normals shared, a primitive (two triangles a quad) per material, each a base color in linear light. */
export function encodeGlb(M: Mesh3, name: string, colors: Color[]): Uint8Array {
  const V = M.positions.length / 3, mats = used(M), pos = new Float32Array(V * 3), nor = new Float32Array(V * 3);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < V; i++) {
    const p = yUp(M.positions, i), n = yUp(M.normals, i);
    pos.set(p, i * 3); nor.set(n, i * 3);
    for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], pos[i * 3 + e]); hi[e] = Math.max(hi[e], pos[i * 3 + e]); }
  }
  const idx = mats.map((k) => {
    const t: number[] = [];
    for (let q = 0; q < M.quadMat.length; q++) if (M.quadMat[q] === k) { const [a, b, c, d] = M.quads.subarray(q * 4, q * 4 + 4); t.push(a, b, c, a, c, d); }
    return new Uint32Array(t);
  });
  const parts = [pos, nor, ...idx], views: { buffer: 0; byteOffset: number; byteLength: number; target: number }[] = [];
  let off = 0;
  for (const [i, a] of parts.entries()) { views.push({ buffer: 0, byteOffset: off, byteLength: a.byteLength, target: i < 2 ? 34962 : 34963 }); off += a.byteLength; }
  const lin = (c: number) => +LIN[c].toFixed(5);
  const json = {
    asset: { version: "2.0", generator: "pxl" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: mats.map((_, i) => ({ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2 + i, material: i })) }],
    materials: mats.map((k) => { const [r, g, b] = rgb(colors[k] ?? 0x808080ff); return { name: matName(M, k), pbrMetallicRoughness: { baseColorFactor: [lin(r), lin(g), lin(b), 1], metallicFactor: 0, roughnessFactor: 1 } }; }),
    buffers: [{ byteLength: off }], bufferViews: views,
    accessors: [
      { bufferView: 0, componentType: 5126, count: V, type: "VEC3", min: lo, max: hi },
      { bufferView: 1, componentType: 5126, count: V, type: "VEC3" },
      ...idx.map((a, i) => ({ bufferView: 2 + i, componentType: 5125, count: a.length, type: "SCALAR" })),
    ],
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
/** What a .glb says: its vertices, triangles and materials (counted from its accessors), its box, checked against its header. */
export function readGlb(b: Uint8Array): { vertices: number; triangles: number; materials: number; min: number[]; max: number[] } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2 || dv.getUint32(8, true) !== b.length) throw new PxError("not a glTF 2.0 binary");
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + jl)));
  const bl = dv.getUint32(20 + jl, true);
  if (dv.getUint32(24 + jl, true) !== 0x004e4942 || bl < json.buffers[0].byteLength) throw new PxError(".glb: its binary chunk is missing or short");
  const prims = json.meshes[0].primitives, acc = json.accessors;
  return { vertices: acc[prims[0].attributes.POSITION].count, triangles: prims.reduce((t: number, p: { indices: number }) => t + acc[p.indices].count / 3, 0), materials: json.materials.length, min: acc[0].min, max: acc[0].max };
}
/** What an .obj says: its vertices and faces. */
export function readObj(s: string): { vertices: number; faces: number; materials: number } {
  const l = s.split("\n");
  return { vertices: l.filter((x) => x.startsWith("v ")).length, faces: l.filter((x) => x.startsWith("f ")).length, materials: l.filter((x) => x.startsWith("usemtl ")).length };
}
