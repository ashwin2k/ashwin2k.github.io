import * as THREE from 'three';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js';

// Material textures are surface detail on geometry, never a background painting.
const surfaces = new Map();
function surface(kind) {
  if(surfaces.has(kind))return surfaces.get(kind);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');let seed=83;
  const r=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  c.fillStyle=kind==='wood'?'#9f9585':'#a6a4a0';c.fillRect(0,0,512,512);
  for(let i=0;i<24000;i++){
    const v=100+Math.floor(r()*110);c.fillStyle=`rgba(${v},${v},${v},${.06+r()*.12})`;
    c.fillRect(r()*512,r()*512,1+r()*4,1+r()*4);
  }
  if(kind==='stone') {
    c.fillStyle='#5e5a53';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=64)for(let x=-128;x<512;x+=128){
      const xx=x+(y/64%2)*64,v=140+Math.floor(r()*45);
      c.fillStyle=`rgb(${v+5},${v+3},${v})`;c.beginPath();c.roundRect(xx+3,y+3,122,58,4+r()*5);c.fill();
      c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=2;c.stroke();
      for(let k=0;k<65;k++){c.fillStyle=r()>.5?'rgba(40,35,30,.12)':'rgba(255,255,255,.15)';c.fillRect(xx+6+r()*114,y+6+r()*50,1+r()*5,1+r()*3);}
      if(r()>.4){c.beginPath();c.moveTo(xx+40,y+4);c.lineTo(xx+52,y+19);c.lineTo(xx+45,y+35);c.strokeStyle='rgba(60,55,50,.3)';c.lineWidth=1;c.stroke();}
    }
  } else if(kind==='tile') {
    c.fillStyle='#65605b';c.fillRect(0,0,512,512);
    for(let y=-32;y<512;y+=32)for(let x=-64;x<512;x+=64){
      const xx=x+(y/32%2)*32,v=120+Math.floor(r()*60);
      const gradient=c.createLinearGradient(0,y,0,y+40);gradient.addColorStop(0,`rgb(${v+25},${v+20},${v+15})`);gradient.addColorStop(1,`rgb(${v-18},${v-20},${v-24})`);
      c.fillStyle=gradient;c.beginPath();c.roundRect(xx+2,y+1,60,38,[2,2,8,8]);c.fill();
      c.strokeStyle='rgba(30,24,20,.5)';c.lineWidth=2;c.stroke();
      c.fillStyle='rgba(230,226,210,.13)';c.fillRect(xx+5,y+4,53,2);
      for(let j=0;j<7;j++){c.fillStyle='rgba(35,32,27,.12)';c.fillRect(xx+5+r()*50,y+5+r()*25,1+r()*3,1);}
    }
  } else if(kind==='wood') {
    // Grain bends around knots, with a few deeper age cracks.
    for(let i=0;i<150;i++) {
      const x=r()*512;c.beginPath();
      for(let y=0;y<=512;y+=8){const bend=Math.sin(y*.018+i)*2+Math.exp(-Math.pow((y-250)/75,2))*Math.sin(x*.07)*10;if(y===0)c.moveTo(x+bend,y);else c.lineTo(x+bend,y);}
      c.strokeStyle=`rgba(45,30,20,${.08+r()*.25})`;c.lineWidth=.5+r()*1.5;c.stroke();
    }
    for(const [x,y] of [[130,140],[360,340]])for(let i=0;i<5;i++){c.beginPath();c.ellipse(x,y,3+i*2,9+i*4,.1,0,Math.PI*2);c.strokeStyle='rgba(60,40,23,.35)';c.lineWidth=1;c.stroke();}
    for(let i=0;i<8;i++){const x=r()*512,y=r()*512;c.fillStyle='rgba(35,24,17,.28)';c.fillRect(x,y,1,25+r()*70);}
  } else if(kind==='plaster') {
    // Limewash mottling, worn patches, fine aggregate and hairline cracks.
    for(let i=0;i<190;i++){
      const x=r()*512,y=r()*512,rad=8+r()*50;
      const patch=c.createRadialGradient(x,y,0,x,y,rad);
      patch.addColorStop(0,r()>.45?'rgba(239,230,209,.13)':'rgba(77,72,62,.09)');patch.addColorStop(1,'rgba(140,136,126,0)');c.fillStyle=patch;c.fillRect(x-rad,y-rad,rad*2,rad*2);
    }
    for(let i=0;i<6000;i++){c.fillStyle=r()>.5?'rgba(255,248,227,.15)':'rgba(42,36,26,.13)';c.fillRect(r()*512,r()*512,1,1);}
    for(let i=0;i<7;i++){
      let x=r()*512,y=r()*512;c.beginPath();c.moveTo(x,y);
      for(let j=0;j<6;j++){x+=(r()-.5)*9;y+=3+r()*7;c.lineTo(x,y);}
      c.strokeStyle='rgba(65,56,40,.22)';c.lineWidth=.6;c.stroke();
    }
  } else if(kind==='earth') {
    for(let i=0;i<800;i++){c.fillStyle=r()>.5?'#74776c':'#b1b2a3';c.beginPath();c.ellipse(r()*512,r()*512,r()*5+1,r()*3+1,r()*6,0,Math.PI*2);c.fill();}
  }
  const color=new THREE.CanvasTexture(canvas);color.colorSpace=THREE.SRGBColorSpace;
  color.wrapS=color.wrapT=THREE.RepeatWrapping;color.anisotropy=4;
  const bump=color.clone();bump.colorSpace=THREE.NoColorSpace;
  const value={color,bump};surfaces.set(kind,value);return value;
}
export function detailedMaterial(color,kind='plaster') {
  const maps=surface(kind);
  return new THREE.MeshStandardMaterial({color,map:maps.color,bumpMap:maps.bump,bumpScale:kind==='stone'?.075:.025,roughness:kind==='tile'?.8:.94,metalness:0});
}
export function physicalUV(geo) {
  const p=geo.attributes.position,n=geo.attributes.normal,uv=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    if(ny>nx&&ny>nz)uv.push(x*.35,z*.35);
    else if(nx>nz)uv.push(z*.35,y*.35);
    else uv.push(x*.35,y*.35);
  }
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geo;
}
export function cragGeometry(detail=2) {
  const geo=new THREE.IcosahedronGeometry(1,detail),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const f=1+.13*Math.sin(x*13+y*7)*Math.cos(z*11-y*9)+.07*Math.sin(z*27+x*19);
    p.setXYZ(i,x*f,y*f,z*f);
  }
  geo.computeVertexNormals();return physicalUV(geo);
}
export function flutedColumn(height,radius) {
  const g=new THREE.CylinderGeometry(radius*.92,radius,height,160,12);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++) {
    const a=Math.atan2(p.getZ(i),p.getX(i)),y=p.getY(i);
    const taper=1-.06*Math.cos(y/height*Math.PI*2);
    const flute=1-.065*(.5+.5*Math.cos(a*20));
    p.setX(i,p.getX(i)*flute*taper);p.setZ(i,p.getZ(i)*flute*taper);
  }
  g.computeVertexNormals();return physicalUV(g);
}
// Batch static opaque architecture by material. Dynamic props retain transforms.
export function batchArchitecture(root) {
  root.updateMatrixWorld(true);
  const groups=new Map(),remove=[];
  root.traverse(object=>{
    if(!object.isMesh||!object.material.isMeshStandardMaterial||object.isInstancedMesh)return;
    for(let p=object;p&&p!==root.parent;p=p.parent)if(p.userData.animated)return;
    let geo=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    if(!geo.attributes.uv)physicalUV(geo);
    geo.applyMatrix4(object.matrixWorld);
    const key=object.material.uuid;
    if(!groups.has(key))groups.set(key,{material:object.material,geometries:[]});
    groups.get(key).geometries.push(geo);remove.push(object);
  });
  const merged=new THREE.Group();
  for(const {material,geometries} of groups.values()){
    const geometry=mergeGeometries(geometries,false);
    if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;merged.add(mesh);}
    geometries.forEach(g=>g.dispose());
  }
  remove.forEach(object=>object.removeFromParent());
  root.parent.add(merged);
}
