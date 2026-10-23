// An outcrop to make (comparison 1): the scene's camera and ground are set; the outcrop is to be added.
include("kit.px.js", { palette: true })

// a rune to pin on the tallest crystal, glowing
sprite("rune", { pivot: "center" }, `
  ..F..
  .F.F.
  ..f..
  .FfF.
  ..f..
  .F.F.
  F...F`)

const W = 320, H = 180, { Z, view: VIEW } = hd2d(W, H), GR = ground(Z)
scene("outcrop", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(VIEW, GR.faces, GMATS, { light: LIGHT }))
