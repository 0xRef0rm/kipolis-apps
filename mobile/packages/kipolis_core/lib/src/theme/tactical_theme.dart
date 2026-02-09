import 'package:flutter/material.dart';

class TacticalTheme {
  // Colors - Tactical Dark & Emergency Red
  static const Color obsidian = Color(0xFF0F0F12);
  static const Color cardBg = Color(0xFF1E1E24);
  static const Color emergencyRed = Color(0xFFE53935);
  static const Color tacticalBlue = Color(0xFF2196F3);
  static const Color textHigh = Color(0xFFF8FAFC);
  static const Color textDim = Color(0xFF94A3B8);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: obsidian,
      colorScheme: const ColorScheme.dark(
        primary: emergencyRed,
        secondary: tacticalBlue,
        surface: cardBg,
        error: emergencyRed,
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          color: textHigh,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
        bodyLarge: TextStyle(color: textHigh),
        bodyMedium: TextStyle(color: textDim),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cardBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        labelStyle: const TextStyle(color: textDim),
        prefixIconColor: textDim,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: emergencyRed,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.1,
          ),
        ),
      ),
    );
  }
}
