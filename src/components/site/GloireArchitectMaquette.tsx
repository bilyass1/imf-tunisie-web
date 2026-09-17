'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MaquetteLabels } from './Maquette3D';
import { useImmersiveViewer } from './useImmersiveViewer';

const modelUrl = '/models/la-gloire/la-gloire-web.glb';

const localCopy = {
  fr: { source: 'Modèle architecte fourni le 07/09/2026 · dimensions du fichier SketchUp · textures optimisées pour le web', aerial: 'Vue aérienne', street: 'Vue façade' },
  en: { source: 'Architect model supplied on 07/09/2026 · SketchUp file dimensions · web-optimised textures', aerial: 'Aerial view', street: 'Street view' },
  ar: { source: 'نموذج المهندس بتاريخ 07/09/2026 · أبعاد ملف SketchUp · خامات محسنة للويب', aerial: 'منظر جوي', street: 'منظر الواجهة' },
};

export default function GloireArchitectMaquette({ locale, labels }: { locale: string; labels: MaquetteLabels }) {
  const c = localCopy[locale as keyof typeof localCopy] ?? localCopy.fr;
  const root = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{ reset: () => void; view: (name: 'aerial' | 'street') => void; zoom: (factor: number) => void } | null>(null);
  const rotatingRef = useRef(false);
  const [rotating, setRotating] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [immersive, setImmersive] = useState(false);
  rotatingRef.current = rotating;
  const close = useCallback(() => setImmersive(false), []);
  useImmersiveViewer(immersive, close, root);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};
    setReady(false); setFailed(false); setProgress(0);
    (async () => {
      const THREE = await import('three');
      const [{ OrbitControls }, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }] = await Promise.all([
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ]);
      if (cancelled) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0xdcd8cf);
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

      const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, .1, 1200);
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true; orbit.dampingFactor = .075; orbit.autoRotateSpeed = .38;
      orbit.maxPolarAngle = Math.PI * .495;

      const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
      const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      const gltf = await loader.loadAsync(modelUrl, event => {
          if (event.total) setProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
      });
      if (cancelled) { draco.dispose(); return; }
      const building = gltf.scene;
      building.rotation.x = -Math.PI / 2;
      scene.add(building);
      building.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(building);
      const firstCenter = box.getCenter(new THREE.Vector3());
      building.position.set(-firstCenter.x, -box.min.y, -firstCenter.z);
      building.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(building);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.z);

      building.traverse(object => {
        const mesh = object as import('three').Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(material => {
          const mat = material as import('three').MeshStandardMaterial;
          if ('envMapIntensity' in mat) mat.envMapIntensity = .55;
        });
      });

      const setView = (name: 'aerial' | 'street') => {
        orbit.target.set(center.x, size.y * .3, center.z);
        camera.position.copy(name === 'street'
          ? new THREE.Vector3(center.x + span * .48, size.y * .52, center.z + span * .62)
          : new THREE.Vector3(center.x + span * .72, span * .56, center.z + span * .82));
        orbit.minDistance = Math.max(10, span * .12); orbit.maxDistance = span * 2.5; orbit.update();
      };
      setView('aerial');
      api.current = { reset: () => setView('aerial'), view: setView, zoom: factor => { camera.position.sub(orbit.target).multiplyScalar(factor).add(orbit.target); orbit.update(); } };

      const resize = new ResizeObserver(() => {
        if (!host.clientWidth || !host.clientHeight) return;
        camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
      });
      resize.observe(host);
      let frame = 0;
      const draw = () => { orbit.autoRotate = rotatingRef.current; orbit.update(); renderer.render(scene, camera); frame = requestAnimationFrame(draw); };
      draw(); setProgress(100); setReady(true);
      const onLost = (event: Event) => { event.preventDefault(); setFailed(true); };
      renderer.domElement.addEventListener('webglcontextlost', onLost);
      cleanup = () => {
        cancelAnimationFrame(frame); resize.disconnect(); orbit.dispose(); draco.dispose(); api.current = null;
        renderer.domElement.removeEventListener('webglcontextlost', onLost);
        const disposedMaterials = new Set<import('three').Material>();
        scene.traverse(object => { const mesh = object as import('three').Mesh; mesh.geometry?.dispose(); const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.filter(Boolean).forEach(mat => disposedMaterials.add(mat)); });
        disposedMaterials.forEach(material => material.dispose()); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    })().catch(() => { cleanup(); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; cleanup(); };
  }, [attempt]);

  const button = 'viewer-control';
  return <div ref={root} role={immersive ? 'dialog' : undefined} aria-modal={immersive || undefined} aria-label={labels.title} className={immersive ? 'fixed inset-0 z-[120] flex flex-col bg-ink p-2 sm:p-4' : 'viewer-shell overflow-hidden rounded-2xl bg-ink'}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-5">
      <p className="max-w-3xl text-xs text-white/60">{c.source}</p>
      <button type="button" className={button} onClick={() => setImmersive(v => !v)}><span aria-hidden="true" className="text-xl">{immersive ? '×' : '⛶'}</span> <span className="hidden sm:inline">{immersive ? labels.exit : labels.fullscreen}</span></button>
    </div>
    <div className={`relative ${immersive ? 'min-h-0 flex-1' : ''}`}>
      <div ref={mount} className={immersive ? 'h-full w-full' : 'h-[520px] w-full sm:h-[650px]'} />
      {!ready && <div className="absolute inset-0 grid place-items-center bg-ink"><div className="max-w-sm px-5 text-center"><p className="text-white/70">{failed ? labels.error : `${labels.loading} ${progress ? `${progress}%` : ''}`}</p>{failed && <button className="btn-gold mt-5" onClick={() => setAttempt(v => v + 1)}>{labels.retry}</button>}</div></div>}
      {ready && <><div className="viewer-glass absolute start-3 top-3 flex rounded-full p-1 sm:start-5 sm:top-5"><button className={button} onClick={() => api.current?.view('aerial')}>{c.aerial}</button><button className={button} onClick={() => api.current?.view('street')}>{c.street}</button></div>
      <div className="viewer-glass absolute bottom-3 end-3 flex rounded-full p-1 sm:bottom-5 sm:end-5"><button className={button} aria-label={labels.zoomIn} onClick={() => api.current?.zoom(.82)}>+</button><button className={button} aria-label={labels.zoomOut} onClick={() => api.current?.zoom(1.18)}>−</button><button className={button} onClick={() => api.current?.reset()}>{labels.reset}</button><button className={button} aria-pressed={rotating} onClick={() => setRotating(value => !value)}>{rotating ? labels.pause : labels.rotate}</button></div></>}
    </div>
  </div>;
}
