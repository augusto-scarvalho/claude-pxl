// Racing seen from above (Super Sprint's and Micro Machines' kind): the profile as data, taken with
// include("<path>/lib/profiles/racing_topdown.px.js"). Its numbers come from top-down racers measured for numbers
// only, named here in words (their pixels never taken): Super Sprint (the NES's cars, the arcade's tracks), Micro
// Machines 2 (the Genesis's vehicles), Super Off Road (the SNES's tracks), Mario Kart: Super Circuit (the GBA's
// course maps, its racers and the start grid), Rock n' Roll Racing (iso, to compare), Mario Kart 8's karts (3D, for
// what makes a small racer read); and from the library's first lab ("the lab": its car). The car and the track kit
// drawn at it: lib/vehicles/car.px.js, lib/architecture/track.px.js. The scale curve, [tall, wide] in tiles by
// category: scenes §19.
genre("racing_topdown", {
  // one camera at 58 degrees for the cars and all that stands (the user's choice, library F5's stage 5c): a little of a
  // car's sides and its volume, a tree's trunk under its crown, a gantry's posts. The references' cars are plans (Super
  // Sprint's car seen square on is the same drawing turned a quarter, 12x6 one way, 6x12 the other; Micro Machines'
  // line hugs a plan), their barriers seen tilted (Super Sprint's and Super Off Road's show a face under their top):
  // one pitch between the two, the lab's car from 62 and stage 5b's three (90, 30, 58) shown to the user. The ground a
  // plan, as every reference draws it: a true 58 degree camera would squash it about 15%, which these games don't.
  camera: { kind: "topdown", pitch: 58 },
  pitch: 58,               // the cars
  stand: 58,               // the track's things, the trees, a lamp: as the cars, one camera
  grid: 16,                // Micro Machines' car 3 tiles of 8 along, Super Sprint's 1.5, Super Circuit's maps 8 px tiles
  scale: {
    // 28 px along, 16 across with its tyres (30 x 18 with its line): Micro Machines' cars 22-24 along with theirs
    // (7.5-9.4% of a 256-320 px screen; ours 9.4% of 320) and 15-18 across, 1.3-1.6 long a width (ours 1.67); Super
    // Sprint's 2; Mario Kart 8's karts 1.4-2.3
    car: [1.75, 1],
    tree: [2.5, 2.5], bush: [1, 1], lamp: [2, 0.5],   // as topdown16
    // the track's small things (lib/architecture/track.px.js) at twice the car's scale: at its 6.5 px a meter a cone was
    // 2 x 4 px and a tyre stack 4 x 5; Super Sprint draws its small things about twice true (its flags 6-8 px by a 12 px car)
    tyres: [0.7, 0.5], cone: [0.45, 0.25], barrier: [0.7, 2],
  },
  // the asphalt edge to edge in car widths: Super Circuit's 74 px road holds 3 start slots of 24; ours 46 px, three
  // rows of track corners (2.9 cars; 3.1 kerb to kerb)
  road: 2.9,
  // rotations: Super Sprint's car 32 drawings a turn, every one its own (none a mirror); Rock n' Roll Racing's 13 over a
  // half turn (24, mirrored); a heading between two shows the nearest
  dirs: 32,
  // its footprint, the rotations one family; route() heading to rotation
  contract: { footprint: true, family: "rotations", route: "heading" },
  // 3 a material: Super Sprint's cars 3 colours a drawing, Micro Machines' 7-12 for the whole car
  tones: 3,
  // the line by kind: the cars are this genre's characters, near-black all round (Micro Machines' edge is near-black
  // all round, 97-100% of it); the track's things and the trees lined all round too, 1 px outside, but each line pixel
  // a dark tone of the part it touches (the leaves a dark green, the trunk a dark brown, the stone a slate: surface's
  // ink: 2, each ramp's first two), darker than every fill tone of that part so the shadow side still shows it, a step
  // lighter facing the light, never a near-black (Super Sprint's walls and barriers carry no black line). The rules:
  // library F5's study/outlines.md (Pedro Medeiros' coloured lines, SLYNYRD's props, selout lighter by the light);
  // stage 5c's line on the shadow side alone, in the fill's own darkest, let the leaves and the stone melt into the
  // grass and the asphalt (library F5, stage 5d)
  ink: { character: "#1a1620", tree: "own", prop: "own" },
  decal: { at: "all" },    // the roof's mark a plain roundel at every heading: the lab's 3x5 digit read as a "?" from above
  // the footprint: where the car meets the ground, its middle the pivot at every heading
  checks: ["footprint"],
  // the track (lib/architecture/track.px.js): kerbs on the bends, red and white blocks 4 px along (Super Circuit's 4,
  // 5-6 across a 74 px road: ours 3 across 46), a white edge line on the straights (its 2-3 px); the start line a
  // checker of 2 px squares 8 px deep (its 4 rows), the grid two abreast, staggered half a car; skid marks 1 px of
  // rubber (Super Sprint's 1 px tyre marks across its bends); a car's shadow cast from its wheels, as what stands casts
  // its own (seen from straight above the references' cars cast none, Micro Machines' helicopter a disc; from 58 a car
  // stands on the ground as the trees do)
})
