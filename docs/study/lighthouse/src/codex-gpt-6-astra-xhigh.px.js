// Made for the model study (docs/model-study.md) by the Codex CLI, gpt-6-astra at xhigh effort; its file as it left it.
// THE UNBROKEN WATCH — original pixel composition, 160 × 120.
// Key light: the rotating Fresnel lamp at (115, 32), inside the lantern room.
// Secondary practical: the keeper's tiny hand lantern, (94, 39).
// 96 drawings × 80 ms = 7.68 s. All subordinate periods divide 96.
// Wind and rain travel from upper left to lower right. No moon, no lightning.

pal({
  k: '#0b1420', n: '#111c2c', N: '#19283b', s: '#23364a', S: '#304658',
  o: '#122b3a', O: '#1c3d4b', w: '#285462', W: '#3d7180', f: '#67969d', F: '#b4c9be',
  r: '#16242d', R: '#293b42', t: '#40545a', T: '#5c6c6e',
  b: '#3a4855', B: '#667a7e', c: '#9aa99f', C: '#c8c6a5',
  v: '#42333f', V: '#72454b', h: '#a06957',
  a: '#8c602f', A: '#ca923e', y: '#edbf5c', Y: '#fff0b5',
  d: '#344747', e: '#4b5b53', E: '#727b63', L: '#a9a382',
});
ramps('knNsS', 'oOwWfF', 'rRtT', 'bBcC', 'vVh', 'aAyY', 'deEL');
const WIDTH = 160, HEIGHT = 120, FRAMES = 96, FPS = 12.5, TAU = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;
const rnd = (n) => { const z = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return z - Math.floor(z); };
const sn = (f, period = FRAMES, off = 0) => Math.sin(TAU * (f / period + off));
const ir = Math.round;

// A horizontal revolving optic, projected into this shallow elevated view.
// Both cone boundaries extend off canvas; only extinction in rain softens them.
function beamAt(x, y, frame) {
  const a = TAU * frame / FRAMES + 0.18;
  const dx = x - 115, dy = y - 32;
  const side = -Math.cos(a), depth = Math.sin(a);
  const reach = Math.abs(side);
  if (dx * side < 0 || reach < 0.16) return 0;
  const q = Math.abs(dx);
  const mid = 32 + q * (0.02 + depth * 0.27);
  const half = 1.2 + q * (0.10 + 0.09 * (1 - reach));
  const edge = Math.abs(y - mid) / half;
  if (edge > 1.12) return 0;
  return Math.min(1, (1.12 - edge) * 4) * Math.min(1, (reach - 0.16) * 2.2) * (0.98 - q / 300);
}

sprite('_sky', { w: WIDTH, h: 73 }, (c) => {
  c.rect(0, 0, 160, 73, 'N');
  c.poly([0,46, 17,44, 26,47, 47,44, 67,47, 94,43, 124,48, 160,43, 160,73, 0,73], 's');
  // Four interlocking wind-sheared masses; calm interiors, sculpted edges.
  c.poly([0,0, 160,0, 160,16, 145,16, 138,19, 117,17, 107,21, 88,20, 82,24,
    60,22, 54,25, 31,21, 25,22, 15,18, 0,19], 'k');
  c.poly([0,18, 16,17, 26,20, 41,21, 49,25, 69,25, 76,29, 94,29, 101,32,
    89,34, 66,32, 56,34, 34,29, 20,30, 9,26, 0,27], 'n');
  c.poly([0,30, 13,31, 21,34, 39,34, 48,38, 69,38, 79,42, 99,42, 108,46,
    91,48, 73,45, 61,47, 43,43, 29,44, 14,40, 0,40], 'n');
  c.poly([0,42, 13,42, 22,45, 38,45, 45,48, 65,48, 75,52, 92,52, 98,55,
    77,56, 66,53, 47,54, 31,50, 14,51, 0,48], 'N');
  c.poly([49,10, 69,10, 76,13, 93,13, 104,16, 82,16, 73,14, 58,14], 'N');
  c.poly([126,31, 145,30, 160,34, 160,40, 151,38, 137,37], 'N');
  c.poly([6,59, 26,58, 34,60, 53,60, 66,63, 47,64, 33,62, 15,63], 'S');
  c.poly([100,57, 120,55, 133,57, 151,55, 160,58, 160,65, 140,62, 120,63], 'N');
  c.line(0,70, 39,70, 'S');
  c.line(50,69, 72,69, 'S');
});

