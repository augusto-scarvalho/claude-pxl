# Characters (people, humanoids and small animals, 16–64 px)

Read this before drawing a person. At these sizes, most failures come from proportion and
construction, not from where single pixels go: a head that's the wrong size, a body that's too wide
for it, a neck under the chin, arms like columns. (`PXL` below is `node <pxl dir>/bin/pxl.js`.)

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
- **Very low resolution, 16 px and under** (Saint11): drop the outline first (it costs 2 px of
  width; contrasting solid shapes carry the silhouette), keep 2–4 features that say who it is (a
  beard, a scarf, a 1 px lean for the posture), one light and few contrasting colors, 90° corners
  and a pixel's corner for a point, nothing loose near the face. A subject that won't fit is
  cropped: the dragon's head breathing fire, not the whole dragon.

## 2. Measure a reference before drawing

`PXL study ref.png` reads a reference for its palette and ramps, its outline (black, selective or
none), its dithering and where its light comes from, at 1x even when it was posted enlarged or
blurred; a GIF of an animation also for its timing and cycle. It doesn't measure a figure's
proportions: for those, the steps below.

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
- **Read off the landmarks.** Import the reference with `sprite("ref", { png: "ref.png", palettize: true })`
  and run `PXL ascii` on it (without `palettize`, colors off the palette print as `?`), or read the
  image itself with `PXL describe ref.png`, which keys its own colors. Note the rows of the chin, shoulders, waist, hands, knees and soles, and the
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
     tones share a key (as long as there are no more tones than keys). `recolor({ "#2c963c": "g" })` maps one colour by hand.
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
3. **Clothes.** Add them one piece at a time. The face goes last. Change the pose while it is still a
   silhouette, and look at the silhouette again at the end; an animation's motion is blocked first
   as flat dark shapes over the finished parts, colored once the timing works.
4. **Drop the lines the shading draws** (Pedro Medeiros). Once the forms are shaded, delete each
   inner line whose edge a shadow already makes (a muscle, the jaw); keep the silhouette, the eyes
   and the darkest pockets. Lines plus shading is a step on the way, not the finish.
5. **Clean up last:** lone pixels, L-corners and jaggies (§7), then anti-aliasing. `PXL check` (and
   `PXL shot`) points at the corners and jaggies of what you drew by hand (LOOK lines): delete a
   doubled step on a smooth line, keep a corner the shape has.

## 5. Faces

(A portrait: the eyes at half the head's height; quarter lines for the hairline, the eyes and the tip
of the nose; the corners of the mouth straight below the pupils.)


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
Shrinking a reference to sprite size (§3), enlarge and regularize what makes it read (the eyes, the
mouth) and drop the specular and the small detail; then fix the outline, redraw what the resize lost,
and fix dither and shading. Upscaled, round off the big square blocks and redraw broken lines.

**Lines** (Pedro Medeiros, Saint11):

- **No L-corners.** A 1 px line steps diagonally, its pixels touching at the corners. The elbow of
  three pixels in an L doubles it there: delete it, unless the shape has a corner there.

  ```
  ###.....      ##......
  ..####..  ->  ..###...
  .....###      .....###
  ```
- **Runs in order.** Straight lines read clean at 1:1, 2:1 and 3:1 (every run the same); between,
  alternate n and n+1 evenly (2 3 2 3). A curve's runs grow or shrink steadily, 1 1 2 3 4 into the
  flat, never 2 1 3. Fixing corners can leave jaggies: corners first, then runs. Tight curves (a
  radius of 4 px and less) collect both; look there first.
- `line()`, `curve()`, `wire()` and `outline` draw clean lines; grids and `runs` are as clean as you
  write them: `PXL check` and `PXL shot` list both faults with their positions (`PXL study` does the
  same on any picture). A line whose steps are nearly all L's reads as drawn square, a style: no LOOK
  line for it.
- **Square lines,** every step joined by an L, are a style: chunkier, a 1 px line reads about 1.5 px.
  `outline8` draws an outline so; draw the inner lines the same way.
