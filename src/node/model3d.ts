// 3D reference models (.glb, .obj, .stl) rendered as orthographic turnarounds for `pxl shot` & `pxl study`.
// glTF 2.0 and Wavefront OBJ are right-handed Y-up (+Z toward the viewer); STL (3D printing / CAD)
// defaults to right-handed Z-up (+Z up, +X right, +Y back), matching pxl's world directly.
// Y-up sources convert via (x, -z, y) — the exact inverse of files3d.ts's yUp(), preserving winding.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { pack } from "../core/color.ts";
import { PxError } from "../core/errors.ts";
import { glyph, lineWidth } from "../core/font.ts";
import { Img } from "../core/image.ts";
import { orthoBasis } from "../core/surface.ts";
import { decodePng } from "./png.ts";
import { perRow } from "./shot.ts";

export interface ModelMat {
  r: number;
  g: number;
  b: number;
  tex?: Img;
}

export interface Model3D {
  /** Transformed vertex positions in pxl Z-up world coordinates, 3 floats per vertex. */
  verts: Float32Array;
  /** Transformed unit vertex normals (or 0,0,0 when absent; flat face normal used), 3 floats per vertex. */
  norms: Float32Array;
  /** Vertex texture coordinates (u, v), 2 floats per vertex. */
  uvs: Float32Array;
  hasUv: boolean;
  /** Triangle vertex indices, 3 uint32 per triangle. */
  tris: Uint32Array;
  /** Material index per triangle. */
  matIds: Uint16Array;
  mats: ModelMat[];
  min: [number, number, number];
  max: [number, number, number];
  vertices: number;
  triangles: number;
  textures: number;
  /** Source format info (e.g. "glb", "obj", "stl-binary", "stl-ascii"). */
  format?: string;
  /** Source up-axis used when loading ("y" or "z"). */
  upAxis?: "y" | "z";
}

export interface LoadModelOpts {
  /** Source up-axis override: "y" (default for .glb/.obj) or "z" (default for .stl). */
  up?: "y" | "z";
}

export interface MeshStats {
  watertight: boolean;
  boundaryEdges: number;
  nonManifoldEdges: number;
  /** Signed volume in source cubic units (meaningful when watertight). */
  volume: number;
  /** Surface area in source square units. */
  area: number;
  /** Left-right symmetry score in [0, 1] across the bounding-box X midpoint. */
  symmetry: number;
}

export interface TurnaroundOpts {
  /** Camera pitch in degrees down (default 20, matching side / HD-2D). */
  pitch?: number;
  /** Number of directions: 1 (S), 4 (S, W, N, E), 5 (S, SW, W, NW, N; default), or 8. */
  dirs?: number;
  /** Size of each view cell in pixels (default 160). */
  size?: number;
}

const GAP = 2, GAP_C = 0x1b1b22ff, EMPTY = 0x8c8c96ff, LABEL = 0xd8d8e0ff;

const DIR_SETS: Record<number, { label: string; heading: number }[]> = {
  1: [{ label: "s", heading: 180 }],
  4: [
    { label: "s", heading: 180 },
    { label: "w", heading: 270 },
    { label: "n", heading: 0 },
    { label: "e", heading: 90 },
  ],
  5: [
    { label: "s", heading: 180 },
    { label: "sw", heading: 225 },
    { label: "w", heading: 270 },
    { label: "nw", heading: 315 },
    { label: "n", heading: 0 },
  ],
  8: [
    { label: "s", heading: 180 },
    { label: "sw", heading: 225 },
    { label: "w", heading: 270 },
    { label: "nw", heading: 315 },
    { label: "n", heading: 0 },
    { label: "ne", heading: 45 },
    { label: "e", heading: 90 },
    { label: "se", heading: 135 },
  ],
};

// Column-major 4x4 matrix helpers (glTF 2.0 convention).
type M4 = Float64Array;
const m4Id = (): M4 => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function m4Mul(a: M4, b: M4): M4 {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    const b0 = b[col * 4], b1 = b[col * 4 + 1], b2 = b[col * 4 + 2], b3 = b[col * 4 + 3];
    out[col * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

function m4FromTrs(t?: number[], q?: number[], s?: number[]): M4 {
  const [tx, ty, tz] = t ?? [0, 0, 0];
  const [qx, qy, qz, qw] = q ?? [0, 0, 0, 1];
  const [sx, sy, sz] = s ?? [1, 1, 1];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return new Float64Array([
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]);
}

/** Upper-3x3 cofactor matrix (proportional to inverse-transpose) and determinant for normal transform. */
function normalMat3(m: M4): { n: Float64Array; det: number } {
  const a00 = m[0], a01 = m[4], a02 = m[8];
  const a10 = m[1], a11 = m[5], a12 = m[9];
  const a20 = m[2], a21 = m[6], a22 = m[10];
  const c00 = a11 * a22 - a12 * a21, c01 = -(a10 * a22 - a12 * a20), c02 = a10 * a21 - a11 * a20;
  const c10 = -(a01 * a22 - a02 * a21), c11 = a00 * a22 - a02 * a20, c12 = -(a00 * a21 - a01 * a20);
  const c20 = a01 * a12 - a02 * a11, c21 = -(a00 * a12 - a02 * a10), c22 = a00 * a11 - a01 * a10;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  const s = det < 0 ? -1 : 1;
  return { n: new Float64Array([c00 * s, c01 * s, c02 * s, c10 * s, c11 * s, c12 * s, c20 * s, c21 * s, c22 * s]), det };
}

const linToSrgb = (v: number): number => {
  const c = Math.max(0, Math.min(1, v));
  return Math.max(0, Math.min(255, Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255)));
};

/** Decode an embedded texture buffer (PNG natively; JPEG/WebP via ffmpeg when on PATH; undefined on failure). */
function decodeImageBytes(bytes: Uint8Array, mime?: string): Img | undefined {
  const isPng = mime === "image/png" || (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47);
  if (isPng) {
    try { return decodePng(bytes); } catch { return undefined; }
  }
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", "pipe:0", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], { input: bytes, maxBuffer: 64 << 20 });
  if (r.status === 0 && r.stdout && r.stdout.length > 8) {
    try { return decodePng(r.stdout); } catch { return undefined; }
  }
  return undefined;
}

interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
}
interface GltfBufferView { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }
interface GltfJson {
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: { mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  meshes?: { primitives?: { attributes?: Record<string, number>; indices?: number; material?: number; mode?: number }[] }[];
  materials?: { pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: { index: number } } }[];
  textures?: { source?: number }[];
  images?: { bufferView?: number; mimeType?: string; uri?: string }[];
  buffers?: { byteLength: number; uri?: string }[];
  bufferViews?: GltfBufferView[];
  accessors?: GltfAccessor[];
}

const COMP_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const COMP_BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

