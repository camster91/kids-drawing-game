import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'engine/canvas_engine.dart';
import 'engine/stroke_painter.dart';
import 'engine/guided_drawing.dart' as guide;
import 'engine/animator.dart';
import 'engine/sound_engine.dart';

void main() => runApp(const DrawingApp());

class DrawingApp extends StatelessWidget {
  const DrawingApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: "🎨 Kids Drawing",
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff6366f1)),
      fontFamily: 'Fredoka',
    ),
    home: const DrawingScreen(),
  );
}

class DrawingScreen extends StatefulWidget {
  const DrawingScreen({super.key});
  @override
  State<DrawingScreen> createState() => _DrawingScreenState();
}

class _DrawingScreenState extends State<DrawingScreen> {
  late final CanvasEngine _engine;
  String _mode = 'free';
  guide.TracingPath? _activeGuide;
  final Map<String, List<Point>> _tracedPaths = {};
  bool _soundOn = true;
  StrokeAnimator? _animator;
  double _animProgress = 0;
  List<Stroke> _partialStrokes = [];

  @override
  void initState() {
    super.initState();
    _engine = CanvasEngine(width: 1200, height: 800);
    _engine.addListener(() => setState(() {}));
  }

  void _playSound(void Function() fn) { if (_soundOn) fn(); }

  Color _parse(String hex) {
    hex = hex.replaceFirst('#', '').trim();
    if (hex.length == 6) hex = 'FF\$hex';
    return Color(int.parse(hex, radix: 16));
  }

  Widget _toolBtn(IconData icon, ToolType tool, String label) {
    final active = _engine.tool == tool;
    return IconButton(
      icon: Icon(icon, color: active ? const Color(0xff6366f1) : Colors.grey.shade600),
      tooltip: label,
      onPressed: () => setState(() {
        _engine.tool = tool;
        _playSound(SoundEngine.toolSwitch);
      }),
    );
  }

  void _startPlayback() {
    final all = _engine.layers.expand((l) => l.strokes).toList();
    if (all.isEmpty) return;
    _animator?.stop();
    setState(() { _mode = 'playback'; _partialStrokes = []; _animProgress = 0; });
    _animator = StrokeAnimator(all);
    _animator!.play(
      speedMultiplier: 2,
      onFrame: (partial, progress) {
        setState(() { _partialStrokes = partial; _animProgress = progress; });
      },
      onComplete: () => setState(() { _mode = 'free'; _partialStrokes = []; }),
    );
  }

