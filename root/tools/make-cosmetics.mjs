/**
 * Generate the 3D wearables from the base body.
 *
 * Two kinds come out of here, and they are made completely differently:
 *
 *   OUTFITS are shells of the body itself — the base mesh, pushed out along its
 *   normals and cut down to the bones that region covers. Doing it this way
 *   rather than modelling clothing from scratch means an outfit is guaranteed
 *   to fit, to share the skeleton, and therefore to deform with the character
 *   instead of floating beside it.
 *
 *   PROPS (helm, visor, aura, pet) are plain geometry built at the ORIGIN, with
 *   no skeleton. Avatar3D parents them to a bone and positions them in metres.
 *
 * Run:  node tools/make-cosmetics.mjs
 * Then: node tools/optimize-glb.mjs on each output (the runner below does it).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const { GLTFLoader } = await import('../front-end/vendor/three/loaders/GLTFLoader.js');
const { GLTFExporter } = await import('../front-end/vendor/three/GLTFExporter.js');

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../front-end/assets/avatar3d');
const BODY = resolve(OUT, '101-standard-build.glb');

/** Normalise a bone name the same way Avatar3D does. */
const norm = (n) => String(n || '').toLowerCase()
  .replace(/^.*[:_|]/, '').replace(/^mixamorig/, '').replace(/[^a-z0-9]/g, '');

// Which bones each garment covers. A vertex is kept when the bone that
// influences it most is in the set — weighting by the dominant bone rather than
// by position means a sleeve follows the arm even when the arm is raised.
const REGION = {
  torso: ['spine', 'spine1', 'spine2', 'leftshoulder', 'rightshoulder'],
  arms: ['leftarm', 'leftforearm', 'rightarm', 'rightforearm'],
  legs: ['leftupleg', 'leftleg', 'rightupleg', 'rightleg', 'hips'],
};
const R = (...keys) => new Set(keys.flatMap((k) => REGION[k]));

function loadBody() {
  const buf = readFileSync(BODY);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) =>
    new GLTFLoader().parse(ab, '', (g) => {
      const meshes = [];
      let skeleton = null;
      g.scene.traverse((o) => {
        if (o.isSkinnedMesh) { meshes.push(o); skeleton = skeleton || o.skeleton; }
      });
      res({ scene: g.scene, meshes, skeleton });
    }, rej),
  );
}

/**
 * Build a garment from a body mesh.
 *
 * @param {THREE.SkinnedMesh} src
 * @param {Set<string>} keepBones  normalised names this garment covers
 * @param {number} inflate         metres to push out along the normal
 */
function makeShell(src, keepBones, inflate, material) {
  const geo = src.geometry;
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  const idx = geo.index;

  const boneName = src.skeleton.bones.map((b) => norm(b.name));

  // Dominant bone per vertex.
  const keep = new Uint8Array(pos.count);
  for (let v = 0; v < pos.count; v++) {
    let best = -1, bestW = -1;
    for (let c = 0; c < 4; c++) {
      const w = sw.getComponent(v, c);
      if (w > bestW) { bestW = w; best = si.getComponent(v, c); }
    }
    keep[v] = keepBones.has(boneName[best]) ? 1 : 0;
  }

  // Keep a triangle only when every corner is in the region. Majority-keep
  // leaves ragged tabs hanging off the cuffs and collar.
  const tri = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    if (keep[a] && keep[b] && keep[c]) tri.push(a, b, c);
  }
  if (!tri.length) return null;

  // Re-index down to just the vertices this garment actually uses, or the file
  // carries the whole body's vertex buffer for a chest piece.
  const remap = new Map();
  const P = [], N = [], SI = [], SW = [], I = [];
  for (const v of tri) {
    let n = remap.get(v);
    if (n === undefined) {
      n = P.length / 3;
      remap.set(v, n);
      P.push(
        pos.getX(v) + nrm.getX(v) * inflate,
        pos.getY(v) + nrm.getY(v) * inflate,
        pos.getZ(v) + nrm.getZ(v) * inflate,
      );
      N.push(nrm.getX(v), nrm.getY(v), nrm.getZ(v));
      for (let c = 0; c < 4; c++) { SI.push(si.getComponent(v, c)); SW.push(sw.getComponent(v, c)); }
    }
    I.push(n);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  g.setIndex(I);

  const mesh = new THREE.SkinnedMesh(g, material);
  mesh.bind(src.skeleton, src.bindMatrix.clone());
  return mesh;
}

function exportGLB(object, file, animations = []) {
  return new Promise((res, rej) =>
    new GLTFExporter().parse(object, (buf) => {
      mkdirSync(OUT, { recursive: true });
      const out = resolve(OUT, file);
      const b = Buffer.from(buf);
      writeFileSync(out, b);
      console.log('  ' + file.padEnd(30) + (b.length / 1024).toFixed(0).padStart(6) + ' KB');
      res(out);
    }, rej, { binary: true, animations }),
  );
}

const std = (o) => new THREE.MeshStandardMaterial(o);

// ── outfits ───────────────────────────────────────────────────
const { scene, meshes, skeleton } = await loadBody();
const body = meshes[0];                       // Beta_Surface, the skin
const rootBone = skeleton.bones[0];

