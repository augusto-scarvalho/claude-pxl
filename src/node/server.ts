// Live viewer server: watch art files, rebuild with traces, push updates over SSE.
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { stripTypeScriptTypes } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type PxError, wrap } from "../core/errors.ts";
import type { BuildOut } from "../core/build.ts";
import type { AssetDef } from "../core/model.ts";
import type { Project } from "../core/project.ts";
import { loadProject } from "./load.ts";
import { writeOutputs } from "./output.ts";

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

export function serve(file: string, opts: ServeOptions = {}): Promise<{ url: string; close: () => void }> {
  const abs = resolve(file);
  const out = opts.out === false ? undefined : opts.out ?? join(dirname(abs), "out");
  const log = opts.log ?? ((l: string) => console.log(l));
  const clients = new Set<ServerResponse>();
  let project: Project | undefined;
  let state: State = { version: 0, file: basename(abs), time: "", ms: 0, assets: [], sheets: [], errors: [] };
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
    const next: State = { version: state.version + 1, file: basename(abs), time: new Date().toLocaleTimeString(), ms: 0, assets: [], sheets: [], errors: [] };
    try {
      project = loadProject(abs, { trace: true });
    } catch (e) {
      project = undefined;
      next.error = errInfo(wrap(e));
    }
    if (project) {
      for (const name of project.order) {
        const def = project.assets.get(name)!;
        const fp = fingerprint(def);
        const info: AssetInfo = { name, kind: def.kind, part: name.startsWith("_"), changed: false, edited: fps.size > 0 && fps.get(name) !== fp };
        fps.set(name, fp);
        try {
          const b = project.build(name);
          info.w = b.img.w;
          info.h = b.img.h;
          // Animated assets: every frame counts, so an edit to frame 3 still refreshes the viewer.
          info.hash = b.anim ? project.frames(name).map((f) => f.img.hash() + f.ms).join("|") : b.img.hash();
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
        const r = writeOutputs(project, out, { preview: opts.preview });
        // asset failures are already listed per asset; keep the rest (sheets, unknown names)
        next.errors = r.errors.filter((e) => !next.assets.some((a) => a.error?.message === e.message)).map(errInfo);
      }
      watch(project.files);
    } else watch([abs]);
    next.ms = Math.round(performance.now() - t0);
    state = next;
    const bad = next.error ? 1 : next.assets.filter((a) => a.error).length + next.errors.length;
    const changed = next.assets.filter((a) => a.changed && !a.error).map((a) => a.name);
    log(`[pxl] v${next.version} ${next.ms}ms: ${next.assets.length} assets, ${bad} error(s)` +
      (changed.length && state.version > 1 ? `, changed: ${changed.slice(0, 8).join(" ")}${changed.length > 8 ? " …" : ""}` : "") +
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
    return {
      name, kind: def.kind, w: b.img.w, h: b.img.h, loc: def.loc,
      palette: def.pal.table(),
      layers: b.layers.map((l) => l.name),
      image: b64((b.guide ?? b.img).data), // reference layers show here too, as in previews
      anim: b.anim ? project.frames(name, 0, 240).map((f) => ({ ms: f.ms, image: b64(f.img.data) })) : undefined,
      frames: (withFrames ? b.trace?.frames ?? [] : []).map((f) => ({
        label: f.label, loc: f.loc, w: f.w, h: f.h,
        full: f.full ? b64(f.full) : undefined,
        changes: f.changes ? b64(f.changes) : undefined,
      })),
    };
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    try {
      if (url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(join(viewerDir, "index.html")));
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
