/**
 * Errors carry the art-file location (file:line:col) and the chain of assets/layers/ops
 * being built, so a message reads like:
 *   shop.px.js:42:5: sprite 'shop' > layer 'front' > rect: unknown color key 'z' (have: k Z z ...)
 */
export class PxError extends Error {
  loc?: string;
  path: string[];
  detail: string;

  constructor(detail: string, loc?: string, path: string[] = []) {
    super(detail);
    this.name = "PxError";
    this.detail = detail;
    this.loc = loc;
    this.path = path;
    this.message = this.format();
  }

  format(): string {
    const where = this.loc ? this.loc + ": " : "";
    const path = this.path.length ? this.path.join(" > ") + ": " : "";
    return where + path + this.detail;
  }

  /** Prefix a context step (e.g. "layer 'x'"); keeps the innermost location. */
  within(step: string, loc?: string): this {
    this.path.unshift(step);
    if (!this.loc && loc) this.loc = loc;
    this.message = this.format();
    return this;
  }
}

/** Wrap any thrown value as a PxError, pulling an art-file location out of its stack. */
export function wrap(e: unknown, locFromStack?: (stack: string) => string | undefined): PxError {
  if (e instanceof PxError) {
    if (!e.loc && e.stack && locFromStack) {
      const loc = locFromStack(e.stack);
      if (loc) { e.loc = loc; e.message = e.format(); }
    }
    return e;
  }
  // Errors from the art-file sandbox come from another realm: duck-type them.
  const isErr = typeof e === "object" && e !== null && "message" in e;
  const message = isErr ? String((e as Error).message) : String(e);
  const stack = isErr ? (e as Error).stack : undefined;
  const loc = stack && locFromStack ? locFromStack(stack) : undefined;
  return new PxError(message, loc);
}

/** Levenshtein-based suggestion among candidates. */
export function didYouMean(name: string, candidates: Iterable<string>): string {
  let best = "", bestD = Infinity;
  for (const c of candidates) {
    const d = distance(name.toLowerCase(), c.toLowerCase());
    if (d < bestD) { bestD = d; best = c; }
  }
  return best && bestD <= Math.max(2, Math.floor(name.length / 3)) ? ` (did you mean '${best}'?)` : "";
}

export function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}
