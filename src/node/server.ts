// Live viewer server: watch art files, rebuild with traces, push updates over SSE.
import { existsSync, readFileSync, unwatchFile, watchFile } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { stripTypeScriptTypes } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type PxError, wrap } from "../core/errors.ts";
import type { BuildOut } from "../core/build.ts";
import { Img } from "../core/image.ts";
import type { Frame } from "../core/trace.ts";
import type { AssetDef } from "../core/model.ts";
import type { Project } from "../core/project.ts";
import { loadProject } from "./load.ts";
import { writeOutputs } from "./output.ts";
import { encodePng } from "./png.ts";
import { frameCount, frameTime } from "./shot.ts";

/**
 * An animated asset whose loop holds more pixels than this (frames x w x h; a 1920x1080 scene's 484
 * frames hold 1e9) is long: its frames are built when the page asks for them, one at a time, and a
 * save doesn't build or write them all. The rest come whole with the asset, as PNGs.
 */
const LONG = 1 << 24;
/** Frames the page plays of a loop at most (frames() keeps 600). */
const MAX_FRAMES = 600;
/**
 * A painting step of more bytes than this goes as the picture after it, a PNG, and the page finds
 * what it changed (a 1920x1080 scene's mesh(): 16.6 MB of changes, a PNG of 154 kB).
 */
const BIG_STEP = 1 << 18;

export interface ServeOptions {
  port?: number;
  /** Also write outputs (PNGs, previews) on every build; default `<file dir>/out`. false = off. */
  out?: string | false;
  preview?: boolean;
  log?: (line: string) => void;
}

interface AssetInfo {
  name: string;
  kind: string;
  part: boolean;
  w?: number;
  h?: number;
  hash?: string;
  steps?: number;
  /** Image differs from the previous build. */
  changed: boolean;
  /** Its own definition text changed (not just something it uses). */
  edited: boolean;
  error?: ErrInfo;
}

interface ErrInfo {
  message: string;
  loc?: string;
}

interface State {
  version: number;
  file: string;
  time: string;
  ms: number;
  error?: ErrInfo;
  assets: AssetInfo[];
  sheets: string[];
  /** the 3D files export3d wrote that /3d shows (.glb, .ply) */
  models: string[];
  errors: ErrInfo[];
}

const here = dirname(fileURLToPath(import.meta.url));
const viewerDir = join(here, "..", "viewer");

function errInfo(e: PxError): ErrInfo {
  return { message: e.message, loc: e.loc };
}

/** Text fingerprint of an asset's own definition (items, options, palette), ignoring locations. */
function fingerprint(def: AssetDef): string {
  return JSON.stringify([def.opts, def.items, def.pal.table(), def.pal.ramps], (k, v) =>
    k === "loc" ? undefined : typeof v === "function" ? String(v) : v);
}

function b64(a: Uint32Array): string {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
}

/** The painting steps for the page: the pixels each changed, or, a big one, the picture after it (see BIG_STEP). */
function stepsOut(steps: Frame[]) {
  const size = (f: Frame) => (f.full ?? f.changes)?.byteLength ?? 0, big = steps.some((f) => size(f) > BIG_STEP);
  let pic: Uint32Array | undefined; // the picture after each step, kept when one is big
  return steps.map((f) => {
    if (big) {
      if (f.full) pic = f.full.slice();
      else if (f.changes && pic) for (let j = 0; j < f.changes.length; j += 2) pic[f.changes[j]] = f.changes[j + 1];
    }
    const png = big && pic && size(f) > BIG_STEP ? encodePng(new Img(f.w, f.h, pic)).toString("base64") : undefined;
    return {
      label: f.label, loc: f.loc, w: f.w, h: f.h, png,
      full: f.full && !png ? b64(f.full) : undefined,
      changes: f.changes && !png ? b64(f.changes) : undefined,
    };
  });
}

/** An animated asset's frame count on the page, and whether its loop is long (see LONG); undefined for a still one. */
function loopOf(p: Project, name: string, b: BuildOut): { n: number; long: boolean } | undefined {
  if (!b.anim) return undefined;
  const n = Math.min(MAX_FRAMES, frameCount(p, name));
  return { n, long: n * b.img.w * b.img.h > LONG };
}

