import { type Color, oklab, parseHex, TRANSPARENT, toHex } from "./color.ts";
import { PxError, didYouMean } from "./errors.ts";

export const INDEX_KEYS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const RESERVED = new Set([".", "_", " ", "#"]);

export const BUILTIN: Record<string, string[]> = {
  pico8: ["000000", "1d2b53", "7e2553", "008751", "ab5236", "5f574f", "c2c3c7", "fff1e8",
          "ff004d", "ffa300", "ffec27", "00e436", "29adff", "83769c", "ff77a8", "ffccaa"],
  sweetie16: ["1a1c2c", "5d275d", "b13e53", "ef7d57", "ffcd75", "a7f070", "38b764", "257179",
              "29366f", "3b5dc9", "41a6f6", "73eff7", "f4f4f4", "94b0c2", "566c86", "333c57"],
  db16: ["140c1c", "442434", "30346d", "4e4a4e", "854c30", "346524", "d04648", "757161",
         "597dce", "d27d2c", "8595a1", "6daa2c", "d2aa99", "6dc2ca", "dad45e", "deeed6"],
  endesga32: ["be4a2f", "d77643", "ead4aa", "e4a672", "b86f50", "733e39", "3e2731", "a22633",
              "e43b44", "f77622", "feae34", "fee761", "63c74d", "3e8948", "265c42", "193c3e",
              "124e89", "0099db", "2ce8f5", "ffffff", "c0cbdc", "8b9bb4", "5a6988", "3a4466",
              "262b44", "181425", "ff0044", "68386c", "b55088", "f6757a", "e8b796", "c28569"],
  gray8: ["000000", "242424", "494949", "6d6d6d", "929292", "b6b6b6", "dbdbdb", "ffffff"],
};

/** File extensions use() reads as palettes. */
export const PALETTE_FILE = /\.(hex|gpl|pal|txt)$/i;

/**
 * A palette file: .hex (Lospec: "rrggbb" per line), .gpl (GIMP, Aseprite) and .pal (JASC: "R G B"
 * lines), .txt (Paint.NET: "aarrggbb"). A one-character word right after a color is its key
 * ("1a1626 k ink"; in a .gpl, the color's name), so keys sit next to their colors. A file that
 * names no keys gets index keys 0-9a-zA-Z; in one that does, only the named colors have keys.
 */
