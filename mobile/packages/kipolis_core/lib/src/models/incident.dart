import 'user.dart';
import 'responder.dart';

class Incident {
  final String id;
  final String userId;
  final double latitude;
  final double longitude;
  final String status;
  final String severity;
  final String? triggerType;
  final DateTime createdAt;
  final User? victim;
  final Responder? responder;
  final double? distanceMeters;

  Incident({
    required this.id,
    required this.userId,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.severity,
    this.triggerType,
    required this.createdAt,
    this.victim,
    this.responder,
    this.distanceMeters,
  });

  factory Incident.fromJson(Map<String, dynamic> json) {
    return Incident(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      latitude: double.parse(json['latitude'].toString()),
      longitude: double.parse(json['longitude'].toString()),
      status: json['status'] ?? 'active',
      severity: json['severity'] ?? 'high',
      triggerType: json['trigger_type'],
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : DateTime.now(),
      victim: json['user'] != null ? User.fromJson(json['user']) : null,
      responder: json['responder'] != null ? Responder.fromJson(json['responder']) : null,
      distanceMeters: json['distance_meters'] != null 
          ? double.parse(json['distance_meters'].toString()) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'latitude': latitude,
      'longitude': longitude,
      'status': status,
      'severity': severity,
      'trigger_type': triggerType,
      'created_at': createdAt.toIso8601String(),
      'user': victim?.toJson(),
      'responder': responder?.toJson(),
      'distance_meters': distanceMeters,
    };
  }
}
