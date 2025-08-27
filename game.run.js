// Wrapped to avoid IIFE close
window.addEventListener('load', function(){
const startBtn=document.getElementById('startBtn');
const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height,DPR=Math.max(1,Math.min(2,Math.floor(devicePixelRatio||1))); canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);
const bgmMain=document.getElementById('bgmMain'), bgmBoss=document.getElementById('bgmBoss');
const bossbar=document.getElementById('bossbar'), bossfill=document.getElementById('bossfill'), bosslabel=document.getElementById('bosslabel');

// Strict atlas loader (cache-busted names)
function loadImage(src){ return new Promise(res=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=()=>res(null); img.src=src; }); }
const ATLAS = {
  hero: { src: 'assets/lumberjack_sprites.ed47113c.png', fw:64, fh:64, frames:15 },
  tMinion: { src: 'assets/tornado_minion.c4ba9ab8.png', fw:64, fh:64, frames:8 },
  tZig: { src: 'assets/tornado_zig.de6e978d.png', fw:64, fh:64, frames:8 },
  titan: { src: 'assets/storm_titan.faca1bd0.png', fw:128, fh:128, frames:10 },
  hurricane: { src: 'assets/hurricane_lord.2d2ac163.png', fw:192, fh:192, frames:12 }
};
async function loadAtlases(){ for(const k of Object.keys(ATLAS)) ATLAS[k].img = await loadImage(ATLAS[k].src); }
function drawAtlas(key, frame, x, y, flip=false){
  const a=ATLAS[key]; if(!a||!a.img) return; const f=Math.floor(frame)%a.frames; const sx=f*a.fw;
  ctx.save(); ctx.translate(x,y); if(flip){ ctx.translate(a.fw,0); ctx.scale(-1,1); }
  ctx.drawImage(a.img, sx, 0, a.fw, a.fh, 0, 0, a.fw, a.fh); ctx.restore();
}
let ATLASES_READY=false; loadAtlases().then(()=>{ATLASES_READY=true;});

// Input
const keys={}; addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); if(e.key.toLowerCase()==='p') st.paused=!st.paused;});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

// Background
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

// Game state
const st={paused:false,over:false,t:0,score:0,wave:1,
  p:{x:120,y:H-136,w:64,h:64,vx:0,vy:0,spd:3.6,hp:100,max:100,face:1,cool:0,state:'idle',anim:0},
  enemies:[], projectiles:[], bolts:[], aoe:[], nextSpawn:0, spawnRate:1200, boss:false, bossEntity:null
};

// Actions
function melee(){ const p=st.p; if(p.cool>0||p.state==='melee') return; p.state='melee'; p.anim=0; p.cool=280; play('chainsaw_swing',0.9); }
function throwAxe(){ const p=st.p; if(p.state==='throw') return; p.state='throw'; p.anim=0; st.projectiles.push({x:p.x+p.w/2,y:p.y+p.h/2,vx:(p.face>0?7:-7),vy:-0.2,w:22,h:18,rot:0,dmg:40}); play('axe_throw',0.8);}
addEventListener('keydown',e=>{ if(e.key===' ') melee(); if(e.key.toLowerCase()==='e') throwAxe(); });

// SFX
const SFX={}; ['chainsaw_swing','axe_throw','axe_hit','tornado_whoosh','aoe_burst','bolt_fire','boss_crit'].forEach(n=>{const a=new Audio('assets/'+n+'.wav');a.preload='auto';SFX[n]=a;});
function play(n,vol=1){ try{const a=SFX[n].cloneNode(); a.volume=vol; a.play();}catch(_ ){} }

// Spawns
function spawnMini(){ const e={type:'mini', x:W-140,y:110,w:128,h:128,hp:420,max:420,touch:20,atk:0,tele:0}; st.enemies.push(e);}
function spawnBoss(){ const e={type:'hurricane', x:W-220,y:40,w:192,h:192,hp:900,max:900,touch:28,atk:0,tele:0,f:0}; st.enemies.push(e);}

