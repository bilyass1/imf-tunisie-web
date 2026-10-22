import type * as Three from 'three';
import type { Lot } from '@/lib/types';
import { LA_GLOIRE_SITE } from '@/lib/la-gloire-footprints';
import { GLOIRE_MODEL_BASE, GLOIRE_ROOF_ALLOWANCE, gloireFloorAtHeight, gloireSalesPlan } from '@/lib/la-gloire-registration';
import { gloireAvailabilityAtlas, gloireLotAtPlanPoint } from '@/lib/gloire-picking';

export const GLOIRE_STATUS_COLORS: Record<Lot['status'], string> = {
  available: '#2f9c6a', reserved: '#d6a02f', sold: '#dc4545', unconfirmed: '#9099a4',
};

/** Visible surfaces, colours and hit testing share the same model/plan transform. */
export function createGloireAvailability(THREE: typeof Three, lots: Lot[], modelToWorld: Three.Matrix4, selectedRef?: string) {
  const atlas = gloireAvailabilityAtlas(lots);
  const bounds = LA_GLOIRE_SITE.bounds;
  const width = bounds.maxX - bounds.minX, depth = bounds.maxY - bounds.minY;
  const palette = new Uint8Array(256 * 4);
  atlas.byIndex.forEach((lot, index) => {
    if (!lot) return;
    const color = new THREE.Color(lot.ref === selectedRef ? '#e3c77e' : GLOIRE_STATUS_COLORS[lot.status]);
    palette.set([Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255), 255], index * 4);
  });
  const mask = new THREE.DataTexture(atlas.data, atlas.width, atlas.height, THREE.RGBAFormat);
  mask.magFilter = mask.minFilter = THREE.NearestFilter; mask.generateMipmaps = false; mask.needsUpdate = true;
  const colors = new THREE.DataTexture(palette, 256, 1, THREE.RGBAFormat);
  colors.magFilter = colors.minFilter = THREE.NearestFilter; colors.needsUpdate = true;
  const worldToModel = modelToWorld.clone().invert();
  const [x0, y0] = gloireSalesPlan(0, 0), [x1, y1] = gloireSalesPlan(1, 1);
  let maxFloor: number | 'all' = 'all';
  const limit = { value: 5 }, roof = { value: GLOIRE_ROOF_ALLOWANCE };
  const materials = new Map<Three.MeshStandardMaterial, Three.MeshStandardMaterial>();
  function material(source: Three.MeshStandardMaterial) {
    const cached = materials.get(source);
    if (cached) return cached;
    const mat = source.clone();
    materials.set(source, mat);
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        availabilityMask: { value: mask }, availabilityColors: { value: colors },
        availabilityWorldToModel: { value: worldToModel },
        availabilityRegistration: { value: new THREE.Vector4(x0, y0, x1 - x0, y1 - y0) },
        availabilityBounds: { value: new THREE.Vector4(bounds.minX, bounds.minY, width, depth) },
        availabilityMaxFloor: limit, availabilityRoofAllowance: roof,
      });
      shader.vertexShader = `varying vec3 availabilityWorld;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\navailabilityWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = `varying vec3 availabilityWorld;
uniform sampler2D availabilityMask;
uniform sampler2D availabilityColors;
uniform mat4 availabilityWorldToModel;
uniform vec4 availabilityRegistration;
uniform vec4 availabilityBounds;
uniform float availabilityMaxFloor;
uniform float availabilityRoofAllowance;
${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
vec3 modelPoint = (availabilityWorldToModel * vec4(availabilityWorld, 1.0)).xyz;
float level = min(availabilityMaxFloor, max(0.0, floor((modelPoint.z - ${GLOIRE_MODEL_BASE}) / ${LA_GLOIRE_SITE.floorHeight})));
vec2 plan = modelPoint.xy * availabilityRegistration.zw + availabilityRegistration.xy;
vec2 planUV = (plan - availabilityBounds.xy) / availabilityBounds.zw;
float ceiling = ${GLOIRE_MODEL_BASE} + (availabilityMaxFloor + 1.0) * ${LA_GLOIRE_SITE.floorHeight} + availabilityRoofAllowance;
if (modelPoint.z >= ${GLOIRE_MODEL_BASE - .001} && modelPoint.z <= ceiling && all(greaterThanEqual(planUV, vec2(0.0))) && all(lessThan(planUV, vec2(1.0)))) {
  vec2 atlasUV = (planUV + vec2(mod(level, 2.0), floor(level / 2.0))) / vec2(2.0, 3.0);
  vec4 region = texture2D(availabilityMask, atlasUV);
  float lotIndex = floor(region.r * 255.0 + 0.5);
  if (region.a > 0.99 && lotIndex > 0.0) {
    vec3 statusColor = texture2D(availabilityColors, vec2((lotIndex + 0.5) / 256.0, 0.5)).rgb;
    diffuseColor.rgb = mix(diffuseColor.rgb, statusColor, 0.82);
  }
}`);
    };
    mat.customProgramCacheKey = () => 'gloire-availability-v2';
    return mat;
  }
  function pick(point: Three.Vector3): Lot | null {
    const source = point.clone().applyMatrix4(worldToModel);
    const level = gloireFloorAtHeight(source.z, maxFloor);
    if (level === null) return null;
    const [x, y] = gloireSalesPlan(source.x, source.y);
    return gloireLotAtPlanPoint(lots, level, x, y);
  }
  return {
    material, pick,
    setMaxFloor(value: number | 'all') { maxFloor = value; limit.value = value === 'all' ? 5 : value; roof.value = value === 'all' ? GLOIRE_ROOF_ALLOWANCE : .001; },
    dispose: () => { mask.dispose(); colors.dispose(); },
  };
}
