import 'package:flutter/services.dart'; // For HapticFeedback

class SoundEngine {
  /// Since we lack audio assets, use haptics + system sounds
  static void toolSwitch() => HapticFeedback.selectionClick();
  static void stamp() => HapticFeedback.heavyImpact();
  static void pop() => HapticFeedback.lightImpact();
  static void success() => HapticFeedback.vibrate();
  static void erase() => HapticFeedback.mediumImpact();
}
