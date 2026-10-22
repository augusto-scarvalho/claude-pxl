// Made for the model study (docs/model-study.md) by the Codex CLI, gpt-6.1-sol at max effort; its file as it left it.
// BRINEWATCH / THE LAST WATCH — original pixel art, 160 x 120.
// 96 drawings x 80 ms = 7.68 s. Wind travels from upper left to lower right.
// The principal light is the Fresnel lamp at (120, 30) inside the lantern room.
// The keeper's hand lantern at about (91, 39) is a small, secondary amber source.
// There is no moon or lightning. Cold colors describe the storm's ambient light.
pal({
  k: '#0b1220', K: '#111b2c', n: '#17243a', N: '#203249',
  c: '#2b4054', C: '#3c5565', d: '#354350', D: '#526370',
  s: '#142c3e', S: '#1b3c50', t: '#27536a', T: '#3d7182',
  f: '#6798a4', F: '#a1c5c7', w: '#d8e5d7',
  r: '#202735', R: '#333b49', v: '#4c5760', g: '#374c4c',
  j: '#537480', J: '#77949a', h: '#9baea9',
  b: '#394b50', B: '#59675e', Q: '#707965', q: '#858873',
  u: '#1d2f40', z: '#2a3d4c', p: '#354c59',
  o: '#6d3d3b', O: '#a05b45', e: '#9d732f', y: '#d3a747',
  Y: '#f4ce73', a: '#e5a456', W: '#fff0bd'
});
ramps('kKnNcC', 'sStTfFw', 'rRv', 'gjJh', 'oO', 'eyYW', 'bBQq');

const WIDTH = 160, HEIGHT = 120, COUNT = 96, FPS = 12.5;
const TAU = Math.PI * 2;
const LX = 120, LY = 30;
const wrap = (v, d) => ((v % d) + d) % d;
const ease = t => t * t * (3 - 2 * t);
const rnd = (a, b = 0) => hash(a + 371, b + 913);
const sin = Math.sin, cos = Math.cos, round = Math.round;

// A rotating beam in the drawing's projection: its horizontal reach foreshortens,
// and the cone broadens as it comes towards the viewer. Its distant end fades
// into rain; the side-on beam goes off the canvas. All its edges meet the lamp.
function beamAt(x, y, frame) {
  const theta = TAU * frame / COUNT + Math.PI;
  const side = cos(theta), front = sin(theta);
  const dx = (x - LX) * (side < 0 ? -1 : 1);
  if (dx < 0) return 0;
  const reach = 22 + 260 * Math.abs(side);
  if (dx > reach) return 0;
  const middle = LY + front * dx * .025;
  const half = 1.5 + dx * (.085 + .12 * (1 - Math.abs(side)));
  const cross = Math.abs(y - middle) / half;
  if (cross > 1) return 0;
  const edge = Math.min(1, (1 - cross) * 5);
  const fade = Math.pow(1 - dx / reach, .65);
  const rotation = .35 + .65 * Math.abs(side);
  return edge * fade * rotation;
}

