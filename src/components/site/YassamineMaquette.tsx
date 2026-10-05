'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PlanBrand, { type PlanBrandDetails } from './PlanBrand';
import { useRouter } from 'next/navigation';
import { listedYassamineLots, yassamineA5bPlanCodeAtPoint, yassamineApartmentHref, yassamineLotAtPoint, type MaquetteLot } from '@/lib/yassamine-picking';
import { useImmersiveViewer } from './useImmersiveViewer';
import ModelCompass, { updateModelCompass } from './ModelCompass';

type Point = [number, number];
type Poly = { outer: Point[]; holes: Point[][] };
type Level = {
  id: string; block: string; floors: number[]; outline: Poly[]; walls: Poly[];
  balconies: Poly[]; openings: [Point, Point][]; plan: string; pdf: string;
  textureBounds: [Point, Point]; source: string;
};
type Model = { floorHeight: number; slabHeight: number; levels: Level[] };

const copy = {
  fr: { title: 'Les blocs 5 & 6, en trois dimensions', subtitle: 'Explorez les plans 3D texturés, les cours et les retraits des deux immeubles.', block: 'Bloc', whole: 'Immeuble entier', ground: 'RDC', floor: 'Étage', orbit: 'Maquette', top: 'Plan 3D', reset: 'Recentrer', fullscreen: 'Plein écran', close: 'Fermer', rotate: 'Rotation', pause: 'Pause', loading: 'Chargement de la maquette…', error: 'La vue 3D est indisponible sur cet appareil. Les plans restent consultables ci-dessous.', retry: 'Réessayer', note: 'Dimensions, murs et ouvertures conservés selon les plans de vente. Les textures d’enduit, de pierre, de bois et de verre sont des finitions de présentation.', plans: 'Plans du niveau', download: 'Télécharger le PDF', hint: 'Glissez pour tourner · Molette pour zoomer', cut: 'Lecture par étage', five: 'A5.a + A5.b · RDC à R+4', six: 'A6.a : RDC à R+4 · A6.b : RDC à R+3' },
  en: { title: 'Blocks 5 & 6, in three dimensions', subtitle: 'Explore the textured 3D plans, courtyards and setbacks of both buildings.', block: 'Block', whole: 'Whole building', ground: 'Ground', floor: 'Floor', orbit: 'Model', top: '3D plan', reset: 'Reset view', fullscreen: 'Fullscreen', close: 'Close', rotate: 'Rotate', pause: 'Pause', loading: 'Loading the model…', error: '3D is unavailable on this device. The original plans remain available below.', retry: 'Retry', note: 'Dimensions, walls and openings remain faithful to the sales plans. Plaster, stone, wood and glass textures are presentation finishes.', plans: 'Floor plans', download: 'Download PDF', hint: 'Drag to rotate · Scroll to zoom', cut: 'Explore by floor', five: 'A5.a + A5.b · Ground to 4th floor', six: 'A6.a: ground to 4th · A6.b: ground to 3rd' },
  ar: { title: 'العمارتان 5 و6 بثلاثة أبعاد', subtitle: 'استكشف المخططات ثلاثية الأبعاد المكسوة بالخامات والأفنية والتراجعات.', block: 'عمارة', whole: 'كامل المبنى', ground: 'أرضي', floor: 'طابق', orbit: 'المجسم', top: 'مخطط ثلاثي الأبعاد', reset: 'إعادة التمركز', fullscreen: 'ملء الشاشة', close: 'إغلاق', rotate: 'دوران', pause: 'إيقاف', loading: 'تحميل المجسم…', error: 'العرض ثلاثي الأبعاد غير متاح على هذا الجهاز. المخططات متاحة أدناه.', retry: 'إعادة المحاولة', note: 'تم الحفاظ على الأبعاد والجدران والفتحات حسب مخططات البيع. خامات الجص والحجر والخشب والزجاج مخصصة للعرض.', plans: 'مخططات الطابق', download: 'تنزيل PDF', hint: 'اسحب للدوران · مرر للتقريب', cut: 'حسب الطابق', five: 'A5.a + A5.b · أرضي إلى الرابع', six: 'A6.a: إلى الرابع · A6.b: إلى الثالث' },
};

