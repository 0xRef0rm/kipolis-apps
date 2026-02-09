class Responder {
  final String id;
  final String name;
  final String phone;
  final String? badgeNumber;
  final String type;
  final String? department;
  final String status;
  final double? latitude;
  final double? longitude;

  Responder({
    required this.id,
    required this.name,
    required this.phone,
    this.badgeNumber,
    required this.type,
    this.department,
    required this.status,
    this.latitude,
    this.longitude,
  });

  factory Responder.fromJson(Map<String, dynamic> json) {
    return Responder(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      badgeNumber: json['badge_number'],
      type: json['type'] ?? '',
      department: json['department'],
      status: json['status'] ?? 'off_duty',
      latitude: json['current_latitude'] != null ? double.parse(json['current_latitude'].toString()) : null,
      longitude: json['current_longitude'] != null ? double.parse(json['current_longitude'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'badge_number': badgeNumber,
      'type': type,
      'department': department,
      'status': status,
      'current_latitude': latitude,
      'current_longitude': longitude,
    };
  }
}