- **Inner lines take color.** Keep the near-black for the silhouette and where very different forms
  meet (chin on neck, collar on hair). Inside, a line takes the darkest tone of the ramp it borders:
  still the darkest value there, only the hue moves (`selout` does it for the outline). A soft
  crease (a nose, a cheek) is a mid shadow and shorter; lips are a dark shape with no frame. A rim
  light is a 1 px line just inside the outline, never over it.
- **Anti-aliasing:** a tone between the line's and its neighbor's (value matters, hue hardly). Only
  on steps of 2 px and more: a strip about half the step's length, at its end (a 4 px step takes
  2 px). None on 1:1 diagonals or straight lines, and none on the silhouette against clear (it
  shows as a halo on any other ground). Too much reads as blur. On a curving outline, one shadow
  tone in the inside elbow of a step softens it; sparingly. `aa: true` on a sprite lays these strips
  for you in the key between the two colors (a ramp through both): a start to fix by hand.
- **Clusters:** no 1 px islands of a color inside a form; make the detail a small shape (1×2, a
  diagonal pair, 2×2, an L). A lone pixel is for a point of light, a particle, AA or texture. No
  2×2 squares of one color along a line or a band by accident: lay clusters staggered, like bricks.
- **A line's end** tapers by lightening its last pixels toward what is round it (hair strands,
  whiskers, a crease that fades).

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

- **Four legs walking** (Saint11): two biped cycles out of step, each hind foot landing before the
  fore on its side (back right, front right, back left, front left), a foot down every 2 frames of
  8; the head trails the front pair by a frame. Each leg goes contact, drag (back along the ground),
  rise, forward: the front elbow moves fast on contact and release and the paw snaps forward, the
  back thigh moves steadily and the paw lags. Frame counts for wings and other cycles: §12.

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
anim("walk", { w: 32, h: 40, frames: 8, fps: 8, outline: "k" },
  layer("parts", { sort: "z" }, (c) => {
    c.stamp("body", 16, 30 + BOB[c.frame])
    c.stamp(`arm_${c.frame}`, 0, 0, { at: "body.shoulder", z: ARM_Z[c.frame] })   // in front or behind
  }))
