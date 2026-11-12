// pure(data, fn): an art function rebuilt from its source in a scope that holds nothing but Math (no random) and the
// data it is given, so what it gives is a function of its source, its data and its arguments, and a key of those three
// names it: a field drawn of it is kept on disk under that key (sdf.ts's Compiled.key, surface.ts, store.ts). Its data
// is numbers, strings, booleans, null, arrays and plain objects of them (copied into its scope, frozen), other pure
// functions, and distance fields (their dist(p) at their still moment). Its scope is a realm of its own whose globals
// are gone: a name it reads that isn't among its data is an error that says so, and so is one it writes; its data's
// names and Math are constants; everything that realm holds, and the function itself, is frozen all through (each
// object and function reachable from its globals, the iterators', generators' and async functions' prototypes, a
// function expression's prototype; its data's objects), and its errors carry no stack (the caller's); but its data's
// arrays stay plain (a frozen array of numbers reads several times slower, its elements boxed): they are its only
// state, checked instead (intact(): the scope's prototype, its indices and length alone, each a plain value, the one
// put there) at the start of every trace that reads its hits back or keeps them, and after a march before they are
// kept. A trace begun with them as given finds what a fresh one would and leaves them so. Nothing of another realm
// reaches it but its data's copies and numbers (a field's dist() is a function of its realm, returning a number): no
// code is made from a string there (the Function constructor would give its global), it imports nothing, and an error
// it catches is its scope's own. That closes every way found for an art function to read or keep what its key doesn't
// name; node:vm is no wall against code written to break out, and none is claimed.
import { createHash } from "node:crypto";
import * as vm from "node:vm";
import { PxError } from "../core/errors.ts";
import { INTACT, PURE, Sdf, bare, compile, exact } from "../core/sdf.ts";

// (no code from a string inside it: a function made there by the Function constructor would have its global as `this`)
const realm = vm.createContext(vm.constants.DONT_CONTEXTIFY, { codeGeneration: { strings: false, wasm: false } });
const B = vm.runInContext(`(() => { "use strict";
  const g = globalThis, M = Math, E = Error, F = Object.freeze, def = Object.defineProperty, proto = Object.getPrototypeOf, own = Reflect.ownKeys, desc = Object.getOwnPropertyDescriptor, seen = new WeakSet(), AP = Array.prototype;
  // (what it holds besides its globals' values: the iterators', generators', async functions' and %TypedArray%'s prototypes)
  const hidden = [[].values(), ""[Symbol.iterator](), new Map().entries(), new Set().values(), /a/g[Symbol.matchAll]("a"), function* () {}, (function* () {})(), async function () {}, async function* () {}, (async function* () {})(), Promise.resolve(), proto(Int8Array), (function () { return arguments; })()];
  const all = own(g).map((n) => desc(g, n));
  for (const n of own(g)) if (desc(g, n).configurable) delete g[n];
  def(g, "Error", { value: E }); // (Node reads it to write an error's stack; not a slot to write)
  E.stackTraceLimit = 0;
  M.random = () => { throw new E("pure: Math.random throws dice, which no key holds: draw from a seed in its data (sdf.fbm(x, y, z, seed))"); };
  const harden = (o) => {
    if (o === null || (typeof o !== "object" && typeof o !== "function") || o === g || seen.has(o)) return o;
    seen.add(o); F(o); harden(proto(o));
    for (const k of own(o)) { const d = desc(o, k); harden(d.value); harden(d.get); harden(d.set); }
    return o;
  };
  for (const d of all) { harden(d.value); harden(d.get); harden(d.set); }
  for (const v of [M, ...hidden]) harden(v);
  return { M, F, harden, AP, arr: () => [], obj: () => ({}), field: (d) => F({ dist: F((p, c) => d(p, c)) }), fail: (m) => { throw new E(m); } };
})()`, realm) as {
  fail: (m: string) => never; M: object; F: <T>(v: T) => T; harden: <T>(v: T) => T; AP: object;
  arr: () => unknown[]; obj: () => Record<string, unknown>; field: (d: (p: number[], c?: unknown) => number) => object;
};
const tell = (what: string): never => { throw new PxError(`pure: ${what}`); };
// (a name not there, read or written: what to do; the scope's own error, as all it can catch is: one of pxl's caught
// there would be a way out of the scope, by its constructor)
Object.setPrototypeOf(realm, new Proxy({}, {
  has: () => true,
  get: (_t, k) => (typeof k === "symbol" ? undefined : B.fail(`pure: '${k}' is not in its data: a pure function reads its arguments, Math and its data alone; give it there, pure({ ${k}, ... }, fn) (a number, an array, a field or another pure function)`)),
  set: (_t, k) => B.fail(`pure: it writes '${String(k)}', which isn't its own: keep it in a variable of the function (it keeps nothing from one call to the next)`),
}));
Object.preventExtensions(realm);

const FACTORIES = new Map<string, (a: unknown[]) => (...a: never[]) => unknown>();
const NAME = /^[A-Za-z_$][\w$]*$/, TAKEN = ["Math", "arguments", "eval", "$$"];

