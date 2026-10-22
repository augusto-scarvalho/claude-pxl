// LAST LIGHT AT BRINE HEAD — original pixel art, 160 x 120, 48 drawings / 4.8 s.
// The Fresnel lamp at (124,30) is the key light. The keeper carries a small,
// shielded lantern; the sky is overcast, with no moon or lightning source.
// All travel is periodic. Rain traverses whole tiles, all oscillations use
// integer harmonics, and breakers shed their droplets before each new impact.
pal({
  k: '#080f1c', n: '#101b2d', N: '#182a3d', s: '#243e51', S: '#345568',
  m: '#4e7180', M: '#77969a',
  t: '#122f3b', T: '#204955', a: '#326975', A: '#60949b',
  f: '#a2c6c0', F: '#d9e3cf',
  d: '#1c2731', D: '#303f49', r: '#4c5e63', R: '#7b8980',
  p: '#a8b19a', P: '#d3cfaa',
  v: '#52363e', V: '#885347',
  u: '#4e503f', U: '#818368', b: '#a5ae87', B: '#c5c99a',
  o: '#96612d', y: '#d69c3f', Y: '#f0c563', h: '#e9c794',
  l: '#ffe2a0', L: '#fff5d6'
});
ramps('knNsSmM', 'ktTaAfF', 'kdDrRpP', 'kvV', 'kuUbB', 'koyYlL');

const W = 160, H = 120, COUNT = 48, TAU = Math.PI * 2;
const mod = (n, d) => ((n % d) + d) % d;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const wave = (f, period = COUNT, offset = 0) => Math.sin(TAU * mod(f + offset, period) / period);
const rnd = (i, salt = 0) => hash(i, salt);

// Horizontal projection of the rotating beam: narrow in profile, wide and
// foreshortened toward the viewer, lost in rain when facing away.
function beamAt(x, y, f) {
  const theta = TAU * (mod(f, COUNT) / COUNT + .51);
  const side = Math.cos(theta), depth = Math.sin(theta);
  const dx = x - 124, dy = y - 30;
  if (dx * side < 0 || Math.abs(dx) < 4) return 0;
  const reach = 205 * Math.abs(side) + 4;
  const t = Math.abs(dx) / reach;
  if (t >= 1) return 0;
  const width = 1.4 + Math.abs(dx) * (.105 + .1 * Math.max(0, depth)) / (Math.abs(side) + .23);
  const edge = Math.abs(dy + dx * .015) / width;
  if (edge >= 1) return 0;
  const facing = .72 + .28 * depth;
  return (1 - edge * edge) * Math.pow(1 - t, .65) * facing;
}

// A transparent timing part lets all the scene's functions share the clock.
anim('_clock', { w: 1, h: 1, frames: COUNT, fps: 10 }, () => {});

// Hood, braced boots, extended lantern hand. The lower coat is redrawn in
// four wind poses; its shoulder and the boots never slide on the gallery.
anim('_keeper', { w: 17, h: 17, frames: 12, fps: 10, facing: 'left' },
  (c) => {
    const flap = [0,0,1,1,2,2,1,1,0,0,1,0][c.frame];
    c.grid(8, 0, `
      .yYY.
      oyYYy
      ohdyY
      .hoY.
      .oyY.
      yyYY.
      oyYy.
      .oyy.
      .oyy.
      .oyy.
      .oo..
      .dd..
      .d.d.
      .k.kk`);
    c.poly([9,5, 7,7, 6-flap,9, 3-flap,10, 4-flap,12, 8,11, 11,10], 'y');
    c.line(8,8, 5-flap,10, 'o');
    c.line(5-flap,11,7,10,'Y');
    // The elbow bends toward the wind. The lantern remains below the hand.
    c.line(9,5, 7,6, 'Y'); c.line(7,6, 4,6, 'y'); c.px(3,6,'h');
    c.grid(1,7, `.u.\nu.u\nuLu\nulu\n.u.`);
    c.px(2,9, 'L'); c.px(2,10,'l');
  });