// Basalt is built from long fractured faces, with wet upper edges and deep clefts.
sprite('_headland', { w: 101, h: 46 }, (c) => {
  c.poly([0,46, 12,35, 14,29, 20,26, 23,17, 30,15, 34,9, 42,8, 47,3,
    60,4, 67,7, 75,10, 85,12, 101,10, 101,46], 'r');
  c.poly([23,17, 34,9, 44,8, 48,4, 60,5, 66,8, 79,12, 69,15, 48,13, 38,18, 31,18], 't');
  c.poly([25,20, 39,17, 47,13, 56,14, 48,23, 37,28, 32,39, 21,43], 'R');
  c.poly([43,18, 47,14, 57,15, 52,22, 46,25, 42,34, 36,37], 't');
  c.poly([53,22, 60,16, 68,17, 64,25, 68,29, 58,37, 51,45, 43,46, 49,33], 'R');
  c.poly([70,17, 82,14, 101,14, 101,27, 89,30, 82,25, 76,27, 72,25], 'R');
  c.poly([84,17, 92,16, 88,23, 90,27, 86,32, 79,39, 72,40, 80,30], 't');
  c.poly([92,31, 101,28, 101,46, 82,46, 86,39], 'R');
  c.poly([15,30, 22,27, 29,29, 25,34, 17,36, 12,40, 10,38], 't');
  c.poly([15,34, 24,31, 20,36, 15,37], 'R');
  c.line(31,15, 39,12, 'T'); c.line(46,7, 58,7, 'T');
  c.line(35,22, 41,18, 'T'); c.line(43,25, 40,30, 'B');
  c.line(80,18, 85,16, 'T'); c.line(83,30, 79,35, 'T');
  c.line(23,22, 22,26, 'k'); c.line(61,29, 58,32, 'k');
  c.line(69,34, 66,40, 'k'); c.line(96,33, 94,37, 'k');
  c.line(53,17, 50,21, 'B');
  // Thin turf on the top, combed in the wind; no decorative speckle.
  c.line(36,9, 43,9, 'd'); c.line(48,4, 57,4, 'e');
  c.line(60,6, 69,9, 'd'); c.line(66,7, 69,7, 'e');
  c.line(75,11, 83,12, 'd'); c.line(38,8, 41,6, 'd');
});

sprite('_lighthouse', { w: 45, h: 72 }, (c) => {
  // Tower tapers toward the gallery. The eave shadows the neck.
  c.poly([13,30, 30,30, 34,67, 8,67], 'r');
  c.poly([14,31, 29,31, 32,64, 10,64], 'B');
  c.poly([15,31, 19,31, 17,64, 10,64], 'b');
  c.poly([24,32, 29,31, 32,64, 24,64], 't');
  c.poly([19,32, 24,32, 24,64, 17,64], 'c');
  c.poly([12,45, 31,45, 32,51, 11,51], 'V');
  c.poly([12,45, 17,45, 17,51, 11,51], 'v');
  c.rect(18,45,6,6,'h'); c.poly([24,45,31,45,32,51,24,51], 'V');
  c.rect(14,31,15,3,'b'); c.rect(18,33,9,1,'B');
  // Rain runs beneath joints and sills, chipped paint at the wet foot.
  c.line(15,37, 15,42, 't'); c.line(28,40, 28,44, 'R');
  c.line(13,54, 13,59, 't'); c.line(27,54, 28,59, 'R');
  c.rect(20,37,4,6,'r'); c.rect(21,37,2,5,'o'); c.rect(20,43,5,1,'T');
  c.px(22,38,'T');
  c.rect(19,56,5,9,'r'); c.rect(20,57,3,8,'b'); c.px(22,61,'A');
  c.line(10,64, 31,64, 'T'); c.line(11,65, 33,65, 'R');
  c.poly([8,66,34,66,37,68,7,68], 'T');
  c.poly([7,68,37,68,38,70,5,70], 'R');
  c.line(8,68, 30,68, 'B');
  // Iron gallery: the back rail is below the keeper, the front rail is separate.
  c.line(3,29, 39,29, 'r'); c.line(5,30, 36,30, 'T');
  c.poly([9,31,14,31,14,35], 'r'); c.poly([29,31,35,31,29,35], 'r');
  c.line(5,24, 37,24, 'R'); c.line(5,24, 5,28, 'b');
  c.line(37,24,37,29,'b');
  // Chamber glass: a warm core with dark structural mullions.
  c.rect(14,12,17,16,'r');
  c.rect(15,13,15,14,'d'); c.rect(18,14,9,12,'e');
  c.rect(20,15,6,10,'A'); c.rect(21,16,4,8,'y');
  c.rect(22,17,2,6,'Y');
  c.line(19,17,26,17,'L'); c.line(19,20,26,20,'C'); c.line(19,23,26,23,'L');
  c.rect(22,18,2,5,'Y');
  c.rect(15,13,1,14,'b'); c.rect(18,13,1,14,'r'); c.rect(27,13,1,14,'r');
  c.line(30,13,30,26,'T'); c.rect(13,27,19,2,'r'); c.rect(16,27,13,1,'a');
  // Copper roof: stepped silhouette, overhang, a slim lightning conductor.
  c.poly([12,11, 16,7, 19,6, 21,4, 24,4, 26,6, 29,7, 33,11], 'v');
  c.poly([14,10, 19,7, 22,5, 24,6, 27,10], 'V');
  c.line(13,11,32,11,'T'); c.line(12,12,33,12,'r');
  c.line(22,0,22,4,'R'); c.px(22,0,'B');
  c.line(21,3,26,3,'R'); c.px(27,2,'R');
});

