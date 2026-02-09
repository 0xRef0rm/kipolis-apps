import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:kipolis_core/kipolis_core.dart';
import 'features/auth/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Load .env if it exists, otherwise use fallback
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    print("Warning: .env file not found");
  }
  runApp(const KipolisResponder());
}

class KipolisResponder extends StatelessWidget {
  const KipolisResponder({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KIPOLIS Responder',
      debugShowCheckedModeBanner: false,
      theme: TacticalTheme.darkTheme,
      home: const LoginScreen(),
    );
  }
}