```

- **A swing moves the body, not only the weapon.** Before it the shoulders coil back against the hips;
  through it the hips turn and the shoulders after them (a whirl shows the back), the knees bend, the
  arm reaches its full length at the release and the free arm tucks in; after it the body follows the
  weight down; a coat and hair come a frame late, and the head leads a turn. A blade's edge faces the
  way the cut goes, every frame of it (a backswing keeps it on its target; edge up or the flat
  leading, an axe reads as a club). An axe's edge is the long curve at the end of the bit, from its
  top corner (the toe) down to the heel, running along the haft, never across its top; the poll is on
  the other side. Held, show the blade's side; in a level whirl it turns edge on, as it would. An arm
  that swings an axe round a body that stays in profile reads as a puppet. Posed as a skeleton in 3D
  and turned about its upright, the views come by themselves (`examples/rig/warden.px.js`: the head
  drawn in five views, picked by the turn).
- **Timing an action** (Saint11): anticipation, strike, overshoot, recovery. The anticipation coils
  the other way, its first frame held longest; the strike is 1–2 frames, the first already at full
  reach with its smear; the overshoot passes the end pose; the recovery is the longest phase and
  takes another arc. A player's own attack drops the anticipation (it reads as input lag): about 3
  frames out and 4 back, the last passing idle by a pixel. Measured frame counts: §12.
- **Squash and stretch keep the area:** 2 px flatter is about 2 px wider, and stiff parts don't
  deform. Squash in the anticipation (against the coming move) and hardest on contact, stretch on
  the fastest frames (the takeoff). A jump's takeoff frame carries most of the rise and the steps
  about halve to the top, which holds 1–3 frames; the fall speeds up to the ground. Redraw those
  frames (or `warp` them), never scale them.
- **A 2-frame idle** works when its down frame is a squash: the knees bend and the arms open, so the
  body widens as much as it drops (a plain one-pixel bob doesn't; see the next point). More frames
  go to overlap in the same cycle (the head leads, then the arms, then the hair), not to a longer one.
- **Walk and run key poses** (Saint11): a walk goes contact, down (lowest, just after contact, the
  arms widest), passing, up (highest); 6 frames at low resolution, 12 for fluid; the arms swing
  against the legs and the planted foot moves back every frame. A run step is 4 poses: airborne
  (highest), fall, contact on a straight front leg, recover (lowest). Top-down, a front or back walk
  is half the cycle and the same half flipped (`flip: "x"`), redrawing only what isn't symmetric,
  with less bob walking up. In-betweens halve each frame's time, so the cycle keeps its length.
- **Subpixel: less than a pixel of motion** (after ApplefatGOV's How-to-subpixel and 2D Will Never
  Die's: "animate the anti-aliasing"). An idle doesn't need the whole body to drop a pixel (the
  tutorial's is a fighting stance in its beat, a boxer finding his rhythm, about a second a sway; a
  breath is slower, three or four seconds a cycle): that single-pixel bob crushes the legs and jolts
  the face. Keep the feet planted and move each part half a pixel at a time, the parts by turns (the
  head, then the shoulders and sleeves, the hem last), so a six-frame idle carries one pixel of real
  travel.
  - **How a half step looks.** The part stays where it comes from and pushes into its own outline: the
    outline ahead lightens to the part's ramp step between it and the fill, the fill behind the
    outline it leaves darkens the same, and the silhouette doesn't move (Metal Slug's sprites do
    this). The tones come from the part's own ramp toward its outline, never from a background: a
    sprite crosses many backgrounds. One tone per edge is the norm; finer steps need more of the ramp.
  - **Two ways without new colors.** The smear: on the in-between frame the part fills both its old
    and its new place in its own color, a pixel wider for a frame. The stagger: one color boundary
    moves per frame, so a part of N colors takes N+1 frames per pixel of travel.
  - **Move the light, not the shape.** Inside a form, a breath can be the shading's edge moving: a
    `shade`/`light` region whose center moves by a fraction of a pixel flips edge pixels one at a time
    while the outline stays.
  - **When.** Hair, cloth, idles and breaths, a quiet scene, mid-size sprites (40 to 100 px) with
    enough colors. Not on icons or emotes (noise), in a busy scene, or high contrast against black (it
    flickers): look at it at game scale. Keep eyes and faces crisp, moved by whole pixels.
  - **In pxl:** stamp each part with `{ sub: [dx, dy] }` at its place of the frame, `[dx, dy]` the way
    it goes (or draw it in `c.subpixel(dx, dy, () => ..., [dx, dy])`); give each ramp its steps toward
    the ink (`examples/subpixel.px.js`; `examples/rig/warden.px.js` sways so at rest, a fighting
    stance from foot to foot). `pxl study` tells it in a clip ("Subpixel: ..."), with the tones it
    takes.
- **Register the whole figure by one point**, the pelvis: move the entire frame so it lands on the
  same x every frame, with one constant y offset per cycle for the bob. Never centre frames on
  their bounding box (an arm reaching out moves it), and never pin head and feet separately (the
  torso goes soft). `register: "m"` on the anim does it: a marker pixel on the pelvis in each
  frame, in a `ref: true` layer, and every frame moves sideways to put it on one x.
- **Review the whole cycle**, not the key frames: `_preview/<name>_onion.png` (from `PXL build`),
  the half-cycle pairs (frame i next to i + n/2: `PXL shot file walk --frames 0,4` and `1,5`...), and
  the seam (last → 0 → 1: `--frames 7,0,1`). Fixing a limb only on the contact
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
- **A hand on something that moves** (a wheel that turns, a lever): at 30–60 px a hand is a puppet,
  a few joints in the hand's own frame read off a photo of the grip, set every frame by a transform
  (where, which way, how big) that lays the line the grip takes across the hand on the line the
  thing takes on screen, each part painted between its joints (`capsule`, a plate for the back). To
  take it somewhere else (off the wheel to the gear lever and back), ease the transform's place and
  angle, not each point (that shrinks the hand on the way), and draw the forearm from its elbow to
  wherever the wrist is now; turn the hand on the way so its wrist points at the elbow, or the arm
  leaves the picture before the hand does (`examples/perspective/race.px.js`: `handOn`, `reachAt`).

## 11. Big pieces: rig first

(Saint11's modular boss: a joint in another material, a ring or a band, hides the seam where two
parts meet; a chain's far joints come a frame later each, which reads as weight: tails, undead limbs.)


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
after it is turned: `plate({ light, reach, glint }, ...)` or `relight(null, { light, reach, glint })`.
A `twin` does it for you (`part()` in the example makes each part and its twin);
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
  `light`. It only claims a side when the rim shows it clearly and was seen on both sides (6 rim
  pixels facing each way at least: an 8 px frog drawn a pixel off its middle gives a side from that
  pixel), and stays quiet on readings lit from below. A long thin shape (a blade, a pole) shows only two faces, so it says which one is lit and
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
orders, darkens and checks them. The rest are the drawn parts, moved with the body. A pose's slots
name their parts (`part: "knight_head"`: every pose shares them), so turn it with a prefix map,
`turn: { name: "knight_l_pose3", parts: ["knight_", "knight_l_"] }`: the turned rig looks each part
up as `knight_l_<part>`, else flips the original. Then the timing is a list: `[frames, pose, how far
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
(stages 4 and 5): twenty-two moves; two exchanges blade to blade, a cut from above taken on the shield
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
not as a lit plate, which steps into a chain. For a turned rig, give the part a `twin`
(`twin: "knight_l_arm"`) rather than flipping the finished image: the twin's items are drawn mirrored
before they're lit, so the light stays put. What a mirror doesn't decide by itself (which edge of a
blade is lit, drawn by hand) reads `c.mirrored` in a function (`part()` in the example).

**Parts with two sides.** A flip shows the same face mirrored; a shield, a book, a badge has another
face behind. Give the slot `faces: { outer, inner }` (each drawn): the rig shows the face turned to us.
A shield at rest faces out from the body's side: on the near side we see its face (the cross), on the
far side its inside (the straps); turned to face us, it is seen side on (`edge`). It hangs from the
hand (`on: "arm_l.hand"`), sits outside the arm (`out`: over the arm near, under it far), and its
straps run along the forearm (`parallel`): forearm level (on guard), the shield stands up; forearm
hanging, it lies down; in between, it leans with it.

`examples/rig/knight.px.js`: a 72 px knight in five stages (`knight_blocking`, `knight_parts`,
`knight`, the poses, a bout), the same knight turned left, and both next to a flipped copy in a scene with a world
scale, which `PXL describe` reads out.

## 12. Timing in numbers

Measured frame by frame on Saint11's animated tutorial cards (frames of 60–120 ms; 80 ms is
12.5 fps). Block an action as a flat silhouette at its final timing in a `ref: true` layer before
drawing it (keys held 200 ms, in-betweens 100, the idle 300), and check every highlight cluster in
a guide color: it keeps its size every frame, bending, never popping.

