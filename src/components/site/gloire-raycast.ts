import type { Mesh, Plane, Raycaster } from 'three';

/** A clipped upper surface must not hide the exposed floor during CPU picking. */
export function gloireSurfaceHit(raycaster: Raycaster, surfaces: Mesh[], clip?: Plane) {
  raycaster.firstHitOnly = !clip;
  return raycaster.intersectObjects(surfaces, false).find(hit => !clip || clip.distanceToPoint(hit.point) >= -.001) ?? null;
}
