# KIPOLIS Backend - Database Setup Guide

## Overview
KIPOLIS backend uses **PostgreSQL with PostGIS extension** for storing emergency incident data with geospatial capabilities.

---

## Prerequisites

- PostgreSQL 15+ installed
- PostGIS extension available
- Node.js 18+ installed

---

## Quick Start

### 1. Install PostgreSQL and PostGIS

**Windows:**
```bash
# Download PostgreSQL installer from postgresql.org
# During installation, select PostGIS in StackBuilder
```

**macOS:**
```bash
brew install postgresql@15
brew install postgis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-15-postgis-3
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE kipolis_core;

# Connect to the database
\c kipolis_core

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

# Verify installation
SELECT PostGIS_Version();

# Exit psql
\q
```

### 3. Configure Environment

Edit `backend/.env`:
```env
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=kipolis_core
```

### 4. Run Backend

```bash
cd backend
npm install
npm run dev
```

Expected output:
```
[Database]: Initializing connection...
[Database]: Connecting to localhost:5432/kipolis_core
✅ [Database]: Connection established successfully
[Database]: Running with synchronize=true
✅ [PostGIS]: Extension loaded - Version 3.x.x
============================================================
🚨 KIPOLIS Emergency Response System
============================================================
✅ [Server]: Running at http://localhost:3000
[Server]: Environment: development
[Server]: Health check: http://localhost:3000/health
============================================================
```

### 5. Verify Setup

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "message": "KIPOLIS Backend is running",
  "database": "connected",
  "timestamp": "2026-02-07T...",
  "uptime": 5.123,
  "environment": "development"
}
```

---

## Database Schema

### Tables

TypeORM will auto-create these tables on first run (when `synchronize=true`):

#### `users`
Stores user profiles and emergency contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | VARCHAR(20) | Unique phone number (international format) |
| name | VARCHAR(200) | User's full name |
| email | VARCHAR(100) | Email address (optional) |
| emergency_contact_phone | VARCHAR(20) | Emergency contact number |
| emergency_contact_name | VARCHAR(200) | Emergency contact name |
| status | VARCHAR(20) | active, suspended, deleted |
| last_latitude | DECIMAL(10,7) | Last known latitude |
| last_longitude | DECIMAL(10,7) | Last known longitude |
| last_location_update | TIMESTAMP | Last location update time |
| device_token | TEXT | Push notification token (FCM/APNS) |
| device_platform | VARCHAR(20) | ios, android |
| app_version | VARCHAR(20) | App version installed |
| preferences | JSONB | User preferences (PIN, notifications, etc) |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:**
- `phone` (unique)
- `status`

#### `incidents`
Stores panic button activations and emergency incidents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users table |
| latitude | DECIMAL(10,7) | Incident trigger latitude |
| longitude | DECIMAL(10,7) | Incident trigger longitude |
| location | GEOMETRY(Point, 4326) | PostGIS point for spatial queries |
| status | VARCHAR(20) | active, acknowledged, dispatched, resolved, false_alarm, expired |
| severity | VARCHAR(20) | critical, high, medium, low |
| trigger_type | VARCHAR(50) | dead_mans_switch, hardware_key, voice_trigger, manual |
| breadcrumbs | JSONB | GPS history before incident (15 min trail) |
| audio_file_url | TEXT | Audio recording URL |
| audio_status | VARCHAR(20) | pending, uploading, uploaded, failed |
| photo_urls | JSONB | Array of photo URLs |
| photo_status | VARCHAR(20) | pending, uploading, uploaded, failed |
| notes | TEXT | Operator notes |
| assigned_to | UUID | Assigned responder ID |
| acknowledged_at | TIMESTAMP | When operator acknowledged |
| dispatched_at | TIMESTAMP | When responder dispatched |
| resolved_at | TIMESTAMP | When incident resolved |
| resolution_notes | TEXT | Resolution details |
| eta_minutes | INTEGER | Estimated time of arrival (minutes) |
| responder_location | JSONB | Responder location at dispatch |
| device_info | JSONB | Device info at trigger time |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Incident trigger time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:**
- `(user_id, status)` - Fast lookup for user's active incidents
- `(status, created_at)` - Fast lookup for recent active incidents
- `created_at` - Time-based queries
- `location` (GIST) - Spatial queries (auto-created by PostGIS)

---

## PostGIS Setup (Advanced)

### Enable Automatic Geometry Population

After tables are created, run this to auto-populate the `location` geometry column:

```sql
-- Connect to database
psql -U postgres -d kipolis_core

-- Create trigger function
CREATE OR REPLACE FUNCTION update_incident_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_incident_location
BEFORE INSERT OR UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION update_incident_location();
```

### Useful PostGIS Queries

**Find incidents within 5km radius:**
```sql
SELECT * FROM incidents 
WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography,
    5000  -- 5000 meters = 5km
)
AND status = 'active';
```

**Find nearest incident:**
```sql
SELECT 
    id,
    user_id,
    status,
    ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography
    ) / 1000 AS distance_km
FROM incidents
WHERE status = 'active'
ORDER BY location <-> ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)
LIMIT 1;
```

**Calculate distance between user and incident:**
```sql
SELECT 
    i.id,
    i.status,
    u.name AS user_name,
    ST_Distance(
        i.location::geography,
        ST_SetSRID(ST_MakePoint(u.last_longitude, u.last_latitude), 4326)::geography
    ) / 1000 AS distance_km
FROM incidents i
JOIN users u ON i.user_id = u.id
WHERE i.status = 'active';
```

---

## Troubleshooting

### Database Connection Failed

**Error:** `Connection terminated unexpectedly`

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # Windows
   pg_isready
   
   # macOS/Linux
   sudo systemctl status postgresql
   ```

2. Verify credentials in `.env` file
3. Check PostgreSQL allows local connections:
   ```bash
   # Edit pg_hba.conf
   # Add line: host all all 127.0.0.1/32 md5
   ```

### PostGIS Extension Not Found

**Error:** `function postgis_version() does not exist`

**Solution:**
```sql
-- Connect to database
psql -U postgres -d kipolis_core

-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify
SELECT PostGIS_Version();
```

### Tables Not Created

**Error:** Tables don't exist after server start

**Solution:**
1. Check `synchronize` is set to `true` in `database.ts`
2. Check database connection logs for errors
3. Manually create tables using TypeORM CLI:
   ```bash
   npm run typeorm schema:sync
   ```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Change PORT in .env file
PORT=3001
```

---

## Production Deployment

### Important: Disable Auto-Sync

In production, **NEVER** use `synchronize: true`. Instead:

1. Set environment variable:
   ```env
   NODE_ENV=production
   ```

2. Use migrations:
   ```bash
   # Generate migration
   npm run typeorm migration:generate -- -n InitialSchema
   
   # Run migration
   npm run typeorm migration:run
   ```

3. Database config will automatically use `synchronize: false` in production

---

## Database Maintenance

### Backup

```bash
# Backup database
pg_dump -U postgres kipolis_core > backup_$(date +%Y%m%d).sql

# Restore database
psql -U postgres kipolis_core < backup_20260207.sql
```

### Monitor Performance

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Next Steps

1. ✅ Database connection established
2. ⏳ Create Incident API endpoints
3. ⏳ Implement authentication
4. ⏳ Add real-time WebSocket support
5. ⏳ Integrate with mobile app

---

**Status:** ✅ Database setup complete and ready for development!
