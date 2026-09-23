'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconClose, IconSparkle } from '@/components/Icons';
import { useImmersiveViewer } from './useImmersiveViewer';

const MAX_FIELD_OF_VIEW = 90;
const ROTATION_DEGREES_PER_SECOND = 4;

export interface PanoRoom {
  id: string;
  label: string;
  panorama?: string;
  photo?: string;
  source?: string;
  highResolution?: string;
  available?: boolean;
}

export interface PanoramaLabels {
  title: string; hint: string; fullscreen: string; exit: string;
  unavailableTitle: string; unavailableBody: string; loading: string;
  zoomIn: string; zoomOut: string; reset: string; retry: string;
  rotate: string; pause: string; source: string; room: string;
  errorTitle: string; errorBody: string;
}

export default function Panorama360({ rooms, labels, poster }: {
  rooms: PanoRoom[]; labels: PanoramaLabels; poster?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ zoom: (step: number) => void; reset: () => void } | null>(null);
  const [active, setActive] = useState(() => Math.max(0, rooms.findIndex(r => r.panorama && r.available !== false)));
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [resolution, setResolution] = useState('');
  const rotationRef = useRef(false);
  rotationRef.current = rotating;
  const current = rooms[active];
  const close = useCallback(() => setImmersive(false), []);
  useImmersiveViewer(immersive, close, rootRef);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let release = () => {};
    setResolution('');
    setRotating(false);
    api.current = null;
    if (current?.photo) { setStatus('ready'); return; }
    if (!current?.panorama || current.available === false) { setStatus('missing'); return; }
    setStatus('loading');

    const boot = async () => {
      const THREE = await import('three');
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Photographs are already graded. Preserve their original exposure and colour.
      renderer.toneMapping = THREE.NoToneMapping;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(MAX_FIELD_OF_VIEW, 1, 0.1, 20);
      let geometry = new THREE.SphereGeometry(10, 96, 64);
      geometry.scale(-1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ toneMapped: false });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      const el = renderer.domElement;
      el.tabIndex = 0;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${labels.title} — ${current.label}. ${labels.hint}`);
      el.style.touchAction = 'none';
      mount.appendChild(el);
      let texture: InstanceType<typeof THREE.Texture> | undefined;
      let raf = 0;
      let lon = 0, lat = 0, targetLon = 0, targetLat = 0, previousTime = 0;
      let dirty = true, visible = true, pinchDistance = 0;
      let verticalCoverage = 180;
      const pointers = new Map<number, { x: number; y: number }>();
      const look = new THREE.Vector3();
      const stopRotation = () => { rotationRef.current = false; setRotating(false); };
      const zoom = (step: number) => {
        stopRotation();
        camera.fov = THREE.MathUtils.clamp(camera.fov + step, 45, Math.min(MAX_FIELD_OF_VIEW, verticalCoverage - 4));
        camera.updateProjectionMatrix();
        dirty = true;
      };
      const down = (e: PointerEvent) => {
        stopRotation();
        el.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        el.focus({ preventScroll: true });
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        }
      };
      const move = (e: PointerEvent) => {
        const previous = pointers.get(e.pointerId);
        if (!previous) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDistance) zoom((pinchDistance - distance) * .1);
          pinchDistance = distance;
        } else {
          const sensitivity = camera.fov / Math.max(240, mount.clientHeight);
          targetLon -= (e.clientX - previous.x) * sensitivity;
          targetLat = THREE.MathUtils.clamp(targetLat + (e.clientY - previous.y) * sensitivity, -85, 85);
          dirty = true;
        }
      };
      const up = (e: PointerEvent) => { pointers.delete(e.pointerId); pinchDistance = 0; };
      const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY * .035); };
      const key = (e: KeyboardEvent) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) return;
        e.preventDefault(); stopRotation(); dirty = true;
        if (e.key === 'ArrowLeft') targetLon -= 6;
        if (e.key === 'ArrowRight') targetLon += 6;
        if (e.key === 'ArrowUp') targetLat = Math.min(85, targetLat + 5);
        if (e.key === 'ArrowDown') targetLat = Math.max(-85, targetLat - 5);
        if (e.key === '+' || e.key === '=') zoom(-5);
        if (e.key === '-') zoom(5);
        if (e.key === 'Home') api.current?.reset();
      };
      const resize = () => {
        const w = mount.clientWidth, h = mount.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(5000000 / (w * h))));
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        dirty = true;
      };
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; });
      io.observe(mount);
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('wheel', wheel, { passive: false });
      el.addEventListener('keydown', key);
      const contextLost = (e: Event) => { e.preventDefault(); if (!disposed) setStatus('error'); };
      el.addEventListener('webglcontextlost', contextLost);
      release = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        el.removeEventListener('lostpointercapture', up); el.removeEventListener('wheel', wheel);
        el.removeEventListener('keydown', key); el.removeEventListener('webglcontextlost', contextLost);
        texture?.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); el.remove();
      };
      resize();
      const loader = new THREE.TextureLoader();
      const load = async (src: string) => {
        const loaded = await loader.loadAsync(src);
        if (disposed) { loaded.dispose(); return false; }
        const image = loaded.image as HTMLImageElement;
        const aspect = image.width / image.height;
        if (aspect < 1.98 || aspect > 3.5) { loaded.dispose(); throw new Error('Invalid panoramic image'); }
        if (image.width > renderer.capabilities.maxTextureSize) { loaded.dispose(); return false; }
        // A cropped panorama must not be stretched into invented floor/ceiling pixels.
        verticalCoverage = Math.min(180, 360 / aspect);
        const thetaLength = THREE.MathUtils.degToRad(verticalCoverage);
        geometry.dispose();
        geometry = new THREE.SphereGeometry(10, 96, 64, 0, Math.PI * 2, (Math.PI - thetaLength) / 2, thetaLength);
        geometry.scale(-1, 1, 1); mesh.geometry = geometry;
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
        loaded.minFilter = THREE.LinearMipmapLinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        loaded.wrapS = THREE.RepeatWrapping;
        loaded.generateMipmaps = true;
        texture?.dispose(); texture = loaded;
        material.map = loaded; material.needsUpdate = true; dirty = true;
        setResolution(`${image.width} × ${image.height}`);
        return true;
      };
      if (!await load(current.panorama!)) { if (!disposed) throw new Error('Unsupported texture size'); return; }
      if (disposed) return;
      api.current = {
        zoom,
        reset: () => { stopRotation(); targetLon = 0; targetLat = 0; camera.fov = Math.min(MAX_FIELD_OF_VIEW, verticalCoverage - 4); camera.updateProjectionMatrix(); dirty = true; },
      };
      const animate = (time: number) => {
        raf = requestAnimationFrame(animate);
        const dt = Math.min((time - previousTime) / 1000, .05); previousTime = time;
        if (!visible || document.hidden) return;
        if (rotationRef.current && !pointers.size) { targetLon += dt * ROTATION_DEGREES_PER_SECOND; dirty = true; }
        const moving = Math.abs(targetLon - lon) + Math.abs(targetLat - lat) > .005;
        if (!dirty && !moving) return;
        const latitudeLimit = Math.max(0, (verticalCoverage - camera.fov) / 2 - 2);
        targetLat = THREE.MathUtils.clamp(targetLat, -latitudeLimit, latitudeLimit);
        lon += (targetLon - lon) * (1 - Math.exp(-dt * 14));
        lat += (targetLat - lat) * (1 - Math.exp(-dt * 14));
        lat = THREE.MathUtils.clamp(lat, -latitudeLimit, latitudeLimit);
        look.setFromSphericalCoords(10, THREE.MathUtils.degToRad(90 - lat), THREE.MathUtils.degToRad(lon));
        camera.lookAt(look); renderer.render(scene, camera); dirty = false;
      };
      raf = requestAnimationFrame(animate);
      setStatus('ready');
      // Upgrade in place; a failed optional master never blanks the working preview.
      if (current.highResolution) void load(current.highResolution).catch(() => {});
    };
    void boot().catch(() => { release(); if (!disposed) { api.current = null; setStatus('error'); } });
    return () => { disposed = true; api.current = null; release(); };
  }, [current, attempt, labels.title, labels.hint]);

  return (
    <div ref={rootRef} role={immersive ? 'dialog' : undefined} aria-modal={immersive || undefined} aria-label={labels.title}
      className={immersive ? 'fixed inset-0 z-[120] flex flex-col bg-ink p-2 sm:p-4' : 'viewer-shell overflow-hidden rounded-2xl bg-ink'}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 text-white">
          <span className="rounded-full border border-gold-300/40 px-3 py-1 text-sm text-gold-200">{current?.photo ? 'Photo' : '360°'}</span>
          <div><p className="text-base font-medium">{current?.label ?? labels.title}</p><p className="text-xs text-white/55">{labels.room} {rooms.length ? active + 1 : 0} / {rooms.length}{current?.source ? ` · ${current.source}` : ''}</p></div>
        </div>
        <button type="button" className="viewer-control" onClick={() => setImmersive(v => !v)} aria-label={immersive ? labels.exit : labels.fullscreen}>
          {immersive ? <IconClose className="h-5 w-5" /> : <span aria-hidden="true" className="text-xl">⛶</span>}
          <span className="hidden sm:inline">{immersive ? labels.exit : labels.fullscreen}</span>
        </button>
      </div>
      <div className={`relative min-h-[300px] overflow-hidden ${immersive ? 'min-h-0 flex-1' : 'h-[440px] sm:h-[580px]'}`}>
        <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        {current?.photo && <img src={current.photo} alt={current.label} className="absolute inset-0 h-full w-full object-contain" />}
        {status !== 'ready' && <div className="absolute inset-0 grid place-items-center bg-ink px-6 text-center" role="status" aria-live="polite">
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
          <div className="relative max-w-md">
            {status === 'loading' ? <><span className="mx-auto mb-5 block h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-gold-300" /><p className="text-sm text-white/75">{labels.loading}</p></> : <>
              <IconSparkle className="mx-auto h-8 w-8 text-gold-300" />
              <p className="mt-5 font-display text-3xl text-white">{status === 'error' ? labels.errorTitle : labels.unavailableTitle}</p>
              <p className="mt-3 text-base leading-relaxed text-white/65">{status === 'error' ? labels.errorBody : labels.unavailableBody}</p>
              {status === 'error' && <button type="button" className="btn-gold mt-5" onClick={() => setAttempt(a => a + 1)}>{labels.retry}</button>}
            </>}
          </div>
        </div>}
        {status === 'ready' && <>
          {!current.photo && <div className="viewer-glass absolute bottom-5 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full p-1" dir="ltr">
            <button className="viewer-control w-11 text-xl" type="button" aria-label={labels.zoomOut} title={labels.zoomOut} onClick={() => api.current?.zoom(7)}>−</button>
            <button className="viewer-control w-11 text-xl" type="button" aria-label={labels.zoomIn} title={labels.zoomIn} onClick={() => api.current?.zoom(-7)}>+</button>
            <span className="h-5 w-px bg-white/20" />
            <button className="viewer-control" type="button" onClick={() => api.current?.reset()}>{labels.reset}</button>
            <button className="viewer-control w-11" type="button" aria-label={rotating ? labels.pause : labels.rotate} title={rotating ? labels.pause : labels.rotate} aria-pressed={rotating} onClick={() => setRotating(v => !v)}>{rotating ? 'Ⅱ' : '▷'}</button>
          </div>}
        </>}
      </div>
      <div className="border-t border-white/10 p-4 sm:px-5">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1" aria-label={labels.room}>
          {rooms.map((room, i) => <button key={room.id} type="button" aria-pressed={i === active} onClick={() => setActive(i)}
            className={`group relative flex w-28 shrink-0 flex-col overflow-hidden rounded-lg border text-start transition sm:w-36 ${i === active ? 'border-gold-300 bg-gold-300/10' : 'border-white/15 hover:border-white/50'}`}>
            {room.photo || (room.available !== false && room.panorama) ? <img src={room.photo ?? room.panorama} alt="" loading="lazy" className={`h-14 w-full object-cover transition sm:h-20 ${i === active ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`} /> : <span className="grid h-14 place-items-center bg-white/5 text-lg text-white/30 sm:h-20">360°</span>}
            <span className={`px-3 py-2 text-sm ${i === active ? 'text-gold-200' : 'text-white/75'}`}>{room.label}</span>
          </button>)}
        </div>
        <p className="mt-3 text-xs text-white/50">{labels.hint}</p>
      </div>
    </div>
  );
}
