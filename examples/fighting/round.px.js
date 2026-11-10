// The fighting package's round: Reva against Haldor on the shrine at dusk (lib/stages/shrine.px.js, shrine_dusk) with
// the lacquer HUD, played by an engine from the fighters' frame data, as the profile's contract says an engine reads it
// (lib/profiles/fighting.px.js): a jump, falling down, the fireball (her wave), the dragon punch (her rise_kick), kicks,
// punches, the opponent's throw and his anti-air grab, the stage. A choreography gives each fighter's moves in order, with
// the tick each is asked at; a move asked while its fighter is busy waits until he is free. The engine runs it once, 60
// ticks a second, before the first picture is drawn (each frame's ticks, boxes and data read by timeline()), and the scene
// draws a picture every 2 ticks (30 fps) from what it kept. Its numbers (the library's fighting study, 15.5, from the
// conversions' engine files): the camera moves only when a fighter comes within 60 px of the screen's edge and stays in
// the stage's bounds (it can't rise: the stage's world is the screen's height), and after the KO centers the two as
// drawn (each frame's drawn box); each fighter 15 px inside the screen; the bodies kept apart on the floor by their
// widths (Reva 15 px either side of her axis, Haldor 20; in the air 12 and 15), passing over the other only with the
// feet above his height (60 and 77); a forward jump the jump's own drawings carried across at 3.3 and 2.5 px a tick;
// the timer 60 counts of 60 ticks; the KO 60 ticks slowed to a quarter (back to full over its last 45), the timer
// stopped, the loser lying for good (the winner's moves still played), the winner's round marker lit 90 ticks after
// and her win pose (`win`, MUGEN's 181) played from her guard with it, its last drawing held to the end (15.6);
// the miko cheering 120 ticks on each knockdown and on the KO. The rest is the profile's: a frame's `step` as it shows
// (a walk's spread over its ticks, its speed), `flip`, the hits (once a move, `hitstop` freezing both, the one hit
// shaking, `pushback` sliding him at the friction of 0.85 a tick, his reaction as he stood, `knockdown`, `invuln`,
// `damage`), the blocks (a low attack blocked only crouching, an attack from the air only standing), the throws and
// grabs (`bind`, `release`, `caught`, `takes`), the wave (`spawn`), the sparks, the shake, the dust (`fx`). As it runs
// it checks: no two bodies overlapping on the floor, both inside the screen and the camera inside its bounds, no move
// ending with a fighter's back to the other, life falling only on a hit and never below 0, a hit or a block on the
// floor landing at most 20 px deep (the reach table's); a broken rule throws, naming its tick.
// round.result() gives what the engine kept, for a file that includes this one: `sim` (a tick each: the camera, each
// fighter's frame where he is), `real` (the scene's clock: the timer, the bars, the miko) and `log` (one line per event:
// each move started, each hit, block or whiff and its spark, each knockdown, turn, grab and release, each life).
include("../../lib/stages/shrine.px.js", { palette: true, as: "shrine" })
include("../../lib/characters/reva_fighter.px.js", { as: "reva_fighter" })
include("../../lib/characters/haldor_fighter.px.js", { as: "haldor_fighter" })
include("../../lib/characters/miko_spectator.px.js", { as: "miko_spectator" })
include("../../lib/vfx/sparks.px.js", { as: "sparks" })
include("../../lib/vfx/dust.px.js", { as: "dust" })
// (fightHud.draw stamps its pieces by their own names: taken without `as`)
include("../../lib/ui/fight_hud.px.js")

