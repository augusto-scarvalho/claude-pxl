// Tilemaps placed in an asset, as a Tiled map (.tmj): one tile layer per tilemap, each with its own
// tileset image of the distinct tiles it used (after group picks, flips and swaps).
import type { Img } from "./image.ts";
import type { TileLayer } from "./model.ts";
import { packSheet } from "./render.ts";

export interface TiledExport {
  /** The .tmj document, or undefined when no layer could be exported. */
  json?: string;
  /** Tileset images to write next to it: file name -> image. */
  images: { file: string; img: Img }[];
  /** Layers left out, and why. */
  skipped: string[];
}

/**
 * Build the Tiled map. pxl draws a tile with its top-left on the cell's top-left; Tiled draws it
 * with its bottom on the cell's bottom, so a tile taller than its cell gets a tileset `tileoffset`.
 * A layer is left out when its tiles differ in size, are narrower or wider than the cell, or
 * stand by a pivot (props: in Tiled those are objects, not tiles).
 */
export function tiledMap(name: string, layers: TileLayer[]): TiledExport {
  const out: TiledExport = { images: [], skipped: [] };
  const iso = layers[0]?.iso ?? false, tw = layers[0]?.tw ?? 0, th = layers[0]?.th ?? 0;
  const jsonLayers: unknown[] = [], tilesets: unknown[] = [];
  let firstgid = 1;
  for (const l of layers) {
    const tag = `layer '${l.name}'`;
    if (l.iso !== iso || l.tw !== tw || l.th !== th) { out.skipped.push(`${tag}: its cell size or orientation differs from the first tilemap's`); continue; }
    const placed = l.cells.filter((c): c is Img => !!c);
    if (!placed.length) continue;
    const iw = placed[0].w, ih = placed[0].h;
    if (placed.some((c) => c.w !== iw || c.h !== ih)) { out.skipped.push(`${tag}: its tiles differ in size`); continue; }
    if (iw !== tw || ih < th) { out.skipped.push(`${tag}: tiles are ${iw}x${ih}, the cell ${tw}x${th}`); continue; }
    if (placed.some((c) => c.pivot)) { out.skipped.push(`${tag}: tiles with a pivot are props (Tiled objects)`); continue; }
    const ids = new Map<string, number>(), uniq: Img[] = [];
    const data = l.cells.map((c) => {
      if (!c) return 0;
      const h = c.hash();
      if (!ids.has(h)) { ids.set(h, uniq.length); uniq.push(c); }
      return firstgid + ids.get(h)!;
    });
    const columns = Math.min(16, uniq.length), file = `${name}.${jsonLayers.length + 1}.png`;
    const { sheet } = packSheet(uniq.map((img, i) => ({ name: String(i), img })), columns);
    out.images.push({ file, img: sheet });
    tilesets.push({ firstgid, name: `${name} ${l.name}`, tilewidth: iw, tileheight: ih, tilecount: uniq.length, columns,
      image: file, imagewidth: sheet.w, imageheight: sheet.h, margin: 0, spacing: 0,
      ...(ih > th ? { tileoffset: { x: 0, y: ih - th } } : {}) });
    // Tiled puts an isometric map's top corner (cell 0, 0) at x = rows * tw / 2.
    const offsetx = iso ? l.x + tw / 2 - (l.rows * tw) / 2 : l.x;
    jsonLayers.push({ type: "tilelayer", id: jsonLayers.length + 1, name: l.name, width: l.cols, height: l.rows,
      x: 0, y: 0, offsetx, offsety: l.y, opacity: 1, visible: true, data });
    firstgid += uniq.length;
  }
  if (!jsonLayers.length) return out;
  const width = Math.max(...layers.map((l) => l.cols)), height = Math.max(...layers.map((l) => l.rows));
  out.json = JSON.stringify({ type: "map", version: "1.10", tiledversion: "1.10.2", orientation: iso ? "isometric" : "orthogonal",
    renderorder: "right-down", width, height, tilewidth: tw, tileheight: th, infinite: false,
    nextlayerid: jsonLayers.length + 1, nextobjectid: 1, layers: jsonLayers, tilesets }, null, 1) + "\n";
  return out;
}