  void _checkTracing() {
    if (_activeGuide == null) return;
    final userStrokes = _engine.layers.expand((l) => l.strokes).where((s) => s.tool != ToolType.sticker).toList();
    if (userStrokes.isEmpty) return;
    final last = userStrokes.last;
    final score = guide.checkTracing(last.points, _activeGuide!.points, tolerance: 35);
    if (score >= 0.5) {
      setState(() => _tracedPaths[_activeGuide!.id] = last.points.toList());
      _playSound(SoundEngine.success);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xff6366f1),
        foregroundColor: Colors.white,
        title: const Text("🎨 Kids Drawing", style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(icon: const Icon(Icons.undo), onPressed: _engine.canUndo ? () => setState(_engine.undo) : null),
          IconButton(icon: const Icon(Icons.redo), onPressed: _engine.canRedo ? () => setState(_engine.redo) : null),
          IconButton(icon: const Icon(Icons.delete_outline), onPressed: () { setState(_engine.clearAll); _engine.snapshot(); _playSound(SoundEngine.erase); }),
          IconButton(icon: const Icon(Icons.play_circle_outline), onPressed: _startPlayback),
        ],
      ),
      body: Column(
        children: [
          // Mode bar
          Container(
            height: 44,
            color: const Color(0xfff1f5f9),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              children: [
                _modeChip('free', '🎨 Free Draw'),
                _modeChip('guided', '🔍 Guided'),
                _modeChip('playback', '▶️ Watch Back'),
                IconButton(icon: Icon(_soundOn ? Icons.volume_up : Icons.volume_off, size: 20),
                  onPressed: () => setState(() => _soundOn = !_soundOn), padding: EdgeInsets.zero),
              ],
            ),
          ),

          // Lesson bar
          if (_mode == 'guided')
            Container(
              height: 48,
              color: Colors.white,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: guide.builtinLessons.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (_, i) {
                  final lesson = guide.builtinLessons[i];
                  return ActionChip(
                    label: Text(lesson.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    backgroundColor: _activeGuide != null && _activeGuide!.id == lesson.paths.first.id
                        ? const Color(0xff6366f1) : null,
                    labelStyle: TextStyle(color: _activeGuide != null && _activeGuide!.id == lesson.paths.first.id
                        ? Colors.white : const Color(0xff475569)),
                    onPressed: () => setState(() {
                      _activeGuide = lesson.paths.first;
                      _tracedPaths.clear();
                      _engine.clearAll();
                      _engine.snapshot();
                    }),
                  );
                },
              ),
            ),

          // Tools + size
          Container(
            height: 52,
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _toolBtn(Icons.edit, ToolType.pencil, "Pencil"),
                  _toolBtn(Icons.brush, ToolType.marker, "Marker"),
                  _toolBtn(Icons.colorize, ToolType.crayon, "Crayon"),
                  _toolBtn(Icons.auto_awesome, ToolType.rainbow, "Rainbow"),
                  _toolBtn(Icons.scatter_plot, ToolType.spray, "Spray"),
                  _toolBtn(Icons.auto_fix_normal, ToolType.eraser, "Eraser"),
                  if (_mode != 'playback')
                    IconButton(
                      icon: Icon(Icons.star, color: _engine.tool == ToolType.sticker ? const Color(0xff6366f1) : Colors.grey.shade600),
                      onPressed: () => setState(() => _engine.tool = ToolType.sticker),
                    ),
                  const SizedBox(width: 8),
                  SizedBox(width: 120, child: Slider(
                    value: _engine.brush.size, min: 2, max: 48, divisions: 23,
                    label: _engine.brush.size.toStringAsFixed(0),
                    onChanged: (v) => setState(() => _engine.brush.size = v),
                  )),
                ],
              ),
            ),
          ),

          // Palette
          if (_mode != 'playback')
            Container(
              height: 46,
              color: Colors.grey.shade50,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                itemCount: _palette.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (_, i) {
                  final col = _palette[i];
                  final sel = _engine.brush.color == col;
                  return GestureDetector(
                    onTap: () => setState(() => _engine.brush.color = col),
                    child: Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(
                        color: _parse(col), shape: BoxShape.circle,
                        border: Border.all(color: sel ? const Color(0xff1e293b) : Colors.transparent, width: 3),
                      ),
                    ),
                  );
                },
              ),
            ),

          // Sticker tray
          if (_engine.tool == ToolType.sticker)
            Container(
              height: 52,
              color: Colors.white,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: _stickers.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final s = _stickers[i];
                  return GestureDetector(
                    onTap: () => setState(() => _engine.selectedSticker = s['id']!),
                    child: SvgPicture.asset('assets/stickers/${s['id']}.svg',
                      width: 32, height: 32,
                      colorFilter: s['id'] == _engine.selectedSticker
                        ? const ColorFilter.mode(Color(0xff6366f1), BlendMode.srcIn)
                        : const ColorFilter.mode(Colors.grey, BlendMode.srcIn)),
                  );
                },
              ),
            ),

          // Canvas
          Expanded(
            child: Container(
              color: const Color(0xffe2e8f0),
              padding: const EdgeInsets.all(8),
              child: AspectRatio(
                aspectRatio: _engine.width / _engine.height,
                child: Listener(
                  onPointerDown: (d) {
                    if (_mode == 'playback') return;
                    final sz = context.size ?? MediaQuery.of(context).size;
                    final x = d.localPosition.dx * (_engine.width / sz.width);
                    final y = d.localPosition.dy * (_engine.height / sz.height);
                    _engine.beginStroke(x, y);
                    if (_engine.tool == ToolType.sticker) {
                      _engine.addPoint(x, y);
                      _engine.endStroke();
                      _engine.snapshot();
                      _playSound(SoundEngine.stamp);
                      if (_mode == 'guided') _checkTracing();
                    }
                  },
                  onPointerMove: (d) {
                    if (_mode == 'playback' || _engine.tool == ToolType.sticker) return;
                    final sz = context.size ?? MediaQuery.of(context).size;
                    _engine.addPoint(d.localPosition.dx * (_engine.width / sz.width),
                        d.localPosition.dy * (_engine.height / sz.height));
                    setState(() {});
                  },
                  onPointerUp: (_) {
                    if (_mode == 'playback' || _engine.tool == ToolType.sticker) return;
                    _engine.endStroke();
                    _engine.snapshot();
                    _playSound(SoundEngine.pop);
                    if (_mode == 'guided') _checkTracing();
                    setState(() {});
                  },
                  child: CustomPaint(
                    size: Size.infinite,
                    painter: _DrawingPainter(
                      engine: _engine,
                      mode: _mode,
                      activeGuide: _activeGuide,
                      tracedPaths: _tracedPaths,
                      partialStrokes: _partialStrokes,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _modeChip(String mode, String label) {
    final active = _mode == mode;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        label: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
          color: active ? Colors.white : const Color(0xff64748b))),
        backgroundColor: active ? const Color(0xff6366f1) : Colors.white,
        side: active ? null : const BorderSide(color: Color(0xffcbd5e1)),
        onPressed: () => setState(() {
          _mode = mode;
          if (mode != 'guided') _activeGuide = null;
          if (mode == 'playback') _startPlayback();
        }),
      ),
    );
  }
}

class _DrawingPainter extends CustomPainter {
  final CanvasEngine engine;
  final String mode;
  final guide.TracingPath? activeGuide;
  final Map<String, List<Point>> tracedPaths;
  final List<Stroke> partialStrokes;

  _DrawingPainter({required this.engine, required this.mode, this.activeGuide,
    required this.tracedPaths, required this.partialStrokes,}) : super(repaint: engine);

  Color _parse(String hex) => Color(int.parse(hex.replaceFirst('#', 'FF'), radix: 16));

  @override
  void paint(Canvas canvas, Size size) {
    final bg = engine.background == 'dots' ? Colors.white : _parse(engine.background);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), Paint()..color = bg);

    if (engine.background == 'dots') {
      final p = Paint()..color = const Color(0xffcbd5e1);
      const step = 40.0;
      for (double x = step; x < size.width; x += step) {
        for (double y = step; y < size.height; y += step) {
          canvas.drawRect(Rect.fromCenter(center: Offset(x, y), width: 4, height: 4), p);
        }
      }
    }

    // Guide paths
    if (mode == 'guided' && activeGuide != null) {
      final paint = Paint()
        ..color = _parse(activeGuide!.color)
        ..strokeWidth = activeGuide!.lineWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      final path = Path();
      final pts = activeGuide!.points;
      path.moveTo(pts[0].x, pts[0].y);
      for (int i = 1; i < pts.length - 1; i++) {
        final mx = (pts[i].x + pts[i + 1].x) / 2;
        final my = (pts[i].y + pts[i + 1].y) / 2;
        path.quadraticBezierTo(pts[i].x, pts[i].y, mx, my);
      }
      path.lineTo(pts.last.x, pts.last.y);
      canvas.drawPath(path, paint);
    }

    // Traced paths
    if (mode == 'guided') {
      for (final entry in tracedPaths.entries) {
        final paint = Paint()
          ..color = const Color(0xff22c55e)
          ..strokeWidth = 4
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round;
        final path = Path();
        final pts = entry.value;
        path.moveTo(pts[0].x, pts[0].y);
        for (int i = 1; i < pts.length - 1; i++) {
          final mx = (pts[i].x + pts[i + 1].x) / 2;
          final my = (pts[i].y + pts[i + 1].y) / 2;
          path.quadraticBezierTo(pts[i].x, pts[i].y, mx, my);
        }
        path.lineTo(pts.last.x, pts.last.y);
        canvas.drawPath(path, paint);
      }
    }

    // Layers (or partial for playback)
    if (mode == 'playback') {
      for (final s in partialStrokes) {
        _renderStroke(canvas, s);
      }
    } else {
      for (final layer in engine.layers) {
        if (!layer.visible) continue;
        for (final s in layer.strokes) {
          _renderStroke(canvas, s);
        }
      }
      // Active stroke
      final active = engine.activeStrokePoints;
      if (active.length >= 2) {
        final p = Paint()
          ..color = _parse(engine.brush.color)
          ..strokeWidth = engine.brush.size
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke;
        _drawPath(canvas, active, p);
      }
    }
  }

  void _renderStroke(Canvas canvas, Stroke s) {
    if (s.points.length < 2) return;
    final tool = s.tool; final brush = s.brush;

    if (tool == ToolType.eraser) {
      final p = Paint()
        ..color = Colors.black.withOpacity(0)
        ..strokeWidth = brush.size * 3
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..blendMode = BlendMode.clear;
      _drawPath(canvas, s.points, p);
    } else if (tool == ToolType.sticker && s.stickerId != null) {
      final last = s.points.last;
      final paint = Paint()..color = _parse(brush.color);
      canvas.drawCircle(Offset(last.x, last.y), brush.size * 2, paint);
    } else if (tool == ToolType.rainbow) {
      final rainbow = [Colors.red, Colors.orange, Colors.yellow, Colors.green, Colors.blue, Colors.indigo, Colors.purple];
      for (int i = 1; i < s.points.length; i += 2) {
        final paint = Paint()
          ..color = rainbow[(i ~/ 2) % rainbow.length].withOpacity(brush.opacity)
          ..strokeWidth = brush.size
          ..strokeCap = StrokeCap.round
          ..style = PaintingStyle.stroke;
        canvas.drawLine(Offset(s.points[i-1].x, s.points[i-1].y), Offset(s.points[i].x, s.points[i].y), paint);
      }
    } else {
      final p = Paint()
        ..color = _parse(brush.color)
        ..strokeWidth = brush.size
        ..strokeCap = tool == ToolType.marker ? StrokeCap.square : StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      _drawPath(canvas, s.points, p);
    }
  }

  void _drawPath(Canvas c, List<Point> pts, Paint p) {
    final path = Path();
    path.moveTo(pts[0].x, pts[0].y);
    for (int i = 1; i < pts.length - 1; i++) {
      final mx = (pts[i].x + pts[i + 1].x) / 2;
      final my = (pts[i].y + pts[i + 1].y) / 2;
      path.quadraticBezierTo(pts[i].x, pts[i].y, mx, my);
    }
    path.lineTo(pts.last.x, pts.last.y);
    c.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant _DrawingPainter old) => true;
}

final _palette = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#6366f1','#14b8a6','#f43f5e','#84cc16','#ec4899','#000000'];
const _stickers = [
  {'id':'star','label':'Star'},
  {'id':'heart','label':'Heart'},
  {'id':'smiley','label':'Smiley'},
  {'id':'rocket','label':'Rocket'},
  {'id':'flower','label':'Flower'},
  {'id':'cat','label':'Cat'},
];
