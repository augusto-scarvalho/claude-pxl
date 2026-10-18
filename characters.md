# Characters (people, humanoids and small animals, 16–64 px)

Read this before drawing a person. At these sizes, most failures come from proportion and
construction, not from where single pixels go: a head that's the wrong size, a body that's too wide
for it, a neck under the chin, arms like columns.

Contents: 1 Pick a style · 2 Measure a reference · 3 Start from existing art · 4 Build order ·
5 Faces · 6 3/4 and profile views · 7 Placing the pixels · 8 The same character, someone else ·
9 Small animals (warp, hair) · 10 Animating with parts (sockets, motion guides) · 11 Big pieces: rig first

## 1. Pick a style and stay in it

These measurements come from finished sprites. Head means crown to chin, hair included. Height means
the top of the head to the soles.

| Source | Frame | View | Head / height | Head width | Shoulders ÷ head width | Width with arms ÷ head width |
|---|---|---|---|---|---|---|
| chibi girl (Pixilart) | 16×16 | front | 56% (9 of 16) | 11 | 0.64 | 1.2 |
| chibi girl (Pixilart) | 32×32 | 3/4 | 48% (14 of 29) | 18 | 0.55 | 0.9 |
| Tiny Tactics cleric (CC0) | 32×32 | SW | 46% (12 of 26) | 13 | – | 1.15 |
| SC iso charset base (CC-BY-SA) | 32×64 | SE | 43% (21 of 49) | 19 | 0.6 | 0.85 |
| Eldiran soldier (CC0) | 32×35 | SW | 41% (14 of 34) | 17 | – | 1.2 (armour) |
| LPC female base (CC-BY-SA) | 64×64 | front | 40% (19 of 47) | 20 | 1.0 | 1.4 |
| Pixilart "How to Draw a Person" | 96 tall | front | 37% | 30 | 0.93 | 1.2–1.33 |

- **Chibi:** the head is 36–56% of the height. Realistic figures are 6–7 heads tall, so the head is
  13–18%.
- **Avoid the middle**, a head at 25–33% of the height. It reads as a big head on an adult body, and
  people call it "strange" before they can say why.
- **At 16–32 px** only chibi leaves room for a face. **At 64 px**, LPC proportions (40%) are the
  common standard.
- **Chibi width:** the body is no wider than the head. The shoulders are 0.55–1.0 head widths, and
  0.85–1.4 with the arms.
- **Chibi height:** below the chin, the body is about 1.3–1.6 head heights. The hands end at the
  hips, and the legs are about 1/4 to 1/3 of the height.

## 2. Measure a reference before drawing

- **Get a reference.** Use one finished sprite of the same size and view: ask the user, or use a
  free pack. Tiny Tactics, Puny Characters and Eldiran's sprites are CC0; the LPC bases and the SC
  iso charset are CC-BY-SA.
- **Bring it to 1×.** Downloaded previews are often upscaled. Sample block centres to get back to
  native pixels.
- **Use a pose detector for the joints** when you build from a bigger image or a photo-like
  reference, instead of marking joints by eye. rtmlib (DWPose/RTMPose in onnxruntime, CPU is fine)
  on the image upscaled 8× gives eyes, ears, shoulders, elbows, wrists, hips, knees, ankles, toes
  and heels. Save them as `{ name: [x, y, score] }` JSON and show them with
  `layer("pose", { ref: true }, pose("pose.json", { scale, x, y }))`.
- **Read off the landmarks.** Import the reference with `sprite("ref", { png: "ref.png" })` and run
  `PXL ascii` on it. Note the rows of the chin, shoulders, waist, hands, knees and soles, and the
  widths of the head and shoulders. Draw your silhouette on those rows.
- **Take proportions, not costume.** Hair and clothes come from the character, not the reference.
  Hair tied in a bun hugs the skull, whatever volume the reference has.

## 3. Start from art that already exists

### A bigger version of the same character: reduce it, then clean it

If the user has the character at a larger size, start there. It beats drawing from scratch, even
with a pose skeleton or a mannequin, because the reduction keeps the silhouette, the proportions and
the curves of the clothes exactly.