export function serve(file: string, opts: ServeOptions = {}): Promise<{ url: string; close: () => void }> {
  const abs = resolve(file);
  const out = opts.out === false ? undefined : opts.out ?? join(dirname(abs), "out");
  const log = opts.log ?? ((l: string) => console.log(l));
  const clients = new Set<ServerResponse>();
  let project: Project | undefined;
  let state: State = { version: 0, file: basename(abs), time: "", ms: 0, assets: [], sheets: [], models: [], errors: [] };
  const hashes = new Map<string, string>();
  const fps = new Map<string, string>();
  let watched = new Set<string>();
  let timer: NodeJS.Timeout | undefined;

  const broadcast = () => {
    const msg = `event: build\ndata: ${JSON.stringify(state)}\n\n`;
    for (const c of clients) c.write(msg);
  };

  const rebuild = () => {
    const t0 = performance.now();
    const next: State = { version: state.version + 1, file: basename(abs), time: new Date().toLocaleTimeString(), ms: 0, assets: [], sheets: [], models: [], errors: [] };
    try {
      project = loadProject(abs, { trace: true });
    } catch (e) {
      project = undefined;
      next.error = errInfo(wrap(e));
    }
    const long: string[] = [];
    if (project) {
      for (const name of project.order) {
        const def = project.assets.get(name)!;
        const fp = fingerprint(def);
        const info: AssetInfo = { name, kind: def.kind, part: /(^|\.)_/.test(name), changed: false, edited: fps.size > 0 && fps.get(name) !== fp };
        fps.set(name, fp);
        try {
          const b = project.build(name);
          info.w = b.img.w;
          info.h = b.img.h;
          // Animated assets: every frame counts, so an edit to frame 3 still refreshes the viewer.
          // ponytail: a long loop isn't built to find out: taken as changed by every save (its frames
          // fetched again), not compared frame by frame
          const loop = loopOf(project, name, b);
          if (loop?.long) long.push(name);
          info.hash = !loop ? b.img.hash() : loop.long ? `${b.img.hash()}@${next.version}` : project.frames(name).map((f) => f.img.hash() + f.ms).join("|");
          info.steps = b.trace?.frames.length ?? 0;
          info.changed = hashes.get(name) !== info.hash;
          hashes.set(name, info.hash);
        } catch (e) {
          info.error = errInfo(wrap(e));
          info.changed = true;
          hashes.delete(name);
        }
        next.assets.push(info);
      }
      next.sheets = project.sheets.map((s) => s.name);
      if (out) {
        // a long loop's frames, GIFs and sheets aren't written on every save (pxl build --only writes them)
        const only = long.length ? [...project.exported().filter((n) => !long.includes(n)), ...project.sheets.map((s) => s.name), ...project.models.map((m) => m.name)] : undefined;
        const r = writeOutputs(project, out, { preview: opts.preview, only });
        // asset failures are already listed per asset; keep the rest (sheets, unknown names)
        next.errors = r.errors.filter((e) => !next.assets.some((a) => a.error?.message === e.message)).map(errInfo);
        // what /3d can show: a .glb (a loop's moments in one), or a .ply (its first moment)
        next.models = project.models.flatMap((m) => [...(m.as.includes("glb") ? [`${m.name}.glb`] : []), ...(m.as.includes("ply") ? [m.frames ? `${m.name}_0.ply` : `${m.name}.ply`] : [])])
          .filter((f) => existsSync(join(out, f)));
      }
      watch(project.files);
    } else watch([abs]);
    next.ms = Math.round(performance.now() - t0);
    state = next;
    const bad = next.error ? 1 : next.assets.filter((a) => a.error).length + next.errors.length;
    const changed = next.assets.filter((a) => a.changed && !a.error).map((a) => a.name);
    log(`[pxl] v${next.version} ${next.ms}ms: ${next.assets.length} assets, ${bad} error(s)` +
      (changed.length && state.version > 1 ? `, changed: ${changed.slice(0, 8).join(" ")}${changed.length > 8 ? " …" : ""}` : "") +
      (long.length && next.version === 1 ? `\n  long loops, built a frame at a time as the page shows them${out ? ` and not written on save (pxl build --only ${long.join(",")})` : ""}: ${long.join(" ")}` : "") +
      (next.error ? `\n  ${next.error.message}` : ""));
    broadcast();
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 60);
  };

  // Polling watch: survives editors that replace files on save.
  function watch(files: string[]) {
    const nextSet = new Set(files.filter((f) => !f.startsWith("<")));
    for (const f of watched) if (!nextSet.has(f)) unwatchFile(f);
    for (const f of nextSet) if (!watched.has(f)) watchFile(f, { interval: 150 }, (a, b) => { if (a.mtimeMs !== b.mtimeMs) schedule(); });
    watched = nextSet;
  }

  const assetPayload = (name: string, withFrames: boolean) => {
    if (!project) return undefined;
    const def = project.assets.get(name);
    if (!def) return undefined;
    let b: BuildOut;
    try { b = project.build(name); } catch { return undefined; }
    const tl = b.anim, loop = loopOf(project, name, b);
    return {
      name, kind: def.kind, w: b.img.w, h: b.img.h, loc: def.loc,
      palette: def.pal.table(),
      layers: b.layers.map((l) => l.name),
      image: encodePng(b.guide ?? b.img).toString("base64"), // reference layers show here too, as in previews
      // each frame's ms; the frames themselves (PNGs) with a short loop's steps, else from /api/frame one at a time
      anim: tl && loop ? {
        ms: Array.from({ length: loop.n }, (_, i) => tl.durations?.[i] ?? tl.step),
        images: withFrames && !loop.long ? project.frames(name, 0, loop.n).map((f) => encodePng(f.img).toString("base64")) : undefined,
      } : undefined,
      frames: stepsOut(withFrames ? b.trace?.frames ?? [] : []),
    };
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    try {
      if (url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(join(viewerDir, "index.html")));
      } else if (url.pathname === "/3d") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(join(viewerDir, "3d.html")));
      } else if (url.pathname.startsWith("/files/") && out && state.models.includes(decodeURIComponent(url.pathname.slice(7)))) {
        // only the files listed: nothing else of the folder is served
        res.writeHead(200, { "content-type": url.pathname.endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream", "cache-control": "no-store" });
        res.end(readFileSync(join(out, decodeURIComponent(url.pathname.slice(7)))));
      } else if (url.pathname === "/app.js") {
        const src = readFileSync(join(viewerDir, "app.ts"), "utf8");
        res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        res.end(stripTypeScriptTypes(src, { mode: "strip" }));
      } else if (url.pathname === "/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        res.write(`event: build\ndata: ${JSON.stringify(state)}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
      } else if (url.pathname === "/api/state") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(state));
      } else if (url.pathname === "/api/asset") {
        const p = assetPayload(url.searchParams.get("name") ?? "", url.searchParams.get("frames") !== "0");
        res.writeHead(p ? 200 : 404, { "content-type": "application/json" });
        res.end(JSON.stringify(p ?? { error: "not found" }));
      } else if (url.pathname === "/api/frame") {
        // one frame of a loop as a PNG, built now and not kept (the page keeps the few it needs)
        const name = url.searchParams.get("name") ?? "", i = Number(url.searchParams.get("i"));
        if (!project?.assets.has(name)) { res.writeHead(404); res.end("not found"); return; }
        const t = frameTime(project, name, i), png = encodePng(project.build(name, 0, t).img);
        project.forget(name, t);
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-store" });
        res.end(png);
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });

  const ping = setInterval(() => { for (const c of clients) c.write(": ping\n\n"); }, 15000);

  return new Promise((ok, fail) => {
    server.on("error", fail);
    server.listen(opts.port ?? 4321, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : opts.port;
      const url = `http://127.0.0.1:${port}/`;
      rebuild();
      ok({
        url,
        close: () => {
          clearInterval(ping);
          clearTimeout(timer);
          for (const f of watched) unwatchFile(f);
          for (const c of clients) c.end();
          server.close();
        },
      });
    });
  });
}
