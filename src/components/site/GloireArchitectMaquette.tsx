'use client';

import { loadModelBytes, modelPixelRatio } from './model-runtime';
import { publicAssetUrl } from '@/lib/public-asset-url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MaquetteLabels } from './Maquette3D';
import { useImmersiveViewer } from './useImmersiveViewer';
import type { Lot } from '@/lib/types';
import { LA_GLOIRE_SITE } from '@/lib/la-gloire-footprints';
import ModelCompass, { updateModelCompass } from './ModelCompass';
import { gloireFloorHeight, gloireModelPlan } from '@/lib/la-gloire-registration';
import { createGloireAvailability, GLOIRE_STATUS_COLORS } from './gloire-availability';
import { gloireSurfaceHit } from './gloire-raycast';
import styles from './Maquette3D.module.css';

const architectModelUrl = '/models/la-gloire/la-gloire-web.glb';
const availabilityModelUrl = '/models/la-gloire/la-gloire-availability.glb?v=topology-v2';

const localCopy = {
  fr: { source: 'Modèle architecte fourni le 07/09/2026 · dimensions du fichier SketchUp · textures optimisées pour le web', aerial: 'Vue aérienne', street: 'Vue façade' },
  en: { source: 'Architect model supplied on 07/09/2026 · SketchUp file dimensions · web-optimised textures', aerial: 'Aerial view', street: 'Street view' },
  ar: { source: 'نموذج المهندس بتاريخ 07/09/2026 · أبعاد ملف SketchUp · خامات محسنة للويب', aerial: 'منظر جوي', street: 'منظر الواجهة' },
};

