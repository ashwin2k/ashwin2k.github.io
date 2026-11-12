import * as THREE from 'three';
import { detailedMaterial, physicalUV, cragGeometry, batchArchitecture } from './detail.js';

// Shared coordinates keep every district connected to the same valley.
export function buildLandscape(scene) {
  const root = new THREE.Group();
  scene.add(root);
  let seed = 402;
  const rand = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const material = (color,kind='plaster') => detailedMaterial(color,kind);
  const stone = material(0x9185a0,'stone'), soil = material(0x57516b,'earth'), grass = material(0x4f655e,'earth');
  const roof = material(0x795c80,'tile'), plaster = material(0xbfa8aa), wood = material(0x60504b,'wood');
  const naturalRock=material(0x827b8e,'earth');
  const pine = material(0x323f50), pineLight = material(0x455767), snow = material(0xb3a9c6);
  const warm = new THREE.MeshBasicMaterial({color:0xffd8a1});
  const mesh = (geo,mat,x,y,z,parent=root) => {
    const m = new THREE.Mesh(mat.isMeshStandardMaterial?physicalUV(geo):geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=!mat.transparent;parent.add(m);return m;
  };
  const box = (w,h,d,x,y,z,mat=stone,parent=root) => mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const cylinder = (r1,r2,h,x,y,z,mat=stone,n=8,parent=root) => mesh(new THREE.CylinderGeometry(r1,r2,h,Math.max(n,16)),mat,x,y,z,parent);

  // Continuous dry ground connects the village districts.
  const floor=mesh(new THREE.CircleGeometry(115,48),grass,0,-.12,0);
  floor.rotation.x=-Math.PI/2;


  function terrace(x,z,r,y) {
    cylinder(r*.95,r*1.12,12,x,y-6,z,soil,10);
    cylinder(r,r*.95,.7,x,y-.3,z,grass,10);
    for(let i=0;i<8;i++) {
      const a=i/8*Math.PI*2;
      const out=cylinder(1+rand(),1.7,4+rand()*3,x+Math.cos(a)*r*.9,y-3,z+Math.sin(a)*r*.9,naturalRock,5);
      out.rotation.y=a;
    }
  }
  terrace(-24,-12,16,0);
  terrace(25,-24,14,1);
  terrace(1,-42,18,1);
  terrace(0,13,12,-2);
  terrace(-35,25,13,-1);

  // A mountain ring surrounds the entire map, so wide camera views remain complete.
  for(let i=0;i<32;i++) {
    const a=i/32*Math.PI*2,r=84+rand()*17,h=18+rand()*30;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const mountainGeo=new THREE.ConeGeometry(11+rand()*10,h,32,10);
    const vertices=mountainGeo.attributes.position;
    for(let j=0;j<vertices.count;j++){
      const px=vertices.getX(j),py=vertices.getY(j),pz=vertices.getZ(j);
      const angle=Math.atan2(pz,px),height=(py+h/2)/h;
      const ridge=1+.17*Math.sin(angle*7+i)+.08*Math.sin(py*.9+angle*11);
      vertices.setXYZ(j,px*ridge+height*height*3*Math.sin(i),py,pz*ridge+height*height*2*Math.cos(i));
    }
    mountainGeo.computeVertexNormals();
    mesh(mountainGeo,i%2?soil:naturalRock,x,h/2-10,z);
  }

  const foliageGeo=cragGeometry(1);
  function tree(x,y,z,s=1) {
    cylinder(.1*s,.22*s,3.1*s,x,y+1.55*s,z,wood,9);
    for(let level=0;level<4;level++) {
      const radius=(1.25-level*.23)*s;
      for(let branch=0;branch<5;branch++){
        const angle=branch/5*Math.PI*2+level*.7;
        const foliage=mesh(foliageGeo,level%2?pineLight:pine,x+Math.cos(angle)*radius*.35,y+(1.3+level*.65)*s,z+Math.sin(angle)*radius*.35);
        foliage.scale.set(radius*.65,.52*s,radius*.65);foliage.rotation.y=angle;
      }
    }
    const tip=mesh(foliageGeo,pineLight,x,y+4*s,z);tip.scale.set(.3*s,.7*s,.3*s);
  }
  // Groves follow the outer banks; paths and plazas stay clear.
  for(let i=0;i<135;i++) {
    const side=i%2?-1:1;
    const x=side*(18+rand()*22),z=-42+rand()*66;
    let y=-7.9;
    if(Math.hypot(x+24,z+12)<14)y=0;
    else if(Math.hypot(x-25,z+24)<12)y=1;
    else if(Math.hypot(x+35,z-25)<11)y=-1;
    const inVillageStreet=x>-36&&x<-11&&z>-26&&z<2;
    if(y>-7&&!inVillageStreet)tree(x,Math.max(0,y),z,.65+rand()*.7);
  }

  // Varied medieval trades and rooflines share a timber-and-stone vocabulary.
  const chimneys=[];
  const wallColors=[plaster,material(0xc8b9a0),material(0xa3a9b0),material(0xb99385)];
  const roofColors=[roof,material(0x435769,'tile'),material(0x886452,'tile'),material(0x726955,'tile')];
  const iron=material(0x343442),shutter=material(0x53696b),brick=material(0x927c83,'stone');
  function beam(a,b,width,mat,parent){
    const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),delta=v2.clone().sub(v1);
    const m=mesh(new THREE.BoxGeometry(width,delta.length(),width),mat,0,0,0,parent);
    m.position.copy(v1.add(v2).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  function gable(w,d,rh,y,mat,parent){
    const rw=w/2+.3,rd=d/2+.3;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute([
      -rw,0,rd,rw,0,rd,0,rh,rd, rw,0,-rd,-rw,0,-rd,0,rh,-rd,
      -rw,0,-rd,-rw,0,rd,0,rh,rd, -rw,0,-rd,0,rh,rd,0,rh,-rd,
      rw,0,rd,rw,0,-rd,0,rh,-rd, rw,0,rd,0,rh,-rd,0,rh,rd,
    ],3));geo.computeVertexNormals();mesh(geo,mat,0,y,0,parent);
    box(.15,.15,d+.75,0,y+rh,0,wood,parent);
    for(const side of [-1,1]){
      beam([side*rw,y,rd+.025],[0,y+rh,rd+.025],.12,wood,parent);
      beam([side*rw,y,-rd-.025],[0,y+rh,-rd-.025],.12,wood,parent);
      const rows=8,columns=Math.ceil(d/.34);
      const tiles=new THREE.InstancedMesh(physicalUV(new THREE.BoxGeometry(Math.hypot(rw,rh)/rows+.07,.075,(d+.6)/columns-.015)),mat,rows*columns);
      const dummy=new THREE.Object3D();let tileIndex=0;
      for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
        const f=(row+.5)/rows;
        dummy.position.set(side*rw*(1-f),y+rh*f+.065,-rd+(col+.5)*(d+.6)/columns);
        dummy.rotation.set(0,0,-side*Math.atan2(rh,rw));dummy.updateMatrix();tiles.setMatrixAt(tileIndex++,dummy.matrix);
      }
      tiles.castShadow=tiles.receiveShadow=true;parent.add(tiles);
    }
  }
  function barrel(x,y,z,parent=root){
    cylinder(.28,.34,.65,x,y+.33,z,wood,10,parent);
    for(const h of [.13,.52])cylinder(.345,.345,.055,x,y+h,z,iron,10,parent);
  }
  function windowAt(x,y,z,parent){
    box(.72,.95,.08,x,y,z,wood,parent);box(.54,.75,.09,x,y,z+.05,warm,parent);
    box(.055,.8,.12,x,y,z+.1,wood,parent);box(.58,.055,.12,x,y,z+.1,wood,parent);
    box(.87,.09,.22,x,y-.49,z,brick,parent);
    for(const side of [-1,1])box(.22,.85,.07,x+side*.49,y,z,shutter,parent);
  }
  function house(x,z,w,d,h,rotation,kind,index){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);
    const tall=kind==='inn',rh=kind==='barn'?1.3:2;
    const wallMat=wallColors[index%4],roofMat=roofColors[index%4];
    box(w,h,d,0,h/2,0,wallMat,g);
    box(w+.12,.6,d+.12,0,.3,0,stone,g);
    // Exposed corner posts, horizontal floor beams and diagonal braces.
    for(const sx of [-1,1])for(const sz of [-1,1])box(.17,h,.17,sx*(w/2-.04),h/2,sz*(d/2-.04),wood,g);
    for(const y of [.65,h,tall?2.5:h*.52])box(w+.12,.14,d+.12,0,y,0,wood,g);
    for(const sz of [-1,1])for(const sx of [-1,1]){
      beam([sx*(w/2-.2),h-.2,sz*(d/2+.04)],[sx*(w/2-.95),h-.95,sz*(d/2+.04)],.12,wood,g);
    }
    if(tall){
      box(w+.4,2.3,d+.3,0,h-1.1,0,wallMat,g);
      for(const sx of [-1,0,1])box(.16,2.3,.16,sx*w*.47,h-1.1,d/2+.18,wood,g);
      box(w+.55,.2,d+.5,0,h-2.3,0,wood,g);
    }
    gable(w+(tall?.4:0),d+(tall?.3:0),rh,h,roofMat,g);
    for(const sx of [-1,1])windowAt(sx*w*.27,tall?3.8:1.7,d/2+(tall?.2:.04),g);
    if(tall)for(const sx of [-1,1])windowAt(sx*w*.28,1.45,d/2+.04,g);
    // Side windows make the buildings read from the moving camera, too.
    for(const side of [-1,1]){
      const wg=new THREE.Group();wg.position.set(side*(w/2+.04),0,0);wg.rotation.y=side*Math.PI/2;g.add(wg);
      windowAt(0,1.6,0,wg);
    }
    box(.98,1.75,.12,0,.88,d/2+.06,wood,g);
    for(let j=-2;j<=2;j++)box(.025,1.6,.03,j*.17,.86,d/2+.14,brick,g);
    for(const y of [.45,1.25])box(.8,.07,.04,0,y,d/2+.18,iron,g);
    box(.09,.09,.06,.3,.9,d/2+.2,warm,g);
    box(1.35,.18,.7,0,.09,d/2+.4,stone,g);
    box(.55,1.65,.6,w*.27,h+.8,-.4,brick,g);
    for(let j=0;j<4;j++)box(.6,.045,.65,w*.27,h+.2+j*.35,-.4,stone,g);
    box(.75,.12,.8,w*.27,h+1.65,-.4,stone,g);
    const p=new THREE.Vector3(w*.27,h+1.8,-.4);g.localToWorld(p);chimneys.push(p);
    // Hanging lantern and a sign identify each entrance.
    beam([-.8,2.2,d/2],[-.8,2.2,d/2+.65],.07,iron,g);
    box(.22,.32,.22,-.8,1.94,d/2+.58,warm,g);
    box(.32,.07,.32,-.8,2.13,d/2+.58,iron,g);
    barrel(w/2+.4,0,d/2-.2,g);
    if(kind==='inn'){
      box(1.3,.08,.08,w/2+.4,3.5,d/2+.1,wood,g);
      box(.85,.65,.12,w/2+.85,3.02,d/2+.1,roofMat,g);
      mesh(new THREE.TorusGeometry(.18,.035,5,12),warm,w/2+.85,3.02,d/2+.18,g);
      // A covered porch distinguishes the inn's silhouette.
      const awning=box(w*.75,.12,1.5,0,2.35,d/2+.8,roofMat,g);awning.rotation.x=.12;
      for(const sx of [-1,1])box(.14,2.25,.14,sx*w*.34,1.13,d/2+1.4,wood,g);
    } else if(kind==='smith'){
      box(2,1.4,1.7,w/2+1, .7,0,stone,g);
      box(1,.65,.04,w/2+1,.65,.87,wood,g);
      box(.7,.25,.05,w/2+1,.42,.9,warm,g);
      box(1.1,.2,.45,0,.9,d/2+1.3,iron,g);box(.4,.8,.4,0,.4,d/2+1.3,wood,g);
    } else if(kind==='barn'){
      box(1.7,2,.12,0,1,d/2+.16,wood,g);
      beam([-.75,.15,d/2+.25],[.75,1.85,d/2+.25],.1,brick,g);
      box(1.1,.6,.8,-w/2-.6,.3,0,roofColors[3],g);
    } else {
      box(1,.2,.35,-w*.27,1.08,d/2+.25,wood,g);
      for(let j=0;j<5;j++)mesh(new THREE.IcosahedronGeometry(.13,0),j%2?pineLight:roofColors[2],-w*.27-.35+j*.17,1.28,d/2+.25,g);
    }
  }
  [
    [-32,-18,3.2,3.2,2.8,.3,'cottage'],
    [-26,-22,4.6,4,5.1,0,'inn'],
    [-19,-22,3.1,3.2,3,-.3,'cottage'],
    [-14,-16,3.5,3.7,2.8,-.8,'smith'],
    [-33,-10,4.2,4.4,2.7,.6,'barn'],
    [-31,-3,2.7,3.2,3.7,1,'cottage'],
    [-22,-2,4.1,3.5,3,Math.PI,'cottage'],
    [-16,-7,2.6,3,3.5,-1,'cottage'],
  ].forEach((args,i)=>house(...args,i));
  // Market stalls flank the well; striped canvas, produce and barrels give scale.
  const canvasColors=[material(0xa56a70),material(0xc7b896)];
  for(const [x,z] of [[-28,-14],[-20,-13]]){
    const stall=new THREE.Group();stall.position.set(x,0,z);root.add(stall);
    for(const sx of [-1,1])for(const sz of [-1,1])box(.09,2.1,.09,sx*1.1,1.05,sz*.6,wood,stall);
    for(let j=0;j<6;j++){const aw=box(.4,.07,1.65,-1+j*.4,2.15,0,canvasColors[j%2],stall);aw.rotation.x=.13;}
    box(2.4,.18,1.1,0,.9,0,wood,stall);
    for(let j=0;j<3;j++){
      box(.6,.2,.65,-.75+j*.75,1.08,0,brick,stall);
      for(let k=0;k<4;k++)mesh(new THREE.IcosahedronGeometry(.13,0),j%2?roofColors[2]:pineLight,-.9+j*.75+(k%2)*.24,1.26,Math.floor(k/2)*.25-.15,stall);
    }
    barrel(1.6,0,.1,stall);
  }
  cylinder(1.2,1.3,.8,-24,.4,-12,stone,10);
  cylinder(.9,.9,.05,-24,.83,-12,soil,10);
  for(const s of [-1,1])box(.13,2,.13,-24+s*1.1,1.5,-12,wood);
  box(2.6,.18,.8,-24,2.5,-12,roof);
  for(let i=0;i<16;i++)box(1.4,.06,1.2,-24+Math.sin(i*.6)*1.2,.07,-1-i*1.3,stone);

  function bridge(ax,az,bx,bz,y,width=2) {
    const length=Math.hypot(bx-ax,bz-az),g=new THREE.Group();
    g.position.set((ax+bx)/2,y,(az+bz)/2);g.rotation.y=Math.atan2(bx-ax,bz-az);root.add(g);
    for(let i=0;i<Math.ceil(length/.5);i++) {
      const z=-length/2+i*.5,arc=Math.sin(i*.5/length*Math.PI)*.8;
      box(width,.15,.44,0,arc,z,wood,g);
      if(i%4===0)for(const s of [-1,1]){
        box(.12,1.2,.12,s*width/2,arc+.5,z,stone,g);
        box(.23,.1,.23,s*width/2,arc+1.15,z,iron,g);
        if(i*.5+1.5<length)beam([s*width/2,arc+.1,z],[s*width/2,arc+1.1,z+1.5],.07,wood,g);
      }
    }
    for(const s of [-1,1])box(.08,.08,length,s*width/2,1.3,0,wood,g);
  }


  // Observatory on the eastern plateau: dome, telescope, terraces and a signal beam.
  cylinder(6,6.5,1,25,1.5,-24,stone,12);
  cylinder(4.5,4.8,5,25,4.4,-24,plaster,12);
  const dome=mesh(new THREE.SphereGeometry(4.7,32,16,0,Math.PI*2,0,Math.PI/2),roof,25,6.9,-24);
  box(.3,4.2,6.8,25,8,-24,wood);
  const telescope=new THREE.Group();telescope.position.set(25,8,-24);telescope.rotation.z=-.6;root.add(telescope);
  cylinder(.55,.8,6,0,2,0,stone,8,telescope);cylinder(.7,.7,.2,0,5,0,warm,8,telescope);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;box(.35,2.1,.35,25+Math.cos(a)*4.55,4.5,-24+Math.sin(a)*4.55,wood);}
  for(let i=0;i<8;i++)box(3,.25,1,25,1+i*.1,-17+i*.65,stone);

  // Dome ribs and a ring balcony emphasize the observatory's construction.
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,points=[];
    for(let j=0;j<=16;j++){const t=j/16*Math.PI/2;points.push(new THREE.Vector3(25+Math.cos(a)*4.73*Math.sin(t),6.9+4.73*Math.cos(t),-24+Math.sin(a)*4.73*Math.sin(t)));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.035,4,false),brick,0,0,0);
  }
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;box(.09,.8,.09,25+Math.cos(a)*5.5,2.4,-24+Math.sin(a)*5.5,iron);}
  const balcony=mesh(new THREE.TorusGeometry(5.5,.05,4,48),iron,25,2.8,-24);balcony.rotation.x=Math.PI/2;

  // Built stone keeps: staggered masonry, corbelled parapets and sheltered lookouts.
  const banners=[];
  const ashlar=[0x978d9c,0x827a8b,0xa49aa6,0x8d8692].map(c=>material(c,'stone'));
  const trim=material(0xb7aab6,'stone'), recess=material(0x292532,'stone');
  const slate=material(0x49435e,'tile'), bannerCloth=material(0x985e78);
  function watchtower(x,z,h,kind) {
    const g=new THREE.Group();g.position.set(x,1,z);root.add(g);
    cylinder(2.3,2.85,1.1,0,.55,0,trim,32,g);
    cylinder(2.08,2.3,h-.5,0,h/2+.25,0,recess,32,g);
    // Separate blocks leave fine mortar joints, with alternating courses.
    const courses=Math.ceil((h-1)/.55),step=(h-1)/courses;
    for(let row=0;row<courses;row++)for(let k=0;k<18;k++) {
      const r=2.29-.2*row/courses;
      const block=new THREE.CylinderGeometry(r,r+.012,step-.035,3,1,false,
        (k+(row%2)*.5)*Math.PI*2/18,Math.PI*2/18-.016);
      mesh(block,ashlar[(k*3+row)%4],0,1+(row+.5)*step,0,g);
    }
    for(const y of [1.1,h*.48,h-.35])cylinder(2.34,2.34,.16,0,y,0,trim,36,g);
    // Four tapered buttresses anchor the shaft to its broad plinth.
    for(let i=0;i<4;i++) {
      const face=new THREE.Group();face.rotation.y=i*Math.PI/2+Math.PI/4;g.add(face);
      box(.65,h*.42,.65,0,h*.21,2.2,ashlar[i],face);
      box(.8,.2,.85,0,h*.42,2.2,trim,face);
    }
    // Deep dark surrounds, stone jambs, lintels, sills and iron mullions.
    for(let level=0;level<2;level++)for(let i=0;i<6;i++) {
      const face=new THREE.Group();face.rotation.y=i*Math.PI/3;g.add(face);
      const y=3.1+level*(h-4.8)/2;
      box(.64,1.4,.12,0,y,2.29,recess,face);
      box(.25,1.05,.03,0,y,2.36,warm,face);
      for(const side of [-1,1])box(.14,1.5,.23,side*.38,y,2.34,trim,face);
      box(.9,.18,.38,0,y-.78,2.37,trim,face);
      const lintel=box(.87,.24,.27,0,y+.79,2.34,trim,face);lintel.rotation.z=.04;
      box(.055,1.12,.08,0,y,2.4,iron,face);
      box(.33,.06,.08,0,y-.1,2.4,iron,face);
    }
    for(let i=0;i<16;i++) {
      const a=i*Math.PI/8,face=new THREE.Group();face.rotation.y=a;g.add(face);
      box(.29,.75,.48,0,h-.12,2.32,trim,face);
      box(.41,.23,.73,0,h+.23,2.43,trim,face);
      box(.64,.85,.48,0,h+1.15,2.55,ashlar[i%4],face);
      box(.74,.13,.6,0,h+1.63,2.55,trim,face);
    }
    cylinder(2.83,2.38,.35,0,h+.42,0,trim,32,g);
    cylinder(2.68,2.68,.35,0,h+.73,0,ashlar[1],32,g);
    cylinder(2.43,2.43,.08,0,h+.94,0,wood,32,g);
    if(kind!=='open') {
      const rise=kind==='beacon'?3.8:2.8;
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4;
        box(.16,1.8,.16,Math.sin(a)*1.85,h+1.8,Math.cos(a)*1.85,wood,g);
      }
      cylinder(2.2,2.2,.18,0,h+2.65,0,wood,16,g);
      // Overlapping slate courses give the roof an actual stepped surface.
      for(let row=0;row<10;row++) {
        const r=2.8*(1-row/10),next=2.8*(1-(row+1)/10);
        cylinder(next+.09,r+.12,rise/10+.06,0,h+2.8+(row+.5)*rise/10,0,slate,16,g);
      }
      cylinder(.045,.08,1.1,0,h+3.2+rise,0,iron,12,g);
      mesh(new THREE.SphereGeometry(.14,10,8),trim,0,h+2.8+rise,0,g);
    }
    const flag=new THREE.Group();flag.position.set(2.48,h-2,0);g.add(flag);
    box(.09,.09,1.65,0,1.2,.4,iron,flag);
    const banner=box(.06,2,1.05,0,0,.7,bannerCloth,flag);
    banner.userData.animated=true;banners.push(banner);
    box(.08,1.1,.12,.04,.15,.7,trim,flag);
    box(.08,.12,.55,.04,.4,.7,trim,flag);
  }
  watchtower(-7,-45,10,'open');
  watchtower(7,-45,13,'roof');
  watchtower(0,-50,17,'beacon');
  box(15,5,1.4,0,3.5,-44,stone);
  box(15,.22,1.8,0,5.85,-44,trim);
  for(let i=0;i<10;i++) {
    const x=-7+i*1.55;
    box(.8,.8,1.6,x,6.3,-44,stone);
    box(.96,.16,1.8,x,6.76,-44,trim);
    if(i%2===0){box(.65,4.4,.65,x,3.2,-43.1,trim);box(.75,.2,.8,x,5.4,-43.1,trim);}
  }
  const beacon=mesh(new THREE.OctahedronGeometry(.45),warm,0,24,-50);

  // The lower village occupies the former basin: a connected market and trade streets.
  const paving=material(0x9a8e7a,'stone');
  function road(points,width=3.2){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const verts=[],uvs=[],indices=[];
    for(let i=0;i<=100;i++){
      const t=i/100,p=curve.getPoint(t),dir=curve.getTangent(t),side=new THREE.Vector3(-dir.z,0,dir.x).normalize();
      for(const sign of [-1,1]){const v=p.clone().addScaledVector(side,sign*width/2);verts.push(v.x,v.y,v.z);uvs.push(sign===-1?0:1,t*20);}
      if(i<100){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
    mesh(geo,paving,0,0,0);
  }
  road([[-24,.12,-5],[-25,.12,8],[-19,.12,22],[-15,.12,34],[0,.12,46]],4);
  road([[-15,.13,34],[-5,.13,27],[7,.13,20],[16,.13,4],[22,1.12,-13]],3.6);
  // The approach terminates at a supported stair, then resumes on the upper terrace.
  road([[-24,.14,-13],[-16,.14,-20],[-10,.14,-21],[-7,.14,-22]],3.5);
  const stairX=-7,stairFront=-22,stepDepth=.58,stepRise=.18;
  for(let i=0;i<6;i++){
    const top=.14+(i+1)*stepRise,z=stairFront-(i+.5)*stepDepth;
    box(3.8,top+.1,stepDepth+.015,stairX,(top-.1)/2,z,stone);
    box(3.92,.06,stepDepth+.035,stairX,top+.03,z,trim);
    for(const side of [-1,1])box(.32,top+.55,stepDepth+.02,stairX+side*2.02,(top+.55)/2,z,stone);
  }
  box(4.2,.2,2.6,-7,1.12,-26.7,trim);
  road([[-7,1.23,-27.8],[-6,1.18,-32],[-2,1.18,-37],[0,1.18,-41]],3.5);
  for(const side of [-1,1]){
    beam([-7+side*2.02,.92,-22],[-7+side*2.02,1.82,-25.5],.14,trim,root);
    cylinder(.11,.15,2.3,-7+side*2.6,2.2,-29,iron,10);
    box(.4,.55,.4,-7+side*2.6,3.15,-29,warm);
  }
  // A planted citadel courtyard with an open approach and clear tower foundations.
  const court=mesh(new THREE.CircleGeometry(5.4,48),paving,0,1.11,-38);court.rotation.x=-Math.PI/2;
  const grovePositions=[];
  for(let i=0;i<64;i++){
    const x=-17+rand()*36,z=-60+rand()*34;
    if(Math.hypot(x-1,z+42)>16.3)continue;
    if(Math.abs(x)<5&&z>-44)continue;
    if(x>-11&&x<-3&&z>-37)continue;
    if([[-7,-45],[7,-45],[0,-50]].some(([tx,tz])=>Math.hypot(x-tx,z-tz)<4.3))continue;
    if(z>-46&&z<-42&&Math.abs(x)<10)continue;
    if(grovePositions.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<2.3))continue;
    grovePositions.push([x,z]);tree(x,1.07,z,.75+rand()*.6);
  }
  // Taller groves behind the citadel frame the towers without hiding their silhouettes.
  for(let i=0;i<24;i++){
    const a=Math.PI*.1+i/23*Math.PI*.8;
    tree(1+Math.cos(a)*24,0,-42-Math.sin(a)*24,.9+rand()*.6);
  }
  for(const [x,z] of [[-11,-38],[8,-35],[11,-48]]){
    box(2.6,.16,.7,x,1.7,z,wood);
    for(const side of [-1,1])box(.22,.6,.6,x+side*.95,1.38,z,stone);
    barrel(x+1.9,1.06,z);
  }
  // Guard supplies and a roof hatch furnish the open lookout platform.
  box(1,.1,1.2,-7,11.99,-45,iron);
  for(let i=0;i<4;i++)box(.85,.06,.2,-7,12.07,-45.42+i*.28,wood);
  barrel(-8,11.98,-44.3);
  box(.65,.6,.65,-6.1,12.28,-45.7,wood);
  road([[0,.15,16],[8,.15,8],[10,.6,-9],[18,1.12,-20]],3);
  const square=mesh(new THREE.CircleGeometry(9,64),paving,-15,.09,32);square.rotation.x=-Math.PI/2;
  for(const [i,x,z,kind,rot] of [[0,-28,28,'inn',1],[1,-25,40,'barn',.5],[2,-6,40,'cottage',-2.7],[3,0,29,'smithy',-1.6],[4,-30,14,'cottage',1.1],[5,10,12,'cottage',-1.3],[6,21,5,'barn',-1.6],[7,-38,35,'cottage',1.2]])house(x,z,4+(i%2),4.2,kind==='inn'?5.2:3.5,rot,kind,i);
  function marketStall(x,z,angle,index){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);
    for(const sx of [-1,1])for(const sz of [-1,1])box(.12,2.6,.12,sx*1.4,1.3,sz*.85,wood,g);
    for(let i=0;i<8;i++){const panel=box(.38,.07,2.2,-1.33+i*.38,2.65,0,canvasColors[(i+index)%2],g);panel.rotation.x=.12;box(.38,.3,.06,-1.33+i*.38,2.4,1.1,canvasColors[(i+index)%2],g);}
    box(2.9,.16,1.25,0,1,0,wood,g);
    for(let c=0;c<3;c++){
      box(.8,.18,.75,-.95+c*.95,1.16,0,wood,g);
      for(let j=0;j<6;j++)mesh(new THREE.IcosahedronGeometry(.14,1),index%2?roofColors[2]:pineLight,-1.15+c*.95+(j%3)*.2,1.35,Math.floor(j/3)*.25-.15,g);
    }
    barrel(1.9,0,-.4,g);box(.7,.7,.7,-1.9,.35,-.4,wood,g);
  }
  [[-20,28,.2],[-12,26,-.2],[-20,36,2.7],[-10,36,3.4],[-7,31,-1.5],[-24,22,1.4]].forEach(([x,z,a],i)=>marketStall(x,z,a,i));
  // Village noticeboard, benches, lanterns and a loaded handcart.
  for(const x of [-17,-13])box(.18,3,.18,x,1.5,22,wood);
  box(4.4,1.5,.18,-15,2,22,wood);box(1.2,.9,.04,-15,2,22.12,plaster);
  for(const [x,z] of [[-15,39],[-23,31],[-4,23]]){
    box(2.4,.16,.65,x,.65,z,wood);for(const side of [-1,1])box(.18,.65,.5,x+side*.9,.32,z,iron);
  }
  for(const [x,z] of [[-25,20],[-20,40],[-5,36],[3,22],[15,3]]){
    cylinder(.07,.12,3.6,x,1.8,z,iron,8);box(.55,.7,.55,x,3.3,z,warm);cylinder(0,.43,.35,x,3.83,z,iron,8);
    tree(x+2,0,z-3,.8);
  }
  box(1.8,.2,2.5,-31,.7,24,wood);
  for(const side of [-1,1]){
    box(.12,.6,2.6,-31+side*.95,1,24,wood);
    const wheel=mesh(new THREE.TorusGeometry(.55,.09,6,16),wood,-31+side*1.1,.55,24);wheel.rotation.y=Math.PI/2;
    beam([-31+side*.7,.6,25],[-31+side*.7,.8,27],.1,wood,root);
  }
  barrel(-31,.8,24);box(.7,.7,.7,-31,1.15,23.2,wood);

  // Close-knit residential blocks frame the market, rather than isolated houses in a field.
  const infill=[
    [-36,22,1.1,'cottage'],[-38,13,1.2,'barn'],[-39,4,1.1,'cottage'],
    [-34,44,.25,'inn'],[-24,49,0,'cottage'],[-15,49,0,'cottage'],
    [-42,44,.5,'barn'],[-44,27,1.2,'cottage'],
    [4,39,-1.8,'cottage'],[11,31,-1.5,'inn'],[15,23,-1.7,'cottage'],
    [24,16,-1.3,'smithy'],[30,7,-1.4,'cottage'],[30,-3,-1.4,'barn'],
    [-12,16,2.6,'cottage'],[-5,18,2.7,'cottage'],[-16,7,2.8,'barn'],
    [4,0,-1.2,'cottage'],[-42,-8,1.4,'cottage'],[-44,-18,1.3,'inn']
  ];
  const gardenSoil=material(0x665042,'earth'),terracotta=material(0xa36f53);
  function fence(x,z,length,rotation=0){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);
    for(let j=0;j<=Math.ceil(length);j++)box(.11,1,.11,-length/2+j*length/Math.ceil(length),.5,0,wood,g);
    for(const y of [.35,.78])box(length,.1,.09,0,y,0,wood,g);
  }
  infill.forEach(([x,z,angle,kind],i)=>{
    const w=3.4+(i%3)*.65,d=3.6+(i%2)*.8;
    house(x,z,w,d,kind==='inn'?5.3:3.1+(i%3)*.35,angle,kind,i+1);
    const yard=new THREE.Group();yard.position.set(x,0,z);yard.rotation.y=angle;root.add(yard);
    // Small front aprons connect doorsteps to the surrounding lanes.
    box(w+.6,.07,2,0,.04,d/2+1,paving,yard);
    barrel(-w/2-.65,0,.8,yard);
    for(let j=0;j<3;j++){
      box(.6,.5,.6,w/2+.5,.25+j*.47*(j===2?1:0),-.7+j*.55,wood,yard);
    }
    cylinder(.23,.18,.38,w/2-.2,.22,d/2+.6,terracotta,12,yard);
    for(let j=0;j<4;j++)mesh(new THREE.IcosahedronGeometry(.16,1),j%2?pineLight:roofColors[2],w/2-.2+Math.sin(j*2)*.14,.55,d/2+.6+Math.cos(j*2)*.14,yard);
    // Stacked firewood, with visible circular ends.
    for(let j=0;j<7;j++){
      const log=cylinder(.13,.13,.8,-w/2-.55+(j%3)*.27,.16+Math.floor(j/3)*.23,-1,wood,8,yard);log.rotation.x=Math.PI/2;
    }
    if(i%3===0){
      box(2.4,.12,1.7,0,.02,-d/2-1.3,gardenSoil,yard);
      for(let row=0;row<3;row++)for(let col=0;col<5;col++){
        const crop=mesh(new THREE.IcosahedronGeometry(.22,1),pineLight,-.9+col*.45,.2,-d/2-.75-row*.5,yard);crop.scale.y=.65;
      }
    }
  });
  road([[-33,.16,3],[-35,.16,16],[-34,.16,31],[-32,.16,40],[-25,.16,45],[-14,.16,44]],2.6);
  road([[4,.17,42],[7,.17,33],[10,.17,24],[19,.17,16],[25,.17,5]],2.7);
  road([[-20,.18,21],[-14,.18,22],[-6,.18,23],[1,.18,22]],2.4);
  for(const [x,z,len,angle] of [[-39,39,7,0],[-28,53,9,0],[-10,52,7,0],[27,21,8,1.57],[34,4,8,1.57],[-45,10,7,1.57]])fence(x,z,len,angle);
  // A few trees and planted beds make the outskirts feel cultivated.
  for(const [x,z] of [[-46,38],[-39,50],[-31,55],[1,48],[18,35],[30,27],[36,17],[-47,0]]){
    tree(x,0,z,.9);
    cylinder(1.5,1.6,.2,x,.1,z,stone,24);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(new THREE.IcosahedronGeometry(.23,1),pineLight,x+Math.cos(a)*1.1,.3,z+Math.sin(a)*1.1);}
  }
  // Hanging cloth and festival bunting give the streets a lived-in scale.
  for(const [x,z] of [[-33,34],[9,27]]){
    for(const side of [-1,1])box(.12,3.4,.12,x+side*3,1.7,z,wood);
    beam([x-3,3.25,z],[x+3,3.25,z],.025,iron,root);
    for(let j=0;j<5;j++)box(.68,.9,.035,x-2+j,2.75,z,wallColors[j%4]);
  }
  for(const z of [29,35]){
    for(const x of [-24,-5])box(.12,4.3,.12,x,2.15,z,wood);
    const points=[];for(let i=0;i<=24;i++)points.push(new THREE.Vector3(-24+i*19/24,4.2-Math.sin(i/24*Math.PI)*.7,z));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.02,4,false),wood,0,0,0);
    for(let i=1;i<15;i++){
      const x=-24+i*19/15,y=4.2-Math.sin(i/15*Math.PI)*.7;
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([x-.25,y,z,x,y-.55,z,x+.25,y,z],3));geo.computeVertexNormals();
      const pennant=mesh(geo,canvasColors[i%2],0,0,0);pennant.material.side=THREE.DoubleSide;
    }
  }
  // Merchants and shoppers occupy the edges of the stalls, keeping the main route open.
  for(const [i,x,z] of [[0,-19,27],[1,-11,25],[2,-8,32],[3,-18,34],[4,-16,31],[5,-22,24],[6,-4,26],[7,8,21]]){
    const g=new THREE.Group();g.position.set(x,.12,z);g.rotation.y=i*1.7;root.add(g);
    cylinder(.22,.32,.65,0,.78,0,wallColors[i%4],10,g);
    mesh(new THREE.SphereGeometry(.18,10,8),terracotta,0,1.32,0,g);
    cylinder(.24,.25,.12,0,1.49,0,roofColors[i%4],12,g);
    for(const side of [-1,1]){box(.14,.48,.18,side*.12,.25,0,wood,g);beam([side*.22,1,0],[side*.34,.58,.08],.12,wallColors[i%4],g);}
  }

  const birds=new THREE.Group();root.add(birds);
  for(let i=0;i<7;i++) {
    const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.35,0,.1),new THREE.Vector3(0,-.1,0),new THREE.Vector3(.35,0,.1)]);
    const bird=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xcbbcd7}));bird.position.set(i*.9,Math.sin(i)*.6,i*.5);birds.add(bird);
  }
  const smokeGeo=new THREE.BufferGeometry(),smokeData=new Float32Array(chimneys.length*12*3);
  smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokeData,3));
  root.add(new THREE.Points(smokeGeo,new THREE.PointsMaterial({color:0xb9a7c4,size:.22,transparent:true,opacity:.25,depthWrite:false})));

  const cobbleGeo=cragGeometry(1);
  const cobbles=new THREE.InstancedMesh(cobbleGeo,naturalRock,600);
  const cobbleDummy=new THREE.Object3D();let ci=0;
  for(let row=0;row<75;row++)for(let col=0;col<8;col++) {
    const z=-24+row*.34,x=-24+Math.sin(row*.13)*1.3+(col-3.5)*.32;
    cobbleDummy.position.set(x,.085+rand()*.025,z);
    cobbleDummy.rotation.set(0,rand()*.25,0);cobbleDummy.scale.set(.14+rand()*.02,.07,.15);
    cobbleDummy.updateMatrix();cobbles.setMatrixAt(ci++,cobbleDummy.matrix);
  }
  cobbles.castShadow=cobbles.receiveShadow=true;root.add(cobbles);
  // Vegetation and rubble break the clean edges of the inhabited terraces.
  const rocks=new THREE.InstancedMesh(cragGeometry(2),naturalRock,160);
  for(let i=0;i<160;i++){
    const a=i/160*Math.PI*2,r=14+rand()*1.6;
    cobbleDummy.position.set(-24+Math.cos(a)*r,-.05,-12+Math.sin(a)*r);
    cobbleDummy.rotation.set(rand(),rand()*6,rand());
    cobbleDummy.scale.set(.2+rand()*.65,.15+rand()*.4,.2+rand()*.5);
    cobbleDummy.updateMatrix();rocks.setMatrixAt(i,cobbleDummy.matrix);
  }
  rocks.castShadow=rocks.receiveShadow=true;root.add(rocks);
  // Thousands of thin, curved grass blades soften the banks without thousands of draws.
  const grassGeo=new THREE.BufferGeometry();
  grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.06,0,0,.06,0,0,.025,.3,.025,-.06,0,0,.025,.3,.025,-.025,.3,.025,-.025,.3,.025,.025,.3,.025,.07,.56,.07],3));
  grassGeo.computeVertexNormals();physicalUV(grassGeo);
  const grassMat=detailedMaterial(0x657e6e,'earth');grassMat.side=THREE.DoubleSide;
  const blades=new THREE.InstancedMesh(grassGeo,grassMat,2400);
  for(let i=0;i<2400;i++){
    const east=i>1500,a=rand()*Math.PI*2,r=(east?8:12.8)+rand()*2.4;
    cobbleDummy.position.set((east?25:-24)+Math.cos(a)*r,east?1.08:.08,(east?-24:-12)+Math.sin(a)*r);
    cobbleDummy.rotation.set(0,rand()*Math.PI*2,rand()*.15);
    cobbleDummy.scale.setScalar(.4+rand()*.7);cobbleDummy.updateMatrix();blades.setMatrixAt(i,cobbleDummy.matrix);
  }
  blades.receiveShadow=true;root.add(blades);
  batchArchitecture(root);

  return {
    places:[
      {name:'The gateway',description:'A lantern-lit path into the old mountains.',position:[-2.8,5.8,18],target:[0,3.3,-12.8]},
      {name:'Lantern village',description:'Timber cottages, a bustling market square, and the old lantern inn.',position:[-44,23,19],target:[-23,2,-13]},
      {name:'The observatory',description:'A telescope watching the sky above the eastern ridge.',position:[46,23,1],target:[25,6,-24]},
      {name:'The high citadel',description:'Stone watchtowers guarding the village roads.',position:[25,29,-19],target:[0,10,-46]},
      {name:'The trade road',description:'Winding lanes between workshops, cottages, and the old gate.',position:[18,19,35],target:[1,2,18]},
      {name:'Market square',description:'Canvas stalls, fresh produce, and lantern-lit village streets.',position:[-3,12,52],target:[-16,1,32]},
    ],
    update(t,daylight=0) {
      warm.color.setRGB(1,.7,.32).multiplyScalar(1-daylight*.65);
      birds.position.set(Math.cos(t*.045)*25,15+Math.sin(t*.12)*2,-20+Math.sin(t*.045)*17);birds.rotation.y=-t*.045;
      beacon.rotation.y=t*.35;beacon.position.y=24+Math.sin(t)*.25;
      banners.forEach((banner,i)=>{banner.rotation.x=Math.sin(t*2+i)*.12;});
      chimneys.forEach((p,i)=>{for(let j=0;j<12;j++) {
        const age=(t*.4+j/12)%1,idx=(i*12+j)*3;
        smokeData[idx]=p.x+age*2+Math.sin(j+t*.3)*.2;smokeData[idx+1]=p.y+age*4;smokeData[idx+2]=p.z+age*.5;
      }});smokeGeo.attributes.position.needsUpdate=true;
    },
  };
}
