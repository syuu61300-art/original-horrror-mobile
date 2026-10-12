# ヘッドレス検証: 単体版 HTML を開き、JS のシナリオを順に実行してスクリーンショットを保存する
import sys, time, base64, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]
import os as _os
url = "file://" + _os.path.abspath(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "index.html"))
_pre = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "test_prelude.js")
scenario = (open(_pre).read() + "\n" if _os.path.exists(_pre) else "") + open(sys.argv[2]).read()
W = int(sys.argv[3]) if len(sys.argv) > 3 else 960
H = int(sys.argv[4]) if len(sys.argv) > 4 else 540
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
    if _os.environ.get("CHINTO_TOUCH"):
        pg = b.new_page(viewport={"width": W, "height": H}, has_touch=True, is_mobile=True, device_scale_factor=2)
    else:
        pg = b.new_page(viewport={"width": W, "height": H})
    import os
    # ヘッドレスではポインタロックが入力イベントの洪水を起こすため無効化
    pg.add_init_script("HTMLCanvasElement.prototype.requestPointerLock = function(){ return Promise.resolve(); };")
    q = os.environ.get("CHINTO_Q") or "high"
    # 画質を固定し、初回起動時の自動画質調整は行わない (ソフトウェア描画では常に遅いため)
    pg.add_init_script(f"try{{localStorage.setItem('chinto_settings_v1', JSON.stringify({{quality:'{q}', autoTuned:true}}))}}catch(e){{}}")
    logs = []
    def _con(m):
        logs.append(f"[{m.type}] {m.text}")
        if m.text.startswith("STEP"):
            with open(out + "_steps.log", "a") as f: f.write(m.text + "\n")
    pg.on("console", _con)
    pg.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
    pg.goto(url)
    t0 = time.time()
    while time.time() - t0 < 240:
        try:
            st = pg.evaluate("window.__chinto && window.__chinto.game.state")
        except Exception as e:
            st = None
        if st == 'title': break
        time.sleep(1)
    print("boot state:", st, "after", round(time.time()-t0,1), "s")
    with open(out + "_steps.log", "a") as f: f.write(f"boot {st} {time.time()-t0:.1f}\n")
    pg.evaluate("""() => { const c = window.__chinto; c.shots = []; c.snap = (label) => { c.game.frame(1/60); c.shots.push([label, c.ctx.renderer.domElement.toDataURL('image/jpeg', 0.85)]); }; }""")
    res = pg.evaluate("async () => { const c = window.__chinto; const ctx = c.ctx, game = c.game; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const log = []; try { " + scenario + " } catch (e) { log.push('ERR ' + e.message + ' ' + e.stack); } return log; }")
    for l in res: print("LOG:", l)
    try: pg.screenshot(path=out + "_page.png", timeout=120000)
    except Exception as e: print("page screenshot failed", e)
    shots = pg.evaluate("window.__chinto.shots")
    for i, (label, s) in enumerate(shots):
        fn = f"{out}_{i:02d}_{label}.jpg"
        with open(fn, 'wb') as f: f.write(base64.b64decode(s.split(',')[1]))
        print("saved", fn)
    err = pg.evaluate("window.__chintoErr ? (window.__chintoErr.message + ' ' + window.__chintoErr.stack) : null")
    if err: print("FRAME ERROR:", err[:2000])
    seen=set()
    for l in logs:
        k=l[:120]
        if k in seen: continue
        seen.add(k); print(l[:600])
    b.close()
