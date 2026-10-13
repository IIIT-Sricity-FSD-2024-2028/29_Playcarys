/**
 * PlayCarys — 3D Avatar (approach B)
 * ===================================
 *
 * One base skeleton, one GLB per cosmetic, each parented to a bone.
 *
 * The alternative was a single baked model per look, which cannot swap an
 * outfit without re-exporting the whole character — and a shop that sells
 * wearables needs them separable. So the base body owns the skeleton, and every
 * hat/visor/pet is its own small GLB attached to a named bone at runtime.
 * Outfits are the exception: they are skinned to the same skeleton rather than
 * hung off one bone, so they bind instead of attach.
 *
 * LOADED LAZILY, ON PURPOSE. three.js is 548 KB vendored and a character GLB is
 * megabytes. The platform just had its per-page payload cut by 61%; pulling
 * that back on every page load would undo the lot. Nothing here is fetched
 * until mount() is called, and mount() is only called on a profile.
 *
 * Falls back to the flat AvatarModel rig whenever WebGL is unavailable, the
 * base body has no model_url yet, or a load fails. The 2D rig stays the thing
 * that always works.
 *
 * Bone names follow the mixamorig set — what Mixamo and Ready Player Me both
 * emit. See docs/AVATAR-3D-SPEC.md for the authoring contract.
 */
