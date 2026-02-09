import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:kipolis_core/kipolis_core.dart';
import '../panic/panic_hub_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _nikController = TextEditingController();
  final _addressController = TextEditingController();
  final _emailController = TextEditingController();
  final _medicalController = TextEditingController();
  String? _selectedBloodType;
  bool _isLoading = false;
  String? _errorMessage;

  final List<String> _bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  Future<void> _handleRegister() async {
    if (_nameController.text.isEmpty || 
        _nikController.text.isEmpty || 
        _addressController.text.isEmpty ||
        _selectedBloodType == null) {
      setState(() => _errorMessage = "Harap isi semua kolom WAJIB (bertanda *)");
      return;
    }

    if (_nikController.text.length != 16) {
      setState(() => _errorMessage = "NIK harus berjumlah 16 digit");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      
      final apiUrl = dotenv.get('API_URL', fallback: 'http://10.0.2.2:3000/api/v1');

      final response = await http.post(
        Uri.parse("$apiUrl/victim/auth/register"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode({
          "name": _nameController.text.toUpperCase(),
          "nik": _nikController.text,
          "address": _addressController.text,
          "blood_type": _selectedBloodType,
          "medical_conditions": _medicalController.text,
          "email": _emailController.text,
          "avatar_url": "https://ui-avatars.com/api/?name=${_nameController.text.toUpperCase()}&background=random",
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const PanicHubScreen()),
          );
        }
      } else {
        setState(() => _errorMessage = data['message'] ?? "Pendaftaran gagal");
      }
    } catch (e) {
      setState(() => _errorMessage = "Kesalahan jaringan. Periksa koneksi.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: TacticalTheme.emergencyRed,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.person_add, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    "PENDAFTARAN",
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 20),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text(
                "Lengkapi Profil Anda",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                "Pusat Komando memerlukan data resmi dan foto untuk identifikasi visual saat pengiriman bantuan.",
                style: TextStyle(color: TacticalTheme.textDim),
              ),
              const SizedBox(height: 32),
              // Profile Photo Placeholder
              Center(
                child: Stack(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: TacticalTheme.cardBg,
                        border: Border.all(color: TacticalTheme.tacticalBlue, width: 2),
                      ),
                      child: const Icon(Icons.person, size: 50, color: TacticalTheme.textDim),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: TacticalTheme.tacticalBlue,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.camera_alt, size: 20, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _nameController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: "Nama Lengkap (Sesuai KTP) *",
                  prefixIcon: Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _nikController,
                decoration: const InputDecoration(
                  labelText: "NIK (16 Digit) *",
                  prefixIcon: Icon(Icons.badge),
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(16),
                ],
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                value: _selectedBloodType,
                decoration: const InputDecoration(
                  labelText: "Golongan Darah *",
                  prefixIcon: Icon(Icons.bloodtype),
                ),
                items: _bloodTypes.map((type) => DropdownMenuItem(
                  value: type,
                  child: Text(type),
                )).toList(),
                onChanged: (value) => setState(() => _selectedBloodType = value),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(
                  labelText: "Alamat Tempat Tinggal *",
                  prefixIcon: Icon(Icons.home),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _medicalController,
                decoration: const InputDecoration(
                  labelText: "Riwayat Medis / Alergi *",
                  hintText: "Asma, Diabetes, Alergi Penisilin, dll.",
                  prefixIcon: Icon(Icons.medical_information),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: "Email (Opsional)",
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 20),
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: TacticalTheme.emergencyRed),
                ),
              ],
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleRegister,
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("SELESAIKAN PENDAFTARAN"),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
