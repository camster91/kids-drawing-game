import type { CanvasEngine } from "../core/canvas";

/** Export the full composited canvas to PNG */
export function exportToPng(engine: CanvasEngine): string {
  const offscreen = document.createElement("canvas");
  offscreen.width = engine.width;
  offscreen.height = engine.height;
  const ctx = offscreen.getContext("2d")!;

  // Background
  ctx.fillStyle = engine.background;
  ctx.fillRect(0, 0, engine.width, engine.height);

  // Draw each layer
  for (const layer of engine.layers) {
    if (!layer.visible) continue;
    for (const stroke of layer.strokes) {
      import("../tools/stroke_renderer").then(m => m.renderStroke(ctx as any, stroke, engine));
    }
  }

  // For simplicity convert to dataURL
  return offscreen.toDataURL("image/png");
}

/** Serialize the engine state to JSON */
export function serializeState(engine: CanvasEngine): string {
  return JSON.stringify(
    {
      width: engine.width,
      height: engine.height,
      background: engine.background,
      layers: engine.layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        strokes: l.strokes.map(s => ({
          id: s.id,
          points: s.points,
          tool: s.tool,
          brush: s.brush,
          stickerId: s.stickerId,
          timestamp: s.timestamp,
        })),
      })),
      activeLayerId: engine.activeLayerId,
      tool: engine.tool,
      brush: engine.brush,
    }
  );
}

/** Deserialize engine state from JSON */
export function deserializeState(json: string): object {
  return JSON.parse(json);
}

/** Save to browser localStorage */
export function saveToStorage(key: string, engine: CanvasEngine) {
  localStorage.setItem(key, serializeState(engine));
}

export function loadFromStorage(key: string): object | null {
  const raw = localStorage.getItem(key);
  return raw ? deserializeState(raw) : null;
}