// Update loop
function update(dt){
  if(st.paused||st.over) return; st.t+=dt;
  const l=keys['arrowleft']||keys['a'], r=keys['arrowright']||keys['d'], u=keys['arrowup']||keys['w'], dn=keys['arrowdown']||keys['s'];
  const vx=(r?1:0)-(l?1:0), vy=(dn?1:0)-(u?1:0);
  st.p.x+=vx*st.p.spd*dt/16; st.p.y+=vy*st.p.spd*dt/16; if(vx!==0) st.p.face=vx>0?1:-1;
  st.p.x=Math.max(16,Math.min(W-16-st.p.w,st.p.x)); st.p.y=Math.max(80,Math.min(H-80-st.p.h,st.p.y));
  st.p.cool=Math.max(0,st.p.cool-dt); st.p.anim+=dt;
  if(st.p.state!=='melee' && st.p.state!=='throw') st.p.state=(vx||vy)?'run':'idle';
  if(st.p.state==='melee' && st.p.anim>260) st.p.state='idle';
  if(st.p.state==='throw' && st.p.anim>270) st.p.state='idle';

  if(st.t>st.nextSpawn){ st.nextSpawn=st.t + Math.max(300, st.spawnRate - st.wave*40) + Math.random()*400;
    const t = Math.random()<0.6 ? 'tornado' : 'zig'; const y = 160+Math.random()*(H-260);
    st.enemies.push({type:t, x:W+30, y, w:64, h:64, vx: t==='tornado' ? -2.2 : -2.5, vy:(t==='zig'?(Math.random()<0.5?-1:1)*1.2:0), hp: 36, touch:12, f:0});
    play('tornado_whoosh',0.4);
  }
  if(Math.floor(st.t/10000)+1 > st.wave){ st.wave++; if(st.wave%3===0 && st.wave<10) spawnMini(); if(st.wave===10 && !st.boss) spawnBoss(); }

  for(let i=st.enemies.length-1;i>=0;i--){ const e=st.enemies[i];
    if(e.type==='tornado'||e.type==='zig'){ e.x+= (e.vx||-2.2)*dt/16; if(e.type==='zig'){ e.y+=(e.vy||1.2)*dt/16; if(e.y<80||e.y>H-120) e.vy=-e.vy; } e.f=(e.f||0)+dt*0.02; }
    else if(e.type==='mini'){ if(!st.boss){ st.boss=true; st.bossEntity=e; bossbar.style.display='block'; bosslabel.textContent='Elemental Storm Titan'; }
      e.x += (-1.0)*dt/16; e.atk=(e.atk||0)+dt; const cadence = (e.hp/e.max<0.25)? 1800: 2600;
      if(e.atk>cadence && e.tele<=0){ e.tele=600; e.atk=0; }
      if(e.tele>0){ e.tele-=dt; if(e.tele<=0){ const shots=(e.hp/e.max<0.25)?3:2; for(let k=0;k<shots;k++){ const ang=(-0.2+k*0.2)+(Math.random()*0.2-0.1);
        st.bolts.push({x:e.x+e.w*0.5,y:e.y+e.h*0.55,vx:6*Math.cos(ang),vy:6*Math.sin(ang),life:2200,r:6}); play('bolt_fire',0.7); } } }
    else if(e.type==='hurricane'){ if(!st.boss){ st.boss=true; st.bossEntity=e; bossbar.style.display='block'; bosslabel.textContent='Hurricane Lord'; bgmMain.pause(); bgmBoss.currentTime=0; bgmBoss.volume=0.8; bgmBoss.play().catch(()=>{}); }
      e.x += (-0.8)*dt/16; e.f=(e.f||0)+dt*0.02; e.atk=(e.atk||0)+dt; const cadence = (e.hp/e.max<0.25)? 3000: 4200;
      if(e.atk>cadence && e.tele<=0){ e.tele=700; e.atk=0; }
      if(e.tele>0){ e.tele-=dt; if(e.tele<=0){ const count=(e.hp/e.max<0.25)?3:2; for(let k=0;k<count;k++){ const vy=(k%2===0?-1:1)*(1.0+Math.random()*0.8);
        st.enemies.push({type:'tornado', x:e.x+e.w/2, y:e.y+e.h/2, w:64, h:64, vx:-(3+Math.random()*1.5), vy, hp:36, touch:12, f:0}); } } }
    const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
    if(!(pb.x+pb.w<e.x||pb.x>e.x+e.w||pb.y+pb.h<e.y||pb.y>e.y+e.h)) st.p.hp -= e.touch||12;
    if(e.hp!==undefined && e.hp<=0){ st.enemies.splice(i,1);
      if(e.type==='mini'||e.type==='hurricane'){ st.boss=false; st.bossEntity=null; bossbar.style.display='none'; bgmBoss.pause(); try{bgmMain.play();}catch(_ ){} }
    } else if(e.x<-240) st.enemies.splice(i,1);
  }

  for(let i=st.bolts.length-1;i>=0;i--){ const b=st.bolts[i]; b.x+=b.vx; b.y+=b.vy; b.life-=dt;
    if(b.x<0||b.x>W||b.y<60||b.y>H-60||b.life<=0){ st.aoe.push({x:b.x,y:b.y,r:36,life:350}); st.bolts.splice(i,1); play('aoe_burst',0.6); continue; }
    const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
    if(!(pb.x+pb.w<b.x-b.r||pb.x>b.x+b.r||pb.y+pb.h<b.y-b.r||pb.y>b.y+b.r)){ st.p.hp-=18; st.aoe.push({x:b.x,y:b.y,r:36,life:350}); st.bolts.splice(i,1); play('aoe_burst',0.7); }
  }
  for(let i=st.aoe.length-1;i>=0;i--){ const a=st.aoe[i]; a.life-=dt; if(a.life<=0) st.aoe.splice(i,1); }

  for(let i=st.projectiles.length-1;i>=0;i--){ const a=st.projectiles[i]; a.x+=a.vx*dt/16; a.y+=a.vy*dt/16; a.vy+=0.02;
    for(let j=st.enemies.length-1;j>=0;j--){
      const e=st.enemies[j];
      if(!(a.x+a.w<e.x||a.x>e.x+e.w||a.y+a.h<e.y||a.y>e.y+e.h)){
        let dmg=a.dmg||40;
        if(e.type==='mini'){
          const eye={x:e.x+e.w*0.35-8,y:e.y+e.h*0.35-8,w:16,h:16};
          if(e.tele>0 && !(a.x+a.w<eye.x||a.x>eye.x+eye.w||a.y+a.h<eye.y||a.y>eye.y+eye.h)) dmg*=1.8; else dmg*=0.3;
        } else if(e.type==='hurricane'){
          const eye={x:e.x+e.w/2-18,y:e.y+e.h/2-18,w:36,h:36};
          if(e.tele>0 && !(a.x+a.w<eye.x||a.x>eye.x+eye.w||a.y+a.h<eye.y||a.y>eye.y+eye.h)) dmg*=2.0; else dmg*=0.2;
        }
        e.hp-=dmg; st.projectiles.splice(i,1); play('axe_hit',0.8); break;
      }
    }
    if(a.x<-40||a.x>W+40||a.y>H+40) st.projectiles.splice(i,1);
  }

  if(st.boss && st.bossEntity){
    const e=st.bossEntity; bossbar.style.display='block'; bosslabel.textContent = e.type==='mini'?'Elemental Storm Titan':'Hurricane Lord';
    const pct=Math.max(0,e.hp/e.max); bossfill.style.width=(pct*100)+'%'; bossfill.style.filter=(pct<0.25 && Math.floor(st.t/120)%2===0)?'brightness(1.4)':'none';
  } else bossbar.style.display='none';
}

function render(){
  drawBG(16);
  const p=st.p; let frame=0;
  if(st.p.state==='idle') frame = Math.floor(st.t/180)%2;
  else if(st.p.state==='run') frame = 2 + (Math.floor(st.t/100)%6);
  else if(st.p.state==='melee') frame = 8 + Math.min(3, Math.floor(st.p.anim/60));
  else if(st.p.state==='throw') frame = 12 + Math.min(2, Math.floor(st.p.anim/90));
  drawAtlas('hero', frame, p.x, p.y, (p.face<0));

  for(const e of st.enemies){
    if(e.type==='tornado') drawAtlas('tMinion', Math.floor(e.f)%8, e.x, e.y);
    else if(e.type==='zig') drawAtlas('tZig', Math.floor(e.f*1.3)%8, e.x, e.y);
    else if(e.type==='mini') drawAtlas('titan', (e.tele>0? 6 + Math.floor((st.t/200)%2) : (Math.floor(st.t/140)%6)), e.x, e.y);
    else if(e.type==='hurricane') drawAtlas('hurricane', (e.tele>0? 8 + Math.floor((st.t/180)%4) : (Math.floor(st.t/110)%8)), e.x, e.y);
  }

  ctx.fillStyle='#122032'; ctx.fillRect(16,16,240,12); ctx.fillStyle='#2e95ff'; ctx.fillRect(16,16,240*(st.p.hp/st.p.max),12); ctx.strokeStyle='#2a3b52'; ctx.strokeRect(16,16,240,12);
}

let last=performance.now(); function loop(ts){ const dt=ts-last; last=ts; if(canvas.style.display!=='none' && ATLASES_READY){ update(dt); render(); } requestAnimationFrame(loop); } requestAnimationFrame(loop);
startBtn.onclick=()=>{ document.getElementById('menu').style.display='none'; canvas.style.display='block'; bossbar.style.display='none'; bgmBoss.pause(); bgmMain.currentTime=0; bgmMain.volume=0.6; bgmMain.play().catch(()=>{}); };
});
