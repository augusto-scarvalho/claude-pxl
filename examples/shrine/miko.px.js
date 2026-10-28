// The miko of lib/characters/miko.px.js (a shrine maiden on the traveler's figure), to look at.
include("../../lib/characters/miko.px.js", { palette: true })
const mikoFigure = miko   // its old name, for the files that include this one
// To look at: the miko in her 8 directions, standing, then mid-stroke of the sweep.
scene("miko_dirs", { w: 8 * 40, h: 2 * 50 + 4, bg: "#56606e" },
  ...["s", "sw", "w", "nw", "n", "ne", "e", "se"].flatMap((d, i) => [stamp(`mk_idle_${d}`, 20 + i * 40, 43), stamp(`mk_sweep_${d}`, 20 + i * 40, 93, { frame: 2 })]))