// Hand-drawn wing silhouettes, offset timings in the final scene.
const gullPoses = [
  `M........\n.MM......\n...M..MM.\n....MM...\n....s....`,
  `.........\nMM....MMM\n..MM.MM..\n....MM...\n....s....`,
  `.........\n.........\n...MMM...\n.MM.s.MM.\nM.......M`,
  `.........\n.........\n....MM...\n..MMs.MM.\n.MM....MM`,
  `.........\nMM.......\n..MM..MMM\n....MM...\n....s....`,
  `M........\n.MM...MM.\n...M.MM..\n....M....\n....s....`
];
anim('_gull', { w: 9, h: 5, frames: 12, fps: 10, facing:'left' },
  (c) => c.grid(0, 0, gullPoses[Math.floor(c.frame / 2)]));

// Tapered masonry, a rust-red daymark, a cast-iron gallery and copper roof.
// Coordinates local to the lamp house at (107,13).
sprite('_lighthouse', { w: 34, h: 75 },
  // Tower: cold shadow to the right, a narrow warm spill from the gallery.
  poly([9,34, 24,34, 30,72, 1,72], 'r'),
  poly([9,34, 13,34, 10,70, 2,72], 'R'),
  poly([13,35, 18,35, 19,70, 10,70], 'p'),
  poly([20,34, 25,34, 30,72, 21,72], 'D'),
  poly([8,48, 26,48, 27,57, 6,57], 'v'),
  poly([8,48, 16,48, 16,57, 6,57], 'V'),
  // Broken stone courses and runoff only below projecting sills.
  line(11,40, 19,40,'R'), hline(9,45,5,'r'),
  hline(8,61,7,'R'), hline(15,66,9,'r'),
  vline(21,41,5,'D'), vline(19,60,4,'r'),
  rect(15,42,3,5,'k'), rect(15,42,1,4,'u'), hline(14,47,5,'D'),
  rect(13,61,4,8,'d'), rect(14,62,2,6,'u'),
  hline(13,61,4,'R'),
  // Elliptical footing is keyed into the headland.
  ellipse(16,72,16,2,'D'), hline(3,71,24,'R'),
  // Back rail behind the lantern room.
  hline(0,28,34,'r'), vline(1,28,5,'D'), vline(32,28,5,'D'),
  // Lamp-room sill and glass: no independent bright window below it.
  rect(7,11,21,16,'d'), rect(9,12,17,12,'u'),
  rect(11,12,13,12,'U'), rect(12,13,10,10,'b'),
  ellipse(17,17,7,5,'B'), ellipse(17,17,5,4,'l'),
  rect(15,14,4,7,'L'),
  hline(10,15,15,'P'), hline(10,19,15,'P'),
  vline(9,11,14,'r'), vline(14,11,14,'u'),
  vline(21,11,14,'u'), vline(26,11,14,'D'),
  hline(7,25,21,'k'), hline(8,26,19,'R'),
  // Roof with wind-bent pennant and finial.
  poly([3,10, 10,5, 16,2, 21,3, 31,10], 'k'),
  poly([5,9, 16,3, 18,3, 19,9], 'r'),
  poly([18,3, 21,4, 29,9, 20,9], 'D'),
  line(5,9,18,9,'R'), hline(2,10,30,'d'),
  vline(17,0,4,'r'), hline(12,1,6,'r'), px(12,0,'D'),
  // Gallery support brackets and underside shadow.
  poly([0,34, 33,34, 28,37, 5,37], 'd'),
  hline(0,33,34,'R'), hline(3,34,28,'D'),
  line(3,35,9,39,'D'), line(30,35,24,39,'k'));

function drawClouds(c) {
  c.rect(0,0,W,H,'n');
  c.poly([0,30, 14,28, 21,25, 27,24, 37,25, 43,22, 50,21, 55,18, 66,18, 72,20, 80,18, 86,14, 100,13, 109,15, 117,10, 129,8, 143,10, 154,9, 160,6, 160,70, 0,70], 'N');
  c.poly([0,48, 12,46, 19,43, 29,44, 39,42, 44,40, 54,42, 65,40, 70,37, 82,37, 89,39, 102,35, 110,34, 122,35, 130,33, 139,30, 151,30, 160,31, 160,70, 0,70], 's');
  c.poly([0,63, 15,62, 23,59, 30,60, 38,58, 49,57, 59,59, 68,58, 76,55, 88,53, 97,54, 107,55, 119,52, 134,51, 141,48, 151,48, 160,49, 160,74, 0,74], 'S');
  // Low, torn scud, broad clusters with long flat undersides.
  c.poly([0,10, 14,11, 22,15, 36,15, 45,18, 57,18, 50,21, 35,22, 24,20, 7,19, 0,16], 'k');
  c.poly([37,3, 51,5, 64,5, 75,8, 98,8, 107,11, 94,13, 76,12, 61,10, 49,10, 41,7, 31,7], 'k');
  c.poly([0,33, 15,31, 31,31, 40,34, 62,34, 74,31, 89,31, 78,36, 57,38, 40,37, 28,35, 8,36, 0,38], 'N');
  c.hline(4,25,17,'N'); c.hline(28,27,13,'N');
  c.hline(88,22,18,'N'); c.hline(133,13,27,'n');
  c.hline(3,52,19,'s'); c.hline(25,51,14,'s'); c.hline(66,46,21,'s');
  c.hline(7,64,15,'m'); c.hline(39,61,18,'m'); c.hline(72,59,16,'m');
}

