export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BrushConfig {
  size: number;
  color: string;
  opacity: number;
  smoothing: number;
}

export type ToolType =
  | "pencil"
  | "marker"
  | "crayon"
  | "spray"
  | "rainbow"
  | "eraser"
  | "sticker";

export interface Stroke {
  id: string;
  points: Point[];
  tool: ToolType;
  brush: BrushConfig;
  stickerId?: string;
  timestamp: number;
}

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  strokes: Stroke[];
}

export interface StickerDef {
  id: string;
  name: string;
  svg: string;
  category: string;
}

export interface DrawingState {
  width: number;
  height: number;
  background: string; // hex or "transparent"
  layers: CanvasLayer[];
  activeLayerId: string;
  tool: ToolType;
  brush: BrushConfig;
  selectedSticker: string;
}
