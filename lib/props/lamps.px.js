// Lamps to stand in a scene. For any scene: include("<path>/lib/props/lamps.px.js"), its palette its own.
// The HD-2D post (the hd2d plaza's, 7x30, its pivot at its foot): its glass brighter than anything lit,
// for the bloom.
pal({ k: "#1a1620", y: "#fff3c4", Y: "#ffd27a" })
// A lamp: a pole of dark iron, a lantern of glass on top under a cap.
sprite("_lamp", { w: 7, h: 30, pivot: "bottom" }, rect(3, 8, 1, 22, "k"), rect(1, 28, 5, 2, "k"),
  rect(1, 1, 5, 1, "k"), rect(1, 2, 5, 5, "Y"), rect(2, 3, 3, 3, "y"), rect(0, 7, 7, 1, "k"))
