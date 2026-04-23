# Kids Drawing Game — Technical Log

> **Date**: April 23, 2026  
> **Live Site**: https://draw.ashbi.ca/  
> **Repo**: https://github.com/camster91/kids-drawing-game

---

## 🐛 Critical Bug Fixed: Canvas Sizing

### Problem
- Canvas was rendering at **300×150 px** (tiny black rectangle)
- Clicking the splash screen revealed a broken, unusable drawing area

### Root Cause
`sizeCanvas()` fired while `#app` was `display:none` (splash screen covering it), so `.canvas-wrap` reported `clientHeight = 0`. The canvas defaulted to its HTML default of 300×150 and stayed that way.

### Fix Applied
```typescript
// In apps/web/main.ts — splash dismissal handler
splash.addEventListener("click", () => {
  splash.style.opacity = "0";
  setTimeout(() => {
    splash.style.display = "none";
    appContainer.style.display = "flex";
    // CRITICAL: resize canvas now that app is visible
    requestAnimationFrame(() => {
      sizeCanvas();
      setTimeout(sizeCanvas, 100);
    });
  }, 800);
});
```

Also updated `sizeCanvas()` to guard against zero values:
```typescript
const w = Math.min(1200, Math.max(300, wrap.clientWidth - 16));
const h = Math.min(800, Math.max(300, wrap.clientHeight - 16));
```

And changed canvas from `width:100%; height:100%` to `position:absolute; inset:8px` in CSS so it fills `.canvas-wrap` independently of flex measurements.

### Result
| Before | After |
|--------|-------|
| 300×150 px (tiny, unusable) | 1200×407 px (full drawing area) |

---

## 🎨 Feature Added: Coloring Books Gallery

### What Changed
Added a **tabbed gallery panel** at the bottom of the screen with 91 AI-generated assets kids can tap to load as a coloring page / tracing template on the canvas.

### Gallery Tabs

| Tab | Count | Examples |
|-----|-------|---------|
| **Coloring Pages** | 18 | Lion, Dolphin, Rocket, Cake, Bear, Butterfly, Pirate Ship, Fairy, T-Rex, Fire Truck, Unicorn, Penguin + 6 Vehicles |
| **Letters A-Z** | 26 | A–Z alphabet sheets with bubble-letter outlines |
| **Numbers 0-9** | 10 | 0–9 with smiley-face decorations |
| **Backgrounds** | 6 | Ocean, Space, Forest, Candy Land, Cloud Castle, Jungle |

### How It Works (User Flow)
1. Kid clicks any thumbnail in the gallery
2. App loads the PNG as the canvas background
3. Kid draws / colors / traces over it with any tool (pencil, marker, crayon, spray, rainbow)
4. Save button exports their finished artwork as PNG

### Files Changed
- `apps/web/index.html` — added `<section class="gallery-panel">` with tabs + grid
- `apps/web/styles.css` — added `.gallery-panel`, `.gallery-tabs`, `.gallery-thumb`, `.gallery-grid` styles
- `apps/web/main.ts` — added `GALLERY_ASSETS` map, `showGalleryTab()` function, tab click handlers, background image rendering in `render()`

### Asset Paths
```
assets/coloring-pages/coloring_01.png  →  coloring_18.png
assets/coloring-pages/vehicle_01.png   →  vehicle_06.png
assets/letters/letter_A.png            →  letter_Z.png
assets/numbers/number_0.png            →  number_9.png
assets/backgrounds/bg_underwater.png   →  bg_jungle.png
```

> **Note**: We removed the `/generated/` subfolder from paths because Vite's build flattens `assets/` into the dist output. The 91 PNGs are in `assets/` directly.

---

## 🖼️ Image Background Rendering

The `render()` function now handles **solid colors**, **dot grid**, and **image backgrounds**:

```typescript
const bg = engine.background;
if (bg.startsWith("assets/") || bg.startsWith("http")) {
  // Load image, cache in window.__bgCache, drawImage() covering canvas
} else if (bg === "dots") {
  // White fill + dot grid overlay
} else {
  // Solid color fill
}
```

---

## 🛠️ Asset Generation Pipeline

### Scripts
- `scripts/gen_v2.py` — batch generate via Gemini API
- `scripts/gen_more.py` — follow-up generation runs

