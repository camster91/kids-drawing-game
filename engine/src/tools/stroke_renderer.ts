import type { CanvasEngine } from "../core/canvas";
import type { Point, Stroke, ToolType } from "../types";

/** Render a completed stroke to a CanvasRenderingContext2D */
export function renderStroke(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  stroke: Stroke,
  engine: CanvasEngine
) {
  const { points, tool, brush, stickerId } = stroke as any;
  if (points.length < 2) return;

  ctx.save();

  if (tool === "eraser") {
    // Destination-out composite to erase from the active layer
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = brush.size * 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  } else if (tool === "spray") {
    renderSpray(ctx, points, brush);
  } else if (tool === "sticker" && stickerId) {
    renderSticker(ctx, points[points.length - 1], brush.size, stickerId);
  } else if (tool === "rainbow") {
    renderRainbow(ctx, points, brush);
  } else {
    // pencil / marker / crayon
    ctx.lineWidth = brush.size;
    ctx.lineCap = tool === "marker" ? "square" : "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = brush.color;
    ctx.globalAlpha = brush.opacity;

    if (tool === "crayon") {
      ctx.shadowBlur = 2;
      ctx.shadowColor = brush.color;
      // Crayon dithering effect
      renderDitheredLine(ctx, points, brush.size, brush.color, brush.opacity);
    } else if (tool === "marker") {
      ctx.shadowBlur = 0;
      // Marker: flat with subtle spread
      ctx.lineWidth = brush.size * 1.1;
      beginStrokePath(ctx, points);
      ctx.stroke();
      // inner core lighter
      ctx.lineWidth = brush.size * 0.6;
      ctx.strokeStyle = lightenColor(brush.color, 0.2);
      beginStrokePath(ctx, points);
      ctx.stroke();
    } else {
      // pencil
      ctx.shadowBlur = 0;
      beginStrokePath(ctx, points);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Render active stroke (currently being drawn) on top */
export function renderActiveStroke(
  ctx: CanvasRenderingContext2D,
  engine: CanvasEngine
) {
  const pts = engine.activeStrokePoints();
  if (pts.length < 2) return;

  const brush = engine.brush;
  ctx.save();
  ctx.lineWidth = brush.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = brush.color;
  ctx.globalAlpha = brush.opacity;
  beginStrokePath(ctx, pts);
  ctx.stroke();
  ctx.restore();
}

// ── Internal helpers ───────────────────────────────

function beginStrokePath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: Point[]
) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  // Simplified quadratic curves between midpoints
  for (let i = 1; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    ctx.quadraticCurveTo(p1.x, p1.y, mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function renderDitheredLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  size: number,
  color: string,
  opacity: number
) {
  const ditherSize = Math.max(2, size / 4);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity * 0.6;

  let prev = points[0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
    const steps = Math.ceil(dist / (ditherSize * 0.5));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = prev.x + (p.x - prev.x) * t + (Math.random() - 0.5) * size * 0.5;
      const y = prev.y + (p.y - prev.y) * t + (Math.random() - 0.5) * size * 0.5;
      ctx.fillRect(x - ditherSize / 2, y - ditherSize / 2, ditherSize, ditherSize);
    }
    prev = p;
  }
}

function renderSpray(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: Point[],
  brush: { size: number; color: string; opacity: number }
) {
  const count = Math.max(4, Math.floor(brush.size * 0.8));
  for (const p of points) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * brush.size;
      const x = p.x + Math.cos(angle) * r;
      const y = p.y + Math.sin(angle) * r;
      const n = Math.random() * brush.size * 0.5;
      ctx.fillStyle = brush.color;
      ctx.globalAlpha = Math.random() * brush.opacity * 0.5;
      ctx.fillRect(x, y, n, n);
    }
  }
}

function renderSticker(
  ctx: CanvasRenderingContext2D,
  point: Point,
  size: number,
  stickerId: string
) {
  // Draw a simple colored shape based on stickerId
  const cx = point.x;
  const cy = point.y;
  ctx.save();
  ctx.globalAlpha = 1;

  switch (stickerId) {
    case "star":
      drawStar(ctx, cx, cy, 5, size, size / 2, "#fbbf24", "#f59e0b");
      break;
    case "heart":
      drawHeart(ctx, cx, cy, size, "#f43f5e");
      break;
    case "star_outline":
      drawStar(ctx, cx, cy, 5, size, size / 2, "#ffffff", "#fbbf24");
      break;
    default:
      // circle default
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      break;
  }
  ctx.restore();
}

function renderRainbow(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: Point[],
  brush: { size: number; opacity: number }
) {
  const rainbow = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#a855f7"];
  let hueIdx = 0;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = brush.size;
  ctx.globalAlpha = brush.opacity;

  for (let i = 1; i < points.length; i += 2) {
    ctx.strokeStyle = rainbow[hueIdx % rainbow.length];
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    hueIdx++;
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outer: number,
  inner: number,
  fill: string,
  stroke: string
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outer;
    y = cy + Math.sin(rot) * outer;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * inner;
    y = cy + Math.sin(rot) * inner;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outer);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const top = y - size;
  ctx.beginPath();
  ctx.moveTo(x, top + size / 4);
  ctx.bezierCurveTo(x, top, x - size / 2, top, x - size / 2, top + size / 4);
  ctx.bezierCurveTo(x - size / 2, top + size / 2, x, top + size * 0.75, x, top + size);
  ctx.bezierCurveTo(x, top + size * 0.75, x + size / 2, top + size / 2, x + size / 2, top + size / 4);
  ctx.bezierCurveTo(x + size / 2, top, x, top, x, top + size / 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.floor(255 * amount));
  const b = Math.min(255, (num & 0x0000ff) + Math.floor(255 * amount));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b)
    .toString(16).slice(1);
}
