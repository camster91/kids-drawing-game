# 🎨 Kids Drawing Game

Cross-platform drawing app for kids — **Web**, **Android**, and **iOS**.

## 🚀 Quick Start

### Web (Local)
```bash
cd apps/web
npx vite --host
open http://localhost:3456
```

### Web (Static Deploy)
```bash
cd apps/web
npx vite build
# Upload `dist/` to any static host
```

### Android APK
```bash
cd apps/mobile
flutter build apk --release
# Install: apps/mobile/build/app/outputs/flutter-apk/app-release.apk
```

## 📂 Project Structure

```
kids-drawing-game/
├── engine/                  # Shared TypeScript core
│   ├── src/core/canvas.ts  # CanvasEngine, undo/redo, layers
│   ├── src/core/guided_drawing.ts  # A-Z letters, numbers, shapes
│   ├── src/core/sound_engine.ts    # Web Audio API effects
│   ├── src/core/animator.ts        # Stroke playback animation
│   └── src/tools/stroke_renderer.ts # Pencil, Marker, Crayon, Rainbow, Spray, Eraser
├── apps/
│   ├── web/                # HTML5 Canvas 2D + TypeScript + Vite
│   └── mobile/             # Flutter (Android + iOS)
│       └── lib/engine/     # Dart ports of all engine modules
├── assets/
│   ├── stickers/svg/       # 6 SVG stickers (star, heart, etc.)
│   └── generated/          # 91 AI-generated PNG assets
│       ├── mascot/         # Doodle rainbow blob mascot
│       ├── splash/         # Hero title art
│       ├── coloring-pages/ # 18 coloring templates
│       ├── backgrounds/    # 6 themed backgrounds
│       ├── letters/        # A-Z alphabet (26)
│       ├── numbers/        # 0-9 (10)
│       ├── stickers/       # 18 sticker illustrations
│       ├── seasonal/       # 8 seasonal stickers
│       ├── vehicles/       # 6 vehicle coloring pages
│       └── badges/         # 3 achievement badges
└── scripts/
    ├── gen_v2.py           # Asset generation pipeline (Gemini API)
    └── gen_more.py         # Extended asset batch generator
```

## 🎮 Features

- **8 Drawing Tools**: Pencil, Marker, Crayon, Rainbow Brush, Spray, Eraser, Stickers, Stamps
- **12-Color Palette** + Custom Picker
- **6 Backgrounds**: White, Peach, Sky, Pink, Dots (guide grid), + 6 AI-generated themes
- **4 Guided Lessons**: Circle, Star, House, Rainbow Arc (with auto-scoring)
- **A-Z Letters + 0-9 Numbers**: AI-generated tracing sheets
- **50-Step Undo/Redo**
- **Animation Playback**: Watch your drawing replay stroke-by-stroke
- **Sound + Haptics**: Web Audio API (web) / Haptic feedback (mobile)
- **Export PNG**: Save and share drawings
- **PWA**: Installable web app

## 🎨 AI-Generated Assets (91 Total)

| Category | Count | Samples |
|----------|-------|---------|
| Mascot | 1 | 🌈 Doodle (rainbow blob with beret) |
| Splash Screen | 1 | "KIDS DRAWING" title hero |
| Coloring Pages | 18 | Lion, dolphin, rocket, cake, bear, butterfly, pirate ship, fairy, T-Rex, fire truck, unicorn, penguin + 6 vehicles |
| Backgrounds | 6 | Underwater, space, forest, candy land, cloud castle, jungle |
| Letters | 26 | A-Z alphabet tracing sheets |
| Numbers | 10 | 0-9 with smiley faces |
| Stickers | 18 | Sun, moon, cloud, pizza, ice cream, robot, wand, crown, music, bike, balloon, cupcake, trophy, gem, lightning, rainbow, cookie, glasses |
| Seasonal | 8 | Pumpkin, ghost, snowman, Christmas tree, Santa hat, Easter egg, bunny, fireworks |
| Badges | 3 | Star, heart, rainbow achievement awards |

## 🔧 Build Commands

```bash
# Web dev server
cd apps/web && npx vite --host

# Web production build
cd apps/web && npx vite build

# Android debug
cd apps/mobile && flutter build apk --debug

# Android release
cd apps/mobile && flutter build apk --release

# Generate more assets (requires GEMINI_API_KEY)
export GEMINI_API_KEY="..."
python3 scripts/gen_v2.py      # Batch 1 (38 assets)
python3 scripts/gen_more.py    # Batch 2 (53 assets)
```

## 📦 APK Built

| File | Size | Notes |
|------|------|-------|
| `app-release.apk` | 20.2 MB | Built with Flutter 3.24, JDK 17, Gradle 7.6.3 |

## 🚢 Deploy

### GitHub Push
```bash
git remote add origin https://github.com/camster91/kids-drawing-game.git
git push -u origin master
```

### Coolify VPS
```bash
# Upload dist/ to server
scp -r apps/web/dist/ root@187.77.26.99:/var/www/draw-kids/
# Configure reverse proxy (Caddy/Nginx) for draw.ashbi.ca
```

## 📝 License
MIT
