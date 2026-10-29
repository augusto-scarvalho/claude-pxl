// The island style: the palette of a top-down map at a 16 px grid (topdown16), examples/topdown.px.js's island and
// the topdown16 kit's ground: grass, sand, the sea, a dirt path, an earth bank, trunks, stone, wood, flowers. High
// key and saturated, as the action top-down school paints its maps (The Minish Cap, measured in library F5's
// environment study): the field at V84 S70, a warm yellow path at V89, cyan water, stone near white. Its ramps
// dark to light, for a shade layer (a shadow steps a color one left): the green hGglv (the field g, its light l and
// pale v, its edge h; a shadow on it the teal G), the field's blade marks m and its darker region M (both shade to G),
// the path DEu and Ee (its dirt e, a lighter middle u, the spots and the shade under the tufts E: a shadow on the
// dirt or its middle is E, so it shows on both), sand EAa, water NBbcf
// (deep, the body, the shallows, a pale cyan, the foam), the bank zDdi (its earth, its line z), stone tKSs, wood xWw,
// trunks zOo. The kit's trees, bushes and hedges share the green. The island's nature kit
// (lib/nature/island.px.js) and its pier (lib/architecture/pier.px.js) draw in it.
// For a scene of your own in its colors: include("<path>/lib/styles/island.px.js", { palette: true })
pal({
  k: "#1e1a2e",                                                      // a shade layer's paint (its color unused)
  h: "#1b4d34", G: "#288556", g: "#7cd640", l: "#b9f06c", v: "#e0fca9", // the green: edge, shadow, field, light, pale
  M: "#50ad39", m: "#64c83c",                                        // the field's darker region, its blade marks
  a: "#f5e2a6", A: "#dcbc72",                                        // sand, wet sand
  f: "#f6fdff", c: "#a7f5ec", b: "#5dcfe3", B: "#3b88d1", N: "#3159b5", // foam, pale cyan, shallows, water, its deep band
  D: "#6e3c30", E: "#c49435", e: "#e3bb4d", u: "#efcd66",            // the path: (the bank's dark), spots and shade, dirt, its lit middle
  z: "#2a1836", d: "#a0633d", i: "#cf9553",                          // the bank's earth: its line, its body, its lit streaks (D its dark)
  o: "#a06a40", O: "#64382a",                                        // trunk
  t: "#3f3d55", K: "#75798f", S: "#aeb0bc", s: "#eeebe0",            // stone: its edge, shade, side, lit top
  w: "#f0c27d", W: "#bd8148", x: "#73402c",                          // wood
  r: "#ff5c74", y: "#ffe04a", p: "#ffffff", j: "#7ab8ff",            // flowers
})
ramps("hGglv", "GM", "Gm", "zDdi", "DEu", "Ee", "EAa", "NBbcf", "tKSs", "xWw", "zOo")