function finishCanvas(kind: 'plaster' | 'stone' | 'wood' | 'paving') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d')!;
  const base = kind === 'plaster' ? '#eee9df' : kind === 'stone' ? '#d8d0c3' : kind === 'wood' ? '#574134' : '#c8c0b3';
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  if (kind === 'wood') {
    for (let x = 0; x < 512; x += 32) {
      g.fillStyle = x % 64 ? '#4b372d' : '#674d3c'; g.fillRect(x, 0, 28, 512);
      g.fillStyle = 'rgba(235,196,145,.14)'; g.fillRect(x + 4, 0, 2, 512);
    }
  } else if (kind === 'stone' || kind === 'paving') {
    const unit = kind === 'stone' ? 128 : 64;
    g.strokeStyle = kind === 'stone' ? 'rgba(112,98,79,.2)' : 'rgba(92,82,69,.25)'; g.lineWidth = 2;
    for (let y = 0; y <= 512; y += unit) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    for (let row = 0, y = 0; y < 512; row += 1, y += unit) for (let x = row % 2 ? -unit / 2 : 0; x <= 512; x += unit) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + unit); g.stroke(); }
  }
  let seed = kind.length * 991;
  for (let i = 0; i < 7500; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 512; seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 512;
    g.fillStyle = seed & 1 ? 'rgba(255,255,255,.035)' : 'rgba(30,24,18,.025)';
    g.fillRect(x, y, kind === 'plaster' ? 2 : 3, kind === 'plaster' ? 2 : 1);
  }
  return canvas;
}

