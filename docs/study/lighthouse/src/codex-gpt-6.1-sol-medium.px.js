// Made for the model study (docs/model-study.md) by the Codex CLI, gpt-6.1-sol at medium effort; its file as it left it.
// The Last Watch — original 160 × 120 pixel art, 48 frames / 12 fps.
// Primary light: the Fresnel lamp at (115, 28). Secondary: keeper's lantern (98, 44).
// No moonlight: cool values describe the storm's dim ambient sky.
pal({k:'#0b1221',n:'#111e30',s:'#1a2b40',c:'#263b50',d:'#344c60',
  o:'#142b3c',u:'#1d3e50',v:'#2d5664',f:'#4d7780',F:'#83a5a1',w:'#c6d3bc',
  r:'#19232f',R:'#2b3640',t:'#414b50',T:'#626a66',
  a:'#7c8276',A:'#b2b29a',i:'#dbd2aa',b:'#52383b',B:'#8a5148',
  y:'#b78332',Y:'#e3b748',L:'#ffe09a',h:'#8c6336',
  e:'#354546',E:'#5a6555',g:'#263c3f',G:'#3c5350',
  q:'#252f37',Q:'#3b4440',z:'#686c58'});
const N=48, TAU=2*Math.PI, mod=(x,n)=>(x%n+n)%n;
const cyc=(f,n=1,p=0)=>Math.sin(TAU*(f/N*n+p));
function beamAt(x,y,frame){
  const a=TAU*frame/N, dx=x-115, dy=y-28, direction=Math.cos(a);
  const len=Math.abs(direction)*235+3;
  if(dx*direction<0 || Math.abs(dx)>len) return 0;
  const half=1.5+Math.abs(dx)*(.08+.23*(1-Math.abs(direction)));
  if(Math.abs(dy)>half) return 0;
  return Math.max(0,1-Math.abs(dx)/270)*(.55+.45*(1-Math.abs(dy)/half));
}
// Long cloud shelves, sculpted around the negative space of the beacon.
sprite('_sky',{w:160,h:70},rect(0,0,160,70,'n'),
  poly([0,7,23,7,31,11,58,11,67,16,96,16,106,20,160,20,160,0,0,0],'k'),
  poly([0,32,17,29,38,30,49,34,76,34,86,38,70,41,34,39,18,36,0,38],'s'),
  poly([25,50,40,47,62,48,73,52,98,52,104,56,70,57,51,54,25,54],'s'),
  poly([127,45,142,41,160,42,160,50,139,49],'s'),
  rect(0,65,160,5,'c'),rect(0,66,160,4,'s'));