(function () {
  'use strict';

  var BASE = '../../vendor/three/';

  // Resolved once, then reused. Import maps are not used because these pages
  // are plain scripts, not modules — a dynamic import with an explicit URL
  // avoids needing one, and keeps this file loadable with a normal <script>.
  var _three = null;

  function libs() {
    if (_three) return _three;
    _three = Promise.all([
      import(BASE + 'three.module.min.js'),
      import(BASE + 'loaders/GLTFLoader.js')
    ]).then(function (m) {
      return { THREE: m[0], GLTFLoader: m[1].GLTFLoader };
    });
    return _three;
  }

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
                (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  /**
   * Normalise a bone name for comparison.
   *
   * Real rigs name the same bone at least four ways: Mixamo exports
   * `mixamorig:Head`, Ready Player Me `Head`, some Blender chains
   * `Armature|mixamorigHead`. Strip the namespace, the vendor prefix and any
   * punctuation and they all reduce to `head`.
   */
  function normBone(n) {
    return String(n || '')
      .toLowerCase()
      .replace(/^.*[:|]/, '')      // drop "mixamorig:" / "Armature|"
      .replace(/^mixamorig/, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Find a bone by name.
   *
   * Exact-after-normalising FIRST, substring only as a fallback. Substring
   * alone is not safe on a real skeleton: "Arm" is a substring of both
   * "ForeArm" and "LeftArm", so a crown asking for "Arm" would land on
   * whichever the traversal reached first. A 65-bone Mixamo rig has plenty of
   * these collisions.
   */
  function findBone(root, name) {
    if (!name) return null;
    var want = normBone(name);
    if (!want) return null;
    var exact = null, partial = null;
    root.traverse(function (o) {
      if (exact || !o.isBone) return;
      var n = normBone(o.name);
      if (n === want) { exact = o; return; }
      if (!partial && n.indexOf(want) !== -1) partial = o;
    });
    return exact || partial;
  }

  var Avatar3D = {
    /**
     * Render the character into `el`.
     *
     * @param {Element|String} el
     * @param {Object}  opts
     * @param {Array}   opts.equipped  cosmetic rows the player has equipped
     * @param {String}  opts.name
     * @param {Number}  opts.size      px, square. Default 320.
     * @param {Boolean} opts.autoRotate
     * @returns {Promise<{mode:string}>}  '3d' or '2d' — which renderer ran
     */
    mount: function (el, opts) {
      var node = typeof el === 'string' ? document.getElementById(el) : el;
      var o = opts || {};
      var equipped = (o.equipped || []).filter(Boolean);
      var size = o.size || 320;

      function fallback(why) {
        if (node && window.AvatarModel) {
          node.innerHTML = AvatarModel.render({
            equipped: equipped, name: o.name, size: size
          });
        }
        if (why) console.info('[Avatar3D] flat rig: ' + why);
        return { mode: '2d', reason: why };
      }

      if (!node) return Promise.resolve({ mode: 'none' });

      var body = equipped.filter(function (i) { return i.slot === 'body'; })[0];
      if (!webglOK()) return Promise.resolve(fallback('no WebGL'));
      if (!body || !body.model_url) {
        // Nothing to build a skeleton from. This is the state the platform
        // ships in until a base body GLB exists, and it is not an error.
        return Promise.resolve(fallback('no base body model yet'));
      }

      node.innerHTML = '<div class="pc-av3d-loading" style="display:flex;' +
        'align-items:center;justify-content:center;width:' + size + 'px;height:' +
        size + 'px;color:#8b96ad;font-size:.75rem">Loading model…</div>';

      return libs().then(function (lib) {
        var THREE = lib.THREE;
        var loader = new lib.GLTFLoader();

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 1.4, 3.2);
        camera.lookAt(0, 1.0, 0);

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Flat, front-lit — matches how the 2D assets are specified, so a
        // player switching between the card art and the model sees one character.
        scene.add(new THREE.HemisphereLight(0xffffff, 0x223044, 2.2));
        var key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(-2, 4, 3);
        scene.add(key);

        var rig = new THREE.Group();
        scene.add(rig);

        function load(url) {
          return new Promise(function (res, rej) { loader.load(url, res, undefined, rej); });
        }

        // Which body file to load.
        //
        // A profile shows the character alive — the MMA clip plays and the
        // figure moves. The shop shows the same character standing still,
        // because the question there is "does this jacket suit me", and that is
        // harder to answer about someone mid-kick. The still variant is a
        // separate GLB with no clip at all rather than the same file paused,
        // so there is no chance of it settling on an awkward frame.
        var animate = o.animate !== false;
        var bodyUrl = (!animate && body.model_url_static) || body.model_url;

        return load(bodyUrl).then(function (gltf) {
          var root = gltf.scene;
          rig.add(root);

          // Frame the model regardless of the units it was exported in.
          var box = new THREE.Box3().setFromObject(root);
          var h = Math.max(0.001, box.max.y - box.min.y);
          var k = 1.7 / h;                       // normalise to ~1.7m
          root.scale.setScalar(k);
          root.position.y = -box.min.y * k;

          // Everything else hangs off this skeleton.
          var wearables = equipped.filter(function (i) {
            return i.slot !== 'body' && i.model_url;
          });

          return Promise.all(wearables.map(function (item) {
            return load(item.model_url).then(function (g) {
              var obj = g.scene;

              if (item.slot === 'outfit') {
                // Rebind to the BODY's skeleton.
                //
                // The outfit GLB ships with its own copy of the bones — it has
                // to, or the exporter writes an unskinned blob. Adding that copy
                // to the scene would give the character two skeletons: the body
                // would animate and the clothing would stand still beside it.
                //
                // So the skinned meshes are lifted out, their bone list is
                // remapped onto the body's actual bones by name, and only those
                // meshes are kept. The duplicate bone hierarchy is discarded.
                var bodyBones = {};
                root.traverse(function (o) {
                  if (o.isBone) bodyBones[normBone(o.name)] = o;
                });

                var wearMeshes = [];
                obj.traverse(function (o) { if (o.isSkinnedMesh) wearMeshes.push(o); });

                if (!wearMeshes.length) {
                  // Not skinned after all — treat it as a prop on the spine so
                  // it at least appears, rather than vanishing silently.
                  console.warn('[Avatar3D] outfit "' + item.name + '" has no skinned mesh');
                  root.add(obj);
                  return;
                }

                wearMeshes.forEach(function (m) {
                  var mapped = m.skeleton.bones.map(function (b) {
                    return bodyBones[normBone(b.name)] || b;
                  });
                  var missing = mapped.filter(function (b, i) {
                    return b === m.skeleton.bones[i];
                  }).length;
                  if (missing) {
                    console.warn('[Avatar3D] outfit "' + item.name + '": ' + missing +
                                 ' bone(s) had no match on the body — it may not deform');
                  }
                  m.skeleton = new THREE.Skeleton(mapped, m.skeleton.boneInverses);
                  m.bind(m.skeleton, m.bindMatrix);
                  // Parent to the body root so it inherits the same normalising
                  // scale and offset the body got.
                  root.add(m);
                });
                return;
              }

              var bone = findBone(root, item.attach_bone);
              var off = item.attach_offset || [0, 0, 0];
              var rot = item.attach_rotation || [0, 0, 0];
              obj.rotation.set(rot[0], rot[1], rot[2]);

              if (bone) {
                // attach_offset and attach_scale are in METRES, and a bone's
                // local space is not.
                //
                // A GLB exported from Mixamo carries its original units on the
                // scene node — the X Bot's bones sit at a world scale near
                // 0.0094 — and a child inherits that. Attaching a 0.13 m crown
                // with scale 1 therefore drew it 1.2 mm across, i.e. invisible,
                // and an offset of 0.14 m moved it 1.3 mm. Dividing by the
                // bone's world scale makes both mean what the spec says they
                // mean, whatever units the base body happens to be authored in.
                root.updateMatrixWorld(true);
                var ws = bone.getWorldScale(new THREE.Vector3());
                var s = (Math.abs(ws.x) + Math.abs(ws.y) + Math.abs(ws.z)) / 3 || 1;

                obj.position.set(off[0] / s, off[1] / s, off[2] / s);
                obj.scale.setScalar((item.attach_scale || 1) / s);
                bone.add(obj);          // rides the bone, so it follows animation
              } else {
                // Named a bone this skeleton does not have. Showing it at the
                // origin is wrong in an obvious way, which beats dropping it
                // silently and looking like the purchase did nothing.
                console.warn('[Avatar3D] bone "' + item.attach_bone +
                             '" not found for "' + item.name + '" — attached to root');
                obj.position.set(off[0], off[1], off[2]);
                obj.scale.setScalar(item.attach_scale || 1);
                rig.add(obj);
              }
            }).catch(function (e) {
              console.warn('[Avatar3D] could not load ' + item.name, e);
            });
          })).then(function () {
            node.innerHTML = '';
            node.appendChild(renderer.domElement);
            if (o.name) {
              var cap = document.createElement('div');
              cap.style.cssText = 'text-align:center;margin-top:.5rem;font-weight:700';
              cap.textContent = o.name;
              node.appendChild(cap);
            }

            // Drag to spin. No OrbitControls import — this is 12 lines and
            // avoids another vendored file for one interaction.
            var dragging = false, lastX = 0;
            renderer.domElement.style.cursor = 'grab';
            renderer.domElement.addEventListener('pointerdown', function (e) {
              dragging = true; lastX = e.clientX;
              renderer.domElement.style.cursor = 'grabbing';
            });
            window.addEventListener('pointerup', function () {
              dragging = false; renderer.domElement.style.cursor = 'grab';
            });
            window.addEventListener('pointermove', function (e) {
              if (!dragging) return;
              rig.rotation.y += (e.clientX - lastX) * 0.01;
              lastX = e.clientX;
            });

            // Even when the still variant is missing and the animated file was
            // loaded instead, animate:false must mean still.
            var mixer = null;
            if (animate && gltf.animations && gltf.animations.length) {
              mixer = new THREE.AnimationMixer(root);
              mixer.clipAction(gltf.animations[0]).play();
            }

            // performance.now() rather than THREE.Clock, which is deprecated in
            // r185, and rather than THREE.Timer, which would be another import
            // for one subtraction.
            var last = performance.now();
            var stopped = false;
            (function tick() {
              if (stopped) return;
              requestAnimationFrame(tick);
              var now = performance.now();
              var dt = (now - last) / 1000;
              last = now;
              if (mixer) mixer.update(dt);
              if (o.autoRotate && !dragging) rig.rotation.y += 0.004;
              renderer.render(scene, camera);
            })();

            // Free the GPU context when the node leaves the page — a profile
            // visited repeatedly would otherwise leak one context per visit,
            // and browsers cap them at around 16.
            node._pcDispose = function () {
              stopped = true;
              renderer.dispose();
            };

            return { mode: '3d' };
          });
        });
      }).catch(function (e) {
        return fallback('load failed: ' + (e && e.message ? e.message : e));
      });
    },

    /** Tear down a mounted viewer. */
    unmount: function (el) {
      var node = typeof el === 'string' ? document.getElementById(el) : el;
      if (node && node._pcDispose) { node._pcDispose(); node._pcDispose = null; }
    }
  };

  window.Avatar3D = Avatar3D;
})();