1. **Halve it:** `sprite("_half", { png: "big.png", shrink: 2, palettize: true })`. Each 2×2 block
   becomes its most common colour, or transparent when most of it is.
   - **Watch for merged tones.** `palettize` snaps each colour to the nearest key, and two tones
     of the original can land on the same key. A palm with three greens came out in one green and
     looked flat. Count the keys with `PXL ascii`. If tones merged, drop `palettize` and map the
     colours onto ramps by brightness: `rampmap("Ggl", { hue: [70, 170] })` gives the greens the
     keys of "Ggl" dark to light (the hue range keeps the browns out for their own ramp), so no two
     tones share a key. `recolor({ "#2c963c": "g" })` maps one colour by hand.
   - **Restore volume with a light pass** if it is still flat. Step each pixel along its ramp by
     its place in the shape: up if it borders empty space above or to the left (lit edges), down if
     below or to the right (undersides), down where parts crowd together (the heart of a crown).
2. **Redraw what halving breaks** with `runs()` (section 7):
   - eyes, mouth and other 1–2 px face features;
   - thin lines, like collars and ties;
   - small clutter, like hands and buckles;
   - stray specks in flat areas, which a region-limited `recolor` clears;
   - 1 px bumps on thin limbs. A sock that widens where it meets the shoe is shape at full size and
     reads as swelling at half size, so run calves and wrists straight.
3. **Close the gaps in the contour, and nothing else.** Halving keeps most of the outline, including
   its selective colours. It only drops the line where a 2×2 block's vote went to the fill colour.
   - `inline: { color: "k", keep: "zZKk123hHg4DdLP" }` turns only the light edge pixels into the
     line. Edge pixels in the `keep` keys (your dark keys) stay as they are.
   - A plain `inline: "k"` would overwrite the surviving outline too. `outline` after erasing the
     edge widens the figure by 1 px on each side.
   - Thin parts (a calf, a wrist) lose a pixel of width to the line. Where that shows, move the line
     outside by hand with a run, and keep the two sides of the figure consistent.
4. **Leave alone what survived.** Redraw only what is actually broken. If the user picked a version,
   don't "improve" its face or details while fixing something else.
5. **Check the silhouette:** `PXL compare art.px.js hero big.png --shrink 2 --offset x,y` lists
   each row's extents against the halved original. Rows that come out wider are usually where a
   redraw added bulk.

### A base body in the view you need: dress it

When there is no bigger version but there is a base body in the right view, dress it instead of
inventing the anatomy. The base already has the hard parts: proportions, the 3/4 turn, and which arm
and leg are in front.

- **Check which way the base faces** by its face, not by its file name or a caption. The eyes and
  the nose are on the side it faces, and the ear sits toward the back of the head. If the base faces
  the wrong way, set `flip: "x"` on the import before drawing anything.
- **Dress it in pxl:**

```js
sprite("_base", { png: "base.png", palettize: true, flip: "x" })    // flip only if it faces the wrong way
sprite("hero", { w: 32, h: 64, inline: "k" },
  stamp("_base", 0, 0),
  runs(OUTFIT))                     // hair, face and clothes as [x, chars] runs (section 7)
```

- **Outline:** `inline` puts one line on the dressed figure's edge, wherever the clothes moved it.
  Draw inner lines, like the gap between an arm and the body, in the runs.
- **Licence:** whatever you paint over the base is a derivative of it. With a CC-BY-SA base, the
  result has to credit its author and be shared under CC-BY-SA, so tell the user.

## 4. Build order

1. **Silhouette.** Draw the figure in flat colours, then check it as one shape with a
   `recolor({ "*": "k" })` variant. The limbs should read apart, with gaps where they belong.
   Put the skeleton, mannequin or reference you follow in a `ref: true` layer: previews show it
   over your pixels, the export leaves it out.
2. **Body light.** Light comes from above, so the bottoms of forms are darker. Put a shadow under
   anything that sticks out: the head on the neck, a sash on the robe, sleeves on the sides, a hem
   on the legs.
3. **Clothes.** Add them one piece at a time. The face goes last.

## 5. Faces

- **16 px:**
  - Eyes are 2×2, right under the bangs. Leave one row of skin between the bangs and the eyes.
  - No mouth.
