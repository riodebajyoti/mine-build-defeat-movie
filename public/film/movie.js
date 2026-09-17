import {Adventure} from './game/adventure.js';
/** A five-hour, real-time coded movie. No repeated five-minute video loop.
 * Uses original Mine Build Defeat world, villages, villagers, golems,
 * zombies, item artwork and weather. Camera, combat and story are directed.
 */
import {engine as E} from './director.js';
import {buildVillage,updateVillageResidents} from './game/village_builder.js';
import {Monster} from './game/monster.js';
import {getItemCanvas} from './game/item_icons.js';
import {CHAPTERS,DURATION,chapterAt,clock} from './story.js';
const {THREE,scene,world,camera,renderer,canvas,ctx,ambient,sun,moon,weather,hand,state,equip}=E;
E.actor.visible=false;E.villagers.forEach(v=>v.group.visible=false);E.enemies.forEach(v=>v.group.visible=false);E.rain.visible=false;E.starMesh.visible=false;E.sparks.visible=false;
// Build the actual game's village, including five villagers and two golems.
camera.position.set(0,7.5,22);camera.lookAt(0,7.5,0);
buildVillage({camera,world,velocity:new THREE.Vector3(),appendMessage:()=>{},scene,placedBeds:[]});
const people=scene.children.filter(g=>g.userData.villager),golems=scene.children.filter(g=>g.userData.ironGolem);
const cx=people.reduce((a,p)=>a+p.position.x,0)/people.length;
const cz=people.reduce((a,p)=>a+p.position.z,0)/people.length;
const floor=people[0].position.y-.5;
const adventure=new Adventure(scene,{cinematic:true});
const dayPositions=people.map(p=>p.position.clone());
const homes=people.map((_,i)=>new THREE.Vector3(i<3?-10:10,floor+1.1,i%2?-10:10));
const patrol=new THREE.CatmullRomCurve3([[0,-16],[0,-8],[4,-4],[4,4],[0,8],[0,16],[16,16],[16,-16],[0,-16],[-16,-16],[-16,16],[0,16]].map(([x,z])=>new THREE.Vector3(x,floor+2,z)),true,'centripetal');
let time=0,playing=false,muted=false,volume=.65,last=0,frameN=0,hp=100,kills=0,activeWave=-1;
let zombies=[];let lastStep=-1,lastStrike=-1;let audio=null;let snapCamera=true;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const seedRandom=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);};
const targetCamera=new THREE.PerspectiveCamera(75,1280/720,.1,1000);
function say(s,x,y,size=16,color='#fff',align='left'){ctx.font=`${size>25?'bold ':''}${size}px ${size<=15?'monospace':'Arial'}`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y);}
function panel(x,y,w,h){ctx.fillStyle='#06101ccc';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#ffffff30';ctx.strokeRect(x,y,w,h);}
// Procedural soundtrack: a changing score, wind, birds, footsteps, rain,
// thunder, and combat impacts, synthesized locally without external audio.
async function enableSound(){
 if(!audio){
  const ac=new AudioContext();const master=ac.createGain();master.gain.value=volume;master.connect(ac.destination);
  const music=ac.createGain();music.gain.value=.1;music.connect(master);
  const voices=[0,1,2].map(()=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';g.gain.value=.19;o.connect(g).connect(music);o.start();return o;});
  const buffer=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=buffer.getChannelData(0);let a=0;for(let i=0;i<data.length;i++){a=.96*a+.04*(Math.random()*2-1);data[i]=a;}
  const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;const wind=ac.createGain();wind.gain.value=.2;noise.connect(filter).connect(wind).connect(master);noise.start();
  audio={ac,master,music,voices,wind,lastMusic:-1,lastThunder:-1,lastBird:-1};
 }
 await audio.ac.resume();document.querySelector('#sound').style.display=audio.ac.state==='running'?'none':'block';
 audio.master.gain.setTargetAtTime(playing&&!muted?volume:0,audio.ac.currentTime,.1);
}
function tone(freq,duration,gain=.07,type='sine',end=freq){if(!audio||!playing||muted)return;const {ac,master}=audio,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(10,end),ac.currentTime+duration);g.gain.setValueAtTime(gain,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(ac.currentTime+duration);}
function updateSound(night,moving,combat){if(!audio)return;const {ac}=audio;
 const bar=Math.floor(time/12);if(bar!==audio.lastMusic){audio.lastMusic=bar;const roots=[110,130.81,146.83,98];const root=roots[Math.floor(bar/4)%roots.length];audio.voices.forEach((o,i)=>o.frequency.setTargetAtTime(root*[1,night>.5?1.2:1.25,1.5][i],ac.currentTime,2));}
 audio.wind.gain.setTargetAtTime(.08+night*.6,ac.currentTime,1);
 const thunder=Math.floor(time/37);if(night>.6&&time<16400&&thunder!==audio.lastThunder){audio.lastThunder=thunder;tone(47,4,.13,'triangle',20);tone(66,2,.065,'sine',27);}
 const bird=Math.floor(time/19);if(night<.2&&bird!==audio.lastBird){audio.lastBird=bird;tone(1500,.22,.015,'sine',2200);}
 const step=Math.floor(time*1.8);if(moving&&step!==lastStep){lastStep=step;tone(95,.09,.035,'triangle',45);}
 const strike=Math.floor(time*1.2);if(combat&&strike!==lastStrike){lastStrike=strike;tone(180,.12,.075,'triangle',35);}
}
function wave(t){const night=t>=10800&&t<16200;const w=Math.floor((t-10800)/48);
 if(!night){zombies.forEach(z=>scene.remove(z.group));zombies=[];activeWave=-1;return;}
 if(w!==activeWave){zombies.forEach(z=>scene.remove(z.group));activeWave=w;const count=2+(w%3);zombies=Array.from({length:count},(_,i)=>{const z=new Monster(scene,camera.position);z.group.visible=true;z.userData={index:i};return z;});}
 const age=(t-10800)%48;
 zombies.forEach((z,i)=>{const a=seedRandom(w*7+i)*Math.PI*2;const distance=18-clamp(age/(14+i*3))*16;z.group.position.set(Math.sin(a)*distance,floor+.5,Math.cos(a)*distance);z.group.lookAt(0,floor+.5,0);const hitAt=20+i*5;z.group.visible=age<hitAt+2;z.active=z.group.visible;z.hp=age<hitAt?20:10;
 const flash=age>hitAt&&age<hitAt+.14;z.group.children[0].material.color.set(flash?0xff0000:0x2e8b57);
 });kills=Math.max(0,w*3+zombies.filter(z=>!z.group.visible).length);
}
function worldFrame(t,dt){
 adventure.update(dt,camera.position);
 const chapter=chapterAt(t),index=CHAPTERS.indexOf(chapter),local=t-chapter.start;
 const sunset=smooth((t-7900)/2200),night=smooth((t-9400)/1400)*(1-smooth((t-16800)/1200));
 const sky=new THREE.Color('#87ceeb').lerp(new THREE.Color('#e06030'),t>16800?1-smooth((t-16800)/1200):sunset).lerp(new THREE.Color('#050510'),night);scene.background.copy(sky);scene.fog.color.copy(sky);scene.fog.density=night>.8?.045:.014;
 ambient.intensity=1.4-night*1.0;sun.intensity=2*(1-night);moon.intensity=.6*night;
 const mode=night>.8&&t<16400?'storm':'clear';if(weather.weatherType!==mode)weather.setWeather(mode,scene);weather.update(dt,camera.position);
 if(t<9400)updateVillageResidents(dt,t,[]);
 people.forEach((p,i)=>{if(t>=9400){const f=smooth((t-9400)/500);const wander=dayPositions[i];p.position.lerpVectors(wander,homes[i],f);if(t>17400)p.position.lerpVectors(homes[i],wander,smooth((t-17400)/600));p.rotation.y=Math.PI;p.userData.villageMover.legs.forEach((leg,j)=>leg.rotation.x=f<1?Math.sin(t*5+j*Math.PI)*.35:0);}});
 golems.forEach((g,i)=>{g.position.set((i?1:-1)*4+Math.sin(t*.06+i)*1.5,floor+.5,(i?1:-1)*8+Math.cos(t*.06+i)*1.5);g.rotation.y=t*.06;});
 wave(t);
 // Continuous routes along the village crossroads. Each shot has a distinct
 // location and focus; easing prevents sudden camera turns or block-step jumps.
 const shot=Math.floor(t/75),u=(t%75)/75;const a=seedRandom(shot)*Math.PI*2;
 let px,pz,tx,tz,ty=floor+2;
 const combat=t>=10800&&t<16200;
 if(combat){px=Math.sin(t*.18)*2.3;pz=6+Math.cos(t*.13)*1.5;const target=zombies.find(z=>z.group.visible);tx=target?target.group.position.x:Math.sin(t*.11)*8;tz=target?target.group.position.z:12;ty=floor+1.9;}
 else if(t>17100){px=0;pz=5+Math.sin(t*.02);tx=0;tz=-10;}
 else{const path=patrol.getPointAt((t/180)%1);px=path.x;pz=path.z;
 const focus=people[shot%people.length];tx=focus.position.x;tz=focus.position.z;
 if(index>=2&&index<=8&&shot%3===0){tx=px+Math.sin(a)*14;tz=pz+Math.cos(a)*14;ty=floor+1.3;}}
 let viewY=floor+2;
 // Daytime expeditions depart and return along continuous, eased routes.
 if(index>=2&&index<=8){
  const stops=[[-25,-9],[-27,25],[22,-23],[24,0],[-27,25],[24,0],[-25,-9]];
  const [sx,sz]=stops[index-2];const phase=local/900;
  const travel=smooth(phase<.25?phase/.25:phase>.75?(1-phase)/.25:1);
  const orbit=Math.sin(Math.max(0,phase-.25)*Math.PI*4)*2;
  px=THREE.MathUtils.lerp(0,sx+orbit,travel);pz=THREE.MathUtils.lerp(-16,sz-7,travel);
  if((index===5||index===7)&&phase>=.25&&phase<=.75){const angle=(phase-.25)*Math.PI*4;px=sx+Math.sin(angle)*8;pz=sz-Math.cos(angle)*7;}
  tx=sx;tz=sz;ty=6;
  let terrain=4;for(let y=28;y>=0;y--)if(world.blocks.has(`${Math.round(px)},${y},${Math.round(pz)}`)){terrain=y;break;}
  viewY=Math.max(floor+2,terrain+2.2);
 }
 const desired=new THREE.Vector3(px,viewY+Math.sin(t*7)*.018,pz);targetCamera.position.copy(desired);targetCamera.lookAt(tx,ty,tz);
 if(snapCamera){camera.position.copy(desired);camera.quaternion.copy(targetCamera.quaternion);snapCamera=false;}
 else{camera.position.lerp(desired,1-Math.exp(-2.6*dt));camera.quaternion.slerp(targetCamera.quaternion,1-Math.exp(-2.2*dt));}
 const held=index>=2&&index<10?(index%2?'Stone':'Wood'):'';equip(held);state.selectedSlot=held==='Stone'?1:2;
 const swing=combat?Math.max(0,Math.sin(t*7))**6:0;hand.position.set(.5-swing*.15,-.4+Math.sin(t*7)*.025-swing*.2,-.8-swing*.15);hand.rotation.set(-swing*1.1,swing*.4,0);
 hp=combat?Math.max(18,Math.round(96-(t-10800)/5400*73-8*Math.sin(t*.09)**8)):t>=16200?18:100;
 updateSound(night,t<17100,combat&&((t-10800)%48)>16&&((t-10800)%48)<35);
 renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,1280,720);
 if(combat){const g=ctx.createRadialGradient(640,360,240,640,360,760);g.addColorStop(0,'#80000000');g.addColorStop(1,`rgba(180,0,0,${(100-hp)/270})`);ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);}
 // Faithful first-person HUD colors, inventory artwork and circular crosshair.
 say('HP',20,27,11,'#00f3ff');say('ENERGY',20,65,11,'#00f3ff');[[34,'#ff4d4d',hp],[72,'#4d94ff',100]].forEach(([y,c,v])=>{ctx.fillStyle='#ffffff15';ctx.fillRect(20,y,250,8);ctx.fillStyle=c;ctx.fillRect(20,y,250*v/100,8);});
 ctx.strokeStyle='#ffffffb0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(640,360,5,0,Math.PI*2);ctx.stroke();
 panel(1020,20,240,30);say(night>.8?(mode==='storm'?'NIGHT / STORM':'NIGHT / CLEAR'):t>16800?'SECOND MORNING / CLEAR':sunset>.3?'SUNSET / CLEAR':'MORNING / CLEAR',1247,40,12,'#00f3ff','right');
 panel(490,616,300,68);['Dirt','Stone','Wood','Steel','Cores'].forEach((name,i)=>{const x=500+i*58;ctx.fillStyle='#0007';ctx.fillRect(x,626,48,48);ctx.strokeStyle=i===state.selectedSlot?'#00f3ff':'#777';ctx.strokeRect(x,626,48,48);ctx.imageSmoothingEnabled=false;ctx.drawImage(getItemCanvas(name),x+6,632,36,36);});ctx.imageSmoothingEnabled=true;
 panel(20,623,390,66);say(chapter.objective.toUpperCase(),33,649,14,'#00f3ff');say(clock(t)+' / 05:00:00',33,674,14,'#cad9e0');
 panel(918,594,342,105);say('♥',932,642,30,'#6bd69a');say(combat&&hp<35?'CRITICAL: KEEP MOVING':t>=16200?'VILLAGERS SAFE':'SURVIVAL MISSION',978,630,13,'#00f3ff');say(t>=16200?'The village is still standing.':combat?'Protect the villagers.':'Prepare before the storm.',978,657,13,'#dde5ed');
 // Story beats occupy short intervals, leaving most of the view clear.
 const beat=Math.floor(local/90),beatAge=local%90;
 if(beatAge<12){const lines=[chapter.line,chapter.objective+'. Keep the village close.',combat?'The storm cannot last forever. Keep moving.':'Every supply we gather gives us another chance.',combat?'Listen. There is another one out there.':'We will be ready when the light is gone.'];const line=lines[beat%lines.length];panel(240,524,800,55);say(`${chapter.speaker}: ${line}`,640,558,18,'#fff','center');}
 if(local<9){ctx.globalAlpha=Math.min(1,local/1.5,Math.max(0,(9-local)/2));panel(320,210,640,180);say(`CHAPTER ${String(index+1).padStart(2,'0')} / 20`,640,256,14,'#00f3ff','center');say(chapter.title.toUpperCase(),640,317,38,'#fff','center');say(chapter.objective,640,357,18,'#becbd6','center');ctx.globalAlpha=1;}
 if(t>17935){const alpha=clamp((t-17935)/8);ctx.globalAlpha=alpha;panel(260,180,760,300);say('NIGHT SURVIVED',640,250,48,'#00f3ff','center');say('Second morning. Five villagers safe.',640,305,24,'#fff','center');say('MINE BUILD DEFEAT',640,365,20,'#c4d7e2','center');say('Original game by riodebajyoti',640,402,16,'#c4d7e2','center');say('A scripted, procedurally animated survival movie',640,440,15,'#95a7b3','center');ctx.globalAlpha=1;}
 return {time:t,duration:DURATION,chapter:index,hp,villagers:people.length,night:night>.8,playing,muted,volume};
}
function notify(){parent.postMessage({type:'movie-state',time,duration:DURATION,playing,muted,volume,chapter:Math.min(19,Math.floor(time/900))},location.origin);}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;const m=e.data;
 if(m.type==='movie-play'){playing=true;enableSound().catch(()=>document.querySelector('#sound').style.display='block');}
 if(m.type==='movie-pause'){playing=false;if(audio)audio.master.gain.setTargetAtTime(0,audio.ac.currentTime,.05);}
 if(m.type==='movie-seek'){time=clamp(Number(m.time)||0,0,DURATION);snapCamera=true;activeWave=-1;worldFrame(time,0);}
 if(m.type==='movie-volume'){volume=clamp(Number(m.volume));muted=volume===0;if(audio)audio.master.gain.setTargetAtTime(playing?volume:0,audio.ac.currentTime,.05);}
 notify();});
