'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lot, Massing } from '@/lib/types';
import { useImmersiveViewer } from './useImmersiveViewer';
import ModelCompass, { updateModelCompass } from './ModelCompass';

export interface MaquetteLabels {
  title: string;
  hint: string;
  legend: Record<Lot['status'], string>;
  reset: string;
  loading: string;
  select: string;
  allFloors: string;
  floor: string;
  realistic: string;
  commercial: string;
  day: string; evening: string; aerial: string; street: string;
  fullscreen: string; exit: string; zoomIn: string; zoomOut: string;
  rotate: string; pause: string; error: string; retry: string; indicative: string;
}

const STATUS_COLORS: Record<Lot['status'], number> = {
  available: 0x2f9c6a,
  reserved: 0xd6a02f,
  sold: 0xdc4545,
  unconfirmed: 0x9099a4,
};

/* ------------------------------------------------------------------ */
/*  Textures procédurales — reprennent les matériaux des rendus IMF    */
/*  (bandeaux blancs, panneaux à lattes bois foncé, menuiserie noire)  */
/* ------------------------------------------------------------------ */

function facadeCanvas(): HTMLCanvasElement {
  const W = 256;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  // enduit blanc cassé, très légèrement nuagé — les baies et les lattes
  // sont modélisées en volume, plus en texture.
  g.fillStyle = '#F2EEE7';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i += 1) {
    const v = Math.random() * 0.05;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${v})`;
    g.fillRect(Math.random() * W, Math.random() * H, 3, 3);
  }
  return c;
}

function claustraCanvas(): HTMLCanvasElement {
  const W = 128;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2E211A';
  g.fillRect(0, 0, W, H);
  const n = 9;
  for (let i = 0; i < n; i += 1) {
    const x = (i / n) * W;
    const t = Math.random();
    g.fillStyle = t > 0.66 ? '#6B4B33' : t > 0.33 ? '#5A3E2A' : '#4C3423';
    g.fillRect(x + 1.5, 0, W / n - 3, H);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(x + 1.5, 0, 1.5, H);
  }
  return c;
}

function roadCanvas(): HTMLCanvasElement {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4B4C4E';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i += 1) {
    const v = Math.random() * 0.14;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${v})`;
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  // axe jaune discontinu
  g.fillStyle = '#C9A227';
  for (let y = 0; y < S; y += 96) g.fillRect(S / 2 - 4, y, 8, 56);
  return c;
}

function pavingCanvas(): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#E4E0D7';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(0,0,0,0.10)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i += 1) {
    g.beginPath();
    g.moveTo((i / 4) * S, 0);
    g.lineTo((i / 4) * S, S);
    g.moveTo(0, (i / 4) * S);
    g.lineTo(S, (i / 4) * S);
    g.stroke();
  }
  return c;
}