function paintSky(c) {
  c.rect(0, 0, WIDTH, 76, 'n');
  c.rect(0, 48, WIDTH, 29, 'N');
  // Rifts in long, low storm clouds. Their silhouettes, not speckle, carry them.
  c.poly([0,41, 13,39, 21,40, 34,35, 50,35, 60,31, 79,31,
    94,27, 110,28, 121,24, 144,25, 160,21, 160,59, 0,59], 'c');
  c.poly([0,0, 160,0, 160,15, 151,17, 136,16, 126,20,
    108,18, 96,21, 78,20, 65,24, 49,23, 35,28, 21,28,
    11,32, 0,31], 'K');
  c.poly([0,15, 22,13, 36,16, 54,13, 76,15, 91,12,
    108,14, 97,17, 80,18, 62,17, 45,21, 29,19, 11,23, 0,23], 'n');
  c.poly([0,37, 18,33, 31,35, 47,29, 64,30, 79,26,
    94,29, 109,25, 128,27, 146,23, 160,24, 160,32,
    142,35, 127,33, 112,38, 93,35, 78,40, 62,36,
    45,41, 28,39, 11,43, 0,43], 'N');
  c.poly([0,50, 14,48, 26,49, 39,45, 57,45, 69,41,
    86,43, 99,40, 117,43, 137,38, 160,39, 160,47,
    143,48, 132,46, 117,50, 97,47, 81,51, 60,49,
    42,53, 24,52, 7,56, 0,55], 'n');
  c.poly([0,65, 18,63, 36,65, 53,61, 67,63, 86,59,
    106,61, 124,57, 145,58, 160,54, 160,76, 0,76], 'N');
  c.poly([0,69, 17,67, 38,69, 57,66, 82,68, 98,65,
    119,67, 139,64, 160,66, 160,76, 0,76], 'c');
  // A few shredded lower edges, each attached to a cloud's underside.
  c.hline(8, 43, 13, 'N'); c.hline(38, 41, 10, 'c');
  c.hline(64, 40, 11, 'N'); c.hline(21, 56, 12, 'c');
  c.hline(48, 54, 18, 'c'); c.hline(84, 54, 9, 'c');
  c.hline(134, 51, 17, 'N');

  // Palette-bound atmospheric scattering. No blur or full-frame translucency.
  const low = {k:'K',K:'n',n:'u',N:'z',c:'p',C:'p'};
  const shoulder = {k:'n',K:'N',n:'c',N:'b',c:'b',C:'b'};
  const med = {k:'N',K:'c',n:'b',N:'b',c:'B',C:'B'};
  const high = {k:'c',K:'b',n:'B',N:'B',c:'Q',C:'Q'};
  const hot = {k:'b',K:'B',n:'Q',N:'Q',c:'q',C:'q'};
  for (let y = 5; y < 71; y++) for (let x = 0; x < WIDTH; x++) {
    const raw = beamAt(x, y, c.frame);
    // Salt-mist filaments break the distant falloff into wind-stretched clusters.
    // Their contrast stays below the crisp, geometric core of the beam.
    const mist = .94 + .06*sin(x/9-y*.7) + .035*sin(x/4+y*.9);
    const power = raw*mist;
    if (power < .065) continue;
    const old = c.key(x, y);
    let col;
    if (power < .12) {
      // A single broken edge softens the terminator, not the whole cone.
      if ((x + y * 2) % 4 !== 0) continue;
      col = low[old];
    } else if (power < .29) col = low[old];
    else if (power < .42) col = shoulder[old];
    else if (power < .64) col = med[old];
    else if (power < .84) col = high[old];
    else col = hot[old];
    if (col) c.px(x, y, col);
  }
}

function rain(c, near = false) {
  const total = near ? 32 : 102;
  for (let i = 0; i < total; i++) {
    const id = i + (near ? 300 : 0);
    // A 192 x 128 torus. 96 frames travel (192,384), exactly back to start.
    const x = Math.floor(wrap(rnd(id,1) * 192 + c.frame * 2, 192)) - 16;
    const y = Math.floor(wrap(rnd(id,2) * 128 + c.frame * 4, 128)) - 8;
    const len = near ? 5 : (i % 5 === 0 ? 3 : 2);
    const dx = near ? 3 : (len === 3 ? 2 : 1);
    let col = near ? 'C' : 'c';
    const light = beamAt(x + 1, y + 1, c.frame);
    if (light > .35 && y < 72) col = light > .65 ? 'Y' : 'q';
    // Quiet the tiny face and the lamp filament; foreground rain can pass elsewhere.
    if (near && ((x >= 97 && x <= 106 && y >= 29 && y <= 35) ||
      (x >= 117 && x <= 123 && y >= 27 && y <= 33))) continue;
    c.line(x, y, x + dx, y + len, col);
  }
}

// Three wing drawings with a strongly offset, windward head: gulls, not little M's.
const GULL = [
  'F.......f\n.F.....f.\n..Fw..f..\n...FwF...\n..fFf....\n...s.....',
  '.........\n.........\nFF.....ff\n..Fw.Ff..\n...FF....\n...s.....',
  '.........\n.........\n...w.....\n..fFF....\n.Ff..Ff..\nF......f.',
  '.........\n.F.....f.\n..F...f..\n...wFf...\n..fF.....\n...s.....'
];
anim('_gull', {w:9, h:6, frames:12, fps:FPS, facing:'left'}, c => {
  const drawing = [0,0,1,1,2,2,2,1,1,3,0,0][c.frame];
  c.grid(0, 0, GULL[drawing]);
});
anim('_small_gull', {w:7, h:4, frames:12, fps:FPS, facing:'left'}, c => {
  const a = Math.floor(c.frame / 3) % 4;
  c.grid(0, 0, [
    'C.....C\n.C...C.\n..DfC..\n...c...',
    '.......\nCC...CC\n..DfC..\n...c...',
    '.......\n..Df...\n.Cc.CC.\nC.....C',
    '.......\n.C...C.\n..DfC..\n...c...'
  ][a]);
});

