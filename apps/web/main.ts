import { CanvasEngine } from "../../engine/src/core/canvas";
import { StrokeAnimator } from "../../engine/src/core/animator";
import { Sounds } from "../../engine/src/core/sound_engine";
import { BUILTIN_LESSONS, checkTracing } from "../../engine/src/core/guided_drawing";
import type { BrushConfig, ToolType, Stroke, Point } from "../../engine/src/types";
import type { TracingPath } from "../../engine/src/core/guided_drawing";

// ── Init ─────────────────────────────────
const canvas = document.getElementById("draw-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false })!;
let engine: CanvasEngine;
let isDrawing = false;
let rect: DOMRect;
let dpi = window.devicePixelRatio || 1;
let currentMode: "free" | "guided" | "playback" = "free";
let soundOn = true;
let activeLesson: ReturnType<typeof BUILTIN_LESSONS>[number] | null = null;
let tracedPaths: Map<string, Point[]> = new Map();
let animator: StrokeAnimator | null = null;

function sizeCanvas() {
  const wrap = document.querySelector(".canvas-wrap") as HTMLElement;
  const w = Math.min(1200, wrap.clientWidth - 16);
  const h = Math.min(800, wrap.clientHeight - 16);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = w * dpi;
  canvas.height = h * dpi;
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
  if (!engine) {
    engine = new CanvasEngine(w, h, "#ffffff");
    engine.onChange((state) => updateUI(state));
    engine.snapshot(); // initial blank state
  } else {
    engine.width = w; engine.height = h;
  }
  render();
}

function playSound(fn: keyof typeof Sounds) {
  if (soundOn) (Sounds[fn] as () => void)();
}

// ── Drawing events ───────────────────────
function getPoint(e: PointerEvent): { x: number; y: number } {
  rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function isGuidedTracing() {
  return currentMode === "guided" && activeLesson && activeLesson.paths.length > 0;
}

canvas.addEventListener("pointerdown", (e) => {
  if (currentMode === "playback") return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  isDrawing = true;
  const p = getPoint(e);
  engine.beginStroke(p.x, p.y, e.pressure || 1);
  playSound("toolSwitch");

  if (engine.tool === "sticker") {
    engine.addPoint(p.x, p.y);
    const stroke = engine.endStroke();
    engine.snapshot();
    playSound("stamp");
    render();
    if (isGuidedTracing() && stroke) checkLessonProgress();
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDrawing || engine.tool === "sticker" || currentMode === "playback") return;
  e.preventDefault();
  const p = getPoint(e);
  engine.addPoint(p.x, p.y, e.pressure || 1);
  render(true);
});

canvas.addEventListener("pointerup", (e) => {
  if (!isDrawing || currentMode === "playback") return;
  e.preventDefault();
  isDrawing = false;
  if (engine.tool !== "sticker") {
    engine.snapshot();
    engine.endStroke();
    playSound("pop");
    if (isGuidedTracing()) checkLessonProgress();
  }
  render(true);
});

canvas.addEventListener("pointercancel", () => {
  isDrawing = false;
});

// ── Render pipeline ──────────────────────────
async function render(dirty: boolean = false) {
  ctx.fillStyle = engine.background === "dots" ? "#ffffff" : engine.background;
  ctx.fillRect(0, 0, engine.width, engine.height);

  if (engine.background === "dots") drawDotGrid();

  // Draw active lesson guides
  if (isGuidedTracing()) {
    for (const path of activeLesson.paths) {
      drawDottedPath(path.points, path.color, path.lineWidth);
    }
    // Draw traced user progress
    for (const [_id, pts] of tracedPaths) {
      drawDottedPath(pts, "#22c55e", 6, [5, 3]);
    }
  }

  // Layers
  for (const layer of engine.layers) {
    if (!layer.visible) continue;
    for (const stroke of layer.strokes) {
      await import("../../engine/src/tools/stroke_renderer")
        .then(m => m.renderStroke(ctx as any, stroke, engine));
    }
  }

  // Active stroke
  if (isDrawing && engine.tool !== "sticker") {
    const pts = engine.activeStrokePoints();
    if (pts.length >= 2) {
      const { renderActiveStroke } = await import("../../engine/src/tools/stroke_renderer");
      renderActiveStroke(ctx as any, engine);
    }
  }
}

function drawDotGrid() {
  ctx.fillStyle = "#cbd5e1";
  const step = 40;
  for (let x = step; x < engine.width; x += step) {
    for (let y = step; y < engine.height; y += step) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawDottedPath(points: Point[], color: string, lineWidth: number, dash: number[] = [4, 6]) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

// ── Guided Drawing ─────────────────────────
function checkLessonProgress() {
  if (!activeLesson) return;
  for (const path of activeLesson.paths) {
    const id = path.id;
    const userStrokes = engine.layers.flatMap(l => l.strokes).filter(s => s.tool !== "sticker");
    if (userStrokes.length === 0) continue;
    const lastStroke = userStrokes[userStrokes.length - 1];
    const score = checkTracing(lastStroke.points, path.points, 35);
    if (score >= 0.5) {
      tracedPaths.set(id, [...lastStroke.points.map(p => ({ ...p }))]);
      playSound("success");
    }
  }
}

function populateLessons() {
  const container = document.getElementById("lesson-buttons")!;
  container.innerHTML = "";
  BUILTIN_LESSONS.forEach((lesson, i) => {
    const btn = document.createElement("button");
    btn.className = "lesson-btn";
    btn.textContent = lesson.name;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lesson-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeLesson = lesson;
      tracedPaths.clear();
      engine.clearAll();
      engine.snapshot();
      render();
    });
    container.appendChild(btn);
  });
}

// ── Playback ─────────────────────────────────
function startPlayback() {
  const allStrokes = engine.layers.flatMap(l => l.strokes);
  if (allStrokes.length === 0) {
    document.getElementById("pb-status")!.textContent = "Nothing to play!";
    return;
  }
  if (animator?.isPlaying) return;
  document.getElementById("pb-status")!.textContent = "Playing...";
  animator = new StrokeAnimator(allStrokes);
  animator.play({
    speedMultiplier: 2,
    delayBeforeStart: 200,
    delayAfterEnd: 500,
    onProgress: (p) => {
      document.getElementById("pb-status")!.textContent = `${Math.round(p * 100)}%`;
    },
    onFrame: (partial) => {
      // Render only partial strokes
      ctx.fillStyle = engine.background === "dots" ? "#ffffff" : engine.background;
      ctx.fillRect(0, 0, engine.width, engine.height);
      if (engine.background === "dots") drawDotGrid();
      for (const stroke of partial) {
        import("../../engine/src/tools/stroke_renderer").then(m => {
          m.renderStroke(ctx as any, stroke, engine);
        });
      }
    },
    onComplete: () => {
      document.getElementById("pb-status")!.textContent = "Done!";
      setTimeout(() => render(true), 300);
    },
  });
}

// ── UI wiring ──────────────────────────────
// Tools
const toolButtons = document.querySelectorAll("[data-tool]");
toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tool = btn.getAttribute("data-tool") as ToolType;
    engine.tool = tool;
    const tray = document.getElementById("sticker-tray")!;
    tray.classList.toggle("visible", tool === "sticker");
    toolButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    playSound("toolSwitch");
  });
});

