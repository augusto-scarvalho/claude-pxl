// Made for the model study (docs/model-study.md) by the Codex CLI, gpt-6.1-sol at high effort; its file as it left it.
// THE LAST WATCH — original pixel art, 160 × 120, 64 frames / 6.4 seconds.
// Every moving system is periodic on 64 frames. Wind travels from right to left.
// Primary light: the Fresnel lamp at (110, 28). Secondary: keeper's hand lantern.
pal({
  k:'#09121f', n:'#111e31', N:'#1b2d43', c:'#2a4054', C:'#3e5665',
  d:'#0c2838', e:'#174150', t:'#285968', T:'#427b86', f:'#74a3a8', F:'#b6d0c8',
  a:'#14212c', A:'#283943', b:'#40545a', B:'#607778',
  g:'#293f40', G:'#4d6357', h:'#496464', H:'#81958b', I:'#b0b7a0',
  r:'#493b40', R:'#785047',
  o:'#795331', y:'#b78a3f', Y:'#e4b94f', W:'#ffdb84', w:'#fff2be',
  q:'#374b50', Q:'#58685c', j:'#879078'
});
ramps('knNcC','kdetTfF','kaAbB','khHI','krR','koyYWw','kgG');
const W=160, H=120, NFR=64, FPS=10, TAU=Math.PI*2;
const mod=(x,n)=>((x%n)+n)%n;
const s=(p)=>Math.sin(TAU*p);
const hash=(i)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
const beamAt=(p)=>{
  const turn=TAU*p+Math.PI;
  // Orthographic projection of a rotating horizontal beam: it foreshortens,
  // widens toward the viewer, then opens out on the other side of the lamp.
  const dx=Math.cos(turn)*244;
  const front=Math.max(0,Math.sin(turn));
  return {dx,dy:8+front*11,half:11+front*19,front};
};
const inBeam=(x,y,p)=>{
  const z=beamAt(p), u=(x-110)/z.dx;
  return u>0 && u<1 && Math.abs(y-(28+u*z.dy))<1+u*z.half;
};

sprite('_sky',{w:W,h:H},
  rect(0,0,W,H,'n'),rect(0,47,W,24,'N'),
  // Torn storm banks: their long flat undersides are pulled west by the wind.
  poly([0,9,17,9,25,13,48,13,57,17,76,18,84,22,62,23,54,21,29,21,21,18,0,18],'k'),
  poly([0,30,12,26,31,27,40,31,56,31,68,36,85,37,90,40,59,40,48,38,27,38,15,35,0,36],'N'),
  poly([0,31,14,29,29,30,39,33,58,34,68,37,49,36,36,35,19,33,0,34],'c'),
  poly([78,1,104,1,110,4,140,5,151,9,160,9,160,22,147,20,138,17,116,16,103,12,88,10,68,8],'k'),
  poly([135,49,147,46,160,47,160,63,134,61,119,63,96,62,91,59,112,58],'c'),
  hline(0,62,48,'c'),hline(7,64,67,'c'),hline(131,66,29,'C'),
  // A distant headland, almost swallowed by the rain.
  poly([0,64,8,61,17,61,22,64,30,65,36,68,0,70],'c'),
  rect(0,68,W,52,'d')
);

sprite('_headland',{w:W,h:H},
  // Broken silhouette, then planes fractured along natural bedding.
  poly([64,120,68,112,77,108,77,101,86,97,91,86,98,80,111,77,124,79,132,75,142,77,150,74,160,77,160,120],'a'),
  poly([84,101,91,88,100,82,113,80,127,82,133,78,143,81,153,77,160,80,160,94,148,98,134,96,125,100,114,97,106,103,94,101],'A'),
  poly([72,113,80,108,85,101,96,100,101,107,94,111,95,120,67,120],'A'),
  poly([106,96,115,91,128,91,132,98,125,105,115,107,112,120,99,120,104,108],'b'),
  poly([134,89,145,86,160,87,160,102,150,109,144,105,139,112,126,116,128,106],'b'),
  poly([117,108,124,105,131,104,124,120,113,120],'A'),
  poly([150,101,160,99,160,120,140,120,143,112],'A'),
  poly([91,88,101,80,112,78,125,80,132,76,143,78,153,75,160,78,160,83,144,82,136,85,119,83,105,85,96,91],'g'),
  line(94,86,104,81,'G'),line(105,81,118,81,'G'),line(134,80,142,81,'G'),line(151,78,159,80,'G'),
  line(89,96,94,90,'b'),line(82,105,87,102,'B'),line(75,112,81,109,'b'),
  line(106,98,114,94,'B'),line(116,94,126,94,'B'),line(107,101,112,102,'A'),
  line(113,107,110,115,'A'),line(141,89,151,88,'B'),line(151,88,157,89,'B'),
  line(137,94,135,101,'A'),line(148,106,143,110,'B'),line(124,110,120,118,'B'),
  // Detached slabs at the tide line.
  poly([53,117,58,113,64,113,69,118,68,120,52,120],'a'),
  line(57,115,63,114,'b'),
  poly([75,101,79,97,84,98,87,104,82,108,74,108],'a'),
  line(77,100,81,99,'B')
);

