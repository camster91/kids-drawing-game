import type { Point } from "../types";

/** Dotted path for kids to trace over */
export interface TracingPath {
  id: string;
  name: string;
  points: Point[];
  color: string;
  lineWidth: number;
  completed: boolean;
}

/** Create a circle path for tracing */
export function createCirclePath(
  cx: number,
  cy: number,
  r: number,
  segments: number = 60
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** Create a spiral path */
export function createSpiralPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  turns: number = 3,
  segments: number = 120
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * turns * Math.PI * 2;
    const r = innerR + (outerR - innerR) * t;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** Create a simple house shape (square + triangle) for tracing */
export function createHousePath(cx: number, cy: number, size: number = 150): Point[] {
  const pts: Point[] = [];
  const s = size;
  // Square base, then roof triangle
  const corners: Point[] = [
    { x: cx - s / 2, y: cy + s / 2 },    // bottom-left
    { x: cx + s / 2, y: cy + s / 2 },    // bottom-right
    { x: cx + s / 2, y: cy - s / 4 },    // mid-right
    { x: cx, y: cy - s },                // top
    { x: cx - s / 2, y: cy - s / 4 },    // mid-left
    { x: cx - s / 2, y: cy + s / 2 },    // back to start
  ];
  // Interpolate between corners
  const steps = 12;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      pts.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
    }
  }
  return pts;
}

/** Create a star path for tracing */
export function createStarPath(
  cx: number,
  cy: number,
  outerR: number,
  points: number = 5,
  segmentsPerSpike: number = 8
): Point[] {
  const pts: Point[] = [];
  const innerR = outerR * 0.4;
  const step = (Math.PI * 2) / (points * 2);
  const corners: Point[] = [];
  for (let i = 0; i < points * 2 + 1; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    corners.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    for (let j = 0; j < segmentsPerSpike; j++) {
      const t = j / segmentsPerSpike;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return pts;
}

/** Built-in tracing lessons */
export const BUILTIN_LESSONS: { name: string; paths: TracingPath[] }[] = [
  {
    name: "Circle",
    paths: [{
      id: "circle",
      name: "Circle",
      points: createCirclePath(500, 400, 120),
      color: "#94a3b8",
      lineWidth: 3,
      completed: false,
    }],
  },
  {
    name: "Star",
    paths: [{
      id: "star",
      name: "Star",
      points: createStarPath(500, 400, 120, 5),
      color: "#94a3b8",
      lineWidth: 3,
      completed: false,
    }],
  },
  {
    name: "House",
    paths: [{
      id: "house",
      name: "House",
      points: createHousePath(500, 400, 200),
      color: "#94a3b8",
      lineWidth: 3,
      completed: false,
    }],
  },
  {
    name: "Spiral",
    paths: [{
      id: "spiral",
      name: "Spiral",
      points: createSpiralPath(500, 400, 20, 140, 4),
      color: "#94a3b8",
      lineWidth: 2,
      completed: false,
    }],
  },
  {
    name: "Rainbow Arc",
    paths: [
      { id: "arc1", name: "Red Arc",   points: _arcPoints(500,420,110, 140),  color: "#ef4444", lineWidth: 8, completed: false },
      { id: "arc2", name: "Orange Arc", points: _arcPoints(500,420, 95, 125),  color: "#f97316", lineWidth: 8, completed: false },
      { id: "arc3", name: "Yellow Arc", points: _arcPoints(500,420, 80, 110),  color: "#eab308", lineWidth: 8, completed: false },
      { id: "arc4", name: "Green Arc",  points: _arcPoints(500,420, 65,  95),  color: "#22c55e", lineWidth: 8, completed: false },
      { id: "arc5", name: "Blue Arc",   points: _arcPoints(500,420, 50,  80),  color: "#3b82f6", lineWidth: 8, completed: false },
    ],
  },
];

function _arcPoints(cx: number, cy: number, rx: number, ry: number, segs: number = 50): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI + (i / segs) * Math.PI; // top arc only
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

/** Check if a user's drawn stroke approximately follows the guide path.
 * Returns score 0-1 (how well they traced). */
export function checkTracing(
  drawnPoints: Point[],
  guidePoints: Point[],
  tolerance: number = 30
): number {
  let matched = 0;
  // Sample guide points at intervals
  const step = Math.max(1, Math.floor(guidePoints.length / 40));
  for (let i = 0; i < guidePoints.length; i += step) {
    const g = guidePoints[i];
    // Find closest drawn point within tolerance
    const close = drawnPoints.some((p) =>
      Math.hypot(p.x - g.x, p.y - g.y) <= tolerance
    );
    if (close) matched++;
  }
  const sampled = Math.ceil(guidePoints.length / step);
  return Math.min(1, matched / (sampled * 0.6)); // allow some misses
}
