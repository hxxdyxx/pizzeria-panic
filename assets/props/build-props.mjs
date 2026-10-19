import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import fs from 'node:fs';
globalThis.FileReader=class {readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const out=new URL('./', import.meta.url);
const C={tomato:0xd64541,basil:0x2e8b57,olive:0x2c2c2c,crust:0xd49445,cheese:0xffd365,cream:0xfff0cf,pan:0x46545b,wood:0xc68b54,brick:0xad5341};
function mat(c,glow=0){return new T.MeshStandardMaterial({color:c,roughness:.88,metalness:0,flatShading:true,...(glow?{emissive:c,emissiveIntensity:glow}:{})});}
function mesh(g,geo,c,pos=[0,0,0],s=[1,1,1],rot=[0,0,0],glow=0){const m=new T.Mesh(geo,mat(c,glow));m.position.set(...pos);m.scale.set(...s);m.rotation.set(...rot);g.add(m);return m;}
const ball=(g,c,p,s)=>mesh(g,new T.SphereGeometry(1,12,8),c,p,s);
const cyl=(g,c,p,r,h)=>mesh(g,new T.CylinderGeometry(r,r,h,16),c,p);
const box=(g,c,p,s)=>mesh(g,new T.BoxGeometry(...s),c,p);
const group=n=>{const g=new T.Group();g.name=n;return g;};
const models=[];
for(const pepperoni of [false,true]){const g=group(pepperoni?'pizza-pepperoni':'pizza-cheese');cyl(g,C.crust,[0,.10,0],.72,.20);cyl(g,C.tomato,[0,.205,0],.64,.025);cyl(g,C.cheese,[0,.23,0],.61,.03);mesh(g,new T.TorusGeometry(.64,.075,6,24),C.crust,[0,.20,0],[1,1,1],[Math.PI/2,0,0]);if(pepperoni)for(let i=0;i<7;i++){const a=i*2.399,r=i===0?0:.39;cyl(g,0xaf342b,[Math.cos(a)*r,.258,Math.sin(a)*r],.115,.025);}models.push(g);}
{const g=group('pan');cyl(g,C.pan,[0,.08,0],.8,.12);mesh(g,new T.TorusGeometry(.77,.055,6,24),C.pan,[0,.15,0],[1,1,1],[Math.PI/2,0,0]);models.push(g);}
{const g=group('mushroom');ball(g,C.cream,[0,.28,0],[.22,.29,.22]);const cap=mesh(g,new T.SphereGeometry(.5,16,8,0,Math.PI*2,0,Math.PI/2),C.tomato,[0,.46,0]);cyl(g,C.cream,[0,.46,0],.49,.035);for(const [x,y,z] of [[0,.94,0],[.33,.79,.13],[-.28,.8,.2],[.13,.76,-.35]])ball(g,C.cream,[x,y,z],[.09,.025,.09]);models.push(g);}
{const g=group('chili-pepper');const curve=new T.CatmullRomCurve3([new T.Vector3(-.43,.07,0),new T.Vector3(-.25,.15,0),new T.Vector3(.04,.36,0),new T.Vector3(.2,.68,0)]);const pts=Array.from({length:13},(_,i)=>{const p=curve.getPoint(i/12);return new T.Vector2(.015+.17*Math.sin(i/12*Math.PI/2),p.y);});const geo=new T.TubeGeometry(curve,12,.16,8,false);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const ring=Math.floor(i/9);const center=curve.getPointAt(Math.min(ring/12,1));const k=.05+.95*Math.sin(Math.min(ring/12,1)*Math.PI/2);a.setXYZ(i,center.x+(a.getX(i)-center.x)*k,center.y+(a.getY(i)-center.y)*k,center.z+(a.getZ(i)-center.z)*k);}geo.computeVertexNormals();mesh(g,geo,C.tomato);ball(g,C.basil,[.2,.70,0],[.18,.07,.18]);mesh(g,new T.CylinderGeometry(.045,.06,.23,8),C.basil,[.17,.82,0],[1,1,1],[0,0,-.3]);models.push(g);}
{const g=group('brick');box(g,C.brick,[0,.19,0],[.85,.38,.44]);for(let i=-1;i<=1;i++)box(g,0x8d4034,[i*.23,.383,0],[.1,.014,.12]);models.push(g);}
{const g=group('rolling-pin');mesh(g,new T.CylinderGeometry(.18,.18,1.0,12),C.wood,[0,.22,0],[1,1,1],[0,0,Math.PI/2]);for(const x of [-.66,.66]){mesh(g,new T.CylinderGeometry(.085,.085,.34,10),C.crust,[x,.22,0],[1,1,1],[0,0,Math.PI/2]);ball(g,C.crust,[x+Math.sign(x)*.14,.22,0],[.1,.1,.1]);}models.push(g);}
{const g=group('pizzeria-backdrop');box(g,0xe5cfad,[0,1.5,-1.1],[6,3,.2]);for(let row=0;row<7;row++)for(let col=0;col<9;col++){const x=-2.85+col*.71+(row%2)*.35;if(x>2.8)continue;box(g,row%2?C.brick:0xbc6550,[x,.2+row*.42,-.96],[.66,.36,.08]);}box(g,C.olive,[0,.5,.1],[6,1,.9]);box(g,C.wood,[0,1.05,.1],[6.15,.16,1.1]);box(g,0x504b43,[1.3,1.6,-.57],[1.65,1.2,.65]);box(g,0x251c19,[1.3,1.53,-.22],[1.28,.75,.04]);box(g,0xff9938,[1.3,1.43,-.185],[1.05,.42,.02]);g.children.at(-1).material.emissive.setHex(0xff6d20);g.children.at(-1).material.emissiveIntensity=1.5;for(let i=0;i<4;i++)ball(g,0xffc456,[.94+i*.24,1.38,-.15],[.12,.18+(i%2)*.08,.04]);box(g,C.basil,[-1.3,2.45,-.75],[1.65,.28,.12]);models.push(g);}
for(const g of models){
// Batch by material to keep draw calls and JSON overhead low.
g.updateMatrixWorld(true);const batches=new Map();
for(const m of [...g.children]){const key=[m.material.color.getHex(),m.material.emissive.getHex(),m.material.emissiveIntensity].join(':');if(!batches.has(key))batches.set(key,{material:m.material,geometry:[]});batches.get(key).geometry.push(m.geometry.clone().applyMatrix4(m.matrixWorld));g.remove(m);}
for(const {material,geometry} of batches.values()){const m=new T.Mesh(mergeGeometries(geometry),material);g.add(m);}
const b=await new GLTFExporter().parseAsync(g,{binary:true,onlyVisible:true});fs.writeFileSync(new URL(g.name+'.glb',out),Buffer.from(b));console.log(g.name,b.byteLength);}
