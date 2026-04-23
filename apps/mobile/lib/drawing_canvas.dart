import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'engine/canvas_engine.dart';
import 'engine/stroke_painter.dart';

class DrawingCanvas extends StatefulWidget {
  const DrawingCanvas({super.key});
  @override
  State<DrawingCanvas> createState() => _DrawingCanvasState();
}

class _DrawingCanvasState extends State<DrawingCanvas> {
  late final CanvasEngine _engine = CanvasEngine(width: 1200, height: 800);

  Future<void> exportPng() async {
    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder, Rect.fromLTWH(0, 0, _engine.width, _engine.height));
    final painter = StrokePainter(_engine, showDots: _engine.background == 'dots');
    painter.paint(canvas, Size(_engine.width, _engine.height));
    final picture = recorder.endRecording();
    final img = await picture.toImage(_engine.width.toInt(), _engine.height.toInt());
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) return;
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/drawing_${DateTime.now().millisecondsSinceEpoch}.png');
    await file.writeAsBytes(bytes.buffer.asUint8List());
    await Share.shareXFiles([XFile(file.path)], text: 'My drawing!');
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: (d) {
        final s = MediaQuery.of(context).size;
        final x = d.localPosition.dx * (_engine.width / s.width);
        final y = d.localPosition.dy * (_engine.height / s.height);
        _engine.beginStroke(x, y);
        if (_engine.tool == ToolType.sticker) {
          _engine.addPoint(x, y);
          _engine.endStroke();
        }
      },
      onPanUpdate: (d) {
        if (_engine.tool == ToolType.sticker) return;
        final s = MediaQuery.of(context).size;
        final x = d.localPosition.dx * (_engine.width / s.width);
        final y = d.localPosition.dy * (_engine.height / s.height);
        _engine.addPoint(x, y);
      },
      onPanEnd: (_) { if (_engine.tool != ToolType.sticker) _engine.endStroke(); },
      child: CustomPaint(
        size: Size.infinite,
        painter: StrokePainter(_engine),
      ),
    );
  }
}