function drawBeam(c) {
  // Palette-bound volumetric light; adjacent bands represent denser rain.
  const maps = {
    k:['n','N','s','u'], n:['N','s','u','U'], N:['s','S','U','U'],
    s:['S','m','U','b'], S:['m','M','b','b'], m:['M','U','b','B']
  };
  for(let y=0;y<67;y++) for(let x=0;x<W;x++) {
    const b = beamAt(x,y,c.frame);
    if (b < .12) continue;
    const original = c.key(x,y), ramp = maps[original];
    if (ramp) c.px(x,y,ramp[clamp(Math.floor(b*4),0,3)]);
  }
}

function drawSea(c) {
  const time=mod(c.frame,COUNT);
  c.rect(0,70,W,50,'t');
  c.hline(0,70,W,'m'); c.hline(0,71,W,'s');
  c.poly([0,75, 20,76, 43,74, 63,75, 86,74, 109,75, 160,73, 160,80, 0,81], 'T');
  // Horizon lines compress into small broken runs.
  for (let i=0;i<21;i++) {
    const x=mod(i*29+Math.round(wave(c.frame,48,i*3)),167)-7;
    const yy=73+(i%4)*2;
    c.hline(x,yy,4+(i%5),'S');
  }
  for(let row=0;row<6;row++) {
    const base=79+row*7, pts=[];
    const surface = (x)=>base + Math.round(
      (1+row*.22)*Math.sin(TAU*(x/(39+row*4)-time/24)) +
      .85*Math.sin(TAU*(x/(73-row*3)+time/48)+row));
    for(let x=-4;x<=164;x+=3) pts.push(x,surface(x));
    c.poly([...pts,164,base+6,-4,base+6],row%2?'T':'a');
    // Irregular, short caps travel on the rolling surfaces, never in a grid.
    for(let i=0;i<5;i++) {
      const x=mod(i*43+row*19+Math.round(3*wave(c.frame,48,i*4)),215)-25;
      const yy=surface(x);
      c.line(x,yy,x+5, surface(x+5),row>1?'a':'S');
      if((i+row)%3===0) c.line(x+6,surface(x+6),x+10,surface(x+10),'S');
    }
  }
  // A wave train travels into the rocks, rather than bobbing in place.
  // Its 120-pixel spacing is exactly its travel over 24 frames.
  const travel=mod(c.frame,24)*5, z=Math.round(wave(c.frame,24));
  const surface=(x)=>{
    const dist=mod(x-28-travel+60,120)-60;
    return 100+z-Math.round(9*Math.exp(-dist*dist/290));
  };
  const points=[];
  for(let x=-2;x<=162;x+=2) points.push(x,surface(x));
  c.poly([...points,162,111,-2,115],'a');
  c.poly([0,109, 16,106, 32,106, 47,109, 63,107, 81,111, 89,116, 42,116, 0,120], 'T');
  for(let j=-1;j<=1;j++) {
    const x=28+travel+j*120;
    c.curve([x-29,100+z, x-17,96+z, x-8,92+z, x+3,91+z, x+11,93+z, x+18,97+z, x+28,100+z], 'A',{width:2});
    c.curve([x-16,95+z, x-7,91+z, x+3,90+z, x+10,92+z, x+15,95+z],'f');
    c.curve([x+1,94+z, x+8,94+z, x+13,97+z, x+11,100+z, x+6,99+z], 'A');
    c.line(x-7,95+z,x-13,101+z,'A');
    c.line(x+1,96+z,x-4,103+z,'A');
    c.hline(x-11,97+z,3,'a'); c.hline(x+3,96+z,3,'a');
    c.line(x+18,101+z,x+14,105+z,'a');
  }
  c.hline(4,110+z,12,'a'); c.hline(25,113-z,9,'A');
  c.hline(45,109+z,8,'a'); c.hline(6,118,14,'a'); c.hline(34,118,12,'T');
}

