/**
 * Build the placeholder base body and one wearable, as real rigged GLBs.
 *
 * These are not art. They exist so the 3D path is live and testable before any
 * artwork arrives, and — more usefully — so there is a reference skeleton with
 * the exact bone names the cosmetics attach to. Point Blender or Mixamo at the
 * output to check a real model's rig lines up.
 *
 * Run:  node tools/make-placeholder-avatar.mjs
 */
import * as THREE from '../front-end/vendor/three/three.module.min.js';
// GLTFExporter is browser code and reads its output Blob through FileReader,
// which Node does not provide. Two methods are all it uses.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((b) => {
        this.result = b;
        this.onloadend && this.onloadend();
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => {
        this.result = 'data:' + (blob.type || 'application/octet-stream') +
                      ';base64,' + Buffer.from(b).toString('base64');
        this.onloadend && this.onloadend();
      });
    }
  };
}

import { GLTFExporter } from '../front-end/vendor/three/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../front-end/assets/avatar3d');

/**
 * The skeleton every cosmetic attaches to.
 *
 * mixamorig names, because that is what Mixamo and Ready Player Me both emit —
 * a model from either drops in without renaming a single bone.
 */
function buildSkeleton() {
  const hips = new THREE.Bone();      hips.name = 'mixamorigHips';
  const spine = new THREE.Bone();     spine.name = 'mixamorigSpine';
  const spine2 = new THREE.Bone();    spine2.name = 'mixamorigSpine2';
  const neck = new THREE.Bone();      neck.name = 'mixamorigNeck';
  const head = new THREE.Bone();      head.name = 'mixamorigHead';
  const lArm = new THREE.Bone();      lArm.name = 'mixamorigLeftArm';
  const rArm = new THREE.Bone();      rArm.name = 'mixamorigRightArm';
  const lHand = new THREE.Bone();     lHand.name = 'mixamorigLeftHand';
  const rHand = new THREE.Bone();     rHand.name = 'mixamorigRightHand';

  hips.position.y = 0.95;
  spine.position.y = 0.18;
  spine2.position.y = 0.20;
  neck.position.y = 0.18;
  head.position.y = 0.12;
  lArm.position.set(0.20, 0.10, 0);
  rArm.position.set(-0.20, 0.10, 0);
  lHand.position.y = -0.45;
  rHand.position.y = -0.45;

  hips.add(spine); spine.add(spine2); spine2.add(neck); neck.add(head);
  spine2.add(lArm); lArm.add(lHand);
  spine2.add(rArm); rArm.add(rHand);

  return { root: hips, bones: [hips, spine, spine2, neck, head, lArm, rArm, lHand, rHand] };
}

function skinnedCapsule(bones, color) {
  // One capsule, bound to the spine — enough to prove skinning survives export.
  const geo = new THREE.CapsuleGeometry(0.22, 0.9, 4, 12);
  geo.translate(0, 1.15, 0);

  const pos = geo.attributes.position;
  const idx = [], wt = [];
  for (let i = 0; i < pos.count; i++) {
    // Everything rides the spine; a real body would weight per-vertex.
    idx.push(1, 0, 0, 0);
    wt.push(1, 0, 0, 0);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));

  const mesh = new THREE.SkinnedMesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 }),
  );
  const skeleton = new THREE.Skeleton(bones);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  return mesh;
}

function exportGLB(scene, file) {
  return new Promise((res, rej) => {
    new GLTFExporter().parse(
      scene,
      (buf) => {
        mkdirSync(OUT, { recursive: true });
        const out = resolve(OUT, file);
        writeFileSync(out, Buffer.from(buf));
        console.log('  ' + file.padEnd(28) + (Buffer.from(buf).length / 1024).toFixed(1) + ' KB');
        res(out);
      },
      rej,
      { binary: true },
    );
  });
}

// ── base body: skinned, carries the skeleton ──────────────────
const { root, bones } = buildSkeleton();
const bodyScene = new THREE.Scene();
bodyScene.add(skinnedCapsule(bones, 0xc68642));

// ── a wearable: plain mesh, parented to a bone at runtime ─────
// Modelled at the ORIGIN, because Avatar3D positions it in the bone's local
// space. A crown authored at head height would end up twice as high.
const crownScene = new THREE.Scene();
const crown = new THREE.Mesh(
  new THREE.TorusGeometry(0.13, 0.035, 8, 20),
  new THREE.MeshStandardMaterial({ color: 0xf5b301, roughness: 0.3, metalness: 0.8 }),
);
crown.rotation.x = Math.PI / 2;
crownScene.add(crown);

console.log('writing placeholder GLBs to front-end/assets/avatar3d/');
await exportGLB(bodyScene, '101-standard-build.glb');
await exportGLB(crownScene, '106-crown-of-carys.glb');
console.log('bones: ' + bones.map((b) => b.name).join(', '));