function readAccessor(json: GltfJson, buffers: Uint8Array[], index: number): Float64Array {
  const acc = json.accessors?.[index];
  if (!acc) throw new PxError(`glb: missing accessor ${index}`);
  const comps = COMP_COUNT[acc.type];
  const bpc = COMP_BYTES[acc.componentType];
  if (!comps || !bpc) throw new PxError(`glb: unsupported accessor type ${acc.type} / ${acc.componentType}`);
  const out = new Float64Array(acc.count * comps);
  if (acc.bufferView === undefined) return out;
  const bv = json.bufferViews?.[acc.bufferView];
  if (!bv) throw new PxError(`glb: missing bufferView ${acc.bufferView}`);
  const buf = buffers[bv.buffer];
  if (!buf) throw new PxError(`glb: missing buffer ${bv.buffer}`);
  const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = bv.byteStride && bv.byteStride > 0 ? bv.byteStride : comps * bpc;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const norm = !!acc.normalized;
  for (let i = 0; i < acc.count; i++) {
    let o = base + i * stride;
    for (let k = 0; k < comps; k++, o += bpc) {
      let v: number;
      if (acc.componentType === 5126) v = dv.getFloat32(o, true);
      else if (acc.componentType === 5125) v = dv.getUint32(o, true);
      else if (acc.componentType === 5123) v = norm ? dv.getUint16(o, true) / 65535 : dv.getUint16(o, true);
      else if (acc.componentType === 5122) v = norm ? Math.max(-1, dv.getInt16(o, true) / 32767) : dv.getInt16(o, true);
      else if (acc.componentType === 5121) v = norm ? dv.getUint8(o) / 255 : dv.getUint8(o);
      else v = norm ? Math.max(-1, dv.getInt8(o) / 127) : dv.getInt8(o);
      out[i * comps + k] = v;
    }
  }
  return out;
}

/** Load a glTF 2.0 binary (.glb) file into pxl Z-up coordinates. */
export function loadGlb(buf: Uint8Array, opts: LoadModelOpts = {}): Model3D {
  const up = opts.up ?? "y";
  if (buf.byteLength < 20) throw new PxError("not a .glb file (too short)");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new PxError("not a .glb file (bad magic header)");
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new PxError(`unsupported glTF version ${version} (expected 2)`);

  let jsonBytes: Uint8Array | undefined;
  let binBytes: Uint8Array | undefined;
  for (let off = 12; off + 8 <= buf.byteLength;) {
    const len = dv.getUint32(off, true);
    const kind = dv.getUint32(off + 4, true);
    const body = buf.subarray(off + 8, Math.min(buf.byteLength, off + 8 + len));
    if (kind === 0x4e4f534a && !jsonBytes) jsonBytes = body;
    else if (kind === 0x004e4942 && !binBytes) binBytes = body;
    off += 8 + len;
  }
  if (!jsonBytes) throw new PxError("corrupt .glb: missing JSON chunk");
  const json = JSON.parse(new TextDecoder().decode(jsonBytes)) as GltfJson;

  // Resolve buffers (BIN chunk or embedded data URIs).
  const buffers: Uint8Array[] = (json.buffers ?? []).map((b, i) => {
    if (!b.uri && i === 0 && binBytes) return binBytes;
    if (b.uri?.startsWith("data:")) {
      const idx = b.uri.indexOf(",");
      return idx >= 0 ? new Uint8Array(Buffer.from(b.uri.slice(idx + 1), "base64")) : new Uint8Array(0);
    }
    return binBytes ?? new Uint8Array(0);
  });

  // Decode textures referenced by materials.
  const imgCache = new Map<number, Img | undefined>();
  const getImage = (imgIdx: number): Img | undefined => {
    if (imgCache.has(imgIdx)) return imgCache.get(imgIdx);
    const im = json.images?.[imgIdx];
    let decoded: Img | undefined;
    if (im?.bufferView !== undefined) {
      const bv = json.bufferViews?.[im.bufferView];
      const b = bv && buffers[bv.buffer];
      if (bv && b) decoded = decodeImageBytes(b.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength), im.mimeType);
    } else if (im?.uri?.startsWith("data:")) {
      const idx = im.uri.indexOf(",");
      if (idx >= 0) {
        const mime = /^data:([^;,]+)/.exec(im.uri)?.[1];
        decoded = decodeImageBytes(new Uint8Array(Buffer.from(im.uri.slice(idx + 1), "base64")), mime);
      }
    }
    imgCache.set(imgIdx, decoded);
    return decoded;
  };

  let textures = 0;
  const mats: ModelMat[] = (json.materials ?? []).map((m) => {
    const pbr = m.pbrMetallicRoughness;
    const f = pbr?.baseColorFactor ?? [1, 1, 1, 1];
    let tex: Img | undefined;
    if (pbr?.baseColorTexture !== undefined) {
      const src = json.textures?.[pbr.baseColorTexture.index]?.source;
      if (src !== undefined) tex = getImage(src);
      if (tex) textures++;
    }
    return { r: linToSrgb(f[0] ?? 1), g: linToSrgb(f[1] ?? 1), b: linToSrgb(f[2] ?? 1), ...(tex ? { tex } : {}) };
  });
  // Fallback default material at the end for primitives without a material index.
  const defaultMat = mats.length;
  mats.push({ r: 204, g: 204, b: 204 });

  // First pass: traverse scene graph to collect mesh instances and total counts.
  const instances: { mesh: number; mat: M4 }[] = [];
  const visit = (nodeIdx: number, parent: M4) => {
    const node = json.nodes?.[nodeIdx];
    if (!node) return;
    const local = node.matrix && node.matrix.length === 16 ? new Float64Array(node.matrix) : m4FromTrs(node.translation, node.rotation, node.scale);
    const world = m4Mul(parent, local);
    if (node.mesh !== undefined) instances.push({ mesh: node.mesh, mat: world });
    if (node.children) for (const c of node.children) visit(c, world);
  };
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? (json.nodes?.length ? [0] : []);
  for (const r of roots) visit(r, m4Id());

  // Collect primitives into flat buffers.
  const vertChunks: Float32Array[] = [], normChunks: Float32Array[] = [], uvChunks: Float32Array[] = [];
  const triChunks: Uint32Array[] = [], matChunks: Uint16Array[] = [];
  let totalVerts = 0, totalTris = 0, hasUv = false;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (const inst of instances) {
    const mesh = json.meshes?.[inst.mesh];
    if (!mesh?.primitives?.length) continue;
    const { n: nmat, det } = normalMat3(inst.mat);
    // Skip zero-scale nodes (e.g., hidden frames in stepped-scale glTF animations).
    if (Math.abs(det) < 1e-12) continue;
    const flipWind = det < 0;
    const m = inst.mat;

    for (const prim of mesh.primitives) {
      const mode = prim.mode ?? 4;
      if (mode !== 4 && mode !== 5 && mode !== 6) continue;
      const posIdx = prim.attributes?.POSITION;
      if (posIdx === undefined) continue;
      const rawPos = readAccessor(json, buffers, posIdx);
      const vCount = rawPos.length / 3;
      if (!vCount) continue;

      const rawNorm = prim.attributes?.NORMAL !== undefined ? readAccessor(json, buffers, prim.attributes.NORMAL) : undefined;
      const rawUv = prim.attributes?.TEXCOORD_0 !== undefined ? readAccessor(json, buffers, prim.attributes.TEXCOORD_0) : undefined;
      if (rawUv) hasUv = true;

      const vArr = new Float32Array(vCount * 3);
      const nArr = new Float32Array(vCount * 3);
      const uArr = new Float32Array(vCount * 2);

      for (let i = 0; i < vCount; i++) {
        const x = rawPos[i * 3], y = rawPos[i * 3 + 1], z = rawPos[i * 3 + 2];
        const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
        const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
        const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
        // Convert to pxl Z-up (Y-up sources rotate via (x, -z, y); Z-up sources stay as-is)
        const px = wx, py = up === "y" ? -wz : wy, pz = up === "y" ? wy : wz;
        vArr[i * 3] = px; vArr[i * 3 + 1] = py; vArr[i * 3 + 2] = pz;
        if (px < min[0]) min[0] = px; if (px > max[0]) max[0] = px;
        if (py < min[1]) min[1] = py; if (py > max[1]) max[1] = py;
        if (pz < min[2]) min[2] = pz; if (pz > max[2]) max[2] = pz;

        if (rawNorm) {
          const nx = rawNorm[i * 3], ny = rawNorm[i * 3 + 1], nz = rawNorm[i * 3 + 2];
          const tnx = nmat[0] * nx + nmat[1] * ny + nmat[2] * nz;
          const tny = nmat[3] * nx + nmat[4] * ny + nmat[5] * nz;
          const tnz = nmat[6] * nx + nmat[7] * ny + nmat[8] * nz;
          const len = Math.hypot(tnx, tny, tnz) || 1;
          nArr[i * 3] = tnx / len;
          nArr[i * 3 + 1] = (up === "y" ? -tnz : tny) / len;
          nArr[i * 3 + 2] = (up === "y" ? tny : tnz) / len;
        }
        if (rawUv) {
          uArr[i * 2] = rawUv[i * 2]; uArr[i * 2 + 1] = rawUv[i * 2 + 1];
        }
      }

      const rawIdx = prim.indices !== undefined ? readAccessor(json, buffers, prim.indices) : undefined;
      const idxCount = rawIdx ? rawIdx.length : vCount;
      const getIdx = rawIdx ? (k: number) => rawIdx[k] : (k: number) => k;
      const triCount = mode === 4 ? Math.floor(idxCount / 3) : Math.max(0, idxCount - 2);
      if (!triCount) continue;

      const tArr = new Uint32Array(triCount * 3);
      const mArr = new Uint16Array(triCount);
      const matId = prim.material !== undefined && prim.material < mats.length ? prim.material : defaultMat;
      mArr.fill(matId);
      const baseV = totalVerts;

      if (mode === 4) {
        for (let t = 0; t < triCount; t++) {
          const a = baseV + getIdx(t * 3), b = baseV + getIdx(t * 3 + 1), c = baseV + getIdx(t * 3 + 2);
          tArr[t * 3] = a; tArr[t * 3 + 1] = flipWind ? c : b; tArr[t * 3 + 2] = flipWind ? b : c;
        }
      } else if (mode === 5) {
        for (let t = 0; t < triCount; t++) {
          const a = baseV + getIdx(t), b = baseV + getIdx(t + 1), c = baseV + getIdx(t + 2);
          const swap = (t & 1) !== 0 ? !flipWind : flipWind;
          tArr[t * 3] = a; tArr[t * 3 + 1] = swap ? c : b; tArr[t * 3 + 2] = swap ? b : c;
        }
      } else {
        const a = baseV + getIdx(0);
        for (let t = 0; t < triCount; t++) {
          const b = baseV + getIdx(t + 1), c = baseV + getIdx(t + 2);
          tArr[t * 3] = a; tArr[t * 3 + 1] = flipWind ? c : b; tArr[t * 3 + 2] = flipWind ? b : c;
        }
      }

      vertChunks.push(vArr); normChunks.push(nArr); uvChunks.push(uArr);
      triChunks.push(tArr); matChunks.push(mArr);
      totalVerts += vCount;
      totalTris += triCount;
    }
  }

  if (!totalTris) throw new PxError(".glb contains no triangle geometry");
  return { ...packModel(vertChunks, normChunks, uvChunks, triChunks, matChunks, mats, min, max, totalVerts, totalTris, hasUv, textures), format: "glb", upAxis: up };
}