function groundCanvas(): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8C8D8B';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 3200; i += 1) {
    const v = Math.random() * 0.16;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${v})`;
    g.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5);
  }
  return c;
}

function lawnCanvas(): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6E8B4E';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i += 1) {
    const t = Math.random();
    g.fillStyle = t > 0.6 ? '#7E9C58' : t > 0.3 ? '#5F7C42' : '#87A462';
    g.fillRect(Math.random() * S, Math.random() * S, 2, 3);
  }
  return c;
}

/**
 * Maquette 3D conforme au plan d'architecte, rendue avec les matériaux des
 * perspectives du bureau d'études : enduit blanc, panneaux à lattes bois,
 * menuiserie anthracite, garde-corps verre, palmiers et sol paysager.
 *
 * Les volumes proviennent des EMPRISES RÉELLES relevées sur les plans de
 * repérage des fiches de vente (src/lib/la-gloire-footprints.ts).
 */
export default function Maquette3D({
  locale,
  lots,
  massing,
  labels,
  onSelect,
  selectedRef,
  initialMode = 'realistic',
  hideModeToggle = false,
}: {
  locale: string;
  lots: Lot[];
  massing: Massing;
  labels: MaquetteLabels;
  onSelect?: (ref: string) => void;
  selectedRef?: string;
  initialMode?: 'realistic' | 'commercial';
  hideModeToggle?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ reset: () => void; zoom: (step: number) => void; view: (name: 'aerial' | 'street') => void } | null>(null);
  const selectCb = useRef(onSelect);
  selectCb.current = onSelect;

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [lighting, setLighting] = useState<'day' | 'evening'>('day');
  const [rotating, setRotating] = useState(false);
  const lightingRef = useRef(lighting);
  lightingRef.current = lighting;
  const rotatingRef = useRef(rotating);
  rotatingRef.current = rotating;
  const close = useCallback(() => setImmersive(false), []);
  useImmersiveViewer(immersive, close, rootRef);
  const [hover, setHover] = useState<Lot | null>(null);
  const [maxFloor, setMaxFloor] = useState<number | 'all'>('all');
  const [mode, setMode] = useState<'realistic' | 'commercial'>(initialMode);

  const maxFloorRef = useRef<number | 'all'>('all');
  maxFloorRef.current = maxFloor;
  const modeRef = useRef<'realistic' | 'commercial'>(initialMode);
  modeRef.current = mode;

  const floors = useMemo(
    () => Array.from(new Set(lots.map((l) => l.floor))).sort((a, b) => a - b),
    [lots],
  );

  /** Emprises réelles si relevées, sinon barres générées par bloc. */
  const shapes = useMemo(() => {
    const withReal = lots.filter((l) => l.footprint && l.footprint.length >= 3);
    if (withReal.length > 0) {
      return withReal.map((lot) => ({ lot, poly: lot.footprint as [number, number][] }));
    }
    const bars = massing.fallbackBars ?? [{ id: lots[0]?.block ?? 'A', x: 0, z: 0 }];
    const depth = 10;
    const avg = lots.reduce((s, l) => s + (l.sellableArea ?? 60), 0) / Math.max(1, lots.length);
    const out: { lot: Lot; poly: [number, number][] }[] = [];
    bars.forEach((bar) => {
      const blockLots = lots.filter((l) => l.block === bar.id);
      const perFloor = new Map<number, Lot[]>();
      blockLots.forEach((l) => perFloor.set(l.floor, [...(perFloor.get(l.floor) ?? []), l]));
      perFloor.forEach((floorLots) => {
        const widths = floorLots.map((l) => ((l.sellableArea ?? avg) / avg) * 7);
        const total = widths.reduce((a, b) => a + b, 0);
        let cursor = -total / 2;
        floorLots.forEach((lot, i) => {
          const w = widths[i];
          const x0 = bar.x + cursor;
          const z0 = bar.z - depth / 2;
          out.push({
            lot,
            poly: [
              [x0, z0],
              [x0 + w - 0.35, z0],
              [x0 + w - 0.35, z0 + depth],
              [x0, z0 + depth],
            ],
          });
          cursor += w;
        });
      });
    });
    return out;
  }, [lots, massing]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || shapes.length === 0) return;
    let disposed = false;
    let cleanup = () => {};
    setReady(false);
    setFailed(false);

    (async () => {
      const THREE = await import('three');
      const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
      const { Sky } = await import('three/examples/jsm/objects/Sky.js');

      /**
       * Fusionne une liste de géométries en une seule.
       * La maquette comptait plus de 2 000 objets distincts (une baie, une
       * latte, un nez de balcon = un objet) : autant d'appels de dessin par
       * image. Tout ce qui est immobile est désormais fusionné par matériau,
       * ce qui ramène la scène à quelques dizaines d'appels.
       */
      type Geo = Parameters<typeof mergeGeometries>[0][number];
      const mergeInto = (
        geos: Geo[],
        mat: InstanceType<typeof THREE.Material>,
        cast: boolean,
        receive: boolean,
      ) => {
        if (geos.length === 0) return null;
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        if (!merged) return null;
        const m = new THREE.Mesh(merged, mat);
        m.castShadow = cast;
        m.receiveShadow = receive;
        return m;
      };
      if (disposed) return;

      const { bounds, floorHeight: fh, patio } = massing;
      const spanX = bounds.maxX - bounds.minX;
      const spanZ = bounds.maxY - bounds.minY;
      const span = Math.max(spanX, spanZ);
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cz = (bounds.minY + bounds.maxY) / 2;

      /* ---------------- Scène, ciel, rendu ---------------- */
      const scene = new THREE.Scene();

      const sky = new Sky();
      sky.scale.setScalar(span * 12);
      sky.material.uniforms.turbidity.value = 3.5;
      sky.material.uniforms.rayleigh.value = 1.5;
      sky.material.uniforms.mieCoefficient.value = .004;
      sky.material.uniforms.mieDirectionalG.value = .8;
      const sunDirection = new THREE.Vector3(1.1, .75, .8).normalize();
      sky.material.uniforms.sunPosition.value.copy(sunDirection);
      scene.add(sky);
      scene.fog = new THREE.Fog(0xd9e3e6, span * 2.4, span * 6);

      const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.5, span * 14);
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3200000 / Math.max(1, mount.clientWidth * mount.clientHeight)));
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // La scène ne bouge pas : la carte d'ombres n'est recalculée que lorsque
      // la coupe par étage ou le mode d'affichage change.
      // La scène est immobile : la carte d'ombres est calculée une fois, puis
      // seulement quand la coupe par étage ou le mode d'affichage change.
      // Cela supprime une passe de rendu complète à chaque image.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = .85;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
      // Also release partial setup if a graphics allocation fails.
      cleanup = () => { renderer.dispose(); renderer.domElement.remove(); };

      // Environnement : le ciel est pré-filtré une fois et sert de source de
      // reflets aux vitrages et aux garde-corps. C'est ce qui distingue une
      // maquette « plastique » d'un rendu d'architecte, pour un coût nul à
      // l'image (la texture est calculée une seule fois).
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const envSky = new Sky();
      envSky.scale.setScalar(100);
      envSky.material.uniforms = THREE.UniformsUtils.clone(sky.material.uniforms);
      envScene.add(envSky);
      let envRT = pmrem.fromScene(envScene, .04, .1, 200);
      scene.environment = envRT.texture;
      // dosage : le ciel sert surtout aux reflets, pas d'éclairage général —
      // sinon les façades à l'ombre s'éclaircissent et le volume disparaît
      scene.environmentIntensity = .55;

      /* ---------------- Lumière : soleil bas + ciel ---------------- */
      const hemisphere = new THREE.HemisphereLight(0xc4dcf2, 0x8c7964, .45);
      scene.add(hemisphere);
      const sun = new THREE.DirectionalLight(0xffeee0, 3.2);
      // soleil bas, comme sur la perspective de fin de journée : c'est
      // l'inclinaison qui donne le relief et les ombres portées longues
      sun.position.copy(sunDirection).multiplyScalar(span * 1.8);
      sun.castShadow = true;
      const shadowSize = mount.clientWidth >= 768 && renderer.capabilities.maxTextureSize >= 4096 ? 4096 : 2048;
      sun.shadow.mapSize.set(shadowSize, shadowSize);
      const d = span * .85;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.camera.far = span * 4;
      sun.shadow.bias = -.00015;
      sun.shadow.normalBias = .025;
      sun.shadow.radius = 3;
      sun.target.position.set(cx, 5, cz);
      scene.add(sun.target);
      scene.add(sun);
      const bounce = new THREE.DirectionalLight(0xcfe0f2, .35);
      bounce.position.set(-span * 0.7, span * 0.35, -span * 0.5);
      scene.add(bounce);

      /* ---------------- Matériaux ---------------- */
      const facadeTex = new THREE.CanvasTexture(facadeCanvas());
      facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
      facadeTex.repeat.set(1 / 4, 1 / 4);
      facadeTex.colorSpace = THREE.SRGBColorSpace;
      facadeTex.anisotropy = 8;

      const facadeMat = new THREE.MeshStandardMaterial({ map: facadeTex, bumpMap: facadeTex, bumpScale: .035, roughness: .86, metalness: 0, envMapIntensity: .75 });
      const plasterMat = new THREE.MeshStandardMaterial({ envMapIntensity: 0.3, color: 0xf6f3ee, roughness: 0.9 });
      const slabMat = new THREE.MeshStandardMaterial({ envMapIntensity: 0.3, color: 0xfbf9f5, roughness: 0.85 });
      const capMat = new THREE.MeshStandardMaterial({ envMapIntensity: 0.3, color: 0xf3efe9, roughness: 0.92 });

      const groundTex = new THREE.CanvasTexture(groundCanvas());
      groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
      groundTex.repeat.set(span / 4, span / 4);
      groundTex.colorSpace = THREE.SRGBColorSpace;

      /* ---------------- Terrain, voirie, clôture, cour ---------------- */
      const court = massing.courtyard;

      // asphalte général
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(span * 7, span * 7),
        new THREE.MeshStandardMaterial({ map: groundTex, color: 0xffffff, roughness: 1, envMapIntensity: 0.3 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(cx, -0.09, cz);
      ground.receiveShadow = true;
      scene.add(ground);

      // limites de la parcelle
      const plotX = spanX * 0.5 + 9;
      const plotZ = spanZ * 0.5 + 9;

      // chaussée sur les deux voies bordant la parcelle (cf. perspective d'angle)
      const roadTex = new THREE.CanvasTexture(roadCanvas());
      roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
      roadTex.colorSpace = THREE.SRGBColorSpace;
      const roadW = 12;
      const mkRoad = (w: number, h: number, x: number, z: number, rot: number, rep: [number, number]) => {
        const t = roadTex.clone();
        t.needsUpdate = true;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rep[0], rep[1]);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = rot;
        m.position.set(x, -0.06, z);
        m.receiveShadow = true;
        scene.add(m);
      };
      mkRoad(roadW, spanX + 60, cx, cz + plotZ + roadW / 2, Math.PI / 2, [1, (spanX + 60) / 14]);
      mkRoad(roadW, spanZ + 60, cx + plotX + roadW / 2, cz, 0, [1, (spanZ + 60) / 14]);

      // trottoir clair sur toute la parcelle
      const apron = new THREE.Mesh(
        new THREE.PlaneGeometry(plotX * 2, plotZ * 2),
        new THREE.MeshStandardMaterial({ color: 0xd9d3c7, roughness: 0.95 }),
      );
      apron.rotation.x = -Math.PI / 2;
      apron.position.set(cx, -0.05, cz);
      apron.receiveShadow = true;
      scene.add(apron);

      // pelouse périphérique
      const lawnTex = new THREE.CanvasTexture(lawnCanvas());
      lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping;
      lawnTex.repeat.set(spanX / 5, spanZ / 5);
      lawnTex.colorSpace = THREE.SRGBColorSpace;
      const lawnMat = new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1, envMapIntensity: 0.3 });
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(plotX * 1.86, plotZ * 1.86), lawnMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(cx, -0.03, cz);
      lawn.receiveShadow = true;
      scene.add(lawn);

      // mur de clôture bas + haie (comme sur les perspectives)
      const siteGroup = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xece7dd, roughness: 0.9, envMapIntensity: 0.3 });
      const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3d6b33, roughness: 1 });
      const fence = (w: number, d: number, x: number, z: number) => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(w, 1.15, d), wallMat);
        w1.position.set(x, 0.575, z);
        w1.castShadow = true;
        w1.receiveShadow = true;
        siteGroup.add(w1);
        const h = new THREE.Mesh(new THREE.BoxGeometry(w * 0.99, 0.95, d * 0.72), hedgeMat);
        h.position.set(x, 1.6, z);
        h.castShadow = true;
        siteGroup.add(h);
      };
      fence(plotX * 2, 0.5, cx, cz + plotZ);
      fence(plotX * 2, 0.5, cx, cz - plotZ);
      fence(0.5, plotZ * 2, cx + plotX, cz);
      fence(0.5, plotZ * 2, cx - plotX, cz);
      scene.add(siteGroup);

      // ---- cour intérieure paysagée ----
      const courtGroup = new THREE.Group();
      if (court) {
        const cw = court.maxX - court.minX;
        const cd = court.maxY - court.minY;
        const ccx = (court.minX + court.maxX) / 2;
        const ccz = (court.minY + court.maxY) / 2;

        const pavTex = new THREE.CanvasTexture(pavingCanvas());
        pavTex.wrapS = pavTex.wrapT = THREE.RepeatWrapping;
        pavTex.repeat.set(cw / 6, cd / 6);
        pavTex.colorSpace = THREE.SRGBColorSpace;
        const pav = new THREE.Mesh(
          new THREE.PlaneGeometry(cw, cd),
          new THREE.MeshStandardMaterial({ map: pavTex, roughness: 0.9 }),
        );
        pav.rotation.x = -Math.PI / 2;
        pav.position.set(ccx, 0.02, ccz);
        pav.receiveShadow = true;
        courtGroup.add(pav);

        // quatre carrés de pelouse laissant les allées diagonales libres
        const gt = lawnTex.clone();
        gt.needsUpdate = true;
        gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
        gt.repeat.set(2, 2);
        const gm = new THREE.MeshStandardMaterial({ map: gt, roughness: 1 });
        const qw = cw * 0.34;
        const qd = cd * 0.3;
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].forEach(([sx, sz]) => {
          const q = new THREE.Mesh(new THREE.PlaneGeometry(qw, qd), gm);
          q.rotation.x = -Math.PI / 2;
          q.position.set(ccx + sx * cw * 0.26, 0.36, ccz + sz * cd * 0.28);
          q.receiveShadow = true;
          courtGroup.add(q);
          const border = new THREE.Mesh(
            new THREE.BoxGeometry(qw + 0.5, 0.35, qd + 0.5),
            new THREE.MeshStandardMaterial({ color: 0xe8e3d8, roughness: 0.9 }),
          );
          border.position.set(ccx + sx * cw * 0.26, 0.17, ccz + sz * cd * 0.28);
          border.receiveShadow = true;
          courtGroup.add(border);
        });

        // fontaine centrale
        const basin = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.55, 4.2),
          new THREE.MeshStandardMaterial({ color: 0x2f3336, roughness: 0.5, metalness: 0.15 }),
        );
        basin.position.set(ccx, 0.28, ccz);
        basin.castShadow = true;
        basin.receiveShadow = true;
        courtGroup.add(basin);
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(3.5, 3.5),
          new THREE.MeshPhysicalMaterial({ color: 0x9fc4d6, roughness: 0.06, metalness: 0.1, transmission: 0.4, transparent: true, opacity: 0.85 }),
        );
        water.rotation.x = -Math.PI / 2;
        water.position.set(ccx, 0.57, ccz);
        courtGroup.add(water);

        // bancs le long des allées
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 });
        [-1, 1].forEach((sz) => {
          [-1, 1].forEach((sx) => {
            const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.6), benchMat);
            b.position.set(ccx + sx * cw * 0.16, 0.42, ccz + sz * cd * 0.16);
            b.castShadow = true;
            courtGroup.add(b);
          });
        });
      }
      scene.add(courtGroup);

      /* ---------------- Palmiers et massifs ---------------- */
      const palmGroup = new THREE.Group();
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b7358, roughness: 1, envMapIntensity: 0.3 });
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x35662c, roughness: 0.95, side: THREE.DoubleSide });
      const frondMat2 = new THREE.MeshStandardMaterial({ color: 0x467c37, roughness: 0.95, side: THREE.DoubleSide });
      const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3f6b34, roughness: 1, envMapIntensity: 0.3 });

      const trunkGeos: Geo[] = [];
      const frondGeos: Geo[] = [];
      const frond2Geos: Geo[] = [];
      const shrubGeos: Geo[] = [];
      const M = new THREE.Matrix4();
      const E = new THREE.Euler();
      const Q = new THREE.Quaternion();
      const V = new THREE.Vector3();
      const S = new THREE.Vector3(1, 1, 1);

      const bake = (
        geo: Geo,
        pos: [number, number, number],
        rot: [number, number, number],
        scale: [number, number, number],
        into: Geo[],
      ) => {
        E.set(rot[0], rot[1], rot[2]);
        Q.setFromEuler(E);
        V.set(pos[0], pos[1], pos[2]);
        S.set(scale[0], scale[1], scale[2]);
        M.compose(V, Q, S);
        geo.applyMatrix4(M);
        into.push(geo);
      };

      const makePalm = (x: number, z: number, h: number, seed: number) => {
        const lean = (seed % 0.12) - 0.06;
        bake(new THREE.CylinderGeometry(0.17, 0.3, h, 12), [x, h / 2, z], [0, 0, lean], [1, 1, 1], trunkGeos);
        const crowns: [number, number, number, Geo[]][] = [
          [8, 1.05, 2.9, frond2Geos],
          [9, 1.55, 3.4, frondGeos],
        ];
        crowns.forEach(([n, tilt, len, into], ci) => {
          for (let i = 0; i < n; i += 1) {
            const ry = (i / n) * Math.PI * 2 + seed + ci * 0.4;
            const y = h - ci * 0.18;
            // Curved rachis and separate tapered leaflets replace the solid cones.
            const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
            for (let j = 1; j < 16; j++) {
              const t = j / 16;
              const reach = t * len;
              const rise = Math.sin(t * Math.PI) * .55 - t * t * (ci ? 1.1 : .25);
              const width = Math.sin(t * Math.PI) * .65;
              for (const side of [-1, 1]) {
                const index = vertices.length / 3;
                vertices.push(reach - .12, rise, 0, reach + .2, rise, 0, reach + .25, rise - .16, side * width);
                uvs.push(0, t, .2, t, 1, t);
                indices.push(index, index + 1, index + 2);
              }
            }
            const leaf = new THREE.BufferGeometry();
            leaf.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            leaf.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            leaf.setIndex(indices); leaf.computeVertexNormals();
            bake(leaf, [x - Math.sin(lean) * h / 2, y, z], [0, ry, (1.3 - tilt) * .25], [1, 1, 1], into);
          }
        });
        bake(new THREE.SphereGeometry(0.34, 8, 6), [x, h, z], [0, 0, 0], [1, 1, 1], trunkGeos);
      };

      const makeShrub = (x: number, z: number, r: number) => {
        bake(new THREE.SphereGeometry(r, 8, 6), [x, r * 0.55, z], [0, 0, 0], [1, 0.7, 1], shrubGeos);
      };

      // alignements le long des clôtures, comme sur les perspectives
      const alongX = Math.max(6, Math.round((plotX * 2) / 9));
      const alongZ = Math.max(6, Math.round((plotZ * 2) / 9));
      for (let i = 0; i < alongX; i += 1) {
        const t = (i + 0.5) / alongX;
        const x = cx - plotX + t * plotX * 2;
        makePalm(x, cz + plotZ - 2.6, 6.6 + (i % 3) * 1.1, i * 0.9);
        makePalm(x, cz - plotZ + 2.6, 6.2 + ((i + 1) % 3) * 1.1, i * 1.3);
        makeShrub(x, cz + plotZ - 1.2, 0.7);
        makeShrub(x, cz - plotZ + 1.2, 0.7);
      }
      for (let i = 0; i < alongZ; i += 1) {
        const t = (i + 0.5) / alongZ;
        const z = cz - plotZ + t * plotZ * 2;
        makePalm(cx + plotX - 2.6, z, 6.4 + (i % 3) * 1.2, i * 0.6);
        makePalm(cx - plotX + 2.6, z, 6.0 + ((i + 2) % 3) * 1.2, i * 1.7);
        makeShrub(cx + plotX - 1.2, z, 0.7);
        makeShrub(cx - plotX + 1.2, z, 0.7);
      }
      if (court) {
        const ccx = (court.minX + court.maxX) / 2;
        const ccz = (court.minY + court.maxY) / 2;
        const cw = court.maxX - court.minX;
        const cd = court.maxY - court.minY;
        makePalm(ccx - cw * 0.3, ccz - cd * 0.24, 7.4, 0.5);
        makePalm(ccx + cw * 0.3, ccz + cd * 0.24, 8.0, 1.9);
        makePalm(ccx + cw * 0.32, ccz - cd * 0.26, 6.8, 2.7);
        makePalm(ccx - cw * 0.31, ccz + cd * 0.26, 7.1, 3.4);
        for (let i = 0; i < 10; i += 1) {
          const a = (i / 10) * Math.PI * 2;
          makeShrub(ccx + Math.cos(a) * cw * 0.38, ccz + Math.sin(a) * cd * 0.36, 0.6);
        }
      }
      [
        mergeInto(trunkGeos, trunkMat, true, false),
        mergeInto(frondGeos, frondMat, true, false),
        mergeInto(frond2Geos, frondMat2, true, false),
        mergeInto(shrubGeos, shrubMat, true, true),
      ].forEach((m) => m && palmGroup.add(m));

      scene.add(palmGroup);

      /* ---------------- Volumes : un appartement = une extrusion ---------------- */
      const slabH = 0.35;
      const bodyH = fh - slabH;

      const toShape = (poly: [number, number][]) => {
        const s = new THREE.Shape();
        poly.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, -y) : s.lineTo(x, -y)));
        s.closePath();
        return s;
      };

      const slabGeos = new Map<number, Geo[]>();
      const roofGeos: Geo[] = [];

      const topFloor = Math.max(...shapes.map((s) => s.lot.floor));

      /**
       * Les 102 logements étaient 102 objets à deux matériaux, soit plus de
       * 200 appels de dessin par image (le double avec la passe d'ombres).
       * Ils sont maintenant fusionnés en un objet par niveau ; le logement
       * survolé ou cliqué est retrouvé à partir de l'index de la face
       * touchée, et le logement sélectionné est dessiné à part.
       */
      type Range = { end: number; lot: Lot };
      const bodyGeoByFloor = new Map<number, Geo[]>();
      const rangesByFloor = new Map<number, Range[]>();
      const geoByRef = new Map<string, Geo>();
      const statusColor = new THREE.Color();

      shapes.forEach(({ lot, poly }) => {
        const shape = toShape(poly);
        const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: bodyH, bevelEnabled: false, curveSegments: 1 });
        bodyGeo.rotateX(-Math.PI / 2);
        bodyGeo.translate(0, lot.floor * fh + slabH, 0);
        bodyGeo.clearGroups();

        // couleur de disponibilité stockée par sommet : changer de mode revient
        // alors à changer un seul matériau, sans toucher à la géométrie.
        const count = bodyGeo.getAttribute('position').count;
        const colors = new Float32Array(count * 3);
        statusColor.setHex(STATUS_COLORS[lot.status]);
        for (let i = 0; i < count; i += 1) {
          colors[i * 3] = statusColor.r;
          colors[i * 3 + 1] = statusColor.g;
          colors[i * 3 + 2] = statusColor.b;
        }
        bodyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        geoByRef.set(lot.ref, bodyGeo.clone());

        const geos = bodyGeoByFloor.get(lot.floor) ?? [];
        const ranges = rangesByFloor.get(lot.floor) ?? [];
        const prev = ranges.length ? ranges[ranges.length - 1].end : 0;
        ranges.push({ end: prev + count / 3, lot });
        geos.push(bodyGeo);
        bodyGeoByFloor.set(lot.floor, geos);
        rangesByFloor.set(lot.floor, ranges);

        // nez de dalle — fusionné plus bas, un objet par niveau
        const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: slabH, bevelEnabled: false, curveSegments: 1 });
        slabGeo.rotateX(-Math.PI / 2);
        slabGeo.translate(0, lot.floor * fh, 0);
        (slabGeos.get(lot.floor) ?? slabGeos.set(lot.floor, []).get(lot.floor)!).push(slabGeo);

        // acrotère du dernier niveau
        if (lot.floor === topFloor) {
          const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false, curveSegments: 1 });
          roofGeo.rotateX(-Math.PI / 2);
          roofGeo.translate(0, (lot.floor + 1) * fh, 0);
          roofGeos.push(roofGeo);
        }
      });

      const statusMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.04 });
      const bodyByFloor = new Map<number, InstanceType<typeof THREE.Mesh>>();
      bodyGeoByFloor.forEach((geos, floor) => {
        const m = mergeInto(geos, facadeMat, true, true);
        if (!m) return;
        m.userData.floor = floor;
        bodyByFloor.set(floor, m);
        scene.add(m);
      });

      // logement sélectionné : un objet supplémentaire, dessiné par-dessus
      const selMat = new THREE.MeshStandardMaterial({
        color: 0xc9a24b,
        emissive: 0xe8d08a,
        emissiveIntensity: 0.4,
        roughness: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const selGeo = selectedRef ? geoByRef.get(selectedRef) : undefined;
      const selMesh = selGeo ? new THREE.Mesh(selGeo, selMat) : null;
      if (selMesh) {
        selMesh.userData.floor = shapes.find((sh) => sh.lot.ref === selectedRef)?.lot.floor ?? 0;
        selMesh.castShadow = true;
        scene.add(selMesh);
      }

      const lotAtFace = (floor: number, faceIndex: number): Lot | null => {
        const ranges = rangesByFloor.get(floor);
        if (!ranges) return null;
        for (let i = 0; i < ranges.length; i += 1) if (faceIndex < ranges[i].end) return ranges[i].lot;
        return null;
      };

      // un seul objet « dalles » par niveau, un seul objet « acrotère »
      const slabByFloor = new Map<number, InstanceType<typeof THREE.Mesh>>();
      slabGeos.forEach((geos, floor) => {
        const m = mergeInto(geos, slabMat, true, true);
        if (m) {
          slabByFloor.set(floor, m);
          scene.add(m);
        }
      });
      const roofMesh = mergeInto(roofGeos, plasterMat, true, true);
      if (roofMesh) scene.add(roofMesh);

      /* ---------------- Détail de façade relevé sur les perspectives ----------------
       * Baies anthracite, panneaux à lattes bois verticaux, nez de balcon,
       * garde-corps verre et corniche sombre — posés uniquement sur les
       * façades RÉELLEMENT extérieures de chaque niveau.
       */
      const inPoly = (poly: [number, number][], x: number, y: number) => {
        let hit = false;
        for (let a = 0, b = poly.length - 1; a < poly.length; b = a, a += 1) {
          const [xa, ya] = poly[a];
          const [xb, yb] = poly[b];
          if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
        }
        return hit;
      };

      const detailByFloor = new Map<number, InstanceType<typeof THREE.Group>>();
      const floorGroup = (f: number) => {
        let g = detailByFloor.get(f);
        if (!g) {
          g = new THREE.Group();
          scene.add(g);
          detailByFloor.set(f, g);
        }
        return g;
      };

      const claustraTex = new THREE.CanvasTexture(claustraCanvas());
      claustraTex.colorSpace = THREE.SRGBColorSpace;
      const claustraMat = new THREE.MeshStandardMaterial({ map: claustraTex, roughness: 0.8, envMapIntensity: 0.4 });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x597078,
        roughness: .12,
        metalness: .38,
        clearcoat: 1,
        clearcoatRoughness: .08,
        envMapIntensity: 1.8,
      });
      const interiorMat = new THREE.MeshStandardMaterial({ color: 0x8d8273, roughness: .6, emissive: 0xffc47a, emissiveIntensity: .12 });
      const revealMat = new THREE.MeshStandardMaterial({ color: 0x99978f, roughness: .95 });
      const lightMat = new THREE.MeshStandardMaterial({ color: 0xffe1ab, emissive: 0xffbf70, emissiveIntensity: .25, roughness: .4 });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x24292c, roughness: 0.45, metalness: 0.35, envMapIntensity: 1 });
      const corniceMat = new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.9 });
      const balconyMat = new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.85, envMapIntensity: 0.3 });
      const railGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbcd2dc,
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: .32,
        transmission: 0,
        depthWrite: false,
        envMapIntensity: 1.6,
        side: THREE.DoubleSide,
      });

      // Chaque élément de façade est une boîte transformée puis versée dans un
      // seau (niveau + matériau). Les seaux sont fusionnés à la fin.
      const bucket = new Map<number, Map<InstanceType<typeof THREE.Material>, Geo[]>>();
      const bm = new THREE.Matrix4();
      const bq = new THREE.Quaternion();
      const be = new THREE.Euler();
      const bv = new THREE.Vector3();
      const bs = new THREE.Vector3();

      const put = (
        floor: number,
        mat: InstanceType<typeof THREE.MeshStandardMaterial> | InstanceType<typeof THREE.MeshPhysicalMaterial>,
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        rot: number,
      ) => {
        const g = new THREE.BoxGeometry(1, 1, 1);
        be.set(0, rot, 0);
        bq.setFromEuler(be);
        bv.set(x, y, z);
        bs.set(w, h, d);
        bm.compose(bv, bq, bs);
        g.applyMatrix4(bm);
        let byMat = bucket.get(floor);
        if (!byMat) {
          byMat = new Map();
          bucket.set(floor, byMat);
        }
        const arr = byMat.get(mat);
        if (arr) arr.push(g);
        else byMat.set(mat, [g]);
      };

      const byFloor = new Map<number, [number, number][][]>();
      shapes.forEach(({ lot, poly }) => {
        const arr = byFloor.get(lot.floor) ?? [];
        arr.push(poly);
        byFloor.set(lot.floor, arr);
      });

      byFloor.forEach((polys, floor) => {
        const yBase = floor * fh;

        polys.forEach((poly) => {
          for (let a = 0; a < poly.length; a += 1) {
            const [x1, y1] = poly[a];
            const [x2, y2] = poly[(a + 1) % poly.length];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 2.6) continue;

            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            let nx = dy / len;
            let ny = -dx / len;
            if (inPoly(poly, mx + nx * 0.4, my + ny * 0.4)) {
              nx = -nx;
              ny = -ny;
            }
            // façade extérieure ? aucun autre logement du niveau derrière
            const ox = mx + nx * 0.9;
            const oy = my + ny * 0.9;
            if (polys.some((q) => q !== poly && inPoly(q, ox, oy))) continue;

            const rot = -Math.atan2(dy, dx);

            // nez de balcon + garde-corps verre
            if (len > 4.2) {
              put(floor, balconyMat, len, 0.3, 1.25, mx + nx * 0.5, yBase + 0.06, my + ny * 0.5, rot);
              if (floor > 0) {
                put(floor, railGlassMat, len - 0.3, 1.0, 0.06, mx + nx * 1.08, yBase + 0.72, my + ny * 1.08, rot);
                put(floor, frameMat, len - .2, .045, .055, mx + nx * 1.08, yBase + 1.24, my + ny * 1.08, rot);
                const posts = Math.ceil(len / 1.8);
                for (let p = 0; p <= posts; p++) {
                  const t = .12 / len + p / posts * (1 - .24 / len);
                  put(floor, frameMat, .035, 1.05, .06, x1 + dx * t + nx * 1.08, yBase + .72, y1 + dy * t + ny * 1.08, rot);
                }
              }
              put(floor, lightMat, len - .3, .025, .035, mx + nx * 1.1, yBase - .04, my + ny * 1.1, rot);
            }

            // travées : baie vitrée toutes les ~4,2 m
            const bays = Math.max(1, Math.floor(len / 4.2));
            for (let b = 0; b < bays; b += 1) {
              const t = (b + 0.5) / bays;
              const bxp = x1 + dx * t;
              const byp = y1 + dy * t;
              const bw = Math.min(2.75, (len / bays) * 0.56);
              const winHeight = 2.18;
              put(floor, revealMat, bw + .28, winHeight + .22, .16, bxp + nx * .04, yBase + 1.52, byp + ny * .04, rot);
              put(floor, frameMat, bw + .12, winHeight + .08, .19, bxp + nx * .13, yBase + 1.52, byp + ny * .13, rot);
              const lit = (b + a + floor) % 4 === 0;
              put(floor, lit ? interiorMat : glassMat, bw, winHeight, .04, bxp + nx * .25, yBase + 1.52, byp + ny * .25, rot);
              put(floor, frameMat, .045, winHeight, .06, bxp + nx * .28, yBase + 1.52, byp + ny * .28, rot);
              put(floor, slabMat, bw + .34, .08, .4, bxp + nx * .15, yBase + .39, byp + ny * .15, rot);
              if (lit) {
                for (let fold = 0; fold < 8; fold++) {
                  const offset = (fold / 7 - .5) * bw * .9;
                  put(floor, revealMat, .025, winHeight - .08, .025, bxp + nx * .28 + dx / len * offset, yBase + 1.52, byp + ny * .28 + dy / len * offset, rot);
                }
              }
            }

            // panneau à lattes bois (claustra) tous les ~9 m
            const slats = Math.max(0, bays - 1);
            for (let c = 0; c < slats; c += 1) {
              const t = (c + 1) / (slats + 1);
              const sx = x1 + dx * t;
              const sy = y1 + dy * t;
              put(floor, frameMat, 1.15, fh - .35, .1, sx + nx * .1, yBase + fh / 2 + .08, sy + ny * .1, rot);
              for (let slat = 0; slat < 9; slat++) {
                const offset = (slat - 4) * .12;
                put(floor, claustraMat, .05, fh - .35, .22, sx + nx * .23 + dx / len * offset, yBase + fh / 2 + .08, sy + ny * .23 + dy / len * offset, rot);
              }
            }

            // corniche sombre du dernier niveau + débord de toiture
            if (floor === topFloor) {
              put(floor, corniceMat, len + 0.2, 0.62, 0.42, mx + nx * 0.2, yBase + fh - 0.31, my + ny * 0.2, rot);
              put(floor, balconyMat, len + 0.3, 0.24, 0.95, mx + nx * 0.42, yBase + fh + 0.12, my + ny * 0.42, rot);
            }
          }
        });
      });

      /* ---------------- Contexte urbain ----------------
       * Sur la perspective du bureau d'études, l'immeuble n'est pas seul :
       * il est posé dans un quartier. Quelques volumes bas et des arbres
       * autour de la parcelle suffisent à donner l'échelle — le tout est
       * fusionné en trois objets, donc gratuit à l'affichage.
       */
      const ctxGroup = new THREE.Group();
      const ctxWallMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.95, envMapIntensity: 0.25 });
      const ctxRoofMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 1, envMapIntensity: 0.2 });
      const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6a5340, roughness: 1, envMapIntensity: 0.2 });
      const treeMat = new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 1, envMapIntensity: 0.25 });

      const ctxWallGeos: Geo[] = [];
      const ctxRoofGeos: Geo[] = [];
      const treeTrunkGeos: Geo[] = [];
      const treeGeos: Geo[] = [];

      // pseudo-aléatoire déterministe : la scène est identique à chaque visite
      let seed = 7;
      const rnd = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };

      const roadW2 = 12;
      const outer = Math.max(plotX, plotZ) + roadW2 + 4;
      for (let i = 0; i < 46; i += 1) {
        const a = (i / 46) * Math.PI * 2 + rnd() * 0.1;
        const r = outer + 6 + rnd() * 58;
        const bx = cx + Math.cos(a) * r;
        const bz = cz + Math.sin(a) * r;
        // on laisse la parcelle et les voies dégagées
        if (Math.abs(bx - cx) < plotX + roadW2 + 6 && Math.abs(bz - cz) < plotZ + roadW2 + 6) continue;
        const w = 8 + rnd() * 12;
        const dpt = 8 + rnd() * 12;
        const h = 4 + rnd() * 8;
        bake(new THREE.BoxGeometry(w, h, dpt), [bx, h / 2, bz], [0, rnd() * 0.6 - 0.3, 0], [1, 1, 1], ctxWallGeos);
        bake(new THREE.BoxGeometry(w * 0.98, 0.5, dpt * 0.98), [bx, h + 0.25, bz], [0, 0, 0], [1, 1, 1], ctxRoofGeos);
      }
      for (let i = 0; i < 60; i += 1) {
        const a = (i / 60) * Math.PI * 2 + rnd() * 0.12;
        const r = outer + 2 + rnd() * 60;
        const tx = cx + Math.cos(a) * r;
        const tz = cz + Math.sin(a) * r;
        if (Math.abs(tx - cx) < plotX + roadW2 && Math.abs(tz - cz) < plotZ + roadW2) continue;
        const th = 4 + rnd() * 4;
        bake(new THREE.CylinderGeometry(0.2, 0.32, th, 6), [tx, th / 2, tz], [0, 0, 0], [1, 1, 1], treeTrunkGeos);
        bake(new THREE.SphereGeometry(1.7 + rnd() * 1.1, 7, 5), [tx, th + 1.1, tz], [0, 0, 0], [1, 0.85, 1], treeGeos);
      }
      [
        mergeInto(ctxWallGeos, ctxWallMat, true, true),
        mergeInto(ctxRoofGeos, ctxRoofMat, true, true),
        mergeInto(treeTrunkGeos, treeTrunkMat, true, false),
        mergeInto(treeGeos, treeMat, true, false),
      ].forEach((m) => m && ctxGroup.add(m));

      // passage piéton à l'angle des deux voies
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.9, envMapIntensity: 0.2 });
      const stripeGeos: Geo[] = [];
      for (let i = 0; i < 7; i += 1) {
        bake(
          new THREE.BoxGeometry(0.7, 0.02, roadW2 * 0.7),
          [cx + plotX + roadW2 / 2 - 3.6 + i * 1.2, -0.04, cz + plotZ + roadW2 * 0.62],
          [0, 0, 0],
          [1, 1, 1],
          stripeGeos,
        );
      }
      const stripes = mergeInto(stripeGeos, stripeMat, false, true);
      if (stripes) ctxGroup.add(stripes);
      scene.add(ctxGroup);

      // volumes techniques en toiture
      const roofTop = (topFloor + 1) * fh + 0.28;
      const techMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d9, roughness: 0.95, envMapIntensity: 0.3 });
      [
        [-0.12, -0.06, 4.4, 2.6],
        [0.1, 0.14, 3.6, 2.4],
        [0.2, -0.16, 2.8, 2.2],
      ].forEach(([fx, fz, w, d]) => {
        put(topFloor, techMat, w, 1.9, d, cx + fx * spanX, roofTop + 0.95, cz + fz * spanZ, 0);
      });

      // Fusion des seaux : un objet par niveau et par matériau, au lieu d'un
      // objet par baie, par latte et par nez de balcon.
      const noShadow = new Set<InstanceType<typeof THREE.Material>>([glassMat, railGlassMat]);
      bucket.forEach((byMat, floor) => {
        const g = floorGroup(floor);
        byMat.forEach((geos, mat) => {
          const m = mergeInto(geos, mat, !noShadow.has(mat), !noShadow.has(mat));
          if (m) g.add(m);
        });
      });

      /* ---------------- Contrôles orbitaux ---------------- */
      const topY = (topFloor + 1) * fh;
      let theta = Math.PI * 0.24;
      let phi = Math.PI * 0.40;
      let radius = span * 1.55;
      const target = new THREE.Vector3(cx, topY * 0.42, cz);
      let dragging = false;
      let moved = false;
      let px = 0;
      let py = 0;
      let startX = 0, startY = 0;
      let dirty = true;
      let visible = true;

      const place = () => {
        const fittedRadius = radius / Math.min(1, camera.aspect);
        camera.position.set(
          target.x + fittedRadius * Math.sin(phi) * Math.sin(theta),
          Math.max(2, target.y + fittedRadius * Math.cos(phi)),
          target.z + fittedRadius * Math.sin(phi) * Math.cos(theta),
        );
        camera.lookAt(target);
        // Plan-repérage coordinates: x east, y south; this viewer maps y to world +z.
        updateModelCompass(camera, [0, -1], compassRef.current);
        dirty = true;
      };

      const el = renderer.domElement;
      el.tabIndex = 0;
      el.setAttribute('aria-label', labels.hint);
      el.style.touchAction = 'none';
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const pick = (clientX: number, clientY: number) => {
        const rect = el.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const targets = [...bodyByFloor.values()].filter((m) => m.visible);
        const hit = raycaster.intersectObjects(targets)[0];
        if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;
        return lotAtFace(hit.object.userData.floor as number, hit.faceIndex);
      };

      const down = (x: number, y: number) => {
        dragging = true;
        rotatingRef.current = false;
        setRotating(false);
        moved = false;
        px = x;
        py = y;
        startX = x; startY = y;
      };
      const move = (x: number, y: number) => {
        if (!dragging) return;
        if (Math.hypot(x - startX, y - startY) > 5) moved = true;
        theta -= (x - px) * 0.006;
        phi = Math.max(0.16, Math.min(1.46, phi - (y - py) * 0.005));
        px = x;
        py = y;
        place();
      };

      const pointers = new Map<number, { x: number; y: number }>();
      let pinchDistance = 0;
      const stop = () => { rotatingRef.current = false; setRotating(false); };
      const zoom = (step: number) => { stop(); radius = THREE.MathUtils.clamp(radius + span * step, span * .45, span * 3); place(); };
      const pd = (e: PointerEvent) => {
        el.setPointerCapture(e.pointerId); el.focus({ preventScroll: true });
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        down(e.clientX, e.clientY);
        if (pointers.size > 1) { moved = true; const [a, b] = [...pointers.values()]; pinchDistance = Math.hypot(a.x - b.x, a.y - b.y); }
      };
      const pm = (e: PointerEvent) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size > 1) {
          const [a, b] = [...pointers.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDistance) zoom((pinchDistance - distance) * .003);
          pinchDistance = distance; moved = true;
        } else move(e.clientX, e.clientY);
        if (!dragging && e.pointerType === 'mouse') {
          const lot = pick(e.clientX, e.clientY); setHover(previous => previous?.ref === lot?.ref ? previous : lot);
          el.style.cursor = lot ? 'pointer' : 'grab';
        }
      };
      const pu = (e: PointerEvent) => {
        if (dragging && !moved && pointers.size === 1 && e.type === 'pointerup') {
          const lot = pick(e.clientX, e.clientY);
          if (lot) selectCb.current?.(lot.ref);
        }
        pointers.delete(e.pointerId); pinchDistance = 0; dragging = pointers.size > 0;
        if (dragging) { const point = [...pointers.values()][0]; px = point.x; py = point.y; moved = true; }
      };
      const leave = () => { if (!dragging) setHover(null); };
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom(e.deltaY * .0016);
      };
      const key = (e: KeyboardEvent) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) return;
        e.preventDefault(); stop();
        if (e.key === 'ArrowLeft') theta -= .1;
        if (e.key === 'ArrowRight') theta += .1;
        if (e.key === 'ArrowUp') phi = Math.max(.16, phi - .08);
        if (e.key === 'ArrowDown') phi = Math.min(1.46, phi + .08);
        if (e.key === '+' || e.key === '=') zoom(-.12);
        if (e.key === '-') zoom(.12);
        if (e.key === 'Home') apiRef.current?.reset();
        place();
      };
      const contextLost = (e: Event) => { e.preventDefault(); setFailed(true); setReady(false); };
      el.addEventListener('pointerdown', pd);
      el.addEventListener('pointermove', pm);
      el.addEventListener('pointerup', pu);
      el.addEventListener('pointercancel', pu);
      el.addEventListener('lostpointercapture', pu);
      el.addEventListener('pointerleave', leave);
      el.addEventListener('wheel', wheel, { passive: false });
      el.addEventListener('keydown', key);
      el.addEventListener('webglcontextlost', contextLost);

      const resize = () => {
        if (!mount.clientWidth) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(pixelRatio());
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        place();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; });
      io.observe(mount);

      place();

      if (selMesh) {
        stop();
        selMesh.geometry.computeBoundingBox();
        const bb = selMesh.geometry.boundingBox!;
        target.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2 + fh * 0.2, (bb.min.z + bb.max.z) / 2);
        radius = span * 0.9;
        phi = Math.PI * 0.38;
        place();
      }

      let raf = 0;
      let previousTime = 0;

      /**
       * L'ancienne boucle réappliquait, 60 fois par seconde, la visibilité et
       * le matériau des 102 logements — un travail identique image après
       * image. L'état n'est désormais recalculé que lorsqu'il change vraiment
       * (mode d'affichage, coupe par étage, sélection).
       */
      let appliedMode = '';
      let appliedCap: number | 'all' | null = null;
      let appliedLighting = 'day';
      const applyLighting = (value: 'day' | 'evening') => {
        const evening = value === 'evening';
        sunDirection.set(1.1, evening ? .18 : .75, .8).normalize();
        sun.position.copy(sunDirection).multiplyScalar(span * 1.8);
        sky.material.uniforms.sunPosition.value.copy(sunDirection);
        envSky.material.uniforms.sunPosition.value.copy(sunDirection);
        const nextEnvironment = pmrem.fromScene(envScene, .04, .1, 200);
        scene.environment = nextEnvironment.texture;
        envRT.dispose(); envRT = nextEnvironment;
        sun.color.setHex(evening ? 0xffbf83 : 0xffeee0);
        sun.intensity = evening ? 2.4 : 3.2;
        hemisphere.intensity = evening ? .28 : .45;
        scene.environmentIntensity = evening ? .4 : .55;
        scene.fog!.color.setHex(evening ? 0xd8c1ae : 0xd9e3e6);
        renderer.toneMappingExposure = evening ? .9 : .85;
        interiorMat.emissiveIntensity = evening ? 1.8 : .12;
        lightMat.emissiveIntensity = evening ? 4 : .25;
        renderer.shadowMap.needsUpdate = true;
        dirty = true;
      };

      const applyState = (realistic: boolean, cap: number | 'all') => {
        palmGroup.visible = realistic;
        lawn.visible = realistic;
        siteGroup.visible = realistic;
        courtGroup.visible = realistic;
        ctxGroup.visible = realistic;
        if (roofMesh) roofMesh.visible = cap === 'all';
        detailByFloor.forEach((g, f) => {
          g.visible = realistic && (cap === 'all' || f <= cap);
        });
        slabByFloor.forEach((m, f) => {
          m.visible = realistic && (cap === 'all' || f <= cap);
        });
        bodyByFloor.forEach((m, f) => {
          m.visible = cap === 'all' || f <= cap;
          // en mode commercial, la couleur de disponibilité est portée par les
          // sommets : un seul matériau suffit pour les 102 logements
          m.material = realistic ? facadeMat : statusMat;
        });
        if (selMesh) selMesh.visible = cap === 'all' || (selMesh.userData.floor as number) <= cap;
        renderer.shadowMap.needsUpdate = true;
        dirty = true;
      };

      const animate = (time: number) => {
        raf = requestAnimationFrame(animate);
        const dt = Math.min((time - previousTime) / 1000, .05); previousTime = time;
        if (!visible || document.hidden) return;
        if (rotatingRef.current) {
          theta += dt * .06;
          place();
        }

        const cap = maxFloorRef.current;
        const mode = modeRef.current;
        if (mode !== appliedMode || cap !== appliedCap) {
          applyState(mode === 'realistic', cap);
          appliedMode = mode;
          appliedCap = cap;
        }

        if (lightingRef.current !== appliedLighting) { applyLighting(lightingRef.current); appliedLighting = lightingRef.current; }
        if (dirty) { renderer.render(scene, camera); dirty = false; }
      };
      raf = requestAnimationFrame(animate);
      setReady(true);

      apiRef.current = {
        reset: () => {
          theta = Math.PI * 0.24;
          phi = Math.PI * 0.4;
          radius = span * 1.55;
          target.set(cx, topY * 0.42, cz);
          stop();
          place();
        },
        zoom,
        view: (name) => {
          stop(); theta = Math.PI * .24;
          phi = name === 'aerial' ? Math.PI * .23 : Math.PI * .51;
          radius = span * (name === 'aerial' ? 1.65 : 1.45);
          target.set(cx, name === 'aerial' ? topY * .3 : topY * .28, cz);
          place();
        },
      };

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        el.removeEventListener('pointerdown', pd);
        el.removeEventListener('pointermove', pm);
        el.removeEventListener('pointerup', pu);
        el.removeEventListener('pointercancel', pu);
        el.removeEventListener('lostpointercapture', pu);
        el.removeEventListener('pointerleave', leave);
        el.removeEventListener('wheel', wheel);
        el.removeEventListener('keydown', key);
        el.removeEventListener('webglcontextlost', contextLost);
        const materials = new Set<InstanceType<typeof THREE.Material>>([facadeMat, statusMat, selMat, plasterMat, slabMat, capMat]);
        const textures = new Set<InstanceType<typeof THREE.Texture>>([facadeTex, groundTex, lawnTex, roadTex, claustraTex]);
        scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(mat => materials.add(mat));
        });
        materials.forEach(mat => { Object.values(mat).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }); mat.dispose(); });
        textures.forEach(texture => texture.dispose());
        geoByRef.forEach(geo => geo.dispose());
        envSky.geometry.dispose(); envSky.material.dispose(); sun.shadow.dispose();
        envRT.dispose();
        pmrem.dispose();
        renderer.dispose();
        el.remove();
        apiRef.current = null;
      };
    })().catch(() => { cleanup(); if (!disposed) { setReady(false); setFailed(true); } });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [shapes, massing, selectedRef, attempt, labels.hint]);

  return (
    <div ref={rootRef} role={immersive ? 'dialog' : undefined} aria-modal={immersive || undefined} aria-label={labels.title}
      className={immersive ? 'fixed inset-0 z-[120] flex flex-col bg-ink p-2 sm:p-4' : 'viewer-shell overflow-hidden rounded-2xl bg-ink'}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-5">
        <div className="flex items-center gap-1" aria-label={labels.title}>
          {!hideModeToggle && (['realistic', 'commercial'] as const).map(value => <button key={value} type="button" className="viewer-control" aria-pressed={mode === value} onClick={() => setMode(value)}>{labels[value]}</button>)}
          {hideModeToggle && <span className="px-2 text-xs uppercase tracking-[.18em] text-gold-300">{labels.commercial}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="viewer-control" aria-label={immersive ? labels.exit : labels.fullscreen} onClick={() => setImmersive(v => !v)}><span aria-hidden="true" className="text-xl">{immersive ? '×' : '⛶'}</span><span className="hidden sm:inline">{immersive ? labels.exit : labels.fullscreen}</span></button>
        </div>
      </div>
      <div className={`relative ${immersive ? 'min-h-0 flex-1' : ''}`}>
      <div ref={mountRef} className={immersive ? 'h-full w-full' : 'h-[520px] w-full sm:h-[650px]'} />
      <ModelCompass locale={locale} needleRef={compassRef} className="end-3 top-3 sm:end-5 sm:top-5" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink">
          <div className="max-w-sm px-5 text-center"><p className="text-base text-white/70">{failed ? labels.error : labels.loading}</p>{failed && <button type="button" className="btn-gold mt-5" onClick={() => setAttempt(v => v + 1)}>{labels.retry}</button>}</div>
        </div>
      )}

      {/* Mode d'affichage */}
      <div className="viewer-glass absolute start-3 top-3 flex rounded-full p-1 sm:start-5 sm:top-5">
        {(['day', 'evening'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setLighting(m)}
            className="viewer-control"
            aria-pressed={lighting === m}
          >
            {labels[m]}
          </button>
        ))}
      </div>

      {/* Légende — seulement en mode commercial */}
      {mode === 'commercial' && (
        <div className="viewer-glass pointer-events-none absolute start-3 top-20 flex flex-col gap-2 rounded-xl px-4 py-3">
          {(['available', 'reserved', 'sold', 'unconfirmed'] as const).map((s) => (
            <span key={s} className="flex items-center gap-2 text-sm text-white/85">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: `#${STATUS_COLORS[s].toString(16).padStart(6, '0')}` }}
              />
              {labels.legend[s]}
            </span>
          ))}
        </div>
      )}

      {/* Coupe par étage + recentrage */}
      <div className="no-scrollbar absolute bottom-24 end-3 top-24 flex flex-col items-end gap-2 overflow-y-auto sm:end-5 sm:top-28">
        <div className="viewer-glass flex flex-col gap-1 rounded-2xl p-1" aria-label={labels.floor}>
          <button
            type="button"
            onClick={() => setMaxFloor('all')}
            className="viewer-control" aria-pressed={maxFloor === 'all'}
          >
            {labels.allFloors}
          </button>
          {[...floors].reverse().map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setMaxFloor(f)}
              className="viewer-control" aria-pressed={maxFloor === f} aria-label={`${labels.floor} ${f}`}
            >
              {f === 0 ? 'R' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Infobulle */}
      <div className="pointer-events-none absolute bottom-24 start-4 flex items-end gap-4">
        {hover && (
          <div className="rounded-xl bg-black/60 px-4 py-3 text-end backdrop-blur">
            <p className="font-display text-[20px] leading-none text-white">{hover.code}</p>
            <p className="mt-1.5 text-sm text-white/80">
              {hover.typology}
              {hover.sellableArea ? ` · ${hover.sellableArea.toFixed(2)} m²` : ''}
            </p>
          </div>
        )}
      </div>
      <div className="viewer-glass absolute bottom-5 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full p-1" dir="ltr">
        <button type="button" className="viewer-control w-11 text-xl" aria-label={labels.zoomOut} title={labels.zoomOut} onClick={() => apiRef.current?.zoom(.12)}>−</button>
        <button type="button" className="viewer-control w-11 text-xl" aria-label={labels.zoomIn} title={labels.zoomIn} onClick={() => apiRef.current?.zoom(-.12)}>+</button>
        <span className="h-5 w-px bg-white/20" />
        <button type="button" className="viewer-control" onClick={() => { setMaxFloor('all'); apiRef.current?.reset(); }}>{labels.reset}</button>
        <button type="button" className="viewer-control w-11" aria-label={rotating ? labels.pause : labels.rotate} title={rotating ? labels.pause : labels.rotate} aria-pressed={rotating} onClick={() => setRotating(v => !v)}>{rotating ? 'Ⅱ' : '▷'}</button>
      </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="viewer-control border border-white/15" onClick={() => apiRef.current?.view('aerial')}>{labels.aerial}</button>
          <button type="button" className="viewer-control border border-white/15" onClick={() => apiRef.current?.view('street')}>{labels.street}</button>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-white/55">{labels.hint}</p>
      </div>
      <p className="border-t border-white/5 px-5 py-2 text-xs text-white/40">{labels.indicative}</p>
    </div>
  );
}
