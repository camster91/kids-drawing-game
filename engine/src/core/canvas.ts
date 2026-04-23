import type {
  Point,
  Stroke,
  BrushConfig,
  ToolType,
  CanvasLayer,
  StickerDef,
} from "../types";

let idCounter = 0;
function uid(): string {
  return `${Date.now()}-${++idCounter}`;
}

export class CanvasEngine {
  width: number = 1200;
  height: number = 800;
  background: string = "#ffffff";
  layers: CanvasLayer[] = [];
  activeLayerId: string = "";
  tool: ToolType = "pencil";
  brush: BrushConfig = {
    size: 8,
    color: "#ef4444",
    opacity: 1,
    smoothing: 0.5,
  };
  selectedSticker: string = "star";

  private _activeStroke?: Stroke;
  private _listeners: Set<(state: object) => void> = new Set();

  constructor(w: number = 1200, h: number = 800, bg: string = "#ffffff") {
    this.width = w;
    this.height = h;
    this.background = bg;
    this.addLayer("Layer 1");
    this.activeLayerId = this.layers[0].id;
  }

  // ── Layer management ──────────────────────────
  addLayer(name: string): CanvasLayer {
    const layer: CanvasLayer = {
      id: uid(),
      name,
      visible: true,
      locked: false,
      strokes: [],
    };
    this.layers.push(layer);
    return layer;
  }

  getActiveLayer(): CanvasLayer | undefined {
    const layer = this.layers.find((l) => l.id === this.activeLayerId);
    if (!layer) {
      // fallback to first visible unlocked layer
      return (
        this.layers.find((l) => l.visible && !l.locked) ?? this.layers[0]
      );
    }
    if (layer.locked) return this.layers.find((l) => !l.locked) ?? layer;
    return layer;
  }

  // ── Drawing lifecycle ─────────────────────────
  beginStroke(x: number, y: number, pressure: number = 1) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;

    this._activeStroke = {
      id: uid(),
      points: [{ x, y, pressure }],
      tool: this.tool,
      brush: { ...this.brush },
      stickerId: this.tool === "sticker" ? this.selectedSticker : undefined,
      timestamp: Date.now(),
    };
  }

  addPoint(x: number, y: number, pressure: number = 1) {
    if (!this._activeStroke) return;
    // Apply smoothing between points
    const last = this._activeStroke.points[this._activeStroke.points.length - 1];
    const s = this.brush.smoothing;
    const smoothX = last.x * s + x * (1 - s);
    const smoothY = last.y * s + y * (1 - s);
    this._activeStroke.points.push({ x: smoothX, y: smoothY, pressure });
  }

  endStroke(): Stroke | undefined {
    if (!this._activeStroke) return undefined;
    const stroke = this._activeStroke;
    const layer = this.getActiveLayer();
    if (layer) layer.strokes.push(stroke);
    this._activeStroke = undefined;
    this._notify();
    return stroke;
  }

  activeStrokePoints(): Point[] {
    return this._activeStroke ? [...this._activeStroke.points] : [];
  }

  // ── Undo / Redo ───────────────────────────────
  private _history: CanvasLayer[][] = [];
  private _historyIdx: number = -1;

  snapshot() {
    // Serialize current layers
    const snap = this.layers.map((l) => ({
      ...l,
      strokes: l.strokes.map((s) => ({ ...s, points: [...s.points] })),
    }));
    // Erase redo history if we branch
    if (this._historyIdx < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIdx + 1);
    }
    this._history.push(snap as unknown as CanvasLayer[]);
    this._historyIdx++;
    if (this._history.length > 50) {
      this._history.shift();
      this._historyIdx--;
    }
  }

  undo(): boolean {
    if (this._historyIdx <= 0) return false;
    this._historyIdx--;
    this._restore(this._history[this._historyIdx]);
    this._notify();
    return true;
  }

  redo(): boolean {
    if (this._historyIdx >= this._history.length - 1) return false;
    this._historyIdx++;
    this._restore(this._history[this._historyIdx]);
    this._notify();
    return true;
  }

  canUndo(): boolean {
    return this._historyIdx > 0;
  }

  canRedo(): boolean {
    return this._historyIdx < this._history.length - 1;
  }

  private _restore(snapshot: CanvasLayer[]) {
    this.layers = snapshot.map((l) => ({
      ...l,
      strokes: l.strokes.map((s) => ({ ...s, points: [...s.points] })),
    }));
  }

  // ── Utilities ────────────────────────────────
  clearActiveLayer() {
    const layer = this.getActiveLayer();
    if (layer && !layer.locked) {
      layer.strokes = [];
      this._notify();
    }
  }

  clearAll() {
    this.layers.forEach((l) => {
      if (!l.locked) l.strokes = [];
    });
    this._notify();
  }

  getStrokeCount(): number {
    return this.layers.reduce(
      (sum, l) => sum + l.strokes.length,
      0
    );
  }

  onChange(cb: (state: object) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  private _notify() {
    const state = {
      layers: this.layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        strokeCount: l.strokes.length,
      })),
      tool: this.tool,
      activeLayerId: this.activeLayerId,
      strokeCount: this.getStrokeCount(),
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
    this._listeners.forEach((cb) => cb(state));
  }
}

export { uid };
export * from "../types";