/** fn rebuilt in the bare scope with `data`, and its key (PURE): its source, its data's names and values. */
export function pure<F extends (...a: never[]) => unknown>(data: Record<string, unknown>, fn: F): F {
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof fn !== "function") tell("pure({ name: value, ... }, (args) => ...): the values it reads, then the function");
  const src = Function.prototype.toString.call(fn), names = Object.keys(data), keys: string[] = [], held: Held = { arrays: [], checks: [] };
  // (import(): its failure, caught later, is an error of pxl's realm: a way out of the scope)
  if (/\bimport\b/.test(src)) tell("the word 'import' is in it: a pure function loads nothing (name it otherwise, in a comment or a string too)");
  for (const n of names) if (!NAME.test(n) || TAKEN.includes(n)) tell(`its data's names are the function's names for them: '${n}' isn't one it can have`);
  const values = names.map((n) => into(data[n], n, keys, held));
  let make = FACTORIES.get(`${names}\0${src}`);
  if (!make) {
    // (Math and the data as constants, the factory's arguments frozen, $$ out of sight: no binding it can write)
    const consts = ["Math", ...names].map((n, i) => `${n} = $$[${i + 1}]`).join(", ");
    try { make = vm.runInContext(`(function ($$) { "use strict"; $$[0](arguments); $$[0]($$); const ${consts}; { const $$ = undefined; return (${src}); } })`, realm); } catch { tell(`it is an arrow function or a function expression, written in the file (not a method, a bound or a built-in one), got ${src.slice(0, 60)}`); }
    if (FACTORIES.size > 256) FACTORIES.clear();
    FACTORIES.set(`${names}\0${src}`, make!);
  }
  const args = B.arr();
  args.push(B.F, B.M, ...values);
  const f = B.harden(make!(args)) as F;
  PURE.set(f, keys.includes("") ? "" : createHash("sha1").update(`${src}\0${names}\0${keys.join(" ")}`).digest("hex"));
  INTACT.set(f, intact(held, src));
  return f;
}
bare.pure = pure;

/** A pure function's arrays (each copy, what was put there, its name) and the checks of the pure functions and fields in its data. */
interface Held { arrays: { a: unknown[]; v: unknown[]; at: string }[]; checks: (() => string | undefined)[] }
/** Undefined while every array it holds is as it was put there: the scope's prototype, its indices and length alone, each a plain value, the same. */
const intact = ({ arrays, checks }: Held, src: string) => (): string | undefined => {
  for (const { a, v, at } of arrays) {
    const len = Object.getOwnPropertyDescriptor(a, "length");
    const same = Object.getPrototypeOf(a) === B.AP && Object.isExtensible(a) && Reflect.ownKeys(a).length === v.length + 1 && len?.value === v.length && len.writable
      && v.every((x, i) => { const d = Object.getOwnPropertyDescriptor(a, i); return d !== undefined && d.writable === true && d.enumerable && d.configurable && Object.is(d.value, x); });
    if (!same) return `pure: ${src.length > 48 ? `${src.slice(0, 48)}...` : src} changed its data's '${at}': its data stays as given (keep what it changes in a variable of the function), or no trace of it can be kept`;
  }
  for (const c of checks) { const e = c(); if (e) return e; }
  return undefined;
};

/** A value copied into the bare scope, its key in `keys` ("" for a field that isn't pure, or a pure function holding one). */
function into(v: unknown, at: string, keys: string[], held: Held): unknown {
  if (v === null || v === undefined || typeof v === "boolean" || typeof v === "string") { keys.push(v === undefined ? "u" : JSON.stringify(v)); return v; }
  if (typeof v === "number") { keys.push(exact([v])); return v; }
  if (typeof v === "function") {
    const k = PURE.get(v);
    if (k === undefined) tell(`'${at}' is a function that isn't pure: make it with pure({ ... }, fn) too`);
    keys.push(k!);
    held.checks.push(INTACT.get(v)!);
    return v;
  }
  if (v instanceof Sdf) {
    const C = compile(v);
    keys.push(C.pure ? `field ${createHash("sha1").update(C.key).digest("hex")}` : "");
    held.checks.push(C.intact);
    return B.field((p, c) => {
      try { if (c === undefined) return v.dist(p); } catch (e) { return B.fail(String((e as Error)?.message ?? e)); }
      return B.fail(`pure: '${at}' is a field: a pure function asks it at its still moment, ${at}.dist(p)`);
    });
  }
  if (Array.isArray(v)) {
    const a = B.arr();
    keys.push("[");
    for (let i = 0; i < v.length; i++) a.push(into(v[i], `${at}[${i}]`, keys, held));
    keys.push("]");
    held.arrays.push({ a, v: [...a], at });
    return a;
  }
  const proto = typeof v === "object" ? Object.getPrototypeOf(v) : undefined;
  if (proto === null || (proto && Object.getPrototypeOf(proto) === null)) {
    const o = B.obj();
    keys.push("{");
    for (const k of Object.keys(v as object)) { keys.push(JSON.stringify(k)); o[k] = into((v as Record<string, unknown>)[k], `${at}.${k}`, keys, held); }
    keys.push("}");
    return B.F(o);
  }
  return tell(`'${at}' is ${typeof v === "object" ? "an object of a kind of its own" : `a ${typeof v}`}: a pure function's data is numbers, strings, booleans, arrays and plain objects of them, fields and pure functions`);
}
