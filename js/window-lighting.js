import * as THREE from 'three';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js';

export function createWindowLighting(scene) {
  const windows=[],halos=[],pools=[];
  const uniforms={night:{value:0},time:{value:0}};
  const material=(pool)=>new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    side:THREE.DoubleSide,
    vertexShader:`varying vec2 lightUV;void main(){lightUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:pool?`
      varying vec2 lightUV;uniform float night,time;
      void main(){
        float edge=smoothstep(0.,.12,lightUV.x)*(1.-smoothstep(.88,1.,lightUV.x));
        float distanceFade=sin(lightUV.y*3.14159)*pow(1.-lightUV.y,.7);
        float mullion=1.-.65*exp(-pow((lightUV.x-.5)*50.,2.));
        float crossbar=1.-.45*exp(-pow((lightUV.y-.4)*50.,2.));
        gl_FragColor=vec4(1.,.58,.23,edge*distanceFade*mullion*crossbar*night*.46);
        #include <colorspace_fragment>
      }`:`
      varying vec2 lightUV;uniform float night,time;
      void main(){
        vec2 p=abs(lightUV-.5)*2.;
        float halo=exp(-dot(p,p)*3.5)*(1.-smoothstep(.65,1.,max(p.x,p.y)));
        gl_FragColor=vec4(1.,.59,.24,halo*night*.13);
        #include <colorspace_fragment>
      }`,
  });
  const haloMaterial=material(false),poolMaterial=material(true);
  function register(parent,x,y,z) {
    parent.updateWorldMatrix(true,false);
    const position=new THREE.Vector3(x,y,z+.17).applyMatrix4(parent.matrixWorld);
    const direction=new THREE.Vector3(0,0,1).transformDirection(parent.matrixWorld);
    windows.push({position,direction});
    const halo=new THREE.PlaneGeometry(1.6,1.8);
    halo.translate(x,y,z+.16);halo.applyMatrix4(parent.matrixWorld);halos.push(halo);
    // An outward trapezoid keeps every patch attached to its window's orientation.
    const vertices=[],uvs=[0,0,1,0,1,1,0,1];
    const side=new THREE.Vector3(direction.z,0,-direction.x);
    const reach=2.4+y*.3;
    for(const [lateral,distance] of [[-.4,.45],[.4,.45],[1.2,reach],[-1.2,reach]]){
      const point=position.clone().addScaledVector(direction,distance).addScaledVector(side,lateral);
      vertices.push(point.x,.215,point.z);
    }
    const pool=new THREE.BufferGeometry();
    pool.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    pool.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));pool.setIndex([0,1,2,0,2,3]);pools.push(pool);
  }
  function finish(){
    for(const [geometries,mat] of [[halos,haloMaterial],[pools,poolMaterial]]){
      if(!geometries.length)continue;
      const mesh=new THREE.Mesh(mergeGeometries(geometries),mat);scene.add(mesh);
      geometries.forEach(geometry=>geometry.dispose());
    }
  }
  // Three real lights illuminate passing figures and nearby masonry. The rest of
  // the windows share two batched glow draws, keeping lighting cost bounded.
  const lamps=Array.from({length:3},()=>{
    const light=new THREE.SpotLight(0xffb565,0,6,Math.PI*.32,1,2);
    scene.add(light,light.target);return {light,window:null,pending:null};
  });
  let lastTime=0,lastSelection=-Infinity;
  function update(time,daylight,cameraPosition){
    const dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
    const night=1-THREE.MathUtils.smoothstep(daylight,.08,.92);
    uniforms.night.value=night;uniforms.time.value=time;
    if(time-lastSelection>1||time<lastSelection){
      lastSelection=time;
      const nearest=[...windows].sort((a,b)=>a.position.distanceToSquared(cameraPosition)-b.position.distanceToSquared(cameraPosition)).slice(0,lamps.length);
      // Preserve assignments as the camera passes between windows; fade before relocating.
      const assigned=new Set(lamps.filter(lamp=>nearest.includes(lamp.window)).map(lamp=>lamp.window));
      const remaining=nearest.filter(window=>!assigned.has(window));
      lamps.forEach(lamp=>{lamp.pending=assigned.has(lamp.window)?lamp.window:remaining.shift()||null;});
    }
    lamps.forEach((lamp,i)=>{
      if(lamp.pending!==lamp.window){
        lamp.light.intensity=THREE.MathUtils.damp(lamp.light.intensity,0,6,dt);
        if(lamp.light.intensity<.08){
          lamp.window=lamp.pending;
          if(lamp.window){
            lamp.light.position.copy(lamp.window.position).addScaledVector(lamp.window.direction,.06);
            lamp.light.target.position.copy(lamp.window.position).addScaledVector(lamp.window.direction,2.5);
            lamp.light.target.position.y=.1;
          }
        }
      }else lamp.light.intensity=THREE.MathUtils.damp(lamp.light.intensity,lamp.window?night*(15+Math.sin(time*1.8+i)*.5):0,3,dt);
    });
  }
  return {register,finish,update};
}
