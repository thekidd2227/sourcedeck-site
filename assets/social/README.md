# SourceDeck · Social Capture

Capture sheet at `capture.html` contains 6 frames at exact social dimensions:

| # | Surface | Size | Use |
|---|---|---|---|
| 01 | Landing hero | 1200×675 | LinkedIn feed / Twitter card / Facebook link share |
| 02 | Command Center | 1080×1080 | Instagram square |
| 03 | Funnel Health vertical | 1080×1920 | IG / TikTok Reel cover · Story |
| 04 | Cost of inaction | 1080×1080 | Instagram square |
| 05 | Pricing grid | 1200×675 | LinkedIn / Twitter |
| 06 | Status taxonomy | 1080×1080 | Instagram square |

## Capture (one-line)

```bash
# macOS — requires Chrome/Chromium in PATH
# Opens each frame in a tab sized exactly; use the devtools device toolbar
# to emulate pixel scale 1, then Cmd+Shift+P → "Capture full size screenshot".
open https://sourcedeck.app/assets/social/capture.html
```

## Automated (headless)

```bash
# Puppeteer snippet — captures all 6 frames to /assets/social/out/
npx -y puppeteer@22 screenshot https://sourcedeck.app/assets/social/capture.html \
  --fullPage --viewport '{"width":1280,"height":900,"deviceScaleFactor":2}' \
  --output assets/social/out/all.png
```

Or use `chromium --headless --screenshot --window-size=W,H URL` per frame.

## Video clips

For Reels / LinkedIn video: screen-record the live site sections at 60fps:

- `/command/` — operational inbox scroll (0:00–0:08) → revenue path (0:08–0:14) → playbook steps (0:14–0:20)
- `/#pricing` — pre-pricing hero → ROI calculator slider drag → comparison matrix expand
- `/portal/` — client tab → vendor tab → permissions reveal

Use QuickTime Screen Recording at 1920×1080 then crop to 9:16 in Final Cut / Premiere. Export H.264, 8–12 Mbps.
