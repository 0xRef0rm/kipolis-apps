import 'dart:async';
import 'package:flutter/material.dart';
import 'package:kipolis_core/kipolis_core.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:permission_handler/permission_handler.dart';
import '../incident/incident_tracking_screen.dart';

class PanicHubScreen extends StatefulWidget {
  const PanicHubScreen({super.key});

  @override
  State<PanicHubScreen> createState() => _PanicHubScreenState();
}

class _PanicHubScreenState extends State<PanicHubScreen> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _holdController;
  late Animation<double> _pulseAnimation;
  
  Position? _currentPosition;
  bool _isLocating = true;
  bool _isTriggering = false;
  StreamSubscription<Position>? _positionStream;
  String _statusMessage = "SISTEM SIAP";
  Color _statusColor = Colors.greenAccent;

  @override
  void initState() {
    super.initState();
    _initPulseAnimation();
    _checkLocationPermission();
  }

  void _initPulseAnimation() {
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _holdController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed) {
          _executeEmergencyTrigger();
        }
      });
  }

  Future<void> _checkLocationPermission() async {
    final simulateLocation = dotenv.get('SIMULATE_LOCATION', fallback: 'false') == 'true';
    if (simulateLocation) {
      _startSimulatedLocation();
      return;
    }

    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _isLocating = false);
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() => _isLocating = false);
        return;
      }
    }

    _startLocationStream();
  }

  void _startSimulatedLocation() {
    setState(() {
      _statusMessage = "MODE SIMULASI AKTIF";
      _statusColor = Colors.orangeAccent;
    });
    
    // Simulate a slight delay for better UX
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _currentPosition = Position(
            latitude: -6.1751, // Jakarta Monas
            longitude: 106.8272,
            timestamp: DateTime.now(),
            accuracy: 5.0,
            altitude: 0.0,
            heading: 0.0,
            speed: 0.0,
            speedAccuracy: 0.0,
            altitudeAccuracy: 0.0,
            headingAccuracy: 0.0,
          );
          _isLocating = false;
        });
      }
    });
  }

  List<Map<String, dynamic>> _breadcrumbBuffer = [];
  
  void _startLocationStream() {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _isLocating = false;
          
          // Add to breadcrumb buffer (keep last 10 points for context)
          _breadcrumbBuffer.add({
            "latitude": position.latitude,
            "longitude": position.longitude,
            "timestamp": DateTime.now().toIso8601String(),
            "accuracy": position.accuracy,
          });
          
          if (_breadcrumbBuffer.length > 10) {
            _breadcrumbBuffer.removeAt(0);
          }
        });
      }
    });
  }

  Future<void> _executeEmergencyTrigger() async {
    if (_currentPosition == null) {
      _showToast("Menunggu sinyal GPS...");
      _holdController.reset();
      return;
    }

    // Inform user if accuracy is low, but DON'T block the trigger
    bool lowAccuracy = _currentPosition!.accuracy > 50;
    if (lowAccuracy) {
      _showToast("Peringatan: Sinyal GPS lemah, tetap kirimkan...");
    }

    setState(() {
      _isTriggering = true;
      _statusMessage = "MENGIRIM PERINGATAN...";
      _statusColor = TacticalTheme.emergencyRed;
    });

    try {
      final response = await ApiClient.post(
        "/incidents",
        {
          "latitude": _currentPosition!.latitude,
          "longitude": _currentPosition!.longitude,
          "accuracy": _currentPosition!.accuracy,
          "is_low_accuracy": lowAccuracy,
          "trigger_type": "manual_panic",
          "breadcrumbs": _breadcrumbBuffer, // Send movement context
          "device_info": {
            "platform": "mobile_app",
            "battery_level": "unknown", // Potential addition
            "timestamp": DateTime.now().toIso8601String(),
          }
        },
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final String incidentId = data['data']['incident_id'];
        
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => IncidentTrackingScreen(incidentId: incidentId),
            ),
          );
        }
      } else {
        _showToast("Kesalahan Server: ${response.statusCode}");
      }
    } catch (e) {
      _showToast("Kesalahan Jaringan: Periksa Koneksi");
    } finally {
      if (mounted) {
        setState(() => _isTriggering = false);
        _holdController.reset();
      }
    }
  }

  void _showEmergencySuccess() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: TacticalTheme.cardBg,
        title: const Icon(Icons.check_circle, color: Colors.greenAccent, size: 64),
        content: const Text(
          "EMERGENSI DIKIRIMKAN\nUnit sedang dikerahkan ke lokasi Anda.",
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("MENGERTI"),
          )
        ],
      ),
    );
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: TacticalTheme.cardBg),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _holdController.dispose();
    _positionStream?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text("PUSAT DARURAT", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.person_outline, color: TacticalTheme.textDim),
          )
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 40),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TacticalTheme.cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  Icon(Icons.wifi_tethering, color: _statusColor, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_statusMessage, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const Text("Koneksi: Stabil", style: TextStyle(color: TacticalTheme.textDim, fontSize: 11)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text("AMAN", style: TextStyle(color: _statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
                  )
                ],
              ),
            ),
          ),
          const Spacer(),
          // Giant Hold-to-Trigger Panic Button
          GestureDetector(
            onLongPressStart: (_) => _holdController.forward(),
            onLongPressEnd: (_) => _holdController.reverse(),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Hold Progress Indicator (Outer Ring)
                SizedBox(
                  width: 200,
                  height: 200,
                  child: AnimatedBuilder(
                    animation: _holdController,
                    builder: (context, child) => CircularProgressIndicator(
                      value: _holdController.value,
                      strokeWidth: 8,
                      color: TacticalTheme.emergencyRed,
                      backgroundColor: Colors.white10,
                    ),
                  ),
                ),
                // Pulse Rings
                ScaleTransition(
                  scale: _pulseAnimation,
                  child: Container(
                    width: 170,
                    height: 170,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: TacticalTheme.emergencyRed.withOpacity(0.1),
                    ),
                  ),
                ),
                // Main Button
                Container(
                  width: 130,
                  height: 130,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: TacticalTheme.emergencyRed,
                    boxShadow: [
                      BoxShadow(
                        color: TacticalTheme.emergencyRed.withOpacity(0.5),
                        blurRadius: 30,
                        spreadRadius: 5,
                      )
                    ],
                  ),
                  child: _isTriggering 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.warning_rounded, color: Colors.white, size: 36),
                            const Text("TAHAN", style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
                          ],
                        ),
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            "TAHAN SELAMA 2 DETIK",
            style: TextStyle(color: TacticalTheme.emergencyRed, fontWeight: FontWeight.bold, letterSpacing: 2),
          ),
          const Text(
            "Tekan jika ada ancaman mendesak",
            style: TextStyle(color: TacticalTheme.textDim, fontSize: 12),
          ),
          const Spacer(),
          // GPS Status Bar
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: TacticalTheme.cardBg,
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: TacticalTheme.tacticalBlue),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("LOKALISASI", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: TacticalTheme.textDim, letterSpacing: 1)),
                      Text(
                        _isLocating ? "Mencari Satelit..." : (_currentPosition != null ? "${_currentPosition!.latitude.toStringAsFixed(5)}, ${_currentPosition!.longitude.toStringAsFixed(5)}" : "GPS Dinonaktifkan"),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                if (_isLocating) 
                  const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                else
                  const Icon(Icons.check_circle, color: Colors.greenAccent, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