- **32 px:**
  - Eyes are 2 wide and 2–3 tall, 2 px apart, in the lower half of the head.
  - The mouth is 1 px in a skin shadow, not black.
  - Cheek marks sit at the same height on both sides.
- **64 px:**
  - Eyes are 3–4 px wide, with whites and a glint.
  - Brows sit 2 rows above the eyes. The mouth is small.
  - Whites and brows look more natural here than chibi eyes that are all dark. Offer both if
    unsure.
- **Pupils:** keep at least 1 px of skin between a pupil and the outline, or it reads as a crease.
- **How eyes read:**
  - Both irises shifted the same way reads as a glance.
  - White on the outer side of both eyes looks cross-eyed.
  - A full dark lash row over a short iris looks sleepy.

## 6. 3/4 (diagonal) and profile views

- **Face:**
  - Eyes and mouth shift toward the side the character faces, and the far eye moves in.
  - The near side of the head is 1–2 px wider.
  - The ear sits at eye level, past the face.
- **Neck:** it joins the back half of the head, not the spot under the chin.
- **Arms:** the far arm is narrower and partly behind the torso; the near arm is wider.
- **Front centre line:** buttons, a collar crossing or a sash knot sit off-centre, toward the faced
  side.
- **Feet:** stagger them, with the near foot a row or two lower.
- **Hems and belts:** they curve, lower in the middle, because the figure is seen from slightly
  above.
- **Limb shape:**
  - Arms hang slightly outward, with a 1 px gap to the body at the hands. Bare arms against a
    bare or skin-colored torso need the gap their whole length (the outline turns it into a line),
    or arms, top and skirt read as one round belly.
  - The waist is no wider than the chest, and a skirt flares 1 px a side at most.
  - Forearms and wrists are narrower than the sleeves above them.
  - Shoulders slope down from the neck. Flat shoulders read as shoulder pads.
- **Profile (side view):** everything says which way the figure faces. The far arm and far leg hide
  behind the near ones or show as a darker sliver on the same side; a far arm drawn out on the back
  with a tail beside it made a werewolf's body read as facing away from its head. Fix one part at a
  time against the facing; when fixes start contradicting each other, go back to the last version
  that read right.
- **A chosen silhouette, redrawn in another way** (shapes to a hand grid, or the reverse), grows: a
  chest pushed forward 2 px reads as a pot belly. Compare the redraw with the chosen version side by
  side before replacing it.

## 7. Placing the pixels

Write a figure wider than about 20 px as runs at absolute x, not as long rows full of dots.
Counting dots in 30-character rows is the main source of misplaced pixels.

```js
// one entry per row: [x, chars] runs, so nothing is counted by hand
const BODY = {
  30: [[19, "3H3"], [23, "deeReeeeeed"], [35, "HlH"]],
  31: [[19, "StS"], [23, "QWewewwwvvW"], [35, "tftS"]],
}
sprite("hero", { w: 62, h: 62, outline: "k" }, grid(18, 0, HEAD), runs(BODY))
```

Look at the result at 1× too. Something that reads as cute at 12× can turn to mush at its real size.

## 8. The same character, someone else

To turn a character into another person (another people, age or job), keep the head, face and
proportions that already work and change what makes the person: hair (color, cut, length), skin,
clothes and what they carry or wear. Use real details of the people you mean, not costume
shorthand: for an Indigenous Brazilian girl, long straight black hair with a straight fringe, red
urucum dots and black jenipapo bands painted on the skin, a bead necklace, a woven top and a
fiber skirt, bare feet; no feather headdress. Keep the original as its own file.

## 9. Small animals

Animals at scene scale (a jaguar 25 px long, a monkey 12 px tall) read best as grid strings, one
decision per pixel, with `outline` around them. Motion that bends what's drawn without redrawing
it is a `warp((x, y) => [dx, dy], where?)`: whole-pixel offsets, each pixel taking the color the
offset points back to, so nothing tears open and no color is made up.

- **Lying along a slope** (a jaguar on a sloping branch): draw it lying flat, then shear it with
  `warp((x) => [0, Math.max(0, Math.floor((x - x0) / 3))])`, each column down a step every 3 from
  the neck on. Legs and tail
  stay vertical, so they still hang. Use `floor` with a fixed step: `Math.round(x * 0.3)` gives
  runs of 2, 3 and 4 pixels and the back comes out lumpy. Keep the grid's back one straight row
  (no hump at the shoulders or hips) and let the shear do the slope; round the rump off into the
  tail with steps that get shorter. Put each leg inside one step of the shear, or it splits in two.
