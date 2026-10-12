import * as THREE from 'three';
import { installFogPatch, setFog, GLOBAL_UNIFORMS } from '../src/gfx/Fog.js';
import { MaterialLibrary } from '../src/gfx/Materials.js';
import { Engine } from '../src/core/Engine.js';
installFogPatch();
const errs = [];
window.addEventListener('error', e => errs.push(e.message));
const eng = new Engine(document.getElementById('app'), { quality: 'medium', resolutionScale: 1 });
const lib = new MaterialLibrary(eng);
(async () => {
  try {
    await lib.build();
    const sc = eng.scene, cam = eng.camera;
    setFog(sc, { color: 0x0b0f12, density: 0.03, height: 0.2, falloff: 0.5, baseY: 0 });
    sc.add(new THREE.HemisphereLight(0x8899aa, 0x221a10, 0.6));
    const sp = new THREE.SpotLight(0xfff0dd, 60, 30, 0.5, 0.5, 2); sp.position.set(0, 3, 4); sp.target.position.set(0, 0, -2); sc.add(sp, sp.target); sp.castShadow = true;
    const names = Object.keys(lib.m).filter(k => lib.m[k].isMeshStandardMaterial);
    names.forEach((n, i) => {
      const g = new THREE.SphereGeometry(0.45, 32, 16);
      const mesh = new THREE.Mesh(g, lib.m[n]);
      mesh.position.set((i % 8) - 3.5, 0.5 + Math.floor(i / 8) * 1.0, -2);
      mesh.castShadow = true; mesh.receiveShadow = true;
      sc.add(mesh);
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), lib.m.mud);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    cam.position.set(0, 1.6, 4); cam.lookAt(0, 1, -2);
    eng.renderer.shadowMap.needsUpdate = true;
    eng.renderer.render(sc, cam);
    window.__shot = eng.renderer.domElement.toDataURL('image/png'); document.title = 'DONE ' + names.length + ' errs:' + errs.join('|');
  } catch (e) { document.title = 'ERR ' + e.message + ' ' + e.stack; }
})();
