// Villager geometry and colors from Mine Build Defeat's village_builder.js.
// Movement is directed for the survival film.
import * as THREE from 'three';
export function createVillagers(scene){
 const mat=c=>new THREE.MeshStandardMaterial({color:c});
 const cube=(g,size,m,pos)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),m);mesh.position.set(...pos);g.add(mesh);return mesh;};
 return Array.from({length:3},()=>{
  const g=new THREE.Group(),robe=mat(0x4f3028),skin=mat(0x8b5a47),green=mat(0x39a852),dark=mat(0x241711);
  cube(g,[.8,1.25,.55],robe,[0,.95,0]);cube(g,[.84,.84,.72],skin,[0,2,0]);cube(g,[.22,.34,.3],skin,[0,1.92,-.49]);
  cube(g,[.1,.1,.05],green,[-.22,2.08,-.39]);cube(g,[.1,.1,.05],green,[.22,2.08,-.39]);cube(g,[1.18,.25,.28],robe,[0,1.28,-.35]);
  const legs=[cube(g,[.25,.55,.3],dark,[-.22,.15,0]),cube(g,[.25,.55,.3],dark,[.22,.15,0])];scene.add(g);return {group:g,legs};
 });
}