export default function YassamineMaquette({ locale, lots, planContact }: { locale: string; lots: MaquetteLot[]; planContact: Pick<PlanBrandDetails, 'phone' | 'email' | 'website'> }) {
  const router = useRouter();
  const navigation = useRef({ locale, lots, router });
  navigation.current = { locale, lots, router };
  const [hovered, setHovered] = useState<{ code: string; ref?: string } | null>(null);
  const selectionCopy = locale === 'ar'
    ? { hint: 'اختر الطابق ثم مرّر المؤشر فوق الشقة لمعرفة رقمها. اضغط على شقق A5.a لفتح صفحتها.', list: 'صفحات الشقق', unavailable: 'أرقام شقق A5.b مأخوذة من المخطط؛ صفحات البيع غير منشورة.', open: 'فتح صفحة الشقة', planOnly: 'الرقم من المخطط · لا توجد صفحة بيع', filter: 'تصفية العمارة', both: 'A5.a + A5.b' }
    : locale === 'en'
    ? { hint: 'Choose a floor, then hover to see the apartment number. Click A5.a apartments to open their details.', list: 'Apartment details', unavailable: 'A5.b apartment numbers come from the floor plan; sales pages are not published.', open: 'Open apartment', planOnly: 'Number on plan · no sales page', filter: 'Filter block', both: 'A5.a + A5.b' }
    : { hint: 'Choisissez un étage, puis survolez un appartement pour voir son numéro. Cliquez sur A5.a pour ouvrir sa fiche.', list: 'Fiches des appartements', unavailable: 'Les numéros A5.b proviennent du plan ; les fiches de vente ne sont pas publiées.', open: 'Ouvrir la fiche', planOnly: 'Numéro du plan · fiche non publiée', filter: 'Filtrer le bloc', both: 'A5.a + A5.b' };
  const c = copy[locale as keyof typeof copy] ?? copy.fr;
  const [block, setBlock] = useState<'A5'|'A6'>('A5');
  const [a5Block, setA5Block] = useState<'all' | 'A5.a' | 'A5.b'>('all');
  const [floor, setFloor] = useState<number | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [top, setTop] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const state = useRef({ floor, rotating, top, a5Block });
  state.current = { floor, rotating, top, a5Block };
  const controls = useRef<{ reset: () => void; zoom: (factor: number) => void } | null>(null);
  const close = useCallback(() => setFullscreen(false), []);
  useImmersiveViewer(fullscreen, close, root);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetch('/models/yassamine/model.json', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Model unavailable'); return r.json(); })
      .then(setModel).catch(e => { if (e.name !== 'AbortError') setFailed(true); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const host = mount.current;
    if (!host || !model) return;
    let cancelled = false;
    let dispose = () => {};
    setReady(false); setFailed(false); setHovered(null);
    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
      if (cancelled) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.setClearColor(0xe8e5de);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      host.appendChild(renderer.domElement);
      dispose = () => { renderer.dispose(); renderer.domElement.remove(); };
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, .04);
      room.dispose(); pmrem.dispose();
      scene.environment = environment.texture;
      scene.environmentIntensity = .35;
      const camera = new THREE.PerspectiveCamera(36, host.clientWidth/host.clientHeight, .1, 500);
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true; orbit.dampingFactor = .08;
      orbit.minDistance = 15; orbit.maxDistance = 120;
      orbit.maxPolarAngle = Math.PI * .49;
      orbit.autoRotateSpeed = .55;
      scene.add(new THREE.HemisphereLight(0xe8f0ff, 0xc2b29d, 1.4));
      const sun = new THREE.DirectionalLight(0xfff3e3, 3.2);
      sun.position.set(-30, 45, -25); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 35, bottom: -35, far: 120 });
      sun.shadow.normalBias = .04; sun.shadow.bias = -.0001;
      scene.add(sun);

      const textures: import('three').Texture[] = [];
      const makeFinish = (kind: 'plaster' | 'stone' | 'wood' | 'paving', repeatX: number, repeatY: number) => {
        const texture = new THREE.CanvasTexture(finishCanvas(kind));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        textures.push(texture);
        return texture;
      };
      const plasterTexture = makeFinish('plaster', 3, 3);
      const stoneTexture = makeFinish('stone', 4, 4);
      const woodTexture = makeFinish('wood', 3, 1);
      const pavingTexture = makeFinish('paving', 7, 7);
      const plaster = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plasterTexture, roughness: .82 });
      const slabMat = new THREE.MeshStandardMaterial({ color: 0xf4eee4, map: stoneTexture, roughness: .72 });
      const trim = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTexture, roughness: .62 });
      const frame = new THREE.MeshStandardMaterial({ color: 0x57514a, roughness: .4, metalness: .55 });
      const glass = new THREE.MeshPhysicalMaterial({ color: 0x91a9ae, roughness: .12, metalness: .1, transmission: .22, transparent: true, opacity: .82 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xe9e1d5, map: stoneTexture, roughness: .9 });
      const materials: import('three').Material[] = [plaster,slabMat,trim,frame,glass,roofMat];
      const levels: { group: import('three').Group; floor: number; plan: import('three').Object3D; data: Level }[] = [];
      const roofs: { group: import('three').Group; last: number; block: string }[] = [];
      const building = new THREE.Group(); scene.add(building);
      function shape(poly: Poly) {
        const s = new THREE.Shape(poly.outer.map(([x,z]) => new THREE.Vector2(x,-z)));
        for (const hole of poly.holes) s.holes.push(new THREE.Path(hole.map(([x,z])=>new THREE.Vector2(x,-z))));
        return s;
      }
      function extrude(polys: Poly[], height: number, y: number, mat: import('three').Material, parent: import('three').Object3D) {
        const geos = polys.map(p => {
          const g = new THREE.ExtrudeGeometry(shape(p),{ depth: height, bevelEnabled: false });
          g.rotateX(-Math.PI/2); g.translate(0,y,0); return g;
        });
        if (!geos.length) return;
        const merged = mergeGeometries(geos); geos.forEach(g=>g.dispose());
        if (!merged) return;
        const mesh = new THREE.Mesh(merged,mat); mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
      }
      function bar(a: Point,b: Point, width: number,height: number,y:number,mat:import('three').Material,parent:import('three').Object3D) {
        const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(len,height,width),mat);
        mesh.position.set((a[0]+b[0])/2,y+height/2,(a[1]+b[1])/2);
        mesh.rotation.y=-Math.atan2(dz,dx);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
      }
      const selected = model.levels.filter(l=>l.block.startsWith(block));
      const loader = new THREE.TextureLoader();
      function mergeStatic(group: import('three').Group, keep?: import('three').Object3D) {
        const batches=new Map<import('three').Material,import('three').BufferGeometry[]>();
        for(const child of [...group.children]){
          if(child===keep)continue;
          const mesh=child as import('three').Mesh;
          if(!mesh.geometry||Array.isArray(mesh.material))continue;
          // Boxes are indexed, extrusions are not: normalize before batching.
          if(mesh.geometry.index){const original=mesh.geometry;mesh.geometry=original.toNonIndexed();original.dispose();}
          mesh.updateMatrix();mesh.geometry.applyMatrix4(mesh.matrix);
          const batch=batches.get(mesh.material)??[];batch.push(mesh.geometry);batches.set(mesh.material,batch);group.remove(mesh);
        }
        for(const [mat,geos] of batches){
          const merged=mergeGeometries(geos);
          if(merged)geos.forEach(g=>g.dispose());
          // Preserve every part if a future geometry cannot be merged.
          for(const g of merged?[merged]:geos){const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
        }
      }
      for (const data of selected) {
        const texture=loader.load(data.plan);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures.push(texture);
        const planMat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});materials.push(planMat);
        for (const f of data.floors) {
          const y=f*model.floorHeight;
          const group=new THREE.Group();building.add(group);
          extrude(data.outline,model.slabHeight,y,slabMat,group);
          extrude(data.walls,model.floorHeight-model.slabHeight,y+model.slabHeight,plaster,group);
          // Window width/position comes from bounded gaps in the PDF wall fills.
          // Sill/lintel heights are presentation estimates, not construction data.
          for(const [a,b] of data.openings){
            bar(a,b,.24,.8,y+.22,plaster,group);
            bar(a,b,.24,.55,y+2.45,plaster,group);
            bar(a,b,.07,1.43,y+1.02,glass,group);
            bar(a,b,.12,.045,y+1.02,frame,group);bar(a,b,.12,.045,y+2.4,frame,group);
            const mid:Point=[(a[0]+b[0])/2,(a[1]+b[1])/2];
            for(const p of [a,mid,b])bar([p[0]-.022,p[1]],[p[0]+.022,p[1]],.12,1.43,y+1.02,frame,group);
          }
          for (const p of data.balconies ?? []) {
            // Low rails only along the perimeter-facing edges of marked balconies.
            for(let i=0;i<p.outer.length;i++){
              const a=p.outer[i],b=p.outer[(i+1)%p.outer.length];
              if(Math.hypot(a[0]-b[0],a[1]-b[1])<.6)continue;
              const midpoint=new THREE.Vector2((a[0]+b[0])/2,(a[1]+b[1])/2);
              const onPerimeter=data.outline.some(o=>o.outer.some((c,j)=>{
                const d=o.outer[(j+1)%o.outer.length];const v=new THREE.Vector2(d[0]-c[0],d[1]-c[1]);
                const t=THREE.MathUtils.clamp(midpoint.clone().sub(new THREE.Vector2(...c)).dot(v)/v.lengthSq(),0,1);
                return midpoint.distanceTo(new THREE.Vector2(c[0]+v.x*t,c[1]+v.y*t))<.3;
              }));
              if(onPerimeter){for(const h of [.55,.8,1.05])bar(a,b,.035,.035,y+.22+h,trim,group);}
            }
          }
          const [[x0,z0],[x1,z1]]=data.textureBounds;
          // UVs map the original cropped plan onto the actual slab outline.
          const planGeo=new THREE.ShapeGeometry(data.outline.map(shape));
          const pos=planGeo.getAttribute('position');const uv=planGeo.getAttribute('uv');
          for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)-x0)/(x1-x0),(-pos.getY(i)-z1)/(z0-z1));
          planGeo.rotateX(-Math.PI/2);
          const plan=new THREE.Mesh(planGeo,planMat);plan.position.y=y+.225;plan.visible=false;group.add(plan);
          mergeStatic(group,plan);
          levels.push({group,floor:f,plan,data});
        }
      }
      for(const part of [...new Set(selected.map(l=>l.block))]){
        const last=Math.max(...selected.filter(l=>l.block===part).flatMap(l=>l.floors));
        const data=selected.find(l=>l.block===part&&l.floors.includes(last))!;
        const roof=new THREE.Group();building.add(roof);
        extrude(data.outline,.2,(last+1)*model.floorHeight,roofMat,roof);
        for(const p of data.outline)for(let i=0;i<p.outer.length;i++)bar(p.outer[i],p.outer[(i+1)%p.outer.length],.16,.65,(last+1)*model.floorHeight+.2,plaster,roof);
        mergeStatic(roof);
        roofs.push({group:roof,last,block:part});
      }
      const bounds=new THREE.Box3().setFromObject(building);const center=bounds.getCenter(new THREE.Vector3());
      const size=bounds.getSize(new THREE.Vector3());const span=Math.max(size.x,size.z);
      const groundMat=new THREE.MeshStandardMaterial({color:0xf5efe6,map:pavingTexture,roughness:.92});materials.push(groundMat);
      const ground=new THREE.Mesh(new THREE.BoxGeometry(size.x+6,.35,size.z+6),groundMat);
      ground.position.set(center.x,-.25,center.z);ground.receiveShadow=true;scene.add(ground);
      const focus=()=>{
        const part=block==='A5'?state.current.a5Block:'all';
        if(part==='all')return {center,span};
        const box=new THREE.Box3();
        for(const level of levels)if(level.data.block===part)box.expandByObject(level.group);
        for(const roof of roofs)if(roof.block===part)box.expandByObject(roof.group);
        const partCenter=box.getCenter(new THREE.Vector3());
        const partSize=box.getSize(new THREE.Vector3());
        return {center:partCenter,span:Math.max(partSize.x,partSize.z)};
      };
      const reset=()=>{const view=focus();orbit.target.set(view.center.x,4,view.center.z);camera.up.set(0,1,0);camera.position.set(view.center.x+view.span*.8,view.span*.78,view.center.z-view.span*1.15);orbit.update();};
      const topView=()=>{const view=focus();orbit.target.set(view.center.x,0,view.center.z);camera.position.set(view.center.x,view.span*1.6,view.center.z-.01);orbit.update();};
      reset();
      controls.current={reset,zoom:factor=>{camera.position.sub(orbit.target).multiplyScalar(factor).add(orbit.target);orbit.update();}};
      let dirty=true;
      const onChange=()=>{dirty=true;};orbit.addEventListener('change',onChange);
      const canvas=renderer.domElement;
      const raycaster=new THREE.Raycaster();
      const pointer=new THREE.Vector2();
      const pick=(event:PointerEvent)=>{
        const rect=canvas.getBoundingClientRect();
        pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
        scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
        raycaster.setFromCamera(pointer,camera);
        // Explicit visibility filtering: Three's raycaster also visits hidden groups.
        // Include roofs as occluders so a roof cannot select a flat underneath it.
        const objects=[...levels.filter(l=>l.group.visible).flatMap(l=>l.group.children.filter(o=>o.visible)),...roofs.filter(r=>r.group.visible).flatMap(r=>r.group.children)];
        const hit=raycaster.intersectObjects(objects,false)[0];
        if(!hit)return;
        const level=levels.find(l=>l.group===hit.object.parent);
        if(!level)return;
        const target={block:level.data.block,floor:level.floor,textureBounds:level.data.textureBounds};
        const lot=yassamineLotAtPoint(target,hit.point.x,hit.point.z,navigation.current.lots);
        if(lot)return {code:lot.code,ref:lot.ref};
        const code=yassamineA5bPlanCodeAtPoint(target,hit.point.x,hit.point.z);
        return code?{code}:undefined;
      };
      let gesture:{id:number;x:number;y:number;moved:boolean}|null=null;
      const pointers=new Set<number>();
      const clearHover=()=>{canvas.style.cursor='grab';setHovered(null);};
      const down=(event:PointerEvent)=>{
        clearHover();
        pointers.add(event.pointerId);
        if(pointers.size>1){gesture=null;clearHover();return;}
        if(event.button===0&&event.isPrimary)gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      };
      const move=(event:PointerEvent)=>{
        if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>6)gesture.moved=true;
        if(pointers.size||event.pointerType!=='mouse')return;
        const apartment=pick(event);canvas.style.cursor=apartment?.ref?'pointer':apartment?'help':'grab';
        setHovered(current=>current?.code===apartment?.code&&current?.ref===apartment?.ref?current:apartment??null);
      };
      const up=(event:PointerEvent)=>{
        const click=gesture?.id===event.pointerId&&!gesture.moved&&pointers.size===1
          &&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<=6;
        pointers.delete(event.pointerId);gesture=null;
        if(!click)return;
        const apartment=pick(event);
        if(apartment?.ref){setRotating(false);navigation.current.router.push(yassamineApartmentHref(navigation.current.locale,apartment.ref));}
        else if(apartment)setHovered(apartment);
      };
      const cancel=(event:PointerEvent)=>{pointers.delete(event.pointerId);gesture=null;clearHover();};
      canvas.style.cursor='grab';
      canvas.addEventListener('pointerdown',down,true);
      canvas.addEventListener('pointermove',move,true);
      canvas.addEventListener('pointerup',up,true);
      canvas.addEventListener('pointercancel',cancel,true);
      canvas.addEventListener('pointerleave',clearHover);
      const disposePicking=()=>{
        canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);
        canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);canvas.removeEventListener('pointerleave',clearHover);
      };
      const resize=new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);dirty=true;});resize.observe(host);
      let frameId=0,previousTop=false,previousFloor:number|null|undefined=undefined;
      let previousA5Block=state.current.a5Block;
      let visible=true;
      const visibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;dirty=true;});visibility.observe(host);
      const draw=()=>{
        frameId=requestAnimationFrame(draw);
        if(!visible || document.hidden) return;
        const current=state.current;
        if(block==='A5'&&current.a5Block!==previousA5Block){
          if(current.top)topView();else reset();
          previousA5Block=current.a5Block;previousTop=current.top;dirty=true;
        }
        if(current.top!==previousTop){
          if(current.top)topView();
          else reset();previousTop=current.top;
        }
        orbit.autoRotate=current.rotating&&!current.top;
        for(const l of levels){l.group.visible=(block!=='A5'||current.a5Block==='all'||l.data.block===current.a5Block)&&(current.floor===null||l.floor<=current.floor);l.plan.visible=current.floor===l.floor;}
        for(const r of roofs)r.group.visible=(block!=='A5'||current.a5Block==='all'||r.block===current.a5Block)&&current.floor===null;
        if(previousFloor!==current.floor){renderer.shadowMap.needsUpdate=true;previousFloor=current.floor;dirty=true;}
        const changed=orbit.update();
        if(dirty||changed||orbit.autoRotate){
          // The sales-sheet north arrow points SE on A5 plans; the A6 floor
          // sheets are quarter-turned relative to their individual sale sheets.
          updateModelCompass(camera, block === 'A5' ? [1, 1] : [1, -1], compassRef.current);
          renderer.render(scene,camera);dirty=false;
        }
      };draw();setReady(true);
      const contextLost=(event:Event)=>{event.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
      dispose=()=>{disposePicking();cancelAnimationFrame(frameId);visibility.disconnect();resize.disconnect();orbit.removeEventListener('change',onChange);orbit.dispose();controls.current=null;renderer.domElement.removeEventListener('webglcontextlost',contextLost);scene.traverse(o=>{const m=o as import('three').Mesh;if(m.geometry)m.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();};
    })().catch(()=>{dispose();if(!cancelled)setFailed(true);});
    return()=>{cancelled=true;dispose();};
  },[model,block,attempt]);

  const selectedPlans=model?.levels.filter(l=>l.block.startsWith(block)&&(block!=='A5'||a5Block==='all'||l.block===a5Block)&&l.floors.includes(floor??0))??[];
  const button='rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400';
  return <section className="bg-ink py-20 text-ivory">
    <div className="container-lux">
      <p className="text-xs uppercase tracking-[.24em] text-gold-300">Diar El Yassamine</p>
      <h2 className="mt-4 font-display text-3xl sm:text-5xl">{c.title}</h2><p className="mt-4 text-white/65">{c.subtitle}</p>
      <div ref={root} role={fullscreen?'dialog':undefined} aria-modal={fullscreen||undefined} aria-label={c.title} className={fullscreen?'fixed inset-0 z-[100] flex flex-col overflow-auto bg-ink p-4':'mt-9 overflow-hidden rounded-2xl border border-white/15'}>
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#262522] p-4">
          <div className="flex gap-2">{(['A5','A6'] as const).map(b=><button key={b} className={`${button} ${block===b?'border-gold-400 bg-gold-400 text-ink':'border-white/20'}`} aria-pressed={block===b} onClick={()=>{setBlock(b);setTop(false);setHovered(null);}}>{c.block} {b.slice(1)}</button>)}</div>
          <span className="text-xs text-white/60">{block==='A5'?(a5Block==='all'?c.five:a5Block):c.six}</span>
          <button className={`${button} border-white/20`} onClick={()=>setFullscreen(!fullscreen)}>{fullscreen?c.close:c.fullscreen}</button>
        </div>
        {block==='A5'&&<div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#262522] px-4 pb-4" role="group" aria-label={selectionCopy.filter}>
          <span className="me-2 text-xs text-white/60">{selectionCopy.filter}</span>
          {(['all','A5.a','A5.b'] as const).map(part=><button key={part} type="button" className={`${button} ${a5Block===part?'border-gold-400 bg-gold-400 text-ink':'border-white/20'}`} aria-pressed={a5Block===part} onClick={()=>{setA5Block(part);setHovered(null);}}>{part==='all'?selectionCopy.both:part}</button>)}
        </div>}
        <div className="relative min-h-[360px] bg-[#e8e5de]" style={{height:fullscreen?'calc(100dvh - 205px)':'clamp(380px, 60vw, 620px)'}}>
          <div ref={mount} className="h-full w-full" aria-label={`${c.block} ${block==='A5'?(a5Block==='all'?'A5.a + A5.b':a5Block):block} — ${c.hint}`} />
          <ModelCompass locale={locale} needleRef={compassRef} className="right-3 top-3 sm:right-5 sm:top-5" />
          {hovered&&<div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-ink/90 px-4 py-3 text-sm text-white" role="status"><strong className="block font-semibold">{hovered.code}</strong><span className="mt-1 block text-xs text-white/75">{hovered.ref?`${selectionCopy.open} →`:selectionCopy.planOnly}</span></div>}
          {!ready&&!failed&&<p className="absolute inset-0 grid place-items-center text-ink">{c.loading}</p>}
          {failed&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#e8e5de] p-10 text-center text-ink"><p>{c.error}</p><button className={`${button} border-ink/30`} onClick={()=>setAttempt(a=>a+1)}>{c.retry}</button></div>}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-white/95 p-1 text-ink shadow-sm"><button className={button+' border-transparent'} aria-pressed={!top} onClick={()=>setTop(false)}>{c.orbit}</button><button className={button+' border-transparent'} aria-pressed={top} onClick={()=>{setTop(true);if(floor===null)setFloor(0);}}>{c.top}</button></div>
            <div className="flex gap-1 rounded-full bg-white/95 p-1 text-ink shadow-sm"><button className={button+' border-transparent'} aria-label="Zoom +" onClick={()=>controls.current?.zoom(.85)}>+</button><button className={button+' border-transparent'} aria-label="Zoom −" onClick={()=>controls.current?.zoom(1.15)}>−</button><button className={button+' border-transparent'} onClick={()=>{setTop(false);controls.current?.reset();}}>{c.reset}</button></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-[#262522] p-4" aria-label={c.cut}>
          <button className={`${button} ${floor===null?'border-gold-400 text-gold-300':'border-white/20'}`} aria-pressed={floor===null} onClick={()=>{setFloor(null);setTop(false);}}>{c.whole}</button>
          {[0,1,2,3,4].map(f=><button key={f} className={`${button} ${floor===f?'border-gold-400 text-gold-300':'border-white/20'}`} aria-pressed={floor===f} onClick={()=>setFloor(f)}>{f===0?c.ground:`R+${f}`}</button>)}
          <button className={`${button} ml-auto border-white/20`} aria-pressed={rotating} onClick={()=>setRotating(!rotating)}>{rotating?c.pause:c.rotate}</button>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/80">{selectionCopy.hint}</p>
      <nav aria-label={selectionCopy.list} className="mt-4 flex flex-wrap gap-2">
          {listedYassamineLots(lots).filter(lot=>lot.block.startsWith(block)&&(block!=='A5'||a5Block==='all'||lot.block===a5Block)&&(floor===null||lot.floor===floor)).map(lot=><Link key={lot.ref} prefetch={false} href={yassamineApartmentHref(locale,lot.ref)} className={`${button} border-white/20 hover:border-gold-400 hover:text-gold-300`} aria-label={`${selectionCopy.open} ${lot.code}`}>{lot.code} ↗</Link>)}
      </nav>
        {block === 'A5' && a5Block !== 'A5.a' && <p className="mt-3 text-xs text-white/60">{selectionCopy.unavailable}</p>}
      <p className="mt-2 max-w-3xl text-sm text-white/65">{c.note}</p>
      <div className="mt-9"><h3 className="font-display text-2xl">{c.plans} · {floor===null||floor===0?c.ground:`R+${floor}`}</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">{selectedPlans.map(p=><article key={p.id} className="overflow-hidden rounded-xl bg-ivory text-ink"><PlanBrand project="Diar El Yassamine" document={`${p.block} · ${floor===null||floor===0?c.ground:`R+${floor}`}`} {...planContact} /><div className="flex items-center justify-between gap-3 p-4"><strong>{p.block}</strong><a className="text-sm underline underline-offset-4" href={p.pdf.replace('/models/yassamine/', '/models/yassamine/presentation/')} download>{c.download}</a></div><img src={p.plan.replace('/models/yassamine/', '/models/yassamine/presentation/')} alt={`${c.plans} ${p.block}`} loading="lazy" className="h-[340px] w-full bg-white object-contain p-3" /></article>)}</div>
      </div>
    </div>
  </section>;
}