### Models Used
| Model | Purpose | Count |
|-------|---------|-------|
| `gemini-3-pro-image-preview` | Mascot, splash hero, complex scenes | 2 images |
| `gemini-3.1-flash-image-preview` | Bulk coloring pages, letters, numbers, backgrounds | 89 images |

### API Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

**Important**: Response format uses `inlineData` (base64 JPEG), NOT `image` field:
```python
data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
```

### API Key
`GEMINI_API_KEY` set in environment for generation scripts.

---

## 📱 Flutter Mobile Build Notes

| Requirement | Value |
|-------------|-------|
| Flutter | 3.24.0 |
| Dart | 3.5.0 |
| JDK | **17** (not 21 — Gradle 7.6.3 incompatibility with jlink) |
| Gradle | 7.6.3-all |
| Kotlin | 1.9.0 (updated in `settings.gradle`) |

### Issues Resolved
- Removed `audioplayers` dependency — broke `verifyReleaseResources` with AAPT2
- Added `import 'engine/types.dart'` to `main.dart` for `ToolType`, `Point`
- Fixed missing parenthesis in `guided_drawing.dart` line 101

### APK Output
`apps/mobile/build/app/outputs/flutter-apk/app-release.apk` — **20.2 MB**

---

## 🚀 Deployment

| Setting | Value |
|---------|-------|
| **Live URL** | https://draw.ashbi.ca/ |
| **Hosting** | Coolify VPS (187.77.26.99) |
| **Container** | nginx:alpine Docker |
| **Network** | coolify (Traefik reverse proxy) |
| **SSL** | Let's Encrypt (auto-renew) |
| **DNS** | `draw.ashbi.ca` → `187.77.26.99` (A record, Cloudflare) |
| **Static files** | `/var/www/draw-kids/` (rsync from `apps/web/dist/`) |

### Deploy Command
```bash
cd apps/web && npx vite build
rsync -avz --delete dist/ coolify:/var/www/draw-kids/
```

### Traefik Labels
- HTTP → HTTPS redirect
- `tls.certresolver=letsencrypt`
- gzip middleware enabled

---

## ✅ QA Verification (Playwright)

```
Canvas bounding box:  x:8, y:166, width:1200, height:407 ✅
Thumbnail images:     naturalWidth: 1408 (all loaded) ✅
HTTPS:                  Valid Let's Encrypt cert ✅
Build:                  0 errors, 0 warnings ✅
```

---

## 📋 Remaining Ideas / Backlog

1. **Letter/Number tracing paths** — Currently only Circle, Star, House, Rainbow Arc guided lessons. Need to add alphabet and number paths to `guided_drawing.ts`
2. **Seasonal sticker packs** — Halloween, Christmas, Summer, etc. in gallery
3. **Achievement badges** — "First Drawing!", "Color 10 Pages!", etc.
4. **Sound effects** — Replace Web Audio API tones with real SFX files
5. **Cloud save / share** — Save drawings to Firebase or similar
6. **Parent dashboard** — View child's gallery, print, share

---

## 📂 Key File Paths

```
kids-drawing-game/
├── apps/web/
│   ├── index.html          ← Gallery panel HTML
│   ├── main.ts             ← Canvas engine + gallery logic
│   ├── styles.css          ← Gallery + canvas styles
│   └── vite.config.ts      ← Build config
├── apps/mobile/
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── canvas_engine.dart
│   │   │   ├── stroke_painter.dart
│   │   │   ├── guided_drawing.dart
│   │   │   └── types.dart
│   │   └── main.dart
│   └── pubspec.yaml
├── engine/src/
│   ├── core/
│   │   ├── canvas.ts
│   │   ├── animator.ts
│   │   ├── sound_engine.ts
│   │   └── guided_drawing.ts
│   ├── tools/stroke_renderer.ts
│   └── types.ts
├── scripts/
│   ├── gen_v2.py           ← Asset generation
│   └── gen_more.py
└── assets/
    ├── generated/            ← 91 AI-made PNGs
    │   ├── coloring-pages/
    │   ├── letters/
    │   ├── numbers/
    │   ├── backgrounds/
    │   ├── stickers/
    │   ├── seasonal/
    │   ├── badges/
    │   ├── vehicles/
    │   ├── mascot/
    │   └── splash/
    └── stickers/svg/        ← Hand-coded SVGs (star, heart, cat, etc.)
```

---

*Commit: `84cf88a` — "fix: canvas sizing + integrate Coloring Books gallery"*