// Size
const sizeBtns = document.querySelectorAll("[data-size]");
sizeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const size = parseInt(btn.getAttribute("data-size")!);
    engine.brush.size = size;
    sizeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Palette
document.querySelectorAll(".swatch[data-color]").forEach(sw => {
  sw.addEventListener("click", () => {
    const c = sw.getAttribute("data-color")!;
    engine.brush.color = c;
    document.querySelectorAll(".swatch[data-color]").forEach(s => s.classList.remove("active"));
    sw.classList.add("active");
  });
});
const colorInput = document.getElementById("color-input") as HTMLInputElement;
colorInput.addEventListener("input", () => {
  engine.brush.color = colorInput.value;
  document.querySelectorAll(".swatch[data-color]").forEach(s => s.classList.remove("active"));
});

// Background
document.querySelectorAll(".bg-option").forEach(opt => {
  opt.addEventListener("click", () => {
    const bg = opt.getAttribute("data-bg")!;
    engine.background = bg;
    document.querySelectorAll(".bg-option").forEach(o => o.classList.remove("active"));
    opt.classList.add("active");
    render();
  });
});

// Actions
const undoBtn = document.getElementById("undo-btn")!;
const redoBtn = document.getElementById("redo-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const saveBtn = document.getElementById("save-btn")!;

undoBtn.addEventListener("click", () => { engine.undo(); render(true); });
redoBtn.addEventListener("click", () => { engine.redo(); render(true); });
clearBtn.addEventListener("click", () => {
  if (confirm("Clear the whole canvas?")) {
    engine.clearAll(); engine.snapshot(); playSound("erase"); render(true);
  }
});
saveBtn.addEventListener("click", () => {
  const ex = document.createElement("canvas");
  ex.width = engine.width; ex.height = engine.height;
  const exCtx = ex.getContext("2d")!;
  exCtx.fillStyle = engine.background === "dots" ? "#ffffff" : engine.background;
  exCtx.fillRect(0, 0, engine.width, engine.height);
  for (const layer of engine.layers) {
    if (!layer.visible) continue;
    for (const stroke of layer.strokes) {
      import("../../engine/src/tools/stroke_renderer").then(m => m.renderStroke(exCtx, stroke, engine));
    }
  }
  setTimeout(() => {
    const a = document.createElement("a");
    a.href = ex.toDataURL("image/png");
    a.download = `drawing-${Date.now()}.png`;
    a.click();
  }, 150);
});

// Mode bar
document.querySelectorAll(".mode-btn[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode") as typeof currentMode;
    currentMode = mode;
    document.querySelectorAll(".mode-btn[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Show/hide lesson bar
    document.getElementById("lesson-bar")!.classList.toggle("hidden", mode !== "guided");
    // Show/hide playback overlay
    document.getElementById("playback-overlay")!.classList.toggle("hidden", mode !== "playback");
    // Show/hide palette in playback
    document.getElementById("palette")!.classList.toggle("hidden", mode !== "free" && mode !== "sticker");

    if (mode === "guided") populateLessons();
    if (mode === "playback") startPlayback();
    render();
  });
});

