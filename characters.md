# Characters (people, humanoids and small animals, 16–64 px)

Read this before drawing a person. At these sizes, most failures come from proportion and
construction, not from where single pixels go: a head that's the wrong size, a body that's too wide
for it, a neck under the chin, arms like columns.

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
     looked flat. Count the keys with `PXL ascii`. If tones merged, drop `palettize` and map each
     original colour to its own key with `recolor({ "#2c963c": "g", "#27773c": "G" })`.
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

## 6. 3/4 (diagonal) views

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
decision per pixel, with `outline` around them.

- **Lying along a slope** (a jaguar on a sloping branch): draw it lying flat, then shear it in a
  function, moving each column down by `Math.floor((x - x0) / 3)` from the neck on. Legs and tail
  stay vertical, so they still hang. Use `floor` with a fixed step: `Math.round(x * 0.3)` gives
  runs of 2, 3 and 4 pixels and the back comes out lumpy. Keep the grid's back one straight row
  (no hump at the shoulders or hips) and let the shear do the slope; round the rump off into the
  tail with steps that get shorter. Put each leg inside one step of the shear, or it splits in two.
- **Swinging from a hand** (a monkey on a branch): shift the whole body by `dx` per frame
  (`[0, 1, 0, -1]`) and bend only the arm toward the hand, each arm row moving
  `Math.round(dx * y / armLength)`. Shifting every row by its own amount tears the head.
- **Breathing:** move every row above the knees down 1 px on the out-breath (rows shift, nothing is
  redrawn), and let the row the shift lands on be a plain one, so hems and fringes keep their shape.