var round = {}
{
const STAGE = "shrine_dusk", L = stage.LAYOUT[STAGE], [W, H] = genre("fighting").screen, FLOOR = L.floor, [X0, X1] = L.camera.x
const TICK = 1000 / 60, tk = (ms) => Math.round(ms / TICK), TICKS = 1420
// the engine's numbers (the study's 15.5)
const TENSION = 60, EDGE = 15, FRICTION = 0.85, SLOW = { ticks: 60, speed: 0.25, back: 45 }, OVER = 45, COUNT = 60, CHEER = 120, QUAKE = 12, DEEP = 20
// the fighters: their bodies on the floor [front, back] and in the air, the height a jump must clear to pass over them,
// their jump forward and back (px a tick), where the round starts them, facing each other; the life the round gives them
// (MUGEN's [Data] life, in the frames' damage): the same for both, as KOF gives every fighter the same (its heavies take
// less, never more), and the profile's damage left as it is: 53, of which his four blows take 49 and her seven hits
// before the last 41, the rise_kick taking his last 12, its whole damage
const LIFE = 53, FIGHTERS = [
  { id: "reva", as: "reva_fighter", name: "REVA", ground: [15, 15], air: 12, height: 60, jump: [3.3, -3.3], shadow: L.shadow.rx.character, x: L.players.p1[0], s: 1, life: LIFE },
  { id: "haldor", as: "haldor_fighter", name: "HALDOR", ground: [20, 20], air: 15, height: 77, jump: [2.5, -2.2], shadow: L.shadow.rx.heavy, x: L.players.p2[0], s: -1, life: LIFE }]
const NEUTRAL = new Set(["idle", "walk_f", "walk_b", "crouch", "crouch_hold"]), TURNS = new Set(["idle", "walk_f", "walk_b", "crouch_hold"])
const CROUCHED = new Set(["crouch", "crouch_hold", "crouch_kick", "crouch_hurt", "crouch_turn", "block_low"]), SPECIAL = new Set(["wave", "rise_kick"])
const AIRBORNE = new Set(["jump", "jump_kick"]), BOX = ["head", "body", "legs", "limb"]

// ---------------------------------------------------------------- the frames, as an engine reads them
// each anim's frames: their ticks, data and boxes, the boxes from the pivot (dx the way he faces, dy down), and how far
// the drawing reaches either side of the pivot facing e (`span`, from its drawn pixels' box)
const anims = {}
const frames = (who, anim) => (anims[`${who.as}.${anim}`] ??= timeline(`${who.as}.${anim}`).map(({ ms, pivot: [px, py] = [0, 0], bounds: [bx, , bw] = [px, 0, 0], boxes = {}, data = {} }) =>
  ({ d: Math.max(1, tk(ms)), data, span: [bx - px, bx + bw - px], boxes: Object.fromEntries(Object.entries(boxes).map(([k, bs]) => [k, bs.map(([x, y, w, h]) => [x - px, y - py, w, h])])) })))
// a box where a fighter stands, [x0, x1, y0, y1] in the world (y up from the floor, negative), mirrored about his pivot facing w
const place = ([bx, by, bw, bh], x, y, s) => (s > 0 ? [x + bx, x + bx + bw, y + by, y + by + bh] : [x - bx - bw, x - bx, y + by, y + by + bh])
const meet = (a, b) => { const r = [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])]; return r[0] < r[1] && r[2] < r[3] ? r : null }

