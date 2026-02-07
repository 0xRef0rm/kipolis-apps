# KIPOLIS Backend

Node.js + TypeScript backend for KIPOLIS Emergency Response System.

**Status:** ✅ Database layer complete (90%) - Ready for API development

---

## 🚀 Quick Start

**Prerequisites:** PostgreSQL 15+ with PostGIS extension

1. **Create database:**
   ```bash
   psql -U postgres
   CREATE DATABASE kipolis_core;
   \c kipolis_core
   CREATE EXTENSION IF NOT EXISTS postgis;
   \q
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Edit .env file with your PostgreSQL password
   # Default credentials: postgres/postgres
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Verify setup:**
   ```bash
   curl http://localhost:3000/health
   ```

Server runs at: `http://localhost:3000`

---

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- **[Database Setup Guide](DATABASE_SETUP.md)** - Comprehensive PostgreSQL + PostGIS setup
- **[Implementation Summary](../BACKEND_DATABASE_IMPLEMENTATION.md)** - What was built

---

## 🎯 Features Implemented

### ✅ Database Layer (90% Complete)
- TypeORM with PostgreSQL + PostGIS
- Connection pooling (5-20 connections)
- Auto-sync in development
- Migration-ready for production
- Graceful shutdown handling

### ✅ Entities
- **User** - Profile, emergency contacts, device info (15+ fields)
- **Incident** - Panic triggers, location, evidence, workflow (30+ fields)
- PostGIS geometry support for spatial queries
- Comprehensive indexes for performance

### ✅ Server Infrastructure
- Health check endpoint (`/health`)
- Global error handling
- Request logging (development mode)
- Environment-aware configuration
- Uncaught exception handling

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+ + TypeScript
- **Framework:** Express.js
- **ORM:** TypeORM
- **Database:** PostgreSQL 15+ with PostGIS extension
- **Spatial:** PostGIS for geolocation queries

---

## 📊 Database Schema

### Users Table
- User profiles and emergency contacts
- Last known location tracking
- Device information (push tokens, platform)
- User preferences (JSONB)

### Incidents Table
- Panic button activations
- Location + PostGIS geometry
- Breadcrumb trail (GPS history)
- Audio/photo evidence tracking
- Operator workflow (status, assignment, resolution)
- Responder tracking (ETA, location)

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for full schema documentation.

---

## 🔌 API Endpoints

### Current:
- `GET /` - API information
- `GET /health` - Health check with database status
- `GET /api` - API endpoints listing

### Coming Soon:
- `POST /api/incidents` - Submit panic button trigger
- `GET /api/incidents` - List incidents
- `POST /api/auth/login` - User authentication
- `WebSocket /ws` - Real-time updates

---

## 🧪 Development

```bash
# Run development server (with auto-reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

---

## 🚀 Next Steps

1. ✅ Database setup complete
2. ⏳ Create Incident API endpoints
3. ⏳ Implement authentication (Phone OTP)
4. ⏳ Add WebSocket for real-time updates
5. ⏳ File upload for audio/photo evidence

---

## 📝 Environment Variables

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=kipolis_core
```

---

## 🐛 Troubleshooting

See [DATABASE_SETUP.md](DATABASE_SETUP.md#troubleshooting) for common issues and solutions.

---

**Last Updated:** 2026-02-07  
**Version:** 1.0.0  
**Status:** ✅ Database ready, API development in progress

