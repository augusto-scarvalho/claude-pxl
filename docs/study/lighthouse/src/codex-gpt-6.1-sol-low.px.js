// The Last Watch — original 160 × 120 pixel art. 48 frames / 12 fps.
// Primary light: the Fresnel lamp at (113, 27); secondary: keeper's lantern (99, 43).
pal({k:'#090f1d',n:'#101a2d',s:'#19283c',c:'#23394c',d:'#304e60',e:'#42677a',f:'#6b919d',g:'#a1bcc0',w:'#d3ddd0',b:'#172f43',t:'#23495b',u:'#326375',v:'#538a96',r:'#242b37',R:'#394451',S:'#505d66',m:'#67777b',a:'#8e8570',A:'#b9ad85',y:'#d1a447',Y:'#edc763',L:'#fff0b0',o:'#896039',h:'#493b36',B:'#504837',C:'#77705b'});
const TAU=Math.PI*2, mod=(n,m)=>(n%m+m)%m;
anim('_time',{w:1,h:1,frames:48,fps:12},()=>{});
sprite('_keeper',{w:13,h:15}, `
......yy.....
.....yYYy....
.....yYh.....
......oy.....
.....yYyy....
....yYYy.y...
....yYoy..a..
....yYoy.....
....yYoy.....
...yyYoy.....
....oooy.....
.....kk......
.....k.k.....
....kk.kk....
.............`);
scene('the_last_watch',{w:160,h:120,bg:'n',world:{light:{at:[113,27]}}},
 stamp('_time',0,0),
 layer('storm ceiling',{unlit:true},c=>{
  c.rect(0,44,160,27,'s');c.rect(0,58,160,15,'c');
  const banks=[[0,10,42],[28,3,55],[71,9,53],[116,1,44]];
  for(const [x,y,w] of banks){c.poly([x-15,y+4,x+4,y,x+w-9,y+2,x+w,y+8,x+w+14,y+11,x+w+5,y+15,x-20,y+15],'s');c.line(x-9,y+15,x+w-1,y+15,'c');}
  c.poly([0,34,19,32,30,35,53,34,65,38,86,39,94,43,0,43],'s');
  c.line(4,55,39,55,'d');c.line(49,59,77,59,'d');c.line(125,53,159,53,'d');
 }),
 layer('sea',c=>{
  c.rect(0,68,160,52,'b');c.rect(0,88,160,32,'t');c.rect(0,106,160,14,'b');
  for(let j=0;j<13;j++){
   const y=70+j*4; const off=Math.round(3*Math.sin(c.phase*TAU*2+j));
   for(let q=0;q<4;q++){const x=mod(q*46+j*19+off,181)-13;
    c.line(x,y,x+9+j%5,y-1,j%3===0?'e':'u');c.line(x+3,y+1,x+18,y+1,'b');}
  }
 }),
 layer('Fresnel sweep',{unlit:true},c=>{
  const co=Math.cos(c.phase*TAU), breadth=5+19*(1-Math.abs(co));
  const edge=co>=0?160:0, dist=Math.abs(edge-113);
  const wide=breadth*dist/113;
  c.poly([113,26,edge,27-wide,edge,29+wide,113,29],Math.abs(co)<.22?'c':'B');
  c.poly([113,27,edge,27-wide*.54,edge,28+wide*.54,113,28],Math.abs(co)<.22?'d':'C');
  if(Math.abs(co)>.55)c.line(113,27,edge,27,'a');
 }),
 layer('headland',c=>{
  c.poly([160,67,148,65,135,70,123,69,116,73,99,74,91,79,94,85,81,88,76,95,63,98,57,108,42,114,40,120,160,120],'k');
  c.poly([160,69,148,68,133,73,120,72,113,77,98,77,95,82,104,86,91,91,92,99,79,105,78,119,160,119],'r');
  c.poly([96,80,112,77,130,78,119,85,106,88,104,96,93,98,96,89,86,88],'S');
  c.poly([160,74,139,76,134,87,122,92,120,108,109,119,139,119,147,98,160,94],'R');
  c.poly([120,78,128,77,121,87,110,92,108,103,100,108,104,93,113,86],'r');
  c.poly([72,101,86,96,88,100,81,105,80,112,66,115,57,114,61,108],'R');
  c.line(96,79,113,76,'m');c.line(121,74,133,75,'m');c.line(145,70,159,71,'S');
  c.line(67,105,79,101,'S');c.line(132,91,139,82,'S');c.line(145,101,149,91,'k');
  c.poly([94,76,104,72,124,71,135,73,126,77,109,78],'C');
 }),
 layer('tower',c=>{
  c.poly([107,41,120,41,125,75,103,75],'r');
  c.poly([107,41,114,41,116,74,104,74],'m');
  c.poly([114,41,119,41,123,74,116,74],'S');
  c.poly([106,49,120,49,121,55,105,55],'h');c.poly([106,49,114,49,115,55,105,55],'o');
  c.rect(109,58,4,7,'r');c.rect(110,59,1,4,'a');c.rect(111,69,5,7,'k');c.line(112,70,112,74,'R');
  c.line(107,44,108,48,'A');c.line(106,57,105,66,'a');
  c.rect(102,37,23,3,'k');c.rect(103,37,21,1,'m');
  c.rect(105,23,17,13,'r');c.rect(107,24,13,10,'o');c.rect(108,25,11,7,'y');
  c.rect(110,25,7,6,'Y');c.rect(111,26,5,3,'L');
  c.line(106,24,106,34,'S');c.line(113,23,113,25,'r');c.line(120,24,120,34,'S');c.rect(104,34,19,2,'k');
  c.poly([102,23,105,20,110,18,116,18,121,20,124,23],'r');c.line(105,21,117,19,'S');c.line(113,14,113,17,'S');c.px(113,13,'m');
  c.line(90,43,126,43,'k');c.line(91,42,125,42,'m');c.line(90,38,105,38,'S');for(let x=90;x<105;x+=5)c.line(x,38,x,43,'r');c.line(100,35,126,35,'m');for(let x=105;x<=126;x+=5)c.line(x,35,x,40,'r');c.line(103,40,126,40,'k');
 }),
 layer('keeper and lantern',c=>{
  const flap=Math.round(Math.sin(c.phase*TAU*6));
  c.poly([97,42,94,48,90-flap,49,94,44,95,40],'o');c.poly([97,42,94,46,90-flap,47,95,41],'y');
  c.stamp('_keeper',91,29);
  c.line(101,36,101,39,'a');c.line(100,39,102,39,'o');c.rect(100,40,3,4,'o');c.rect(101,40,1,3,'L');c.line(100,44,102,44,'h');
 }),
 layer('breakers and airborne spray',{unlit:true},c=>{
  for(let j=0;j<3;j++){
   let p=mod(c.frame+j*16,48)/48;let x=61+j*16,y=111-j*8;
   const reach=Math.round(10+15*Math.sin(p*Math.PI));
   c.poly([x-20,y+5,x-12,y+2,x-4,y+3,x+4,y-1,x+8,y+1,x+4,y+5,x-9,y+7],'u');
   c.line(x-16,y+3,x-7,y+2,'f');c.line(x-6,y+2,x+3,y-1,'g');
   if(p<.65){
    for(let q=0;q<9;q++){
     const t=p/.65,dx=-Math.round(q*1.4+t*12),dy=-Math.round(Math.sin(t*Math.PI)*(reach-q*.65));
     c.px(x+dx,y+dy,q%3?'f':'w');if(q%3===0)c.px(x+dx+1,y+dy,'g');
    }
    c.line(x-3,y-1,x-7,y-4,'v');if(p>.12&&p<.48){c.line(x-4,y-3,x-8,y-6,'g');c.line(x-8,y-6,x-12,y-6,'f');c.px(x-14,y-8,'g');}
   }
  }
  c.line(5,115,23,113,'v');c.line(12,117,33,116,'f');
 }),
 layer('gulls', {unlit:true},c=>{
  [[35,42,0],[59,32,2],[18,49,4]].forEach(([x,y,o])=>{
   const flap=Math.sin(c.phase*TAU*6+o),dx=Math.round(Math.sin(c.phase*TAU+o)*2),dy=Math.round(Math.sin(c.phase*TAU*2+o));
   x+=dx;y+=dy;const wing=flap>.25?-2:flap<-.25?2:0;
   c.line(x-4,y+wing,x-1,y,'f');c.line(x-1,y,x,y+1,'g');c.line(x,y+1,x+3,y+wing,'g');c.px(x+4,y+wing,'d');
  });
 }),
 layer('slanting rain',{unlit:true},c=>{
  const co=Math.cos(c.phase*TAU),edge=co>=0?1:-1;
  for(let i=0;i<120;i++){
   const x=mod(i*47-c.frame*4,192)-16,y=mod(i*31+c.frame*3,144)-12;
   const spread=(5+19*(1-Math.abs(co)))*Math.abs(x-113)/113;
   const lit=(x-113)*edge>0&&Math.abs(y-27)<spread;
   if(x>101&&x<125&&y>20&&y<76)continue;
   c.line(x,y,x-2,y+3,lit?'A':i%4===0?'e':'c');
  }
 })
);