sprite('_tower',{w:W,h:H},
  // Tapered stone shaft; the narrow right face stays in the lamp's shadow.
  poly([104,43,116,43,121,82,119,85,98,85,97,82],'h'),
  poly([104,44,110,44,110,82,100,82],'H'),
  poly([114,44,116,44,121,82,116,83],'A'),
  poly([103,52,117,52,118,61,101,61],'r'),
  poly([103,52,109,52,109,60,102,60],'R'),
  hline(99,82,21,'b'),hline(100,84,20,'A'),
  // Offset courses, rain tracks under the sill, and a recessed iron door.
  hline(103,65,10,'h'),hline(101,74,13,'h'),vline(107,62,3,'h'),
  vline(113,68,5,'A'),rect(105,77,6,6,'a'),hline(106,76,4,'A'),px(109,80,'y'),
  rect(107,65,4,6,'A'),rect(108,66,2,3,'Q'),hline(106,71,6,'b'),
  vline(107,72,2,'h'),vline(110,72,3,'h'),
  // Gallery brackets below a substantial projecting platform.
  line(96,45,103,50,'a'),line(133,45,118,50,'a'),
  line(98,45,104,48,'b'),line(129,45,118,48,'b'),
  rect(94,43,43,3,'a'),hline(94,43,43,'H'),hline(98,46,34,'b'),
  // Glasshouse back wall and warm Fresnel lens, source exactly (110,28).
  rect(100,22,21,15,'a'),rect(102,24,17,10,'o'),
  rect(104,24,4,10,'y'),rect(108,24,7,10,'Y'),rect(116,25,2,8,'q'),
  rect(108,25,6,6,'W'),rect(109,26,3,4,'w'),
  hline(106,30,10,'W'),hline(105,32,11,'y'),
  vline(101,23,12,'b'),vline(107,23,11,'A'),vline(115,23,12,'A'),vline(120,23,12,'a'),
  px(102,24,'I'),px(116,24,'Y'),
  rect(99,35,23,3,'a'),hline(99,35,23,'y'),
  rect(103,38,15,5,'A'),rect(105,38,5,4,'o'),
  // Copper storm cap and finial: weathered metal catches the lamp underneath.
  poly([97,22,103,17,109,15,114,16,119,20,124,22],'a'),
  poly([99,21,105,17,110,16,115,18,120,21],'r'),
  line(103,20,109,17,'b'),hline(98,22,26,'b'),hline(101,23,19,'y'),
  vline(110,10,6,'a'),px(110,10,'b'),hline(107,12,7,'a'),
  // Left section of gallery; keeper's section is painted in front of the figure.
  hline(94,37,7,'b'),vline(94,37,7,'A'),vline(98,38,6,'A')
);

anim('_keeper',{w:22,h:18,frames:NFR,fps:FPS,pivot:[9,17],facing:'right'},(c)=>{
  const k=c.phase*TAU, flap=Math.round(1.2*s(c.phase*8));
  // 13-pixel adult silhouette, with braced boots and a 3px oilskin hood.
  c.grid(9,3,`.YY.\nYYWo\n.Yo.\n.YY.`);
  c.poly([9,8,12,7,12,11,10,14,4,13+flap,6,10+flap],'y');
  c.poly([9,7,11,7,11,11,9,13,6,12+flap,8,9],'Y');
  c.line(8,10,6,11+flap,'W');
  c.grid(8,13,`a.a\na.a\naa.aa`);
  // Forward arm and lantern handle remain distinct from the chest.
  c.line(11,8,14,9,'Y');c.px(15,9,'W');
  const swing=Math.round(s(c.phase*4));
  c.grid(15+swing,10,`aa.\na.a\nYoY\nYwY\n.ya`);
});

