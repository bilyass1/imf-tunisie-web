'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lot, Massing } from '@/lib/types';

export interface MaquetteLabels {
  title: string;
  hint: string;
  legend: { available: string; reserved: string; sold: string };
  reset: string;
  loading: string;
  select: string;
  allFloors: string;
  floor: string;
  realistic: string;
  commercial: string;
}

const STATUS_COLORS: Record<Lot['status'], number> = {
  available: 0x2f9c6a,
  reserved: 0xd6a02f,
  sold: 0x8d8d94,
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
  lots,
  massing,
  labels,
  onSelect,
  selectedRef,
}: {
  lots: Lot[];
  massing: Massing;
  labels: MaquetteLabels;
  onSelect?: (ref: string) => void;
  selectedRef?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ reset: () => void } | null>(null);
  const selectCb = useRef(onSelect);
  selectCb.current = onSelect;

  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<Lot | null>(null);
  const [maxFloor, setMaxFloor] = useState<number | 'all'>('all');
  const [mode, setMode] = useState<'realistic' | 'commercial'>('realistic');

  const maxFloorRef = useRef<number | 'all'>('all');
  maxFloorRef.current = maxFloor;
  const modeRef = useRef<'realistic' | 'commercial'>('realistic');
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

    (async () => {
      const THREE = await import('three');
      const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

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

      // ciel dégradé (bleu zénith → horizon chaud), comme les perspectives
      const skyGeo = new THREE.SphereGeometry(span * 6, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(0x4d84c4) },
          mid: { value: new THREE.Color(0xbfd8ee) },
          bot: { value: new THREE.Color(0xffd9a6) },
        },
        vertexShader: `varying float h; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); h = normalize(wp.xyz).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying float h;
          void main(){ float t = clamp(h,-1.0,1.0);
            vec3 c = t > 0.0 ? mix(mid, top, pow(t,0.65)) : mix(mid, bot, pow(-t,0.5));
            gl_FragColor = vec4(c,1.0); }`,
      });
      scene.add(new THREE.Mesh(skyGeo, skyMat));
      scene.fog = new THREE.Fog(0xf0e2cd, span * 3.0, span * 7.5);

      const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.5, span * 14);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
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
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      // Environnement : le ciel est pré-filtré une fois et sert de source de
      // reflets aux vitrages et aux garde-corps. C'est ce qui distingue une
      // maquette « plastique » d'un rendu d'architecte, pour un coût nul à
      // l'image (la texture est calculée une seule fois).
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const envSky = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), skyMat.clone());
      envScene.add(envSky);
      const envRT = pmrem.fromScene(envScene, 0, 0.1, 60);
      scene.environment = envRT.texture;
      // dosage : le ciel sert surtout aux reflets, pas d'éclairage général —
      // sinon les façades à l'ombre s'éclaircissent et le volume disparaît
      scene.environmentIntensity = 0.16;
      envSky.geometry.dispose();

      /* ---------------- Lumière : soleil bas + ciel ---------------- */
      scene.add(new THREE.HemisphereLight(0xa9c9e8, 0x7a6a52, 0.18));
      const sun = new THREE.DirectionalLight(0xffe2bd, 4.1);
      // soleil bas, comme sur la perspective de fin de journée : c'est
      // l'inclinaison qui donne le relief et les ombres portées longues
      sun.position.set(span * 1.15, span * 0.42, span * 0.85);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const d = span * 1.15;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.camera.far = span * 4;
      sun.shadow.bias = -0.0006;
      sun.shadow.normalBias = 0.05;
      scene.add(sun);
      const bounce = new THREE.DirectionalLight(0xcfe0f2, 0.10);
      bounce.position.set(-span * 0.7, span * 0.35, -span * 0.5);
      scene.add(bounce);

      /* ---------------- Matériaux ---------------- */
      const facadeTex = new THREE.CanvasTexture(facadeCanvas());
      facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
      facadeTex.repeat.set(1 / 4, 1 / 4);
      facadeTex.colorSpace = THREE.SRGBColorSpace;
      facadeTex.anisotropy = 8;

      const facadeMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.8, metalness: 0.03, envMapIntensity: 0.55 });
      const plasterMat = new THREE.MeshStandardMaterial({ envMapIntensity: 0.3, color: 0xf6f3ee, roughness: 0.9 });
      const slabMat = new THREE.MeshStandardMaterial({ envMapIntensity: 0.3, color: 0xfbf9f5, roughness: 0.85 });
      const capMat = new THREE.MeshStandardMaterial({ envMapIntensity: 0.3, color: 0xf3efe9, roughness: 0.92 });

      const groundTex = new THREE.CanvasTexture(groundCanvas());
      groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
      groundTex.repeat.set(span / 4, span / 4);

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
      mkRoad(spanX + 60, roadW, cx, cz + plotZ + roadW / 2, Math.PI / 2, [1, (spanX + 60) / 14]);
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
          q.position.set(ccx + sx * cw * 0.26, 0.05, ccz + sz * cd * 0.28);
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
        bake(new THREE.CylinderGeometry(0.17, 0.3, h, 8), [x, h / 2, z], [0, 0, lean], [1, 1, 1], trunkGeos);
        const crowns: [number, number, number, Geo[]][] = [
          [8, 1.05, 2.9, frond2Geos],
          [9, 1.55, 3.4, frondGeos],
        ];
        crowns.forEach(([n, tilt, len, into], ci) => {
          for (let i = 0; i < n; i += 1) {
            const ry = (i / n) * Math.PI * 2 + seed + ci * 0.4;
            const y = h - ci * 0.18;
            // position du centre de la palme, une fois inclinée puis pivotée
            const r = (len / 2 - 0.15) * Math.sin(tilt);
            const dy = (len / 2 - 0.15) * Math.cos(tilt);
            bake(
              new THREE.ConeGeometry(0.5, len, 4, 1, true),
              [x + Math.cos(ry) * r, y + dy, z - Math.sin(ry) * r],
              [0, ry, tilt],
              [1, 1, 0.28],
              into,
            );
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
      const slabH = 0.34;
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
        statusColor.setHex(STATUS_COLORS[lot.status]).convertSRGBToLinear();
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
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x171d21,
        roughness: 0.06,
        metalness: 0.7,
        envMapIntensity: 2.2,
        emissive: 0x4a3312,
        emissiveIntensity: 0.22,
      });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x24292c, roughness: 0.45, metalness: 0.35, envMapIntensity: 1 });
      const corniceMat = new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.9 });
      const balconyMat = new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.85, envMapIntensity: 0.3 });
      const railGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbcd2dc,
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: 0.26,
        transmission: 0.65,
        envMapIntensity: 4,
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
              }
            }

            // travées : baie vitrée toutes les ~4,2 m
            const bays = Math.max(1, Math.floor(len / 4.2));
            for (let b = 0; b < bays; b += 1) {
              const t = (b + 0.5) / bays;
              const bxp = x1 + dx * t;
              const byp = y1 + dy * t;
              const bw = Math.min(2.75, (len / bays) * 0.56);
              put(floor, frameMat, bw + 0.16, 1.62, 0.14, bxp + nx * 0.03, yBase + 1.68, byp + ny * 0.03, rot);
              put(floor, glassMat, bw, 1.44, 0.09, bxp + nx * 0.09, yBase + 1.68, byp + ny * 0.09, rot);
            }

            // panneau à lattes bois (claustra) tous les ~9 m
            const slats = Math.max(0, Math.floor((len - 2.5) / 6));
            for (let c = 0; c < slats; c += 1) {
              const t = (c + 1) / (slats + 1);
              const sx = x1 + dx * t;
              const sy = y1 + dy * t;
              put(floor, claustraMat, 1.35, fh - 0.3, 0.26, sx + nx * 0.16, yBase + fh / 2 + 0.08, sy + ny * 0.16, rot);
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
      let auto = true;
      let dragging = false;
      let moved = false;
      let px = 0;
      let py = 0;

      const place = () => {
        camera.position.set(
          target.x + radius * Math.sin(phi) * Math.sin(theta),
          Math.max(2, target.y + radius * Math.cos(phi)),
          target.z + radius * Math.sin(phi) * Math.cos(theta),
        );
        camera.lookAt(target);
      };

      const el = renderer.domElement;
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
        auto = false;
        moved = false;
        px = x;
        py = y;
      };
      const move = (x: number, y: number) => {
        if (!dragging) return;
        if (Math.abs(x - px) + Math.abs(y - py) > 3) moved = true;
        theta -= (x - px) * 0.006;
        phi = Math.max(0.16, Math.min(1.46, phi - (y - py) * 0.005));
        px = x;
        py = y;
        place();
      };

      const md = (e: MouseEvent) => down(e.clientX, e.clientY);
      const mm = (e: MouseEvent) => {
        move(e.clientX, e.clientY);
        const lot = pick(e.clientX, e.clientY);
        setHover(lot);
        el.style.cursor = lot ? 'pointer' : dragging ? 'grabbing' : 'grab';
      };
      const mu = (e: MouseEvent) => {
        if (dragging && !moved) {
          const lot = pick(e.clientX, e.clientY);
          if (lot) selectCb.current?.(lot.ref);
        }
        dragging = false;
      };
      const ts = (e: TouchEvent) => down(e.touches[0].clientX, e.touches[0].clientY);
      const tm = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY);
      const tu = () => {
        dragging = false;
      };
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        auto = false;
        radius = Math.max(span * 0.45, Math.min(span * 3, radius + e.deltaY * span * 0.0016));
        place();
      };

      el.addEventListener('mousedown', md);
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
      el.addEventListener('touchstart', ts, { passive: true });
      el.addEventListener('touchmove', tm, { passive: true });
      el.addEventListener('touchend', tu);
      el.addEventListener('wheel', wheel, { passive: false });

      const resize = () => {
        if (!mount.clientWidth) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      place();

      if (selMesh) {
        auto = false;
        selMesh.geometry.computeBoundingBox();
        const bb = selMesh.geometry.boundingBox!;
        target.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2 + fh * 0.2, (bb.min.z + bb.max.z) / 2);
        radius = span * 0.9;
        phi = Math.PI * 0.38;
        place();
      }

      let raf = 0;
      const clock = new THREE.Clock();

      /**
       * L'ancienne boucle réappliquait, 60 fois par seconde, la visibilité et
       * le matériau des 102 logements — un travail identique image après
       * image. L'état n'est désormais recalculé que lorsqu'il change vraiment
       * (mode d'affichage, coupe par étage, sélection).
       */
      let appliedMode = '';
      let appliedCap: number | 'all' | null = null;

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
      };

      const animate = () => {
        raf = requestAnimationFrame(animate);
        if (auto) {
          theta += 0.0013;
          place();
        }

        const cap = maxFloorRef.current;
        const mode = modeRef.current;
        if (mode !== appliedMode || cap !== appliedCap) {
          applyState(mode === 'realistic', cap);
          appliedMode = mode;
          appliedCap = cap;
        }

        // seule la pulsation du logement sélectionné bouge à chaque image
        if (selMesh && selMesh.visible) {
          selMat.emissiveIntensity = 0.42 + Math.sin(clock.getElapsedTime() * 2.6) * 0.22;
        }

        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      apiRef.current = {
        reset: () => {
          theta = Math.PI * 0.24;
          phi = Math.PI * 0.4;
          radius = span * 1.55;
          target.set(cx, topY * 0.42, cz);
          auto = true;
          place();
        },
      };

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener('mousedown', md);
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        el.removeEventListener('touchstart', ts);
        el.removeEventListener('touchmove', tm);
        el.removeEventListener('touchend', tu);
        el.removeEventListener('wheel', wheel);
        facadeTex.dispose();
        groundTex.dispose();
        lawnTex.dispose();
        roadTex.dispose();
        claustraTex.dispose();
        envRT.dispose();
        pmrem.dispose();
        renderer.dispose();
        el.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [shapes, massing, selectedRef]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink">
      <div ref={mountRef} className="h-[480px] w-full sm:h-[600px]" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink">
          <p className="text-[13px] text-white/50">{labels.loading}</p>
        </div>
      )}

      {/* Mode d'affichage */}
      <div className="absolute start-4 top-4 flex rounded-full bg-black/45 p-1 backdrop-blur">
        {(['realistic', 'commercial'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              mode === m ? 'bg-gold-gradient text-ink' : 'text-white/60 hover:text-gold-200'
            }`}
          >
            {m === 'realistic' ? labels.realistic : labels.commercial}
          </button>
        ))}
      </div>

      {/* Légende — seulement en mode commercial */}
      {mode === 'commercial' && (
        <div className="pointer-events-none absolute start-4 top-16 flex flex-col gap-2 rounded-xl bg-black/45 px-4 py-3 backdrop-blur">
          {(['available', 'reserved', 'sold'] as const).map((s) => (
            <span key={s} className="flex items-center gap-2 text-[11px] text-white/70">
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
      <div className="absolute end-4 top-4 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => apiRef.current?.reset()}
          className="rounded-full border border-white/25 bg-black/35 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur transition hover:border-gold-400 hover:text-gold-200"
        >
          {labels.reset}
        </button>

        <div className="flex flex-wrap justify-end gap-1 rounded-xl bg-black/40 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setMaxFloor('all')}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
              maxFloor === 'all' ? 'bg-gold-gradient text-ink' : 'text-white/60 hover:text-gold-200'
            }`}
          >
            {labels.allFloors}
          </button>
          {[...floors].reverse().map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setMaxFloor(f)}
              className={`w-8 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                maxFloor === f ? 'bg-gold-gradient text-ink' : 'text-white/60 hover:text-gold-200'
              }`}
            >
              {f === 0 ? 'R' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Infobulle */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 drop-shadow">{labels.hint}</p>
        {hover && (
          <div className="rounded-xl bg-black/60 px-4 py-3 text-end backdrop-blur">
            <p className="font-display text-[20px] leading-none text-white">{hover.code}</p>
            <p className="mt-1.5 text-[11.5px] text-white/55">
              {hover.typology}
              {hover.sellableArea ? ` · ${hover.sellableArea.toFixed(2)} m²` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
