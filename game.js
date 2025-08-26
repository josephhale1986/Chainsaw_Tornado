const startBtn=document.getElementById('startBtn');
const scoresBtn=document.getElementById('scoresBtn');
const menu=document.getElementById('menu');
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const bgmMain=document.getElementById('bgmMain');
const bgmBoss=document.getElementById('bgmBoss');
let playing=false, boss=false;

startBtn.onclick=()=>{menu.style.display='none';canvas.style.display='block';bgmMain.play();playing=true;loop();};
function loop(){if(!playing)return;ctx.fillStyle='#123';ctx.fillRect(0,0,canvas.width,canvas.height);requestAnimationFrame(loop);}
function triggerBoss(){bgmMain.pause();bgmBoss.play();boss=true;}
