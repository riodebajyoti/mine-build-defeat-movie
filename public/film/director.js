/** SURVIVE THE NIGHT — deterministic 300-second coded cinematic.
 * Uses original Mine Build Defeat VoxelWorld, state and Monster modules.
 * This is a scripted recreation, not a recording of an unmodified play session.
 * The night is compressed; camera, actor, enemy paths and damage are directed.
 * Render frame(t) for live playback or exportFilm() for a 30fps WebM.
 */
import * as THREE from 'three';
import {createVillagers} from './villagers.js';
import {VoxelWorld} from './game/world.js';
import {WeatherSystem} from './game/weather.js';
import {getItemCanvas} from './game/item_icons.js';
import {Monster} from './game/monster.js';
import {state} from './game/state.js';
import {Muxer, ArrayBufferTarget} from './vendor/webm-muxer.mjs';
export const DURATION = 300;
export const FPS = 30;
let seed = 3817;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
Math.random = random;
const W=1280,H=720;
const canvas=document.querySelector('#film'), ctx=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b87959');scene.fog=new THREE.FogExp2('#b87959',.05);
const camera=new THREE.PerspectiveCamera(75,W/H,.1,180);
const ambient=new THREE.AmbientLight(0x404040,1.5);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffc394,2.3);sun.position.set(-40,30,-25);scene.add(sun);
const moon=new THREE.DirectionalLight(0x97bbff,1.2);moon.position.set(15,30,10);scene.add(moon);
const world=new VoxelWorld(scene);
for(let x=-2;x<=2;x++) for(let z=-2;z<=2;z++)world.generateChunk(x,z);
state.gameMode='survival';state.showHelperMsg=()=>{};
function ground(x,z){for(let y=30;y>=-10;y--){let k=world.blocks.get(`${Math.round(x)},${y},${Math.round(z)}`);if(k&&k!=='Wood'&&k!=='Leaves'&&k!=='Water')return y+.5;}return 4.5;}
const home=new THREE.Vector3(-5,ground(-5,-5),-5);
const villagers=createVillagers(scene);
const actor=new THREE.Group();actor.visible=false;scene.add(actor);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.9});
const skin=mat('#d7a078'),shirt=mat('#f4af35'),pants=mat('#203f58'),hair=mat('#302a25');
function box(w,h,d,m,x,y,z,parent=actor){let b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);parent.add(b);return b;}
box(.62,.8,.34,shirt,0,1.08,0);box(.49,.49,.46,skin,0,1.76,0);box(.51,.17,.48,hair,0,1.99,0);
box(.065,.065,.02,mat('#19262d'),-.115,1.79,.235);box(.065,.065,.02,mat('#19262d'),.115,1.79,.235);
const arms=[box(.21,.73,.23,shirt,-.44,1.1,0),box(.21,.73,.23,shirt,.44,1.1,0)];
const legs=[box(.25,.68,.28,pants,-.17,.35,0),box(.25,.68,.28,pants,.17,.35,0)];
const tool=new THREE.Group();actor.add(tool);box(.08,.68,.08,mat('#704620'),.56,1.03,.36,tool);box(.52,.11,.13,mat('#bec8cf'),.56,1.37,.36,tool);
const trees=[...world.blocks].filter(([k,v])=>v==='Wood').map(([k])=>k.split(',').map(Number)).filter(p=>p[0]>-27&&p[0]<15&&p[2]>-25&&p[2]<13).sort((a,b)=>Math.hypot(a[0]+5,a[2]+5)-Math.hypot(b[0]+5,b[2]+5));
const mineTargets=trees.slice(0,26);
const blocks=[];for(let y=0;y<2;y++)for(let x=-1;x<=1;x++)blocks.push([-5+x,home.y+.5+y,-7]);
for(let y=0;y<2;y++)for(let z=-6;z<=-4;z++){blocks.push([-7,home.y+.5+y,z]);blocks.push([-3,home.y+.5+y,z]);}
for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)blocks.push([-5+x,home.y+3.5,-5+z]);
// 26 harvested blocks build a 26-block shelter; leave one roof opening.
blocks.length=26;
let mined=0,built=0,lastT=-1;
const smoothPosition=new THREE.Vector3();
const smoothRotation=new THREE.Quaternion();
let cameraInitialized=false;
scene.add(camera);
const hand=new THREE.Group();hand.position.set(.5,-.4,-.8);camera.add(hand);
let held=null;function equip(name){if(name===held)return;held=name;hand.clear();let mesh;
 if(name){const tex=new THREE.CanvasTexture(getItemCanvas(name));tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;const face=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.05,depthTest:false}),edge=new THREE.MeshBasicMaterial({color:0x383838,depthTest:false});mesh=new THREE.Mesh(new THREE.BoxGeometry(.52,.52,.075),[edge,edge,edge,edge,face,face]);mesh.renderOrder=999;mesh.rotation.set(-.1,-Math.PI/6,.08);}
 else{mesh=new THREE.Mesh(new THREE.BoxGeometry(.15,.5,.15),new THREE.MeshStandardMaterial({color:0xd2b48c,roughness:.6}));mesh.position.set(0,-.1,0);mesh.rotation.set(-.4,-.2,-.1);}hand.add(mesh);}
