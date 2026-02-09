import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:kipolis_core/kipolis_core.dart';
import 'package:geolocator/geolocator.dart';

class IncidentTrackingScreen extends StatefulWidget {
  final String incidentId;
  const IncidentTrackingScreen({super.key, required this.incidentId});

  @override
  State<IncidentTrackingScreen> createState() => _IncidentTrackingScreenState();
}

class _IncidentTrackingScreenState extends State<IncidentTrackingScreen> {
  GoogleMapController? _mapController;
  Timer? _pollingTimer;
  StreamSubscription<Position>? _positionStream;
  Incident? _incident;
  bool _isLoading = true;
  bool _isStealthMode = false;
  final Set<Marker> _markers = {};
  
  @override
  void initState() {
    super.initState();
    _fetchIncidentStatus();
    _startVictimTracking();
    // Poll every 5 seconds for updates
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchIncidentStatus());
  }

  Future<void> _startVictimTracking() async {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20, // Send update every 20 meters
      ),
    ).listen((Position position) {
      _sendBreadcrumb(position);
    });
  }

  Future<void> _sendBreadcrumb(Position position) async {
    try {
      if (_incident?.status == 'active' || _incident?.status == 'on_the_way') {
        await ApiClient.post(
          "/incidents/${widget.incidentId}/location",
          {
            "latitude": position.latitude,
            "longitude": position.longitude,
            "accuracy": position.accuracy,
          },
        );
      }
    } catch (e) {
      debugPrint("Error sending breadcrumb: $e");
    }
  }

  Future<void> _sendQuickStatus(String message) async {
    try {
      await ApiClient.post(
        "/incidents/${widget.incidentId}/location",
        {
          "latitude": _currentPosition?.latitude ?? 0,
          "longitude": _currentPosition?.longitude ?? 0,
          "accuracy": _currentPosition?.accuracy ?? 0,
          "status_update": message, // Backend can handle this in breadcrumbs/notes
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Laporan Dikirim: $message"), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      debugPrint("Error sending quick status: $e");
    }
  }

  Future<void> _fetchIncidentStatus() async {
    try {
      final response = await ApiClient.get("/incidents/${widget.incidentId}/responder");
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'];
        
        // Update local state
        setState(() {
          // We map the responder info to our model structure
          // The backend returns { responder: {...}, status: "...", distance_km: ... }
          if (data['responder'] != null) {
            final responderData = data['responder'];
            final responder = Responder(
              id: responderData['id'],
              name: responderData['name'],
              phone: responderData['phone'],
              type: responderData['type'],
              status: responderData['status'],
              badgeNumber: responderData['badge_number'],
              latitude: responderData['current_latitude'] != null ? double.parse(responderData['current_latitude'].toString()) : null,
              longitude: responderData['current_longitude'] != null ? double.parse(responderData['current_longitude'].toString()) : null,
            );
            
            // Update incident locally
            _incident = Incident(
              id: widget.incidentId,
              userId: '', // Not needed for UI
              status: data['status'],
              severity: 'high',
              createdAt: DateTime.now(),
              latitude: 0, // Will be updated if we had original loc
              longitude: 0,
              responder: responder,
              distanceMeters: data['distance_km'] != null ? data['distance_km'] * 1000 : null,
            );
            
            _updateMarkers();
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching tracking status: $e");
    }
  }

  void _updateMarkers() {
    if (_incident?.responder?.latitude != null) {
      setState(() {
        _markers.clear();
        _markers.add(
          Marker(
            markerId: const MarkerId('responder'),
            position: LatLng(_incident!.responder!.latitude!, _incident!.responder!.longitude!),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
            infoWindow: InfoWindow(title: 'Petugas: ${_incident!.responder!.name}'),
          ),
        );
        
        // If map is ready, move camera to show responder
        _mapController?.animateCamera(
          CameraUpdate.newLatLng(LatLng(_incident!.responder!.latitude!, _incident!.responder!.longitude!)),
        );
      });
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _positionStream?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("PELACAKAN BANTUAN", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(_isStealthMode ? Icons.visibility_off : Icons.visibility, color: _isStealthMode ? Colors.white24 : Colors.white),
            onPressed: () => setState(() => _isStealthMode = !_isStealthMode),
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // GoogleMap(
          //   initialCameraPosition: const CameraPosition(
          //     target: LatLng(-6.1751, 106.8272), // Default Jakarta
          //     zoom: 15,
          //   ),
          //   onMapCreated: (controller) => _mapController = controller,
          //   markers: _markers,
          //   myLocationEnabled: true,
          //   zoomControlsEnabled: false,
          //   mapStyle: null, // Could add dark mode style here
          // ),
          
          // Placeholder for Map when API Key is pending
          Container(
            color: const Color(0xFF121216),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.map_outlined, color: Colors.white10, size: 64),
                  const SizedBox(height: 16),
                  Text(
                    "PETA TAKTIS OFFLINE",
                    style: TextStyle(
                      color: Colors.white24, 
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2
                    ),
                  ),
                  const Text(
                    "(MENUNGGU AKTIVASI GOOGLE MAPS API)",
                    style: TextStyle(color: Colors.white10, fontSize: 10),
                  ),
                ],
              ),
            ),
          ),
          
          if (_isLoading)
            const Center(child: CircularProgressIndicator()),
            
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildStatusCard(),
          ),
          
          // Stealth Mode Overlay
          if (_isStealthMode)
            GestureDetector(
              onLongPress: () => setState(() => _isStealthMode = false),
              child: Container(
                color: Colors.black,
                width: double.infinity,
                height: double.infinity,
                child: const Center(
                  child: Text(
                    "STEALTH MODE AKTIF\n(Tahan lama untuk mematikan)",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white10, fontSize: 10),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    if (_incident?.responder == null) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: TacticalTheme.cardBg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: TacticalTheme.emergencyRed),
            const SizedBox(height: 16),
            const Text(
              "MENCARI PETUGAS TERDEKAT...",
              style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            const Text(
              "Tetap tenang, operator kami sedang mengalokasikan bantuan.",
              style: TextStyle(color: TacticalTheme.textDim, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: TacticalTheme.cardBg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.verified_user, color: Colors.green),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("PETUGAS MENUJU LOKASI", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                    Text(_incident!.responder!.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {}, // Link to call responder
                icon: const Icon(Icons.phone, color: TacticalTheme.tacticalBlue),
                style: IconButton.styleFrom(
                  backgroundColor: TacticalTheme.tacticalBlue.withOpacity(0.1),
                ),
              )
            ],
          ),
          const Divider(height: 32, color: Colors.white10),
          const Text("LAPORAN SENYAP (QUICK STATUS)", style: TextStyle(color: TacticalTheme.textDim, fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildQuickStatusButton("Saya Sembunyi", Colors.blue),
                _buildQuickStatusButton("Pelaku Bersenjata", Colors.red),
                _buildQuickStatusButton("Ada Korban Luka", Colors.orange),
                _buildQuickStatusButton("Butuh Medis", Colors.green),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(backgroundColor: Colors.white12),
            child: const Text("SAYA SUDAH AMAN / BATALKAN", style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStatusButton(String label, Color color) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11, color: Colors.white)),
        backgroundColor: color.withOpacity(0.2),
        side: BorderSide(color: color.withOpacity(0.5)),
        onPressed: () => _sendQuickStatus(label),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, color: TacticalTheme.textDim, size: 20),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: TacticalTheme.textDim, fontSize: 10, fontWeight: FontWeight.bold)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}

// Add dart:convert import since it's used
import 'dart:convert';