document.querySelector('#sound').onclick=()=>enableSound();
window.addEventListener('pagehide',()=>audio?.ac.close());
function tick(now){const wasPlaying=playing;const elapsed=Math.max(0,(now-last)/1000||0);const dt=Math.min(.05,elapsed);last=now;if(playing){time=Math.min(DURATION,time+elapsed);if(time>=DURATION){playing=false;if(audio)audio.master.gain.setTargetAtTime(0,audio.ac.currentTime,1);}}if(wasPlaying||frameN===0)worldFrame(time,Math.max(dt,1/60));if(frameN++%30===0)notify();requestAnimationFrame(tick);}
worldFrame(0,0);requestAnimationFrame(tick);parent.postMessage({type:'movie-ready',duration:DURATION},location.origin);

// Local production validation checks movie states without advancing playback.
if(new URLSearchParams(location.search).has('validate')){
 const results=[];for(const t of [0,4500,9000,12500,16500,17999,18000]){snapCamera=true;results.push(worldFrame(t,0));}
 await fetch('/result',{method:'POST',body:JSON.stringify({kind:'five-hour-movie',duration:DURATION,chapters:CHAPTERS.length,states:results})});
 snapCamera=true;worldFrame(0,0);await fetch('/poster',{method:'POST',body:await new Promise(r=>canvas.toBlob(r,'image/jpeg',.92))});
}