console.log('outfits (skinned shells of the body):');

const OUTFITS = [
  // The free default. Every player wears this, so the base figure is never
  // shown bare — a naked grey mannequin is a worse first impression than any
  // amount of paid cosmetics can fix. Covers torso, arms and legs so there is
  // no gap at the waist when nothing else is equipped.
  { file: '110-trainee-fit.glb', region: R('torso', 'arms', 'legs'), inflate: 0.010,
    mat: std({ color: 0x27303f, roughness: 0.8, metalness: 0.08,
               emissive: 0x0a1520, emissiveIntensity: 0.25 }) },
  { file: '102-street-jacket.glb', region: R('torso', 'arms'), inflate: 0.012,
    mat: std({ color: 0x2f4a6d, roughness: 0.85, metalness: 0.05 }) },
  { file: '103-circuit-suit.glb', region: R('torso', 'arms', 'legs'), inflate: 0.008,
    mat: std({ color: 0x0d1117, roughness: 0.4, metalness: 0.35,
               emissive: 0x00d4ff, emissiveIntensity: 0.35 }) },
  { file: '104-champion-plate.glb', region: R('torso'), inflate: 0.022,
    mat: std({ color: 0xd4a017, roughness: 0.25, metalness: 0.9,
               emissive: 0x7c3aed, emissiveIntensity: 0.12 }) },
];

for (const o of OUTFITS) {
  const shell = makeShell(body, o.region, o.inflate, o.mat);
  if (!shell) { console.warn('  ' + o.file + ' — no geometry in region, skipped'); continue; }
  // The skeleton has to travel with the mesh or the exporter writes an
  // unskinned blob. Avatar3D rebinds it to the body's own bones on load.
  //
  // It must be the ORIGINAL bone objects, not a clone: the shell is bound to
  // src.skeleton, so a cloned hierarchy leaves the skin's joint list pointing
  // at nodes that are not in the exported scene. That writes a file which
  // three.js rejects outright with 'Cannot set properties of undefined'.
  const s = new THREE.Scene();
  s.add(rootBone);
  s.add(shell);
  await exportGLB(s, o.file);
}

// ── props ─────────────────────────────────────────────────────
// Built at the ORIGIN. Avatar3D positions them in the bone's space.
console.log('props (bone-attached, modelled at origin):');

function group(...parts) {
  const g = new THREE.Group();
  parts.forEach((p) => g.add(p));
  const s = new THREE.Scene();
  s.add(g);
  return s;
}

// 105 Pilot Helm — dome plus a brim, open at the face
const helmShell = new THREE.Mesh(
  new THREE.SphereGeometry(0.115, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
  std({ color: 0x4a5568, roughness: 0.55, metalness: 0.45, side: THREE.DoubleSide }),
);
const helmBrim = new THREE.Mesh(
  new THREE.TorusGeometry(0.108, 0.016, 8, 24),
  std({ color: 0x2d3748, roughness: 0.6, metalness: 0.4 }),
);
helmBrim.rotation.x = Math.PI / 2;
helmBrim.position.y = -0.005;
await exportGLB(group(helmShell, helmBrim), '105-pilot-helm.glb');

// 107 Neon Visor — a band across the eyes, curved forward
const visor = new THREE.Mesh(
  new THREE.CylinderGeometry(0.098, 0.098, 0.045, 20, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
  std({ color: 0x0b1220, roughness: 0.15, metalness: 0.7,
        emissive: 0x00d4ff, emissiveIntensity: 0.8, side: THREE.DoubleSide }),
);
await exportGLB(group(visor), '107-neon-visor.glb');

// 108 Ember Aura — a ring of embers that sits around the figure
const aura = new THREE.Group();
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI * 2;
  const r = 0.34 + (i % 3) * 0.035;
  const e = new THREE.Mesh(
    new THREE.SphereGeometry(0.016 + (i % 3) * 0.006, 6, 5),
    std({ color: 0xff6b1a, emissive: 0xff3d00,
          emissiveIntensity: 1.1, roughness: 0.9 }),
  );
  e.position.set(Math.cos(a) * r, 0.12 + (i % 5) * 0.11, Math.sin(a) * r);
  aura.add(e);
}
await exportGLB(group(aura), '108-ember-aura.glb');

// 109 Pixel Companion — a blocky drake that hovers at the shoulder
const pet = new THREE.Group();
const petMat = std({ color: 0x00b8d4, roughness: 0.5, metalness: 0.2,
                     emissive: 0x00d4ff, emissiveIntensity: 0.25 });
const petBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.12), petMat);
const petHead = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), petMat);
petHead.position.set(0, 0.02, 0.085);
const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.09),
  std({ color: 0x7c3aed, roughness: 0.6, emissive: 0x7c3aed, emissiveIntensity: 0.3 }));
wingL.position.set(0.05, 0.045, -0.01); wingL.rotation.z = -0.5;
const wingR = wingL.clone(); wingR.position.x = -0.05; wingR.rotation.z = 0.5;
pet.add(petBody, petHead, wingL, wingR);
await exportGLB(group(pet), '109-pixel-companion.glb');

console.log('done — run optimize-glb.mjs on the outfits, they carry the skeleton.');