- **Swinging from a hand** (a monkey on a branch): shift the whole body by `dx` per frame
  (`[0, 1, 0, -1]`) and bend only the arm toward the hand, each arm row moving
  `Math.round(dx * y / armLength)`. Shifting every row by its own amount tears the head.
- **Breathing:** move every row above the knees down 1 px on the out-breath,
  `(c) => { if (c.frame % 2) c.warp((x, y) => y <= knee && [0, 1]) }`, and let the row the shift
  lands on be a plain one, so hems and fringes keep their shape.
- **Long hair on a small character:** it hangs *behind* the body, on the back: a part of its own in
  a layer under the head, body and arms, from the top of the head to the waist, cut straight at the
  bottom. Only what's past the back shows, and the arm on that side is drawn in front of it. It swings
  like a pendulum hung from the top of the head: `warp` that layer so each row moves sideways in
  proportion to how far it is below the crown (the hem a pixel each way, once a stride). The walking
  and standing girl in `examples/tropical/girl.px.js` are built from the same parts. What read
  wrong on the way: stretching the ends only when the body rose (a twitch), ends bouncing up and down
  (stepping, not swinging), a `chain()` of discs (it turned the hair's drawn silhouette into a point),
  and a lock hanging beside the body instead of behind it.
- **Long flowing hair, tails, scarves:** a `chain()` fixed behind the head (or at the root of the
  tail) and given the character's travel (`move`): it trails behind, sways and settles, and the loop
  closes by itself. Follow the way Celeste does (`follow: 1.5`, a small `step`: no bounce), draw it
  as shrinking discs in a layer *under* the body so the body covers its root, and keep the travel
  small for a walk, or it streams back as if into wind. What failed first:
  stretching the hair a pixel only when the body rose read as a twitch (the ends must lag both ways),
  and four drawn hair poses swapped per frame still read as stepping, not swinging.

## 10. Animating with parts

How a previous studio pipeline (Smack Studio rigs, Warp pin meshes, mocap guides) got to animation
its curator accepted, after rejecting most of what it tried first:

- **Rejected:** a limb cut out and bent or rotated (it reads as a paper doll), cutouts leaving
  trails, a flat part rotated in a 3/4 or iso view, fake thickness, interpolating between two
  drawings. Rotating a 32 px limb by any angle that isn't a quarter turn breaks its pixel clusters.
- **Accepted:** a stable body plus each moving limb **drawn whole, once per pose**, attached at a
  socket and moved by whole pixels only. In-betweens are more drawn poses, not blends.

In pxl:

```js
sprite("body", { pivot: [15, 26], sockets: { shoulder: [12, 14] } }, BODY)
for (let i = 0; i < 8; i++) sprite(`arm_${i}`, { pivot: [1, 1] }, ARM[i])     // one drawing per pose
anim("walk", { frames: 8, fps: 8, outline: "k" },
  layer("parts", { sort: "z" }, (c) => {
    c.stamp("body", 16, 30 + BOB[c.frame])
    c.stamp(`arm_${c.frame}`, 0, 0, { at: "body.shoulder", z: ARM_Z[c.frame] })   // in front or behind
  }))
```

- **Register the whole figure by one point**, the pelvis: move the entire frame so it lands on the
  same x every frame, with one constant y offset per cycle for the bob. Never centre frames on
  their bounding box (an arm reaching out moves it), and never pin head and feet separately (the
  torso goes soft).
- **Review the whole cycle**, not the key frames: `_preview/<name>_onion.png`, the half-cycle
  pairs (frame i next to i + n/2), and the seam (last → 0 → 1). Fixing a limb only on the contact
  frame leaves the wrong leg moving in the in-betweens. Draw left and right limbs in distinct guide
  colors while working so their identity can't swap. Check that shoulders stay on the torso.
- Motion references (mocap, a video, a CC0 walk cycle) are guides for timing and arcs, drawn in
  a `ref: true` layer under the pose; they are not the authority on the body's proportions.
  `examples/motion/` has CC0 walk and run cycles in 8 directions: `motion("walk.json", { dir })`
  gives each frame's joints, which foot is down and which limb is nearer, and
  `examples/tropical/girl.px.js` turns them into a 32 px chibi's walk. At that size, scale the
  stride down (her feet move a pixel or two, not the guide's length), show a step forward as the
  foot lower on screen as much as to the side, keep the legs from crossing, and let the body rise
  a pixel in the passing frames. Review it as pairs, frames 0–3 above 4–7.

## 11. Big pieces: rig first

A figure or prop past ~48 px is too much to draw in one go: the proportions drift, a limb lands on
the wrong side, and fixing one thing breaks another. Build it as a rig, in stages:

1. **Skeleton.** `figure(h, heads)` gives a standing figure's landmark rows (chin, shoulders,
   chest, waist, crotch, knees, ankles, sole) and its shoulder width. Lay the slots out from them:
   a joint (`at`), a box (`size`: the part's size, its outline included), the point of the part on
   the joint (`pivot`, default its top middle), and the body side (`side: "l"` its left, `"r"` its
   right; none for the middle).
2. **Blocking.** `rig(name, { ..., parts: false })` draws a stand-in box per slot, labelled with the
   slot's first letters: its right green, its left magenta, the middle gray, the far side darker.
   Judge the layout and the proportions here. `PXL describe <file> <rig>` lists the slots back to
   front with their boxes and sides.
3. **Parts.** Draw each part on its own as an ordinary sprite (or anim) named `<rig>_<slot>`, at its
   slot's size. Each is small enough to get right, and drops into its slot as soon as it exists;
   the RIG section says which are drawn, which are missing, and which are the wrong size.
4. **Retouch.** Items after the rig's options go in a layer over the assembled parts: what spans
   more than one part or only reads once they're together (a plume over the helmet, a strap).

**Near and far.** `facing` decides which side is near: facing right, a body's right side is toward
us (its front × its top points at us); facing left, its left. The rig draws the far side's parts
behind the middle (-100) and the near side's in front (+100); `z` adds to that and is the body's own
layering, the same for both sides (both legs under the tabard: `z: -50`), so a rig turned around
reorders correctly. Don't flip a finished figure to turn it: a mirror moves its sword to the other
hand (`PXL describe` says "mirrored"). Give the rig `turn: "<name>_l"`: the same rig facing the
other way, the joints mirrored, each slot's part flipped unless you draw `<name>_l_<slot>` (a near
limb seen from its own side), the retouch mirrored, and both side by side in `<name>_turnaround`.
A flipped part carries its light to the other side, so draw each part as a flat shape and light it
with `relight({ light, reach, glint })` after the flip (`part()` in the example does both versions);
thin parts (a 2 px blade) want `reach: 1`, or each pixel sees open space on both sides. `far: 1`
darkens the far side by depth, not by side: turned, the other leg darkens. In a side view a limb's
drawing belongs to its depth more than to its side (the near arm drawn whole, the far one mostly
hidden), so a turned rig may need its new near limbs drawn.

**What is checked, and what isn't.** `facing` is a label you write; pxl follows it exactly through
flips and turns. What reads the pixels:
- lettering is tracked from `text()` itself: a mirrored sign is always caught;
- a part's `front` socket, put on the pixel that is its front (the visor, the toe, the fist, the
  blade's tip), has to sit on the drawing, on the half its `facing` names: it is called out when it
  is behind both the drawing's center of mass and the middle of what lies within 4 px of it (a
  trumpet held out in front pulls the mass past a face; a leg reaching back has its mass ahead of its
  toe; neither is wrong). A drawing that faces the other way than its label is caught, as long as the
  marker is on the right pixel. A sword swung back has no front of the knight's: give it no marker;
