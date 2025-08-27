(()=>{
  const menu = document.getElementById('menu');
  const startBtn = document.getElementById('startBtn');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, DPR=Math.max(1,Math.min(2,Math.floor(devicePixelRatio||1)));
  canvas.width=W*DPR; canvas.height=H*DPR; canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0);
  const bgmMain=document.getElementById('bgmMain'); const bgmBoss=document.getElementById('bgmBoss');
  const bossbar=document.getElementById('bossbar'); const bossfill=document.getElementById('bossfill'); const bosslabel=document.getElementById('bosslabel');

  const SFX = {};
  const sfxList = ['chainsaw_idle','chainsaw_swing','axe_throw','axe_hit','tornado_whoosh','despawn_puff','titan_charge','bolt_fire','aoe_burst','boss_eye_open','mini_spawn','boss_crit','boss_bar_slam','enrage_loop'];
  sfxList.forEach(n=>{ const a=new Audio('assets/'+n+'.wav'); a.preload='auto'; SFX[n]=a; });

  function play(name, vol=1.0){ try{ const a=SFX[name].cloneNode(); a.volume=vol; a.play(); }catch(e){} }

  // Sprite loader
  function makeSprite(src, fw, fh, frames){
    const img=new Image(); img.src='assets/'+src;
    return {img, fw, fh, frames};
  }

  const sprites = {
    hero: makeSprite('lumberjack_sprites.png', 64,64,15),
    tMinion: makeSprite('tornado_minion.png', 64,64,8),
    tZig: makeSprite('tornado_zig.png', 64,64,8),
    titan: makeSprite('storm_titan.png', 128,128,10),
    hurricane: makeSprite('hurricane_lord.png', 192,192,12)
  };

  function drawSprite(sp, frame, x, y, scale=1, flip=false){
    const {img, fw, fh, frames} = sp;
    const f = Math.floor(frame)%frames;
    const sx = f*fw, sy=0;
    ctx.save();
    ctx.translate(x, y);
    if(flip){ ctx.translate(fw*scale,0); ctx.scale(-1,1); }
    ctx.drawImage(img, sx, sy, fw, fh, 0,0, fw*scale, fh*scale);
    ctx.restore();
  }

  const keys={}; window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true; if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault(); if(e.key.toLowerCase()==='p') st.paused=!st.paused;}); 
  window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

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
    p:{x:120,y:H-136,w:64,h:64,vx:0,vy:0,spd:3.6,hp:100,max:100,face:1,cool:0,swing:null, axe:3, anim:0, state:'idle'},
    enemies:[], projectiles:[], bolts:[], aoe:[],
    nextSpawn:0, spawnRate:1200, boss:false, bossEntity:null
  };

  function melee(){
    const p=st.p; if(p.cool>0||p.state==='melee') return;
    p.state='melee'; p.anim=0; p.cool=280; play('chainsaw_swing',0.9);
  }
  function throwAxe(){
    const p=st.p; if(p.axe<=0||p.state==='throw') return; p.axe--;
    st.projectiles.push({x:p.x+p.w/2, y:p.y+p.h/2, vx:(p.face>0?7:-7), vy:-0.2, w:22,h:18, rot:0, dmg:40}); play('axe_throw',0.8);
    p.state='throw'; p.anim=0;
  }
  window.addEventListener('keydown', e=>{ if(e.key===' ') melee(); if(e.key.toLowerCase()==='e') throwAxe(); });

  function drawHero(){
    const p=st.p; let frame=0;
    if(p.state==='idle'){ frame = Math.floor(st.t/180)%2; }
    else if(p.state==='run'){ frame = 2 + (Math.floor(st.t/100)%6); }
    else if(p.state==='melee'){ frame = 8 + Math.min(3, Math.floor(p.anim/60)); if(p.anim>260){ p.state='idle'; } }
    else if(p.state==='throw'){ frame = 12 + Math.min(2, Math.floor(p.anim/90)); if(p.anim>270){ p.state='idle'; } }
    drawSprite(sprites.hero, frame, p.x, p.y, 1, p.face<0);
  }

  function update(dt){
    if(st.paused||st.over) return;
    st.t+=dt;
    // player move
    const l=keys['arrowleft']||keys['a'], r=keys['arrowright']||keys['d'], u=keys['arrowup']||keys['w'], dn=keys['arrowdown']||keys['s'];
    const vx = (r?1:0) - (l?1:0), vy = (dn?1:0) - (u?1:0);
    st.p.vx=vx; st.p.vy=vy;
    st.p.x += vx*st.p.spd*dt/16; st.p.y += vy*st.p.spd*dt/16;
    if(vx!==0) st.p.face = vx>0?1:-1;
    st.p.x=Math.max(16,Math.min(W-16-st.p.w,st.p.x)); st.p.y=Math.max(80,Math.min(H-80-st.p.h,st.p.y));
    st.p.cool=Math.max(0,st.p.cool-dt); st.p.anim+=dt;
    st.p.state = (st.p.state==='melee'||st.p.state==='throw') ? st.p.state : (vx!==0||vy!==0 ? 'run':'idle');

    // melee hitbox during melee state
    if(st.p.state==='melee'){
      const cx=st.p.x+st.p.w/2, cy=st.p.y+st.p.h/2;
      const reach=64, dir=st.p.face>0?1:-1;
      const hb={x:cx+dir*reach-16, y:cy-16, w:32, h:32};
      for(const e of st.enemies){
        if(!(hb.x+hb.w<e.x||hb.x>e.x+e.w||hb.y+hb.h<e.y||hb.y>e.y+e.h)){
          let dmg=18;
          if(e.type==='mini'){
            const eyeBox={x:e.x+e.w*0.35-8,y:e.y+e.h*0.35-8,w:16,h:16};
            if(e.tele>0 && !(hb.x+hb.w<eyeBox.x||hb.x>eyeBox.x+eyeBox.w||hb.y+hb.h<eyeBox.y||hb.y>eyeBox.y+eyeBox.h)){ dmg=50; play('boss_crit'); e.flash=120; } else dmg=6;
          } else if(e.type==='hurricane'){
            const eyeBox={x:e.x+e.w/2-18,y:e.y+e.h/2-18,w:36,h:36};
            if(e.tele>0 && !(hb.x+hb.w<eyeBox.x||hb.x>eyeBox.x+eyeBox.w||hb.y+hb.h<eyeBox.y||hb.y>eyeBox.y+eyeBox.h)){ dmg=60; play('boss_crit'); e.flash=120; } else dmg=4;
          }
          e.hp-=dmg;
        }
      }
    }

    // spawn minions
    if(st.t> (st.nextSpawn||0)){ st.nextSpawn=st.t + Math.max(300, st.spawnRate - st.wave*40) + Math.random()*400;
      const t = Math.random()<0.6 ? 'tornado' : 'zig'; const y = 160+Math.random()*(H-260);
      st.enemies.push({type:t, x:W+30, y, w:64, h:64, vx: t==='tornado' ? -2.2 : -2.5, vy:(t==='zig'?(Math.random()<0.5?-1:1)*1.2:0), hp: 36, touch:12, f:0});
      play('tornado_whoosh',0.4);
    }
    if(Math.floor(st.t/10000)+1 > st.wave){
      st.wave++;
      if(st.wave%3===0 && st.wave<10) spawnMini();
      if(st.wave===10 && !st.boss) spawnBoss();
    }

    // enemies update
    for(let i=st.enemies.length-1;i>=0;i--){
      const e=st.enemies[i];
      if(e.type==='tornado' || e.type==='zig'){
        e.x += e.vx*dt/16; if(e.type==='zig'){ e.y+= e.vy*dt/16; if(e.y<80||e.y>H-120) e.vy*=-1; }
        e.f += dt*0.02; // animate spin
      } else if(e.type==='mini'){ // titan
        e.x += (-1.0)*dt/16;
        e.atk = (e.atk||0) + dt;
        if(!st.boss){ st.boss=true; st.bossEntity=e; bossbar.style.display='block'; bosslabel.textContent='Elemental Storm Titan'; play('boss_bar_slam',0.6); }
        if(e.hp/e.max < 0.25 && !e.enrage){ e.enrage=true; play('enrage_loop',0.5); }
        const cadence = e.enrage ? 1800 : 2600;
        if(e.atk>cadence && e.tele<=0){ e.tele=600; e.atk=0; play('titan_charge',0.7); }
        if(e.tele>0){ e.tele-=dt; if(e.tele<=0){
          const shots = e.enrage? 3:2;
          for(let k=0;k<shots;k++){
            const ang = (-0.2 + k*0.2) + (Math.random()*0.2-0.1);
            st.bolts.push({x:e.x+e.w*0.5, y:e.y+e.h*0.55, vx:6*Math.cos(ang), vy:6*Math.sin(ang), life:2200, r:6});
            play('bolt_fire',0.7);
          }
        }}
      } else if(e.type==='hurricane'){
        e.x += (-0.8)*dt/16; e.f += dt*0.02;
        if(!st.boss){ st.boss=true; st.bossEntity=e; bossbar.style.display='block'; bosslabel.textContent='Hurricane Lord'; bgmMain.pause(); bgmBoss.currentTime=0; bgmBoss.volume=0.8; bgmBoss.play().catch(()=>{}); play('boss_eye_open',0.6); }
        if(e.hp/e.max < 0.25 && !e.enrage){ e.enrage=true; play('enrage_loop',0.5); }
        const cadence = e.enrage ? 3000 : 4200;
        e.atk = (e.atk||0) + dt;
        if(e.atk>cadence && e.tele<=0){ e.tele=700; e.atk=0; play('boss_eye_open',0.7); }
        if(e.tele>0){ e.tele-=dt; if(e.tele<=0){
          const count = e.enrage? 3:2;
          for(let k=0;k<count;k++){
            const vy = (k%2===0? -1:1) * (1.0 + Math.random()*0.8);
            st.enemies.push({type:'tornado', x:e.x+e.w/2, y:e.y+e.h/2, w:64,h:64, vx:-(3+Math.random()*1.5), vy, hp:36, touch:12, f:0});
            play('mini_spawn',0.6);
          }
        }}
      }
      // player collision
      const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
      if(!(pb.x+pb.w<e.x||pb.x>e.x+e.w||pb.y+pb.h<e.y||pb.y>e.y+e.h)){
        st.p.hp -= e.touch||12;
      }
      // death
      if(e.hp!==undefined && e.hp<=0){
        st.enemies.splice(i,1); play('despawn_puff',0.5);
        if(e.type==='mini' || e.type==='hurricane'){
          st.boss=false; st.bossEntity=null; bossbar.style.display='none'; bgmBoss.pause(); try{bgmMain.play();}catch(err){}
        }
      } else if(e.x<-240){ st.enemies.splice(i,1); }
    }

    // bolts → AOE
    for(let i=st.bolts.length-1;i>=0;i--){
      const b=st.bolts[i]; b.x+=b.vx; b.y+=b.vy; b.life-=dt;
      if(b.x<0||b.x>W||b.y<60||b.y>H-60||b.life<=0){
        st.aoe.push({x:b.x,y:b.y,r:36,life:350}); st.bolts.splice(i,1); play('aoe_burst',0.6); continue;
      }
      const pb={x:st.p.x,y:st.p.y,w:st.p.w,h:st.p.h};
      if(!(pb.x+pb.w<b.x-b.r || pb.x>b.x+b.r || pb.y+pb.h<b.y-b.r || pb.y>b.y+b.r)){
        st.p.hp-=18; st.aoe.push({x:b.x,y:b.y,r:36,life:350}); st.bolts.splice(i,1); play('aoe_burst',0.7);
      }
    }
    for(let i=st.aoe.length-1;i>=0;i--){ const a=st.aoe[i]; a.life-=dt; if(a.life<=0){ st.aoe.splice(i,1); } }

    // axes
    for(let i=st.projectiles.length-1;i>=0;i--){
      const a=st.projectiles[i]; a.x+=a.vx*dt/16; a.y+=a.vy*dt/16; a.vy+=0.02; a.rot=(a.rot||0)+0.3*dt/16;
      for(let j=st.enemies.length-1;j>=0;j--){ const e=st.enemies[j];
        if(!(a.x+a.w<e.x||a.x>e.x+e.w||a.y+a.h<e.y||a.y>e.y+e.h)){
          let dmg=a.dmg||40;
          if(e.type==='mini'){
            const eyeBox={x:e.x+e.w*0.35-8,y:e.y+e.h*0.35-8,w:16,h:16};
            if(e.tele>0 && !(a.x+a.w<eyeBox.x||a.x>eyeBox.x+eyeBox.w||a.y+a.h<eyeBox.y||a.y>eyeBox.y+eyeBox.h)){ dmg*=1.8; play('boss_crit'); } else dmg*=0.3;
          } else if(e.type==='hurricane'){
            const eyeBox={x:e.x+e.w/2-18,y:e.y+e.h/2-18,w:36,h:36};
            if(e.tele>0 && !(a.x+a.w<eyeBox.x||a.x>eyeBox.x+eyeBox.w||a.y+a.h<eyeBox.y||a.y>eyeBox.y+eyeBox.h)){ dmg*=2.0; play('boss_crit'); } else dmg*=0.2;
          }
          e.hp -= dmg; st.projectiles.splice(i,1); play('axe_hit',0.7); break;
        }
      }
      if(a.x<-40||a.x>W+40||a.y>H+40) st.projectiles.splice(i,1);
    }
  }

  function render(){
    drawBackground(16);
    // hero
    drawHero();
    // minions
    for(const e of st.enemies){
      if(e.type==='tornado'){ drawSprite(sprites.tMinion, Math.floor(e.f)%sprites.tMinion.frames, e.x, e.y); }
      else if(e.type==='zig'){ drawSprite(sprites.tZig, Math.floor(e.f*1.3)%sprites.tZig.frames, e.x, e.y); }
      else if(e.type==='mini'){ drawSprite(sprites.titan, (e.tele>0? 6 + Math.floor((st.t/200)%2) : (Math.floor(st.t/140)%6)), e.x, e.y, 1); }
      else if(e.type==='hurricane'){ drawSprite(sprites.hurricane, (e.tele>0? 8 + Math.floor((st.t/180)%4) : (Math.floor(st.t/110)%8)), e.x, e.y, 1); }
    }
    // bolts + aoe
    ctx.fillStyle='#ffe66d'; for(const b of st.bolts){ ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill(); }
    for(const a of st.aoe){ const t=a.life/350; ctx.strokeStyle='rgba(255,230,110,'+(t.toFixed(2))+')'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(a.x,a.y,a.r*(1.2-t*0.6),0,Math.PI*2); ctx.stroke(); }

    // HUD
    ctx.fillStyle='#122032'; ctx.fillRect(16,16,240,12); ctx.fillStyle='#2e95ff'; ctx.fillRect(16,16,240*(st.p.hp/st.p.max),12); ctx.strokeStyle='#2a3b52'; ctx.strokeRect(16,16,240,12);
    ctx.fillStyle='#a3b9cc'; ctx.font='700 16px system-ui'; ctx.fillText('Score: '+st.score, 270, 26); ctx.fillText('Wave: '+st.wave, 360, 26); ctx.fillText('Axes: '+st.p.axe, 440, 26);
    if(st.over){ ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#ff9a9a'; ctx.font='900 42px system-ui'; ctx.textAlign='center'; ctx.fillText('Game Over', W/2, H/2-10); }
  }

  function spawnMini(){
    const e={type:'mini', x:W-140, y:110, w:128,h:128, hp:420, max:420, touch:20};
    st.enemies.push(e);
  }
  function spawnBoss(){
    const e={type:'hurricane', x:W-220, y:40, w:192,h:192, hp:900, max:900, touch:28};
    st.enemies.push(e);
  }

  let last=performance.now(); function frame(ts){ const dt=ts-last; last=ts; if(canvas.style.display!=='none'){ update(dt); render(); } requestAnimationFrame(frame); } requestAnimationFrame(frame);
  startBtn.onclick=()=>{ menu.style.display='none'; canvas.style.display='block'; bossbar.style.display='none'; bgmBoss.pause(); bgmMain.currentTime=0; bgmMain.volume=0.6; bgmMain.play().catch(()=>{}); play('chainsaw_idle',0.25); };
})();