// Preloaded by npm test (node --import): V8's compiled code for pxl's sources kept on disk between the
// test files' processes, so each skips stripping and compiling them again (a second off every file).
import { mkdtempSync, rmSync } from "node:fs";
import { enableCompileCache } from "node:module";
import { constants, setPriority, tmpdir } from "node:os";
import { join } from "node:path";
process.env.NODE_COMPILE_CACHE ??= join(tmpdir(), "node-compile-cache");
enableCompileCache?.();
// below the user's own programs: on a laptop the suite then waits for them instead of freezing them
try { setPriority(constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed here */ }
// the temporary folders the tests make (os.tmpdir() reads these at each call) in one of this process's,
// removed when it exits: a test that doesn't remove its own left one behind each run (24,000 of them)
const tmp = mkdtempSync(join(tmpdir(), "pxl-test-"));
process.env.TMPDIR = process.env.TEMP = process.env.TMP = tmp;
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