// Naturalistic miniature: the hood, hunched shoulders, planted boots and held lantern
// do the work of a face. Coat tails travel downstream, the body never slides.
anim('_keeper', { w: 19, h: 17, frames: FRAMES, fps: FPS, facing: 'left',
  height: 1.8, sockets: { front: [7,3] }, pivot: [10,15] }, (c) => {
  const f = c.frame, gust = [0,0,1,2,2,1,0,-1][Math.floor(f / 2) % 8];
  const tail = 1 + (gust > 0 ? gust : 0);
  // Far boot, coat shadow, near boot.
  c.grid(8,12, 'bb..\nbb.k\nkk.kk');
  c.poly([8,5, 12,6, 12,9, 15+tail,12-gust, 12,13, 8,13, 7,9], 'a');
  c.poly([8,5, 11,5, 12,9, 13+tail,11-gust, 10,12, 7,11], 'A');
  c.line(10,6,11,9,'y'); c.px(12+tail,11-gust,'y');
  c.line(8,8,8,10,'y');
  c.grid(6,0, '..yy.\n.Ayyy\n.AayY\n.kaAy\n..aa.');
  // Sleeve reaches into the wind; lantern swings one pixel about the hand.
  c.line(8,6,6,8,'A'); c.line(6,8,3,7,'y'); c.px(2,7,'h');
  const sway = ir(sn(f,32) * 0.8);
  c.line(2,8,2+sway,9,'a');
  c.grid(sway,9, '.aa.\naYYa\naYya\n.aa.');
});

// Wings are redrawn, not rotated: silhouettes remain legible at six to nine pixels.
anim('_gull_near', { w: 11, h: 7, frames: 16, fps: FPS, facing: 'left' }, (c) => {
  const pose = Math.floor(c.frame / 2) % 8;
  const wings = [
    'F.......f..\n.f.....f...\n..ff..f....\n....ff.....',
    '...........\nFF.....ff..\n..ff.ff....\n....ff.....',
    '...........\n...........\nFFF..ffff..\n...fff.....',
    '...........\n...........\n....ff.....\n.fff..fff..',
    '...........\n...........\n....ff.....\n...f..f....\n..f....f...',
    '...........\n...........\n....ff.....\n.fff..ff...',
    '...........\n...........\nFF...ffff..\n..ffff.....',
    '...........\n.F......f..\n..ff..ff...\n....ff.....',
  ];
  c.grid(0,0,wings[pose]); c.line(3,3,6,3,'B'); c.px(2,3,'c'); c.px(7,4,'T');
});
anim('_gull_far', { w: 7, h: 4, frames: 16, fps: FPS }, (c) => {
  const q = Math.floor(c.frame / 4);
  c.grid(0,0,[ 'B.....T\n.B...T.\n..BBB..', '.......\nBB...TT\n..BBB..', '.......\n..BBB..\n.B...T.', '.......\nBB...TT\n..BBB..' ][q]);
});

