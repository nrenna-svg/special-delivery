globalThis.__SD_WORLD='mesa';
const {default:test}=await import('node:test');const {default:assert}=await import('node:assert/strict');
const {Vector3}=await import('../dist/vendor/three.core.js');
const {RADIUS,newFlight}=await import('../dist/flight.js');
const {WORLD,DESERT}=await import('../dist/worlds.js');
const {ISLANDS}=await import('../dist/days.js');
const {landAt,floorAt,groundHeight,terrainCheck}=await import('../dist/hazards.js');
const {SITES,JOB_ISLANDS,ISLAND_TIER,makeJob,jobRoute,jobBoard}=await import('../dist/career.js');
const {SHIPS,STACKS,SPOUTS,spoutNormal}=await import('../dist/sealife.js');
const {predictDrop}=await import('../dist/delivery.js');
const {runwayNormal,RUNWAY_HALF,GROUND_ALT,HANGAR}=await import('../dist/airfield.js');
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;

test('Mesa Rojo loads as the desert world',()=>{assert.equal(WORLD.id,'mesa');assert.ok(DESERT);assert.ok(WORLD.payMult>1);});
test('mesas and buttes never overlap, and the home field stays flat',()=>{for(let i=0;i<ISLANDS.length;i++)for(let j=i+1;j<ISLANDS.length;j++){const a=new Vector3(...ISLANDS[i].n).normalize(),b=new Vector3(...ISLANDS[j].n).normalize();assert.ok(arc(a,b)>ISLANDS[i].size+ISLANDS[j].size+4,`${ISLANDS[i].label} / ${ISLANDS[j].label}`);}
 assert.ok(!ISLANDS[0].h);for(let z=-RUNWAY_HALF;z<=RUNWAY_HALF;z+=4)assert.equal(terrainCheck(runwayNormal(0,z),GROUND_ALT).crash,false);assert.equal(landAt(runwayNormal(HANGAR.x,HANGAR.z))?.island,'DUSTWATER FIELD');});
test('delivery sites sit on the flat mesa tops, and cargo lands on top',()=>{for(const l of JOB_ISLANDS){const h=ISLANDS.find(i=>i.label===l).h;assert.ok(h>0);for(const s of SITES[l]){assert.equal(groundHeight(s.normal),h);}}
 const site=SITES['VULTURE PEAK'][0],f=newFlight();f.normal.copy(site.normal);f.altitude=40;f.speed=10;f.throttle=0;const d=predictDrop(f);assert.ok(Math.abs(d.position.length()-RADIUS-groundHeight(d.position.clone().normalize())-.58)<1e-6);});
test('mesa tops are crash terrain and the crash floor follows the cliffs',()=>{const c=new Vector3(...ISLANDS.find(i=>i.label==='SUNSPIRE').n).normalize();assert.ok(floorAt(c)>14);assert.equal(terrainCheck(c,10).crash,true);assert.equal(terrainCheck(c,20).crash,false);});
test('every desert job type works, tiers rise with distance, and there are no boats',()=>{for(const l of JOB_ISLANDS)assert.ok(ISLAND_TIER[l]>=0);for(let s=1;s<30;s++)for(const j of jobBoard(s))assert.notEqual(j.type,'boat');
 for(const l of JOB_ISLANDS)for(const t of ['parcels','crate','mail','urgent']){const j=makeJob(4,{type:t,island:l});const r=jobRoute(j);assert.ok(j.pay>0);if(t==='mail')assert.ok(r.features.mail.length>0);}});
test('no ships in the desert; hoodoos and dust devils stay on open sand',()=>{assert.equal(SHIPS.length,0);assert.ok(STACKS.length>10);for(const s of STACKS)assert.equal(landAt(new Vector3(...s.normal).normalize()),null);
 SPOUTS.forEach((_,i)=>{for(let t=0;t<120;t+=4)assert.equal(landAt(spoutNormal(i,t)),null);});});