// ---------------------------------------------------------------- the engine
round.play = (script) => {
  const log = [], sparks = [], dusts = [], waves = [], quakes = [], downs = []
  const F = FIGHTERS.map((p, k) => ({ ...p, k, y: 0, queue: script[p.id].map((q) => [...q]), walk: 0, crouch: 0, guard: 0, jv: 0, slide: 0, slideS: 0, freeze: 0, shook: 0, until: 0, bound: null, ko: false, lost: 0 }))
  const other = (f) => F[1 - f.k], lifeOf = () => `lives ${F.map((f) => `${f.id} ${f.life}`).join(", ")}`
  let n = 0, cam = L.camera.start, ko = null
  const say = (s) => log.push(`t${String(n).padStart(4, "0")} ${s}`)
  const frame = (f) => f.cur.fr[f.cur.order[f.cur.i]], index = (f) => f.cur.order[f.cur.i]
  const back = (f) => (other(f).x - f.x) * f.s < 0
  // a move from its first frame (or `at`; `order`: another anim's frames, the stand-up the crouch's backwards); `quiet`:
  // placed there by another's data (a release), its frame neither steps nor raises dust
  const play = (f, move, { anim = move, order, quiet, at = 0 } = {}) => {
    const fr = frames(f, anim), again = f.cur?.move === move
    f.cur = { move, anim, fr, order: order ?? fr.map((_, k) => k), i: 0, t: 0, hit: false, swung: false }
    f.cur.i = Math.max(0, f.cur.order.indexOf(at))
    if (move !== "idle" && !(again && (move === "crouch_hold" || move.startsWith("walk")))) say(`${f.id} ${move}${at ? ` from frame ${at}` : ""}`)
    enter(f, quiet)
  }
  // a frame as it shows: its step (a walk's spread over its ticks, in motion()), a knockdown in the air coming down over
  // its air frames to the floor, its flip, the dust it raises, the wave it throws, the screen's shake
  const enter = (f, quiet) => {
    const fr = frame(f), d = fr.data
    if (d.step && d.phase !== "walk" && !quiet) { f.x += f.s * d.step[0]; f.y += d.step[1] }
    if (f.fall) { if (d.air) f.y += f.fall * fr.d; else if (index(f) > 0) { f.y = 0; f.fall = 0 } }
    if (d.flip) { f.s = -f.s; say(`${f.id} turns: flipped to face ${f.s > 0 ? "e" : "w"} on ${f.cur.move} ${index(f)}`) }
    if (d.fx && !quiet && !f.bound) { dusts.push({ name: `dust.${d.fx.name}`, x: f.x + f.s * d.fx.at[0], s: f.s, n }); say(`${f.id} raises ${d.fx.name}`) }
    if (d.spawn) { waves.push({ by: f, name: d.spawn.name, x: f.x + f.s * d.spawn.at[0], y: f.y + d.spawn.at[1], s: f.s, speed: d.spawn.speed, part: "start", i: 0, t: 0, n }); say(`${f.id} throws the ${d.spawn.name}`) }
    if (d.shake) quake(d.shake)
  }
  const quake = (ticks) => { quakes.push([n, ticks]); say(`the screen shakes ${ticks} ticks`) }
  // the next move when one ends (and what is asked now, at once); a move other than a jump never ends with his back to
  // the other
  const end = (f) => {
    const m = f.cur.move, low = f.crouch > n, up = { anim: "crouch", order: [2, 1, 0] }
    if (f.cur.boxed && !f.cur.swung && !f.cur.hit) say(`${f.id} ${m} whiffs`)
    if (!NEUTRAL.has(m) && !AIRBORNE.has(m) && !["stand", "turn", "crouch_turn"].includes(m) && back(f)) throw new Error(`round: tick ${n}: ${f.id}'s ${m} ended with his back to ${other(f).id}`)
    if (m === "knockdown" && f.ko) { f.cur.i = f.cur.order.length - 1; f.held = true; return }
    if (m === "win") { f.cur.i = f.cur.order.length - 1; f.held = true; return }
    if (m === "knockdown") return play(f, "down")
    if (m === "down") return play(f, "get_up")
    if (m === "walk_f" || m === "walk_b") play(f, f.walk > n ? m : "idle")
    else if (CROUCHED.has(m)) play(f, low ? "crouch_hold" : "stand", low ? {} : up)
    else play(f, "idle")
    start(f)
  }
  // a tick of a fighter's move: its clock, held on the last frame while its hitstun lasts, a guard held up while an attack
  // comes and let down if none lands; under a kick in the air, the jump's arc going on until it lands
  const tick = (f) => {
    if (f.held) return
    if (f.body) { const b = f.body
      if (++b.t >= b.fr[b.order[b.i]].d) { b.i++; b.t = 0; const d = b.fr[b.order[b.i]].data
        if (d.phase === "landing") { if (!f.cur.hit) say(`${f.id} ${f.cur.move} whiffs`); f.body = null; f.cur = b; enter(f); return }
        f.y += d.step?.[1] ?? 0 } }
    const c = f.cur
    if ((c.move.startsWith("walk") && f.walk <= n) || (c.move === "crouch_hold" && f.crouch <= n)) return end(f)
    if (c.i === c.order.length - 1 && (f.until > n || f.body)) return
    if ((c.move === "block" || c.move === "block_low") && c.i <= 1) { if (!threat(other(f), f)) return end(f); if (c.i === 1) return }
    if (++c.t < frame(f).d) return
    c.i++; c.t = 0
    if (c.i >= c.order.length) return end(f)
    enter(f)
  }
  // what moves him besides his frames' steps: a walk's speed, a jump's carry, a hit's slide
  const motion = (f) => {
    const fr = frame(f), b = f.body ? f.body.fr[f.body.order[f.body.i]] : fr
    if (fr.data.phase === "walk" && fr.data.step) f.x += (f.s * fr.data.step[0]) / fr.d
    if (b.data.air && f.jv) f.x += f.jv
    if (f.slide) { f.x += f.slideS * f.slide; f.slide = f.slide * FRICTION < 0.05 ? 0 : f.slide * FRICTION }
  }
  // an attack on its way to him (his guard comes up): a striking frame before or at its hit, facing him, within reach;
  // or a wave of the other's coming at him
  const threat = (a, d) => {
    const p = frame(a).data.phase, near = (x, s) => (d.x - x) * s > 0 && Math.abs(d.x - x) < 180
    return (!a.bound && a.cur.boxed && !a.cur.hit && (p === "startup" || p === "active") && near(a.x, a.s)) || waves.some((w) => w.by === a && w.part !== "end" && !w.gone && near(w.x, w.s))
  }
  // where an attack comes from: "high" from the air (blocked only standing), "low" from a crouch (only crouching)
  const height = (a, wave) => (wave ? "mid" : a.y < 0 || AIRBORNE.has(a.cur.move) ? "high" : a.cur.move.startsWith("crouch_") ? "low" : "mid")
  // where a hit box (of a fighter's frame, or of a wave) meets the other's hurt boxes: the box it meets, the spark at
  // the hit box's front there, the overlap's middle in height; and how deep it lands, its front past the front edge of
  // the hurt boxes it meets along the attack's way (the reach table's depth)
  const contact = (boxes, x, y, s, d) => {
    if (d.bound || d.ko || frame(d).data.invuln) return null
    let at = null
    for (const hb of boxes) { const A = place(hb, x, y, s)
      for (const [j, b] of (frame(d).boxes.hurt ?? []).entries()) { const B = place(b, d.x, d.y, d.s), r = meet(A, B)
        if (!r) continue
        at ??= { box: BOX[j] ?? "limb", spark: [s > 0 ? r[1] : r[0], (r[2] + r[3]) / 2], depth: 0 }
        at.depth = Math.max(at.depth, s > 0 ? A[1] - B[0] : B[1] - A[0]) } }
    return at
  }
  const stunned = (d) => ["hurt", "blockstun", "fall"].includes(frame(d).data.phase) || d.until > n
  const strike = (a, d, data, at, wave) => {
    const H = tk(data.hitstop ?? 167), move = wave ? wave.name : a.cur.move, h = height(a, wave), guard = d.cur.move === "block" || d.cur.move === "block_low"
    d.freeze = H; d.shook = H; if (!wave) a.freeze = H
    d.s = a.x >= d.x ? 1 : -1
    // (a hit or a block on the floor lands at most DEEP px deep: one deeper is drawn inside him; in the air, only said)
    const air = a.y < 0 || d.y < 0 || (!wave && AIRBORNE.has(a.cur.move)), deep = `${Math.round(at.depth)} px deep${air ? " in the air" : ""}`
    if (!air && at.depth > DEEP) throw new Error(`round: tick ${n}: ${a.id}'s ${move} lands ${deep} in ${d.id}, past the reach table's ${DEEP}: farther apart (the log's last lines: ${log.slice(-6).join("; ")})`)
    if (guard && (h === "mid" || (h === "low") === (d.cur.move === "block_low"))) { // blocked: his guard's own frames push him back
      d.cur.i = 2; d.cur.t = 0; enter(d)
      sparks.push({ name: "sparks.spark_block", x: at.spark[0], y: at.spark[1], s: wave ? wave.s : a.s, n })
      say(`${a.id} ${move} blocked by ${d.id} (${d.cur.move}) at the ${at.box} (${deep}), spark_block at ${at.spark.map(Math.round)}`)
      return
    }
    const dmg = Math.min(d.life, data.damage ?? 0), heavy = SPECIAL.has(move) || !!wave || H >= 12
    d.life -= dmg; d.lost = dmg
    sparks.push({ name: `sparks.spark_${heavy ? "h" : "l"}`, x: at.spark[0], y: at.spark[1], s: wave ? wave.s : a.s, n })
    say(`${a.id} ${move} hits ${d.id} at the ${at.box} (${deep}): ${dmg} damage, spark_${heavy ? "h" : "l"} at ${at.spark.map(Math.round)}; ${lifeOf()}`)
    const was = d.cur.move
    d.body = null; d.jv = 0; d.held = false
    if (data.knockdown || d.y < 0 || d.life === 0) {
      d.fall = d.y < 0 ? -d.y / [1, 2, 3].reduce((t, k) => t + frames(d, "knockdown")[k].d, 0) : 0; d.until = 0
      play(d, "knockdown"); downs.push(n)
      if (SPECIAL.has(move)) quake(QUAKE)
    } else { d.until = n + H + (data.hitstun ?? 0); play(d, CROUCHED.has(was) ? "crouch_hurt" : at.box === "head" ? "hurt" : "hurt_low") }
    if (data.pushback && d.y === 0) { d.slide = data.pushback * (1 - FRICTION); d.slideS = -d.s }
    if (d.life === 0) { ko = { n, loser: d, winner: a }; d.ko = true; say(`KO: ${a.id} wins; ${lifeOf()}`) }
  }
  // the one held: drawn where his frame binds her, her slam's damage, let go on the first frame without a bind
  const hold = (a) => {
    const d = other(a), fr = frame(a), b = fr.data.bind
    if (d.bound !== a) return
    if (b) { d.x = a.x + a.s * b.at[0]; d.y = a.y + b.at[1]; d.s = b.facing * a.s; d.draw = [b.anim, b.frame, b.layer]
      if (fr.data.release && a.slam !== a.cur) { a.slam = a.cur; a.release = fr.data.release
        const dmg = Math.min(d.life, fr.data.damage ?? 0); d.life -= dmg; d.lost = dmg
        say(`${a.id} slams ${d.id}: ${dmg} damage; ${lifeOf()}`)
        if (d.life === 0) { ko = { n, loser: d, winner: a }; d.ko = true; say(`KO: ${a.id} wins; ${lifeOf()}`) } }
      return }
    const r = a.release; d.bound = null; d.draw = null
    d.x = a.x + a.s * r.at[0]; d.y = r.at[1]; d.s = r.facing * a.s
    play(d, r.anim, { at: r.frame, quiet: true }); say(`${a.id} releases ${d.id} into ${r.anim} ${r.frame}`); downs.push(n)
  }
  const grab = (a, d, move) => {
    d.bound = a; d.body = null; d.jv = 0; d.slide = 0; d.until = 0; d.held = false; d.fall = 0
    if (move) play(a, move)
    a.cur.hit = true
    say(`${a.id} grabs ${d.id}${d.y < 0 ? " in the air" : ""} (${a.cur.move})`)
    hold(a)
  }
  // the bodies kept apart: on the floor by their widths, a jumper's only while his feet are below the other's height;
  // each moved half the overlap, the whole of it by the one not against the screen's edge
  const push = () => {
    const [a, b] = F
    if (a.bound || b.bound || -a.y >= b.height || -b.y >= a.height) return
    const [l, r] = a.x < b.x || (a.x === b.x && a.s > 0) ? [a, b] : [b, a], wl = l.y < 0 ? [l.air, l.air] : l.ground, wr = r.y < 0 ? [r.air, r.air] : r.ground
    const over = l.x + (l.s > 0 ? wl[0] : wl[1]) - (r.x - (r.s > 0 ? wr[1] : wr[0]))
    if (over <= 0) return
    const lo = cam + EDGE, hi = cam + W - EDGE
    l.x -= over / 2; r.x += over / 2
    if (l.x < lo) { r.x += lo - l.x; l.x = lo } else if (r.x > hi) { l.x -= r.x - hi; r.x = hi }
  }
  // the camera: still while both are more than TENSION px inside the screen, else following the one nearer an edge
  // (between them when both are), in the stage's bounds; each fighter kept EDGE px inside it. After the KO it centers
  // the two as drawn (the loser lying reaches far past his pivot), going there a px a tick
  const drawn = (f) => { const [a, b] = frame(f).span; return f.s > 0 ? [f.x + a, f.x + b] : [f.x - b, f.x - a] }
  const follow = () => {
    const on = F.filter((f) => !f.bound), xs = on.map((f) => f.x)
    const [l, r] = ko ? [Math.min(...on.map((f) => drawn(f)[0])) - EDGE, Math.max(...on.map((f) => drawn(f)[1])) + EDGE] : [Math.min(...xs) - TENSION, Math.max(...xs) + TENSION]
    const lo = r - W, hi = l, c = ko || lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, cam))
    cam = Math.max(X0, Math.min(X1, Math.round(ko ? cam + Math.max(-1, Math.min(1, c - cam)) : c)))
    for (const f of F) if (!f.bound) f.x = Math.max(cam + EDGE, Math.min(cam + W - EDGE, f.x))
  }
  // the choreography: the next move asked, started once he is free (a walk or a crouch for its ticks, a guard held);
  // after the KO only the winner's
  const start = (f) => {
    const q = f.queue[0]
    if (!q || q[0] > n || (ko && f !== ko.winner)) return
    const [, move, arg] = q
    if (move === "guard") { f.queue.shift(); f.guard = n + arg; return start(f) }
    if (f.bound || f.ko || !(NEUTRAL.has(f.cur.move) || (move === "jump_kick" && f.cur.move === "jump" && frame(f).data.air))) return
    f.queue.shift()
    if (move === "jump_kick") { f.body = f.cur; play(f, "jump_kick"); f.cur.boxed = true; return }
    if (move === "walk_f" || move === "walk_b") { f.walk = n + arg; if (f.cur.move !== move) play(f, move); return }
    if (move === "crouch") { f.crouch = n + arg; if (!CROUCHED.has(f.cur.move)) play(f, "crouch"); return }
    if (move === "jump") { play(f, "jump"); f.jv = (arg > 0 ? f.jump[0] : arg < 0 ? f.jump[1] : 0) * f.s; return }
    play(f, move)
    f.cur.boxed = frames(f, move).some((q) => q.boxes.hit)
  }
  const hits = () => {
    for (const a of F) { const d = other(a), fr = frame(a)
      if (a.bound || a.freeze || !fr.boxes.hit || a.cur.hit) continue
      const at = contact(fr.boxes.hit, a.x, a.y, a.s, d)
      if (!at) continue
      // (a throw that takes no one lets go of the attempt: there is no one to turn over)
      if (fr.data.bind) { if (d.y === 0 && !stunned(d)) grab(a, d); else { say(`${a.id} ${a.cur.move} misses ${d.id} (not on the floor, or stunned)`); a.cur.swung = true; end(a) } }
      else if (fr.data.caught) { if ((fr.data.takes === "air") === (d.y < 0) && !stunned(d)) grab(a, d, fr.data.caught); else a.cur.swung = true }
      else { a.cur.hit = true; strike(a, d, fr.data, at) }
    }
    for (const w of waves) { const d = other(w.by)
      if (w.part === "end" || w.gone) continue
      const fr = frames(w.by, `${w.name}_${w.part}`)[w.i], at = fr.boxes.hit && contact(fr.boxes.hit, w.x, w.y, w.s, d)
      if (at) { strike(w.by, d, fr.data, at, w); w.part = "end"; w.i = 0; w.t = 0 }
    }
  }
  const fly = () => {
    for (const w of waves) { if (w.gone) continue
      const fr = frames(w.by, `${w.name}_${w.part}`)
      if (w.part !== "end") w.x += w.s * w.speed
      if (++w.t >= fr[w.i].d) { w.t = 0; w.i++
        if (w.i >= fr.length) { if (w.part === "end") { w.gone = true; continue } w.part = "fly"; w.i = 0 } }
      if (w.x < cam - 60 || w.x > cam + W + 60) { w.gone = true; say(`the ${w.name} drops off the screen`) }
    }
  }
  const check = (life0) => {
    const [a, b] = F
    if (cam < X0 || cam > X1) throw new Error(`round: tick ${n}: the camera at ${cam}, outside ${X0}-${X1}`)
    for (const f of F) {
      if (!f.bound && (f.x < cam + EDGE - 1e-6 || f.x > cam + W - EDGE + 1e-6)) throw new Error(`round: tick ${n}: ${f.id} at ${f.x.toFixed(1)}, off the screen (${cam}-${cam + W})`)
      if (f.life < 0 || (f.life < life0[f.k] && !f.lost)) throw new Error(`round: tick ${n}: ${f.id}'s life fell to ${f.life} without a hit`)
      if (TURNS.has(f.cur.move) && back(f) && !f.bound) throw new Error(`round: tick ${n}: ${f.id} stands in ${f.cur.move} with his back to ${other(f).id}`)
      f.lost = 0 }
    if (!a.bound && !b.bound && a.y === 0 && b.y === 0) { const [l, r] = a.x < b.x ? [a, b] : [b, a]
      if (l.x + (l.s > 0 ? l.ground[0] : l.ground[1]) - (r.x - (r.s > 0 ? r.ground[1] : r.ground[0])) > 1e-6) throw new Error(`round: tick ${n}: the bodies overlap on the floor (${a.x.toFixed(1)}, ${b.x.toFixed(1)})`) }
  }
  // what the scene draws at a tick: the camera, each fighter's frame where he is (a hit one shaking a px each way),
  // the one held between the holder and his near arm (his <move>_front), the waves
  const snap = () => {
    const q = (f) => { const lying = ["fall", "down"].includes(frame(f).data.phase)
      return { anim: `${f.as}.${f.cur.anim}`, k: index(f), x: f.x, y: f.y, s: f.s, dx: f.freeze && f.shook ? (Math.floor(n / 2) % 2 ? 1 : -1) : 0, z: lying ? -3 : frame(f).data.phase === "hurt" ? -1 : f.cur.boxed ? 2 : 0 } }
    const out = []
    for (const f of [...F].sort((a, b) => q(a).z - q(b).z)) {
      if (f.bound) continue
      out.push(q(f))
      const d = other(f)
      if (d.bound === f) { const [anim, k, layer] = d.draw, me = out.pop(), her = { anim: `${d.as}.${anim}`, k, x: d.x, y: d.y, s: d.s, dx: 0 }
        if (layer === "between") out.push(me, her, { ...me, anim: `${me.anim}_front` }); else if (layer === "behind") out.push(her, me); else out.push(me, her) }
    }
    return { cam, F: out, W: waves.filter((w) => !w.gone).map((w) => ({ anim: `${w.by.as}.${w.name}_${w.part}`, k: w.i, x: w.x, y: w.y, s: w.s })),
      shadows: F.map((f) => [f.x + 2 * f.s, f.shadow]), life: F.map((f) => f.life / f.max) }
  }
  for (const f of F) { f.max = f.life; play(f, "idle") }
  const sim = []
  const step = () => {
    const life0 = F.map((f) => f.life)
    for (const f of F) start(f)
    for (const f of F) { if (f.bound) continue; if (f.freeze) { f.freeze--; continue } tick(f); motion(f) }
    for (const f of F) hold(f)
    fly(); push(); follow(); hits()
    for (const f of F) if (!f.bound && TURNS.has(f.cur.move) && back(f)) play(f, CROUCHED.has(f.cur.move) ? "crouch_turn" : "turn")
    for (const f of F) if (f.guard > n && NEUTRAL.has(f.cur.move) && f.cur.move !== "crouch" && threat(other(f), f)) play(f, CROUCHED.has(f.cur.move) ? "block_low" : "block")
    push(); follow()
    try { check(life0) } catch (e) { e.message += ` (the log's last lines: ${log.slice(-6).join("; ")})`; throw e }
    sim.push(snap()); n++
  }
  // the clock the scene sees: 60 ticks a second, the game's own slowed after the KO (a quarter, back to full over the
  // last 45 of its 60); the timer, the bars' lag, the miko and the round marker on it
  const real = [], lag = [1, 1], wait = [0, 0], LAG = fightHud.LAYOUT.lacquer.lag, LEN = fightHud.LAYOUT.lacquer.bars.length
  let was = [1, 1], acc = 0, koT = -1, cheer = -Infinity, seen = 0
  for (let T = 0; T < TICKS; T++) {
    const u = koT < 0 ? Infinity : T - koT
    acc += u < SLOW.ticks - SLOW.back ? SLOW.speed : u < SLOW.ticks ? SLOW.speed + ((1 - SLOW.speed) * (u - SLOW.ticks + SLOW.back)) / SLOW.back : 1
    while (acc >= 1 - 1e-9) { step(); acc -= 1; if (ko && koT < 0) koT = T }
    if (downs.length > seen) { cheer = T; seen = downs.length }
    const s = sim[n - 1], life = s.life
    // (the lag: after each hit it waits LAG.wait ticks, then falls LAG.speed px a tick to the life)
    for (const k of [0, 1]) if (life[k] < was[k]) wait[k] = LAG.wait; else if (lag[k] > life[k]) { if (wait[k] > 0) wait[k]--; else lag[k] = Math.max(life[k], lag[k] - LAG.speed / LEN) }
    was = life
    real.push({ n: n - 1, life, lag: [...lag], time: String(Math.max(0, COUNT - Math.floor((koT < 0 ? T : koT) / 60))).padStart(2, "0"),
      wins: koT >= 0 && T >= koT + 2 * OVER ? F.map((f) => (f === ko.winner ? 1 : 0)) : [0, 0], miko: T - cheer < CHEER ? ["miko_spectator.cheer", (T - cheer) * TICK] : ["miko_spectator.watch", T * TICK] })
  }
  return { sim, real, sparks, dusts, quakes, log, ko, koT }
}

