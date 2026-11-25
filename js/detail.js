import * as THREE from 'three';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js';

// Material textures are surface detail on geometry, never a background painting.
const surfaces = new Map();
const textureLoader = new THREE.TextureLoader();
const white = new THREE.Color(0xffffff);
function surface(kind) {
  if(surfaces.has(kind))return surfaces.get(kind);
  const load=(suffix,colorSpace=THREE.NoColorSpace)=>{
    const map=textureLoader.load(new URL(`../imgs/materials/${kind}-${suffix}.jpg`,import.meta.url).href);
    map.colorSpace=colorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;
    return map;
  };
  const maps={color:load('color',THREE.SRGBColorSpace),normal:load('normal'),roughness:load('roughness')};
  surfaces.set(kind,maps);return maps;
}
export function detailedMaterial(color,kind='plaster') {
  const maps=surface(kind);
  const tint=new THREE.Color(color).lerp(white,kind==='rock'?.78:kind==='stone'?.65:kind==='bark'?.8:kind==='tile'?.18:kind==='plaster'?.15:.5);
  const strength=kind==='rock'?.85:kind==='plaster'?.3:.55;
  return new THREE.MeshStandardMaterial({color:tint,map:maps.color,normalMap:maps.normal,
    normalScale:new THREE.Vector2(strength,strength),roughnessMap:maps.roughness,
    roughness:1,metalness:0});
}
export function physicalUV(geo) {
  if(geo.userData.surfaceUV)return geo;
  geo.userData.surfaceUV=true;
  // Curved surfaces keep continuous cylindrical/spherical UVs. Projecting each
  // vertex onto a different plane creates visible stripes across triangles.
  if(geo.type==='SphereGeometry'||geo.type==='CylinderGeometry'||geo.type==='ConeGeometry'){
    const uv=geo.attributes.uv,p=geo.parameters;
    const radius=p.radius??Math.max(p.radiusTop||0,p.radiusBottom||0);
    const width=Math.max(1,radius*Math.PI*2*.35);
    const height=Math.max(1,(p.height??radius*Math.PI)*.35);
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*width,uv.getY(i)*height);
    return geo;
  }
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
  // A continuous, weathered surface replaces the flat triangular boulders.
  const geo=new THREE.SphereGeometry(1,detail>1?28:16,detail>1?18:10),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const broad=.15*Math.sin(x*4.2+y*2.1)*Math.cos(z*3.7-y*2.4);
    const fine=.025*Math.sin(z*17+x*11)*Math.cos(y*13);
    const f=1+broad+fine;
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
    if(!object.isMesh||object.isInstancedMesh)return;
    if(!object.material.isMeshStandardMaterial&&!(object.material.isMeshBasicMaterial&&object.userData.batch))return;
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
