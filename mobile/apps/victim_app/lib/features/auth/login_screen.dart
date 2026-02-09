import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kipolis_core/kipolis_core.dart';
import '../panic/panic_hub_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    if (_phoneController.text.isEmpty || _otpController.text.isEmpty) {
      setState(() => _errorMessage = "Harap isi semua kolom");
      return;
    }

    if (_phoneController.text.length < 10) {
      setState(() => _errorMessage = "Nomor telepon minimal 10 digit");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final deviceInfo = DeviceInfoPlugin();
      String deviceId = "unknown_device";
      
      if (Theme.of(context).platform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
      } else if (Theme.of(context).platform == TargetPlatform.iOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? "unknown_ios";
      }

      // TODO: Replace with your actual local IP or dynamic URL
      const apiUrl = "http://10.0.2.2:3000/api/v1"; 

      final response = await http.post(
        Uri.parse("$apiUrl/victim/auth/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "phone": _phoneController.text,
          "otp": _otpController.text,
          "device_id": deviceId,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', data['data']['token']);
        
        final bool needsRegistration = data['data']['user']['needs_registration'] ?? false;

        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => needsRegistration 
                ? const RegisterScreen() 
                : const PanicHubScreen()
            ),
          );
        }
      } else {
        setState(() => _errorMessage = data['message'] ?? "Autentikasi gagal");
      }
    } catch (e) {
      setState(() => _errorMessage = "Kesalahan koneksi. Pastikan backend berjalan.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: TacticalTheme.emergencyRed,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.shield, color: Colors.white, size: 32),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    "KIPOLIS",
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                "SISTEM PERLINDUNGAN WARGA",
                style: TextStyle(
                  color: TacticalTheme.tacticalBlue,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 48),
              const Text(
                "Verifikasi Identitas",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                "Akses terbatas bagi warga yang terverifikasi.",
                style: TextStyle(color: TacticalTheme.textDim),
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: "Nomor Telepon",
                  prefixIcon: Icon(Icons.phone),
                  hintText: "8123456789",
                ),
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(13),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _otpController,
                decoration: const InputDecoration(
                  labelText: "Verifikasi OTP",
                  prefixIcon: Icon(Icons.lock_clock),
                  hintText: "123456",
                ),
                keyboardType: TextInputType.number,
                obscureText: true,
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 20),
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: TacticalTheme.emergencyRed),
                ),
              ],
              const Spacer(),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("OTORISASI AKSES"),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