const gulls=[
  'C.......C\n.CC...CC.\n...CFC...\n....c....',
  '.........\nCCC...CCC\n...CFC...\n....c....',
  '.........\n.........\n...CFC...\n.CC.c.CC.\nC.......C',
  '.........\n.........\nCCC.F.CCC\n...CcC...'
];
anim('_gulls',{w:W,h:68,frames:NFR,fps:FPS},(c)=>{
  [[34,46,0],[60,54,3],[77,15,5]].forEach(([x,y,d],i)=>{
    const phase=c.phase+i*.17;
    const dx=Math.round(3*s(phase)+s(phase*4)),dy=Math.round(2*s(phase*2));
    const beat=[0,1,2,1,0,3,1,1][Math.floor((c.frame+d)/2)%8];
    c.grid(x+dx,y+dy,gulls[beat]);
  });
});

// A clock gives the scene its 64-frame loop without making the environment an anim.
anim('_clock',{w:1,h:1,frames:NFR,fps:FPS},()=>{});

scene('the_last_watch',{w:W,h:H,bg:'n',world:{light:{at:[110,28]}}},
  layer('storm sky', {unlit:true},stamp('_sky',0,0),stamp('_clock',0,0)),
  layer('swells',{unlit:true},(c)=>{
    const rows=[ [73,2,33,'e','t'],[80,3,43,'e','t'],[89,4,54,'t','T'],[102,5,65,'e','T'],[116,5,78,'t','f'] ];
    for(let j=0;j<rows.length;j++){
      const [cy,amp,len,body,edge]=rows[j];
      const wave=(x)=>Math.round(cy+amp*s(x/len+c.phase*(j%2?2:1)+j*.21)+1.2*s(x/(len*.63)-c.phase*2+j));
      const pts=[];for(let x=-2;x<=162;x+=2)pts.push(x,wave(x));
      c.poly([...pts,162,cy+10,-2,cy+10],body);
      for(let x=0;x<160;x++){
        const y=wave(x),u=mod(x+j*13+Math.floor(c.phase*len*(j%2?2:1)),len);
        if(u>4&&u<len*.63)c.px(x,y,edge);
        if(j>1&&u>12&&u<len*.4)c.px(x,y+1,j===4?'T':'t');
      }
      // Short foam veins follow each swell, with quiet dark water between them.
      for(let i=0;i<5;i++){
        const x=mod(i*39-j*7-Math.floor(c.phase*184),184)-12;
        const y=wave(x)+4;
        c.hline(x,y,7+j,'d');c.hline(x+2,y+2,4+j,'e');
      }
    }
  }),
  layer('distant rain',{unlit:true},(c)=>{
    for(let i=0;i<78;i++){
      const x=mod(Math.floor(hash(i)*192)-c.frame*3,192)-16;
      const y=mod(Math.floor(hash(i+200)*128)+c.frame*4,128)-5;
      if(y<71)c.line(x,y,x-3,y+4,'N');
    }
  }),
  layer('beam halo',{unlit:true,light:{n:'N',N:'c',c:'C',k:'n',d:'e',e:'t',t:'T'}},(c)=>{
    const z=beamAt(c.phase);
    c.poly([110,27,110+z.dx,28+z.dy-z.half-5,110+z.dx,28+z.dy+z.half+5,110,29],'w');
  }),
  layer('projected lamplight',{unlit:true,light:{n:'q',N:'q',c:'Q',C:'j',d:'q',e:'Q',t:'Q',T:'j'}},(c)=>{
    const z=beamAt(c.phase);
    const fade=.77;
    c.poly([110,27,110+z.dx*fade,28+(z.dy-z.half)*fade,110+z.dx*fade,28+(z.dy+z.half)*fade,110,29],'w');
  }),
  layer('birds',{unlit:true},stamp('_gulls',0,0)),
  layer('headland',stamp('_headland',0,0)),
  layer('salt grass',(c)=>{
    [[94,85,4],[125,80,3],[139,80,4],[153,78,3],[156,79,5]].forEach(([x,y,h],i)=>{
      const bend=2+Math.round(s(c.phase*8+i)*.6);
      c.line(x,y,x-bend,y-h,'G');
      c.line(x+1,y,x+1-bend,y-h+1,'g');
    });
  }),
  layer('beacon',stamp('_tower',0,0)),
  layer('lens turning toward us',{unlit:true},(c)=>{
    const front=beamAt(c.phase).front;
    if(front>.7){c.hline(108,27,6,'w');c.hline(109,30,4,'W');}
    if(front>.94){c.px(108,26,'w');c.px(113,28,'w');}
  }),
  layer('lantern spill',{unlit:true,light:{a:'o',A:'o',b:'y',h:'G',H:'I',g:'G'}},ellipse(131,40,8,6,'w')),
  layer('keeper',stamp('_keeper',126,44)),
  layer('gallery front',
    hline(94,38,7,'b'),hline(121,38,17,'y'),
    vline(121,38,6,'A'),vline(128,39,5,'o'),vline(136,38,6,'A'),
    hline(121,42,17,'b'),hline(122,43,14,'H')
  ),
  layer('surf and flying spray',{unlit:true},(c)=>{
    // The foreground breaker curls over a dark hollow before collapsing.
    const surge=Math.round(2*s(c.phase*2)),rise=Math.round(2*s(c.phase*2+.16));
    c.poly([0,110,8,110,20,113,30,114,40,111,48,106,53,101+rise,59,98+rise,65,99+rise,70,103+rise,69,108+rise,64,110+rise,59,108+rise,62,106+rise,64,106+rise,64,103+rise,60,102+rise,56,105+rise,53,113,46,119,0,120].map((v,i)=>i%2===0?v+surge:v),'e');
    c.poly([0,110,10,110,22,113,31,113,40,109,48,103+rise,54,98+rise,60,96+rise,66,98+rise,70,102+rise,69,106+rise,66,108+rise,63,108+rise,66,104+rise,65,102+rise,61,100+rise,57,102+rise,51,109+rise,44,115,34,118,18,116,0,113].map((v,i)=>i%2===0?v+surge:v),'T');
    c.line(35+surge,112,48+surge,103+rise,'f');
    c.line(49+surge,102+rise,55+surge,98+rise,'f');
    c.hline(56+surge,97+rise,6,'F');c.line(62+surge,98+rise,66+surge,100+rise,'f');
    c.line(24+surge,115,32+surge,115,'t');
    c.line(40+surge,114,48+surge,108+rise,'t');
    // Two staggered impacts. Water gathers, punches upward, then fans west and falls.
    [[82,105,0,1],[137,111,19,.65],[67,118,35,.55]].forEach(([cx,cy,off,scale])=>{
      const u=mod(c.frame+off,32)/32;
      const hit=Math.max(0,Math.sin(Math.PI*Math.min(1,u*1.4)));
      const spread=Math.round(12+hit*10*scale);
      c.ellipse(cx-5,cy+2,spread,3+Math.round(hit*2),'t');
      for(let i=0;i<6;i++){
        const xx=cx-spread+i*6+Math.round(2*s(c.phase*4+i));
        c.hline(xx,cy+1+(i%3),3+(i%2)*2,i%2?'f':'T');
      }
      if(u<.64){
        const rise=Math.sin(u/.64*Math.PI),top=cy-Math.round(rise*22*scale);
        const lean=Math.round(u*17*scale);
        c.poly([cx-7,cy,cx-6,cy-5,cx-9-lean,top+6,cx-8-lean,top+2,cx-4-lean,top,cx-2-lean,top+2,cx-3-lean,top+6,cx+3,cy],'T');
        c.line(cx-4,cy-2,cx-7-lean,top+5,'f');
        c.line(cx-7-lean,top+4,cx-5-lean,top,'F');
        c.hline(cx-10-lean,top+2,3,'f');
      }
      for(let i=0;i<11;i++){
        const age=mod(u+i*.037,1);
        if(age<.12||age>.74)continue;
        const t=(age-.12)/.62;
        const x=Math.round(cx-3-(9+i*1.7)*t*scale);
        const y=Math.round(cy-(26+i*.5)*4*t*(1-t)*scale+(i%3)*2);
        c.px(x,y,i%4===0?'F':'f');
        if(i%3===0)c.px(x+1,y-1,'T');
      }
    });
    // Broken foam recedes from the isolated foreground slab.
    for(let j=0;j<4;j++){
      const x=46+j*7+Math.round(2*s(c.phase*4+j));
      c.hline(x,118+(j%2),4,j%2?'f':'T');
    }
  }),
  layer('wind-driven rain',{unlit:true},(c)=>{
    for(let i=0;i<96;i++){
      const x=mod(Math.floor(hash(i+400)*192)-c.frame*6,192)-16;
      const y=mod(Math.floor(hash(i+600)*128)+c.frame*8,128)-4;
      // Preserve the tiny face, lens core and lantern as clear focal clusters.
      if((x>99&&x<122&&y>21&&y<37)||(x>122&&x<139&&y>27&&y<45))continue;
      const lit=inBeam(x,y,c.phase),length=i%3===0?6:3;
      c.line(x,y,x-Math.round(length*.75),y+length,lit?(i%3===0?'j':'Q'):(i%4===0?'c':'N'));
      if(lit&&i%5===0)c.px(x-1,y+2,'I');
    }
  })
);