/** Load a Wavefront .obj file (and optional sibling .mtl) into pxl Z-up coordinates. */
export function loadObj(path: string, opts: LoadModelOpts = {}): Model3D {
  const up = opts.up ?? "y";
  const text = readFileSync(path, "utf8");
  const pos: number[] = [], norm: number[] = [], uv: number[] = [];
  const mats: ModelMat[] = [{ r: 204, g: 204, b: 204 }];
  const matIndex = new Map<string, number>([["default", 0]]);
  const loadMtl = (mtlPath: string) => {
    if (!existsSync(mtlPath)) return;
    let cur = "";
    for (const raw of readFileSync(mtlPath, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);
      if (parts[0] === "newmtl" && parts[1]) {
        cur = parts.slice(1).join(" ");
        if (!matIndex.has(cur)) { matIndex.set(cur, mats.length); mats.push({ r: 204, g: 204, b: 204 }); }
      } else if (parts[0] === "Kd" && cur && parts.length >= 4) {
        const m = mats[matIndex.get(cur)!];
        m.r = Math.max(0, Math.min(255, Math.round(Number(parts[1]) * 255)));
        m.g = Math.max(0, Math.min(255, Math.round(Number(parts[2]) * 255)));
        m.b = Math.max(0, Math.min(255, Math.round(Number(parts[3]) * 255)));
      }
    }
  };

  const outV: number[] = [], outN: number[] = [], outU: number[] = [], outT: number[] = [], outM: number[] = [];
  const vertCache = new Map<string, number>();
  let curMat = 0, hasUv = false;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const resolveIdx = (raw: string | undefined, count: number) => {
    if (!raw) return -1;
    const n = parseInt(raw, 10);
    return n < 0 ? count + n : n - 1;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const op = parts[0];
    if (op === "mtllib" && parts[1]) {
      loadMtl(join(dirname(path), parts.slice(1).join(" ")));
    } else if (op === "usemtl" && parts[1]) {
      const name = parts.slice(1).join(" ");
      curMat = matIndex.get(name) ?? 0;
    } else if (op === "v" && parts.length >= 4) {
      const vx = Number(parts[1]), vy = Number(parts[2]), vz = Number(parts[3]);
      const px = vx, py = up === "y" ? -vz : vy, pz = up === "y" ? vy : vz;
      pos.push(px, py, pz);
      if (px < min[0]) min[0] = px; if (px > max[0]) max[0] = px;
      if (py < min[1]) min[1] = py; if (py > max[1]) max[1] = py;
      if (pz < min[2]) min[2] = pz; if (pz > max[2]) max[2] = pz;
    } else if (op === "vn" && parts.length >= 4) {
      const vx = Number(parts[1]), vy = Number(parts[2]), vz = Number(parts[3]);
      const nx = vx, ny = up === "y" ? -vz : vy, nz = up === "y" ? vy : vz;
      const l = Math.hypot(nx, ny, nz) || 1;
      norm.push(nx / l, ny / l, nz / l);
    } else if (op === "vt" && parts.length >= 3) {
      hasUv = true;
      uv.push(Number(parts[1]), 1 - Number(parts[2]));
    } else if (op === "f" && parts.length >= 4) {
      const vCount = pos.length / 3, nCount = norm.length / 3, uCount = uv.length / 2;
      const poly: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const tok = parts[i];
        let id = vertCache.get(tok);
        if (id === undefined) {
          const [vs, ts, ns] = tok.split("/");
          const vi = resolveIdx(vs, vCount);
          if (vi < 0 || vi >= vCount) continue;
          const ti = resolveIdx(ts, uCount), ni = resolveIdx(ns, nCount);
          id = outV.length / 3;
          vertCache.set(tok, id);
          outV.push(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
          if (ni >= 0 && ni < nCount) outN.push(norm[ni * 3], norm[ni * 3 + 1], norm[ni * 3 + 2]);
          else outN.push(0, 0, 0);
          if (ti >= 0 && ti < uCount) outU.push(uv[ti * 2], uv[ti * 2 + 1]);
          else outU.push(0, 0);
        }
        poly.push(id);
      }
      for (let k = 1; k + 1 < poly.length; k++) {
        outT.push(poly[0], poly[k], poly[k + 1]);
        outM.push(curMat);
      }
    }
  }

  if (!outT.length) throw new PxError(".obj contains no triangle geometry");
  return {
    verts: new Float32Array(outV),
    norms: new Float32Array(outN),
    uvs: new Float32Array(outU),
    hasUv,
    tris: new Uint32Array(outT),
    matIds: new Uint16Array(outM),
    mats,
    min,
    max,
    vertices: outV.length / 3,
    triangles: outT.length / 3,
    textures: 0,
    format: "obj",
    upAxis: up,
  };
}

