import 'dart:math';
import 'package:flutter/material.dart';
import 'types.dart';

int _idCounter = 0;
String uid() => '${DateTime.now().millisecondsSinceEpoch}-${++_idCounter}';

class CanvasEngine extends ChangeNotifier {
  double width = 1200, height = 800;
  String background = '#ffffff';
  List<CanvasLayer> layers = [];
  String activeLayerId = '';
  ToolType tool = ToolType.pencil;
  BrushConfig brush = BrushConfig(size: 8, color: '#ef4444');
  String selectedSticker = 'star';

  Stroke? _activeStroke;
  final List<List<CanvasLayer>> _history = [];
  int _historyIdx = -1;

  CanvasEngine({this.width = 1200, this.height = 800, this.background = '#ffffff'}) {
    addLayer('Layer 1');
    activeLayerId = layers.first.id;
  }

  CanvasLayer? getActiveLayer() {
    final layer = layers.cast<CanvasLayer?>().firstWhere((l) => l!.id == activeLayerId, orElse: () => null);
    if (layer == null || layer.locked) {
      return layers.cast<CanvasLayer?>().firstWhere((l) => !l!.locked, orElse: () => layers.isEmpty ? null : layers.first);
    }
    return layer;
  }

  CanvasLayer addLayer(String name) {
    final layer = CanvasLayer(id: uid(), name: name, strokes: []);
    layers.add(layer);
    return layer;
  }

  void beginStroke(double x, double y, {double pressure = 1.0}) {
    final layer = getActiveLayer();
    if (layer == null || layer.locked) return;
    _activeStroke = Stroke(
      id: uid(),
      points: [Point(x, y, pressure: pressure)],
      tool: tool,
      brush: brush.copy(),
      stickerId: tool == ToolType.sticker ? selectedSticker : null,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
  }

  void addPoint(double x, double y, {double pressure = 1.0}) {
    if (_activeStroke == null) return;
    final last = _activeStroke!.points.last;
    final s = brush.smoothing;
    final smoothX = last.x * s + x * (1 - s);
    final smoothY = last.y * s + y * (1 - s);
    _activeStroke!.points.add(Point(smoothX, smoothY, pressure: pressure));
    notifyListeners();
  }

  Stroke? endStroke() {
    if (_activeStroke == null) return null;
    final stroke = _activeStroke!;
    final layer = getActiveLayer();
    if (layer != null) layer.strokes.add(stroke);
    _activeStroke = null;
    snapshot();
    notifyListeners();
    return stroke;
  }

  List<Point> get activeStrokePoints => _activeStroke?.points.toList() ?? [];

  // ── Undo / Redo ─────────────────
  void snapshot() {
    final snap = layers.map((l) => CanvasLayer(
      id: l.id, name: l.name, visible: l.visible, locked: l.locked,
      strokes: l.strokes.map((s) => Stroke(
        id: s.id, points: s.points.toList(), tool: s.tool,
        brush: s.brush.copy(), stickerId: s.stickerId, timestamp: s.timestamp,
      )).toList(),
    )).toList();
    if (_historyIdx < _history.length - 1) {
      _history.removeRange(_historyIdx + 1, _history.length);
    }
    _history.add(snap);
    _historyIdx++;
    if (_history.length > 50) { _history.removeAt(0); _historyIdx--; }
  }

  bool undo() {
    if (_historyIdx <= 0) return false;
    _historyIdx--;
    _restore(_history[_historyIdx]);
    notifyListeners();
    return true;
  }

  bool redo() {
    if (_historyIdx >= _history.length - 1) return false;
    _historyIdx++;
    _restore(_history[_historyIdx]);
    notifyListeners();
    return true;
  }

  void _restore(List<CanvasLayer> snap) {
    layers = snap.map((l) => CanvasLayer(
      id: l.id, name: l.name, visible: l.visible, locked: l.locked,
      strokes: l.strokes.map((s) => Stroke(
        id: s.id, points: s.points.toList(), tool: s.tool,
        brush: s.brush.copy(), stickerId: s.stickerId, timestamp: s.timestamp,
      )).toList(),
    )).toList();
  }

  bool get canUndo => _historyIdx > 0;
  bool get canRedo => _historyIdx < _history.length - 1;

  void clearAll() { layers.forEach((l) { if (!l.locked) l.strokes.clear(); }); notifyListeners(); }

  int get strokeCount => layers.fold(0, (s, l) => s + l.strokes.length);
}
