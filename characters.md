# Characters (people and humanoids, 16–64 px)

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
- **Read off the landmarks.** Import the reference with `sprite("ref", { png: "ref.png" })` and run
  `PXL ascii` on it. Note the rows of the chin, shoulders, waist, hands, knees and soles, and the
  widths of the head and shoulders. Draw your silhouette on those rows.
- **Take proportions, not costume.** Hair and clothes come from the character, not the reference.
  Hair tied in a bun hugs the skull, whatever volume the reference has.

## 3. Drawing over a base body

When a base body exists in the view you need, dress it instead of inventing the anatomy. The base
already has the hard parts: proportions, the 3/4 turn, which arm and leg are in front.

- **Check which way the base faces** by its face, not by its file name or a caption. The eyes and
  the nose are on the side it faces, and the ear sits toward the back of the head. If the base faces
  the wrong way, set `flip: "x"` on the import before drawing anything.
- **Dress it in pxl:**

```js
sprite("_base", { png: "base.png", palettize: true, flip: "x" })    // flip only if it faces the wrong way
sprite("hero", { w: 32, h: 64, outline: "k" },
  stamp("_base", 0, 0),
  recolor({ "3": "_", z: "_" }),   // remove the base's own outline keys (see them with PXL ascii)
  ...runs)                          // hair, face and clothes as [x, chars] runs (section 7)
```

- **How the outline works here:** removing the base's outline lets `outline` draw a new edge around
  the clothes. Inner lines, like the gap between an arm and the body, come back as outline too.
- **Licence:** whatever you paint over the base is a derivative of it. With a CC-BY-SA base, the
  result has to credit its author and be shared under CC-BY-SA, so tell the user.

## 4. Build order

1. **Silhouette.** Draw the figure in flat colours, then check it as one shape with a
   `recolor({ "*": "k" })` variant. The limbs should read apart, with gaps where they belong.
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
  - Arms hang slightly outward, with a 1 px gap to the body at the hands.
  - Forearms and wrists are narrower than the sleeves above them.
  - Shoulders slope down from the neck. Flat shoulders read as shoulder pads.

## 7. Placing the pixels

Write a figure wider than about 20 px as runs at absolute x, not as long rows full of dots.
Counting dots in 30-character rows is the main source of misplaced pixels.

```js
// one entry per row: [x, chars] runs, so nothing is counted by hand
const body = {
  30: [[19, "3H3"], [23, "deeReeeeeed"], [35, "HlH"]],
  31: [[19, "StS"], [23, "QWewewwwvvW"], [35, "tftS"]],
}
sprite("hero", { w: 62, h: 62, outline: "k" }, grid(18, 0, HEAD),
  ...Object.entries(body).flatMap(([y, runs]) => runs.map(([x, s]) => grid(x, +y, s))))
```

Look at the result at 1× too. Something that reads as cute at 12× can turn to mush at its real size.
