(function(root){
'use strict';
const Matter=root.Matter||(typeof require==='function'?require('./vendor/matter-0.20.0.min.js'):null);
const {Engine,Bodies,Body,Composite}=Matter;
const RADII=[17,23,29,36,44,53,63,74,86,100,116];
const GROW_TIME=.14;
// Polygon sides per level so each edge sits within 0.15 px of the true circle (24 sides minimum).
// Small circles need far fewer than 64 sides, which keeps narrow-phase collision cheap.
// Even counts let Matter.js share each pair of parallel separating axes.
const SIDES=RADII.map(r=>Math.max(24,2*Math.ceil(Math.PI/Math.acos(1-.15/r)/2)));
class Physics {
 constructor(onMerge=()=>{}) {
  this.onMerge=onMerge;this.width=440;this.height=610;this.seq=0;
  // Keep resting bodies dynamic: supports can roll away or disappear in a merge.
  // The contact solver already holds stable piles without freezing their bodies.
  this.engine=Engine.create({enableSleeping:false,positionIterations:12,velocityIterations:8,constraintIterations:2});
  this.engine.gravity.y=1;this.engine.gravity.scale=.0011;
  this.balls=[];this.time=0;
  const wall={isStatic:true,friction:.22,restitution:.12,slop:.02,label:'wall'};
  this.walls=[Bodies.rectangle(-28,0,60,4000,wall),Bodies.rectangle(468,0,60,4000,wall),Bodies.rectangle(220,637,1000,60,wall)];
  Composite.add(this.engine.world,this.walls);
 }
 reset() {
  Composite.clear(this.engine.world,false);Engine.clear(this.engine);
  this.balls=[];this.time=0;this.engine.timing.timestamp=0;
  Composite.add(this.engine.world,this.walls);
 }
 add(level,x,y,vx=0,vy=0,initialRadius=RADII[level]) {
  if(!Number.isInteger(level)||level<0||level>=RADII.length)throw new RangeError('Invalid circle level');
  const r=Math.min(initialRadius,RADII[level]);
  const body=Bodies.polygon(Math.max(r+2,Math.min(this.width-r-2,x)),Math.min(this.height-r-3,y),SIDES[level],r,{
   label:'photo',density:.001,friction:.055,frictionStatic:.12,frictionAir:.0025,
   restitution:.22,slop:.025
  });
  body.circleRadius=r;
  const b={id:++this.seq,level,r,targetRadius:RADII[level],startRadius:r,born:this.time,body};
  body.plugin.photo=b;
  // Public velocities are px/s; Matter normalizes its velocities to a 60-Hz frame.
  for(const [key,axis] of [['x','x'],['y','y']])Object.defineProperty(b,key,{get:()=>body.position[axis]});
  for(const [key,axis] of [['vx','x'],['vy','y']])Object.defineProperty(b,key,{get:()=>body.velocity[axis]*60});
  Object.defineProperty(b,'angle',{get:()=>body.angle});
  Object.defineProperty(b,'spin',{get:()=>body.angularVelocity*60});
  Body.setVelocity(body,{x:vx/60,y:vy/60});
  this.balls.push(b);Composite.add(this.engine.world,body);return b;
 }
 step(dt) {
  if(!Number.isFinite(dt)||dt<=0)return;
  const count=Math.max(1,Math.ceil(dt*120-1e-8)),h=dt/count;
  for(let sub=0;sub<count;sub++)this._step(h);
 }
 _step(dt) {
  this.time+=dt;
  for(const b of this.balls)if(b.r<b.targetRadius){
   const t=Math.min(1,(this.time-b.born)/GROW_TIME),ease=t*t*(3-2*t);
   const radius=b.startRadius+(b.targetRadius-b.startRadius)*ease;
   Body.scale(b.body,radius/b.r,radius/b.r);b.r=radius;
  }
  Engine.update(this.engine,dt*1000);
  this._contain();
  const live=new Set(this.balls),used=new Set(),merges=[];
  // Merge after solving, once per body, including resting contact pairs.
  for(const pair of this.engine.pairs.list){
   if(!pair.isActive)continue;
   const a=pair.bodyA.plugin.photo,b=pair.bodyB.plugin.photo;
   if(!a||!b||!live.has(a)||!live.has(b)||a.level!==b.level||a.level===RADII.length-1||used.has(a)||used.has(b))continue;
   if(a.r<a.targetRadius-.001||b.r<b.targetRadius-.001)continue;
   used.add(a);used.add(b);merges.push([a,b]);
  }
  if(merges.length){
   this.balls=this.balls.filter(b=>!used.has(b));
   for(const [a,b] of merges){
    const mass=a.body.mass+b.body.mass;
    const x=(a.x*a.body.mass+b.x*b.body.mass)/mass,y=(a.y*a.body.mass+b.y*b.body.mass)/mass;
    const vx=(a.vx*a.body.mass+b.vx*b.body.mass)/mass,vy=(a.vy*a.body.mass+b.vy*b.body.mass)/mass;
    const spin=(a.body.angularVelocity+b.body.angularVelocity)*.25;
    Composite.remove(this.engine.world,[a.body,b.body]);
    const c=this.add(a.level+1,x,y,vx,vy,a.r);
    Body.setAngularVelocity(c.body,spin);this.onMerge(c);
   }
  }
 }
 // Heavy piles can squeeze small circles through the solver's soft wall contacts; push them back inside.
 _contain() {
  const tol=.5,left=2,right=this.width-2,floor=607;
  for(const b of this.balls){
   const body=b.body,r=b.r;let x=b.x,y=b.y;
   if(x-r<left-tol)x=left+r-tol/2;else if(x+r>right+tol)x=right-r+tol/2;
   if(y+r>floor+tol)y=floor-r+tol/2;
   if(x===b.x&&y===b.y)continue;
   const v=body.velocity;Body.setPosition(body,{x,y});
   Body.setVelocity(body,{x:x!==b.x&&Math.sign(v.x)!==Math.sign(x-b.x)?0:v.x,y:y!==b.y&&v.y>0?0:v.y});
  }
 }
 overflow(){return this.balls.some(b=>this.time-b.born>1.5&&b.y-b.r<93&&Math.abs(b.vy)<100);}
}
root.MelonPhysics=Physics;root.MelonRadii=RADII;
if(typeof module!=='undefined')module.exports={Physics,RADII};
})(typeof window!=='undefined'?window:globalThis);
