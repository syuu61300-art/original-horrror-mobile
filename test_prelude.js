// =============================================================
//  test_prelude.js — ヘッドレス検証シナリオの共通ヘルパ
//   tools/run.py が各シナリオの先頭に連結して実行する。
//   (c, ctx, game, wait, log はランナー側で定義済み)
// =============================================================
const THREE = c.THREE;
const T0 = performance.now();
const step = (s) => console.log('STEP [' + ((performance.now() - T0) / 1000).toFixed(1) + 's] ' + s);
const err = () => (window.__chintoErr ? (window.__chintoErr.message + ' ' + (window.__chintoErr.stack || '').slice(0, 600)) : '-');
const until = async (fn, ms = 400000) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < ms) await wait(150); return fn(); };
const frames = (n, dt = 0.1) => { for (let i = 0; i < n; i++) game.frame(dt); };
const G = (x, z) => (ctx.chapter.groundHeight ? ctx.chapter.groundHeight(x, z) : 0);
const V = (x, z, dy = 0.05) => new THREE.Vector3(x, G(x, z) + dy, z);
const key = (code, type) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
const press = (code, n = 1) => { key(code, 'keydown'); frames(n, 0.05); key(code, 'keyup'); frames(1, 0.05); };
const labelOf = (it) => (typeof it.label === 'function' ? it.label() : it.label);
const findItem = (sub) => ctx.interact.items.find((it) => String(labelOf(it)).includes(sub));
const expect = (cond, msg) => { step((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) window.__testFail = (window.__testFail || 0) + 1; return cond; };
/** 文書の閲覧画面を閉じる */
const closeReader = async () => { await wait(260); if (ctx.ui.reading) document.querySelector('#reader').click(); await wait(50); frames(1, 0.05); };
/** プレイ中に戻るまで (カットシーンは早送り) */
const toPlay = async (skip = true) => {
  await until(() => game.state === 'play' || game.state === 'cutscene');
  if (skip && ctx.cutscene.active) ctx.cutscene.finish(true);
  frames(2, 0.05);
};
/**
 * 対象の前に立ち、視線を合わせて実際に E を押す (長押し対象は押し続ける)
 * 照準が合わなければ直接 onUse を呼んで先へ進む (その場合は WARN を出す)
 */
const lookUse = async (sub, o = {}) => {
  const it = typeof sub === 'string' ? findItem(sub) : sub;
  if (!it) { expect(false, 'item not found: ' + sub); return false; }
  const name = String(labelOf(it));
  let ok = false;
  const dists = o.dists || [1.0, 1.3, 0.7, 1.7];
  for (const d of dists) {
    for (let k = 0; k < 12 && !ok; k++) {
      const a = (o.ang ?? 0) + k * Math.PI / 6;
      const px = it.pos.x + Math.cos(a) * d, pz = it.pos.z + Math.sin(a) * d;
      const gy = o.floorY ?? G(px, pz);
      ctx.player.spawn(new THREE.Vector3(px, gy + 0.05, pz), 0, 0);
      frames(2, 0.03);
      const cp = ctx.camera.position;
      const dd = it.pos.clone().sub(cp);
      ctx.player.yaw = Math.atan2(-dd.x, -dd.z);
      ctx.player.pitch = Math.atan2(dd.y, Math.hypot(dd.x, dd.z));
      frames(2, 0.03);
      if (ctx.interact.current === it) ok = true;
    }
    if (ok) break;
  }
  if (!ok) { step('WARN aim failed, direct use: ' + name); if (o.hold) it.onUse(ctx); else it.onUse(ctx); return false; }
  if (it.hold > 0) {
    let used = false;
    const orig = it.onUse;
    it.onUse = (x) => { used = true; return orig(x); };
    key('KeyE', 'keydown');
    let n = 0;
    while (!used && ctx.interact.current === it && n < Math.ceil(it.hold / 0.1) + 8) { game.frame(0.1); n++; }
    key('KeyE', 'keyup'); frames(1, 0.05);
    it.onUse = orig;
    if (!used) { step('WARN hold interrupted, direct use: ' + name); orig(ctx); }
  } else press('KeyE');
  step('used ' + name);
  return true;
};
