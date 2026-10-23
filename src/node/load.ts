// Loads art files (.js or .ts) into a Project by running them in a vm sandbox whose globals
// are the DSL. Each load gets a fresh context, so reloading after an edit is clean.
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import * as vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { PxError, wrap } from "../core/errors.ts";
import { Project, type ProjectOptions } from "../core/project.ts";
import { decodePng } from "./png.ts";

/**
 * A fresh context whose globals are the DSL. Not contextified: its global object is an ordinary one,
 * so an art file's own hot loops reading globals (Math, its helpers) run at full speed (a figure drawn
 * of 14k samples took 150 ms through the contextified one's interceptors).
 */
function sandbox(env: Record<string, unknown>): vm.Context {
  const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  Object.assign(ctx, env, { console });
  return ctx;
}

function compile(code: string, file: string): string {
  // Type stripping keeps every line and column in place, so error locations stay exact.
  return /\.[cm]?ts$/.test(file) ? stripTypeScriptTypes(code, { mode: "strip" }) : code;
}

/**
 * Load an art file from disk. Throws PxError with a file:line:col location on failure. `read` reads
 * the art files (this one and what it includes): another version of them, e.g. at a git revision.
 */
export function loadProject(file: string, opts: ProjectOptions = {}, read = (abs: string) => readFileSync(abs, "utf8")): Project {
  const p = new Project(opts), env = p.env();
  const ctx = sandbox(env);
  const stack: string[] = [];
  const run = (path: string) => {
    const abs = resolve(path);
    if (stack.includes(abs)) throw new PxError(`include cycle: ${[...stack, abs].join(" -> ")}`);
    let code: string;
    try { code = read(abs); } catch {
      throw new PxError(`cannot read art file '${abs}'`, p.callerLoc());
    }
    p.addFile(abs);
    stack.push(abs);
    try {
      vm.runInContext(compile(code, abs), ctx, { filename: abs });
    } catch (e) {
      // Included files run in one shared scope: say so instead of JavaScript's bare redeclaration.
      if ((e as Error)?.name === "SyntaxError" && /has already been declared/.test((e as Error).message) && stack.length > 1)
        throw new PxError(`${abs.replace(/^.*[\\/]/, "")}: ${(e as Error).message}. Included files share one scope for top-level names, so each const/let/function name can be declared in only one of them; rename it in one file`);
      throw syntaxAware(e, abs, p);
    } finally {
      stack.pop();
    }
  };
  const near = (path: string) => {
    if (isAbsolute(path)) return path;
    // Files are read while the art file runs; drawing functions run later, at build time.
    if (!stack.length) throw new PxError(`'${path}' is read while the art file loads: call use(), pose(), motion() or png at the top of the file, not inside a drawing function`);
    return resolve(dirname(stack[stack.length - 1]), path);
  };
  p.includeHook = (path) => run(near(path));
  p.pngHook = (path) => {
    const abs = near(path);
    let bytes: Buffer;
    try { bytes = readFileSync(abs); } catch { throw new PxError(`cannot read '${abs}'`); }
    p.addFile(abs); // the live viewer rebuilds when it changes
    try { return decodePng(bytes); } catch (e) { throw new PxError(`${abs}: ${(e as Error).message}`); }
  };
  p.readHook = (path) => {
    const abs = near(path);
    try {
      const text = readFileSync(abs, "utf8");
      p.addFile(abs); // the live viewer rebuilds when it changes
      return text;
    } catch {
      throw new PxError(`cannot read '${abs}'`);
    }
  };
  try { run(file); } catch (e) { throw hiding(e, ctx, env); }
  return p;
}

/** Load art source from a string (tests, embedding). `name` appears in error locations. */
export function loadSource(src: string, name = "art.px.js", opts: ProjectOptions = {}): Project {
  const p = new Project(opts), env = p.env();
  const ctx = sandbox(env);
  p.addFile(name);
  try {
    vm.runInContext(compile(src, name), ctx, { filename: name });
  } catch (e) {
    throw hiding(syntaxAware(e, name, p), ctx, env);
  }
  return p;
}

/**
 * A load that failed may have called the file's own helper where it meant pxl's (a top-level `post`
 * hides post(): "item 2 is undefined"): name the globals the art file's top-level names hide (a name
 * still uninitialized when it failed is declared too).
 */
function hiding(e: unknown, ctx: vm.Context, env: Record<string, unknown>): unknown {
  if (!(e instanceof PxError)) return e;
  const hid = Object.keys(env).filter((n) => { try { return vm.runInContext(n, ctx) !== env[n]; } catch { return true; } });
  if (hid.length) {
    e.detail += ` (the art file's top level declares ${hid.map((n) => `'${n}'`).join(", ")}, hiding pxl's ${hid.map((n) => `${n}()`).join(", ")} wherever the file calls ${hid.length > 1 ? "them" : "it"}: if it meant pxl's, rename the file's)`;
    e.message = e.format();
  }
  return e;
}

function syntaxAware(e: unknown, file: string, p: Project): PxError {
  const err = wrap(e, (s) => p.locFromStack(s));
  // SyntaxErrors put the location in the first stack line ("file:line").
  if (!err.loc && typeof e === "object" && e && "stack" in e) {
    const m = new RegExp(escape(file) + ":(\\d+)").exec(String((e as Error).stack));
    if (m) err.loc = `${file.replace(/^.*[\\/]/, "")}:${m[1]}`;
    err.message = err.format();
  }
  return err;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
