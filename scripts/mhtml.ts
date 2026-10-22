// Saved web pages (.mhtml: tutorials) opened as data: for each file in a folder, a folder of its own
// with text.txt (the page's text, its images marked where they stood as [IMG imgNNN.ext: alt]) and
// the images. How the tutorials pxl learned from were read (docs/agents.md, teaching pxl from
// tutorials). Nothing in a page runs: its parts are only decoded and written out.
//
//   node scripts/mhtml.ts <folder of .mhtml> <out folder>
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: node scripts/mhtml.ts <folder of .mhtml> <out folder>"); process.exit(1); }

interface Part { type: string; charset: string; location: string; body: Buffer }

/** A MIME message's parts (multipart/related, as browsers save pages), each body decoded. */
function parts(raw: Buffer): Part[] {
  const text = raw.toString("latin1");
  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(text)?.[1];
  if (!boundary) return [];
  const out: Part[] = [];
  for (const chunk of text.split("--" + boundary).slice(1)) {
    const split = chunk.search(/\r?\n\r?\n/);
    if (split < 0) continue;
    const head = chunk.slice(0, split), body = chunk.slice(split).replace(/^\r?\n\r?\n/, "");
    const field = (name: string) => new RegExp(`^${name}:\\s*(.+)$`, "im").exec(head)?.[1].trim() ?? "";
    const ctype = field("Content-Type"), enc = field("Content-Transfer-Encoding").toLowerCase();
    const bytes = enc === "base64" ? Buffer.from(body.replace(/\s+/g, ""), "base64")
      : enc === "quoted-printable" ? Buffer.from(body.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), "latin1")
      : Buffer.from(body, "latin1");
    out.push({ type: ctype.split(";")[0].toLowerCase(), charset: /charset="?([\w-]+)/i.exec(ctype)?.[1] ?? "utf-8", location: field("Content-Location"), body: bytes });
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", times: "×", deg: "°" };
const unescape = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m);

const SKIP = new Set(["script", "style", "noscript", "svg", "head", "template"]);
const BLOCK = new Set(["p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "tr", "section", "article", "blockquote", "pre", "figcaption", "td", "figure"]);

/** The text of a page: tags taken out, blocks on lines of their own, headings as "## ", images marked. */
function textOf(html: string, images: Map<string, string>): string {
  const out: string[] = [];
  let skip = 0;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g)) {
    if (m[4] !== undefined) { if (!skip) out.push(m[4]); continue; }
    const close = m[1] === "/", tag = m[2].toLowerCase(), attrs = m[3];
    if (SKIP.has(tag)) { skip = Math.max(0, skip + (close ? -1 : attrs.trim().endsWith("/") ? 0 : 1)); continue; }
    if (skip) continue;
    if (BLOCK.has(tag)) out.push("\n");
    if (!close && /^h[1-4]$/.test(tag)) out.push("## ");
    if (!close && tag === "img") {
      const attr = (n: string) => new RegExp(`\\s${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(attrs)?.slice(2).find((v) => v !== undefined) ?? "";
      // (Medium and others give the picture in srcset, not src)
      const urls = [attr("src"), attr("data-src"), ...attr("srcset").split(",").map((u) => u.trim().split(" ")[0])];
      const name = urls.map((u) => images.get(unescape(u))).find(Boolean), alt = unescape(attr("alt")).trim();
      out.push(` [IMG ${name ?? "?"}${alt ? `: ${alt}` : ""}] `);
    }
  }
  return unescape(out.join("")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

const EXT: Record<string, string> = { "image/png": ".png", "image/gif": ".gif", "image/jpeg": ".jpg", "image/webp": ".webp" };
mkdirSync(dst, { recursive: true });
for (const f of readdirSync(src).filter((n) => n.toLowerCase().endsWith(".mhtml")).sort()) {
  const slug = basename(f, ".mhtml").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 60).replace(/^_+|_+$/g, "");
  const out = join(dst, slug);
  mkdirSync(out, { recursive: true });
  const ps = parts(readFileSync(join(src, f))), images = new Map<string, string>(), pages: string[] = [];
  let n = 0;
  for (const p of ps) if (p.type.startsWith("image/") && p.body.length >= 600) {
    const name = `img${String(++n).padStart(3, "0")}${EXT[p.type] ?? ".img"}`;
    writeFileSync(join(out, name), p.body);
    images.set(p.location, name);
  }
  for (const p of ps) if (p.type === "text/html") {
    let html: string;
    try { html = new TextDecoder(p.charset).decode(p.body); } catch { html = p.body.toString("utf8"); }
    pages.push(textOf(html, images));
  }
  writeFileSync(join(out, "text.txt"), pages.join("\n\n=====\n\n"), "utf8");
  console.log(`${slug}: ${pages.reduce((s, t) => s + t.length, 0)} chars, ${n} images`);
}
