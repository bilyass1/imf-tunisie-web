import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, draco, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';

// Derive a web model without changing the supplied original or its coordinates.
const source = 'public/models/la-gloire/la-gloire-web.glb';
const output = 'public/models/la-gloire/la-gloire-availability.glb';
const metadata = `${output}.json`;
const recipe = 'architect-availability-v1:ratio=.05,error=.0005,dense>3000-triangles';
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
let before = 0, after = 0;
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    if (primitive.getMode() !== 4 || !primitive.getIndices()) continue;
    const indices = primitive.getIndices(), positions = primitive.getAttribute('POSITION');
    const count = indices.getCount(); before += count / 3;
    if (count > 9000) {
      const [simplified] = MeshoptSimplifier.simplifySloppy(
        new Uint32Array(indices.getArray()), new Float32Array(positions.getArray()), 3,
        null, Math.max(36, Math.floor(count * .05 / 3) * 3), .0005,
      );
      if (simplified.length && simplified.length < count) {
        primitive.setIndices(indices.clone().setArray(simplified));
        compactPrimitive(primitive);
      }
    }
    after += primitive.getIndices().getCount() / 3;
  }
}
await document.transform(prune(), draco({method:'edgebreaker'}));
await io.write(output, document);
const result = {recipe, sourceSha256:hash, sourceBytes:bytes.length, webBytes:(await fs.stat(output)).size, sourceTriangles:before, webTriangles:after};
await fs.writeFile(metadata, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
