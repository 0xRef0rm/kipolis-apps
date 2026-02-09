import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:kipolis_core/kipolis_core.dart';
import '../auth/login_screen.dart';
import 'incident_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isOnDuty = false;
  String _responderName = "Petugas";
  bool _isLoading = true;
  List<Incident> _nearbyIncidents = [];
  Position? _currentPosition;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _initLocation();
  }

  Future<void> _initLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    _currentPosition = await Geolocator.getCurrentPosition();
    if (_isOnDuty) _fetchNearbyIncidents();
  }

  Future<void> _fetchNearbyIncidents() async {
    if (_currentPosition == null) return;

    try {
      final response = await ApiClient.get("/incidents/nearby?latitude=${_currentPosition!.latitude}&longitude=${_currentPosition!.longitude}");

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _nearbyIncidents = (data['data'] as List)
              .map((item) => Incident.fromJson(item))
              .toList();
        });
      }
    } catch (e) {
      print("Error fetching incidents: $e");
    }
  }

  Future<void> _updateStatus(bool status) async {
    setState(() {
      _isOnDuty = status;
    });

    if (status) {
      _fetchNearbyIncidents();
    }
  }

  Future<void> _simulateEmergency() async {
    if (_currentPosition == null) return;
    
    setState(() => _isLoading = true);
    try {
      // Note: In real app, this would be triggered by a victim. 
      // This is for dev testing to populate the list.
      await ApiClient.post(
        "/incidents",
        {
          "latitude": _currentPosition!.latitude + 0.005, // Slightly offset
          "longitude": _currentPosition!.longitude + 0.005,
          "trigger_type": "simulated_panic",
          "device_info": {"platform": "simulator"}
        },
      );
      
      _fetchNearbyIncidents();
    } catch (e) {
      print("Simulation error: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _responderName = prefs.getString('responder_name') ?? "Petugas";
      _isLoading = false;
    });
  }

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text("DASHBOARD PETUGAS", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: TacticalTheme.textDim),
            onPressed: _handleLogout,
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: TacticalTheme.cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: TacticalTheme.tacticalBlue.withOpacity(0.1),
                    child: const Icon(Icons.person, color: TacticalTheme.tacticalBlue, size: 30),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_responderName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Text("Unit Reaksi Cepat", style: TextStyle(color: TacticalTheme.textDim, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            
            // Status Toggle Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _isOnDuty ? TacticalTheme.tacticalBlue.withOpacity(0.1) : TacticalTheme.cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _isOnDuty ? TacticalTheme.tacticalBlue.withOpacity(0.5) : Colors.white10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                   Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isOnDuty ? "STATUS: ON DUTY" : "STATUS: OFF DUTY",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _isOnDuty ? TacticalTheme.tacticalBlue : TacticalTheme.textDim
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _isOnDuty ? "Melacak lokasi Anda..." : "Lokasi tidak terlacak",
                        style: const TextStyle(fontSize: 12, color: TacticalTheme.textDim),
                      ),
                    ],
                  ),
                  Switch(
                    value: _isOnDuty,
                    activeColor: TacticalTheme.tacticalBlue,
                    onChanged: (value) => _updateStatus(value),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "INSIDEN AKTIF",
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1, color: TacticalTheme.textDim),
                ),
                if (_isOnDuty)
                  IconButton(
                    icon: const Icon(Icons.refresh, size: 18, color: TacticalTheme.textDim),
                    onPressed: _fetchNearbyIncidents,
                  ),
                  const SizedBox(width: 8),
                  TextButton.icon(
                    onPressed: _simulateEmergency,
                    icon: const Icon(Icons.bug_report, size: 16, color: Colors.orange),
                    label: const Text("SIMULASI", style: TextStyle(color: Colors.orange, fontSize: 10)),
                  )
              ],
            ),
            const SizedBox(height: 16),
            
            // Incident List
            Expanded(
              child: _isOnDuty 
                ? (_nearbyIncidents.isEmpty 
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.white.withOpacity(0.05)),
                            const SizedBox(height: 16),
                            const Text("Belum ada penugasan baru", style: TextStyle(color: TacticalTheme.textDim)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: _nearbyIncidents.length,
                        itemBuilder: (context, index) {
                          final incident = _nearbyIncidents[index];
                          final distance = (incident.distanceMeters != null) 
                              ? (incident.distanceMeters! / 1000).toStringAsFixed(1)
                              : "0";
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: TacticalTheme.cardBg,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: TacticalTheme.emergencyRed.withOpacity(0.3)),
                            ),
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: TacticalTheme.emergencyRed,
                                child: Icon(Icons.warning_amber_rounded, color: Colors.white),
                              ),
                              title: const Text("DARURAT: WARGA", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              subtitle: Text("Jarak: $distance km • ${incident.triggerType}"),
                              trailing: const Icon(Icons.chevron_right, color: TacticalTheme.textDim),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => IncidentDetailScreen(incident: incident),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ))
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.bedtime_outlined, size: 64, color: Colors.white.withOpacity(0.05)),
                        const SizedBox(height: 16),
                        const Text("Aktifkan mode tugas untuk menerima insiden", style: TextStyle(color: TacticalTheme.textDim)),
                      ],
                    ),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