/**
 * Load a Binary or ASCII `.stl` mesh (standard 3D-printing / CAD format) into pxl Z-up coordinates.
 * Defaults to `up: "z"` (CAD / slicers / Blender STL export convention); pass `{ up: "y" }` for Y-up STLs.
 * Supports VisCAM and Materialise Magics 16-bit per-triangle RGB colors in binary STLs.
 */
export function loadStl(buf: Uint8Array, opts: LoadModelOpts = {}): Model3D {
  const up = opts.up ?? "z";
  if (up !== "y" && up !== "z") throw new PxError(`loadStl: up must be "z" or "y", got ${JSON.stringify(opts.up)}`);
  if (buf.byteLength < 15) throw new PxError("not an .stl file (too short)");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Canonical binary check: 80-byte header + uint32 count + count * 50 bytes.
  // (Must be checked before ASCII because some binary STLs start with "solid " in their header.)
  const binTriCount = buf.byteLength >= 84 ? dv.getUint32(80, true) : -1;
  const isBinary = buf.byteLength >= 84 && 84 + binTriCount * 50 === buf.byteLength;

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  // Warm resin/clay default material so sculpted 3D-printing forms read with crisp shading.
  const mats: ModelMat[] = [{ r: 214, g: 208, b: 200 }];
  const colorMat = new Map<number, number>();
  const xform = (x: number, y: number, z: number): [number, number, number] =>
    up === "y" ? [x, -z, y] : [x, y, z];
  const trackBound = (px: number, py: number, pz: number) => {
    if (px < min[0]) min[0] = px; if (px > max[0]) max[0] = px;
    if (py < min[1]) min[1] = py; if (py > max[1]) max[1] = py;
    if (pz < min[2]) min[2] = pz; if (pz > max[2]) max[2] = pz;
  };

  if (isBinary) {
    if (binTriCount === 0) throw new PxError(".stl contains no triangle geometry");
    const headerStr = new TextDecoder().decode(buf.subarray(0, 80));
    const isMaterialise = headerStr.includes("COLOR=");
    const verts = new Float32Array(binTriCount * 9);
    const norms = new Float32Array(binTriCount * 9);
    const uvs = new Float32Array(binTriCount * 6);
    const tris = new Uint32Array(binTriCount * 3);
    const matIds = new Uint16Array(binTriCount);
    for (let t = 0; t < binTriCount; t++) {
      const o = 84 + t * 50;
      const [fnx0, fny0, fnz0] = xform(dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true));
      const fnl = Math.hypot(fnx0, fny0, fnz0);
      const fnx = fnl > 1e-6 ? fnx0 / fnl : 0, fny = fnl > 1e-6 ? fny0 / fnl : 0, fnz = fnl > 1e-6 ? fnz0 / fnl : 0;
      for (let v = 0; v < 3; v++) {
        const vo = o + 12 + v * 12;
        const [px, py, pz] = xform(dv.getFloat32(vo, true), dv.getFloat32(vo + 4, true), dv.getFloat32(vo + 8, true));
        const vi = t * 3 + v;
        verts[vi * 3] = px; verts[vi * 3 + 1] = py; verts[vi * 3 + 2] = pz;
        norms[vi * 3] = fnx; norms[vi * 3 + 1] = fny; norms[vi * 3 + 2] = fnz;
        tris[vi] = vi;
        trackBound(px, py, pz);
      }
      const attr = dv.getUint16(o + 48, true);
      let mid = 0;
      const hasColor = isMaterialise ? (attr & 0x8000) === 0 && attr !== 0 : (attr & 0x8000) !== 0;
      if (hasColor) {
        const key = attr & 0x7fff;
        let found = colorMat.get(key);
        if (found === undefined && mats.length < 65535) {
          const r5 = isMaterialise ? (attr & 31) : ((attr >> 10) & 31);
          const g5 = (attr >> 5) & 31;
          const b5 = isMaterialise ? ((attr >> 10) & 31) : (attr & 31);
          found = mats.length;
          mats.push({ r: Math.round((r5 * 255) / 31), g: Math.round((g5 * 255) / 31), b: Math.round((b5 * 255) / 31) });
          colorMat.set(key, found);
        }
        if (found !== undefined) mid = found;
      }
      matIds[t] = mid;
    }
    return {
      verts, norms, uvs, hasUv: false, tris, matIds, mats, min, max,
      vertices: binTriCount * 3, triangles: binTriCount, textures: 0,
      format: "stl-binary", upAxis: up,
    };
  }

  // ASCII STL parsing
  const text = new TextDecoder().decode(buf);
  if (!/^\s*solid\b/i.test(text) || !/\bfacet\s+normal\b/i.test(text))
    throw new PxError("not a valid binary or ASCII .stl file");
  const outV: number[] = [], outN: number[] = [];
  let fnx = 0, fny = 0, fnz = 0;
  const facetVerts: [number, number, number][] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const op = parts[0].toLowerCase();
    if (op === "facet" && parts[1]?.toLowerCase() === "normal" && parts.length >= 5) {
      const [nx, ny, nz] = xform(Number(parts[2]), Number(parts[3]), Number(parts[4]));
      const nl = Math.hypot(nx, ny, nz);
      fnx = nl > 1e-6 ? nx / nl : 0; fny = nl > 1e-6 ? ny / nl : 0; fnz = nl > 1e-6 ? nz / nl : 0;
      facetVerts.length = 0;
    } else if (op === "vertex" && parts.length >= 4) {
      const [px, py, pz] = xform(Number(parts[1]), Number(parts[2]), Number(parts[3]));
      if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)) facetVerts.push([px, py, pz]);
    } else if (op === "endfacet" && facetVerts.length >= 3) {
      // Fan-triangulate in case a non-standard ASCII STL facet has >3 vertices
      for (let k = 1; k + 1 < facetVerts.length; k++) {
        for (const pt of [facetVerts[0], facetVerts[k], facetVerts[k + 1]]) {
          outV.push(pt[0], pt[1], pt[2]);
          outN.push(fnx, fny, fnz);
          trackBound(pt[0], pt[1], pt[2]);
        }
      }
      facetVerts.length = 0;
    }
  }
  const vCount = outV.length / 3, tCount = Math.floor(vCount / 3);
  if (!tCount) throw new PxError(".stl contains no triangle geometry");
  const tris = new Uint32Array(tCount * 3);
  for (let i = 0; i < tCount * 3; i++) tris[i] = i;
  return {
    verts: new Float32Array(outV),
    norms: new Float32Array(outN),
    uvs: new Float32Array(vCount * 2),
    hasUv: false,
    tris,
    matIds: new Uint16Array(tCount),
    mats,
    min,
    max,
    vertices: vCount,
    triangles: tCount,
    textures: 0,
    format: "stl-ascii",
    upAxis: up,
  };
}