function paintSea(c) {
  c.rect(0, 74, WIDTH, 46, 's');
  c.rect(0, 74, WIDTH, 5, 'S');
  // A broken horizon, softened in salt haze.
  c.hline(0, 74, 13, 'C'); c.hline(18, 75, 12, 'c');
  c.hline(36, 74, 23, 'c'); c.hline(68, 75, 18, 'C');
  c.hline(139, 75, 21, 'c');
  const p = TAU * c.frame / 32;
  const rows = [79,83,88,95,105,116];
  rows.forEach((row, j) => {
    const spacing = 19 + j * 6;
    for (let i = -1; i < 9; i++) {
      if (rnd(i+31,j+12)<.22) continue;
      const x = i * spacing + round(7 * sin(p + j * .8)) + (j % 2) * 8
        + Math.floor(rnd(i+21,j+30)*10);
      const y = row + round((j > 2 ? 2 : 1) * sin(i * 1.8 + p + j));
      const length = 7 + j * 3 + Math.floor(rnd(i+11,j+40) * 8);
      c.poly([x,y+2, x+length*.35,y, x+length*.7,y+1, x+length,y,
        x+length-2,y+3, x+3,y+4], j > 2 ? 'S' : 't');
      if ((i+j) % 3 !== 0) c.hline(x + 3, y, Math.max(2,length-9), j === 2 ? 'T' : 't');
    }
  });
  // Long foreground swell ribbons. Highlights follow the crest; faces stay calm.
  for (const [row,off,amp] of [[100,0,2],[114,8,3]]) {
    const top = [];
    for (let x=-5; x<=165; x+=3) {
      const y = row + round(amp * sin(x / 14 - p + off) + sin(x/7 + off));
      top.push(x,y);
    }
    c.poly([...top,165,row+12,-5,row+12], 'S');
    for (let i=0; i<top.length-2; i+=2) {
      const x=top[i], y=top[i+1];
      if (x < 67 || x > 147) c.line(x,y,top[i+2],top[i+3], 't');
      if ((i/2+off)%7 < 3 && x < 70) c.hline(x,y-1,3,'T');
    }
  }
}

sprite('_distant_reefs', {w:160,h:22}, c => {
  c.poly([0,9, 8,8, 14,11, 20,10, 26,14, 35,14, 40,17,
    49,18, 57,22, 0,22], 'N');
  c.poly([0,14, 8,13, 17,16, 25,16, 35,20, 45,22, 0,22], 'c');
  c.poly([46,19, 50,15, 52,15, 55,20, 62,22, 41,22], 'N');
});

