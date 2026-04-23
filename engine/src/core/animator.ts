import type { Stroke, Point } from "../types";

/** Replay strokes chronologically for a satisfying playback animation */
export interface AnimationConfig {
  speedMultiplier: number; // 1 = realtime, 2 = 2x, 0.5 = half-speed
  delayBeforeStart: number; // ms
  delayAfterEnd: number; // ms
  onProgress?: (progress: number) => void; // 0-1
  onFrame?: (partialStrokes: Stroke[], currentTime: number) => void;
  onComplete?: () => void;
}

export class StrokeAnimator {
  private _frameId: number | null = null;
  private _startTime: number = 0;
  private _running: boolean = false;

  constructor(private strokes: Stroke[]) {}

  /** Start playing back strokes */
  play(config: AnimationConfig): void {
    if (this.strokes.length === 0 || this._running) return;
    this._running = true;

    const t0 = this.strokes[0].timestamp;
    const tLast = this.strokes[this.strokes.length - 1].timestamp;
    const total = Math.max(1, tLast - t0 + 2000); // add tail buffer

    // Pre-calculate cumulative durations for each stroke
    const durations = this.strokes.map((s) => {
      const dist = s.points.reduce(
        (sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - s.points[i - 1].x, p.y - s.points[i - 1].y)),
        0
      );
      return Math.min(3000, 50 + dist * 1.5); // min 50ms, max 3000ms
    });
    const totalDuration = durations.reduce((s, d) => s + d, 0) + 500;

    setTimeout(() => {
      this._startTime = performance.now();

      const tick = () => {
        const elapsed = (performance.now() - this._startTime) * config.speedMultiplier;
        const progress = Math.min(1, elapsed / totalDuration);
        config.onProgress?.(progress);

        // Build partial strokes for this frame
        const partial: Stroke[] = [];
        let accumulated = 0;

        for (let i = 0; i < this.strokes.length; i++) {
          if (accumulated + durations[i] > elapsed) {
            // Partial reveal of this stroke
            const frac = Math.max(0, (elapsed - accumulated) / durations[i]);
            const visibleCount = Math.max(1, Math.floor(this.strokes[i].points.length * frac));
            partial.push({
              ...this.strokes[i],
              points: this.strokes[i].points.slice(0, visibleCount),
            });
            break;
          } else {
            // Full stroke visible
            partial.push(this.strokes[i]);
            accumulated += durations[i];
          }
        }

        config.onFrame?.(partial, elapsed);

        if (progress < 1) {
          this._frameId = requestAnimationFrame(tick);
        } else {
          this._running = false;
          this._frameId = null;
          setTimeout(() => config.onComplete?.(), config.delayAfterEnd);
        }
      };

      this._frameId = requestAnimationFrame(tick);
    }, config.delayBeforeStart);
  }

  stop(): void {
    this._running = false;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  get isPlaying(): boolean {
    return this._running;
  }

  /** Serialize all strokes as a replayable animation sequence */
  static serialize(strokes: Stroke[]): string {
    return JSON.stringify(
      strokes.map((s) => ({
        tool: s.tool,
        brush: s.brush,
        points: s.points,
        stickerId: s.stickerId,
        duration: s.points.length > 1
          ? s.points.reduce(
              (sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - s.points[i - 1].x, p.y - s.points[i - 1].y)),
              0
            ) * 1.5
          : 500,
      })),
      null,
      2
    );
  }
}