function packModel(
  vertChunks: Float32Array[], normChunks: Float32Array[], uvChunks: Float32Array[],
  triChunks: Uint32Array[], matChunks: Uint16Array[], mats: ModelMat[],
  min: [number, number, number], max: [number, number, number],
  vertices: number, triangles: number, hasUv: boolean, textures: number,
): Model3D {
  const verts = new Float32Array(vertices * 3);
  const norms = new Float32Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const tris = new Uint32Array(triangles * 3);
  const matIds = new Uint16Array(triangles);
  let vo = 0, uo = 0, to = 0, mo = 0;
  for (let i = 0; i < vertChunks.length; i++) {
    verts.set(vertChunks[i], vo);
    norms.set(normChunks[i], vo);
    uvs.set(uvChunks[i], uo);
    vo += vertChunks[i].length;
    uo += uvChunks[i].length;
  }
  for (let i = 0; i < triChunks.length; i++) {
    tris.set(triChunks[i], to);
    matIds.set(matChunks[i], mo);
    to += triChunks[i].length;
    mo += matChunks[i].length;
  }
  return { verts, norms, uvs, hasUv, tris, matIds, mats, min, max, vertices, triangles, textures };
}

/** Load a .glb, .obj, or .stl 3D model from disk. */
export function loadModel3d(path: string, opts: LoadModelOpts = {}): Model3D {
  const ext = extname(path).toLowerCase();
  if (ext === ".glb") return loadGlb(readFileSync(path), opts);
  if (ext === ".obj") return loadObj(path, opts);
  if (ext === ".stl") return loadStl(readFileSync(path), opts);
  throw new PxError(`unsupported 3D model format '${ext}' (expected .glb, .obj, or .stl)`);
}

/**
 * Analyze mesh topology (watertightness, boundary/non-manifold edges, volume, surface area) and
 * left-right silhouette symmetry across the bounding-box X midpoint.
 */
export function analyzeMesh(model: Model3D): MeshStats {
  const { verts, tris, min, max, triangles } = model;
  const dx = max[0] - min[0], dy = max[1] - min[1], dz = max[2] - min[2];
  const diag = Math.hypot(dx, dy, dz) || 1;
  // Quantize vertices to weld triangle-soup duplicates (like STL) cleanly
  const qScale = 1e4 / diag;
  const vKeyMap = new Map<string, number>();
  let nextWeld = 0;
  const weldOf = (vi: number): number => {
    const x = Math.round((verts[vi * 3] - min[0]) * qScale);
    const y = Math.round((verts[vi * 3 + 1] - min[1]) * qScale);
    const z = Math.round((verts[vi * 3 + 2] - min[2]) * qScale);
    const k = `${x},${y},${z}`;
    let id = vKeyMap.get(k);
    if (id === undefined) { id = nextWeld++; vKeyMap.set(k, id); }
    return id;
  };
  const edgeCount = new Map<string, number>();
  let vol6 = 0, area = 0;
  const cx = (min[0] + max[0]) * 0.5, cy = (min[1] + max[1]) * 0.5, cz = (min[2] + max[2]) * 0.5;
  for (let t = 0; t < triangles; t++) {
    const i0 = tris[t * 3], i1 = tris[t * 3 + 1], i2 = tris[t * 3 + 2];
    const ax = verts[i0 * 3] - cx, ay = verts[i0 * 3 + 1] - cy, az = verts[i0 * 3 + 2] - cz;
    const bx = verts[i1 * 3] - cx, by = verts[i1 * 3 + 1] - cy, bz = verts[i1 * 3 + 2] - cz;
    const cxv = verts[i2 * 3] - cx, cyv = verts[i2 * 3 + 1] - cy, czv = verts[i2 * 3 + 2] - cz;
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cxv - ax, e2y = cyv - ay, e2z = czv - az;
    const crx = e1y * e2z - e1z * e2y, cry = e1z * e2x - e1x * e2z, crz = e1x * e2y - e1y * e2x;
    area += 0.5 * Math.hypot(crx, cry, crz);
    vol6 += ax * (by * czv - bz * cyv) + ay * (bz * cxv - bx * czv) + az * (bx * cyv - by * cxv);
    const w0 = weldOf(i0), w1 = weldOf(i1), w2 = weldOf(i2);
    if (w0 === w1 || w1 === w2 || w2 === w0) continue;
    for (const [u, v] of [[w0, w1], [w1, w2], [w2, w0]]) {
      const k = u < v ? `${u}:${v}` : `${v}:${u}`;
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
    }
  }
  let boundaryEdges = 0, nonManifoldEdges = 0;
  for (const cnt of edgeCount.values()) {
    if (cnt === 1) boundaryEdges++;
    else if (cnt > 2) nonManifoldEdges++;
  }
  // Left-right symmetry via 3D voxel occupancy grid mirrored across X center
  const G = 24;
  const occ = new Uint8Array(G * G * G);
  const invX = dx > 1e-9 ? (G - 1) / dx : 0, invY = dy > 1e-9 ? (G - 1) / dy : 0, invZ = dz > 1e-9 ? (G - 1) / dz : 0;
  const mark = (px: number, py: number, pz: number) => {
    const gx = Math.max(0, Math.min(G - 1, Math.round((px - min[0]) * invX)));
    const gy = Math.max(0, Math.min(G - 1, Math.round((py - min[1]) * invY)));
    const gz = Math.max(0, Math.min(G - 1, Math.round((pz - min[2]) * invZ)));
    occ[(gz * G + gy) * G + gx] = 1;
  };
  for (let t = 0; t < triangles; t++) {
    const i0 = tris[t * 3], i1 = tris[t * 3 + 1], i2 = tris[t * 3 + 2];
    const x0 = verts[i0 * 3], y0 = verts[i0 * 3 + 1], z0 = verts[i0 * 3 + 2];
    const x1 = verts[i1 * 3], y1 = verts[i1 * 3 + 1], z1 = verts[i1 * 3 + 2];
    const x2 = verts[i2 * 3], y2 = verts[i2 * 3 + 1], z2 = verts[i2 * 3 + 2];
    // Rasterize triangle surface onto the voxel grid so symmetry is invariant to diagonal triangulation
    const e01 = Math.max(Math.abs(x1 - x0) * invX, Math.abs(y1 - y0) * invY, Math.abs(z1 - z0) * invZ);
    const e02 = Math.max(Math.abs(x2 - x0) * invX, Math.abs(y2 - y0) * invY, Math.abs(z2 - z0) * invZ);
    const e12 = Math.max(Math.abs(x2 - x1) * invX, Math.abs(y2 - y1) * invY, Math.abs(z2 - z1) * invZ);
    const steps = Math.min(G, Math.max(1, Math.ceil(Math.max(e01, e02, e12) * 1.5)));
    if (steps <= 1) {
      mark(x0, y0, z0); mark(x1, y1, z1); mark(x2, y2, z2);
      mark((x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3, (z0 + z1 + z2) / 3);
    } else {
      for (let a = 0; a <= steps; a++) {
        const u = a / steps;
        for (let b = 0; b <= steps - a; b++) {
          const v = b / steps, w = 1 - u - v;
          mark(w * x0 + u * x1 + v * x2, w * y0 + u * y1 + v * y2, w * z0 + u * z1 + v * z2);
        }
      }
    }
  }
  let filled = 0, matched = 0;
  for (let gz = 0; gz < G; gz++) for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    if (!occ[(gz * G + gy) * G + gx]) continue;
    filled++;
    const mx = G - 1 - gx;
    if (occ[(gz * G + gy) * G + mx] || (mx > 0 && occ[(gz * G + gy) * G + mx - 1]) || (mx + 1 < G && occ[(gz * G + gy) * G + mx + 1])) matched++;
  }
  return {
    watertight: boundaryEdges === 0 && nonManifoldEdges === 0 && edgeCount.size > 0,
    boundaryEdges,
    nonManifoldEdges,
    volume: Math.abs(vol6) / 6,
    area,
    symmetry: filled ? matched / filled : 1,
  };
}

