import * as THREE from 'three';

// Closely spaced street shots linger at walking height; the longer outer arcs
// rise into an establishing view, then return smoothly to the market entrance.
export const tourShots=[
  {position:[-14,4.8,44],target:[-15,2.2,28],fov:48},
  {position:[-14.6,2.5,36.5],target:[-15,2,25],fov:50},
  {position:[-14.8,2.35,31.5],target:[-17,2,23],fov:50},
  {position:[-15,2.65,27.5],target:[-24,2.5,9],fov:49},
  {position:[-18,6.8,24],target:[-25,3,4],fov:48},
  {position:[-26,10,8],target:[-24,4,-15],fov:46},
  {position:[-44,14,-3],target:[-24,4,-13],fov:46},
  {position:[-57,19,20],target:[-26,5,5],fov:48},
  {position:[-46,27,48],target:[-10,5,-3],fov:51},
  {position:[-12,29,58],target:[-3,5,-12],fov:52},
  {position:[30,26,34],target:[0,5,-7],fov:49},
  {position:[39,21,-13],target:[12,8,-35],fov:47},
  {position:[24,24,-38],target:[-3,11,-48],fov:46},
  {position:[-2,26,-30],target:[-19,14,-65],fov:45},
  {position:[-12,17,-13],target:[0,4,-13],fov:46},
  {position:[1,9,11],target:[0,4,-13],fov:46},
  {position:[-2,8,30],target:[-16,2,31],fov:48},
  {position:[-9,7,43],target:[-16,2.5,27],fov:48},
];
export function createCinematicTour(){
  const cameraPath=new THREE.CatmullRomCurve3(tourShots.map(shot=>new THREE.Vector3(...shot.position)),true,'centripetal');
  const targetPath=new THREE.CatmullRomCurve3(tourShots.map(shot=>new THREE.Vector3(...shot.target)),true,'centripetal');
  const duration=216;
  function sample(time,position,target){
    const phase=((time%duration)+duration)%duration/duration;
    cameraPath.getPoint(phase,position);targetPath.getPoint(phase,target);
    const index=Math.floor(phase*tourShots.length),fraction=phase*tourShots.length-index;
    const blend=THREE.MathUtils.smoothstep(fraction,0,1);
    return THREE.MathUtils.lerp(tourShots[index].fov,tourShots[(index+1)%tourShots.length].fov,blend);
  }
  return {duration,sample};
}
