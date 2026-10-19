// Night-City-style dusk: dusty yellows, teals, sodium orange, grimy reds. Shared by every part and the
// scene. Parts use these keys only: no hex colors, no new keys. Emissive keys (light sources only, the
// scene glows them): W sun, O o a A sodium, w i windows, Z z x holo, p P neon.
pal({
  k: "#141619",                                                              // ink: voids, tires, deepest shadow
  // sky at dusk, zenith -> sun
  N: "#1e3a42", n: "#2d5156", v: "#4b6b63", V: "#78846a", h: "#a6966a", H: "#c9aa68", y: "#e3c677", Y: "#f4e1a4",
  W: "#fff8dc",                                                              // sun core (emissive)
  1: "#44544f", 2: "#5f6a5d", 3: "#7f7d62", 4: "#9d8f66",                    // far megacity in haze: near/top -> dissolved
  K: "#1f2423", C: "#343a37", c: "#4e554e", e: "#6c7166", E: "#918f7c", L: "#c4b791",  // concrete, sidewalks: deep shade -> sunlit rim
  S: "#4f3f33", s: "#7a614a", u: "#a5835f", U: "#cfae7e",                    // stucco, sand, faded lane paint
  T: "#183c3e", t: "#275f5c", j: "#3f857a", J: "#79b39c",                    // teal paint, metal, tinted glass
  R: "#3e1a19", r: "#6a2a22", m: "#94402c", M: "#bd6440",                    // grimy red: oxide paint, awnings, brick, rust
  O: "#a8501c", o: "#e47f2a", a: "#f9ab48", A: "#ffe6a6",                    // sodium light (emissive): dim -> bulb core, headlights
  w: "#e9c77a", i: "#c9e3c4",                                                // lit windows (emissive): warm, fluorescent
  Z: "#1c7469", z: "#3fb39b", x: "#b8f0d8",                                  // holo teal (emissive)
  p: "#d23a2a", P: "#ff9a5a",                                                // neon red (emissive): tube, hot core; taillights
  0: "#121414", G: "#252826", g: "#383a36", l: "#55554c",                    // asphalt: contact shadow -> worn
  5: "#3d2620", 6: "#6b4030", 7: "#9c6a4a", 8: "#d39d74",                    // skin
  D: "#222a1d", d: "#3d4a2c", 9: "#6b7340",                                  // dusty palms, weeds
  B: "#2e231c", b: "#54402e", f: "#7c6040",                                  // wood, leather, dark hair
})
ramps("NnvVhHyYW", "1234", "KCceEL", "SsuU", "TtjJ", "RrmM", "OoaA", "Zzx", "pP", "0Ggl", "5678", "Dd9", "Bbf")
