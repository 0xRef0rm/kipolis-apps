import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:kipolis_core/kipolis_core.dart';
import 'package:victim_app/features/auth/login_screen.dart';


Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  runApp(const KipolisMobile());
}

class KipolisMobile extends StatelessWidget {
  const KipolisMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KIPOLIS Victim',
      debugShowCheckedModeBanner: false,
      theme: TacticalTheme.darkTheme,
      home: const LoginScreen(),
    );
  }
}