| Action | Frames |
|---|---|
| Player attack | no anticipation; the strike at full reach with its smear on frame 1; 2 frames at reach while the smear shrinks to a hook at the tip (the blade overshooting); 4 back, the last past idle by a pixel; the idle before it 300 ms |
| Slash (an enemy's, top-down) | wind-up 2–3 (the first held longest, ~240 ms); slash 3: the biggest smear, a smaller one, none (held 1.5×); recovery on another arc, about 3× the wind-up |
| Hit taken | the head jumps the whole way in 1 frame, over half comes back the next, the rest eases over 3; the face takes ~10 more; the target stretches on the hit frame and squashes the next |
| Freeze before an impact | 1–2 frames, drawn: a white silhouette over a dark band; then the contact flash, a burst bigger than the thing, sparks 2–3 |
| Death | impact 1 → thrown back, a spark breaking over 3 → 1–2 trying to recover → the knees give → down, head and arms lagging → 1 frame a pixel below rest → an arm bounces → rest |
| Small enemy dies | stretched taller 1 → shrinking 2 → white 1 → burst 3–4 |
| Jump | squash growing over 2–3; takeoff 1 stretched frame carrying most of the rise, then the steps about halving (12, 5, 3, 0.5 px); apex held 1–3; the fall speeding up (1, 3, 7, 10), stretched at most just before contact; the landing squash the biggest of all (55–65% of the height, 1 frame); the recovery is the squash backwards. A player's jump starts on the stretch |
| Dash | squash 3 (area kept) → 3 travel frames longer than the body, dust left at the takeoff → brake low and squashed (15, 3, 1, 0 px), dust kicked forward → 3 to stand, the last held double |
| Wall slide and kick | contact squashed against the wall, the arm up it; the slide 1 px a step, a speck rising; the kick with no anticipation, out at full extension on frame 1, a crescent of dust at the wall breaking into specks over 3–4 |
| Roll | hands down 1 → 4 drawings of a quarter turn each (redrawn, not rotated) → overshoot 1 → recover 1 |
| Whirl | crouch 1; the wind arcs at full size 4 frames on a ring round the body (front bright, back grey), breaking up over ~10 more while the pose holds: an effect outlives its pose |

**Easing** (one marker at 80 ms): linear is the same step every frame (it reads as a robot); slow
in and out goes 1 1 1 5 6, one smear frame across the gap, 8 5 2 2 1; back in and out moves back a
little first, then one smear frame, overshoots 4 then 2 and settles. The fastest in-between is a
smear spanning the gap from the last drawing to the next (on a body, the whole figure blurred, not
only the weapon); cutting frames, a fast move's in-betweens become one smear frame and one squash
frame: it lands sooner and hits harder.

| Cycle | Frames |
|---|---|
| Idle | one cycle of ~600 ms: 2 drawings at 300 ms (down 1 px and 2 px wider); 3 at 200 (the extra one slows the fall); 6 at 100 (the extra ones for overlap: the head leads, the arms, then the hair). A slime's face follows its body 200 ms late |
| Walk | 12 at 100 ms; at 6, keep contact, lowest and passing for each leg at 200 ms each, so it stays 1.2 s; the lowest 2 frames after contact |
| Run | 8 at 160 ms or 16 at 80: the same 1.28 s stride; dust at contact 2–3 frames |
| Top-down walk | 6 poses at 200 ms, the second half the first flipped; the head drops 0, 1, 2 px seen from the front (popping back at the flip), 0, 1, 1 from behind, 0, 2, 1 from the side; the arm on the forward leg's side swings back |
| Top-down run | 2 drawings and their flips at 100 ms; the legs held 3 frames airborne and 2 at the lowest while hair and clothes keep moving (the legs' drawing picked by a slower count than `c.frame`, the hair by `c.frame`; `frame({ hold })` would hold everything) |
| Four legs | 8 at 100 ms, a foot down every 2 (back right, front right, back left, front left) |
| Wings, hovering | 7 at 80 ms: falling 1 px a frame for 3 (wings rising), the flap up 3 px then 1 (wings down, almost touching), 1 down; after ~10 flaps a glide that moves below a pixel (`sub`); an insect's 3-frame loop doubles its wings as a blur |
| Ghost float | 0, 1, 2, 2, 1, 0 px over 6 frames (a sine with its ends held); a hologram doesn't bob: it flickers between two brightnesses on alternate frames, a scan band running over it now and then |
| Metal idle | the body a pixel on alternate frames, the rigid plates and the highlights on the frames between; reflections slide along a blade |
| Less than a pixel | move a part in two steps at most (more reads as bent); slide a line's kink along it to tilt it; a new line grows from its middle or fades in over 3–4 frames; a liquid's surface moves as a 1 px step travelling across it |