sprite('_headland', {w:160,h:120}, c => {
  // Rock silhouette: broken ledges and undercut stacks all the way to the sea.
  c.poly([66,120, 66,113, 71,109, 72,103, 78,99, 78,93,
    84,90, 83,86, 94,84, 100,80, 111,81, 121,78, 139,77,
    146,79, 160,78, 160,120], 'k');
  c.poly([78,95, 86,89, 104,85, 124,84, 140,79, 160,82,
    160,114, 145,111, 130,117, 113,112, 94,117, 79,111], 'R');
  c.poly([87,90, 104,85, 100,97, 91,100, 86,113, 78,111,
    79,102], 'v');
  c.poly([87,94, 96,91, 93,101, 86,104, 83,111, 80,110], 'R');
  c.poly([103,87, 111,85, 108,98, 102,104, 105,110, 96,117,
    91,115, 98,102], 'r');
  c.poly([115,88, 127,84, 122,97, 126,103, 118,112, 111,108,
    114,100], 'v');
  c.poly([128,87, 137,83, 135,95, 139,101, 132,113, 125,115,
    130,102, 125,98], 'r');
  c.poly([143,84, 160,82, 160,99, 149,96, 144,101, 138,99], 'v');
  c.poly([142,102, 147,96, 153,98, 150,109, 155,118, 138,120], 'r');
  c.poly([72,111, 80,107, 84,111, 80,118, 73,120, 67,119], 'R');
  c.poly([75,111, 80,108, 83,110, 77,113, 71,113], 'v');
  // Fractures stop at planes and ledges; rain runs vertically below overhangs.
  c.line(105,91,102,97,'k'); c.line(102,97,104,100,'k');
  c.line(119,95,118,101,'R'); c.line(118,101,121,103,'R');
  c.line(151,87,148,92,'R'); c.hline(143,94,7,'R');
  c.line(89,98,86,102,'D'); c.line(117,88,115,94,'D');
  c.hline(108,107,5,'r'); c.hline(129,117,7,'k');
  c.poly([83,99,90,98,94,100,89,101,85,101],'R');
  c.line(88,104,93,102,'r'); c.hline(85,105,4,'k');
  c.line(112,99,118,97,'R'); c.line(118,97,123,98,'r');
  c.hline(113,100,4,'D'); c.line(130,108,136,106,'k');
  c.line(145,91,143,96,'D'); c.hline(146,104,5,'R');
  c.line(153,110,159,108,'k'); c.hline(153,111,4,'R');
  // A wind-shorn turf cap with a winding access path.
  c.poly([82,87, 94,83, 101,79, 113,80, 122,77, 139,76,
    150,78, 160,77, 160,83, 147,82, 137,84, 121,84,
    109,87, 97,86, 86,90, 79,93], 'g');
  c.poly([84,87, 97,83, 108,83, 121,80, 138,79, 150,81,
    160,80, 160,82, 146,82, 134,81, 123,82, 108,86,
    97,85, 87,89], 'v');
  c.hline(124,78,12,'j'); c.hline(94,83,7,'j');
  c.line(145,80,154,79,'j');
  // Bent grass only at the silhouette: the center of the cap stays uncluttered.
  for (const [x,y] of [[86,86],[96,82],[103,79],[140,77],[150,78],[157,77]]) {
    c.line(x,y,x+2,y-2,'g'); c.line(x,y,x+4,y-1,'g');
  }
});

sprite('_lighthouse', {w:40,h:78}, c => {
  // Drawing origin (101, 9). The gallery floor is world y=48.
  // Tapered, round masonry; the gallery casts the deep shadow at its crown.
  c.poly([12,37, 27,37, 33,72, 7,72], 'k');
  c.poly([13,39, 25,39, 29,71, 9,71], 'j');
  c.poly([21,39, 26,39, 30,71, 24,71], 'c');
  c.poly([13,39, 17,39, 14,70, 9,70], 'J');
  c.poly([13,39, 26,39, 27,45, 12,45], 'r');
  c.poly([12,49, 27,49, 28,57, 11,57], 'o');
  c.poly([12,49, 17,49, 16,57, 11,57], 'O');
  c.poly([23,49, 27,49, 28,57, 24,57], 'r');
  c.hline(11,58,16,'c');
  // Sparse masonry joints, paint lost below the sea-facing sill.
  c.hline(13,46,6,'j'); c.hline(19,47,4,'c');
  c.hline(11,63,5,'j'); c.hline(23,66,5,'N');
  c.vline(14,60,3,'j'); c.vline(12,66,3,'j');
  // Warm stairwell slit; rain stain and a projecting sill beneath it.
  c.rect(18,43,4,5,'k'); c.rect(19,44,2,3,'e'); c.px(19,44,'Y');
  c.hline(17,48,6,'D'); c.vline(21,59,5,'c');
  // An arched, shut door and two offset stone steps.
  c.rect(17,63,6,9,'r'); c.hline(18,62,4,'r');
  c.rect(18,64,4,7,'K'); c.px(21,68,'e');
  c.hline(10,72,21,'D'); c.hline(8,73,25,'R');
  c.hline(10,74,23,'v'); c.hline(12,75,21,'r');
  // Shadow brackets supporting the gallery.
  c.line(5,39,12,44,'k'); c.line(32,39,26,44,'k');
  c.line(8,40,12,42,'c'); c.line(31,40,27,43,'c');
  // Lantern room: glass is dark until it faces the rotating lamp.
  c.rect(9,16,21,15,'k'); c.rect(11,17,17,12,'b');
  c.rect(12,18,5,10,'B'); c.rect(18,18,5,10,'e');
  c.rect(24,18,3,10,'b');
  c.vline(11,17,12,'D'); c.vline(17,17,12,'r');
  c.vline(23,17,12,'r'); c.vline(28,17,12,'r');
  c.hline(10,29,19,'k'); c.hline(9,30,21,'D');
  c.rect(11,31,18,4,'r'); c.hline(12,32,15,'j');
  // Low copper cap and a lightning conductor: hard corners are architecture.
  c.poly([5,16, 10,11, 18,6, 23,7, 31,12, 34,16], 'k');
  c.poly([8,14, 17,8, 20,8, 15,14], 'o');
  c.poly([17,8, 21,8, 29,14, 16,14], 'R');
  c.hline(7,15,26,'r'); c.hline(8,16,25,'D');
  c.vline(19,2,6,'r'); c.px(19,1,'D');
  c.hline(17,4,5,'c');
});

