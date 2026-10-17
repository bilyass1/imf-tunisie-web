import type * as Three from 'three';
import type { Lot } from '@/lib/types';
import { LA_GLOIRE_FOOTPRINTS, LA_GLOIRE_SITE } from '@/lib/la-gloire-footprints';
import { GLOIRE_MODEL_BASE, gloireSalesPlan } from '@/lib/la-gloire-registration';

export const GLOIRE_STATUS_COLORS: Record<Lot['status'], string> = {
  available: '#2f9c6a', reserved: '#d6a02f', sold: '#dc4545', unconfirmed: '#9099a4',
};

/** Colour original architect surfaces, without extruding terraces or gardens. */
export function createGloireAvailability(THREE: typeof Three, lots: Lot[], origin: Three.Vector3, selectedRef?: string) {
  const tile = 512;
  const atlas = document.createElement('canvas');
  atlas.width = tile * 2; atlas.height = tile * 3;
  const ctx = atlas.getContext('2d', { willReadFrequently: true })!;
  const bounds = LA_GLOIRE_SITE.bounds;
  const width = bounds.maxX - bounds.minX, depth = bounds.maxY - bounds.minY;
  const byIndex: (Lot | undefined)[] = [undefined];
  const palette = new Uint8Array(256 * 4);
  for (const lot of lots) {
    const polygon = LA_GLOIRE_FOOTPRINTS[lot.ref];
    if (!polygon || lot.floor < 0 || lot.floor > 5) continue;
    const index = byIndex.length;
    if (index > 255) throw new Error('Too many apartments in the availability atlas.');
    byIndex.push(lot);
    ctx.save();
    ctx.beginPath(); ctx.rect((lot.floor % 2) * tile, Math.floor(lot.floor / 2) * tile, tile, tile); ctx.clip();
    ctx.translate((lot.floor % 2) * tile, Math.floor(lot.floor / 2) * tile);
    ctx.fillStyle = ctx.strokeStyle = `rgb(${index},0,0)`;
    ctx.lineWidth = 3; // About 16 cm: cover facade skins at the plan boundary.
    ctx.lineJoin = 'round';
    ctx.beginPath();
    polygon.forEach(([x, y], i) => {
      const px = (x - bounds.minX) / width * tile, py = (y - bounds.minY) / depth * tile;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    const color = new THREE.Color(lot.ref === selectedRef ? '#e3c77e' : GLOIRE_STATUS_COLORS[lot.status]);
    palette.set([Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255), 255], index * 4);
  }
  const pixels = ctx.getImageData(0, 0, atlas.width, atlas.height).data;
  const mask = new THREE.CanvasTexture(atlas);
  mask.flipY = false; mask.magFilter = mask.minFilter = THREE.NearestFilter; mask.generateMipmaps = false;
  const colors = new THREE.DataTexture(palette, 256, 1, THREE.RGBAFormat);
  colors.magFilter = colors.minFilter = THREE.NearestFilter; colors.needsUpdate = true;
  const [x0, y0] = gloireSalesPlan(0, 0), [x1, y1] = gloireSalesPlan(1, 1);
  const registration = new THREE.Vector4(x0, y0, x1 - x0, y1 - y0);
  function material(source: Three.MeshStandardMaterial) {
    const mat = source.clone();
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        availabilityMask: { value: mask }, availabilityColors: { value: colors },
        availabilityOrigin: { value: origin }, availabilityRegistration: { value: registration },
        availabilityBounds: { value: new THREE.Vector4(bounds.minX, bounds.minY, width, depth) },
      });
      shader.vertexShader = `varying vec3 availabilityWorld;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\navailabilityWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = `varying vec3 availabilityWorld;
uniform sampler2D availabilityMask;
uniform sampler2D availabilityColors;
uniform vec3 availabilityOrigin;
uniform vec4 availabilityRegistration;
uniform vec4 availabilityBounds;
${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
vec3 modelPoint = availabilityWorld - availabilityOrigin;
float level = floor((modelPoint.y - ${GLOIRE_MODEL_BASE}) / ${LA_GLOIRE_SITE.floorHeight});
vec2 plan = vec2(modelPoint.x, -modelPoint.z) * availabilityRegistration.zw + availabilityRegistration.xy;
vec2 planUV = (plan - availabilityBounds.xy) / availabilityBounds.zw;
if (level >= 0.0 && level < 6.0 && all(greaterThanEqual(planUV, vec2(0.0))) && all(lessThan(planUV, vec2(1.0)))) {
  vec2 atlasUV = (planUV + vec2(mod(level, 2.0), floor(level / 2.0))) / vec2(2.0, 3.0);
  vec4 region = texture2D(availabilityMask, atlasUV);
  float lotIndex = floor(region.r * 255.0 + 0.5);
  if (region.a > 0.99 && lotIndex > 0.0) {
    vec3 statusColor = texture2D(availabilityColors, vec2((lotIndex + 0.5) / 256.0, 0.5)).rgb;
    diffuseColor.rgb = mix(diffuseColor.rgb, statusColor, 0.82);
  }
}`);
    };
    mat.customProgramCacheKey = () => 'gloire-availability-v1';
    return mat;
  }
  function pick(point: Three.Vector3): Lot | null {
    const level = Math.floor((point.y - origin.y - GLOIRE_MODEL_BASE) / LA_GLOIRE_SITE.floorHeight);
    if (level < 0 || level > 5) return null;
    const [x, y] = gloireSalesPlan(point.x - origin.x, -(point.z - origin.z));
    const u = (x - bounds.minX) / width, v = (y - bounds.minY) / depth;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
    const px = Math.floor(u * tile) + (level % 2) * tile, py = Math.floor(v * tile) + Math.floor(level / 2) * tile;
    const offset = (py * atlas.width + px) * 4;
    return pixels[offset + 3] === 255 ? byIndex[pixels[offset]] ?? null : null;
  }
  return { material, pick, dispose: () => { mask.dispose(); colors.dispose(); } };
}