- the lit side, read off each part's rim as steps along its ramps, against the rig's or the scene's
  `light`. It only claims a side when the rim shows it clearly, and stays quiet on readings lit from
  below. A long thin shape (a blade, a pole) shows only two faces, so it says which one is lit and
  whether that one looks toward the light: a blade lying up and to the right is lit on its upper face,
  up and to the left, under a light from the top right, and that is right. Tried on art it wasn't tuned on (forest, cemetery, island: 30 objects),
  it agreed or stayed quiet, caught a flipped tombstone lit from the wrong side, and was wrong once,
  on a building whose outline is mostly trims: look before trusting a warning;
- in a rig, a part labelled another way than the rig (a head facing left on a body facing right).
**Moving it: a pose is a rig.** A rig has no frames, but it doesn't need them: give each pose a
rig of its own and let an anim pick one per frame. What moves is best drawn from the pose's joints
rather than by hand: an arm from the shoulder to where the pose puts the hand (two bones: the elbow
comes out of the lengths, bent down and back), a sword at any angle from the hand, a leg from the hip
to its foot flat on the ground (the knee bent forward, the body lowered when the feet are apart).
Drawn plate by plate and relit like the hand-drawn parts, they look like them, and the rig still
orders, darkens and checks them. The rest are the drawn parts, moved with the body. Build both
facings of every pose (the mirrored parts are free with a draw helper that flips x) instead of
`turn`, which looks up parts by the rig's name. Then the timing is a list: `[frames, pose, how far
forward]`, and anything else on the same clock (sparks where the blades meet, dust at the feet, a
marshal's signal) is computed from it. The two can differ where the fight isn't a mirror: a cut
taken on the shield is one knight's cut and the other's block. A shield raised is the shield arm by
the same two bones and the shield drawn turned with its forearm, so its straps still run along it.
Look at each pose for what it says, not only whether it works: a fist at the hip and a level blade
pointing back is a sword going into its scabbard, whatever it was meant to be (a guard low behind
wants the arm and the blade in one line, the point toward the ground). Likewise a blow that lands with
the arm and the blade in one line reads as a thrust: a slash lands with the wrist broken over, the arm
still up and forward and the blade gone past it, down. On the frame it lands, a smear (the crescent
the blade's outer part swept, thin at its tail, its last 100 degrees at most, the way round it went)
says where it came from. `examples/rig/knight.px.js`
(stages 4 and 5): twenty moves; two exchanges blade to blade, a cut from above taken on the shield
each way, a clash that throws both back, a salute and the walk back to the marks.

For the labels themselves, `PXL blind <file> <rig>` writes the parts unnamed and shuffled for a
reader who doesn't know the labels, and `--check answers.json` compares. A reader that is another
Claude may share your blind spots (left/right is exactly where they hide): prefer a different model,
or ask the user, and look at a few yourself. The reader checks which way a part faces in the picture,
not which of the body's arms it is: that is the slot's `side`, and the rig's near/far follows from it.

**Build a part from plates.** Drawn as one shape and lit once, a part reads as a tube. Build it the
way the thing is made (a pauldron and its lames, rerebrace, couter, vambrace, gauntlet; cuisse,
poleyn, greave, sabaton; cloth in panels), each plate flat in a mid tone in a `plate()` of its own,
lit there (`plate({ light, reach }, ...)`): each plate's own edges take the rim light and the shade,
and the plates read as lying over one another. Seams, rivets, slits and trims go on after, unlit.
Light steel harder than cloth (`strength` 1.3: its corners facing the light flash), outline with
`selout` (each line a darker shade of what it touches), and draw a thin diagonal (a blade) in lines,
not as a lit plate, which steps into a chain. For a turned rig, draw the part from a function with
every x mirrored rather than flipping the finished image, and light it again: the light stays put
(`part()` and `draw()` in the example).

**Parts with two sides.** A flip shows the same face mirrored; a shield, a book, a badge has another
face behind. Give the slot `faces: { outer, inner }` (each drawn): the rig shows the face turned to us.
A shield at rest faces out from the body's side: on the near side we see its face (the cross), on the
far side its inside (the straps); turned to face us, it is seen side on (`edge`). It hangs from the
hand (`on: "arm_l.hand"`), sits outside the arm (`out`: over the arm near, under it far), and its
straps run along the forearm (`parallel`): forearm level (on guard), the shield stands up; forearm
hanging, it lies down; in between, it leans with it.

`examples/rig/knight.px.js`: a 72 px knight in three stages (`knight_blocking`, `knight_parts`,
`knight`), the same knight turned left, and both next to a flipped copy in a scene with a world
scale, which `PXL describe` reads out.
