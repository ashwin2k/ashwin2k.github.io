import * as THREE from 'three';
import { createDayNight } from './day-night.js?v=smooth-shadows-1';
import { buildLandscape } from './landscape.js?v=citadel-grove-3';
import { detailedMaterial, physicalUV, flutedColumn, cragGeometry, batchArchitecture } from './detail.js';

// A geometry-based world: every landmark is part of the live Three.js scene.
const canvas = document.querySelector('#world');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  document.body.classList.add('no-webgl');
}
if (renderer) start();
function start() {
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x171035);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x211442, 0.009);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 180);
  const landscape = buildLandscape(scene);
  const world = new THREE.Group();
  scene.add(world);
  let seed = 117;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const mat = color => detailedMaterial(color,'stone');
  const rock = mat(0x8d80a1), dark = mat(0x544965), edge = mat(0xa79ab7), pale = mat(0xd0c3d7);
  const naturalRock=detailedMaterial(0x786e88,'earth');
  const emissive = new THREE.MeshBasicMaterial({ color: 0xf0bda4 });
  function box(w,h,d,x,y,z,m=rock,parent=world) {
    const mesh = new THREE.Mesh(physicalUV(new THREE.BoxGeometry(w,h,d)),m);
    mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  const masonry=detailedMaterial(0xb2a2c4,'stone');
  const ambient=new THREE.HemisphereLight(0xb6c9ff,0x44324c,2.2);scene.add(ambient);
  const moonlight=new THREE.DirectionalLight(0xd8c7ff,4.2);
  moonlight.position.set(-24,46,24);moonlight.target.position.set(-7,0,-18);
  moonlight.castShadow=true;moonlight.shadow.mapSize.set(2048,2048);
  Object.assign(moonlight.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:150});
  moonlight.shadow.bias=-.0003;moonlight.shadow.normalBias=.055;
  scene.add(moonlight,moonlight.target);
  const rim=new THREE.DirectionalLight(0x8f79f4,1.4);rim.position.set(25,16,-45);scene.add(rim);
  // A hanging stone causeway, broad in the foreground and narrow at the gate.
  for(let i=0;i<23;i++) {
    const z=10-i*1.05; const y=-1.5+i*.075;const width=6.8-i*.12;
    box(width,.65,1.07,0,y,z,i%3===0?edge:rock);
    box(width+.15,.1,.14,0,y+.36,z+.43,edge);
    for(const side of [-1,1]) {
      box(.32,.48,.95,side*(width/2-.1),y+.46,z,dark);
      if(i%4===0){box(.6,.7,.6,side*(width/2+.13),y+.6,z,masonry);box(.68,.12,.68,side*(width/2+.13),y+1,z,edge);}
    }
    // Pavement joints are carved into the route, not scattered terrain.
    for(let j=-1;j<=1;j++) box(.025,.012,.7,j*1.1+(i%2)*.5,y+.335,z,dark);
  }
  // The gate is built as a stepped arch with a recessed, illuminated interior.
  const gateZ=-12.8;
  box(9,.6,4,0,.1,gateZ,dark);box(8,.22,3.7,0,.5,gateZ,edge);
  for(const side of [-1,1]){
    const x=side*2.6;
    const shaft=new THREE.Mesh(flutedColumn(4.1,.6),masonry);shaft.position.set(x,2.8,gateZ);world.add(shaft);
    for(const [y,r,h] of [[.8,.83,.24],[1,.7,.18],[4.8,.7,.15],[5,.86,.2]]){
      const ring=new THREE.Mesh(physicalUV(new THREE.CylinderGeometry(r,r+.04,h,32)),pale);
      ring.position.set(x,y,gateZ);world.add(ring);
    }
    // Small carved curls under the capital create real relief and shadows.
    for(let j=0;j<12;j++){
      const a=j/12*Math.PI*2;
      const curl=new THREE.Mesh(new THREE.TorusGeometry(.15,.045,6,12,Math.PI*1.5),edge);
      curl.position.set(x+Math.cos(a)*.63,4.65,gateZ+Math.sin(a)*.63);
      curl.rotation.y=-a;world.add(curl);
    }
  }
  // Individually beveled wedge stones form the curved arch.
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI+.008,b=(i+1)/22*Math.PI-.008;
    const shape=new THREE.Shape();
    shape.moveTo(Math.cos(a)*2.98,Math.sin(a)*2.6);
    for(let k=1;k<=4;k++){const t=a+(b-a)*k/4;shape.lineTo(Math.cos(t)*2.98,Math.sin(t)*2.6);}
    for(let k=4;k>=0;k--){const t=a+(b-a)*k/4;shape.lineTo(Math.cos(t)*2.22,Math.sin(t)*2.04);}
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:1.1,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.035,bevelThickness:.035});
    const wedge=new THREE.Mesh(physicalUV(geo),i%4?masonry:pale);
    wedge.position.set(0,4.95,gateZ-.55);world.add(wedge);
  }
  // A cracked central keystone projects in front of the arch.
  box(.48,.8,1.34,0,7.26,gateZ,pale);
  // Portal surface: hand-dithered light with an animated nested aperture.
  const portalCanvas=document.createElement('canvas');portalCanvas.width=128;portalCanvas.height=192;
  const pc=portalCanvas.getContext('2d');
  for(let y=0;y<192;y++) for(let x=0;x<128;x++){
    const v=Math.max(0,1-Math.hypot((x-64)/70,(y-96)/128));
    const t=v+((x+y)%2? .05:-.05)+random()*.1;
    pc.fillStyle=t>.72?'#fff1dd':t>.48?'#dcb5d2':t>.24?'#967cba':'#594379';pc.fillRect(x,y,1,1);
  }
  const portalTexture=new THREE.CanvasTexture(portalCanvas);portalTexture.magFilter=THREE.LinearFilter;portalTexture.colorSpace=THREE.SRGBColorSpace;
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(4,5.2),new THREE.MeshBasicMaterial({map:portalTexture}));
  portal.position.set(0,3.3,gateZ-.3);world.add(portal);
  const frameMat=new THREE.MeshBasicMaterial({color:0xe7c6e0});
  for(let i=0;i<3;i++) {
    const w=3.65-i*.8,h=4.8-i*1.05;
    box(.035,h,.02,-w/2,3.3,gateZ+.02,frameMat);box(.035,h,.02,w/2,3.3,gateZ+.02,frameMat);
    box(w,.035,.02,0,3.3+h/2,gateZ+.02,frameMat);box(w,.035,.02,0,3.3-h/2,gateZ+.02,frameMat);
  }
  // Architectural wings and buttresses anchor the gate to the landscape.
  for(const s of [-1,1]) for(let i=0;i<5;i++) {
    const x=s*(4.1+i*1.4),h=4.8-i*.55;
    box(1.35,h,2,x,h/2-.2,gateZ-.3,masonry);
    box(1.5,.2,2.2,x,h-.1,gateZ-.3,edge);
    box(.45,h+1,2.7,x+s*.6,(h+1)/2-.2,gateZ-.7,dark);
  }
  // Framing cliffs: layered fractured geology with a consistent silhouette.
  for(const s of [-1,1]) for(let i=0;i<40;i++) {
    const z=9-i*.85,x=s*(5+random()*5.5),h=1+random()*5;
    // Leave the citadel stair approach clear of the gateway cliff framing.
    if(s<0&&z<-18)continue;
    const cliff=new THREE.Mesh(cragGeometry(2),naturalRock);
    cliff.position.set(x,-2+h/2,z);cliff.scale.set(1.1+random()*.5,h*.55,1.3);cliff.rotation.y=random()*2;world.add(cliff);
    if(i%4===0)box(.4,.05,.6,x,h-1.9,z,edge);
  }
  const lanterns = [];
  // Lanterns repeat down the route and make its perspective legible.
  for(const z of [5,0,-5,-10]) for(const s of [-1,1]) {
    const x=s*(2.7-(5-z)*.045), y=-.3+(5-z)*.07;
    box(.3,.9,.3,x,y,z,dark);box(.5,.08,.5,x,y+.48,z,pale);
    box(.19,.3,.19,x,y+.65,z,emissive);box(.4,.08,.4,x,y+.86,z,dark);
    const lamp=new THREE.PointLight(0xffc9a2,3,4,2);lamp.position.set(x,y+.7,z);world.add(lamp);lanterns.push(lamp);
  }
  // A small explorer provides scale, with a cape and a warm lantern.
  const explorer=new THREE.Group();world.add(explorer);explorer.position.set(-.6,-.6,2.9);
  box(.3,.48,.23,0,.6,0,dark,explorer);box(.28,.26,.27,0,.99,0,pale,explorer);
  box(.36,.48,.06,0,.61,.15,rock,explorer);
  for(const s of [-1,1])box(.09,.35,.12,s*.09,.2,0,dark,explorer);
  box(.09,.35,.12,.24,.58,0,pale,explorer);box(.12,.16,.12,.28,.32,.03,emissive,explorer);
  const dustGeo=new THREE.BufferGeometry();const dust=new Float32Array(100*3);
  for(let i=0;i<100;i++){dust[i*3]=(random()-.5)*18;dust[i*3+1]=random()*9;dust[i*3+2]=-random()*22;}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dust,3));
  const motes=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xe8d7ee,size:.04,transparent:true,opacity:.6}));world.add(motes);
  // Stars are fixed in the far sky; no random objects float in the architecture.
  const stars=new Float32Array(180*3);
  for(let i=0;i<180;i++){stars[i*3]=(random()-.5)*130;stars[i*3+1]=9+random()*45;stars[i*3+2]=-60-random()*25;}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(stars,3));
  const starsMesh=new THREE.Points(sg,new THREE.PointsMaterial({color:0xdbcde9,size:.13}));scene.add(starsMesh);
  const moon=new THREE.Mesh(new THREE.CircleGeometry(2.2,48),new THREE.MeshBasicMaterial({color:0xd2bddc}));moon.position.set(-17,19,-63);scene.add(moon);
  // Soft, low-resolution haze moves across the ravine at several depths.
  const hazeCanvas = document.createElement('canvas');
  hazeCanvas.width = hazeCanvas.height = 64;
  const hc = hazeCanvas.getContext('2d');
  const hazeGradient = hc.createRadialGradient(32,32,0,32,32,32);
  hazeGradient.addColorStop(0,'rgba(178,148,210,.28)');
  hazeGradient.addColorStop(.45,'rgba(126,100,166,.13)');
  hazeGradient.addColorStop(1,'rgba(100,80,140,0)');
  hc.fillStyle=hazeGradient;hc.fillRect(0,0,64,64);
  const hazeTexture=new THREE.CanvasTexture(hazeCanvas);
  const haze=[];
  for(let i=0;i<9;i++) {
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:hazeTexture,transparent:true,depthWrite:false,opacity:.5}));
    const x=(i%3-1)*8,z=5-Math.floor(i/3)*9;
    sprite.position.set(x,-.4,z);sprite.scale.set(17,3.2,1);
    world.add(sprite);haze.push({sprite,x,z,phase:i*1.7});
  }
  // Animated light stays inside the carved opening.
  const portalGlow=new THREE.PointLight(0xd7a6ff,8,13,2);
  portalGlow.position.set(0,3.3,gateZ+1);world.add(portalGlow);
  const apertureMaterial=new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},transparent:true,depthWrite:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;uniform float time;
      void main(){
        vec2 p=vUv-.5;
        float r=length(p*vec2(1.,.7));
        float wave=sin(r*65.-time*1.8)*.5+.5;
        float streak=pow(max(0.,sin(p.y*54.+time*.5)),16.);
        float strength=(wave*.11+streak*.09)*(1.-smoothstep(.12,.6,r));
        gl_FragColor=vec4(vec3(1.,.82,.94),strength);
      }`,
  });
  const aperture=new THREE.Mesh(new THREE.PlaneGeometry(4,5.2),apertureMaterial);
  aperture.position.set(0,3.3,gateZ-.25);world.add(aperture);

  // Uneven stones along the route catch moving light individually.
  const pathStones=new THREE.InstancedMesh(cragGeometry(1),naturalRock,528);
  const stonePose=new THREE.Object3D();let stoneIndex=0;
  for(let row=0;row<44;row++)for(let col=0;col<12;col++){
    const step=row/2,z=10-step*1.05,width=6.8-step*.12;
    stonePose.position.set((col-5.5)*width/12+(random()-.5)*.065,-1.12+step*.075+(random()-.5)*.025,z+(random()-.5)*.08);
    stonePose.rotation.set(0,random()*.3,0);stonePose.scale.set(width/27,.075,.22);
    stonePose.updateMatrix();pathStones.setColorAt(stoneIndex,new THREE.Color().setHSL(.72,.05,.65+random()*.25));pathStones.setMatrixAt(stoneIndex++,stonePose.matrix);
  }
  pathStones.castShadow=pathStones.receiveShadow=true;world.add(pathStones);
  // Ivy wraps around the columns with leaves at distinct depths.
  const ivyMaterial=detailedMaterial(0x485c63,'earth');
  const ivy=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),ivyMaterial,240);
  for(let i=0;i<240;i++){
    const side=i<120?-1:1,q=(i%120)/120,y=.9+q*4.5;
    stonePose.position.set(side*(2.65+Math.sin(q*19)*.5),y,gateZ+.68+Math.cos(q*19)*.18);
    stonePose.rotation.set(random(),random()*6,random());
    stonePose.scale.set(.07+random()*.06,.13+random()*.08,.035);
    stonePose.updateMatrix();ivy.setMatrixAt(i,stonePose.matrix);
  }
  ivy.castShadow=ivy.receiveShadow=true;world.add(ivy);
  batchArchitecture(world);
  // The day/night update requests a fresh shadow map when the scene advances.
  // Paused frames can reuse it.
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;

  const updateDayNight=createDayNight(scene,renderer,camera,moonlight,rim,ambient,moon,starsMesh);

  // A closed camera rail visits every district and blends its gaze independently.
  const places=landscape.places;
  const cameraPath=new THREE.CatmullRomCurve3(places.map(p=>new THREE.Vector3(...p.position)),true,'centripetal');
  const targetPath=new THREE.CatmullRomCurve3(places.map(p=>new THREE.Vector3(...p.target)),true,'centripetal');
  const hud=document.querySelector('.hud');
  const tourDuration=144;
  const gaze=new THREE.Vector3(0,3.3,gateZ),desiredGaze=new THREE.Vector3();
  const pointer={x:0,y:0},smoothPointer=new THREE.Vector2();
  window.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5;},{passive:true});
  let visible=true,paused=reduced;
  const motionButton=document.querySelector('#scene-motion');
  function paintMotion(){
    motionButton.textContent=paused?'Play scene ▷':'Pause scene Ⅱ';
    motionButton.setAttribute('aria-pressed',String(!paused));
    motionButton.setAttribute('aria-label',paused?'Play cinematic scene':'Pause cinematic scene');
  }
  motionButton.addEventListener('click',()=>{paused=!paused;paintMotion();});
  motionPreference.addEventListener('change',e=>{reduced=e.matches;paused=reduced;paintMotion();});
  paintMotion();
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;}).observe(document.querySelector('.hud'));
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    // Native resolution, with a modest Retina boost and a bounded GPU workload.
    const density=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2400000/(w*h)));
    renderer.setPixelRatio(density);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.fov=w<700?53:37;camera.updateProjectionMatrix();
  }
  resize();window.addEventListener('resize',resize);
  const requestedTime=Number(new URLSearchParams(location.search).get('t'));
  let last=0,elapsed=Number.isFinite(requestedTime)?THREE.MathUtils.clamp(requestedTime,0,144):0;
  const position=new THREE.Vector3();
  landscape.update(elapsed,updateDayNight(elapsed));
  cameraPath.getPoint((elapsed/tourDuration)%1,camera.position);
  targetPath.getPoint((elapsed/tourDuration)%1,gaze);
  renderer.setAnimationLoop(time=>{
    if(!visible||document.hidden){last=time;return;}
    const dt=last?Math.min((time-last)/1000,.1):0;last=time;
    if(!paused)elapsed+=dt;
    const t=elapsed;
    if(!paused){
      const phase=(t/tourDuration)%1;
      cameraPath.getPoint(phase,position);
      targetPath.getPoint(phase,desiredGaze);
      hud.classList.toggle('on-journey',phase>.045&&phase<.96);
      smoothPointer.lerp(new THREE.Vector2(pointer.x,pointer.y),.025);
      position.x+=smoothPointer.x*.22;
      position.y+=smoothPointer.y*.12;
      camera.position.lerp(position,1-Math.exp(-dt*1.4));
      gaze.lerp(desiredGaze,1-Math.exp(-dt*1.4));
      const daylight=updateDayNight(t);
      landscape.update(t,daylight);
      emissive.color.setRGB(1,.73,.4).multiplyScalar(1-.6*daylight);

      motes.position.y=Math.sin(t*.18)*.3;
      motes.rotation.y=t*.007;
      haze.forEach(({sprite,x,z,phase})=>{
        sprite.position.x=x+Math.sin(t*.09+phase)*3;
        sprite.position.y=-.4+Math.sin(t*.12+phase)*.35;
        sprite.position.z=z+Math.cos(t*.06+phase)*.6;
      });
      lanterns.forEach((lamp,i)=>{lamp.intensity=(3+Math.sin(t*2.3+i*1.4)*.35+Math.sin(t*4.7+i)*.12)*(1-daylight*.9);});
      portalGlow.intensity=(8+Math.sin(t*.8)*1.4)*(1-daylight*.55);
      apertureMaterial.uniforms.time.value=t;
    }
    camera.lookAt(gaze);
    renderer.render(scene,camera);
    canvas.classList.add('ready');
  });
}
