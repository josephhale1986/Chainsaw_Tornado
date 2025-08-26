(()=>{
  const menu = document.getElementById('menu');
  const startBtn = document.getElementById('startBtn');
  const hud = document.getElementById('hud');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, DPR=Math.max(1,Math.min(2,Math.floor(devicePixelRatio||1)));
  canvas.width=W*DPR; canvas.height=H*DPR; canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0);
  const bgmMain=document.getElementById('bgmMain');
  const bgmBoss=document.getElementById('bgmBoss');

  const keys={}; window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); if(e.key.toLowerCase()==='p') st.paused=!st.paused;}); 
  window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

  let actx; function audio(){ if(!actx) try{actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  function sfx(f=440,type='square',t=0.08,g=0.06){ try{audio(); const o=actx.createOscillator(),gn=actx.createGain(); o.type=type; o.frequency.value=f; gn.gain.value=g; o.connect(gn); gn.connect(actx.destination); o.start(); setTimeout(()=>o.stop(), t*1000);}catch(e){} }

  function drawPlayer(x,y,dir=1){
    ctx.save(); ctx.translate(x + (dir<0? 56:0), y); ctx.scale(dir,1);
    ctx.fillStyle='#5b3b2a'; ctx.fillRect(10,44,12,6); ctx.fillRect(24,44,12,6);
    ctx.fillStyle='#2b4f77'; ctx.fillRect(12,28,22,16); ctx.strokeStyle='#1a2f49'; ctx.strokeRect(12,28,22,16); ctx.beginPath(); ctx.moveTo(23,28); ctx.lineTo(23,44); ctx.stroke();
    ctx.fillStyle='#b92a2a'; ctx.fillRect(8,14,28,16); ctx.strokeStyle='#3a0f0f'; ctx.lineWidth=1.5; ctx.strokeRect(8,14,28,16);
    ctx.globalAlpha=0.35; ctx.strokeStyle='#ffd0d0'; [18,22,26].forEach(y=>{ctx.beginPath(); ctx.moveTo(8,y); ctx.lineTo(36,y); ctx.stroke();}); ctx.strokeStyle='#6d0f0f'; [12,16,20,24,28,32].forEach(x=>{ctx.beginPath(); ctx.moveTo(x,14); ctx.lineTo(x,30); ctx.stroke();}); ctx.globalAlpha=1;
    ctx.fillStyle='#f1c8a8'; ctx.beginPath(); ctx.arc(24,10,7,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#3a2a1a'; ctx.stroke();
    ctx.fillStyle='#7a4a2a'; ctx.beginPath(); ctx.moveTo(18,10); ctx.bezierCurveTo(20,16,28,16,30,10); ctx.lineTo(30,12); ctx.bezierCurveTo(29,16,19,16,18,12); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#c24b3b'; ctx.fillRect(34,26,10,6); ctx.fillStyle='#cfd5db'; ctx.fillRect(32,28,20,6);
    ctx.fillStyle='#bfc7cf'; ctx.beginPath(); ctx.moveTo(46,28); ctx.lineTo(52,29); ctx.lineTo(52,33); ctx.lineTo(46,34); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawTornado(x,y,w=44,h=44,spin=0){
    ctx.save(); ctx.translate(x+w/2,y+h/2); ctx.rotate(spin); ctx.translate(-w/2,-h/2);
    ctx.strokeStyle='#9ec7ff'; ctx.lineWidth=3; ctx.beginPath();
    ctx.moveTo(4,6); ctx.bezierCurveTo(14,2,30,2,40,6); ctx.stroke();
    ctx.beginPath(); ctx.bezierCurveTo(6,18,22,20,30,22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10,30); ctx.bezierCurveTo(22,28,28,30,24,34); ctx.stroke();
    ctx.restore();
  }

  const bg = {t:0, clouds:[], leaves:[]};
  for(let i=0;i<8;i++) bg.clouds.push({x:Math.random()*W, y:30+Math.random()*140, s:60+Math.random()*120, v:0.1+Math.random()*0.2});
  function drawBackground(dt){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#162033'); g.addColorStop(1,'#0b1119'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#26354a'; bg.clouds.forEach(c=>{ ctx.beginPath(); ctx.ellipse(c.x,c.y,c.s, c.s*0.35,0,0,Math.PI*2); ctx.fill(); c.x-=c.v*dt/16; if(c.x<-c.s) c.x=W+c.s; });
    function tree(x,base,h,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x,base); ctx.lineTo(x-18,base-h*0.6); ctx.lineTo(x+18,base-h*0.6); ctx.closePath(); ctx.fill(); ctx.fillRect(x-4,base-h*0.6,8,h*0.6); }
    const baseY=H-72;
    for(let i=0;i<16;i++){ const x = ((i*80 - (bg.t*0.1))% (W+100)) - 50; tree(x, baseY, 90+(i%3)*10, '#111a22'); }
    for(let i=0;i<14;i++){ const x = ((i*90 - (bg.t*0.3))% (W+140)) - 70; const colors=['#c2562e','#d9a43a','#9e2f2f']; tree(x, baseY, 110+((i*31)%40), colors[i%3]); }
    ctx.fillStyle='#1a1410'; ctx.fillRect(0,baseY,W,72);
    for(let i=0;i<18;i++){ const x=((i*60 - (bg.t*0.6))%(W+60))-30; ctx.fillStyle='#3a5a3a'; ctx.fillRect(x,baseY-6,14,6); }
    for(let i=0;i<8;i++){ const x=((i*120 - (bg.t*0.8))%(W+120))-60; ctx.fillStyle='#6b5a4a'; ctx.fillRect(x,baseY-10,20,10); }
    if(Math.random()<0.3) bg.leaves.push({x:W+10, y:80+Math.random()*(H-140), vx:- (1+Math.random()*2), vy:(-0.2+Math.random()*0.4), life:400});
    for(let i=bg.leaves.length-1;i>=0;i--){ const L=bg.leaves[i]; ctx.fillStyle=['#f39a2e','#e6c04a','#c34b3b'][i%3]; ctx.fillRect(L.x,L.y,3,3); L.x+=L.vx; L.y+=L.vy; if((L.life-=dt)<=0||L.x<-10) bg.leaves.splice(i,1); }
    bg.t+=dt;
  }

  const st = {
    paused:false, over:false, t:0, score:0, wave:1,
    p:{x:120,y:H-140,w:56,h:56,vx:0,vy:0,spd:3.4,hp:100,max:100,face:1,cool:0,swing:null, axe:3, shield:0},
    enemies:[], projectiles:[], particles:[], powerups:[],
    nextSpawn:0, spawnRate:1200, nextFlash:2000, flash:0, boss:false
  };

  function melee(){
    const p=st.p; if(p.cool>0||p.swing) return;
    p.swing={t:0,d:200,reach:64,a0:p.face>0?-0.7:Math.PI+0.7,a1:p.face>0?0.7:Math.PI-0.7};
    p.cool=280; sfx(720,'square',0.06,0.08);
  }
  function throwAxe(){
    const p=st.p; if(p.axe<=0) return; p.axe--;
    st.projectiles.push({x:p.x+p.w/2, y:p.y+p.h/2, vx:(p.face>0?7:-7), vy:-0.2, w:22,h:18, rot:0}); sfx(520,'triangle',0.08,0.06);
  }
  window.addEventListener('keydown', e=>{ if(e.key===' ') melee(); if(e.key.toLowerCase()==='e') throwAxe(); });

  function spawnEnemy(){
    const type = Math.random()<0.6?'tornado':'zig';
    if(type==='tornado') st.enemies.push({type,x:W+30,y:200+Math.random()*(H-260),w:44,h:44,vx:-(2+Math.random()*1.6),hp:36,touch:12,spin:0});
    else st.enemies.push({type,x:W+20,y:120+Math.random()*280,w:40,h:40,vx:-2.5,vy:(Math.random()<0.5?-1:1)*1.2,hp:40,touch:12,t:0});
  }
  function spawnMini(){ st.enemies.push({type:'mini', x:W-140, y:110, w:120,h:90, vx:-1.2, hp:320, touch:20}); }
  function spawnBoss(){ st.enemies.push({type:'hurricane', x:W-220, y:40, w:190,h:190, vx:-0.8, hp:800, touch:28, spin:0}); }

  function update(dt){
    if(st.paused||st.over) return;
    st.t+=dt;
    if(st.t>st.nextFlash){ st.flash=160; st.nextFlash=st.t+ 2000+Math.random()*3000; }
    st.flash=Math.max(0,st.flash-dt);

    const l=keys['arrowleft']||keys['a'], r=keys['arrowright']||keys['d'], u=keys['arrowup']||keys['w'], dn=keys['arrowdown']||keys['s'];
    st.p.vx = (r?1:0) - (l?1:0); st.p.vy = (dn?1:0) - (u?1:0);
    st.p.x += st.p.vx*st.p.spd*dt/16; st.p.y += st.p.vy*st.p.spd*dt/16;
    if(st.p.vx!==0) st.p.face = st.p.vx>0?1:-1;
    st.p.x=Math.max(16,Math.min(W-16-st.p.w,st.p.x)); st.p.y=Math.max(80,Math.min(H-80-st.p.h,st.p.y));
    st.p.cool=Math.max(0,st.p.cool-dt); st.p.shield=Math.max(0,st.p.shield-dt);

    if(st.p.swing){ st.p.swing.t+=dt; if(st.p.swing.t>=st.p.swing.d) st.p.swing=null; else {
      const prog=st.p.swing.t/st.p.swing.d; const ang=st.p.swing.a0+(st.p.swing.a1-st.p.swing.a0)*prog; const cx=st.p.x+st.p.w/2, cy=st.p.y+st.p.h/2;
      const hb={x:cx+Math.cos(ang)*st.p.swing.reach-16, y:cy+Math.sin(ang)*st.p.swing.reach-16, w:32,h:32};
      for(let i=st.enemies.length-1;i>=0;i--){ const e=st.enemies[i]; if(hb.x < e.x+e.w && hb.x+hb.w > e.x && hb.y < e.y+e.h && hb.y+hb.h > e.y){ e.hp -= 22; } }
    }}

    if(st.t>st.nextSpawn){ spawnEnemy(); st.nextSpawn=st.t + Math.max(300, st.spawnRate - st.wave*40) + Math.random()*400; }
    if(Math.floor(st.t/10000)+1 > st.wave){ st.wave++; if(st.wave%3===0 && st.wave<10) spawnMini(); if(st.wave===10 && !st.boss){ st.boss=true; spawnBoss(); bgmMain.pause(); bgmBoss.currentTime=0; bgmBoss.volume=0.7; bgmBoss.play().catch(()=>{});} }

    for(let i=st.enemies.length-1;i>=0;i--){
      const e=st.enemies[i];
      if(e.type==='tornado'){ e.x += e.vx*dt/16; e.spin = (e.spin||0) + 0.05*dt/16; }
      else if(e.type==='zig'){ e.x += e.vx*dt/16; e.y += e.vy*dt/16; e.t+=dt; if(e.y<80||e.y>H-120) e.vy*=-1; }
      else if(e.type==='mini'){ e.x += e.vx*dt/16; if(Math.random()<0.02) st.enemies.push({type:'tornado', x:e.x, y:e.y+e.h-40, w:40,h:40, vx:-3, hp:28, touch:10, spin:0}); }
      else if(e.type==='hurricane'){ e.x += e.vx*dt/16; e.spin = (e.spin||0)+ 0.08*dt/16; if(Math.random()<0.03) st.enemies.push({type:'zig', x:e.x+e.w/2, y:e.y+e.h-30, w:40,h:40, vx:-2.4, vy:(Math.random()<0.5?-1:1)*1.6, hp:44, touch:14, t:0}); }
      const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
      if(!(pb.x+pb.w<e.x||pb.x>e.x+e.w||pb.y+pb.h<e.y||pb.y>e.y+e.h)){
        if(st.p.shield<=0){ st.p.hp -= e.touch||12; if(st.p.hp<=0) { st.over=true; bgmMain.pause(); bgmBoss.pause(); } }
        e.x += 18*(st.p.x<e.x?1:-1);
      }
      if(e.hp<=0){ st.enemies.splice(i,1); st.score += (e.type==='mini'?120:(e.type==='hurricane'?400:20)); }
      else if(e.x<-140){ st.enemies.splice(i,1); }
    }

    for(let i=st.projectiles.length-1;i>=0;i--){
      const a=st.projectiles[i]; a.x+=a.vx*dt/16; a.y+=a.vy*dt/16; a.vy+=0.02; a.rot=(a.rot||0)+0.3*dt/16;
      for(let j=st.enemies.length-1;j>=0;j--){ const e=st.enemies[j]; if(!(a.x+a.w<e.x||a.x>e.x+e.w||a.y+a.h<e.y||a.y>e.y+e.h)){ e.hp-=40; st.projectiles.splice(i,1); break; } }
      if(a.x<-40||a.x>W+40||a.y>H+40) st.projectiles.splice(i,1);
    }
  }

  function render(){
    drawBackground(16);
    if(st.flash>0){ ctx.fillStyle='rgba(200,230,255,'+(st.flash/180).toFixed(2)+')'; ctx.fillRect(0,0,W,H); }
    drawPlayer(st.p.x, st.p.y, st.p.face);
    if(st.p.swing){
      const prog=st.p.swing.t/st.p.swing.d; const ang=st.p.swing.a0+(st.p.swing.a1-st.p.swing.a0)*prog;
      ctx.save(); ctx.translate(st.p.x+st.p.w/2, st.p.y+st.p.h/2); ctx.rotate(ang);
      ctx.globalAlpha=0.9; ctx.strokeStyle='#a3b9cc'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(0,0, st.p.swing.reach, -0.25, 0.25); ctx.stroke();
      ctx.globalAlpha=0.4; ctx.lineWidth=10; ctx.beginPath(); ctx.arc(0,0, st.p.swing.reach-6, -0.30, 0.30); ctx.stroke();
      ctx.restore(); ctx.globalAlpha=1;
    }
    for(const e of st.enemies){
      if(e.type==='tornado'||e.type==='zig') drawTornado(e.x,e.y,e.w,e.h,e.spin||0);
      else if(e.type==='mini'){
        ctx.save(); ctx.translate(e.x,e.y);
        ctx.fillStyle='#9fb4cc'; ctx.strokeStyle='#1b2b44'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.ellipse(e.w/2,e.h*0.35,e.w*0.45,e.h*0.25,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(e.w/2,e.h*0.55,e.w*0.5,e.h*0.22,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#0c1b2b'; ctx.beginPath(); ctx.ellipse(e.w*0.35,e.h*0.38,7,6,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.w*0.65,e.h*0.36,7,6,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      } else if(e.type==='hurricane'){
        ctx.save(); ctx.translate(e.x+e.w/2, e.y+e.h/2); ctx.rotate(e.spin||0);
        const r=Math.min(e.w,e.h)/2;
        const grd=ctx.createRadialGradient(0,0,0,0,0,r); grd.addColorStop(0,'#4a678a'); grd.addColorStop(0.6,'#2f425a'); grd.addColorStop(1,'#1a2432'); ctx.fillStyle=grd;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#9eb4cf'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(-10,-r*0.7); ctx.bezierCurveTo(r*0.3,-r*0.5,r*0.7,-r*0.2,r*0.7,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10,r*0.6); ctx.bezierCurveTo(-r*0.2,r*0.4,-r*0.6,0,-r*0.7,-0.1); ctx.stroke();
        ctx.fillStyle='#0c0c0c'; ctx.beginPath(); ctx.arc(0,0, r*0.18,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff1a1a'; ctx.beginPath(); ctx.arc(0,0, r*0.14,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
    for(const a of st.projectiles){ ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.rot||0); ctx.fillStyle='#b88'; ctx.fillRect(-11,-2,18,4); ctx.fillStyle='#ccd'; ctx.beginPath(); ctx.moveTo(8,-6); ctx.lineTo(18,-2); ctx.lineTo(18,2); ctx.lineTo(8,6); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.fillStyle='#122032'; ctx.fillRect(16,16,240,12); ctx.fillStyle='#2e95ff'; ctx.fillRect(16,16,240*(st.p.hp/st.p.max),12); ctx.strokeStyle='#2a3b52'; ctx.strokeRect(16,16,240,12);
    ctx.fillStyle='#a3b9cc'; ctx.font='700 16px system-ui'; ctx.fillText('Score: '+st.score, 270, 26); ctx.fillText('Wave: '+st.wave, 360, 26); ctx.fillText('Axes: '+st.p.axe, 440, 26);
    if(st.over){ ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#ff9a9a'; ctx.font='900 42px system-ui'; ctx.textAlign='center'; ctx.fillText('Game Over', W/2, H/2-10); }
  }

  let last=performance.now(); function frame(ts){ const dt=ts-last; last=ts; if(canvas.style.display!=='none'){ update(dt); render(); } requestAnimationFrame(frame); } requestAnimationFrame(frame);

  startBtn.onclick=()=>{ menu.style.display='none'; canvas.style.display='block'; bgmBoss.pause(); bgmMain.currentTime=0; bgmMain.volume=0.6; bgmMain.play().catch(()=>{}); };

})();