'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconClose, IconSparkle } from '@/components/Icons';

export interface PanoRoom {
  id: string;
  label: string;
  panorama?: string;
  /** Présence du fichier, résolue côté serveur — évite une requête HEAD. */
  available?: boolean;
}

export interface PanoramaLabels {
  title: string;
  hint: string;
  fullscreen: string;
  exit: string;
  unavailableTitle: string;
  unavailableBody: string;
  loading: string;
}

/**
 * Visionneuse 360° équirectangulaire.
 * Attend une image au format 2:1 (ex. 4096×2048 ou 8192×4096) rendue par le
 * bureau d'études en projection sphérique. Voir README §« Visites 360° ».
 */
export default function Panorama360({
  rooms,
  labels,
  poster,
}: {
  rooms: PanoRoom[];
  labels: PanoramaLabels;
  poster?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle');
  const [immersive, setImmersive] = useState(false);

  const current = rooms[active];

  const boot = useCallback(async () => {
    const mount = mountRef.current;
    const src = current?.panorama;
    if (!mount || !src) {
      setStatus('missing');
      return;
    }

    setStatus('loading');
    cleanupRef.current?.();

    // La présence des fichiers est résolue côté serveur (`available`).
    // On ne retombe sur une requête HEAD que si l'information manque.
    if (current?.available === false) {
      setStatus('missing');
      return;
    }
    if (current?.available === undefined) {
      try {
        const head = await fetch(src, { method: 'HEAD' });
        if (!head.ok) {
          setStatus('missing');
          return;
        }
      } catch {
        setStatus('missing');
        return;
      }
    }

    const THREE = await import('three');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 1100);
    camera.position.set(0, 0, 0.01);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1); // on regarde depuis l'intérieur

    const texture = await new THREE.TextureLoader().loadAsync(src);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
    scene.add(mesh);

    let lon = 0;
    let lat = 0;
    let dragging = false;
    let px = 0;
    let py = 0;
    let autoRotate = true;

    const onDown = (x: number, y: number) => {
      dragging = true;
      autoRotate = false;
      px = x;
      py = y;
    };
    const onMove = (x: number, y: number) => {
      if (!dragging) return;
      lon -= (x - px) * 0.16;
      lat += (y - py) * 0.16;
      px = x;
      py = y;
    };
    const onUp = () => {
      dragging = false;
    };

    const md = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const ts = (e: TouchEvent) => onDown(e.touches[0].clientX, e.touches[0].clientY);
    const tm = (e: TouchEvent) => {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.fov = Math.max(38, Math.min(88, camera.fov + e.deltaY * 0.04));
      camera.updateProjectionMatrix();
    };

    const el = renderer.domElement;
    el.addEventListener('mousedown', md);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: true });
    el.addEventListener('touchend', onUp);
    el.addEventListener('wheel', wheel, { passive: false });

    const resize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (autoRotate) lon += 0.035;
      lat = Math.max(-82, Math.min(82, lat));
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta),
      );
      renderer.render(scene, camera);
    };
    animate();
    setStatus('ready');

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('mousedown', md);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', ts);
      el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', onUp);
      el.removeEventListener('wheel', wheel);
      texture.dispose();
      geometry.dispose();
      renderer.dispose();
      el.remove();
    };
  }, [current]);

  useEffect(() => {
    boot();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [boot]);

  useEffect(() => {
    document.body.style.overflow = immersive ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [immersive]);

  return (
    <div className={immersive ? 'fixed inset-0 z-[120] flex flex-col bg-ink' : ''}>
      <div
        className={`relative overflow-hidden rounded-2xl bg-ink ${
          immersive ? 'flex-1 rounded-none' : 'aspect-[16/9]'
        }`}
      >
        <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {status !== 'ready' && (
          <div className="absolute inset-0 grid place-items-center bg-ink px-8 text-center">
            {poster && status === 'missing' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            )}
            <div className="relative">
              {status === 'loading' && <p className="text-[13px] text-white/60">{labels.loading}</p>}
              {status === 'missing' && (
                <>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/20 text-gold-300">
                    <IconSparkle className="h-5 w-5" />
                  </span>
                  <p className="mt-5 font-display text-[22px] font-light text-white">{labels.unavailableTitle}</p>
                  <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-white/45">
                    {labels.unavailableBody}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {status === 'ready' && (
          <>
            <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[11px] uppercase tracking-[0.2em] text-white/45">
              {labels.hint}
            </p>
            <button
              type="button"
              onClick={() => setImmersive((v) => !v)}
              className="absolute end-4 top-4 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur transition hover:border-gold-400 hover:text-gold-200"
            >
              {immersive ? labels.exit : labels.fullscreen}
            </button>
          </>
        )}

        {immersive && (
          <button
            type="button"
            onClick={() => setImmersive(false)}
            aria-label={labels.exit}
            className="absolute start-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white transition hover:border-gold-400"
          >
            <IconClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Sélecteur de pièce */}
      <div className={`no-scrollbar flex gap-2 overflow-x-auto ${immersive ? 'bg-ink px-4 py-4' : 'mt-4'}`}>
        {rooms.map((room, i) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setActive(i)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition ${
              i === active
                ? 'border-transparent bg-gold-gradient text-ink'
                : immersive
                  ? 'border-white/20 text-white/65 hover:border-gold-400 hover:text-gold-200'
                  : 'border-ink/12 bg-white text-ink/55 hover:border-gold-400 hover:text-gold-600'
            }`}
          >
            {room.label}
          </button>
        ))}
      </div>
    </div>
  );
}
