/**
 * Convert a Collada (.dae) character into the GLB the avatar rig expects.
 *
 * This exists so getting a Mixamo character into the platform does not require
 * installing Blender. Mixamo's FBX export is version 6100, which Blender and
 * three.js both refuse (see docs/AVATAR-3D-SPEC.md §3b) — but its Collada
 * export has no such problem, and three.js reads it directly.
 *
 * What it does beyond a format swap:
 *   - normalises height to 1.7 m and drops the origin to the feet, which is
 *     what the rig's spec asks for and what Mixamo does NOT give you (its
 *     characters export in centimetres, so a raw import is 100x too big)
 *   - keeps the skeleton and the first animation clip
 *   - reports the bone names, so you can check `attach_bone` values against
 *     the real rig rather than guessing
 *
 * Usage:
 *   node tools/dae-to-glb.mjs <input.dae> [output.glb]
 *
 *   node tools/dae-to-glb.mjs ../character.dae
 *   node tools/dae-to-glb.mjs ../character.dae ../front-end/assets/avatar3d/101-standard-build.glb
 */
import { DOMParser } from '@xmldom/xmldom';

// ColladaParser and GLTFExporter are browser code. These are the only three
// globals they reach for that Node does not provide.
if (typeof globalThis.DOMParser === 'undefined') globalThis.DOMParser = DOMParser;
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => {
        this.result = 'data:' + (blob.type || 'application/octet-stream') +
                      ';base64,' + Buffer.from(b).toString('base64');
        this.onloadend?.();
      });
    }
  };
}

const THREE = await import('../front-end/vendor/three/three.module.min.js');
const { ColladaLoader } = await import('../front-end/vendor/three/loaders/ColladaLoader.js');
const { GLTFExporter } = await import('../front-end/vendor/three/GLTFExporter.js');
const { readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
const { dirname, resolve, basename } = await import('node:path');
const { fileURLToPath } = await import('node:url');

const HERE = dirname(fileURLToPath(import.meta.url));

/** Spec height for a base body, in metres. */
const TARGET_HEIGHT = 1.7;
const argv = process.argv.slice(2);
// --no-anim writes the bind pose only. Mixamo characters bind in a T-pose, so
// dropping the clip is what produces the neutral figure the shop wants: a
// garment is hard to judge on a model mid-kick.
const NO_ANIM = argv.includes('--no-anim');
const [inArg, outArg] = argv.filter((a) => !a.startsWith('--'));

if (!inArg) {
  console.error('usage: node tools/dae-to-glb.mjs <input.dae> [output.glb]');
  process.exit(1);
}

const inPath = resolve(process.cwd(), inArg);
const outPath = outArg
  ? resolve(process.cwd(), outArg)
  : resolve(HERE, '../front-end/assets/avatar3d', basename(inPath).replace(/\.dae$/i, '') + '.glb');

console.log('reading ' + inPath);
const text = readFileSync(inPath, 'utf8');

// The loader resolves textures relative to this. Collada from Mixamo references
// images by filename beside the .dae, so hand it that directory.
const collada = new ColladaLoader().parse(text, dirname(inPath) + '/');
const root = collada.scene;

// Clips moved onto the scene; the top-level property is deprecated and reading
// it logs a warning and can come back empty — which would silently drop the
// character's animation rather than fail.
const allClips = root.animations?.length ? root.animations : (collada.animations ?? []);
const clips = NO_ANIM ? [] : allClips;

// ── inspect ───────────────────────────────────────────────────
const bones = [];
let skinned = 0, meshes = 0, tris = 0;
root.traverse((o) => {
  if (o.isBone) bones.push(o.name);
  if (o.isSkinnedMesh) skinned++;
  if (o.isMesh) {
    meshes++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
  }
});

console.log('  meshes        : ' + meshes + ' (' + skinned + ' skinned)');
console.log('  triangles     : ~' + Math.round(tris).toLocaleString());
console.log('  bones         : ' + bones.length);
console.log('  animations    : ' + clips.length + (NO_ANIM ? ' (stripped, --no-anim)' : ''));

if (!bones.length) {
  console.warn('  WARNING: no bones. Usable as a prop, not as a base body.');
}

// ── normalise scale and origin ────────────────────────────────
// Mixamo exports centimetres, and ColladaLoader expresses that as a scale on
// the scene rather than by rewriting the vertices. Measuring before the world
// matrices are refreshed therefore reads the unit factor twice and reports a
// 1.8 m character as 0.018 m — which then gets "corrected" by 94x into a 170 m
// giant. updateMatrixWorld first, then measure.
root.updateMatrixWorld(true);

function measure() {
  root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(root);
  return { box: b, h: b.max.y - b.min.y };
}

let m = measure();
console.log('  measured      : ' + m.h.toFixed(3) + 'm');

if (m.h > 0) {
  root.scale.multiplyScalar(TARGET_HEIGHT / m.h);
  m = measure();

  // Verify rather than assume. A skinned mesh can measure differently once its
  // matrices settle, and being silently wrong here is what produced the 170 m
  // model — an error nothing downstream would have flagged.
  if (Math.abs(m.h - TARGET_HEIGHT) / TARGET_HEIGHT > 0.01) {
    root.scale.multiplyScalar(TARGET_HEIGHT / m.h);
    m = measure();
  }

  root.position.y -= m.box.min.y;                          // feet to y=0
  root.position.x -= (m.box.max.x + m.box.min.x) / 2;      // centre on x
  root.position.z -= (m.box.max.z + m.box.min.z) / 2;
  m = measure();

  console.log('  normalised    : ' + m.h.toFixed(3) + 'm, feet at y=' + m.box.min.y.toFixed(3));
  if (Math.abs(m.h - TARGET_HEIGHT) / TARGET_HEIGHT > 0.01) {
    console.error('  FAILED to normalise height — refusing to write a wrong model.');
    process.exit(1);
  }
} else {
  console.warn('  WARNING: zero height, scale left alone.');
}

// ── export ────────────────────────────────────────────────────
const glb = await new Promise((res, rej) =>
  new GLTFExporter().parse(
    root,
    res,
    rej,
    { binary: true, animations: clips },
  ),
);

mkdirSync(dirname(outPath), { recursive: true });
const buf = Buffer.from(glb);
writeFileSync(outPath, buf);

const kb = buf.length / 1024;
console.log('wrote ' + outPath);
console.log('  size          : ' + (kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb.toFixed(1) + ' KB'));
if (kb > 2048) {
  console.warn('  OVER BUDGET: the spec caps a base body at 2 MB. Decimate or shrink textures.');
}

if (bones.length) {
  console.log('\nbones — use these for attach_bone:');
  const interesting = bones.filter((b) => /head|neck|spine|hand|foot|hips|shoulder/i.test(b));
  (interesting.length ? interesting : bones).slice(0, 24).forEach((b) => console.log('  ' + b));
  if (bones.length > 24) console.log('  … +' + (bones.length - 24) + ' more');
}