sprite('_gallery_back', {w:44,h:10}, c => {
  c.hline(1,1,40,'c'); c.hline(0,8,43,'k');
  c.hline(2,7,39,'v');
  for (const x of [1,8,16,31,40]) c.vline(x,1,7,'r');
});

anim('_keeper', {w:24,h:19,frames:16,fps:FPS,pivot:[12,18],facing:'left',height:1.8}, c => {
  const k = c.phase * TAU;
  const tail = round(1.5 * sin(k) + .4*sin(k*2));
  const hem = round(sin(k - 1));
  // Boots planted throughout: a braced stance, shoulders leaning into the wind.
  c.grid(7,13,'..R...R.\n..R...R.\n.Rr...R.\n.kk..Rk.\nkkk..kkk');
  // Coat tail flaps to the right; light folds run from the shoulder to its hem.
  c.poly([11,5, 14,6, 15,10, 20+tail,11+hem, 17,12+hem,
    18+tail,14+hem, 10,14, 9,10, 9,7], 'e');
  c.poly([11,5, 13,6, 14,10, 18+tail,11+hem, 15,12+hem,
    16+tail,13+hem, 11,13, 10,10, 10,7], 'y');
  c.line(13,6,14,10,'Y'); c.line(12,10,13,13,'e');
  c.line(14,12,16+tail,12+hem,'e');
  // Hood, cheek and a dark face opening; no eye-white at this scale.
  c.grid(9,0, '..YY\n.Yey\neyky\n.ey.');
  c.px(9,2,'a'); c.px(10,2,'r'); c.px(11,4,'e'); c.px(12,4,'Y');
  // Windward arm reaches past the gallery, with a separate hand and lantern.
  c.line(10,6,7,7,'y',2); c.line(7,7,5,6,'Y'); c.px(4,6,'a');
  const swing = round(sin(k-1));
  const lx = 2+swing;
  c.line(4,7,lx+1,7,'r');
  c.grid(lx,7, '.R.\nR.R\neYe\nyWy\neYe\n.rr');
  c.px(lx+1,10,'W');
  c.lamp(lx+1,10,{r:9,color:'#f4be62',power:.55});
});

function galleryFront(c) {
  c.hline(97,43,42,'D'); c.hline(98,44,40,'r');
  for (const x of [97,108,119,130,138]) {
    c.vline(x,43,6,'k'); c.px(x,43, x < 125 ? 'J':'c');
  }
  c.hline(97,48,42,'k'); c.hline(100,49,36,'D');
  // Keep warm reflections small and physically next to each light source.
  c.hline(98,43,5,'e'); c.hline(115,43,10,'B');
}

function fresnel(c) {
  const angle = TAU * c.frame / COUNT;
  const flare = Math.max(0, -sin(angle));
  c.ellipse(LX, LY, 5, 3, 'e');
  c.ellipse(LX, LY, 3, 2, 'y');
  c.hline(LX-2, LY, 5, 'Y');
  c.rect(LX-1, LY-1, 2, 3, 'W');
  // Rings of the lens and the narrow mullions stay sharp through the flare.
  c.px(116,28,'Y'); c.px(116,32,'a'); c.px(124,29,'a');
  c.vline(118,26,9,'r'); c.vline(124,26,9,'r');
  c.hline(112,26,16,'D'); c.hline(112,35,17,'k');
  c.px(120,29,'W'); c.px(120,30,'W');
  if (flare > .7) { c.hline(116,30,9,'Y'); c.hline(119,30,3,'W'); }
  c.lamp(LX, LY, {r:24,color:'#f4ce73',power:1});
}