anim('_beam',{w:160,h:70,frames:N,fps:12},c=>{
  for(let y=0;y<65;y++)for(let x=0;x<160;x++){
    const p=beamAt(x,y,c.frame);
    if(p>.13)c.px(x,y,p>.85?'z':p>.67?'E':p>.45?'Q':'q');
  }
});
anim('_sea',{w:160,h:55,frames:N,fps:12},c=>{
  c.rect(0,0,160,55,'o');
  // Each swell has its own depth, phase and broken crest. All periods divide 48.
  for(let j=0;j<9;j++){
    const yy=3+j*6;
    for(let x=-10;x<170;x++){
      let phase=TAU*(x/(34+j*3)+c.frame/N*(j%2?2:1)+j*.29);
      let y=yy+Math.round(Math.sin(phase)*(1+j*.18));
      c.line(x,y,x,y+2,j%2?'u':'s');
      if(Math.sin(phase)>.48 && mod(x+j*7,23)<15)c.px(x,y,j>3?'v':'u');
      if(Math.sin(phase)>.90 && mod(x+j*3,19)<9)c.px(x,y,j>5?'f':'v');
    }
  }
  // Broad, curling foreground breaker with an interrupted foam lip.
  for(let x=0;x<96;x++){
    const p=TAU*(x/77-c.frame/N*2), y=38+Math.round(3*Math.sin(p));
    c.line(x,y,x,y+4,'v');
    if(mod(x+Math.round(3*cyc(c.frame,2)),17)<13)c.px(x,y,'F');
    if(mod(x,13)<7)c.px(x-1,y+1,'f');
  }
});
sprite('_headland',{w:160,h:120},
  poly([160,75,145,75,138,72,126,74,120,77,104,77,98,80,90,81,88,86,79,88,76,96,64,99,59,107,44,112,39,120,160,120],'r'),
  poly([160,75,144,75,138,72,126,74,119,77,104,77,98,80,90,81,88,85,101,84,114,80,136,80,151,83,160,82],'G'),
  poly([90,86,104,83,111,85,104,95,95,100,83,101,76,111,65,112,68,101,78,96,80,89],'R'),
  poly([112,84,130,81,136,85,128,98,116,105,107,104,113,94],'t'),
  poly([138,84,157,83,160,87,160,116,147,112,148,101,136,99],'R'),
  poly([115,85,127,83,122,90,113,95],'T'),
  poly([81,91,93,88,89,94,79,97],'t'),
  poly([129,103,139,101,146,107,141,120,115,120],'k'),
  poly([51,113,64,109,71,113,67,120,44,120],'R'),
  line(95,103,102,97,'k'),line(131,89,127,100,'r'),line(151,87,146,96,'t'),
  line(97,81,116,79,'E'),line(132,76,141,75,'E'),
  // Grass bends landward, to the right, in the same wind as the rain.
  line(135,74,139,71,'g'),line(140,74,146,72,'g'),line(148,76,153,74,'g'));
sprite('_tower',{w:38,h:68},
  // Taper, plane changes, gallery shadow and salt-streaked plaster.
  poly([11,21,25,21,30,66,5,66],'r'),
  poly([12,21,24,21,28,65,7,65],'a'),
  poly([12,21,17,21,16,65,7,65],'A'),
  poly([22,21,24,21,28,65,23,65],'t'),
  poly([10,37,26,37,27,46,9,46],'b'),poly([10,37,17,37,17,46,9,46],'B'),
  line(12,25,11,33,'i'),line(9,49,8,57,'A'),line(21,48,22,56,'T'),
  rect(15,52,5,12,'R'),rect(16,54,3,10,'k'),px(18,59,'h'),
  rect(16,28,3,5,'r'),rect(17,29,1,3,'e'),
  rect(4,65,28,2,'R'),line(5,65,26,65,'T'),
  // Gallery cantilever and the lantern room.
  poly([3,20,32,20,29,24,7,24],'r'),rect(4,19,27,2,'T'),
  rect(10,7,17,12,'r'),rect(12,8,13,10,'h'),rect(13,8,11,8,'y'),
  rect(16,8,6,8,'L'),rect(18,8,2,8,'i'),
  line(12,7,12,18,'r'),line(18,7,18,18,'T'),line(25,7,25,18,'r'),
  poly([8,7,13,3,22,3,29,7],'r'),line(11,5,23,5,'t'),
  line(18,0,18,3,'r'),px(18,0,'T'));
