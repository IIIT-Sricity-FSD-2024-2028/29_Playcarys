/**
 * Shrink a GLB to something a profile page can afford to load.
 *
 * A straight Collada → GLB conversion of a Mixamo character comes out around
 * 8 MB, and essentially all of it is geometry: the Collada exporter writes
 * NON-INDEXED triangles, so every shared vertex is duplicated once per face,
 * and every attribute is float32. The spec caps a base body at 2 MB.
 *
 * The passes, in the order they have to run:
 *   dedup     — collapse identical accessors/materials first, so later passes
 *               do less work
 *   weld      — rebuild an index buffer. This is the big one on Collada output
 *   simplify  — optional decimation, only when still over budget
 *   prune     — drop anything now unreferenced
 *   quantize  — float32 → int16/int8 per attribute
 *
 * Quantization is last because welding and simplifying both want full float
 * precision to decide what is "the same vertex".
 *
 * Usage:
 *   node tools/optimize-glb.mjs <in.glb> [out.glb] [--ratio 0.5]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, quantize, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const ratioArg = args.indexOf('--ratio');
const RATIO = ratioArg >= 0 ? Number(args[ratioArg + 1]) : null;

if (!files[0]) {
  console.error('usage: node tools/optimize-glb.mjs <in.glb> [out.glb] [--ratio 0.5]');
  process.exit(1);
}
const inPath = resolve(process.cwd(), files[0]);
const outPath = resolve(process.cwd(), files[1] || files[0]);

const before = statSync(inPath).size;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);

function stats(d) {
  let tris = 0, verts = 0;
  d.getRoot().listMeshes().forEach((m) =>
    m.listPrimitives().forEach((p) => {
      const idx = p.getIndices();
      const pos = p.getAttribute('POSITION');
      tris += (idx ? idx.getCount() : pos.getCount()) / 3;
      verts += pos.getCount();
    }),
  );
  return { tris: Math.round(tris), verts };
}

const s0 = stats(doc);
console.log('in : ' + (before / 1048576).toFixed(2) + ' MB  ' +
            s0.tris.toLocaleString() + ' tris, ' + s0.verts.toLocaleString() + ' verts');

await doc.transform(
  dedup(),
  // tolerance 0 welds only bit-identical vertices, which is exactly what the
  // Collada duplication produced. A loose tolerance here would weld across a
  // UV seam and smear the texture.
  weld({ tolerance: 0 }),
);

const s1 = stats(doc);
console.log('weld: ' + s1.tris.toLocaleString() + ' tris, ' + s1.verts.toLocaleString() +
            ' verts (' + (100 - (s1.verts / s0.verts) * 100).toFixed(0) + '% fewer verts)');

if (RATIO && RATIO < 1) {
  await MeshoptSimplifier.ready;
  await doc.transform(
    simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.001 }),
  );
  const s2 = stats(doc);
  console.log('simplify: ' + s2.tris.toLocaleString() + ' tris');
}

await doc.transform(
  prune(),
  // Skin weights stay at 8-bit and joints at 16-bit: a joint index quantized
  // too far points at the wrong bone, which tears the mesh apart rather than
  // just looking slightly rough.
  quantize({
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeTexcoord: 12,
    quantizeWeight: 8,
    quantizeJoints: 16,
  }),
);

const glb = await io.writeBinary(doc);
writeFileSync(outPath, Buffer.from(glb));

const after = glb.byteLength;
console.log('out: ' + (after / 1048576).toFixed(2) + ' MB  (' +
            (100 - (after / before) * 100).toFixed(0) + '% smaller)');
if (after > 2 * 1048576) {
  console.warn('STILL OVER the 2 MB budget — re-run with --ratio 0.5 to decimate.');
}
