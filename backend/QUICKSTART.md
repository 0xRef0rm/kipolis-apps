# 🚀 KIPOLIS Backend - Quick Start

## ⚡ TL;DR - Get Running in 5 Minutes

### 1. Create Database (1 minute)
```bash
psql -U postgres
```
```sql
CREATE DATABASE kipolis_core;
\c kipolis_core
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_Version();  -- Verify
\q
```

### 2. Configure Environment (30 seconds)
Edit `backend/.env`:
```env
DB_PASSWORD=your_actual_password_here
```

### 3. Run Server (30 seconds)
```bash
cd backend
npm run dev
```

### 4. Verify (30 seconds)
Open browser: http://localhost:3000/health

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "message": "KIPOLIS Backend is running"
}
```

---

## ✅ What You Get

### Endpoints Available:
- `GET /` - API info
- `GET /health` - Health check
- `GET /api` - API endpoints list

### Database Tables Auto-Created:
- `users` - User profiles (15+ fields)
- `incidents` - Panic button triggers (30+ fields)

### Features Enabled:
- ✅ PostgreSQL + PostGIS
- ✅ TypeORM with auto-sync
- ✅ Connection pooling
- ✅ Error handling
- ✅ Graceful shutdown
- ✅ Request logging (dev mode)

---

## 🔧 Troubleshooting

### Database Connection Failed?
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in .env
cat backend/.env
```

### PostGIS Not Found?
```sql
-- Connect to database
psql -U postgres -d kipolis_core

-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Port Already in Use?
Edit `backend/.env`:
```env
PORT=3001
```

---

## 📚 Full Documentation

- **Setup Guide:** `backend/DATABASE_SETUP.md`
- **Implementation Details:** `BACKEND_DATABASE_IMPLEMENTATION.md`
- **PostGIS Queries:** `backend/src/database/init.sql`

---

## 🎯 Next Steps

1. ✅ Database setup complete
2. ⏳ Create Incident API (`POST /api/incidents`)
3. ⏳ Add authentication
4. ⏳ Build mobile app panic button
5. ⏳ Build dashboard map view

---

**Status:** ✅ Backend database ready for development!
