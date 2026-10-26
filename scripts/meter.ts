// Preloaded (node --import), it prints on exit the time, processor time (threads summed) and peak memory
// of every process it is loaded in: the test files, each in a process of its own, say which ones hold
// the suite back and how much of the laptop each took.
//
//   node --import ./scripts/meter.ts --import ./test/compile-cache.ts --test --test-concurrency=3 "test/**/*.test.ts" 2>&1 | grep METER | sort -k2 -rn
const t0 = performance.now();
process.on("exit", () => {
  const u = process.resourceUsage(), s = (performance.now() - t0) / 1000, cpu = (u.userCPUTime + u.systemCPUTime) / 1e6;
  process.stderr.write(`METER ${s.toFixed(2)} s ${cpu.toFixed(2)} s cpu ${Math.round((u.maxRSS * 1024) / 1e6)} MB ${process.argv[1]?.split(/[\\/]/).pop() ?? ""}\n`);
});
