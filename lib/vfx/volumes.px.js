// Volumes: densities for volume() and splats (a cumulus, a mist lying low, smoke from a chimney, a magic
// orb) in a palette of their own, and how each is drawn (LOOK), as volumes.cloud(size), .mist(), .smoke(),
// .orb() and volumes.LOOK: include("<path>/lib/vfx/volumes.px.js", { palette: true }) (examples/sdf/kit.px.js
// does).
// the cloud: slate blue in its shade to white in the sun
pal({ 1: "#3c4868", 2: "#5d6d92", 3: "#8b9cbc", 4: "#c3cfe0", 5: "#f2f5f8" })
ramps("12345")
// the mist: a cool blue
pal({ 6: "#4a6488", 7: "#7090b4", 8: "#a6c0dc" })
ramps("678")
// smoke: warm greys
pal({ 9: "#3a3638", 0: "#5c5658", "+": "#86807c", "=": "#b0aaa2" })
ramps("90+=")
// the orb: violet in its shade; what glows cyan to white
pal({ "<": "#3a2470", ">": "#6a3cc0", "[": "#5ab8f0", "]": "#b8f0ff", "^": "#ffffff" })
ramps("<>", "[]^")

const volumes = {}
// in a block: its names stay its own when a scene includes the file
{
const TAU = 2 * Math.PI
// A cumulus: four puffs melted on a flat base, the noise boiling through them over the loop, the
// whole drifting a little and back; `size` scales it all.
const cloud = (size = 1) => sdf.density(
  sdf.union(sdf.ellipsoid([1.4, 1.0, 0.75]), sdf.sphere(0.85).at(1.0, 0.2, 0.3), sdf.sphere(0.8).at(-1.0, -0.1, 0.2), sdf.sphere(0.75).at(0.25, 0.2, 0.65), { smooth: 0.4 })
    .intersect(sdf.plane([0, 0, -1], 0.45)).at((c) => [0.25 * Math.sin(TAU * c.phase), 0, 0]).scale(size),
  { edge: 0.3 * size, noise: 0.45 * size, scale: 0.55 * size, seed: 4, octaves: 3, flow: [1.2 * size, 0.2 * size, 0.3 * size] })
// A mist lying low: a flat bank on the ground, thinning away up from 0.1 m to 0.7 m, its billows
// creeping along over the loop.
const mist = () => sdf.density(sdf.ellipsoid([2.8, 1.8, 0.6]).at(0, 0, 0.1), { edge: 0.6, noise: 0.6, scale: 0.8, seed: 6, octaves: 3, flow: [2.4, 0.6, 0], fade: [0.1, 0.7] })
// Smoke from a chimney: a column widening as it rises and leans away from the wind, its billows
// carried up through it, thinning away from 1.2 m to 2.8 m.
const smokeField = () => sdf.density(sdf.capsule([0, 0, 0.05], [0.55, 0.15, 2.7], 0.14, 0.55), { edge: 0.2, noise: 0.3, scale: 0.25, seed: 8, octaves: 3, flow: [0.2, 0, 2.6], fade: [1.2, 2.8] })
// A magic orb: a ball of swirling matter bobbing a meter up, glowing from its middle.
const orb = () => sdf.density(sdf.sphere(0.42).at((c) => [0, 0, 1 + 0.08 * Math.sin(TAU * c.phase)]), { edge: 0.42, noise: 0.1, scale: 0.18, seed: 2, octaves: 2, flow: [0, 0.2, 0.6] })
const LOOK = {
  cloud: { ramp: "12345", thickness: 3, cast: 0.5 },
  mist: { ramp: "678", thickness: 1.4 },
  smoke: { ramp: "90+=", thickness: 4 },
  orb: { ramp: "<>", thickness: 8, emit: { ramp: "[]^", strength: 1.1, glow: 2.2 } },
}
Object.assign(volumes, { cloud, mist, smoke: smokeField, orb, LOOK })
}