export default function GloireArchitectMaquette({ locale, labels, lots, onSelect, availability = false, selectedRef }: { locale: string; labels: MaquetteLabels; lots: Lot[]; onSelect: (ref: string) => void; availability?: boolean; selectedRef?: string }) {
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [hovered, setHovered] = useState<Lot | null>(null);
  const c = localCopy[locale as keyof typeof localCopy] ?? localCopy.fr;
  const root = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ reset: () => void; view: (name: 'aerial' | 'street') => void; zoom: (factor: number) => void } | null>(null);
  const rotatingRef = useRef(false);
  const [rotating, setRotating] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [maxFloor, setMaxFloor] = useState<number | 'all'>('all');
  const floorRef = useRef<number | 'all'>('all'); floorRef.current = maxFloor;
  const [lighting, setLighting] = useState<'day' | 'evening'>('day');
  const lightingRef = useRef(lighting); lightingRef.current = lighting;
  const floors = useMemo(() => Array.from(new Set(lots.map(lot => lot.floor))).sort((a, b) => b - a), [lots]);
  rotatingRef.current = rotating;
  const close = useCallback(() => setImmersive(false), []);
  useImmersiveViewer(immersive, close, root);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let cancelled = false;
    const download=new AbortController();
    let cleanup = () => {};
    setReady(false); setFailed(false); setProgress(0);
    (async () => {
      const [THREE,[{ OrbitControls }, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }],bytes,{ MeshBVH, acceleratedRaycast, disposeBoundsTree }] = await Promise.all([import('three'),Promise.all([
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ]),loadModelBytes(availability ? availabilityModelUrl : architectModelUrl,{signal:download.signal,onProgress:setProgress}),import('three-mesh-bvh')]);
      if (cancelled) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      const restingPixelRatio = modelPixelRatio(host.clientWidth,host.clientHeight);
      renderer.setPixelRatio(restingPixelRatio);
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0xdcd8cf);
      renderer.localClippingEnabled = availability;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xdcd8cf);
      scene.fog = new THREE.Fog(0xdcd8cf, 380, 650);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, .04);
      room.dispose(); pmrem.dispose();
      scene.environment = environment.texture;
      scene.add(new THREE.HemisphereLight(0xf6f3ed, 0x8c8577, 2));
      const sun = new THREE.DirectionalLight(0xfff1db, 3.3);
      sun.position.set(-120, 180, -90); scene.add(sun);

      const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 1, 1200);
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true; orbit.dampingFactor = .075; orbit.autoRotateSpeed = .38;
      orbit.maxPolarAngle = Math.PI * .495;

      const draco = new DRACOLoader(); draco.setDecoderPath(publicAssetUrl('/draco/'));draco.setWorkerLimit(2);draco.preload();
      cleanup=()=>{orbit.dispose();draco.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
      const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      const gltf = await loader.parseAsync(bytes,publicAssetUrl('/models/la-gloire/'));
      if (cancelled) { cleanup(); return; }
      setProgress(100);
      const building = gltf.scene;
      building.rotation.x = -Math.PI / 2;
      scene.add(building);
      building.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(building);
      const firstCenter = box.getCenter(new THREE.Vector3());
      building.position.set(-firstCenter.x, -box.min.y, -firstCenter.z);
      building.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(building);
      const size = box.getSize(new THREE.Vector3());
      const status = createGloireAvailability(THREE, lots, building.matrixWorld, selectedRef);
      const floorClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10000);
      const surfaces: import('three').Mesh[] = [];
      const sourceMaterials = new Set<import('three').Material>();

      building.traverse(object => {
        if (availability && object instanceof THREE.Line) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(mat => { mat.clippingPlanes = [floorClip]; mat.needsUpdate = true; });
        }
        const mesh = object as import('three').Mesh;
        if (!mesh.isMesh) return;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(mat => sourceMaterials.add(mat));
        surfaces.push(mesh);
        mesh.frustumCulled = true;
        // The converter negates back-face normals but leaves index winding
        // unchanged. Align winding with those normals before enabling culling.
        const geometry = mesh.geometry;
        const positions = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        const indices = geometry.index;
        if (indices && normals && !geometry.userData.windingFixed) {
          for (let i = 0; i < indices.count; i += 3) {
            const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
            const ux = positions.getX(b) - positions.getX(a), uy = positions.getY(b) - positions.getY(a), uz = positions.getZ(b) - positions.getZ(a);
            const vx = positions.getX(c) - positions.getX(a), vy = positions.getY(c) - positions.getY(a), vz = positions.getZ(c) - positions.getZ(a);
            const nx = normals.getX(a) + normals.getX(b) + normals.getX(c);
            const ny = normals.getY(a) + normals.getY(b) + normals.getY(c);
            const nz = normals.getZ(a) + normals.getZ(b) + normals.getZ(c);
            if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0) {
              indices.setX(i + 1, c); indices.setX(i + 2, b);
            }
          }
          indices.needsUpdate = true;
          geometry.userData.windingFixed = true;
        }
        // Keep detailed facade geometry without testing millions of triangles on every move.
        geometry.boundsTree ??= new MeshBVH(geometry, { strategy: 0, indirect: true, targetLeafSize: 12 });
        mesh.raycast = acceleratedRaycast;
        if (availability) mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(mat => status.material(mat as import('three').MeshStandardMaterial))
          : status.material(mesh.material as import('three').MeshStandardMaterial);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(material => {
          const mat = material as import('three').MeshStandardMaterial;
          // The exporter emits separate front/back triangles.
          // DoubleSide renders both coincident surfaces and causes z-fighting.
          mat.side = THREE.FrontSide;
          mat.needsUpdate = true;
          if (availability) mat.clippingPlanes = [floorClip];
          if ('envMapIntensity' in mat) mat.envMapIntensity = .55;
        });
      });

      const [sourceX, sourceY] = gloireModelPlan((LA_GLOIRE_SITE.bounds.minX + LA_GLOIRE_SITE.bounds.maxX) / 2, (LA_GLOIRE_SITE.bounds.minY + LA_GLOIRE_SITE.bounds.maxY) / 2);
      // Both tabs frame the residence, rather than the much larger road context.
      const focus = new THREE.Vector3(sourceX + building.position.x, size.y * .4, -sourceY + building.position.z);
      const focusSpan = 56;
      let currentView: 'aerial' | 'street' = 'aerial';
      const setView = (name: 'aerial' | 'street') => {
        currentView = name;
        orbit.target.set(focus.x, size.y * .3, focus.z);
        const direction = name === 'street' ? new THREE.Vector3(.48, .18, .62) : new THREE.Vector3(.72, .56, .82);
        const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect));
        const distance = focusSpan * .66 / Math.sin(halfFov);
        camera.position.copy(orbit.target).addScaledVector(direction.normalize(), distance);
        orbit.minDistance = Math.max(6, focusSpan * .12); orbit.maxDistance = focusSpan * 6; orbit.update();
      };
      setView('aerial');
      api.current = { reset: () => setView('aerial'), view: setView, zoom: factor => { camera.position.sub(orbit.target).multiplyScalar(factor).add(orbit.target); orbit.update(); } };

      // Raycast the surface actually visible in either tab. Invisible extruded
      // volumes could intercept a neighbouring lot, courtyard or hidden storey.
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = (event: PointerEvent): Lot | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        syncFloor();
        const hit = gloireSurfaceHit(raycaster, surfaces, availability && floorRef.current !== 'all' ? floorClip : undefined);
        return hit ? status.pick(hit.point) : null;
      };
      const syncFloor = () => {
        const selected = availability ? floorRef.current : 'all';
        status.setMaxFloor(selected);
        floorClip.constant = selected === 'all' ? 10000 : new THREE.Vector3(0, 0, gloireFloorHeight(selected + 1)).applyMatrix4(building.matrixWorld).y;
      };
      const pointers = new Set<number>();
      let press: { x: number; y: number; moved: boolean; id: number } | null = null;
      let lastHover = 0;
      const pointerDown = (event: PointerEvent) => {
        rotatingRef.current = false; setRotating(false);
        pointers.add(event.pointerId);
        if (pointers.size > 1) { if (press) press.moved = true; return; }
        if (event.button === 0) press = { x: event.clientX, y: event.clientY, moved: false, id: event.pointerId };
      };
      const pointerMove = (event: PointerEvent) => {
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) press.moved = true;
        if (pointers.size || performance.now() - lastHover < 80) return;
        lastHover = performance.now();
        const lot = pick(event);
        setHovered(previous => previous?.ref === lot?.ref ? previous : lot);
        renderer.domElement.style.cursor = lot ? 'pointer' : 'grab';
      };
      const pointerUp = (event: PointerEvent) => {
        const clicked = press && press.id === event.pointerId && !press.moved && pointers.size === 1;
        pointers.delete(event.pointerId); press = null;
        if (clicked) { const lot = pick(event); if (lot) { setImmersive(false); selectRef.current(lot.ref); } }
      };
      const pointerCancel = () => { pointers.clear(); press = null; setHovered(null); renderer.domElement.style.cursor = 'grab'; };
      renderer.domElement.addEventListener('pointerdown', pointerDown);
      renderer.domElement.addEventListener('pointermove', pointerMove);
      renderer.domElement.addEventListener('pointerup', pointerUp);
      renderer.domElement.addEventListener('pointercancel', pointerCancel);
      renderer.domElement.addEventListener('pointerleave', pointerCancel);

      let dirty = true;
      let interacting = false;
      let visible = true;
      const onChange = () => { dirty = true; setHovered(previous => previous ? null : previous); renderer.domElement.style.cursor = 'grab'; };
      const onStart = () => { interacting = true; dirty = true; };
      const onEnd = () => { interacting = false; dirty = true; };
      orbit.addEventListener('change', onChange);
      orbit.addEventListener('start', onStart);
      orbit.addEventListener('end', onEnd);
      const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; });
      visibility.observe(host);
      const resize = new ResizeObserver(() => {
        if (!host.clientWidth || !host.clientHeight) return;
        camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
        setView(currentView);
        dirty = true;
      });
      resize.observe(host);
      let frame = 0;
      let appliedFloor: number | 'all' = 'all';
      let appliedLighting = 'day';
      const draw = () => {
        frame = requestAnimationFrame(draw);
        if (!visible || document.hidden) return;
        if (availability && appliedFloor !== floorRef.current) {
          appliedFloor = floorRef.current;
          syncFloor(); setHovered(null);
          dirty = true;
        }
        if (appliedLighting !== lightingRef.current) {
          appliedLighting = lightingRef.current;
          const evening = appliedLighting === 'evening';
          sun.color.setHex(evening ? 0xffbf83 : 0xfff1db); sun.intensity = evening ? 1.6 : 3.3;
          renderer.toneMappingExposure = evening ? .85 : 1.12; dirty = true;
        }
        orbit.autoRotate = rotatingRef.current;
        const changed = orbit.update();
        const ratio = interacting || orbit.autoRotate || changed ? Math.min(restingPixelRatio, .85) : restingPixelRatio;
        if (renderer.getPixelRatio() !== ratio) { renderer.setPixelRatio(ratio); dirty = true; }
        if (dirty || changed || orbit.autoRotate) {
          // SKP x/y plan coordinates are rotated into world x/-z.
          updateModelCompass(camera, [0, -1], compassRef.current);
          renderer.render(scene, camera); dirty = false;
        }
      };
      draw(); setProgress(100); setReady(true);
      const onLost = (event: Event) => { event.preventDefault(); setFailed(true); setReady(false); };
      renderer.domElement.addEventListener('webglcontextlost', onLost);
      cleanup = () => {
        renderer.domElement.removeEventListener('pointerdown', pointerDown);
        renderer.domElement.removeEventListener('pointermove', pointerMove);
        renderer.domElement.removeEventListener('pointerup', pointerUp);
        renderer.domElement.removeEventListener('pointercancel', pointerCancel);
        renderer.domElement.removeEventListener('pointerleave', pointerCancel);
        cancelAnimationFrame(frame); resize.disconnect(); visibility.disconnect(); orbit.dispose(); draco.dispose(); api.current = null;
        renderer.domElement.removeEventListener('webglcontextlost', onLost);
        const disposedMaterials = new Set<import('three').Material>(sourceMaterials);
        scene.traverse(object => { const mesh = object as import('three').Mesh; if (mesh.geometry) { disposeBoundsTree.call(mesh.geometry); mesh.geometry.dispose(); } const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.filter(Boolean).forEach(mat => disposedMaterials.add(mat)); });
        const textures = new Set<import('three').Texture>();
        disposedMaterials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }); material.dispose(); });
        textures.forEach(texture => texture.dispose()); status.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    })().catch(() => { cleanup(); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; download.abort(); cleanup(); };
  }, [attempt, lots, availability, selectedRef]);

  const button = 'viewer-control';
  return <div ref={root} role={immersive ? 'dialog' : undefined} aria-modal={immersive || undefined} aria-label={labels.title} className={`${styles.viewer} ${immersive ? `${styles.immersive} fixed inset-0 z-[120] flex flex-col bg-ink` : 'viewer-shell overflow-hidden rounded-2xl bg-ink'}`}>
    <div className={`${styles.header} flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-5`}>
      <span className="min-w-0 px-2 text-xs uppercase tracking-[.18em] text-gold-300">{availability ? labels.commercial : labels.realistic}</span>
      <button type="button" className={button} aria-label={immersive ? labels.exit : labels.fullscreen} onClick={() => setImmersive(v => !v)}><span aria-hidden="true" className="text-xl">{immersive ? '×' : '⛶'}</span> <span className="hidden sm:inline">{immersive ? labels.exit : labels.fullscreen}</span></button>
    </div>
    <div className={styles.stage}>
      <div className={styles.topbar}>
        <div className={`viewer-glass ${styles.lighting}`}>
          {(['day', 'evening'] as const).map(value => <button key={value} type="button" className={button} aria-pressed={lighting === value} onClick={() => setLighting(value)}>{labels[value]}</button>)}
        </div>
        <ModelCompass locale={locale} needleRef={compassRef} className={styles.compass} />
      </div>
      {availability && <div className={`viewer-glass ${styles.legend}`}>
        {(['available', 'reserved', 'sold', 'unconfirmed'] as const).map(value => <span key={value} className={styles.legendItem}><span className={styles.swatch} style={{background:GLOIRE_STATUS_COLORS[value]}} />{labels.legend[value]}</span>)}
      </div>}
      <div className={styles.viewport}>
        <div ref={mount} className={styles.mount} />
        {ready && hovered && <div className={`${styles.tooltip} viewer-glass rounded-xl px-4 py-3 text-ivory`}><strong>{hovered.code}</strong><p className="text-sm">{hovered.typology} · {hovered.floor === 0 ? 'RDC' : `R+${hovered.floor}`}</p></div>}
        {!ready && <div className="absolute inset-0 grid place-items-center bg-ink"><div className="max-w-sm px-5 text-center"><p className="text-white/70">{failed ? labels.error : `${labels.loading} ${progress ? `${progress}%` : ''}`}</p>{failed && <button type="button" className="btn-gold mt-5" onClick={() => setAttempt(v => v + 1)}>{labels.retry}</button>}</div></div>}
      </div>
      {availability && <div className={styles.floors}>
        <div className={`viewer-glass ${styles.floorButtons}`} role="group" aria-label={labels.floor}>
          <button type="button" className={button} aria-pressed={maxFloor === 'all'} onClick={() => setMaxFloor('all')}>{labels.allFloors}</button>
          {floors.map(floor => <button key={floor} type="button" className={button} aria-pressed={maxFloor === floor} aria-label={`${labels.floor} ${floor}`} onClick={() => setMaxFloor(floor)}>{floor === 0 ? 'R' : floor}</button>)}
        </div>
      </div>}
      <div className={`viewer-glass ${styles.navigation}`} dir="ltr">
        <button type="button" className={`${button} w-11 text-xl`} aria-label={labels.zoomOut} onClick={() => api.current?.zoom(1.18)}>−</button>
        <button type="button" className={`${button} w-11 text-xl`} aria-label={labels.zoomIn} onClick={() => api.current?.zoom(.82)}>+</button>
        <span className={styles.divider} />
        <button type="button" className={button} onClick={() => {setMaxFloor('all'); api.current?.reset();}}>{labels.reset}</button>
        <button type="button" className={`${button} w-11`} aria-label={rotating ? labels.pause : labels.rotate} aria-pressed={rotating} onClick={() => setRotating(value => !value)}>{rotating ? 'Ⅱ' : '▷'}</button>
      </div>
    </div>
    <div className={`${styles.footer} flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5`}>
      <div className="flex flex-wrap gap-2"><button type="button" className={`${button} border border-white/15`} onClick={() => api.current?.view('aerial')}>{c.aerial}</button><button type="button" className={`${button} border border-white/15`} onClick={() => api.current?.view('street')}>{c.street}</button></div>
      <p className={`${styles.hint} max-w-md text-xs leading-relaxed text-white/55`}>{labels.hint}</p>
    </div>
    <p className={`${styles.notice} border-t border-white/5 px-5 py-2 text-xs text-white/40`}>{c.source}</p>
  </div>;
}