function drawHeadland(c) {
  c.poly([160,72, 149,73, 143,78, 133,79, 122,79, 115,78, 106,80, 96,83, 91,87, 88,92, 80,96, 80,101, 73,105, 72,111, 66,115, 63,120, 160,120], 'd');
  // Broad planar faces follow the fracture lines, not a noise texture.
  c.poly([97,85, 108,82, 111,89, 103,98, 95,111, 87,113, 84,119, 67,120, 74,111, 77,104, 85,99, 88,92], 'D');
  c.poly([108,83, 123,82, 123,88, 116,96, 109,101, 101,119, 88,120, 95,105, 101,97], 'r');
  c.poly([124,84, 141,80, 144,89, 136,102, 128,109, 123,120, 105,120, 112,107, 118,95], 'D');
  c.poly([149,77, 160,74, 160,110, 151,108, 144,114, 135,115, 140,103, 146,96], 'r');
  c.poly([94,87, 103,84, 101,90, 93,95, 90,102, 84,104, 86,96], 'r');
  c.poly([108,84, 117,83, 112,89, 108,94, 105,94], 'R');
  c.poly([127,83, 140,81, 138,85, 127,89, 123,94], 'r');
  c.poly([153,79, 160,77, 160,80, 152,86, 148,88], 'R');
  c.line(98,88,91,97,'R'); c.line(90,101,86,105,'r');
  c.line(111,95,102,112,'d'); c.line(130,93,124,102,'d');
  c.line(145,96,139,99,'D'); c.line(150,111,143,117,'D');
  c.line(113,110,109,117,'r');
  c.poly([113,97,120,92,118,98,113,104,110,104],'d');
  c.poly([86,113,92,108,93,111,87,116,82,116],'r');
  c.poly([142,106,149,101,148,105,141,110,137,110],'D');
  // Horizontal ledges, salt stain and wet seams beneath them.
  c.hline(91,101,7,'R'); c.hline(86,108,5,'r'); c.hline(116,105,6,'r');
  c.hline(136,99,7,'R'); c.hline(149,94,8,'D');
  c.line(98,103,94,113,'t'); c.line(136,101,131,110,'t');
  // Turf hugs the top; individual blades lean left with the wind.
  c.poly([94,84, 108,79, 119,79, 128,80, 142,77, 146,74, 160,71, 160,76, 145,80, 130,83, 116,82, 105,83, 96,87], 't');
  c.line(98,83,107,81,'S'); c.hline(112,80,8,'S');
  c.line(137,79,147,76,'T'); c.hline(152,73,8,'S');
  for(const [x,y] of [[98,83],[104,81],[139,78],[147,75],[156,72]]) {
    c.line(x,y,x-3,y-2,'T'); c.px(x-3,y-1,'S');
  }
}

function spray(c, ox, oy, period, delay, scale) {
  const phase=mod(c.frame+delay,period)/period;
  const kick = Math.sin(Math.PI * clamp(phase/.57,0,1));
  if (phase < .57) {
    const rise=Math.round(20*scale*kick), left=Math.round(12*scale*kick);
    c.poly([ox-8,oy+2, ox-4,oy-3, ox-3,oy-rise*.55, ox-left-4,oy-rise, ox-left,oy-rise-2, ox-1,oy-rise*.65, ox+3,oy-2, ox+3,oy+3], 'A');
    c.curve([ox-8,oy+1, ox-4,oy-4, ox-4,oy-rise*.65, ox-left-2,oy-rise], 'f', {width:2});
    c.line(ox-2,oy-3,ox-left+2,oy-rise+1,'f');
    if(phase>.09 && phase<.43) {
      c.curve([ox-4,oy-rise*.5, ox-left-2,oy-rise*.85, ox-left-6,oy-rise*.9],'A');
      c.px(ox-left-6,oy-rise*.9-1,'f');
    }
    c.hline(ox-11,oy+2,10,'f');
  }
  for(let i=0;i<19;i++) {
    const t=phase-i*.009;
    if(t<0 || t>.76) continue;
    const vx=9+rnd(i,3)*24, vy=32+rnd(i,4)*33;
    const x=Math.round(ox-scale*vx*t), y=Math.round(oy-scale*vy*t+scale*49*t*t);
    if(y>oy+2) continue;
    c.px(x,y,t<.43?'f':'A');
    if(i%4===0 && t<.47) c.px(x+1,y+1,'f');
    if(i%3===0 && t<.32) c.line(x,y,x+1,y+2,'f');
  }
  // Retreating wash elongates along the foot instead of sitting in a halo.
  const run=Math.round(13*phase);
  const width=Math.round((8+run)*Math.sin(Math.PI*phase));
  if(width>0) c.hline(ox-11-run,oy+4,width,phase<.65?'A':'a');
  if(width>3) c.hline(ox-3-run,oy+6,Math.round(width/2),'a');
}

