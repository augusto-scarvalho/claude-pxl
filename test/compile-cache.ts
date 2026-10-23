// Preloaded by npm test (node --import): V8's compiled code for pxl's sources kept on disk between the
// test files' processes, so each skips stripping and compiling them again (a second off every file).
import { enableCompileCache } from "node:module";
import { constants, setPriority } from "node:os";
enableCompileCache?.();
// below the user's own programs: on a laptop the suite then waits for them instead of freezing them
try { setPriority(constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed here */ }
