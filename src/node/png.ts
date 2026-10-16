import { crc32, deflateSync, inflateSync } from "node:zlib";
import { TRANSPARENT, pack } from "../core/color.ts";
import { Img } from "../core/image.ts";

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

/** PNG bytes: indexed (with tRNS) when the image has <= 256 colors, RGBA otherwise. */
export function encodePng(img: Img): Buffer {
  const { w, h, data } = img;
  const index = new Map<number, number>();
  for (let i = 0; i < data.length && index.size <= 256; i++) if (!index.has(data[i])) index.set(data[i], index.size);
  const indexed = index.size <= 256;

  const rowLen = indexed ? w + 1 : w * 4 + 1;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    let o = y * rowLen + 1; // filter byte 0
    for (let x = 0; x < w; x++) {
      const c = data[y * w + x];
      if (indexed) raw[o++] = index.get(c)!;
      else { raw[o++] = c >>> 24; raw[o++] = (c >>> 16) & 255; raw[o++] = (c >>> 8) & 255; raw[o++] = c & 255; }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = indexed ? 3 : 6;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr)];
  if (indexed) {
    const colors = [...index.keys()];
    const plte = Buffer.alloc(colors.length * 3), trns = Buffer.alloc(colors.length);
    let lastAlpha = -1;
    colors.forEach((c, i) => {
      plte[i * 3] = c >>> 24; plte[i * 3 + 1] = (c >>> 16) & 255; plte[i * 3 + 2] = (c >>> 8) & 255;
      trns[i] = c === TRANSPARENT ? 0 : c & 255;
      if (trns[i] !== 255) lastAlpha = i;
    });
    parts.push(chunk("PLTE", plte));
    if (lastAlpha >= 0) parts.push(chunk("tRNS", trns.subarray(0, lastAlpha + 1)));
  }
  parts.push(chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/**
 * Decode a PNG: grayscale, RGB, indexed, gray+alpha, RGBA; 1-16 bits per sample; all five
 * scanline filters; tRNS transparency. Not interlaced (Adam7): those fail with a message.
 */
export function decodePng(buf: Uint8Array): Img {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (b.length < 8 || b.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG file");
  let o = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0;
  let plte: Buffer | undefined, trns: Buffer | undefined;
  const idat: Buffer[] = [];
  while (o + 8 <= b.length) {
    const len = b.readUInt32BE(o), kind = b.toString("ascii", o + 4, o + 8), data = b.subarray(o + 8, o + 8 + len);
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; }
    else if (kind === "PLTE") plte = data;
    else if (kind === "tRNS") trns = data;
    else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
    o += 12 + len;
  }
  if (interlace) throw new Error("interlaced PNGs aren't supported: save it again without interlacing");
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (!channels || ![1, 2, 4, 8, 16].includes(depth)) throw new Error(`unsupported PNG (color type ${type}, ${depth}-bit)`);
  if (type === 3 && !plte) throw new Error("indexed PNG without a palette");

  // Undo the per-scanline filters.
  const bpp = Math.max(1, (channels * depth) >> 3), stride = Math.ceil((w * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1), cur = px.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      } else if (f !== 0) throw new Error(`corrupt PNG: filter ${f} on row ${y}`);
      cur[i] = v & 255;
    }
    prev = cur;
  }

  // Samples -> colors.
  const max = (1 << depth) - 1;
  const sample = (y: number, i: number): number => {
    if (depth === 8) return px[y * stride + i];
    if (depth === 16) return px.readUInt16BE(y * stride + i * 2);
    const bit = i * depth;
    return (px[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & max;
  };
  const to8 = (v: number) => (depth === 16 ? v >> 8 : depth < 8 ? Math.round((v * 255) / max) : v);
  const key = trns && (type === 0 || type === 2) ? [0, 2, 4].slice(0, channels).map((k) => trns!.readUInt16BE(k)) : undefined;
  const img = new Img(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = (k: number) => sample(y, x * channels + k);
      let r: number, g: number, bl: number, al = 255;
      if (type === 3) {
        const i = s(0);
        [r, g, bl] = [plte![i * 3], plte![i * 3 + 1], plte![i * 3 + 2]];
        if (trns && i < trns.length) al = trns[i];
      } else if (type === 0 || type === 4) {
        r = g = bl = to8(s(0));
        if (type === 4) al = to8(s(1));
        else if (key && s(0) === key[0]) al = 0;
      } else {
        [r, g, bl] = [to8(s(0)), to8(s(1)), to8(s(2))];
        if (type === 6) al = to8(s(3));
        else if (key && s(0) === key[0] && s(1) === key[1] && s(2) === key[2]) al = 0;
      }
      img.data[y * w + x] = al === 0 ? TRANSPARENT : pack(r, g, bl, al);
    }
  return img;
}
