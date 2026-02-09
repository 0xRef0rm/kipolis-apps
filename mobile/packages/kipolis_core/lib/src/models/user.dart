class User {
  final String id;
  final String phone;
  final String name;
  final String? email;
  final String? nik;
  final String? address;
  final String? bloodType;
  final String? medicalConditions;
  final String? avatarUrl;

  User({
    required this.id,
    required this.phone,
    required this.name,
    this.email,
    this.nik,
    this.address,
    this.bloodType,
    this.medicalConditions,
    this.avatarUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      name: json['name'] ?? '',
      email: json['email'],
      nik: json['nik'],
      address: json['address'],
      bloodType: json['blood_type'],
      medicalConditions: json['medical_conditions'],
      avatarUrl: json['avatar_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'name': name,
      'email': email,
      'nik': nik,
      'address': address,
      'blood_type': bloodType,
      'medical_conditions': medicalConditions,
      'avatar_url': avatarUrl,
    };
  }
}
