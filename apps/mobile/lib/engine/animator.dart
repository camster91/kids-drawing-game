import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'types.dart';

typedef StrokeFrameCallback = void Function(List<Stroke> partial, double progress);

class StrokeAnimator {
  final List<Stroke> strokes;
  StrokeAnimator(this.strokes);

  bool _running = false;
  int? _frameId;
  double _startTime = 0;

  bool get isPlaying => _running;

  void play({
    double speedMultiplier = 2,
    int delayBeforeStart = 200,
    int delayAfterEnd = 500,
    StrokeFrameCallback? onFrame,
    VoidCallback? onComplete,
    void Function(double)? onProgress,
  }) {
    if (strokes.isEmpty || _running) return;
    _running = true;

    final durations = strokes.map((s) {
      double dist = 0;
      for (int i = 1; i < s.points.length; i++) {
        dist += sqrt((s.points[i].x - s.points[i - 1].x) * (s.points[i].x - s.points[i - 1].x) +
            (s.points[i].y - s.points[i - 1].y) * (s.points[i].y - s.points[i - 1].y));
      }
      return min(3000.0, 50 + dist * 1.5);
    }).toList();

    final totalDuration = durations.reduce((a, b) => a + b) + 500;

    Future.delayed(Duration(milliseconds: delayBeforeStart), () {
      _startTime = DateTime.now().millisecondsSinceEpoch.toDouble();

      void tick() {
        final elapsed = ((DateTime.now().millisecondsSinceEpoch - _startTime) * speedMultiplier);
        final progress = min(1.0, elapsed / totalDuration);
        onProgress?.call(progress);

        final partial = <Stroke>[];
        double accumulated = 0;

        for (int i = 0; i < strokes.length; i++) {
          if (accumulated + durations[i] > elapsed) {
            final frac = max(0.0, (elapsed - accumulated) / durations[i]);
            final visibleCount = max(1, (strokes[i].points.length * frac).floor());
            partial.add(Stroke(
              id: strokes[i].id,
              points: strokes[i].points.take(visibleCount).toList(),
              tool: strokes[i].tool,
              brush: strokes[i].brush,
              stickerId: strokes[i].stickerId,
              timestamp: strokes[i].timestamp,
            ));
            break;
          } else {
            partial.add(strokes[i]);
            accumulated += durations[i];
          }
        }

        onFrame?.call(partial, progress);

        if (progress < 1) {
          _frameId = null;
          WidgetsBinding.instance.addPostFrameCallback((_) => tick());
        } else {
          _running = false;
          Future.delayed(Duration(milliseconds: delayAfterEnd), () => onComplete?.call());
        }
      }

      WidgetsBinding.instance.addPostFrameCallback((_) => tick());
    });
  }

  void stop() {
    _running = false;
  }
}
