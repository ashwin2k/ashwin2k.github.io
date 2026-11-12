import * as THREE from 'three';

// A full dawn/day/dusk/night rotation, independent of the camera's tour length.
export function createDayNight(scene, renderer, camera, key, fill, ambient, moon, stars) {
  const uniforms={zenith:{value:new THREE.Color()},horizon:{value:new THREE.Color()}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(100,32,20),new THREE.ShaderMaterial({
    uniforms,side:THREE.BackSide,depthWrite:false,depthTest:false,
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      uniform vec3 zenith,horizon;
      varying vec3 direction;
      void main(){
        float h=clamp(normalize(direction).y,0.,1.);
        gl_FragColor=vec4(mix(horizon,zenith,pow(h,.55)),1.);
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.frustumCulled=false;sky.renderOrder=-100;scene.add(sky);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(2.3,24,16),new THREE.MeshBasicMaterial({color:0xffe4ab,fog:false,toneMapped:false}));scene.add(sun);
  moon.material.transparent=true;moon.material.fog=false;
  stars.material.transparent=true;stars.material.depthWrite=false;
  const nightTop=new THREE.Color('#080f29'),dayTop=new THREE.Color('#659dcc'),duskTop=new THREE.Color('#64597d');
  const nightHorizon=new THREE.Color('#2d2947'),dayHorizon=new THREE.Color('#d9d9cb'),duskHorizon=new THREE.Color('#e99a70');
  const blue=new THREE.Color('#bdcfff'),gold=new THREE.Color('#ffbd79'),white=new THREE.Color('#fff1d8');
  const groundNight=new THREE.Color('#2d243c'),groundDay=new THREE.Color('#777767');
  const ambientDay=new THREE.Color('#e6efff');
  return function update(t) {
    const angle=t/120*Math.PI*2-.38;
    const elevation=Math.sin(angle);
    const day=THREE.MathUtils.smoothstep(elevation,-.14,.4);
    const twilight=Math.exp(-Math.pow(elevation/.19,2));
    uniforms.zenith.value.copy(nightTop).lerp(dayTop,day).lerp(duskTop,twilight*.45);
    uniforms.horizon.value.copy(nightHorizon).lerp(dayHorizon,day).lerp(duskHorizon,twilight*.8);
    sky.position.copy(camera.position);
    scene.fog.color.copy(uniforms.horizon.value);
    scene.fog.density=.009+twilight*.003;
    sun.position.set(Math.cos(angle)*70,elevation*65,-45);
    sun.visible=elevation>-.08;
    sun.material.color.copy(gold).lerp(white,THREE.MathUtils.smoothstep(elevation,0,.6));
    moon.position.set(-Math.cos(angle)*65,-elevation*60,-55);moon.lookAt(camera.position);
    moon.material.opacity=1-day;moon.visible=day<.98;
    stars.material.opacity=(1-day)*.85;
    ambient.color.copy(blue).lerp(ambientDay,day);
    ambient.groundColor.copy(groundNight).lerp(groundDay,day);
    ambient.intensity=1.35+day*1.2;
    key.position.set(Math.cos(angle)*65,Math.max(8,Math.abs(elevation)*65),-30*Math.tanh(elevation/.12));
    key.color.copy(blue).lerp(white,day).lerp(gold,twilight*.7);
    key.intensity=.65+day*3.8;
    fill.intensity=.55*(1-day)+.25;
    renderer.toneMappingExposure=1.05;
    // Keep the shadow map in sync with the light on every animated frame.
    renderer.shadowMap.needsUpdate=true;
    return day;
  };
}