export interface ModelStudyResult {
  text: string[];
  sheet: Img;
  model: Model3D;
  stats: MeshStats;
  palette: number[];
}

/**
 * Study a 3D model (.stl, .glb, .obj) for pixel-art translation: orthographic turnaround, proportions,
 * 10-band height silhouette profile, mesh/print integrity, symmetry score, and suggested pxl scales.
 */
export function studyModel3d(path: string, opts: TurnaroundOpts & LoadModelOpts = {}): ModelStudyResult {
  const model = loadModel3d(path, opts);
  const stats = analyzeMesh(model);
  const { img: sheet, labels, pitch, size } = renderModelTurnaround(model, {
    pitch: opts.pitch ?? 20,
    dirs: opts.dirs ?? 5,
    size: opts.size ?? 160,
  });
  const dx = model.max[0] - model.min[0], dy = model.max[1] - model.min[1], dz = model.max[2] - model.min[2];
  const cx = (model.min[0] + model.max[0]) * 0.5;
  const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "0.00");
  const wh = dz > 1e-6 ? dx / dz : 0, dh = dz > 1e-6 ? dy / dz : 0, dw = dx > 1e-6 ? dy / dx : 0;

  // 10 height-band cross-sections from 0% (base/feet) to 100% (top/crown)
  const BANDS = 10;
  const bx0 = new Float64Array(BANDS).fill(Infinity), bx1 = new Float64Array(BANDS).fill(-Infinity);
  const by0 = new Float64Array(BANDS).fill(Infinity), by1 = new Float64Array(BANDS).fill(-Infinity);
  const addPt = (px: number, py: number, pz: number) => {
    const b = dz > 1e-9 ? Math.max(0, Math.min(BANDS - 1, Math.floor(((pz - model.min[2]) / dz) * BANDS))) : 0;
    if (px < bx0[b]) bx0[b] = px; if (px > bx1[b]) bx1[b] = px;
    if (py < by0[b]) by0[b] = py; if (py > by1[b]) by1[b] = py;
  };
  for (let t = 0; t < model.triangles; t++) {
    const i0 = model.tris[t * 3], i1 = model.tris[t * 3 + 1], i2 = model.tris[t * 3 + 2];
    const x0 = model.verts[i0 * 3], y0 = model.verts[i0 * 3 + 1], z0 = model.verts[i0 * 3 + 2];
    const x1 = model.verts[i1 * 3], y1 = model.verts[i1 * 3 + 1], z1 = model.verts[i1 * 3 + 2];
    const x2 = model.verts[i2 * 3], y2 = model.verts[i2 * 3 + 1], z2 = model.verts[i2 * 3 + 2];
    addPt(x0, y0, z0); addPt(x1, y1, z1); addPt(x2, y2, z2);
    // Sample triangle edges across every height band they span so tall flat faces fill all intermediate bands
    for (const [ax, ay, az, bx, by, bz] of [[x0, y0, z0, x1, y1, z1], [x1, y1, z1, x2, y2, z2], [x2, y2, z2, x0, y0, z0]]) {
      if (dz <= 1e-9 || Math.abs(bz - az) <= 1e-9) continue;
      const bLo = Math.max(0, Math.min(BANDS - 1, Math.floor(((Math.min(az, bz) - model.min[2]) / dz) * BANDS)));
      const bHi = Math.max(0, Math.min(BANDS - 1, Math.floor(((Math.max(az, bz) - model.min[2]) / dz) * BANDS)));
      for (let b = bLo; b <= bHi; b++) {
        const zMid = model.min[2] + ((b + 0.5) / BANDS) * dz;
        const u = (zMid - az) / (bz - az);
        if (u >= 0 && u <= 1) addPt(ax + u * (bx - ax), ay + u * (by - ay), zMid);
      }
    }
  }
  const BAR_W = 24;
  const profileLines: string[] = [];
  for (let b = BANDS - 1; b >= 0; b--) {
    const pct = `${String(b * 10).padStart(2)}-${String((b + 1) * 10).padStart(3)}%`;
    if (bx0[b] > bx1[b]) { profileLines.push(`  ${pct}  (empty)`); continue; }
    const bw = bx1[b] - bx0[b], bd = by1[b] - by0[b], bmid = (bx0[b] + bx1[b]) * 0.5;
    const lIdx = dx > 1e-9 ? Math.max(0, Math.min(BAR_W - 1, Math.floor(((bx0[b] - model.min[0]) / dx) * BAR_W))) : 0;
    const rIdx = dx > 1e-9 ? Math.max(lIdx, Math.min(BAR_W - 1, Math.ceil(((bx1[b] - model.min[0]) / dx) * BAR_W) - 1)) : BAR_W - 1;
    let bar = "";
    for (let k = 0; k < BAR_W; k++) bar += k >= lIdx && k <= rIdx ? "#" : ".";
    const lean = dz > 1e-9 ? (bmid - cx) / dz : 0;
    const leanStr = Math.abs(lean) >= 0.04 ? ` lean ${lean > 0 ? "+" : ""}${fmt(lean)}H` : "";
    profileLines.push(`  ${pct}  [${bar}]  W=${fmt(dz ? bw / dz : 0)}H  D=${fmt(dz ? bd / dz : 0)}H${leanStr}`);
  }

  const symPct = Math.round(stats.symmetry * 100);
  const symNote = symPct >= 88
    ? `symmetric (${symPct}% — mirror: "auto" / mirrored E from W fits)`
    : symPct >= 70
    ? `mostly symmetric (${symPct}% — minor asymmetric gear/pose)`
    : `asymmetric (${symPct}% — use distinct left/right parts or headings)`;
  const meshIntegrity = stats.watertight
    ? `watertight solid (0 open edges, vol ${stats.volume.toFixed(2)}, area ${stats.area.toFixed(2)})`
    : `open/non-manifold (${stats.boundaryEdges} boundary, ${stats.nonManifoldEdges} non-manifold edges; area ${stats.area.toFixed(2)})`;
  const unitHint = model.format?.startsWith("stl")
    ? (Math.max(dx, dy, dz) > 10 ? " (STL has no units; values look like mm — e.g. 3D-print scale)" : " (STL has no units; values look like meters/cm)")
    : "";
  const scales = [24, 32, 48, 64].map((h) => `${Math.max(8, Math.round(h * wh))}x${h}px (D~${Math.max(6, Math.round(h * dh))}px)`);
  const palette = [...new Set(model.mats.map((m) => pack(m.r, m.g, m.b)))];

  const text = [
    `3D MODEL STUDY: ${basename(path)} (${model.format ?? extname(path).slice(1)}, ${model.upAxis ?? "z"}-up)`,
    `  geometry: ${model.vertices.toLocaleString()} vertices, ${model.triangles.toLocaleString()} triangles, ${model.mats.length} material${model.mats.length === 1 ? "" : "s"}${model.textures ? ` (${model.textures} textured)` : ""}`,
    `  mesh: ${meshIntegrity}`,
    `  bounds (W x D x H): ${fmt(dx)} x ${fmt(dy)} x ${fmt(dz)}${unitHint}`,
    `  ratios: W/H=${fmt(wh)}, D/H=${fmt(dh)}, D/W=${fmt(dw)}`,
    `  symmetry: ${symNote}`,
    "",
    "HEIGHT PROFILE (top 100% down to base 0%; widths & depths as fraction of total height H):",
    ...profileLines,
    "",
    "PXL PIXEL-ART TARGETS:",
    `  sprite boxes at 24 / 32 / 48 / 64px tall: ${scales.join("  |  ")}`,
    `  turnaround: ${labels.join(", ")} at pitch ${pitch} deg (${size}px cells); pass --up ${model.upAxis === "z" ? "y" : "z"} if the model is tipped on its side`,
  ];
  return { text, sheet, model, stats, palette };
}