function breakingWave(c, shift=0, dx=0, dy=0, small=false) {
  const u = wrap(c.frame+shift,32)/32;
  const arrival = Math.min(1,u/.68);
  const crestX = -16 + arrival * 100 + dx;
  const energy = sin(Math.PI * arrival);
  const lift = 10 * energy;
  const pts = [];
  for (let x=-8; x<=85; x+=2) {
    const y = 103 + dy + 1.5*sin(x/11-u*TAU) - lift*Math.exp(-Math.pow((x+dx-crestX)/14,2));
    pts.push(x+dx,round(y));
  }
  c.poly([...pts,86+dx,114+dy,-8+dx,114+dy], small?'S':'t');
  // The lip thickens and breaks into foam as it meets the rock.
  for (let i=0;i<pts.length-2;i+=2) {
    const x=pts[i], y=pts[i+1];
    if(x>83+dx)continue;
    c.line(x,y,pts[i+2],pts[i+3],small?'T':'f');
    if (energy > .12 && x > crestX-17 && x < crestX+7) {
      c.hline(x,y+1,2,small?'f':'F');
      if ((i/2+Math.floor(u*8))%4 < 2) c.px(x,y,small?'F':'w');
    }
  }
  if (!small) {
    // An open, dark underside and a thick, irregular curling lip.
    const cy=round(103+dy-lift);
    const curl=Math.max(0,energy);
    if(curl>.25) {
      const curlTop=cy-round(4*curl);
      c.poly([crestX-12,cy+3,crestX-8,cy-1,crestX-2,curlTop-1,
        crestX+3,curlTop,crestX+6,curlTop+3,crestX+5,cy+3,
        crestX+1,cy+4,crestX+1,cy+1,crestX-3,cy,
        crestX-6,cy+2,crestX-8,cy+5], 'f');
      c.curve([crestX-12,cy+3,crestX-7,cy-1,crestX-1,curlTop,
        crestX+3,curlTop+1,crestX+4,curlTop+3,crestX+2,cy+1], 'F', {width:2});
      c.line(crestX-6,cy-2,crestX-1,curlTop-1,'w');
      c.hline(crestX-10,cy+3,4,'F');
      c.px(crestX+3,curlTop+1,'w');
    }
    const backwash=wrap(u-.55,1)/.65;
    if(backwash<1) {
      const foam=ease(backwash);
      const fx=round(76-foam*11), fy=round(106+foam*4);
      c.curve([fx-17,fy+2,fx-9,fy,fx-2,fy+1,fx+7,fy-1], 'T');
      c.hline(fx-9,fy,backwash>.8?3:5,backwash>.8?'T':'f');
      c.hline(fx,fy+1,backwash>.85?2:3,backwash>.7?'T':'F');
    }
  }
  // Detached bubbles follow the backwash instead of filling the whole sea.
  for(let i=0;i<12;i++) {
    const life=wrap(u+rnd(i,72),1);
    if(life<.08 || life>.94)continue;
    const x=round(77+dx-rnd(i,70)*39-life*12);
    const y=round(106+dy+rnd(i,71)*6+life*3);
    const col=small || life<.18 || life>.75?'T':'f';
    if (x>14) c.hline(x,y,i%4===0?3:2,col);
    if(!small && i%4===0) c.px(x+1,y-1,'T');
  }
}