const weather=new WeatherSystem(scene);weather._triggerLightning=()=>{};
let weatherMode='clear';

const enemies=Array.from({length:6},()=>{const m=new Monster(scene,home);m.group.visible=false;return m;});
const sparks=new THREE.Group();scene.add(sparks);
for(let i=0;i<18;i++)box(.08,.08,.08,mat(i%2?'#edbd75':'#796246'),0,0,0,sparks);
const rainCount=800,rainPositions=new Float32Array(rainCount*6);
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xa3c4e3,transparent:true,opacity:.35}));scene.add(rain);
const starsGeo=new THREE.BufferGeometry();const stars=[];for(let i=0;i<380;i++)stars.push((random()-.5)*180,35+random()*50,(random()-.5)*180);starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));const starMesh=new THREE.Points(starsGeo,new THREE.PointsMaterial({size:.12,color:0xd0e8ff}));scene.add(starMesh);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function text(s,x,y,size=20,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`${size>=32?700:500} ${size}px ${size<18?'monospace':'Arial'}`;ctx.textAlign=align;ctx.fillText(s,x,y);}
const chapters=[
[0,'A NEW MORNING','Gather supplies. Build shelter. Stay alive after dark.'],
[18,'GATHER BEFORE DARK','Wood first. Stay close to the clearing.'],
[72,'BUILD A SAFE PLACE','Walls up. Leave room to see what is coming.'],
[125,'NIGHTFALL','The storm arrives. Movement beyond the trees.'],
[145,'HOLD YOUR GROUND','Keep moving. Two hits bring down each zombie.'],
[245,'THE LAST WATCH','Still standing. Watch the tree line.'],
[277,'NIGHT SECURED','The shelter is secure. You are still alive.']];
function chapter(t){return chapters.filter(c=>t>=c[0]).at(-1);}
function applyEvents(t){
 const n=Math.floor(clamp((t-22)/48)*26);
 while(mined<n){const p=mineTargets[mined++];if(!p)throw Error('Not enough timber');world.mineBlock(null,new THREE.Vector3(p[0],p[1]+.5,p[2]),new THREE.Vector3(0,1,0));}
 const b=Math.floor(clamp((t-78)/44)*26);
 state.selectedSlot=2;
 while(built<b){const p=blocks[built++];world.placeBlockAt(...p);}
}
function pose(t){
 villagers.forEach((v,i)=>{
  const retreat=smooth((t-112)/20),a=t*.11+i*2.1;
  const dayX=-7+i*2+Math.sin(a)*2,dayZ=-1+Math.cos(a)*2;
  const x=THREE.MathUtils.lerp(dayX,-6+i,retreat),z=THREE.MathUtils.lerp(dayZ,-5.3,retreat);
  v.group.position.set(x,ground(x,z)+.12,z);
  v.group.rotation.y=retreat>.99?Math.PI:a;
  v.legs[0].rotation.x=(1-retreat)*Math.sin(t*5+i)*.4;v.legs[1].rotation.x=-v.legs[0].rotation.x;
 });
 let pos=home.clone(),target=home.clone().add(new THREE.Vector3(0,1,3)),walking=false;
 if(t<18){pos.set(-11+6*smooth(t/18),0,3-8*smooth(t/18));walking=true;}
 else if(t<72){const f=clamp((t-18)/52)*25;const i=Math.min(25,Math.floor(f));const p=mineTargets[i],prev=mineTargets[Math.max(0,i-1)];const a=smooth((f%1)*3);pos.set(THREE.MathUtils.lerp(prev[0]-1.5,p[0]-1.5,a),0,THREE.MathUtils.lerp(prev[2]+1.6,p[2]+1.6,a));target.set(...p);walking=f%1<.32;}
 else if(t<125){const angle=(t-72)*.08;pos.set(home.x+Math.cos(angle)*4,0,home.z+Math.sin(angle)*4);target.copy(home);walking=true;}
 else if(t<145){pos.set(-5,0,-3);target.set(-6,7,4);}
 else if(t<245){const a=(t-145)*.10;pos.set(-5+Math.sin(a)*3,0,-.5+Math.cos(a)*2);target.set(-5+Math.sin(a+.5)*8,7,5);walking=true;}
 else if(t<277){pos.set(-5,0,-4.4);target.set(-7+Math.sin(t*.08)*5,7,6);}
 else{pos.set(-5,0,-1);target.set(-5,6,-5);walking=false;}
 pos.y=ground(pos.x,pos.z);actor.position.copy(pos);actor.lookAt(target.x,pos.y,target.z);
 const gait=walking?Math.sin(t*7)*.55:Math.sin(t*1.7)*.04;
 legs[0].rotation.x=gait;legs[1].rotation.x=-gait;arms[0].rotation.x=-gait;arms[1].rotation.x=gait;
 if((t>22&&t<70)||(t>78&&t<122)||(t>145&&t<245)){const swing=Math.pow(Math.max(0,Math.sin(t*4)),4);arms[1].rotation.x=-swing*1.8;tool.rotation.x=-swing*.7;}
 const c=Math.floor((t-145)/16),phase=((t-145)%16)/16;
 enemies.forEach((m,i)=>{const start=145+i*16,age=t-start;m.group.visible=age>=0&&age<14;
 if(m.group.visible){const distance=THREE.MathUtils.lerp(13,1.05,clamp(age/9));const a=i*1.15+.3;m.group.position.set(actor.position.x+Math.sin(a)*distance,0,actor.position.z+Math.cos(a)*distance);m.group.position.y=ground(m.group.position.x,m.group.position.z);m.group.lookAt(actor.position.x,m.group.position.y,actor.position.z);m.group.rotation.z=age>12?Math.sin(age*20)*.1:0;m.group.children[0].material.color.set(age>12?'#b47661':'#2e8b57');if(age>10)actor.lookAt(m.group.position.x,actor.position.y,m.group.position.z);}
 });
 sparks.visible=(t>22&&t<70)||(t>145&&t<241&&phase>.75);
 if(sparks.visible){sparks.position.copy(actor.position).add(new THREE.Vector3(.6,1,1));sparks.children.forEach((s,i)=>{const q=(t*2+i*.11)%1;s.position.set(Math.sin(i*9)*q,1.3*q-q*q,Math.cos(i*7)*q);s.scale.setScalar(1-q);});}
 return pos;
}
export function frame(t){
 t=clamp(t,0,300);if(t<lastT)throw Error('Render sequentially; reload to restart.');lastT=t;applyEvents(t);const pos=pose(t);
 const night=smooth((t-95)/45);
 const sky=t<95?new THREE.Color('#87ceeb').lerp(new THREE.Color('#e06030'),smooth((t-65)/30)):new THREE.Color('#e06030').lerp(new THREE.Color('#050510'),night);scene.background.copy(sky);scene.fog.color.copy(sky);ambient.intensity=1.4-night*1.1;sun.intensity=2*(1-night);moon.intensity=night*.6;starMesh.visible=false;rain.visible=false;sparks.visible=false;
 const mode=t>=125&&t<277?'storm':'clear';if(mode!==weatherMode){weather.setWeather(mode,scene);weatherMode=mode;}weather.update(1/FPS,camera.position);
 camera.position.copy(pos).add(new THREE.Vector3(0,1.6+Math.sin(t*6)*.015,0));
 let look=new THREE.Vector3();
 if(t<18)look.set(-3+Math.sin(t*.2)*6,camera.position.y-.25,-12);
 else if(t<72){const i=Math.min(25,Math.floor(clamp((t-18)/52)*25));look.set(...mineTargets[i]);}
 else if(t<125){look.set(...blocks[Math.min(25,Math.floor(clamp((t-78)/44)*26))]);}
 else if(t<145)look.set(-5+Math.sin(t*.15)*4,camera.position.y,8);
 else if(t<245){const enemy=enemies.find(m=>m.group.visible);if(enemy)look.copy(enemy.group.position).add(new THREE.Vector3(0,1.4,0));else look.set(pos.x+Math.sin(t*.2)*6,pos.y+1.2,pos.z+12);}
 else if(t<277)look.set(-5+Math.sin(t*.12)*7,camera.position.y,8);
 else look.set(-5,home.y+1.5,-5.3);
 // A damped first-person camera: continuous walking over block steps and
 // shortest-path quaternion turns. Fixed timestep keeps the export repeatable.
 const desiredPosition=camera.position.clone();
 camera.lookAt(look);const desiredRotation=camera.quaternion.clone();
 if(!cameraInitialized){smoothPosition.copy(desiredPosition);smoothRotation.copy(desiredRotation);cameraInitialized=true;}
 else{smoothPosition.lerp(desiredPosition,1-Math.exp(-3.2/FPS));smoothRotation.slerp(desiredRotation,1-Math.exp(-2.6/FPS));}
 camera.position.copy(smoothPosition);camera.quaternion.copy(smoothRotation);
 equip(t>24&&t<125?'Wood':'');
 const swinging=(t>22&&t<70)||(t>78&&t<122)||(t>145&&t<241);
 const swing=swinging?Math.max(0,Math.sin(t*4))**5:0;
 hand.position.set(.5-swing*.2,-.4-swing*.3+Math.sin(t*6)*.015,-.8-swing*.2);hand.rotation.set(-swing*1.2,swing*.5,swing*.4);
 const impact=t>154&&t<242?Math.exp(-((t-154)%16)*9):0;
 camera.rotation.z+=Math.sin(t*31)*impact*.009;
 renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
 if(t>145&&t<277){const danger=clamp((t-145)/96)*.23+impact*.25;const vignette=ctx.createRadialGradient(640,360,200,640,360,760);vignette.addColorStop(0,'#91000000');vignette.addColorStop(1,`rgba(160,0,0,${danger})`);ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);}

 const hp=t<145?100:Math.max(18,100-Math.floor((Math.min(t,241)-145)/16)*14);
 // Canvas equivalents of original style.css: cyan labels, red/blue bars,
 // circular crosshair, five pixel-art inventory slots, helper and weather.
 text('HP',20,27,11,'#00f3ff');text('ENERGY',20, 64,11,'#00f3ff');
 for(const [y,col,value] of [[34,'#ff4d4d',hp],[71,'#4d94ff',100]]){ctx.fillStyle='#ffffff18';ctx.fillRect(20,y,250,8);ctx.fillStyle=col;ctx.fillRect(20,y,250*value/100,8);ctx.strokeStyle='#ffffff44';ctx.strokeRect(20,y,250,8);}
 ctx.strokeStyle='#ffffffb0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(640,360,5,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#0008';ctx.fillRect(1020,20,240,30);text(t<65?'MORNING / CLEAR':t<125?'SUNSET / CLEAR':t<277?'NIGHT / STORM':'NIGHT / CLEAR',1248,40,12,'#00f3ff','right');
 ctx.fillStyle='#ffffff19';ctx.fillRect(490,616,300,68);ctx.strokeStyle='#ffffff35';ctx.strokeRect(490,616,300,68);ctx.imageSmoothingEnabled=false;
 state.inventory.slice(0,5).forEach((item,i)=>{const x=500+i*58;ctx.fillStyle=i===state.selectedSlot?'#00f3ff18':'#0008';ctx.fillRect(x,626,48,48);ctx.strokeStyle=i===state.selectedSlot?'#00f3ff':'#888';ctx.strokeRect(x,626,48,48);ctx.drawImage(getItemCanvas(item.name),x+6,632,36,36);if(item.count)text(String(item.count),x+43,671,12,'#fff','right');});ctx.imageSmoothingEnabled=true;
 const c=chapter(t);ctx.fillStyle='#101523d9';ctx.beginPath();ctx.roundRect(940,600,320,100,16);ctx.fill();ctx.strokeStyle='#ffffff33';ctx.stroke();text('♥',957,653,32,'#79dc84');
 const msg=t<18?'Ready to mine, Captain?':t<72?`Collected wood: ${mined}/26`:t<125?`Shelter blocks: ${built}/26`:t<145?'Night falls. A storm rages.':t<245?(t>209?'CRITICAL: Stay alive!':'WARNING: Zombies nearby!'):t<277?'Keep watching the tree line.':'Shelter secure. Villagers safe!';
 text(msg,1000,639,14,'#e5ebee');text(t<277?'SURVIVE THE NIGHT':'MISSION ACCOMPLISHED',1000,667,12,'#00f3ff');
 ctx.fillStyle='#0009';ctx.fillRect(20,627,340,60);text(c[1],32,650,14,'#00f3ff');text(`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')} / 5:00  ·  SCRIPTED SURVIVAL`,32,674,12,'#d0d9df');
 if(t<8){ctx.globalAlpha=1-smooth((t-5)/3);ctx.fillStyle='#050914d9';ctx.fillRect(290,220,700,240);text('SURVIVE THE NIGHT',640,315,43,'#00f3ff','center');text('Mine Build Defeat • Survival',640,363,21,'#fff','center');text('Morning to night. Stay alive.',640,404,18,'#c3d9de','center');ctx.globalAlpha=1;}
 if(t>288){ctx.globalAlpha=smooth((t-288)/3);ctx.fillStyle='#050914dd';ctx.fillRect(330,235,620,185);text('NIGHT SECURED',640,307,43,'#00f3ff','center');text('18 HP. Three villagers safe.',640,351,21,'#fff','center');text('Six zombies defeated. Shelter secured.',640,385,18,'#bddecc','center');ctx.globalAlpha=1;}
 return {time:t,hp,wood:mined,shelter:built,defeated:Math.min(6,Math.max(0,Math.floor((t-143)/16))),complete:t>=277};
}
window.frame=frame;
window.exportFilm=async()=>{
 const target=new ArrayBufferTarget();const muxer=new Muxer({target,video:{codec:'V_VP9',width:W,height:H,frameRate:FPS},firstTimestampBehavior:'offset'});
 const encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{throw e;}});
 encoder.configure({codec:'vp09.00.31.08',width:W,height:H,bitrate:2800000,framerate:FPS,latencyMode:'quality'});
 for(let i=0;i<DURATION*FPS;i++){frame(i/FPS);const vf=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)});encoder.encode(vf,{keyFrame:i%(FPS*5)===0});vf.close();if(i%FPS===0){await encoder.flush();if(window.reportProgress)await window.reportProgress(i/FPS);}}
 await encoder.flush();encoder.close();muxer.finalize();const bytes=new Uint8Array(target.buffer);for(let i=0;i<bytes.length;i+=65536){let s='';for(const b of bytes.subarray(i,i+65536))s+=String.fromCharCode(b);await window.saveChunk(btoa(s));}return frame(300);
};
frame(0);window.ready=true;
if(new URLSearchParams(location.search).has('render')){
 const send=(path,data)=>fetch(path,{method:'POST',body:data});
 window.reportProgress=async s=>{if(s%15===0){document.title=`Rendering ${s}/300`;await send('/progress',`${s}/300`);}};
 window.saveChunk=b=>send('/chunk',Uint8Array.from(atob(b),c=>c.charCodeAt(0)));
 try{await send('/reset','');await send('/poster',await new Promise(r=>canvas.toBlob(r,'image/jpeg',.92)));const result=await window.exportFilm();await send('/result',JSON.stringify(result));document.title='Film render complete';}catch(e){await send('/progress',String(e));document.title='Render error: '+e.message;}
}
export const engine={THREE,scene,world,camera,renderer,canvas,ctx,ambient,sun,moon,weather,hand,equip,state,ground,villagers,enemies,actor,rain,starMesh,sparks};
