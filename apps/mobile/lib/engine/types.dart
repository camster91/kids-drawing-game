class Point {
  final double x; final double y; final double pressure;
  Point(this.x, this.y, {this.pressure = 1.0});
  Point.lerp(Point a, Point b, double t)
    : x = a.x * t + b.x * (1 - t),
      y = a.y * t + b.y * (1 - t),
      pressure = a.pressure * t + b.pressure * (1 - t);
}

enum ToolType { pencil, marker, crayon, spray, rainbow, eraser, sticker }

class BrushConfig {
  double size; String color; double opacity; double smoothing;
  BrushConfig({required this.size, required this.color, this.opacity = 1.0, this.smoothing = 0.5});
  BrushConfig copy() => BrushConfig(size: size, color: color, opacity: opacity, smoothing: smoothing);
}

class Stroke {
  final String id;
  final List<Point> points;
  final ToolType tool;
  final BrushConfig brush;
  final String? stickerId;
  final int timestamp;
  Stroke({required this.id, required this.points, required this.tool, required this.brush, this.stickerId, required this.timestamp});
}

class CanvasLayer {
  final String id; String name;
  bool visible; bool locked;
  List<Stroke> strokes;
  CanvasLayer({required this.id, required this.name, this.visible = true, this.locked = false, required this.strokes});
}
