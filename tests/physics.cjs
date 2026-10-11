const test=require('node:test');
const assert=require('node:assert/strict');
const {Physics,RADII}=require('../dist/game.js');
const {Body,Composite}=require('../dist/vendor/matter-0.20.0.min.js');
function advance(p,seconds,dt=1/120){for(let i=0;i<Math.round(seconds/dt);i++)p.step(dt);}
function maxOverlap(balls){let max=0;for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j];max=Math.max(max,a.r+b.r-Math.hypot(a.x-b.x,a.y-b.y));}return max;}
test('gravity produces a drop, visible rebound, and a resting circle',()=>{
 const p=new Physics(),b=p.add(4,220,43);let rebound=false;
 for(let i=0;i<360;i++){p.step(1/120);if(b.y>450&&b.vy<-30)rebound=true;}
 assert(rebound,'falling circles must rebound rather than stick immediately');advance(p,8);
 assert(!b.body.isSleeping);assert(Math.abs(b.y+b.r-607)<.4);assert(Math.abs(b.vy)<1e-6);
 const y=b.y;advance(p,3);assert(Math.abs(b.y-y)<1e-6,'a resting circle must not jitter');
});
test('an offset small circle rolls off a larger circle',()=>{
 const p=new Physics();p.add(7,220,533);const small=p.add(0,245,100);
 let rotated=false;for(let i=0;i<1440;i++){p.step(1/120);if(Math.abs(small.spin)>.2)rotated=true;}
 assert(small.x>320);assert(small.y>580);assert(rotated);
});
test('a resting upper circle falls when its support moves away',()=>{
 const p=new Physics(),lower=p.add(4,220,563),upper=p.add(3,220,483);
 advance(p,8);const supportedY=upper.y;
 Body.setPosition(lower.body,{x:350,y:lower.y});advance(p,3);
 assert(upper.y>supportedY+70,'removed support must not leave a frozen floating circle');
 assert(Math.abs(upper.y+upper.r-607)<.4);
});
test('the screenshot arrangement lets the purple circle roll down to the floor',()=>{
 const p=new Physics();p.add(1,25,584);p.add(4,89,563);const purple=p.add(3,157,523);
 p.add(6,270,544);p.add(2,374,578);p.add(0,420,590);advance(p,8);
 assert(purple.y>560);assert(Math.abs(purple.y+purple.r-607)<.4);
});
test('a circle bounces from a side wall without escaping it',()=>{
 const p=new Physics();p.engine.gravity.scale=0;const b=p.add(2,380,300,500,0);advance(p,.5);
 assert(b.x<410&&b.vx<0);assert(b.x-b.r>=1.6&&b.x+b.r<=438.4);
});
test('matching contacts merge once, grow smoothly, and preserve movement',()=>{
 const events=[],p=new Physics(b=>events.push({radius:b.r,level:b.level}));
 p.add(0,180,200,30,0);p.add(0,213,200,30,0);advance(p,.12);
 assert.equal(events.length,1);assert.equal(events[0].radius,RADII[0]);assert.equal(p.balls.length,1);
 assert(p.balls[0].r<RADII[1]);assert(p.balls[0].vx>0);advance(p,.3);assert.equal(p.balls[0].r,RADII[1]);
});
test('three touching circles never reuse one body in two merges',()=>{
 let merged=0;const p=new Physics(()=>merged++);p.add(0,180,300);p.add(0,213,300);p.add(0,246,300);
 advance(p,.5);assert.equal(merged,1);assert.equal(p.balls.length,2);
 assert.deepEqual(p.balls.map(b=>b.level).sort(),[0,1]);
});
test('growth permits chain merges, while maximum-level circles remain separate',()=>{
 const p=new Physics();p.add(0,150,590);p.add(0,183,590);p.add(1,166.5,530);advance(p,5);
 assert.equal(p.balls.length,1);assert.equal(p.balls[0].level,2);
 const q=new Physics();q.add(10,170,480);q.add(10,270,250);advance(q,10);assert.equal(q.balls.length,2);
 assert(maxOverlap(q.balls)<.6);
});
test('new drops have overflow grace, settled high circles do not',()=>{
 const p=new Physics();p.engine.gravity.scale=0;p.add(0,100,80);
 assert.equal(p.overflow(),false);advance(p,2);assert.equal(p.overflow(),true);
});
test('reset removes all previous bodies and stale contacts',()=>{
 const p=new Physics();p.add(2,200,100);advance(p,2);p.reset();assert.equal(p.time,0);assert.equal(p.balls.length,0);
 assert.equal(Composite.allBodies(p.engine.world).length,3);assert.equal(p.engine.pairs.list.length,0);
 const b=p.add(3,220,43);advance(p,6);assert(Math.abs(b.y+b.r-607)<.4);
});
test('30, 60, and 120 Hz callers give the same physical result',()=>{
 function simulate(dt){const p=new Physics();p.add(4,230,43,70,0);advance(p,4,dt);return p.balls[0];}
 const a=simulate(1/120);for(const dt of [1/30,1/60]){const b=simulate(dt);assert(Math.abs(a.x-b.x)<1e-6);assert(Math.abs(a.y-b.y)<1e-6);}
});
test('eight varied piles remain stable with subpixel overlap and no escaped circles',()=>{
 for(let seed=1;seed<=8;seed++){
  let state=seed;const rand=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);
  const p=new Physics();for(let j=0;j<60;j++){p.add(Math.floor(rand()*4),40+rand()*360,43);advance(p,.5);if(p.overflow())break;}
  advance(p,12);assert(maxOverlap(p.balls)<.6,`overlap in seed ${seed}`);
  // Low collective motion is expected; individual circles may still roll slowly.
  const meanSquaredSpeed=p.balls.reduce((sum,b)=>sum+b.vx*b.vx+b.vy*b.vy,0)/p.balls.length;
  assert(meanSquaredSpeed<1,`pile instability in seed ${seed}`);
  for(const b of p.balls){assert([b.x,b.y,b.vx,b.vy,b.angle].every(Number.isFinite));assert(b.y+b.r<607.4);assert(b.x-b.r>1.6&&b.x+b.r<438.4);}
 }
});
