import 'dart:math';
import 'package:flutter/material.dart';
import 'types.dart';
import 'canvas_engine.dart';

class StrokePainter extends CustomPainter {
  final CanvasEngine engine;
  final bool showDots;
  StrokePainter(this.engine, {this.showDots = false}) : super(repaint: engine);

  @override
  void paint(Canvas canvas, Size size) {
    // Background
    final bg = _parseColor(engine.background);
    if (engine.background == 'dots') {
      canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), Paint()..color = Colors.white);
      _drawDotGrid(canvas, size);
    } else {
      canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), Paint()..color = bg);
    }

    // Layers -> strokes
    for (final layer in engine.layers) {
      if (!layer.visible) continue;
      for (final stroke in layer.strokes) {
        _renderStroke(canvas, stroke);
      }
    }

    // Active stroke
    final active = engine.activeStrokePoints;
    if (active.length >= 2 && engine.tool != ToolType.sticker) {
      _renderLiveStroke(canvas, active);
    }
  }

  @override
  bool shouldRepaint(covariant StrokePainter old) => true;

  void _renderStroke(Canvas canvas, Stroke stroke) {
    final pts = stroke.points;
    if (pts.length < 2) return;
    final tool = stroke.tool;
    final brush = stroke.brush;

    if (tool == ToolType.eraser) {
      final p = Paint()
        ..color = Colors.black.withOpacity(0)
        ..strokeWidth = brush.size * 3
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..blendMode = BlendMode.clear;
      _drawPath(canvas, pts, p);
    } else if (tool == ToolType.spray) {
      _drawSpray(canvas, pts, brush);
    } else if (tool == ToolType.rainbow) {
      _drawRainbow(canvas, pts, brush);
    } else if (tool == ToolType.crayon) {
      _drawCrayon(canvas, pts, brush);
    } else if (tool == ToolType.marker) {
      _drawMarker(canvas, pts, brush);
    } else {
      final p = Paint()
        ..color = _parseColor(brush.color)
        ..strokeWidth = brush.size
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      _drawPath(canvas, pts, p);
    }
  }

  void _renderLiveStroke(Canvas canvas, List<Point> pts) {
    final p = Paint()
      ..color = _parseColor(engine.brush.color)
      ..strokeWidth = engine.brush.size
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    _drawPath(canvas, pts, p);
  }

  void _drawPath(Canvas canvas, List<Point> pts, Paint paint) {
    final path = Path();
    path.moveTo(pts[0].x, pts[0].y);
    for (int i = 1; i < pts.length - 1; i++) {
      final mx = (pts[i].x + pts[i + 1].x) / 2;
      final my = (pts[i].y + pts[i + 1].y) / 2;
      path.quadraticBezierTo(pts[i].x, pts[i].y, mx, my);
    }
    path.lineTo(pts.last.x, pts.last.y);
    canvas.drawPath(path, paint);
  }

  void _drawSpray(Canvas canvas, List<Point> pts, BrushConfig brush) {
    final rnd = Random(pts.first.x.toInt());
    for (final p in pts) {
      final count = (brush.size * 0.8).round().clamp(4, 40);
      for (int i = 0; i < count; i++) {
        final a = rnd.nextDouble() * pi * 2;
        final r = rnd.nextDouble() * brush.size;
        final dot = Paint()
          ..color = _parseColor(brush.color).withOpacity(rnd.nextDouble() * brush.opacity * 0.5)
          ..strokeWidth = brush.size * (0.2 + rnd.nextDouble() * 0.3);
        canvas.drawCircle(Offset(p.x + cos(a) * r, p.y + sin(a) * r), dot.strokeWidth / 2, dot);
      }
    }
  }

  void _drawRainbow(Canvas canvas, List<Point> pts, BrushConfig brush) {
    final rainbow = [Colors.red, Colors.orange, Colors.yellow, Colors.green, Colors.blue, Colors.indigo, Colors.purple];
    final step = 2;
    for (int i = 1; i < pts.length; i += step) {
      final p = Paint()
        ..color = rainbow[(i ~/ step) % rainbow.length].withOpacity(brush.opacity)
        ..strokeWidth = brush.size
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;
      final a = pts[i - 1]; final b = pts[min(i, pts.length - 1)];
      canvas.drawLine(Offset(a.x, a.y), Offset(b.x, b.y), p);
    }
  }

  void _drawCrayon(Canvas canvas, List<Point> pts, BrushConfig brush) {
    final p = Paint()..color = _parseColor(brush.color).withOpacity(0.6)..strokeWidth = brush.size..strokeCap = StrokeCap.round..style = PaintingStyle.stroke;
    _drawPath(canvas, pts, p);
  }

  void _drawMarker(Canvas canvas, List<Point> pts, BrushConfig brush) {
    final c = _parseColor(brush.color);
    final outer = Paint()..color = c.withOpacity(brush.opacity)..strokeWidth = brush.size * 1.1..strokeCap = StrokeCap.square..strokeJoin = StrokeJoin.round..style = PaintingStyle.stroke;
    _drawPath(canvas, pts, outer);
  }

  void _drawDotGrid(Canvas canvas, Size size) {
    final p = Paint()..color = const Color(0xffcbd5e1);
    const step = 40.0;
    for (double x = step; x < size.width; x += step) {
      for (double y = step; y < size.height; y += step) {
        canvas.drawRect(Rect.fromCenter(center: Offset(x, y), width: 4, height: 4), p);
      }
    }
  }

  Color _parseColor(String hex) {
    if (hex == 'transparent' || hex == 'dots') return Colors.transparent;
    hex = hex.replaceFirst('#', '').trim();
    if (hex.length == 6) hex = 'FF\$hex';
    return Color(int.parse(hex, radix: 16));
  }
}
