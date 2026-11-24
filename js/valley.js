import * as THREE from 'three';
import { detailedMaterial, physicalUV, cragGeometry, batchArchitecture } from './detail.js?v=cinema-1';
import { plantForest } from './foliage.js?v=cinema-1';

// Distant landmarks and vegetation remain real geometry, lit by the same moving sun.
export function buildValley(scene) {
  const root = new THREE.Group();
  scene.add(root);
  let seed = 9183;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const stone = detailedMaterial(0xb5afba, 'stone');
  const darkStone = detailedMaterial(0x747d86, 'stone');
  const slate = detailedMaterial(0x42596d, 'tile');
  const timber = detailedMaterial(0x635343, 'wood');
  const linen = detailedMaterial(0xd8c7a0);
  const rock = detailedMaterial(0x657979, 'rock');
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffce81 });
  const mesh = (geometry, material, x, y, z, parent = root) => {
    const object = new THREE.Mesh(physicalUV(geometry), material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (w, h, d, x, y, z, material = stone, parent = root) =>
    mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);

  // A remote hilltop abbey gives the valley a destination beyond the village.
  const abbey = new THREE.Group();
  abbey.position.set(-26, 19, -76);
  root.add(abbey);
  const bluff = mesh(cragGeometry(2), rock, -26, 6, -76);
  bluff.scale.set(18, 15, 13);
  mesh(new THREE.CylinderGeometry(12, 14, 2, 32), darkStone, 0, -.6, 0, abbey);
  box(11, 9, 7, 0, 4.5, 0, stone, abbey);
  const roof = mesh(new THREE.ConeGeometry(8.2, 5.8, 4), slate, 0, 11.7, 0, abbey);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = .72;
  for (const x of [-8, 8]) {
    mesh(new THREE.CylinderGeometry(2.3, 2.8, 13, 24), stone, x, 6.5, 2, abbey);
    mesh(new THREE.CylinderGeometry(2.8, 2.8, .5, 24), darkStone, x, 12.6, 2, abbey);
    mesh(new THREE.ConeGeometry(3.2, 6, 48), slate, x, 16, 2, abbey);
    box(.12, 2, .12, x, 19.5, 2, darkStone, abbey);
    for (const y of [5, 9]) box(.55, 1.6, .07, x, y, 4.35, windowMaterial, abbey);
  }
  mesh(new THREE.CylinderGeometry(1.7, 2.1, 20, 16), stone, 0, 10, -3, abbey);
  mesh(new THREE.ConeGeometry(2.7, 8, 48), slate, 0, 24, -3, abbey);
  for (const x of [-3.5, 0, 3.5]) {
    box(.85, 3.6, .08, x, 6, 3.55, windowMaterial, abbey);
    box(.12, 3.7, .12, x, 6, 3.65, darkStone, abbey);
    box(1, .12, .12, x, 6.3, 3.65, darkStone, abbey);
  }
  // A stone arcade follows the ridge at the foot of the abbey.
  for (let i = 0; i < 7; i++) {
    const x = -11 + i * 3.6;
    box(.7, 4, 1.5, x, 2, 8, darkStone, abbey);
    if (i === 6) continue;
    const arch = new THREE.Shape();
    arch.absarc(0, 0, 1.8, 0, Math.PI, false);
    arch.absarc(0, 0, 1.35, Math.PI, 0, true);
    arch.closePath();
    mesh(new THREE.ExtrudeGeometry(arch, { depth: 1.4, bevelEnabled: false }), stone, x + 1.8, 4, 7.3, abbey);
  }
  box(22.3, .5, 2, -.2, 6, 8, stone, abbey);

  // A working windmill marks the agricultural edge of the settlement.
  const mill = new THREE.Group();
  mill.position.set(-52, 0, 20);
  root.add(mill);
  mesh(new THREE.CylinderGeometry(2, 3.1, 9, 20), stone, 0, 4.5, 0, mill);
  mesh(new THREE.ConeGeometry(3, 4, 48), slate, 0, 11, 0, mill);
  box(1, 2.1, .1, 0, 1.1, 3.03, timber, mill);
  for (const y of [4.5, 7]) box(.65, 1, .08, 0, y, 2.5, windowMaterial, mill);
  const sails = new THREE.Group();
  sails.position.set(0, 7.7, 2.55);
  sails.userData.animated = true;
  mill.add(sails);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = i * Math.PI / 2;
    sails.add(arm);
    box(.16, 6.8, .17, 0, 3, 0, timber, arm);
    box(1.15, 4.1, .06, .5, 3.9, .04, linen, arm);
    for (let j = 0; j < 9; j++) box(1.3, .045, .11, .5, 2 + j * .48, .1, timber, arm);
    box(.06, 4.3, .1, 1.08, 3.9, .1, timber, arm);
  }
  mesh(new THREE.SphereGeometry(.36, 16, 12), timber, 0, 7.7, 2.75, mill);

  // Instanced broadleaf crowns: rounded canopies, visible trunks, restrained autumn color.
  const treeSites = [];
  for (let i = 0; i < 100; i++) {
    const a = random() * Math.PI * 2, r = 57 + random() * 22;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x + 55, z - 20) < 11 || Math.hypot(x + 26, z + 76) < 19) continue;
    treeSites.push([x, 0, z, .7 + random() * .8]);
  }
  treeSites.push([-20, 0, 13, .7], [16, 0, 31, 1], [-45, 0, 42, 1.1], [32, 0, 23, .9]);
  plantForest(root, treeSites, 'broadleaf');
  const dummy = new THREE.Object3D(), color = new THREE.Color();

  // Planted meadow pockets use instancing instead of thousands of independent objects.
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), 2400);
  const stems = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .48, 3), new THREE.MeshStandardMaterial({ color: 0x64734c, roughness: 1 }), 2400);
  const beds = [[-42, -30, 9, 0], [36, 32, 13, 0], [-53, 40, 12, 0], [12, -32, 4, 1.07], [-13, -39, 2, 1.07], [5, 34, 2.5, 0]];
  for (let i = 0; i < 2400; i++) {
    const [x, z, radius, y] = beds[i % beds.length], a = random() * Math.PI * 2, r = Math.sqrt(random()) * radius;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, height = .25 + random() * .3;
    dummy.position.set(px, y + height * .5, pz); dummy.rotation.set(0, a, .08); dummy.scale.set(1, height / .48, 1); dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + height; dummy.scale.set(1.3, .65, 1.3); dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    color.set([0xc5a4cb, 0xe9d6a2, 0xa4b7d4, 0xc5a4cb][i % 4]); flowers.setColorAt(i, color);
  }
  root.add(stems, flowers);

  // A small harvest field beside the mill provides a deliberate pattern in wide shots.
  box(12, .08, 13, -55, -.01, 39, detailedMaterial(0x887047, 'earth'));
  const wheat = new THREE.InstancedMesh(new THREE.ConeGeometry(.08, .85, 4), new THREE.MeshStandardMaterial({ color: 0xb5a76b, roughness: 1 }), 960);
  for (let i = 0; i < 960; i++) {
    dummy.position.set(-60.3 + (i % 24) * .46 + random() * .1, .4, 33 + Math.floor(i / 24) * .3);
    dummy.rotation.set(.05, random() * 6, .1); dummy.scale.setScalar(.7 + random() * .4); dummy.updateMatrix(); wheat.setMatrixAt(i, dummy.matrix);
  }
  root.add(wheat);

  // Round, fading embers replace square particles; these appear only after dusk.
  const fireflyPositions = new Float32Array(160 * 3), phases = new Float32Array(160);
  for (let i = 0; i < 160; i++) {
    fireflyPositions.set([(random() - .5) * 100, .7 + random() * 3, (random() - .5) * 95], i * 3);
    phases[i] = random() * Math.PI * 2;
  }
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  fireflyGeometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  const fireflyMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, night: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time;attribute float phase;varying float glow;
      void main(){vec3 p=position;p.x+=sin(time*.23+phase)*.8;p.y+=sin(time*.41+phase)*.4;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(80./-mv.z,1.,5.);glow=pow(.5+.5*sin(time*.8+phase),2.);}`,
    fragmentShader: `uniform float night;varying float glow;void main(){float d=length(gl_PointCoord-.5)*2.;
      gl_FragColor=vec4(1.,.72,.3,(1.-smoothstep(.05,1.,d))*glow*night*.8);}`,
  });
  root.add(new THREE.Points(fireflyGeometry, fireflyMaterial));

  // Soft lantern halos and pools of warm light make night streets legible.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const context = glowCanvas.getContext('2d'), gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,.7)');
  gradient.addColorStop(.2, 'rgba(255,255,255,.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffc071, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, color: 0xefab60, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const [x, z] of [[-25, 20], [-20, 40], [-5, 36], [3, 22], [15, 3]]) {
    const glow = new THREE.Sprite(glowMaterial); glow.position.set(x, 3.3, z); glow.scale.set(2.2, 2.2, 1); root.add(glow);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), poolMaterial);
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, .23, z); root.add(pool);
  }
  batchArchitecture(root);
  return { update(t, daylight) {
    sails.rotation.z = t * .13;
    windowMaterial.color.setRGB(1, .66, .28).multiplyScalar(1 - daylight * .55);
    fireflyMaterial.uniforms.time.value = t;
    fireflyMaterial.uniforms.night.value = 1 - daylight;
    glowMaterial.opacity = (1 - daylight) * .6;
    poolMaterial.opacity = (1 - daylight) * .25;
  } };
}
