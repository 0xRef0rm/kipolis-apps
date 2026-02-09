import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:kipolis_core/kipolis_core.dart';

class IncidentDetailScreen extends StatefulWidget {
  final Incident incident;
  const IncidentDetailScreen({super.key, required this.incident});

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionStream;
  bool _isAccepted = false;
  bool _isLoading = false;
  Timer? _refreshTimer;
  Incident? _currentIncident;
  
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  List<LatLng> _polylineCoordinates = [];
  late PolylinePoints _polylinePoints;
  
  @override
  void initState() {
    super.initState();
    _currentIncident = widget.incident;
    _polylinePoints = PolylinePoints();
    _checkIncidentStatus();
    _startTracking();
    // Refresh victim location every 10 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) => _refreshIncidentData());
  }

  Future<void> _refreshIncidentData() async {
    try {
      final response = await ApiClient.get("/incidents/${_currentIncident!.id}");
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'];
        setState(() {
          _currentIncident = Incident.fromJson(data);
          _updateMarkers();
          if (_isAccepted && _currentPosition != null) {
            _getPolyline(_currentPosition!);
          }
        });
      }
    } catch (e) {
      debugPrint("Error refreshing incident: $e");
    }
  }

  void _checkIncidentStatus() {
    if (_currentIncident!.status == 'on_the_way') {
      setState(() => _isAccepted = true);
    }
    _updateMarkers();
  }

  Future<void> _startTracking() async {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _updateMarkers();
          if (_isAccepted) {
            _sendLocationUpdate(position);
            _getPolyline(position); // Update route on movement
          }
        });
        
        // Auto-center camera
        _mapController?.animateCamera(
          CameraUpdate.newLatLng(LatLng(position.latitude, position.longitude)),
        );
      }
    });
  }

  Future<void> _getPolyline(Position current) async {
    final googleApiKey = dotenv.get('GOOGLE_MAPS_API_KEY', fallback: '');
    if (googleApiKey.isEmpty) return;

    PolylineResult result = await _polylinePoints.getRouteBetweenCoordinates(
      googleApiKey: googleApiKey,
      request: PolylineRequest(
        origin: PointLatLng(current.latitude, current.longitude),
        destination: PointLatLng(_currentIncident!.latitude, _currentIncident!.longitude),
        mode: TravelMode.driving,
      ),
    );

    if (result.points.isNotEmpty) {
      _polylineCoordinates.clear();
      for (var point in result.points) {
        _polylineCoordinates.add(LatLng(point.latitude, point.longitude));
      }
      
      setState(() {
        _polylines.add(
          Polyline(
            polylineId: const PolylineId("route"),
            color: TacticalTheme.tacticalBlue,
            points: _polylineCoordinates,
            width: 5,
          ),
        );
      });
    }
  }

  void _updateMarkers() {
    _markers.clear();
    
    // Victim Marker
    _markers.add(
      Marker(
        markerId: const MarkerId('victim'),
        position: LatLng(
          _currentIncident!.latitude,
          _currentIncident!.longitude,
        ),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Lokasi Korban'),
      ),
    );

    // Responder Marker
    if (_currentPosition != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('responder'),
          position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'Lokasi Anda'),
        ),
      );
    }
  }

  Future<void> _sendLocationUpdate(Position position) async {
    try {
      await ApiClient.post(
        "/location",
        {
          "latitude": position.latitude,
          "longitude": position.longitude,
          "speed": position.speed,
        },
      );
    } catch (e) {
      print("Error updating location: $e");
    }
  }

  Future<void> _handleAccept() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiClient.post(
        "/incidents/${_currentIncident!.id}/accept",
        {},
      );

      if (response.statusCode == 200) {
        setState(() {
          _isAccepted = true;
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Berhasil menerima tugas. Segera meluncur!")),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Gagal menerima tugas")),
      );
    }
  }

  Future<void> _handleResolve() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiClient.post(
          "/incidents/${_currentIncident!.id}/resolve",
          {"notes": "Tugas selesai ditangani petugas lapangan."}
      );

      if (response.statusCode == 200) {
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final victimLat = _currentIncident!.latitude;
    final victimLng = _currentIncident!.longitude;

    double distance = 0;
    if (_currentPosition != null) {
      distance = Geolocator.distanceBetween(
        _currentPosition!.latitude, 
        _currentPosition!.longitude, 
        victimLat, 
        victimLng
      ) / 1000;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text("DETAIL INSIDEN", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: 
              // GoogleMap(
              //   initialCameraPosition: CameraPosition(
              //     target: LatLng(victimLat, victimLng),
              //     zoom: 15,
              //   ),
              //   onMapCreated: (controller) => _mapController = controller,
              //   markers: _markers,
              //   polylines: _polylines,
              //   myLocationEnabled: true,
              //   myLocationButtonEnabled: true,
              //   zoomControlsEnabled: false,
              // ),
              Container(
                color: const Color(0xFF121216),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.gps_fixed, color: Colors.white10, size: 48),
                      const SizedBox(height: 16),
                      Text(
                        "TRACKING MODE: OPS-ONLY",
                        style: TextStyle(
                          color: Colors.white24, 
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2
                        ),
                      ),
                      const Text(
                        "(GOOGLE MAPS PENDING APPROVAL)",
                        style: TextStyle(color: Colors.white10, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),
          ),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: TacticalTheme.cardBg,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "DARURAT: PANIC BUTTON",
                      style: TextStyle(color: TacticalTheme.emergencyRed, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      "${distance.toStringAsFixed(2)} KM",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  "Status: ${(_currentIncident!.triggerType ?? 'unknown').toUpperCase()}",
                  style: const TextStyle(color: TacticalTheme.textDim),
                ),
                const Divider(height: 32, color: Colors.white10),
                if (!_isAccepted)
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleAccept,
                    style: ElevatedButton.styleFrom(backgroundColor: TacticalTheme.tacticalBlue),
                    child: _isLoading 
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text("TERIMA TUGAS"),
                  )
                else
                  Column(
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.info_outline, color: TacticalTheme.tacticalBlue, size: 20),
                          SizedBox(width: 8),
                          Text(
                            "Anda sedang dalam perjalanan",
                            style: TextStyle(color: TacticalTheme.tacticalBlue, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleResolve,
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                        child: _isLoading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text("TUGAS SELESAI"),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