// Sound toggle
document.getElementById("sound-toggle")!.addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("sound-toggle")!.textContent = soundOn ? "🔊" : "🔇";
});

// Playback controls
document.getElementById("pb-play")!.addEventListener("click", startPlayback);
document.getElementById("pb-stop")!.addEventListener("click", () => {
  animator?.stop();
  document.getElementById("pb-status")!.textContent = "Stopped";
  render();
});

// Stickers
document.querySelectorAll(".sticker-btn[data-sticker]").forEach(btn => {
  btn.addEventListener("click", () => {
    engine.selectedSticker = btn.getAttribute("data-sticker") || "star";
    document.querySelectorAll(".sticker-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ── UI State ──────────────────────────────
function updateUI(state: object) {
  const s = state as { canUndo: boolean; canRedo: boolean };
  undoBtn.disabled = !s.canUndo;
  redoBtn.disabled = !s.canRedo;
  undoBtn.style.opacity = s.canUndo ? "1" : "0.3";
  redoBtn.style.opacity = s.canRedo ? "1" : "0.3";
}

// ── Init ──────────────────────────────────
window.addEventListener("resize", sizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(sizeCanvas, 200));

document.querySelectorAll(".tool-btn[data-tool]")[0]?.classList.add("active");

sizeCanvas();
