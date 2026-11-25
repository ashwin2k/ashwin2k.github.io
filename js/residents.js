import * as THREE from 'three';

// Articulated figures share instanced meshes, including their moving limbs.
// Routes use the village's actual lanes; stride is driven by distance traveled.
export function createResidents(scene) {
  const root = new THREE.Group(); scene.add(root);
  const batches = new Map(), actors = [];
  const cloth = [0x637d79, 0x9a6854, 0x6f5978, 0x9d8b59, 0x526b87].map(color => new THREE.MeshStandardMaterial({color,roughness:.96}));
  const skin = [0xc69b77,0x8c6249,0xd4b091].map(color => new THREE.MeshStandardMaterial({color,roughness:.85}));
  const leather = new THREE.MeshStandardMaterial({color:0x3e3029,roughness:1});
  const linen = new THREE.MeshStandardMaterial({color:0xccbfa0,roughness:1});
  const hair = new THREE.MeshStandardMaterial({color:0x392b25,roughness:1});
  const iron = new THREE.MeshStandardMaterial({color:0x848c8a,roughness:.6,metalness:.35});
  const timber = new THREE.MeshStandardMaterial({color:0x806044,roughness:1});
  const geometry = {
    torso:new THREE.CylinderGeometry(.21,.26,.55,12),
    head:new THREE.SphereGeometry(.16,16,12),
    hand:new THREE.SphereGeometry(.07,10,8),
    limb:new THREE.CapsuleGeometry(.065,.22,4,8),
    boot:new THREE.CapsuleGeometry(.075,.15,4,8),
    hat:new THREE.CylinderGeometry(.21,.23,.08,16),
    cap:new THREE.SphereGeometry(.165,16,8,0,Math.PI*2,0,Math.PI*.55),
    belt:new THREE.CylinderGeometry(.25,.255,.07,12),
    crate:new THREE.BoxGeometry(.5,.37,.4),
    slat:new THREE.BoxGeometry(.54,.04,.03),
    apron:new THREE.BoxGeometry(.31,.43,.025),
    staff:new THREE.CylinderGeometry(.025,.025,1.6,8),
  };
  function part(parent,shape,material,x,y,z,scale=[1,1,1]) {
    const pose = new THREE.Object3D(); pose.position.set(x,y,z);pose.scale.set(...scale);parent.add(pose);
    const key=shape+material.uuid;
    if(!batches.has(key))batches.set(key,{geometry:geometry[shape],material,poses:[]});
    batches.get(key).poses.push(pose);return pose;
  }
  const makeJoint=(parent,x,y,z)=>{const joint=new THREE.Object3D();joint.position.set(x,y,z);parent.add(joint);return joint;};
  function person({points,role='shopper',color=0,offset=0,speed=.6,wait=3,yaw=0,scale=1}) {
    const rig=new THREE.Group();root.add(rig);rig.scale.setScalar(scale);
    const body=makeJoint(rig,0,0,0),coat=cloth[color%cloth.length],face=skin[color%skin.length];
    part(body,'torso',coat,0,.96,0);part(body,'belt',leather,0,.78,0);
    part(body,'torso',linen,0,1.235,0,[.46,.16,.6]);
    const head=makeJoint(body,0,1.4,0);part(head,'head',face,0,0,0,[.9,1.16,1]);
    part(head,'cap',role==='guard'?iron:hair,0,.06,-.015);
    // Nose, ears and a brim give the faces a readable direction without decals.
    part(head,'hand',face,0,-.01,.15,[.45,.5,.7]);
    for(const side of [-1,1])part(head,'hand',hair,side*.053,.035,.143,[.18,.18,.18]);
    for(const side of [-1,1])part(head,'hand',face,side*.143,-.015,0,[.38,.6,.45]);
    if(role!=='guard')part(head,'hat',coat,0,.14,0);
    const legs=[],knees=[],arms=[],elbows=[];
    for(const side of [-1,1]){
      const leg=makeJoint(body,side*.115,.7,0),knee=makeJoint(leg,0,-.3,0);
      part(leg,'limb',leather,0,-.15,0);part(knee,'limb',leather,0,-.15,0);
      const boot=part(knee,'boot',leather,0,-.34,.055,[1,1,1.15]);boot.rotation.x=Math.PI/2;
      legs.push(leg);knees.push(knee);
      const arm=makeJoint(body,side*.25,1.16,0),elbow=makeJoint(arm,0,-.28,0);
      part(arm,'limb',coat,0,-.14,0);part(elbow,'limb',coat,0,-.13,0,[.88,.9,.88]);
      part(elbow,'hand',face,0,-.285,0);arms.push(arm);elbows.push(elbow);
    }
    if(role==='merchant')part(body,'apron',linen,0,.82,.245);
    if(role==='carrier'){
      part(body,'crate',timber,0,.91,.42);
      for(const y of [.8,.95,1.07])part(body,'slat',leather,0,y,.635);
    }
    if(role==='guard')part(arms[1],'staff',timber,.05,-.3,.13);
    const nodes=points.map(p=>new THREE.Vector3(...p));
    const curve=nodes.length>1?new THREE.CatmullRomCurve3(nodes,false,'centripetal'):null;
    const length=curve?curve.getLength():0,travel=length/speed;
    const actor={rig,body,head,legs,knees,arms,elbows,curve,nodes,role,offset,speed,wait,travel,length,yaw};
    actors.push(actor);return actor;
  }
  // The central avenue is open between the two rows of market stalls.
  person({points:[[-15,.17,39],[-15.3,.17,33],[-15,.17,27],[-18,.17,23]],color:0,offset:0});
  person({points:[[-14,.17,25],[-13.5,.17,30],[-13.8,.17,35],[-13,.17,40]],role:'carrier',color:1,offset:8,speed:.55,wait:5});
  person({points:[[-18,.17,32],[-16,.17,31],[-13,.17,31],[-11.6,.17,30]],color:2,offset:4,speed:.45,wait:7,scale:.96});
  person({points:[[-19,.17,24],[-22,.17,18],[-24.5,.17,10],[-25,.17,4]],role:'carrier',color:3,offset:15,speed:.6});
  person({points:[[-10,.18,29],[-5,.18,27],[1,.18,23],[6,.18,21]],color:4,offset:11,speed:.58});
  person({points:[[-31,.18,40],[-34,.18,32],[-35,.18,24],[-35,.18,17]],color:1,offset:23,speed:.6});
  person({points:[[7,.2,31],[10,.2,24],[17,.2,18]],color:2,offset:5,speed:.5});
  person({points:[[-24.5,.16,-3],[-24.8,.16,-7],[-26,.16,-10]],color:0,offset:7,speed:.45});
  // Shopkeepers face customers across the counter, with small serving gestures.
  person({points:[[-20.3,.16,26.9]],role:'merchant',color:3,yaw:.2,offset:1});
  person({points:[[-11.8,.16,24.9]],role:'merchant',color:1,yaw:-.2,offset:3});
  person({points:[[-19.6,.16,37.1]],role:'merchant',color:0,yaw:2.7,offset:6});
  person({points:[[-9.7,.16,37.1]],role:'merchant',color:4,yaw:3.4,offset:8});
  person({points:[[-7.5,.16,32.1]],role:'merchant',color:2,yaw:-1.5,offset:11});
  person({points:[[-20,.16,-14.2]],role:'merchant',color:3,yaw:0,offset:13});
  person({points:[[-9,1.17,-38],[-5,1.17,-39],[-1,1.17,-41],[4,1.17,-40]],role:'guard',color:4,speed:.45,offset:5,wait:4});
  person({points:[[-7.9,11.99,-44.2],[-7.6,11.99,-45.8],[-6.1,11.99,-45.8]],role:'guard',color:0,speed:.3,offset:1,wait:5});
  for(const batch of batches.values()){
    batch.mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.poses.length);
    batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.mesh.castShadow=batch.mesh.receiveShadow=true;
    // Animated instances range across the village, so a stale initial bound is unsafe.
    batch.mesh.frustumCulled=false;scene.add(batch.mesh);
  }
  const facing=new THREE.Vector3(),point=new THREE.Vector3();
  function update(time){
    for(const a of actors){
      const t=time+a.offset,period=2*(a.travel+a.wait);
      let gait=0,moving=false,heading=a.yaw,legTime=0;
      if(a.curve){
        const phase=((t%period)+period)%period,returning=phase>a.travel+a.wait;
        legTime=returning?phase-a.travel-a.wait:phase;
        moving=legTime<a.travel;
        const progress=Math.min(1,legTime/a.travel),u=returning?1-progress:progress;
        a.curve.getPointAt(u,point);a.rig.position.copy(point);
        a.curve.getTangentAt(u,facing);heading=Math.atan2(facing.x,facing.z)+(returning?Math.PI:0);
        // Rotate at the destination while waiting, then walk back without snapping.
        if(!moving)heading+=Math.PI*THREE.MathUtils.smoothstep(legTime-a.travel,.4,a.wait-.2);
        gait=progress*a.length*9;
      }else a.rig.position.copy(a.nodes[0]);
      a.rig.rotation.y=heading;
      const walkBlend=a.curve?THREE.MathUtils.smoothstep(legTime,0,.4)*(1-THREE.MathUtils.smoothstep(legTime,a.travel-.4,a.travel)):0;
      const stride=moving?.38*walkBlend:0;
      a.body.position.y=moving?Math.abs(Math.sin(gait))*.025:Math.sin(t*1.4)*.006;
      a.body.rotation.z=moving?Math.sin(gait)*.018:0;
      a.head.rotation.y=Math.sin(t*.55)*.13;a.head.rotation.x=Math.sin(t*.7)*.035;
      a.legs.forEach((leg,i)=>{const swing=Math.sin(gait+i*Math.PI)*stride;leg.rotation.x=swing;a.knees[i].rotation.x=Math.max(0,-swing)*.9;});
      a.arms.forEach((arm,i)=>{
        const carrying=a.role==='carrier';
        arm.rotation.x=carrying?-.7:a.role==='merchant'?-1.1-Math.max(0,Math.sin(t*.8+i))*.25:-Math.sin(gait+i*Math.PI)*stride*.65;
        arm.rotation.z=(i?1:-1)*(carrying?.16:.08);
        a.elbows[i].rotation.x=carrying?-.9:a.role==='merchant'?-1:-.12;
        if(a.role==='guard'&&i===1){arm.rotation.x=-.16;a.elbows[i].rotation.x=-.2;}
      });
    }
    root.updateMatrixWorld(true);
    for(const batch of batches.values()){
      batch.poses.forEach((pose,i)=>batch.mesh.setMatrixAt(i,pose.matrixWorld));
      batch.mesh.instanceMatrix.needsUpdate=true;
    }
  }
  update(0);
  return {update,actors};
}
