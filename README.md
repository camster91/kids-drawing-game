# 🎨 Kids Drawing Game

Cross-platform drawing app for kids — Web, Android, and iOS from a shared engine.

## Platforms

| Platform | Tech | Status |
|----------|------|--------|
| Web | HTML5 Canvas 2D + TypeScript | ✅ Scaffolded |
| Android | Flutter (same codebase) | ✅ Scaffolded |
| iOS | Flutter (same codebase) | ✅ Scaffolded |

## Architecture

```
kids-drawing-game/
├── engine/              # Shared TypeScript core (stroke math, tools, undo)
│   └── src/
│       ├── core/        # Point, Stroke, CanvasState
│       ├── tools/       # Pencil, Marker, Eraser, RainbowBrush, StickerStamp
│       ├── commands/    # Undo/Redo command stack
│       └── export/      # PNG serializer, save/load
├── apps/
│   ├── web/             # HTML5 Canvas 2D frontend
│   └── mobile/          # Flutter project (iOS + Android)
│       └── lib/engine/  # Dart port of engine/
└── design/              # Assets, wireframes, Figma exports
```

## Features

- Drawing tools: Pencil, Marker, Crayon, Rainbow brush, Magic sparkle, Eraser
- Fun color palettes with presets (Animals, Nature, Candy, Space)
- Sticker stamps: Stars, hearts, animals, vehicles
- Background templates: Blank, tracing dots, connect-the-dots, coloring pages
- Undo/redo with full history
- Playback animation mode (watch your drawing replay)
- Save to PNG / share
- Guided drawing lessons (step-by-step dotted paths)
- Sound effects on tool select and stamp

## Quick Start

### Web
```bash
cd apps/web
npx serve .          # or: python3 -m http.server 8080
open http://localhost:8080
```

### Mobile (Android + iOS)
```bash
cd apps/mobile
flutter pub get
flutter run
```

## License
MIT
