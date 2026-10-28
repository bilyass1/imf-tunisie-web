import { publicAssetUrl } from '@/lib/public-asset-url';
import { warmModelBytes } from './model-runtime';

let started: Promise<void> | undefined;

async function warmDecoder(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(publicAssetUrl(path), {
      cache: 'force-cache', priority: 'low', signal: controller.signal,
    });
    if (!response.ok) throw new Error('Decoder unavailable');
    await response.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

/** No canvas, WebGL context, model parsing or animation is created here. */
export function warmGloire() {
  if (!started) started = Promise.allSettled([
    warmModelBytes('/models/la-gloire/la-gloire-web.glb', {timeoutMs: 120000}),
    warmModelBytes('/models/la-gloire/floor-plans.json', {maximumBytes: 2 * 1024 * 1024}),
    warmDecoder('/draco/draco_wasm_wrapper.js'),
    warmDecoder('/draco/draco_decoder.wasm'),
    import('./MaquetteSection'),
    import('./GloireArchitectMaquette'),
    import('three'),
    import('three/examples/jsm/controls/OrbitControls.js'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ]).then(() => {});
  return started;
}