// ---------------------------------------------------------------- the choreography: each fighter's moves and when each is asked
// [tick, move, then the ticks a walk, a crouch or a held guard lasts, or a jump's way: 1 forward, -1 back]. The beats,
// each where 6h1's reach table says its attack lands:
// 1 the round starts, both in their guards where the layout puts them;
// 2 footsies: they walk in; her jab, blocked high; her low kick, blocked low (he crouches for it); his hammer blow
//   (strike) catches her, she is hurt and slides back; she walks back in, her front kick (kick_l) to his belly;
// 3 she backs off and throws the wave, it hits him; she walks in and throws a second, he jumps over it, his jump kick
//   lands on her;
// 4 he walks in and throws her: the bind, the slam, the dust, the shake; she lies, the miko cheers, she gets up; she
//   steps back and jumps in, her jump kick on his head; landing, she steps back and meets him with her cross (strike)
//   to his body near its reach;
// 5 she walks in, jumps over him and lands behind, both turn; he crouches and she steps back, her roundhouse (kick_h)
//   to his head (it meets his head only crouching, standing his chest: the reach table, so he crouches first); she
//   crosses him again, both crouch_turn, she rises, steps back and sweeps him (crouch_kick) near its reach;
// 6 she jumps in with her jump kick and his quench takes her in the air: the hold, the plunge, her knockdown, the miko
//   cheering;
// 7 both low, he jumps at her and her rise_kick meets him in the air: the KO, slowed; he lies, she steps in as the
//   slowdown ends (his fall carries him 149 px: from where it left her, the two as drawn would not fit the screen), and
//   when her round marker lights (sim tick 1230: 90 ticks of the scene's clock after the KO, 15.6) she plays her win,
//   its pose reached 36 ticks later and held 2 s to the end
const SCRIPT = {
  reva: [[60, "walk_f", 10], [72, "jab"], [100, "walk_f", 10], [116, "crouch_kick"], [210, "walk_f", 26], [236, "kick_l"],
    [250, "walk_b", 6], [256, "wave"], [310, "walk_f", 15], [325, "wave"],
    [548, "walk_b", 4], [554, "jump", 1], [564, "jump_kick"], [598, "walk_b", 16], [628, "strike"],
    [666, "walk_f", 22], [688, "jump", 1], [745, "walk_b", 14], [758, "kick_h"], [800, "walk_f", 24], [824, "jump", 1], [868, "crouch", 14],
    [890, "walk_b", 14], [910, "crouch_kick"],
    [963, "jump", 1], [973, "jump_kick"],
    [1164, "rise_kick"], [1216, "walk_f", 12], [1230, "win"]],
  haldor: [[60, "walk_f", 8], [60, "guard", 140], [100, "crouch", 40], [150, "walk_f", 4], [160, "strike"],
    [323, "jump", 1], [346, "jump_kick"],
    [400, "walk_f", 3], [410, "throw"],
    [740, "crouch", 217],
    [972, "quench"],
    [1137, "jump", 1]],
}