function spray(c, offset=0, ox=0, oy=0, dim=false) {
  const u = wrap(c.frame + offset,32)/32;
  const age = wrap(u-.55,1)/.65;
  if(age<0 || age>1)return;
  const x=80+ox, y=99+oy;
  const rising=Math.min(1,age/.3), dying=Math.max(0,(age-.32)/.68);
  const high=round((dim?12:21)*sin(Math.PI*rising*.5)*(1-dying));
  const col=dim?'f':'F', tip=dim?'F':'w';
  if(age<.53) {
    c.poly([x-13,y+1, x-8,y-3, x-8,y-8, x-11,y-high+5,
      x-9,y-high+1, x-5,y-high, x-2,y-high+3, x-6,y-high+4,
      x-5,y-8, x+2,y-4, x+8,y+2],col);
    c.line(x-8,y-4,x-9,y-high+5,tip);
    c.line(x-9,y-high+3,x-6,y-high,tip);
    c.hline(x-5,y-high,3,tip);
    c.poly([x-4,y-4, x-7,y-high+6, x-4,y-high+7, x+3,y-2],dim?'T':'f');
    c.hline(x-9,y-2,4,tip); c.hline(x+2,y,4,tip);
  }
  // Ballistic spray: a leftward impact, then gravity and wind carry it right.
  for(let i=0;i<25;i++) {
    const launch=rnd(i+offset,79)*.28;
    const t=(age-launch)*1.45;
    if(t<0 || t>1)continue;
    const vx=-23+rnd(i+offset,80)*26;
    const vy=24+rnd(i+offset,81)*22;
    const xx=round(x + vx*t + 13*t*t);
    const yy=round(y - vy*t + 27*t*t);
    if(t>.82 && i%3===0)continue;
    if(t<.58 && i%3===0) c.line(xx,yy,xx+1,yy-1,tip);
    else c.px(xx,yy,t>.65?col:tip);
  }
  // Impact at the rock's foot; its flat foam fans out along the surface.
  const spread=round(4+14*age);
  if(age<.66) {
    c.ellipse(x-2,y+4,spread,2,dim?'T':'f');
    c.hline(x-spread,y+3,Math.max(2,spread-2),col);
    c.hline(x-4,y+5,Math.max(2,spread-3),col);
  } else {
    // The sheet hollows and separates into darkening flecks before vanishing.
    for(let i=0;i<10;i++) {
      if(rnd(i,203)<(age-.66)/.34)continue;
      const xx=x-spread+Math.floor(i*spread/5);
      const yy=y+3+(i%3);
      c.hline(xx,yy,2,age>.82?'T':dim?'T':'f');
    }
  }
}

sprite('_sea_stacks', {w:160,h:120}, c => {
  c.poly([45,115, 50,110, 55,108, 59,109, 62,115, 61,120, 43,120], 'k');
  c.poly([48,114, 55,109, 59,110, 56,114], 'v');
  c.poly([57,115, 60,112, 62,116, 60,119, 54,120], 'R');
  c.poly([69,106, 70,99, 73,96, 77,98, 80,106, 76,110], 'k');
  c.poly([70,100, 73,97, 76,99, 73,103], 'v');
  c.poly([91,120, 96,113, 101,111, 106,114, 108,120], 'k');
  c.poly([95,116, 101,112, 105,115, 99,117], 'R');
});

// A timing carrier is an actual anim, so this is a checked, animated scene.
anim('_tide_clock',{w:1,h:1,frames:COUNT,fps:FPS},()=>{});
scene('brinewatch', {
  w:WIDTH,h:HEIGHT,bg:'k',world:{scale:10,light:{at:[LX,LY]}}
},
  layer('storm and the sweeping beam',{unlit:true},paintSky,stamp('_tide_clock',0,0),c=>rain(c)),
  layer('gulls in the headwind',{unlit:true},c=>{
    const a=c.phase*TAU;
    c.stamp('_gull',37+round(4*sin(a*2)),46+round(2*sin(a*3)));
    c.stamp('_small_gull',64+round(3*sin(a*2+1)),19+round(2*sin(a*2-1)),{delay:240});
    c.stamp('_small_gull',19+round(2*sin(a*3+2)),61+round(sin(a*4)),{delay:480});
  }),
  layer('sea and the distant coast',{unlit:true},paintSea,stamp('_distant_reefs',0,54)),
  layer('back surf',{unlit:true},c=>{
    breakingWave(c,8,42,-12,true); spray(c,8,20,-13,true);
  }),
  layer('the rock headland',stamp('_headland',0,0)),
  layer('lighthouse masonry',stamp('_lighthouse',101,9)),
  layer('gallery rear',stamp('_gallery_back',97,40)),
  layer('keeper in yellow oilskin',stamp('_keeper',100,48)),
  layer('gallery front',galleryFront),
  layer('the Fresnel lamp',{unlit:true},fresnel),
  layer('breaking sea',{unlit:true},c=>breakingWave(c,24)),
  layer('offshore rocks',stamp('_sea_stacks',0,0)),
  layer('spindrift',{unlit:true},c=>spray(c,24)),
  layer('rain close to the viewer',{unlit:true},c=>rain(c,true))
);
