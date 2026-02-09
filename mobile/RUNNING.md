# KIPOLIS Mobile Monorepo

Struktur project mobile ini menggunakan pola **Monorepo** dengan **Shared Packages** untuk efisiensi pengembangan.

## Struktur Direktori
- `apps/victim_app`: Aplikasi untuk Warga (Victim).
- `apps/responder_app`: Aplikasi untuk Petugas (Responder).
- `packages/kipolis_core`: Package bersama (Theme, Models, API Client).

## Cara Menjalankan Aplikasi

### 1. Inisialisasi (Wajib Pertama Kali)
Jalankan perintah ini di setiap folder untuk mengambil dependency:

```bash
# Core Package
cd packages/kipolis_core
flutter pub get

# Victim App
cd ../../apps/victim_app
flutter pub get

# Responder App
cd ../responder_app
flutter pub get
```

### 2. Menjalankan di Emulator

#### Menjalankan Aplikasi Warga (Victim):
```bash
cd mobile/apps/victim_app
flutter run
```

#### Menjalankan Aplikasi Petugas (Responder):
```bash
cd mobile/apps/responder_app
flutter run
```

*Tips: Jika menggunakan VS Code, kamu bisa membuka folder `mobile` langsung dan memilih target `main.dart` di masing-masing folder apps.*