function ocean(c) {
  const f = c.frame;
  c.rect(0,70,160,50,'o');
  c.poly([0,73,28,72,46,74,69,73,90,75,119,73,160,75,160,84,0,83],'O');
  for (let band=0;band<8;band++) {
    const y0 = 74 + band * 5.7, amp = 0.6 + band * .24;
    const period = band < 3 ? 32 : 48;
    const pts = [0, y0+5];
    for (let x=0;x<=160;x+=2) {
      const y = y0 + amp * Math.sin(x / (7+band*1.7) - TAU*f/period + band*2.3)
        + .5 * Math.sin(x/4 + TAU*f/48);
      pts.push(x,ir(y));
    }
    pts.push(160,y0+7);
    c.poly(pts, band%2 ? 'o':'O');
    for (let j=0;j<8;j++) {
      const repetition=band<3 ? 2:4;
      const x = mod(j*24 + band*11 + f*(band<3 ? .5 : 1),192)-16;
      const len = 3+ir(rnd(j%repetition+band*17)*8);
      const y = ir(y0 + amp * Math.sin(x/(7+band*1.7) - TAU*f/period + band*2.3));
      c.line(x,y,x+len,y-1, band<2 ? 'w' : (j%repetition+band)%4===0 ? 'W':'w');
    }
  }
  // Large, rolling foreground swell; discrete ribbons follow its surface.
  const top=[];
  for(let x=0;x<=160;x++) {
    const y=110+5*Math.sin(x/18-TAU*f/48)+2*Math.sin(x/8-TAU*f/48+.8);
    top.push(x,ir(y));
  }
  c.poly([0,120,...top,160,120],'O');
  for(let x=0;x<160;x++) {
    const y=top[x*2+1];
    if(mod(x+ir(f*2),48)<29) c.px(x,y,'W');
    if(mod(x+ir(f*2)+3,48)<22) c.px(x,y+1,'w');
    if(mod(x+ir(f*2),48)<9) c.px(x,y-1,'f');
  }
}

function breakers(c, at, y, offset, scale=1) {
  const p=mod(c.frame+offset,48)/48;
  const swell = Math.sin(Math.PI*p);
  // The water lifts, curls over the rock, then drains back in narrow rivulets.
  const pts=[at-42,y+8, at-36,y+3, at-27,y+2, at-20,y-ir(swell*3),
    at-12,y-1-ir(swell*7), at-6,y-3-ir(swell*9), at,y-2-ir(swell*6),
    at+5,y+2, at+4,y+7, at-8,y+9, at-25,y+9];
  c.poly(pts,'w');
  c.poly([at-35,y+4,at-26,y+3,at-18,y+1-ir(swell*3),at-10,y-ir(swell*7),
    at-5,y-2-ir(swell*9),at,y-ir(swell*5),at+2,y+4,at-5,y+2-ir(swell*5),
    at-13,y+3,at-23,y+6], 'W');
  c.curve([at-33,y+4,at-20,y+2-ir(swell*3),at-9,y-1-ir(swell*7),
    at-5,y-3-ir(swell*9),at,y-1-ir(swell*5)],'f');
  if (p>.18 && p<.90) {
    const age=(p-.18)/.72, burst=Math.sin(Math.PI*age);
    const h=ir(burst*22*scale), drift=ir(age*10);
    // A hooked crest. The open dark pocket beneath its lip makes water, not ice.
    const lipX=at-7+drift, lipY=y-h;
    c.poly([at-14,y+2, at-11,y-5, at-9,y-h*.55, lipX-3,lipY+2,
      lipX,lipY,lipX+5,lipY+1,lipX+7,lipY+4,lipX+4,lipY+7,
      lipX+2,lipY+5,lipX+3,lipY+3,lipX,lipY+3,at-4,y-5,at+4,y+3,at-4,y+5], 'W');
    c.poly([at-11,y,at-9,y-h*.52,lipX-3,lipY+2,lipX,lipY,lipX+4,lipY+1,
      lipX+6,lipY+3,lipX+6,lipY+5,lipX+3,lipY+4,lipX+2,lipY+2,
      lipX-1,lipY+3,at-7,y-5,at-4,y], 'f');
    c.line(lipX-2,lipY+1,lipX+2,lipY,'F');
    c.line(lipX+3,lipY+1,lipX+5,lipY+2,'F');
    if(h>9) {
      c.line(at-10,y-3,at-8,y-8,'F');
      c.line(at-7,y-10,lipX-2,lipY+4,'F');
      c.line(at-6,y-3,at-4,y-6,'f');
      // Separate spindrift fingers, swept right over the exposed stone.
      c.line(lipX+4,lipY+2,lipX+10,lipY+1,'f');
      c.line(lipX+9,lipY+1,lipX+12,lipY+3,'W');
      c.line(at-1,y-8,at+4+ir(age*5),y-12,'f');
      c.px(at+6+ir(age*5),y-12,'f');
    }
    // Airborne drops follow ballistic arcs; every particle has a staggered age.
    for(let i=0;i<20;i++) {
      const a=age*1.45-i*.035;
      if(a<0 || a>1) continue;
      const vx=(rnd(i+71)-.25)*34;
      const xx=ir(at-5+vx*a+10*a*a);
      const yy=ir(y-4-(25+rnd(i+50)*29)*a+34*a*a);
      c.px(xx,yy,i%3===0?'F':'f');
      if(i%4===0 && a<.65) c.px(xx-1,yy+1,'f');
    }
  }
  for(let i=0;i<6;i++) {
    const x=at-26+i*6+ir(sn(c.frame,48,i*.12)*2);
    c.line(x,y+6+(i%2),x+3+(i%3),y+6+(i%2),'f');
  }
  // Swash and draining lace join the splash to the moving sea.
  c.curve([at-23,y+7,at-15,y+8,at-8,y+7,at-3,y+6,at+3,y+7],'W');
  if(p>.47 && p<.88) {
    const fall=(p-.47)/.41;
    c.line(at+1,y-7+ir(fall*9),at-1,y-3+ir(fall*7),'W');
    c.line(at+4,y-5+ir(fall*7),at+3,y-2+ir(fall*7),'f');
  }
}