// ---------------------------------------------------------------- the scene: a picture every 2 ticks
let R
const result = () => { if (!R) { R = round.play(SCRIPT); if (!R.ko) throw new Error(`round: no KO in its ${TICKS} ticks: the choreography's last beat missed`) } return R }
const at = (f) => result().real[Math.min(TICKS - 1, 2 * f)], sim = (f) => { const r = at(f); return R.sim[r.n] }
// (the shake: the picture thrown down only, 3 px to 1 as it dies away, every other 2 ticks; the strip it leaves at the
// top repeats the sky's first row, flat under the HUD, where one thrown up would repeat the paving's last row in streaks)
const quakeAt = (n) => { const q = R.quakes.find(([n0, d]) => n >= n0 && n < n0 + d); return q && Math.floor(n / 2) % 2 ? Math.ceil((3 * (q[0] + q[1] - n)) / q[1]) : 0 }
const stampOf = (c, cam, { anim, k, x, y, s, dx = 0 }) => c.stamp(anim, Math.round(x - cam) + dx, FLOOR + Math.round(y), { frame: k, ...(s < 0 ? { flip: "x" } : {}) })
// (a dust or a spark: its frame that many ticks after it was raised, none once it has played)
const ticksOf = {}
const effects = (c, list, n, cam) => { for (const e of list) { const fr = (ticksOf[e.name] ??= timeline(e.name).map((q) => tk(q.ms))); let t = n - e.n, k = 0
  while (k < fr.length && t >= fr[k]) t -= fr[k++]
  if (t >= 0 && k < fr.length) c.stamp(e.name, Math.round(e.x - cam), FLOOR + Math.round(e.y ?? 0), { frame: k, ...(e.s < 0 ? { flip: "x" } : {}) }) } }