function drawRain(c, foreground) {
  const total=foreground?58:39, span=foreground?192:96;
  const vx=foreground?4:2, vy=foreground?6:3;
  for(let i=0;i<total;i++) {
    const sx=Math.floor(rnd(i,foreground?31:32)*span);
    const sy=Math.floor(rnd(i,foreground?33:34)*144);
    const x=mod(sx-c.frame*vx,span)-16, y=mod(sy+c.frame*vy,144)-12;
    const length=foreground?(i%5===0?6:4):2;
    for(let tile=0;tile<(foreground?1:3);tile++) {
      const xx=x+tile*span;
      if(xx < -5 || xx > 164) continue;
      const lit=beamAt(xx,y,c.frame);
      const key=lit>.38?(foreground?'P':'b'):(foreground?(y>76?'S':'m'):'S');
      c.line(xx,y,xx-Math.floor(length*.66),y+length,key);
    }
  }
}

scene('last_light_at_brine_head', {
  w:W, h:H, bg:'n', world:{light:{at:[124,30]}}
},
  stamp('_clock',0,0),
  layer('storm and lamp beam', {unlit:true}, drawClouds, drawBeam),
  layer('distant headland', {unlit:true},
    poly([0,68, 5,65, 12,65, 18,67, 24,67, 32,70, 0,73], 'S'),
    hline(1,69,23,'m')),
  layer('open water', {unlit:true}, drawSea),
  layer('rain behind the tower', {unlit:true}, (c)=>drawRain(c,false)),
  layer('bedrock', drawHeadland),
  layer('tower', stamp('_lighthouse',107,13)),
  layer('keeper', stamp('_keeper',96,34)),
  layer('front gallery rail',
    hline(103,43,37,'D'), hline(103,42,37,'R'),
    vline(104,43,5,'r'), vline(110,43,5,'u'), vline(117,43,5,'u'),
    vline(124,43,5,'D'), vline(131,43,5,'D'), vline(138,43,5,'D'),
    hline(103,48,37,'D'), hline(104,47,34,'r'),
    // The wet handrail catches warm light only close to the lamp.
    hline(111,42,13,'p')),
  layer('gulls in the gale', {unlit:true}, (c)=>{
    c.stamp('_gull', 35+Math.round(3*wave(c.frame,48,2)), 25+Math.round(2*wave(c.frame,24)), {delay:200});
    c.stamp('_gull', 60+Math.round(4*wave(c.frame,48,15)), 39+Math.round(2*wave(c.frame,24,7)), {delay:600});
    c.stamp('_gull', 79+Math.round(3*wave(c.frame,48,29)), 15+Math.round(wave(c.frame,24,16)), {delay:900});
  }),
  layer('breakers and spray', {unlit:true}, (c)=>{
    spray(c,78,103,24,14,1);
    spray(c,92,92,24,11,.62);
    // Foreground skerry splits the racing white water.
    c.poly([0,120, 4,116, 10,115, 13,110, 19,108, 24,112, 29,113, 32,117, 39,120], 'k');
    c.poly([12,115, 16,110, 20,110, 24,113, 20,113], 'D');
    c.line(13,114,18,109,'r'); c.line(21,112,26,114,'D');
    const offset=Math.round(wave(c.frame,12));
    c.hline(1,116+offset,6,'A'); c.hline(30,118-offset,7,'A');
  }),
  layer('near rain', {unlit:true}, (c)=>drawRain(c,true)),
  // Glints stay sharp: the luminous lens is the brightest cluster in the art.
  layer('lamp glints', {unlit:true}, (c)=>{
    const q=wave(c.frame,48);
    c.px(123+(q>0?1:0),29,'L');
    c.px(124,30,'L');
  })
);
