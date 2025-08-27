(()=>{
const startBtn=document.getElementById('startBtn');
const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height,DPR=Math.max(1,Math.min(2,Math.floor(devicePixelRatio||1))); canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);
const bgmMain=document.getElementById('bgmMain'), bgmBoss=document.getElementById('bgmBoss');
const bossbar=document.getElementById('bossbar'), bossfill=document.getElementById('bossfill'), bosslabel=document.getElementById('bosslabel');

// --- Sprite loader with validation ---
function loadAtlas(src, fw, fh){ 
  return new Promise(res=>{ const img=new Image(); img.onload=()=>{
      const ok = (img.width % fw===0) && (img.height===fh);
      res({img,fw,fh,frames: ok? (img.width/fw) : 0, ok});
    }; img.onerror=()=>res({img:null,fw,fh,frames:0,ok:false}); img.src='assets/'+src; });
}
const atlases={}; const atlasDefs=[
  ['hero','lumberjack_sprites.png',64,64],
  ['min','tornado_minion.png',64,64],
  ['zig','tornado_zig.png',64,64],
  ['titan','storm_titan.png',128,128],
  ['hurr','hurricane_lord.png',192,192],
];
let loaded=false;
Promise.all(atlasDefs.map(a=>loadAtlas(a[1],a[2],a[3]).then(d=>atlases[a[0]]=d))).then(()=>loaded=true);

// --- Input
const keys={}; addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); if(e.key.toLowerCase()==='p') st.paused=!st.paused;});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

// --- SFX (already separate files from prior build)
const SFX={}; ['chainsaw_idle','chainsaw_swing','axe_throw','axe_hit','tornado_whoosh','despawn_puff','titan_charge','bolt_fire','aoe_burst','boss_eye_open','mini_spawn','boss_crit','boss_bar_slam','enrage_loop'].forEach(n=>{const a=new Audio('assets/'+n+'.wav');a.preload='auto';SFX[n]=a;});
function play(n,vol=1){ try{const a=SFX[n].cloneNode(); a.volume=vol; a.play();}catch(_){} }

// --- Background
const bg={t:0,clouds:[],leaves:[]}; for(let i=0;i<8;i++) bg.clouds.push({x:Math.random()*W,y:30+Math.random()*140,s:60+Math.random()*120,v:0.1+Math.random()*0.2});
function drawBG(dt){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#162033'); g.addColorStop(1,'#0b1119'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#26354a'; bg.clouds.forEach(c=>{ctx.beginPath();ctx.ellipse(c.x,c.y,c.s,c.s*0.35,0,0,Math.PI*2);ctx.fill(); c.x-=c.v*dt/16; if(c.x<-c.s)c.x=W+c.s;});
  function tree(x,base,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x-18,base-h*0.6);ctx.lineTo(x+18,base-h*0.6);ctx.closePath();ctx.fill();ctx.fillRect(x-4,base-h*0.6,8,h*0.6);}
  const baseY=H-72;
  for(let i=0;i<16;i++){const x=((i*80-(bg.t*0.1))%(W+100))-50; tree(x,baseY,90+(i%3)*10,'#111a22');}
  for(let i=0;i<14;i++){const x=((i*90-(bg.t*0.3))%(W+140))-70; const cs=['#c2562e','#d9a43a','#9e2f2f']; tree(x,baseY,110+((i*31)%40),cs[i%3]);}
  ctx.fillStyle='#1a1410'; ctx.fillRect(0,baseY,W,72);
  for(let i=0;i<18;i++){const x=((i*60-(bg.t*0.6))%(W+60))-30; ctx.fillStyle='#3a5a3a'; ctx.fillRect(x,baseY-6,14,6);}
  for(let i=0;i<8;i++){const x=((i*120-(bg.t*0.8))%(W+120))-60; ctx.fillStyle='#6b5a4a'; ctx.fillRect(x,baseY-10,20,10);}
  if(Math.random()<0.3) bg.leaves.push({x:W+10,y:80+Math.random()*(H-140),vx:-(1+Math.random()*2),vy:(-0.2+Math.random()*0.4),life:400});
  for(let i=bg.leaves.length-1;i>=0;i--){const L=bg.leaves[i]; ctx.fillStyle=['#f39a2e','#e6c04a','#c34b3b'][i%3]; ctx.fillRect(L.x,L.y,3,3); L.x+=L.vx; L.y+=L.vy; if((L.life-=dt)<=0||L.x<-10) bg.leaves.splice(i,1);}
  bg.t+=dt;
}

