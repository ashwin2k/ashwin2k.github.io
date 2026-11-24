import * as THREE from 'three';
import { detailedMaterial } from './detail.js?v=cinema-1';

const cache = new Map();
const clock = { value: 0 };
export function updateFoliage(time) { clock.value = time; }

function foliageResources(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const pine = kind === 'pine';
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (pine) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#717955'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(64, 116); ctx.lineTo(64, 10); ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const y = 17 + i * 4;
      for (const side of [-1, 1]) {
        ctx.strokeStyle = i % 2 ? '#afc596' : '#d1dfb3'; ctx.lineWidth = 2.7;
        ctx.beginPath(); ctx.moveTo(64, y + 6);
        ctx.quadraticCurveTo(64 + side * 17, y + 1, 64 + side * (12 + i * 1.1), y - 11); ctx.stroke();
      }
    }
  } else {
    const fill = ctx.createLinearGradient(26, 0, 100, 128);
    fill.addColorStop(0, '#d8dfb4'); fill.addColorStop(.5, '#a5b582'); fill.addColorStop(1, '#728557');
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(64, 8);
    ctx.bezierCurveTo(114, 32, 116, 83, 64, 119); ctx.bezierCurveTo(10, 85, 17, 29, 64, 8); ctx.fill();
    ctx.strokeStyle = '#e0e5ba85'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(64, 14); ctx.lineTo(64, 114); ctx.stroke();
    for (let i = 0; i < 7; i++) for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(64, 30 + i * 11); ctx.lineTo(64 + side * (17 + Math.sin(i * .5) * 12), 19 + i * 11); ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map, color: pine ? 0x96a784 : 0xb1bd98,
    roughness: .88, side: THREE.DoubleSide, alphaTest: .35, alphaToCoverage: true });
  const depth = new THREE.MeshDepthMaterial({ map, alphaTest: .35, side: THREE.DoubleSide, depthPacking: THREE.RGBADepthPacking });
  const breeze = shader => {
    shader.uniforms.foliageTime = clock;
    shader.vertexShader = 'uniform float foliageTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float windPhase=0.;
      #ifdef USE_INSTANCING
        windPhase=(instanceMatrix[3].x+instanceMatrix[3].z)*.11;
      #endif
      float sway=sin(foliageTime*.7+position.y*1.4+position.x+windPhase)*.035*pow(max(position.y,0.)/5.,2.);
      transformed.x+=sway;transformed.z+=sway*.45;`);
  };
  material.onBeforeCompile = depth.onBeforeCompile = breeze;
  material.customProgramCacheKey = depth.customProgramCacheKey = () => 'foliage-breeze-v1';
  let seed = pine ? 591 : 729;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const positions = [], normals = [], uvs = [];
  const center = new THREE.Vector3(), normal = new THREE.Vector3(), horizontal = new THREE.Vector3(), vertical = new THREE.Vector3();
  const count = pine ? 390 : 680;
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2;
    if (pine) {
      const tier = i % 9, y = .9 + tier * .42;
      const r = (.25 + random() * .75) * (1.45 - tier * .14);
      center.set(Math.cos(a) * r, y + random() * .45, Math.sin(a) * r);
    } else {
      const h = random() * 2 - 1, r = Math.sqrt(1 - h * h) * (1.3 + random() * .4);
      center.set(Math.cos(a) * r, 3.7 + h * 1.55, Math.sin(a) * r);
    }
    normal.set(Math.cos(a) * .8, .3 + random() * .5, Math.sin(a) * .8).normalize();
    horizontal.crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize(); vertical.crossVectors(normal, horizontal).normalize();
    const width = pine ? .42 + random() * .25 : .18 + random() * .19;
    const height = pine ? .55 + random() * .3 : width * 1.5;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
      const point = center.clone().addScaledVector(horizontal, (u - .5) * width).addScaledVector(vertical, (v - .5) * height);
      positions.push(point.x, point.y, point.z); normals.push(normal.x, normal.y, normal.z); uvs.push(u, v);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const result = { geometry, material, depth }; cache.set(kind, result); return result;
}

export function plantForest(parent, sites, kind = 'pine') {
  if (!sites.length) return;
  const { geometry, material, depth } = foliageResources(kind);
  const crowns = new THREE.InstancedMesh(geometry, material, sites.length);
  crowns.customDepthMaterial = depth; crowns.castShadow = crowns.receiveShadow = true;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.065, .18, 4.6, 10, 4), detailedMaterial(0xada69b, 'bark'), sites.length);
  trunks.castShadow = trunks.receiveShadow = true;
  const pose = new THREE.Object3D(), color = new THREE.Color();
  sites.forEach(([x, y, z, scale], i) => {
    pose.position.set(x, y, z); pose.rotation.set(0, i * 2.4, 0); pose.scale.set(scale, scale, scale); pose.updateMatrix();
    crowns.setMatrixAt(i, pose.matrix);
    color.setHSL(kind === 'pine' ? .25 : .23 + (i % 5) * .012, .18, .6 + (i % 3) * .04); crowns.setColorAt(i, color);
    pose.position.y = y + 2.3 * scale; pose.updateMatrix(); trunks.setMatrixAt(i, pose.matrix);
  });
  parent.add(crowns, trunks);
}