const FRAMES = TICKS / 2
scene("round", { w: W, h: H, frames: FRAMES, fps: 30, camera: stage.camera(STAGE, (f) => sim(f).cam), check: { every: 10 } },
  ...stage.layers(STAGE, { ticks: TICKS, spectator: { name: (c) => at(c.frame).miko, swap: mikoSpectator.SLOTS },
    shadows: (c) => { const s = sim(c.frame); return s.shadows.map(([x, rx]) => [Math.round(x - s.cam), FLOOR + 1, rx, 3]) },
    fighters: [layer("fighters", { parallax: 0 }, (c) => { const s = sim(c.frame), n = at(c.frame).n
      effects(c, R.dusts, n, s.cam); s.F.forEach((f) => stampOf(c, s.cam, f)); s.W.forEach((w) => stampOf(c, s.cam, w)); effects(c, R.sparks, n, s.cam) })] }),
  (c) => c.shake(0, quakeAt(at(c.frame).n)),
  layer("hud", { parallax: 0 }, (c) => { const r = at(c.frame); fightHud.draw(c, "lacquer", { life: r.life, lag: r.lag, time: r.time, names: FIGHTERS.map((f) => f.name), wins: r.wins }) }))
Object.assign(round, { SCRIPT, FIGHTERS, TICKS, result })
}