function rain(c, front) {
  const n=front ? 43 : 65, period=front ? 24 : 32;
  for(let i=0;i<n;i++) {
    const ph=mod(c.frame/period + rnd(i+322+(front?100:0)),1);
    const x=mod(rnd(i+10)*192 + ph*80,192)-16;
    const y=-12+ph*144;
    const len=front ? 5 : 3;
    const xx=ir(x), yy=ir(y);
    // Rain crossing the main light is lit by the same cone, not a second effect.
    const hit=beamAt(xx,yy,c.frame);
    const key=hit>.5?'L':hit>.15?'E':front?'S':'s';
    c.line(xx,yy,xx+ir(len*.55),yy+len,key);
  }
}

scene('the_unbroken_watch', { w: WIDTH, h: HEIGHT, bg:'n',
  world: { scale: 8, light: { at:[115,32] } } },
  layer('storm clouds', { unlit:true }, stamp('_sky',0,0)),
  layer('distant rain', { unlit:true }, c=>rain(c,false)),
  layer('ocean', { unlit:true }, ocean),
  // Palette-constrained atmosphere, painted over the sky but behind all solid forms.
  (c)=> {
    const lit={k:'n',n:'d',N:'d',s:'e',S:'E',o:'d',O:'e',w:'E',W:'L'};
    for(let y=0;y<90;y++) for(let x=0;x<160;x++) {
      const halo=Math.max(0,1-Math.hypot((x-115)*.85,y-32)/11)*.6;
      const b=Math.max(beamAt(x,y,c.frame),halo); if(b<=.08)continue;
      const key=c.key(x,y);
      if(!lit[key])continue;
      if(b<.22 && (x+y)%3!==0)continue;
      c.px(x,y,b>.62 && ['n','N','s'].includes(key)?'e':lit[key]);
    }
  },
  layer('far gulls', { unlit:true },
    (c)=>c.stamp('_gull_far',69+ir(sn(c.frame,96,.3)*3),20+ir(sn(c.frame,32)*2),{delay:320}),
    (c)=>c.stamp('_gull_far',36+ir(sn(c.frame,96,.6)*4),49+ir(sn(c.frame,48,.3)*2),{delay:640})),
  layer('rocky headland', stamp('_headland',59,74)),
  layer('tower', stamp('_lighthouse',93,13)),
  layer('keeper', stamp('_keeper',103,44)),
  layer('front of gallery', (c)=>{
    c.line(96,39,131,39,'r'); c.line(96,40,96,43,'b'); c.line(131,39,131,43,'T');
    for(const x of [102,109,117,124]) c.line(x,40,x,43,x<109?'R':'b');
    c.line(96,44,131,44,'r'); c.line(105,44,126,44,'T');
    // A pin of warm metal on the hand-lantern side of the rail.
    c.px(97,39,'a'); c.px(109,39,'a');
  }),
  layer('gull in the gale', { unlit:true },
    (c)=>c.stamp('_gull_near',24+ir(sn(c.frame,96)*4),30+ir(sn(c.frame,32,.3)*2))),
  layer('breaking surf', { unlit:true }, (c)=>{
    breakers(c,79,104,0);
    breakers(c,151,119,23,.63);
    // Small black tooth in the foreground, foam wrapping around its base.
    c.poly([34,117,38,109,43,106,48,109,51,116,48,119,39,119],'r');
    c.poly([38,111,43,107,47,110,44,113,37,115],'R');
    c.line(39,110,43,108,'T');
    c.line(35,118,41,119,'f'); c.line(46,118,51,117,'W');
  }),
  layer('rain in the foreground', { unlit:true }, c=>rain(c,true))
);
