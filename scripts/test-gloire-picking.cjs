const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),THREE=require('three');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const box={exports:{}};cache.set(file,box.exports);const local=id=>id.startsWith('@/')?load('src/'+id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:box,exports:box.exports,require:local,Uint8Array});return box.exports;}
const {LA_GLOIRE_FOOTPRINTS:footprints,LA_GLOIRE_SITE:site}=load('src/lib/la-gloire-footprints.ts');
const {gloireModelPlan,gloireSalesPlan,gloireFloorAtHeight,gloireFloorHeight}=load('src/lib/la-gloire-registration.ts');
const {gloireAvailabilityAtlas,gloireLotAtPlanPoint}=load('src/lib/gloire-picking.ts');
const {createGloireAvailability}=load('src/components/site/gloire-availability.ts');
const lots=Object.keys(footprints).map(ref=>({ref,code:ref,floor:Number(ref[1]),status:'available'}));
assert.equal(lots.length,102);
// Source XY anchors on the four wings of the supplied SketchUp, not round-trips.
for(const [x,y,ref] of [[136,142,'A13'],[136,107,'B12'],[106,104,'C13'],[112,143,'D13']]){
 const [px,py]=gloireSalesPlan(x,y);assert.equal(gloireLotAtPlanPoint(lots,1,px,py)?.ref,ref,'Sales Y must run south, opposite to source Y');
}
for(let floor=0;floor<6;floor++)assert.equal(gloireFloorAtHeight(5.3+floor*3.25),floor,'Measured finished slab heights must select the visible floor');
assert.equal(gloireFloorAtHeight(3.0),null,'Terrain and basement are not apartments');
assert.equal(gloireFloorAtHeight(23.0),5,'Roof belongs to R+5, never a nonexistent sixth floor');
assert.equal(gloireFloorAtHeight(23.5),null);
assert.equal(gloireFloorAtHeight(6.75,0),0,'Cut slab must select the exposed apartment below');
assert.equal(gloireFloorAtHeight(6.76,0),null,'Clipped upper storey must not be selectable');
assert.equal(gloireFloorAtHeight(6.75),1);
const atlas=gloireAvailabilityAtlas(lots),examples=new Map(),b=site.bounds;
for(let i=0;i<atlas.data.length;i+=4){
 const index=atlas.data[i];assert.equal(atlas.data[i+1],0);assert.equal(atlas.data[i+2],0);
 if(!atlas.data[i+3]){assert.equal(index,0);continue;}
 assert.equal(atlas.data[i+3],255);assert(atlas.byIndex[index],'No blended/phantom region ID');
 if(!examples.has(index))examples.set(index,[i/4%atlas.width,Math.floor(i/4/atlas.width)]);
}
assert.equal(examples.size,102,'Every catalogued footprint is represented');
const modelToWorld=new THREE.Matrix4().compose(new THREE.Vector3(-88,2,125),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,.37,0)),new THREE.Vector3(1.1,1.1,1.1));
const availability=createGloireAvailability(THREE,lots,modelToWorld);
for(const [index,[px,py]] of examples){
 const lot=atlas.byIndex[index],x=b.minX+(px%512+.5)/512*(b.maxX-b.minX),y=b.minY+(py%512+.5)/512*(b.maxY-b.minY);
 assert.equal(gloireLotAtPlanPoint(lots,lot.floor,x,y)?.ref,lot.ref,'GPU texel IDs and exact CPU polygons must agree');
 const [mx,my]=gloireModelPlan(x,y),point=new THREE.Vector3(mx,my,gloireFloorHeight(lot.floor)+1.2).applyMatrix4(modelToWorld);
 assert.equal(availability.pick(point)?.ref,lot.ref,'Picking must survive the actual scene transform without another manual axis flip');
}
const [cx,cy]=gloireModelPlan(-15,0);assert.equal(availability.pick(new THREE.Vector3(cx,cy,8).applyMatrix4(modelToWorld)),null,'Courtyard must not redirect');
availability.setMaxFloor(0);const [ax,ay]=gloireModelPlan(8,-7);assert.equal(availability.pick(new THREE.Vector3(ax,ay,8).applyMatrix4(modelToWorld)),null);
availability.dispose();
// One mesh spanning several floors: nearest-only BVH queries would miss a cut floor.
const {MeshBVH,acceleratedRaycast}=require('three-mesh-bvh');
const {gloireSurfaceHit}=load('src/components/site/gloire-raycast.ts');
const positions=[],indices=[];
for(const y of [1,4,7]){
 const box=new THREE.BoxGeometry(2,2,2),p=box.getAttribute('position'),offset=positions.length/3;
 for(let i=0;i<p.count;i++)positions.push(p.getX(i),p.getY(i)+y,p.getZ(i));
 for(const i of box.index.array)indices.push(i+offset);box.dispose();
}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
geometry.boundsTree=new MeshBVH(geometry,{indirect:true});
const surface=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));surface.raycast=acceleratedRaycast;surface.updateMatrixWorld();
const ray=new THREE.Raycaster(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0));
assert.equal(gloireSurfaceHit(ray,[surface]).point.y,8);
assert.equal(gloireSurfaceHit(ray,[surface],new THREE.Plane(new THREE.Vector3(0,-1,0),2)).point.y,2,'Clipped top hits must not hide the exposed floor inside the same mesh');
assert.equal(gloireSurfaceHit(ray,[surface],new THREE.Plane(new THREE.Vector3(0,-1,0),-1)),null);
geometry.dispose();surface.material.dispose();
console.log('PASS: 102 apartments, four independent source anchors, measured floor levels, clipped BVH surfaces, roof, scene transforms, exact atlas IDs and courtyard exclusion.');
