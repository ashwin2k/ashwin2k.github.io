import * as THREE from 'three';

// A full dawn/day/dusk/night rotation, independent of the camera's tour length.
export function createDayNight(scene, renderer, camera, key, fill, ambient, moon, stars) {
  const uniforms={zenith:{value:new THREE.Color()},horizon:{value:new THREE.Color()},
    time:{value:0},daylight:{value:0},sunDirection:{value:new THREE.Vector3()},
    cloudColor:{value:new THREE.Color()}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(100,32,20),new THREE.ShaderMaterial({
    uniforms,side:THREE.BackSide,depthWrite:false,depthTest:false,
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      uniform vec3 zenith,horizon,sunDirection,cloudColor;
      uniform float time,daylight;
      varying vec3 direction;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=noise(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.03;a*=.5;}return v;}
      void main(){
        vec3 dir=normalize(direction);
        float h=clamp(dir.y,0.,1.);
        vec3 color=mix(horizon,zenith,pow(h,.65));
        float sunGlow=pow(max(dot(dir,sunDirection),0.),20.);
        color+=vec3(1.,.52,.22)*sunGlow*.28*daylight;
        vec2 uv=dir.xz/(max(dir.y,0.)+.3)*2.3+vec2(time*.004,0.);
        float cloud=fbm(uv),detail=fbm(uv*2.5+3.);
        float coverage=smoothstep(.57,.76,cloud+detail*.12)*smoothstep(0.,.16,h);
        vec3 shade=mix(cloudColor*.65,cloudColor,smoothstep(.48,.72,cloud));
        color=mix(color,shade,coverage*.8);
        // Faint curtains of northern light emerge slowly in the night sky.
        float az=atan(dir.x,dir.z);
        float ribbon=.3+.07*sin(az*3.+time*.025)+.03*sin(az*9.-time*.04);
        float aurora=exp(-abs(h-ribbon)*26.)*smoothstep(.2,.9,noise(vec2(az*14.,time*.035)));
        color+=mix(vec3(.08,.32,.27),vec3(.22,.12,.4),h)*aurora*pow(1.-daylight,3.)*.4;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.frustumCulled=false;sky.renderOrder=-100;scene.add(sky);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(2.3,24,16),new THREE.MeshBasicMaterial({color:0xffe4ab,fog:false,toneMapped:false}));scene.add(sun);
  moon.material.transparent=true;moon.material.fog=false;
  stars.material.transparent=true;stars.material.depthWrite=false;
  const nightTop=new THREE.Color('#101d38'),dayTop=new THREE.Color('#5c93b9'),duskTop=new THREE.Color('#68799d');
  const nightHorizon=new THREE.Color('#4b526d'),dayHorizon=new THREE.Color('#acc9da'),duskHorizon=new THREE.Color('#f1b77c');
  const cloudNight=new THREE.Color('#4c5a77'),cloudDay=new THREE.Color('#e9e4d7'),cloudDusk=new THREE.Color('#f4c79d');
  const blue=new THREE.Color('#bdcfff'),gold=new THREE.Color('#ffbd79'),white=new THREE.Color('#fff1d8');
  const groundNight=new THREE.Color('#2d243c'),groundDay=new THREE.Color('#777767');
  const ambientDay=new THREE.Color('#e6efff');
  return function update(t) {
    const angle=t/180*Math.PI*2+.12;
    const elevation=Math.sin(angle);
    const day=THREE.MathUtils.smoothstep(elevation,-.14,.4);
    const twilight=Math.exp(-Math.pow(elevation/.28,2));
    uniforms.time.value=t;
    uniforms.daylight.value=day;
    uniforms.cloudColor.value.copy(cloudNight).lerp(cloudDay,day).lerp(cloudDusk,twilight*.7);
    uniforms.zenith.value.copy(nightTop).lerp(dayTop,day).lerp(duskTop,twilight*.45);
    uniforms.horizon.value.copy(nightHorizon).lerp(dayHorizon,day).lerp(duskHorizon,twilight*.8);
    sky.position.copy(camera.position);
    scene.fog.color.copy(uniforms.horizon.value);
    scene.fog.density=.006+twilight*.002;
    sun.position.set(Math.cos(angle)*70,elevation*65,-45);
    uniforms.sunDirection.value.copy(sun.position).normalize();
    sun.visible=elevation>-.08;
    sun.material.color.copy(gold).lerp(white,THREE.MathUtils.smoothstep(elevation,0,.6));
    moon.position.set(-Math.cos(angle)*65,-elevation*60,-55);moon.lookAt(camera.position);
    moon.material.opacity=1-day;moon.visible=day<.98;
    stars.material.opacity=(1-day)*.85;
    ambient.color.copy(blue).lerp(ambientDay,day);
    ambient.groundColor.copy(groundNight).lerp(groundDay,day);
    ambient.intensity=1.7+day*.7;
    key.position.set(Math.cos(angle)*65,Math.max(8,Math.abs(elevation)*65),-30*Math.tanh(elevation/.12));
    key.color.copy(blue).lerp(white,day).lerp(gold,twilight*.7);
    key.intensity=.85+day*3.5;
    fill.intensity=.55*(1-day)+.25;
    renderer.toneMappingExposure=1.05;
    // Keep the shadow map in sync with the light on every animated frame.
    renderer.shadowMap.needsUpdate=true;
    return day;
  };
}
