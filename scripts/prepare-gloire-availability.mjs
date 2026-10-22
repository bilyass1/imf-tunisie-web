import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, draco, prune, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';

// Derive a web model without changing the supplied original or its coordinates.
const source = 'public/models/la-gloire/la-gloire-web.glb';
const output = 'public/models/la-gloire/la-gloire-availability.glb';
const metadata = `${output}.json`;
const recipe = 'architect-availability-v2:weld,topology-preserved,lock-border,ratio=.25,error=.00005,winding-fixed';
const bytes = await fs.readFile(source);
const hash = createHash('sha256').update(bytes).digest('hex');
const previous = await fs.readFile(metadata, 'utf8').then(JSON.parse).catch(() => null);
if (previous?.sourceSha256 === hash && previous.recipe === recipe && await fs.stat(output).catch(() => null)) {
  console.log('Architect availability model is up to date.');
  process.exit(0);
}
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const document = await io.readBinary(bytes);
await document.transform(weld());
let before = 0, after = 0;
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    if (primitive.getMode() !== 4 || !primitive.getIndices()) continue;
    const indices = primitive.getIndices(), positions = primitive.getAttribute('POSITION');
    const count = indices.getCount(); before += count / 3;
    if (count > 9000) {
      const [simplified] = MeshoptSimplifier.simplify(
        new Uint32Array(indices.getArray()), new Float32Array(positions.getArray()), 3,
        Math.max(36, Math.floor(count * .25 / 3) * 3), .00005, ['LockBorder'],
      );
      if (simplified.length && simplified.length < count) {
        primitive.setIndices(indices.clone().setArray(simplified));
        compactPrimitive(primitive);
      }
    }
    after += primitive.getIndices().getCount() / 3;
    // Fix exporter back-face winding once during asset preparation, not in the UI.
    const normal = primitive.getAttribute('NORMAL'), position = primitive.getAttribute('POSITION');
    if (normal) {
      const order = primitive.getIndices().getArray(), p = position.getArray(), n = normal.getArray();
      for (let i = 0; i < order.length; i += 3) {
        const a = order[i] * 3, b = order[i + 1] * 3, c = order[i + 2] * 3;
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        const nx = n[a] + n[b] + n[c], ny = n[a + 1] + n[b + 1] + n[c + 1], nz = n[a + 2] + n[b + 2] + n[c + 2];
        if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0) [order[i + 1], order[i + 2]] = [order[i + 2], order[i + 1]];
      }
      primitive.setExtras({ ...primitive.getExtras(), windingFixed: true });
    }
  }
}
await document.transform(prune(), draco({method:'edgebreaker'}));
await io.write(output, document);
const result = {recipe, sourceSha256:hash, sourceBytes:bytes.length, webBytes:(await fs.stat(output)).size, sourceTriangles:before, webTriangles:after};
await fs.writeFile(metadata, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
