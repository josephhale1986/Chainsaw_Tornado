// Chainsaw Tornado - Single-file game logic
// Focus: stability on mobile & desktop. No external assets; uses data URIs & procedural audio.

(()=>{
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const DPR = Math.max(1, Math.min(2, Math.floor(window.devicePixelRatio||1)));
  // Fit crisp
  canvas.width = W*DPR; canvas.height = H*DPR; canvas.style.width = W+"px"; canvas.style.height = H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);

  // UI
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const hsDiv = document.getElementById('hs');

  // Highscores
  const HS_KEY = "ct_highscores_v2";
  const highs = JSON.parse(localStorage.getItem(HS_KEY)||"[]").slice(0,5);
  function pushScore(score){
    highs.push(score); highs.sort((a,b)=>b-a); highs.splice(5);
    localStorage.setItem(HS_KEY, JSON.stringify(highs));
    updateHS();
  }
  function updateHS(){ hsDiv.textContent = "High Scores: " + (highs.join(" · ")||"—"); }
  updateHS();

  // Input
  const keys = {};
  window.addEventListener('keydown', e=>{
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase()==='p') togglePause();
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });

  // Mobile joystick + attack
  const stick = document.getElementById('stick');
  const nub = document.getElementById('nub');
  const attackBtn = document.getElementById('attackBtn');
  let joy = {active:false, x:0, y:0};
  function handleStick(e){
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const t = (e.touches? e.touches[0] : e);
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const max = rect.width*0.45;
    const mag = Math.hypot(dx,dy);
    const cl = mag>max ? max/mag : 1;
    const nx = dx*cl, ny = dy*cl;
    joy.x = nx/max; joy.y = ny/max;
    nub.style.transform = `translate(${nx}px, ${ny}px)`;
  }
  function endStick(){
    joy = {active:false, x:0, y:0};
    nub.style.transform = `translate(0px, 0px)`;
  }
  ['mousedown','touchstart'].forEach(ev=> stick.addEventListener(ev, e=>{ joy.active=true; handleStick(e);}));
  ['mousemove','touchmove'].forEach(ev=> stick.addEventListener(ev, e=>{ if(joy.active) handleStick(e);}));
  ['mouseup','mouseleave','touchend','touchcancel'].forEach(ev=> stick.addEventListener(ev, e=> endStick()));

  attackBtn.addEventListener('mousedown', ()=> attack());
  attackBtn.addEventListener('touchstart', e=>{ e.preventDefault(); attack(); });

  // Sprites as data URIs (SVG-based)
  function svgURI(svg){ return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); }

  const playerImg = new Image();
  playerImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <rect x="14" y="8" width="20" height="18" fill="#d2f2ff" stroke="#22324a" stroke-width="2"/>
    <circle cx="24" cy="10" r="6" fill="#ffd1b3" stroke="#22324a" stroke-width="2"/>
    <rect x="6" y="26" width="36" height="6" fill="#dfe7ef" stroke="#22324a" stroke-width="2"/>
    <rect x="10" y="28" width="10" height="4" fill="#c54d4d"/>
    <rect x="28" y="28" width="12" height="4" fill="#bbb"/>
    <line x1="30" y1="28" x2="38" y2="32" stroke="#888" stroke-width="1"/>
    <line x1="30" y1="32" x2="38" y2="28" stroke="#888" stroke-width="1"/>
  </svg>`);

  const tornadoImg = new Image();
  tornadoImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path d="M8,10 C18,6 30,6 40,10 C34,14 22,16 18,18 C10,22 28,24 32,26 C22,28 16,30 24,34 C18,36 14,38 20,42"
      fill="none" stroke="#9ec7ff" stroke-width="3"/>
  </svg>`);

  const miniBossImg = new Image();
  miniBossImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="20" r="14" fill="#f0d0d0" stroke="#442" stroke-width="2"/>
    <rect x="10" y="30" width="44" height="12" fill="#b0c8f8" stroke="#224" stroke-width="2"/>
    <rect x="16" y="42" width="32" height="10" fill="#c33"/>
  </svg>`);

  const bossImg = new Image();
  bossImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <ellipse cx="48" cy="30" rx="30" ry="20" fill="#f5e1a8" stroke="#553" stroke-width="3"/>
    <rect x="8" y="48" width="80" height="18" fill="#d0e7ff" stroke="#224" stroke-width="3"/>
    <rect x="24" y="66" width="48" height="16" fill="#a33"/>
    <circle cx="34" cy="26" r="4" fill="#000"/>
    <circle cx="62" cy="26" r="4" fill="#000"/>
  </svg>`);

  const heartImg = new Image();
  heartImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 21s-7-4.35-9.33-7.87C.8 10.3 2.22 6.5 5.54 6.1c2.07-.26 3.58 1.02 4.46 2.07.88-1.05 2.39-2.33 4.46-2.07 3.32.4 4.74 4.2 2.87 7.03C19 16.65 12 21 12 21z"
      fill="#ff6b7d" stroke="#851" stroke-width="1"/>
  </svg>`);

  const boltImg = new Image();
  boltImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M13 2L3 14h7l-1 8 10-12h-7z" fill="#ffe66d" stroke="#a86" stroke-width="1"/>
  </svg>`);

  const sawImg = new Image();
  sawImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="10" width="14" height="4" fill="#ddd" stroke="#777"/>
    <rect x="14" y="9" width="8" height="6" fill="#aaa" stroke="#777"/>
  </svg>`);

  const shieldImg = new Image();
  shieldImg.src = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 2 L20 6 L18 16 L12 22 L6 16 L4 6 Z" fill="#9ee" stroke="#077" stroke-width="1"/>
  </svg>`);

  // Audio (procedural)
  let audioCtx;
  function sfx(freq=220, type='square', time=0.08, gain=0.05){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      setTimeout(()=>{o.stop();}, time*1000);
    }catch(e){/* ignore */}
  }
  function musicStart(){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      const tempo = 112;
      const loop = audioCtx.createGain(); loop.connect(audioCtx.destination); loop.gain.value = 0.03;
      const notes = [220, 277, 330, 277, 247, 220, 196, 165];
      let t = audioCtx.currentTime + 0.1;
      for(let bar=0; bar<64; bar++){
        for(let i=0;i<notes.length;i++){
          const o=audioCtx.createOscillator();
          o.type='triangle'; o.frequency.value = notes[(i+bar)%notes.length];
          const g=audioCtx.createGain(); g.gain.value=0.0001;
          o.connect(g); g.connect(loop);
          o.start(t); g.gain.exponentialRampToValueAtTime(0.04, t+0.16);
          o.stop(t+0.18);
          t += 60/tempo/2;
        }
      }
    }catch(e){/* */}
  }

  // Game State
  const state = {
    running:false, paused:false, over:false,
    t:0, score:0, wave:1,
    player:{x:120,y:H-140, vx:0, vy:0, w:42,h:42, hp:100, maxhp:100, speed:3.4, facing:1, cooldown:0, sawLevel:1, shield:0},
    enemies:[], bullets:[], powerups:[], particles:[],
    nextSpawn: 0, spawnRate: 1200,
    nextPower: 6000,
  };

  function reset(){
    state.running=false; state.paused=false; state.over=false;
    state.t=0; state.score=0; state.wave=1;
    state.player = {x:120,y:H-140, vx:0, vy:0, w:42,h:42, hp:100, maxhp:100, speed:3.4, facing:1, cooldown:0, sawLevel:1, shield:0};
    state.enemies.length=0; state.bullets.length=0; state.powerups.length=0; state.particles.length=0;
    state.nextSpawn = 0; state.spawnRate=1200; state.nextPower = 4000;
    drawSplash();
  }

  function drawSplash(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0e1620'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#8fd3ff';
    ctx.font='900 48px system-ui, sans-serif';
    ctx.textAlign='center';
    ctx.fillText('Chainsaw Tornado', W/2, H/2 - 40);
    ctx.font='400 18px system-ui, sans-serif';
    ctx.fillStyle = '#a3b9cc';
    ctx.fillText('Press Start — WASD / Arrows move, Space attack, P pause', W/2, H/2 + 10);
  }

  function start(){
    if(!state.running){ state.running = true; state.paused=false; state.over=false; musicStart(); }
  }
  function togglePause(){
    if(!state.running || state.over) return;
    state.paused = !state.paused;
  }
  function endGame(){
    state.over = true; state.running=false;
    pushScore(state.score);
    sfx(120,'sawtooth',0.2,0.09);
  }

  function attack(){
    if (state.player.cooldown>0) return;
    const p = state.player;
    const reach = 48 + (p.sawLevel-1)*16;
    const dmg = 14 + (p.sawLevel-1)*6;
    // sweep hitbox
    const hit = {x:p.x + (p.facing>0? p.w: -reach), y:p.y, w:reach, h:p.h};
    state.enemies.forEach(e=>{
      if (AABB(hit,e)){
        e.hp -= dmg;
        sfx(660,'square',0.05,0.04);
        for(let i=0;i<6;i++) addParticle(e.x+e.w/2,e.y+e.h/2);
      }
    });
    p.cooldown = Math.max(200 - p.sawLevel*30, 80);
  }

  // Power-ups
  const POWERS = ['HEALTH','SPEED','SAW','SHIELD'];
  function spawnPower(){
    const k = POWERS[Math.floor(Math.random()*POWERS.length)];
    state.powerups.push({x: W+10, y: 200+Math.random()*(H-260), w:28, h:28, k, vx: -2.2});
  }
  function applyPower(k){
    const p = state.player;
    if(k==='HEALTH') p.hp = Math.min(p.maxhp, p.hp + 30);
    if(k==='SPEED') p.speed = Math.min(6.0, p.speed + 0.4);
    if(k==='SAW') p.sawLevel = Math.min(5, p.sawLevel+1);
    if(k==='SHIELD') p.shield = 3000;
    sfx(880,'triangle',0.12,0.06);
  }

  // Enemies
  function spawnEnemy(){
    const type = chooseEnemy();
    if(type==='tornado'){
      state.enemies.push({type, x:W+20, y: 240+Math.random()*140, w:44,h:44, vx: -(2+Math.random()*1.5), hp:28, touch:12});
    }else if(type==='zig'){
      state.enemies.push({type, x:W+20, y: 120+Math.random()*280, w:40,h:40, vx:-2.5, vy:(Math.random()<0.5?-1:1)*1.2, hp:36, touch:12, t:0});
    }
  }
  function chooseEnemy(){
    return Math.random()<0.6? 'tornado' : 'zig';
  }

  function spawnBoss(){
    const wave = state.wave;
    if (wave%3===0 && wave<10){
      // mini boss
      state.enemies.push({type:'mini', x:W-120, y: 120, w:96,h:72, vx:-1.2, hp:260, touch:22, phase:0});
    } else if (wave===10){
      state.enemies.push({type:'boss', x:W-180, y: 60, w:150,h:110, vx:-0.9, hp:600, touch:30, phase:0});
    }
  }

  // Physics utils
  function AABB(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  // Particles
  function addParticle(x,y){
    state.particles.push({x,y, vx:(Math.random()*2-1)*2, vy:(Math.random()*-2), life: 400});
  }

  // Loop
  let last=performance.now();
  function loop(ts){
    const dt = ts - last; last = ts;
    if (state.running && !state.paused && !state.over){
      update(dt);
      render();
    } else if(state.over){
      render(); // show final frame
      drawGameOver();
    } else if(state.paused){
      render();
      drawPaused();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function update(dt){
    state.t += dt;
    const p = state.player;
    // Input
    const left = keys['arrowleft']||keys['a'] || (joy.x< -0.2);
    const right = keys['arrowright']||keys['d'] || (joy.x> 0.2);
    const up = keys['arrowup']||keys['w'] || (joy.y< -0.2);
    const down = keys['arrowdown']||keys['s'] || (joy.y> 0.2);
    if (keys[' ']) attack();

    p.vx = (right?1:0) - (left?1:0);
    p.vy = (down?1:0) - (up?1:0);
    const spd = p.speed;
    p.x += p.vx*spd*dt/16; p.y += p.vy*spd*dt/16;
    if (p.vx!==0) p.facing = p.vx>0?1:-1;
    p.x = clamp(p.x, 16, W-16-p.w);
    p.y = clamp(p.y, 60, H-80-p.h);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.shield = Math.max(0, p.shield - dt);

    // Spawns
    if (state.t > state.nextSpawn){
      spawnEnemy();
      const base = Math.max(300, state.spawnRate - state.wave*40);
      state.nextSpawn = state.t + base + Math.random()*400;
    }
    if (state.t > state.nextPower){
      spawnPower();
      state.nextPower = state.t + 6000 + Math.random()*5000;
    }

    // Wave & boss logic
    if (Math.floor(state.t/10000)+1 > state.wave){
      state.wave++;
      sfx(220,'square',0.15,0.07);
      if (state.wave%3===0 || state.wave===10) spawnBoss();
    }

    // Enemies update
    for (let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i];
      if (e.type==='tornado'){
        e.x += e.vx*dt/16;
      } else if (e.type==='zig'){
        e.x += e.vx*dt/16; e.y += e.vy*dt/16; e.t += dt;
        if (e.y<80 || e.y>H-120) e.vy*=-1;
      } else if (e.type==='mini'){
        e.x += e.vx*dt/16;
        if (Math.random()<0.01) state.enemies.push({type:'tornado', x:e.x, y:e.y+e.h-40, w:40,h:40, vx:-3, hp:24, touch:10});
      } else if (e.type==='boss'){
        e.x += e.vx*dt/16;
        if (Math.random()<0.02) state.enemies.push({type:'zig', x:e.x, y:e.y+e.h-30, w:40,h:40, vx:-2.6, vy: (Math.random()<0.5?-1:1)*1.4, hp:42, touch:14});
      }
      // collide with player
      const pbox = {x:p.x,y:p.y,w:p.w,h:p.h};
      if (AABB(e,pbox)){
        if (p.shield<=0){
          p.hp -= e.touch;
          sfx(100,'sawtooth',0.06,0.06);
        }
        e.x += 20*(p.x<e.x?1:-1);
        addParticle(p.x+p.w/2,p.y+p.h/2);
        if (p.hp<=0) endGame();
      }
      if (e.hp<=0){
        state.score += (e.type==='mini'? 100 : e.type==='boss'? 300 : 20);
        state.enemies.splice(i,1);
        sfx(520,'square',0.09,0.06);
        for(let j=0;j<12;j++) addParticle(e.x+e.w/2,e.y+e.h/2);
      } else if (e.x < -100){ state.enemies.splice(i,1); }
    }

    // Powerups
    for(let i=state.powerups.length-1;i>=0;i--){
      const a = state.powerups[i];
      a.x += a.vx*dt/16;
      if (AABB(a, {x:p.x,y:p.y,w:p.w,h:p.h})){
        applyPower(a.k);
        state.powerups.splice(i,1);
      } else if (a.x<-40){ state.powerups.splice(i,1); }
    }

    // Particles
    for(let i=state.particles.length-1;i>=0;i--){
      const pa = state.particles[i];
      pa.x += pa.vx; pa.y += pa.vy; pa.vy += 0.02; pa.life -= dt;
      if (pa.life<=0) state.particles.splice(i,1);
    }
  }

  function render(){
    // Sky
    ctx.fillStyle = '#0f1722'; ctx.fillRect(0,0,W,H);
    // Ground
    ctx.fillStyle = '#0b1119'; ctx.fillRect(0,H-72,W,72);
    // HUD
    drawHUD();

    // Powerups
    for(const a of state.powerups){
      const img = a.k==='HEALTH'?heartImg: a.k==='SPEED'?boltImg: a.k==='SAW'?sawImg: shieldImg;
      ctx.drawImage(img, a.x, a.y, a.w, a.h);
    }

    // Player
    const p = state.player;
    ctx.save();
    ctx.translate(p.x + (p.facing<0? p.w:0), p.y);
    ctx.scale(p.facing, 1);
    ctx.drawImage(playerImg, 0, 0, p.w, p.h);
    // Chainsaw swing indicator (cooldown)
    const cd = p.cooldown/300;
    if (cd>0){
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#a3b9cc';
      ctx.fillRect(0, p.h+3, p.w*(1-cd), 4);
    }
    ctx.restore();
    if (p.shield>0){
      ctx.globalAlpha = 0.25 + 0.15*Math.sin(state.t*0.02);
      ctx.drawImage(shieldImg, p.x-6, p.y-6, p.w+12, p.h+12);
      ctx.globalAlpha = 1;
    }

    // Enemies
    for(const e of state.enemies){
      if (e.type==='tornado') ctx.drawImage(tornadoImg, e.x, e.y, e.w, e.h);
      else if (e.type==='zig'){
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.sin(e.t*0.01)*0.2);
        ctx.drawImage(tornadoImg, -2, -2, e.w+4, e.h+4);
        ctx.restore();
      } else if (e.type==='mini') ctx.drawImage(miniBossImg, e.x, e.y, e.w, e.h);
      else if (e.type==='boss') ctx.drawImage(bossImg, e.x, e.y, e.w, e.h);
    }

    // Particles
    for(const pa of state.particles){
      ctx.globalAlpha = Math.max(0, pa.life/400);
      ctx.fillStyle = '#d3e7ff';
      ctx.fillRect(pa.x, pa.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // Overlays
    if (!state.running && !state.over) drawSplash();
  }

  function drawHUD(){
    const p = state.player;
    // HP bar
    ctx.fillStyle = '#122032'; ctx.fillRect(16,16,220,12);
    ctx.fillStyle = '#2e95ff'; ctx.fillRect(16,16,220*(p.hp/p.maxhp),12);
    ctx.strokeStyle = '#2a3b52'; ctx.strokeRect(16,16,220,12);
    // Score & wave
    ctx.fillStyle = '#a3b9cc';
    ctx.font='700 16px system-ui, sans-serif';
    ctx.fillText(`Score: ${state.score}`, 260, 26);
    ctx.fillText(`Wave: ${state.wave}`, 360, 26);
    // Shield indicator
    if (p.shield>0){
      ctx.fillText(`Shield: ${(p.shield/1000).toFixed(1)}s`, 440, 26);
    }
  }

  function drawPaused(){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#8fd3ff'; ctx.font='900 42px system-ui'; ctx.textAlign='center';
    ctx.fillText('Paused', W/2, H/2);
    ctx.restore();
  }

  function drawGameOver(){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff9a9a'; ctx.font='900 42px system-ui'; ctx.textAlign='center';
    ctx.fillText('Game Over', W/2, H/2-10);
    ctx.fillStyle='#a3b9cc'; ctx.font='400 18px system-ui';
    ctx.fillText(`Final Score: ${state.score}`, W/2, H/2+24);
    ctx.restore();
  }

  // Buttons
  startBtn.onclick = ()=> { start(); };
  pauseBtn.onclick = ()=> { togglePause(); };
  resetBtn.onclick = ()=> { reset(); };

  // Initial
  reset();
})();