anim('_keeper',{w:17,h:16,frames:N,fps:12,facing:'left'},c=>{
  const flap=Math.round(cyc(c.frame,4));
  // Tiny figure, braced legs and a hood pulled low over a profile face.
  c.grid(6,0,'..YY..\n.YLYY.\n.YhY..\n..h...');
  c.poly([7,4,10,4,12,8,15+flap,10,10,10,10,12,6,12,6,7],'y');
  c.line(7,4,7,9,'Y');c.line(9,6,10,9,'h');
  c.line(7,12,6,14,'k');c.line(10,12,11,14,'k');
  c.line(5,14,7,14,'r');c.line(10,14,12,14,'r');
  c.line(7,5,4,7,'Y');c.px(3,7,'h');
  const dx=cyc(c.frame,2)>.3?1:0;
  c.line(3,8,2+dx,9,'h');c.rect(1+dx,9,3,4,'r');c.rect(2+dx,10,1,2,'L');
});
anim('_spray',{w:160,h:120,frames:N,fps:12},c=>{
  // Impact blooms into an airborne fan, then falls, with staggered collisions.
  for(const [ox,oy,off] of [[76,101,0],[96,92,19],[54,115,32]]){
    const age=mod(c.frame+off,24)/24;
    if(age<.78){
      if(age<.48){
        const lift=Math.round(9*Math.sin(age/.48*Math.PI));
        c.poly([ox-6,oy,ox-4,oy-3,ox-5,oy-lift,ox-2,oy-lift-2,
          ox,oy-5,ox+3,oy-3,ox+7,oy,ox+4,oy+2],'f');
        c.line(ox-5,oy-lift,ox-2,oy-lift-2,'w');
        c.line(ox-3,oy-3,ox+1,oy-1,'F');
      }
      for(let j=0;j<12;j++){
        const vx=-15+j*2.5, vy=-22-(j%4)*4;
        const x=Math.round(ox+vx*age+14*age*age),y=Math.round(oy+vy*age+34*age*age);
        if(y<=oy){c.px(x,y,age<.35?'w':'F');if(j%3===0)c.px(x+1,y+1,'f');}
      }
      const spread=Math.round(age*14);
      c.line(ox-spread,oy,ox+spread,oy+1,'f');
      if(age<.3)c.line(ox-4,oy-1,ox+3,oy-2,'w');
    }
  }
});
anim('_weather',{w:160,h:120,frames:N,fps:12},c=>{
  // Toroidal paths travel integer screen periods: no random redraw, no loop jump.
  for(let j=0;j<108;j++){
    const x=mod(j*47+Math.floor(c.frame*174/48),174)-7;
    const y=mod(j*31+Math.floor(c.frame*132/24),132)-6;
    const lit=beamAt(x,y,c.frame)>.22;
    c.line(x,y,x+2,y+4,lit?'A':(j%4===0?'d':'c'));
  }
  // Gulls hold their ground, losing a pixel to each gust, wings on distinct beats.
  for(const [x,y,off] of [[35,39,0],[57,27,9],[23,48,19]]){
    let bx=x+Math.round(cyc(c.frame,2,off/N)*2),by=y+Math.round(cyc(c.frame,1,off/N));
    let wing=Math.round(cyc(c.frame,6,off/N)*2);
    let col=beamAt(bx,by,c.frame)>.2?'i':'f';
    c.line(bx-4,by-wing,bx-1,by,col);c.px(bx,by+1,col);c.line(bx+1,by,bx+4,by-wing+1,col);
  }
});
scene('the_last_watch',{w:160,h:120,bg:'k',world:{light:{at:[115,28]}}},
  layer('storm-shelves',{unlit:true},stamp('_sky',0,0)),
  layer('Fresnel-beam',{unlit:true},stamp('_beam',0,0)),
  layer('Atlantic',{unlit:true},stamp('_sea',0,65)),
  layer('basalt',stamp('_headland',0,0)),
  layer('lighthouse',stamp('_tower',97,19)),
  layer('keeper',stamp('_keeper',94,31)),
  layer('gallery',rect(99,43,30,1,'r'),rect(99,38,30,1,'t'),
    ...[99,104,111,120,128].map(x=>line(x,38,x,43,'r')),
    line(101,44,126,44,'T')),
  layer('spindrift',{unlit:true},stamp('_spray',0,0)),
  layer('rain-and-gulls',{unlit:true},stamp('_weather',0,0)),
  // Hot core, after the rain: the beam visibly originates inside the room.
  layer('lamp',{unlit:true},rect(113,28,4,5,'L'),rect(114,29,2,3,'i'),px(115,30,'w')));
