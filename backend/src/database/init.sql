-- KIPOLIS Database Initialization Script
-- Run this script to set up PostGIS extension and initial database structure

-- ============================================
-- 1. Enable PostGIS Extension
-- ============================================

-- Create PostGIS extension (required for spatial queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- ============================================
-- 2. Create Spatial Index Function
-- ============================================

-- Function to automatically populate geometry column from lat/long
-- This will be called by a trigger on the incidents table
CREATE OR REPLACE FUNCTION update_incident_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Convert latitude/longitude to PostGIS Point geometry
    -- SRID 4326 = WGS84 (standard GPS coordinate system)
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Useful PostGIS Query Examples
-- ============================================

-- These queries will be useful once data is populated:

-- Example 1: Find incidents within 5km radius of a point
-- SELECT * FROM incidents 
-- WHERE ST_DWithin(
--     location::geography,
--     ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography,
--     5000  -- 5000 meters = 5km
-- );

-- Example 2: Calculate distance between two points
-- SELECT 
--     id,
--     ST_Distance(
--         location::geography,
--         ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography
--     ) / 1000 AS distance_km
-- FROM incidents
-- ORDER BY distance_km;

-- Example 3: Find nearest incident to a location
-- SELECT * FROM incidents
-- ORDER BY location <-> ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)
-- LIMIT 1;

-- ============================================
-- 4. Performance Indexes (will be created by TypeORM)
-- ============================================

-- Spatial index on location column (for fast geo queries)
-- CREATE INDEX idx_incidents_location ON incidents USING GIST(location);

-- Composite indexes for common queries
-- CREATE INDEX idx_incidents_user_status ON incidents(user_id, status);
-- CREATE INDEX idx_incidents_status_created ON incidents(status, created_at);

-- ============================================
-- 5. Initial Data (Optional)
-- ============================================

-- You can add seed data here if needed
-- For example, test users or demo incidents

-- ============================================
-- NOTES
-- ============================================

-- 1. TypeORM will auto-create tables when synchronize=true
-- 2. The trigger for update_incident_location() needs to be created
--    after TypeORM creates the incidents table
-- 3. Run this script AFTER the first server startup to ensure
--    tables exist before creating triggers

-- To create the trigger (run after tables are created):
-- CREATE TRIGGER trigger_update_incident_location
-- BEFORE INSERT OR UPDATE ON incidents
-- FOR EACH ROW
-- EXECUTE FUNCTION update_incident_location();
