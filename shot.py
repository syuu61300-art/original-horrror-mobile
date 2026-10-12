import sys, time, base64
from playwright.sync_api import sync_playwright
url = sys.argv[1]; out = sys.argv[2]; wait = float(sys.argv[3]) if len(sys.argv) > 3 else 20
w = int(sys.argv[4]) if len(sys.argv) > 4 else 960; h = int(sys.argv[5]) if len(sys.argv) > 5 else 540
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": w, "height": h})
    logs = []
    pg.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
    pg.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
    pg.goto(url)
    t0 = time.time()
    while time.time() - t0 < wait:
        t = pg.title()
        if t.startswith("DONE") or t.startswith("ERR"): break
        time.sleep(0.5)
    print("TITLE:", pg.title()[:3000])
    shots = pg.evaluate("window.__shots || (window.__shot ? [window.__shot] : [])")
    for i, s in enumerate(shots):
        fn = out if i == 0 else out.replace('.png', f'_{i}.png')
        with open(fn, 'wb') as f: f.write(base64.b64decode(s.split(',')[1]))
        print("saved", fn)
    for l in logs[:80]: print(l[:800])
    b.close()