/** Render an orthographic multi-angle turnaround sheet of a 3D model matching pxl's camera and heading conventions. */
export function renderModelTurnaround(model: Model3D, opts: TurnaroundOpts = {}): { img: Img; labels: string[]; pitch: number; size: number } {
  const pitch = opts.pitch ?? 20;
  const dirsCount = opts.dirs ?? 5;
  const size = opts.size ?? 160;
  if (!(Number.isFinite(pitch) && pitch >= -90 && pitch <= 90)) throw new PxError(`--pitch is degrees down (-90 to 90), got ${pitch}`);
  const views = DIR_SETS[dirsCount];
  if (!views) throw new PxError(`--dirs takes 1, 4, 5 or 8 (got ${dirsCount})`);
  if (!(Number.isInteger(size) && size >= 16 && size <= 512)) throw new PxError(`--size is a whole cell size 16..512, got ${size}`);

  const { verts, norms, uvs, hasUv, tris, matIds, mats, min, max, vertices, triangles } = model;
  const cx = (min[0] + max[0]) * 0.5, cy = (min[1] + max[1]) * 0.5, cz = (min[2] + max[2]) * 0.5;

  // Compute uniform scale across all requested views so every direction compares at 1:1 proportions.
  const bases = views.map((v) => orthoBasis({ kind: "side", yaw: 180 - v.heading, pitch }));
  let maxHalfU = 1e-6, minV = Infinity, maxV = -Infinity;
  for (const b of bases) {
    const [rx, ry, rz] = b.R, [ux, uy, uz] = b.U;
    for (let i = 0; i < vertices; i++) {
      const dx = verts[i * 3] - cx, dy = verts[i * 3 + 1] - cy, dz = verts[i * 3 + 2] - cz;
      const u = Math.abs(dx * rx + dy * ry + dz * rz);
      const v = dx * ux + dy * uy + dz * uz;
      if (u > maxHalfU) maxHalfU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  const spanU = maxHalfU * 2, spanV = Math.max(1e-6, maxV - minV);
  const pad = Math.max(4, Math.round(size * 0.06));
  const scale = (size - pad * 2) / Math.max(spanU, spanV);
  const midV = (minV + maxV) * 0.5;
  const half = size * 0.5;

  // Reusable projection and Z buffers across views.
  const projX = new Float32Array(vertices);
  const projY = new Float32Array(vertices);
  const projZ = new Float32Array(vertices);
  const zbuf = new Float32Array(size * size);
  const labelH = 7;

  const cells: Img[] = views.map((view, vi) => {
    const { R, U, F } = bases[vi];
    const [rx, ry, rz] = R, [ux, uy, uz] = U, [fx, fy, fz] = F;
    // Key light in camera space (upper-left toward viewer, matching surface()'s default light).
    const lx0 = -0.55 * rx + 0.65 * ux - 0.52 * fx;
    const ly0 = -0.55 * ry + 0.65 * uy - 0.52 * fy;
    const lz0 = -0.55 * rz + 0.65 * uz - 0.52 * fz;
    const ll = Math.hypot(lx0, ly0, lz0) || 1;
    const lx = lx0 / ll, ly = ly0 / ll, lz = lz0 / ll;
    // Soft fill light from lower-right so shadowed forms remain readable.
    const bx0 = 0.5 * rx - 0.25 * ux - 0.4 * fx;
    const by0 = 0.5 * ry - 0.25 * uy - 0.4 * fy;
    const bz0 = 0.5 * rz - 0.25 * uz - 0.4 * fz;
    const bl = Math.hypot(bx0, by0, bz0) || 1;
    const bx = bx0 / bl, by = by0 / bl, bz = bz0 / bl;

    for (let i = 0; i < vertices; i++) {
      const dx = verts[i * 3] - cx, dy = verts[i * 3 + 1] - cy, dz = verts[i * 3 + 2] - cz;
      projX[i] = half + (dx * rx + dy * ry + dz * rz) * scale;
      projY[i] = half - ((dx * ux + dy * uy + dz * uz) - midV) * scale;
      projZ[i] = dx * fx + dy * fy + dz * fz;
    }

    const cell = new Img(size, size + labelH).fill(GAP_C);
    const data = cell.data;
    for (let i = 0; i < size * size; i++) { data[i] = EMPTY; zbuf[i] = Infinity; }

    for (let t = 0; t < triangles; t++) {
      const i0 = tris[t * 3], i1 = tris[t * 3 + 1], i2 = tris[t * 3 + 2];
      const x0 = projX[i0], y0 = projY[i0], z0 = projZ[i0];
      const x1 = projX[i1], y1 = projY[i1], z1 = projZ[i1];
      const x2 = projX[i2], y2 = projY[i2], z2 = projZ[i2];

      const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
      if (area > -1e-6 && area < 1e-6) continue;
      const invArea = 1 / area;

      let minX = Math.floor(Math.min(x0, x1, x2));
      let maxX = Math.ceil(Math.max(x0, x1, x2));
      let minY = Math.floor(Math.min(y0, y1, y2));
      let maxY = Math.ceil(Math.max(y0, y1, y2));
      if (maxX < 0 || minX >= size || maxY < 0 || minY >= size) continue;
      if (minX < 0) minX = 0; if (maxX >= size) maxX = size - 1;
      if (minY < 0) minY = 0; if (maxY >= size) maxY = size - 1;

      const mat = mats[matIds[t]];
      const mr = mat.r, mg = mat.g, mb = mat.b;
      const tex = hasUv ? mat.tex : undefined;

      const n0x = norms[i0 * 3], n0y = norms[i0 * 3 + 1], n0z = norms[i0 * 3 + 2];
      const n1x = norms[i1 * 3], n1y = norms[i1 * 3 + 1], n1z = norms[i1 * 3 + 2];
      const n2x = norms[i2 * 3], n2y = norms[i2 * 3 + 1], n2z = norms[i2 * 3 + 2];
      const hasNorm = (n0x !== 0 || n0y !== 0 || n0z !== 0) && (n1x !== 0 || n1y !== 0 || n1z !== 0) && (n2x !== 0 || n2y !== 0 || n2z !== 0);

      let fnx = 0, fny = 0, fnz = 0;
      if (!hasNorm) {
        const ax = verts[i1 * 3] - verts[i0 * 3], ay = verts[i1 * 3 + 1] - verts[i0 * 3 + 1], az = verts[i1 * 3 + 2] - verts[i0 * 3 + 2];
        const cxv = verts[i2 * 3] - verts[i0 * 3], cyv = verts[i2 * 3 + 1] - verts[i0 * 3 + 1], czv = verts[i2 * 3 + 2] - verts[i0 * 3 + 2];
        fnx = ay * czv - az * cyv; fny = az * cxv - ax * czv; fnz = ax * cyv - ay * cxv;
        const fl = Math.hypot(fnx, fny, fnz) || 1;
        fnx /= fl; fny /= fl; fnz /= fl;
        if (fnx * fx + fny * fy + fnz * fz > 0) { fnx = -fnx; fny = -fny; fnz = -fnz; }
      }

      const u0 = tex ? uvs[i0 * 2] : 0, v0 = tex ? uvs[i0 * 2 + 1] : 0;
      const u1 = tex ? uvs[i1 * 2] : 0, v1 = tex ? uvs[i1 * 2 + 1] : 0;
      const u2 = tex ? uvs[i2 * 2] : 0, v2 = tex ? uvs[i2 * 2 + 1] : 0;
      const tw = tex ? tex.w : 0, th = tex ? tex.h : 0, td = tex?.data;

      // Edge function increments.
      const a12 = y1 - y2, b12 = x2 - x1;
      const a20 = y2 - y0, b20 = x0 - x2;
      const a01 = y0 - y1, b01 = x1 - x0;
      const startX = minX + 0.5, startY = minY + 0.5;
      let e0Row = (x1 - startX) * (y2 - startY) - (y1 - startY) * (x2 - startX);
      let e1Row = (x2 - startX) * (y0 - startY) - (y2 - startY) * (x0 - startX);
      let e2Row = (x0 - startX) * (y1 - startY) - (y0 - startY) * (x1 - startX);

      for (let py = minY; py <= maxY; py++) {
        let e0 = e0Row, e1 = e1Row, e2 = e2Row;
        const rowOff = py * size;
        for (let px = minX; px <= maxX; px++) {
          const w0 = e0 * invArea, w1 = e1 * invArea, w2 = e2 * invArea;
          if (w0 >= -1e-5 && w1 >= -1e-5 && w2 >= -1e-5) {
            const z = w0 * z0 + w1 * z1 + w2 * z2;
            const idx = rowOff + px;
            if (z < zbuf[idx]) {
              zbuf[idx] = z;
              let nx: number, ny: number, nz: number;
              if (hasNorm) {
                nx = w0 * n0x + w1 * n1x + w2 * n2x;
                ny = w0 * n0y + w1 * n1y + w2 * n2y;
                nz = w0 * n0z + w1 * n1z + w2 * n2z;
                const nl = Math.hypot(nx, ny, nz) || 1;
                nx /= nl; ny /= nl; nz /= nl;
                if (nx * fx + ny * fy + nz * fz > 0) { nx = -nx; ny = -ny; nz = -nz; }
              } else {
                nx = fnx; ny = fny; nz = fnz;
              }
              const key = Math.max(0, nx * lx + ny * ly + nz * lz);
              const fill = Math.max(0, nx * bx + ny * by + nz * bz);
              const lit = 0.28 + 0.12 * (nz * 0.5 + 0.5) + 0.62 * key + 0.14 * fill;
              let cr = mr, cg = mg, cb = mb;
              if (td) {
                const u = w0 * u0 + w1 * u1 + w2 * u2;
                const v = w0 * v0 + w1 * v1 + w2 * v2;
                const tx = Math.min(tw - 1, Math.floor((u - Math.floor(u)) * tw));
                const ty = Math.min(th - 1, Math.floor((v - Math.floor(v)) * th));
                const tc = td[ty * tw + tx];
                cr = ((tc >>> 24) * mr) / 255;
                cg = (((tc >>> 16) & 255) * mg) / 255;
                cb = (((tc >>> 8) & 255) * mb) / 255;
              }
              data[idx] = pack(
                Math.min(255, Math.round(cr * lit)),
                Math.min(255, Math.round(cg * lit)),
                Math.min(255, Math.round(cb * lit)),
              );
            }
          }
          e0 += a12; e1 += a20; e2 += a01;
        }
        e0Row += b12; e1Row += b20; e2Row += b01;
      }
    }

    // Crisp centered 3x5 heading label beneath the view cell.
    const label = view.label.toUpperCase();
    let gx = Math.max(1, Math.floor((size - lineWidth(label)) / 2));
    for (const ch of label) {
      const g = glyph(ch);
      for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === "#") cell.set(gx + i, size + 1 + j, LABEL);
      gx += g[0].length + 1;
    }
    return cell;
  });

  // Pack cells in rows fitting within 1568 px.
  const cols = perRow(cells.length, size);
  const rows: Img[] = [];
  for (let r = 0; r < cells.length; r += cols) {
    const slice = cells.slice(r, r + cols);
    const rw = slice.length * size + GAP * (slice.length - 1);
    const row = new Img(rw, size + labelH).fill(GAP_C);
    slice.forEach((c, i) => row.blit(c, i * (size + GAP), 0));
    rows.push(row);
  }
  const totalW = Math.max(...rows.map((r) => r.w));
  const totalH = rows.reduce((s, r) => s + r.h, 0) + GAP * (rows.length - 1);
  const img = new Img(totalW, totalH).fill(GAP_C);
  let yOff = 0;
  for (const row of rows) { img.blit(row, 0, yOff); yOff += row.h + GAP; }
  return { img, labels: views.map((v) => v.label.toUpperCase()), pitch, size };
}