// --- Fallback vector renderers (arcade-style)
function drawHeroVec(p){
  ctx.save(); ctx.translate(p.x + (p.face<0? 64:0), p.y); ctx.scale(p.face<0?-1:1,1);
  // boots
  ctx.fillStyle='#5b3b2a'; ctx.fillRect(10,48,12,8); ctx.fillRect(26,48,12,8);
  // jeans
  ctx.fillStyle='#2b4f77'; ctx.fillRect(12,30,28,18); ctx.strokeStyle='#1a2f49'; ctx.strokeRect(12,30,28,18);
  // flannel
  ctx.fillStyle='#b92a2a'; ctx.fillRect(8,14,36,18); ctx.strokeStyle='#3a0f0f'; ctx.strokeRect(8,14,36,18);
  ctx.globalAlpha=0.35; ctx.strokeStyle='#ffd0d0'; [18,22,26].forEach(y=>{ctx.beginPath(); ctx.moveTo(8,y); ctx.lineTo(44,y); ctx.stroke();}); ctx.strokeStyle='#6d0f0f'; [12,18,24,30,36,42].forEach(x=>{ctx.beginPath(); ctx.moveTo(x,14); ctx.lineTo(x,32); ctx.stroke();}); ctx.globalAlpha=1;
  // head + beard
  ctx.fillStyle='#f1c8a8'; ctx.beginPath(); ctx.arc(24,10,7,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#7a4a2a'; ctx.beginPath(); ctx.ellipse(24,12,8,6,0,0,Math.PI*2); ctx.fill();
  // chainsaw
  ctx.fillStyle='#c24b3b'; ctx.fillRect(40,28,10,6); ctx.fillStyle='#cfd5db'; ctx.fillRect(38,30,22,6); ctx.fillStyle='#bfc7cf'; ctx.fillRect(58,30,6,6);
  ctx.restore();
}
function drawTornadoVec(e){
  ctx.save(); ctx.translate(e.x+e.w/2,e.y+e.h/2); ctx.rotate((e.f||0)); ctx.translate(-e.w/2,-e.h/2);
  ctx.strokeStyle='#9ec7ff'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(6,8); ctx.bezierCurveTo(18,4,36,4,50,8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10,24); ctx.bezierCurveTo(26,22,34,24,30,28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16,40); ctx.bezierCurveTo(30,38,36,40,32,46); ctx.stroke();
  ctx.restore();
}
function drawTitanVec(e){
  ctx.save(); ctx.translate(e.x,e.y);
  ctx.fillStyle='#9fb4cc'; ctx.strokeStyle='#1b2b44'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.ellipse(e.w/2,e.h*0.35,e.w*0.45,e.h*0.25,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(e.w/2,e.h*0.60,e.w*0.5,e.h*0.22,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle= e.tele>0 ? '#ffd84a' : '#0c1b2b';
  ctx.beginPath(); ctx.ellipse(e.w*0.35,e.h*0.40,7,6,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(e.w*0.65,e.h*0.38,7,6,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawHurricaneVec(e){
  ctx.save(); ctx.translate(e.x+e.w/2,e.y+e.h/2); ctx.rotate(e.f||0);
  const r=Math.min(e.w,e.h)/2;
  const grd=ctx.createRadialGradient(0,0,0,0,0,r); grd.addColorStop(0,'#4a678a'); grd.addColorStop(0.6,'#2f425a'); grd.addColorStop(1,'#1a2432'); ctx.fillStyle=grd;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#9eb4cf'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(-10,-r*0.7); ctx.bezierCurveTo(r*0.3,-r*0.5,r*0.7,-r*0.2,r*0.7,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10,r*0.6); ctx.bezierCurveTo(-r*0.2,r*0.4,-r*0.6,0,-r*0.7,-0.1); ctx.stroke();
  ctx.fillStyle= e.tele>0 ? '#ff3a3a' : '#ff1a1a'; ctx.beginPath(); ctx.arc(0,0,r*0.14+(e.tele>0?2:0),0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// --- Utility: draw atlas frame or fallback vec
function drawAtlasOrVec(kind, frame, x,y,flip=false, e){
  const a=atlases[kind];
  if(loaded && a && a.ok && a.frames>0){
    const sx = Math.floor(frame)%a.frames * a.fw;
    ctx.save(); ctx.translate(x,y);
    if(flip){ ctx.translate(a.fw,0); ctx.scale(-1,1); }
    ctx.drawImage(a.img, sx, 0, a.fw, a.fh, 0,0, a.fw, a.fh);
    ctx.restore();
  } else {
    // fallback vector
    if(kind==='hero') drawHeroVec(st.p);
    else if(kind==='min' || kind==='zig') drawTornadoVec(e);
    else if(kind==='titan') drawTitanVec(e);
    else if(kind==='hurr') drawHurricaneVec(e);
  }
}

// --- State
const st={paused:false,over:false,t:0,score:0,wave:1,
  p:{x:120,y:H-136,w:64,h:64,vx:0,vy:0,spd:3.6,hp:100,max:100,face:1,cool:0,state:'idle',anim:0},
  enemies:[], projectiles:[], bolts:[], aoe:[], nextSpawn:0, spawnRate:1200, boss:false, bossEntity:null
};

function melee(){ const p=st.p; if(p.cool>0||p.state==='melee') return; p.state='melee'; p.anim=0; p.cool=280; play('chainsaw_swing',0.9); }
function throwAxe(){ const p=st.p; if(p.state==='throw') return; p.state='throw'; p.anim=0; st.projectiles.push({x:p.x+p.w/2,y:p.y+p.h/2,vx:(p.face>0?7:-7),vy:-0.2,w:22,h:18,rot:0,dmg:40}); play('axe_throw',0.8); }
addEventListener('keydown',e=>{ if(e.key===' ') melee(); if(e.key.toLowerCase()==='e') throwAxe(); });

function spawnMini(){ const e={type:'mini', x:W-140,y:110,w:128,h:128,hp:420,max:420,touch:20,atk:0,tele:0}; st.enemies.push(e); }
function spawnBoss(){ const e={type:'hurricane', x:W-220,y:40,w:192,h:192,hp:900,max:900,touch:28,atk:0,tele:0,f:0}; st.enemies.push(e); }

function update(dt){
  if(st.paused||st.over) return; st.t+=dt;
  // movement
  const l=keys['arrowleft']||keys['a'], r=keys['arrowright']||keys['d'], u=keys['arrowup']||keys['w'], dn=keys['arrowdown']||keys['s'];
  const vx=(r?1:0)-(l?1:0), vy=(dn?1:0)-(u?1:0);
  st.p.x+=vx*st.p.spd*dt/16; st.p.y+=vy*st.p.spd*dt/16; if(vx!==0) st.p.face=vx>0?1:-1;
  st.p.x=Math.max(16,Math.min(W-16-st.p.w,st.p.x)); st.p.y=Math.max(80,Math.min(H-80-st.p.h,st.p.y));
  st.p.cool=Math.max(0,st.p.cool-dt); st.p.anim+=dt;
  if(st.p.state!=='melee' && st.p.state!=='throw') st.p.state=(vx||vy)?'run':'idle';
  if(st.p.state==='melee' && st.p.anim>260) st.p.state='idle';
  if(st.p.state==='throw' && st.p.anim>270) st.p.state='idle';

  // spawns
  if(st.t>st.nextSpawn){ st.nextSpawn=st.t + Math.max(300, st.spawnRate - st.wave*40) + Math.random()*400;
    const t = Math.random()<0.6 ? 'tornado' : 'zig'; const y = 160+Math.random()*(H-260);
    st.enemies.push({type:t, x:W+30, y, w:64, h:64, vx: t==='tornado' ? -2.2 : -2.5, vy:(t==='zig'?(Math.random()<0.5?-1:1)*1.2:0), hp: 36, touch:12, f:0});
    play('tornado_whoosh',0.4);
  }
  if(Math.floor(st.t/10000)+1 > st.wave){ st.wave++; if(st.wave%3===0 && st.wave<10) spawnMini(); if(st.wave===10 && !st.boss) spawnBoss(); }

  // enemies
  for(let i=st.enemies.length-1;i>=0;i--){
    const e=st.enemies[i];
    if(e.type==='tornado'||e.type==='zig'){ e.x+= (e.vx||-2.2)*dt/16; if(e.type==='zig'){ e.y+=(e.vy||1.2)*dt/16; if(e.y<80||e.y>H-120) e.vy=-e.vy; } e.f=(e.f||0)+dt*0.02; }
    else if(e.type==='mini'){
      if(!st.boss){ st.boss=true; st.bossEntity=e; bossbar.style.display='block'; bosslabel.textContent='Elemental Storm Titan'; play('boss_bar_slam',0.6); }
      e.x += (-1.0)*dt/16; e.atk=(e.atk||0)+dt;
      const cadence = (e.hp/e.max<0.25)? 1800: 2600;
      if(e.atk>cadence && e.tele<=0){ e.tele=600; e.atk=0; play('titan_charge',0.7); }
      if(e.tele>0){ e.tele-=dt; if(e.tele<=0){
        const shots = (e.hp/e.max<0.25)?3:2;
        for(let k=0;k<shots;k++){ const ang=(-0.2+k*0.2)+(Math.random()*0.2-0.1);
          st.bolts.push({x:e.x+e.w*0.5,y:e.y+e.h*0.55,vx:6*Math.cos(ang),vy:6*Math.sin(ang),life:2200,r:6});
          play('bolt_fire',0.7);
        }
      }}
    } else if(e.type==='hurricane'){
      if(!st.boss){ st.boss=true; st.bossEntity=e; bossbar.style.display='block'; bosslabel.textContent='Hurricane Lord'; bgmMain.pause(); bgmBoss.currentTime=0; bgmBoss.volume=0.8; bgmBoss.play().catch(()=>{}); play('boss_eye_open',0.6); }
      e.x += (-0.8)*dt/16; e.f=(e.f||0)+dt*0.02; e.atk=(e.atk||0)+dt;
      const cadence = (e.hp/e.max<0.25)? 3000: 4200;
      if(e.atk>cadence && e.tele<=0){ e.tele=700; e.atk=0; play('boss_eye_open',0.7); }
      if(e.tele>0){ e.tele-=dt; if(e.tele<=0){
        const count=(e.hp/e.max<0.25)?3:2;
        for(let k=0;k<count;k++){
          const vy=(k%2===0?-1:1)*(1.0+Math.random()*0.8);
          st.enemies.push({type:'tornado', x:e.x+e.w/2, y:e.y+e.h/2, w:64, h:64, vx:-(3+Math.random()*1.5), vy, hp:36, touch:12, f:0});
          play('mini_spawn',0.6);
        }
      }}
    }
    // player collision
    const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
    if(!(pb.x+pb.w<e.x||pb.x>e.x+e.w||pb.y+pb.h<e.y||pb.y>e.y+e.h)){ st.p.hp -= e.touch||12; }

    // death / despawn
    if(e.hp!==undefined && e.hp<=0){ st.enemies.splice(i,1); play('despawn_puff',0.5);
      if(e.type==='mini'||e.type==='hurricane'){ st.boss=false; st.bossEntity=null; bossbar.style.display='none'; bgmBoss.pause(); try{bgmMain.play();}catch(_){} }
    } else if(e.x<-240){ st.enemies.splice(i,1); }
  }

  // bolts
  for(let i=st.bolts.length-1;i>=0;i--){
    const b=st.bolts[i]; b.x+=b.vx; b.y+=b.vy; b.life-=dt;
    if(b.x<0||b.x>W||b.y<60||b.y>H-60||b.life<=0){ st.aoe.push({x:b.x,y:b.y,r:36,life:350}); st.bolts.splice(i,1); play('aoe_burst',0.6); continue; }
    const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
    if(!(pb.x+pb.w<b.x-b.r||pb.x>b.x+b.r||pb.y+pb.h<b.y-b.r||pb.y>b.y+b.r)){ st.p.hp-=18; st.aoe.push({x:b.x,y:b.y,r:36,life:350}); st.bolts.splice(i,1); play('aoe_burst',0.7); }
  }
  for(let i=st.aoe.length-1;i>=0;i--){ const a=st.aoe[i]; a.life-=dt; if(a.life<=0) st.aoe.splice(i,1); }

  // axes
  for(let i=st.projectiles.length-1;i>=0;i--){
    const a=st.projectiles[i]; a.x+=a.vx*dt/16; a.y+=a.vy*dt/16; a.vy+=0.02;
    for(let j=st.enemies.length-1;j>=0;j--){ const e=st.enemies[j];
      if(!(a.x+a.w<e.x||a.x>e.x+e.w||a.y+a.h<e.y||a.y>e.y+e.h)){
        let dmg=a.dmg||40;
        if(e.type==='mini'){
          const eye={x:e.x+e.w*0.35-8,y:e.y+e.h*0.35-8,w:16,h:16};
          if(e.tele>0 && !(a.x+a.w<eye.x||a.x>eye.x+eye.w||a.y+a.h<eye.y||a.y>eye.y+eye.h)){ dmg*=1.8; play('boss_crit'); } else dmg*=0.3;
        } else if(e.type==='hurricane'){
          const eye={x:e.x+e.w/2-18,y:e.y+e.h/2-18,w:36,h:36};
          if(e.tele>0 && !(a.x+a.w<eye.x||a.x>eye.x+eye.w||a.y+a.h<eye.y||a.y>eye.y+eye.h)){ dmg*=2.0; play('boss_crit'); } else dmg*=0.2;
        }
        e.hp-=dmg; st.projectiles.splice(i,1); play('axe_hit',0.7); break;
      }
    }
    if(a.x<-40||a.x>W+40||a.y>H+40) st.projectiles.splice(i,1);
  }

  // boss bar
  if(st.boss && st.bossEntity){ const e=st.bossEntity; bossbar.style.display='block'; bosslabel.textContent = e.type==='mini'?'Elemental Storm Titan':'Hurricane Lord'; const pct=Math.max(0,e.hp/e.max); bossfill.style.width=(pct*100)+'%'; bossfill.style.filter=(pct<0.25 && Math.floor(st.t/120)%2===0)?'brightness(1.4)':'none'; } else bossbar.style.display='none';
}

function render(){
  drawBG(16);
  // hero
  const p=st.p;
  // atlas frames: idle 0-1, run 2-7, melee 8-11, throw 12-14
  let frame=0;
  if(st.p.state==='idle'){ frame = Math.floor(st.t/180)%2; }
  else if(st.p.state==='run'){ frame = 2 + (Math.floor(st.t/100)%6); }
  else if(st.p.state==='melee'){ frame = 8 + Math.min(3, Math.floor(st.p.anim/60)); }
  else if(st.p.state==='throw'){ frame = 12 + Math.min(2, Math.floor(st.p.anim/90)); }
  drawAtlasOrVec('hero', frame, p.x, p.y, (p.face<0));
  // enemies
  for(const e of st.enemies){
    if(e.type==='tornado'){ drawAtlasOrVec('min', Math.floor(e.f)%8, e.x, e.y, false, e); }
    else if(e.type==='zig'){ drawAtlasOrVec('zig', Math.floor(e.f*1.3)%8, e.x, e.y, false, e); }
    else if(e.type==='mini'){ const f = (e.tele>0? 6 + Math.floor((st.t/200)%2) : (Math.floor(st.t/140)%6)); drawAtlasOrVec('titan', f, e.x, e.y, false, e); }
    else if(e.type==='hurricane'){ const f = (e.tele>0? 8 + Math.floor((st.t/180)%4) : (Math.floor(st.t/110)%8)); drawAtlasOrVec('hurr', f, e.x, e.y, false, e); }
  }
  // bolts and AOE
  ctx.fillStyle='#ffe66d'; for(const b of st.bolts){ ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill(); }
  for(const a of st.aoe){ const t=a.life/350; ctx.strokeStyle='rgba(255,230,110,'+(t.toFixed(2))+')'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(a.x,a.y,a.r*(1.2-t*0.6),0,Math.PI*2); ctx.stroke(); }

  // HUD
  ctx.fillStyle='#122032'; ctx.fillRect(16,16,240,12); ctx.fillStyle='#2e95ff'; ctx.fillRect(16,16,240*(st.p.hp/st.p.max),12); ctx.strokeStyle='#2a3b52'; ctx.strokeRect(16,16,240,12);
  ctx.fillStyle='#a3b9cc'; ctx.font='700 16px system-ui'; ctx.fillText('Score: '+st.score, 270, 26); ctx.fillText('Wave: '+st.wave, 360, 26);
}

let last=performance.now(); function loop(ts){ const dt=ts-last; last=ts; if(canvas.style.display!=='none'){ update(dt); render(); } requestAnimationFrame(loop); } requestAnimationFrame(loop);

startBtn.onclick=()=>{ document.getElementById('menu').style.display='none'; canvas.style.display='block'; bossbar.style.display='none'; bgmBoss.pause(); bgmMain.currentTime=0; bgmMain.volume=0.6; bgmMain.play().catch(()=>{}); play('chainsaw_idle',0.25); };
})();