export function paletteFromFile(text: string, file: string): Palette {
  const ext = file.toLowerCase().replace(/^.*\./, "");
  const colors: string[] = [], named: { key: string; i: number; line: number }[] = [];
  text.split(/\r?\n/).forEach((raw, n) => {
    const l = raw.trim();
    let m: RegExpExecArray | null = null, hex = "";
    if (ext === "hex" && (m = /^#?([0-9a-f]{6})(?=\s|$)(.*)$/i.exec(l))) hex = m[1];
    else if (ext === "txt" && (m = /^[0-9a-f]{2}([0-9a-f]{6})(?=\s|$)(.*)$/i.exec(l))) hex = m[1];
    else if ((ext === "gpl" || ext === "pal") && (m = /^(\d+)\s+(\d+)\s+(\d+)(?=\s|$)(.*)$/.exec(l)))
      hex = [m[1], m[2], m[3]].map((v) => Math.min(255, +v).toString(16).padStart(2, "0")).join("");
    if (!m) return;
    const key = m[m.length - 1].trim().split(/\s+/)[0];
    if (key && [...key].length === 1) named.push({ key, i: colors.length, line: n + 1 });
    colors.push(hex);
  });
  if (!colors.length) throw new PxError(`no colors found in palette file '${file}'`);
  const base = Palette.fromColors(colors);
  if (!named.length) return base;
  const keys = new Map<string, Color>(), order: string[] = [];
  for (const { key, i, line } of named) {
    if (RESERVED.has(key)) throw new PxError(`${file} line ${line}: key '${key}' is reserved (. _ space #)`);
    if (keys.has(key)) throw new PxError(`${file} line ${line}: key '${key}' is already used by an earlier color`);
    keys.set(key, base.list[i]);
    order.push(key);
  }
  return new Palette(keys, [...base.list], order, new Set(), []);
}

/** What a color spec resolves to: a color, or null for "skip this pixel". */
export type Resolved = Color | null;

/**
 * Immutable palette: single-char keys -> colors, plus light/dark ramps.
 * Ramps are strings of keys from dark to light ("kDdu"); shade() steps left, light() right.
 */
export class Palette {
  readonly keys: ReadonlyMap<string, Color>;
  readonly list: readonly Color[];
  readonly order: readonly string[];
  readonly aliases: ReadonlySet<string>;
  readonly ramps: readonly string[];
  /** The default a file starts with and never named with use(): its colors aren't the file's choice. */
  readonly implicit: boolean;

  constructor(keys: Map<string, Color>, list: Color[], order: string[], aliases: Set<string>, ramps: string[], implicit = false) {
    this.keys = keys;
    this.list = list;
    this.order = order;
    this.aliases = aliases;
    this.ramps = ramps;
    this.implicit = implicit;
  }

  /** This palette as the default a file starts with (see `implicit`). */
  asDefault(): Palette {
    return new Palette(new Map(this.keys), [...this.list], [...this.order], new Set(this.aliases), [...this.ramps], true);
  }

  /**
   * The colors the file chose: the palette it named with use() and every key it set; on the default
   * it never named, only the keys it set with pal(). What a subpixel edge may take between two colors.
   */
  chosen(): Color[] {
    const set = new Set([...this.aliases].map((k) => this.keys.get(k)!));
    if (!this.implicit) for (const c of [...this.list, ...this.keys.values()]) set.add(c);
    return [...set];
  }

  static fromColors(colors: (string | number)[]): Palette {
    const keys = new Map<string, Color>(), list: Color[] = [], order: string[] = [];
    colors.forEach((c, i) => {
      const v = typeof c === "number" ? c >>> 0 : parseHex(c);
      if (v === undefined) throw new PxError(`bad palette color '${c}'`);
      list.push(v);
      const k = INDEX_KEYS[i];
      if (k) { keys.set(k, v); order.push(k); }
    });
    return new Palette(keys, list, order, new Set(), []);
  }

  static builtin(name: string): Palette {
    const cols = BUILTIN[name];
    if (!cols) throw new PxError(`unknown palette '${name}'${didYouMean(name, Object.keys(BUILTIN))} (have: ${Object.keys(BUILTIN).join(", ")})`);
    return Palette.fromColors(cols);
  }

  /** Add/override keys: { g: 11 (index), X: "#123456", h: "k" (copy another key) }. */
  extend(aliases: Record<string, string | number>): Palette {
    const keys = new Map(this.keys), order = [...this.order], al = new Set(this.aliases);
    for (const k of Object.keys(aliases)) {
      const v = aliases[k];
      if ([...k].length !== 1) throw new PxError(`palette key must be one character, got '${k}'`);
      if (RESERVED.has(k)) throw new PxError(`palette key '${k}' is reserved (. _ space #)`);
      let c: Color | undefined;
      if (typeof v === "number") {
        c = this.list[v];
        if (c === undefined) throw new PxError(`palette index ${v} out of range for key '${k}' (0..${this.list.length - 1})`);
      } else if ([...v].length === 1) {
        c = keys.get(v);
        if (c === undefined) throw new PxError(`key '${k}' refers to unknown key '${v}'`);
      } else {
        c = parseHex(v);
        if (c === undefined) throw new PxError(`bad color '${v}' for key '${k}' (use "#rrggbb")`);
      }
      if (!keys.has(k)) order.push(k);
      keys.set(k, c);
      al.add(k);
    }
    return new Palette(keys, [...this.list], order, al, [...this.ramps], this.implicit);
  }

  /**
   * Colors where ramps branch (`dir` -1 darker, 1 lighter): two ramps go on from the color to different
   * keys, and stepMap takes the first ramp's, so a pixel of the other branch steps into this one's hue
   * (a light on "SBCcx" turning S into "kSsiI"'s s). Not a branch: a shared end (an ink darkest in every
   * ramp, a glint lightest), a ramp inside another, two ramps joined end to end (one goes on where the
   * other stops: a shadow ramp under a grass ramp). Color -> the words for when a step is taken there.
   */
  stepClashes(dir: -1 | 1): Map<Color, string> {
    const by = new Map<Color, { ramp: string; key: string; to?: string }[]>();
    for (const r of new Set(this.ramps)) {
      const ks = [...r];
      ks.forEach((k, i) => { const c = this.keys.get(k)!; if (!by.has(c)) by.set(c, []); by.get(c)!.push({ ramp: r, key: k, to: ks[i + dir] }); });
    }
    const out = new Map<Color, string>(), verb = dir < 0 ? "shade" : "light";
    for (const [c, list] of by) {
      const on = list.filter((e) => e.to !== undefined && !list.some((f) => f !== e && f.ramp.includes(e.ramp)));
      if (new Set(on.map((e) => e.to)).size < 2) continue;
      const ends = (e: (typeof list)[number]) => e.ramp[0] === e.key ? "first" : e.ramp[e.ramp.length - 1] === e.key ? "last" : "mid";
      if (list.every((e) => ends(e) === "first") || list.every((e) => ends(e) === "last")) continue;
      const [won, ...rest] = on;
      out.set(c, `${verb} stepped '${won.key}' to '${won.to}' along the ramp "${won.ramp}", but the ramps branch there (${rest.map((e) => `in "${e.ramp}" it goes on to '${e.to}'`).join("; ")}): a pixel of the other branch takes this one's color. If both are ${verb === "shade" ? "shaded" : "lit"}, give each branch its own key`);
    }
    return out;
  }

  /**
   * The ramps a run of steps went along, from color a to b (shade: dir -1): "G→E along "EGgl", E→p
   * along "PpE"", or undefined when b isn't a few steps from a. For `pxl steps`.
   */
  stepPath(a: Color, b: Color, dir: -1 | 1): string | undefined {
    const m = this.stepMap(dir), rev = this.reverse(), parts: string[] = [];
    let c = a;
    for (let n = 0; n < 8 && c !== b; n++) {
      const next = m.get(c);
      if (next === undefined) return undefined;
      const ka = rev.get(c)!, kb = rev.get(next)!, ramp = this.ramps.find((r) => r.includes(dir < 0 ? kb + ka : ka + kb));
      parts.push(`${ka}→${kb}${ramp ? ` along "${ramp}"` : ""}`);
      c = next;
    }
    return c === b && parts.length ? parts.join(", ") : undefined;
  }

  withRamps(ramps: string[]): Palette {
    for (const r of ramps)
      for (const k of r) if (!this.keys.has(k)) throw new PxError(`ramp "${r}" uses unknown key '${k}'${didYouMean(k, this.order)}`);
    return new Palette(new Map(this.keys), [...this.list], [...this.order], new Set(this.aliases), [...this.ramps, ...ramps], this.implicit);
  }

  /** Key char, "#hex", "." (skip -> null) or "_" (erase -> transparent). */
  resolve(spec: unknown): Resolved {
    if (spec === "." ) return null;
    if (spec === "_") return TRANSPARENT;
    if (typeof spec === "number") return spec >>> 0;
    if (typeof spec !== "string" || spec === "") throw new PxError(`color must be a palette key or "#hex", got ${JSON.stringify(spec)}`);
    if (spec.startsWith("#")) {
      const c = parseHex(spec);
      if (c === undefined) throw new PxError(`bad color '${spec}'`);
      return c;
    }
    const c = this.keys.get(spec);
    if (c === undefined) {
      const hint = this.keys.has(spec.toLowerCase()) ? ` (did you mean '${spec.toLowerCase()}'?)`
        : this.keys.has(spec.toUpperCase()) ? ` (did you mean '${spec.toUpperCase()}'?)` : "";
      throw new PxError(`unknown color key '${spec}'${hint} (have: ${this.order.join("")})`);
    }
    return c;
  }

  /** Map each of `colors` to the nearest keyed color (redmean distance); transparent stays. */
  snapMap(colors: Iterable<Color>): Map<Color, Color> {
    const keyed = [...new Set(this.keys.values())].filter((c) => c !== TRANSPARENT), m = new Map<Color, Color>();
    const lab = new Map(keyed.map((k) => [k, oklab(k)]));
    for (const c of colors) {
      if (c === TRANSPARENT || m.has(c)) continue;
      // nearest as the eye sees it (OKLab): an RGB distance folds dark tones into the wrong hue
      let best = c, bd = Infinity;
      const p = oklab(c);
      for (const k of keyed) {
        const q = lab.get(k)!, d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
      m.set(c, best);
    }
    return m;
  }

  /** Map color -> darker (dir -1) or lighter (dir +1) neighbour along the ramps. */
  stepMap(dir: -1 | 1): Map<Color, Color> {
    if (!this.ramps.length) throw new PxError('no ramps defined: add ramps("kDdu", ...) (dark -> light) after pal()');
    const m = new Map<Color, Color>();
    for (const r of this.ramps) {
      const ks = [...r];
      for (let i = 0; i < ks.length; i++) {
        const to = ks[i + dir];
        if (to === undefined) continue;
        const a = this.keys.get(ks[i])!, b = this.keys.get(to)!;
        if (!m.has(a)) m.set(a, b);
      }
    }
    return m;
  }

  /** Color -> key, preferring named aliases over index keys. */
  reverse(): Map<Color, string> {
    const r = new Map<Color, string>();
    for (const k of this.order) {
      const c = this.keys.get(k)!;
      const cur = r.get(c);
      if (cur === undefined || (this.aliases.has(k) && !this.aliases.has(cur))) r.set(c, k);
    }
    return r;
  }

  /** Key -> "#hex" for viewers. */
  table(): Record<string, string> {
    const t: Record<string, string> = {};
    for (const k of this.order) t[k] = toHex(this.keys.get(k)!);
    return t;
  }
}
