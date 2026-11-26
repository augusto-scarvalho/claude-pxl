// Blender interop bridge: runs headless Blender with scripts/blender_pxl.py to export .blend -> .glb
// (for `pxl shot <scene.blend>` / `pxl study <scene.blend>`) or import pxl-exported .glb -> .blend.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PxError } from "../core/errors.ts";

export interface BlenderRunOpts {
  /** Override blender binary path (else BLENDER_BIN env var, PATH, or common install folders). */
  bin?: string;
  /** Scene frame to evaluate when exporting a .blend file. */
  frame?: number;
  /** Camera pitch in degrees down (default 20). */
  pitch?: number;
  /** Optional directory for Blender-rendered orthographic multi-angle PNGs. */
  renders?: string;
  /** Number of directions for --renders (1, 4, 5, 8; default 5). */
  dirs?: number;
  /** Render resolution in px for --renders (default 160). */
  size?: number;
  /** Return command line without executing Blender. */
  dry?: boolean;
  /** Injectable process runner for testing. */
  exec?: (bin: string, args: string[]) => { status: number | null; stdout: string; stderr: string; error?: Error };
}

export interface BlenderResult {
  bin: string;
  args: string[];
  out: string;
  dry: boolean;
  stdout: string;
}

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the bundled headless Blender bridge script (`scripts/blender_pxl.py`). */
export function blenderScriptPath(): string {
  const candidates = [
    resolve(here, "..", "..", "scripts", "blender_pxl.py"),
    resolve(here, "..", "scripts", "blender_pxl.py"),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return candidates[0];
}

/** Locate the Blender executable via BLENDER_BIN, PATH, or standard Windows/macOS install locations. */
export function findBlender(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.BLENDER_BIN && existsSync(env.BLENDER_BIN)) return env.BLENDER_BIN;
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", ["blender"], { encoding: "utf8" });
  if (probe.status === 0 && probe.stdout) {
    const first = probe.stdout.trim().split(/\r?\n/)[0]?.trim();
    if (first && existsSync(first)) return first;
  }
  if (process.platform === "win32") {
    for (const root of ["C:\\Program Files\\Blender Foundation", "C:\\Program Files (x86)\\Blender Foundation"]) {
      if (!existsSync(root)) continue;
      const dirs = readdirSync(root).filter((d) => /^Blender/i.test(d)).sort().reverse();
      for (const d of dirs) {
        const exe = join(root, d, "blender.exe");
        if (existsSync(exe)) return exe;
      }
    }
  } else if (process.platform === "darwin") {
    const mac = "/Applications/Blender.app/Contents/MacOS/Blender";
    if (existsSync(mac)) return mac;
  }
  return null;
}

/** Build the headless Blender CLI arguments for `scripts/blender_pxl.py`. */
export function blenderArgs(mode: "export" | "import", input: string, output: string, opts: BlenderRunOpts = {}): string[] {
  const args = [
    "--background",
    "--factory-startup",
    "--python-exit-code", "1",
    "--python", blenderScriptPath(),
    "--",
    "--mode", mode,
    "--in", resolve(input),
    "--out", resolve(output),
  ];
  if (opts.frame !== undefined) args.push("--frame", String(opts.frame));
  if (opts.pitch !== undefined) args.push("--pitch", String(opts.pitch));
  if (opts.renders) {
    args.push("--renders", resolve(opts.renders));
    if (opts.dirs !== undefined) args.push("--dirs", String(opts.dirs));
    if (opts.size !== undefined) args.push("--size", String(opts.size));
  }
  return args;
}

/** Run headless Blender for export (.blend -> .glb) or import (.glb -> .blend). */
export function runBlender(mode: "export" | "import", input: string, output: string, opts: BlenderRunOpts = {}): BlenderResult {
  const bin = opts.bin ?? findBlender();
  const args = blenderArgs(mode, input, output, opts);
  if (opts.dry) return { bin: bin ?? "blender", args, out: resolve(output), dry: true, stdout: "" };
  if (!bin) {
    throw new PxError(
      `Blender is required to handle .blend files, but 'blender' was not found on PATH (or BLENDER_BIN). ` +
      `Install Blender (winget install BlenderFoundation.Blender, brew install --cask blender, apt install blender) ` +
      `or set BLENDER_BIN=/path/to/blender, or export to .glb/.stl first`,
    );
  }
  const exec = opts.exec ?? ((b: string, a: string[]) => {
    const r = spawnSync(b, a, { encoding: "utf8", maxBuffer: 64 << 20 });
    return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
  });
  const r = exec(bin, args);
  if (r.error) throw new PxError(`failed to launch Blender (${bin}): ${r.error.message}`);
  if (r.status !== 0) {
    const tail = (r.stderr || r.stdout).trim().split(/\r?\n/).slice(-5).join(" | ");
    throw new PxError(`Blender ${mode} failed (exit ${r.status})${tail ? `: ${tail}` : ""}`);
  }
  return { bin, args, out: resolve(output), dry: false, stdout: r.stdout };
}

export function exportBlendToGlb(blendPath: string, outGlb: string, opts: BlenderRunOpts = {}): BlenderResult {
  return runBlender("export", blendPath, outGlb, opts);
}

export function importGlbToBlend(glbPath: string, outBlend: string, opts: BlenderRunOpts = {}): BlenderResult {
  return runBlender("import", glbPath, outBlend, opts);
}
