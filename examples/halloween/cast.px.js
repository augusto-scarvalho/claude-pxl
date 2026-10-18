// The cast, one by one, unlit: each monster's loop with its name under it.
use("palette.hex")
include("props.px.js", { palette: true })
include("monsters.px.js")
const CAST = [["skeleton", "ESQUELETO", 26], ["vampire", "VAMPIRO", 32], ["mummy", "MUMIA", 26], ["zombie", "ZUMBI", 24],
  ["ghost", "FANTASMA", 28], ["witch", "BRUXA", 40], ["dj", "DJ FRANK", 52], ["werewolf", "LOBISOMEM", 40]]
let x = 6
const placed = CAST.map(([n, label, w]) => { w = Math.max(w, label.length * 4); const cx = Math.round(x + w / 2); x += w + 6; return [n, label, cx] })
scene("cast", { w: x + 2, h: 54, bg: "N" },
  rect(0, 44, x + 2, 10, "v"),
  ...placed.flatMap(([n, label, cx]) => [stamp(n, cx, 42), text(cx, 47, label, "s", { align: "c" })]))
