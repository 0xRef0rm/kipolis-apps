-- KIPOLIS Database Setup Script
-- Run this to create database and enable PostGIS

-- Create database (run as postgres user)
CREATE DATABASE kipolis_core;

-- Connect to the database
\c kipolis_core

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Show success message
SELECT 'Database kipolis_core created successfully with PostGIS extension!' AS status;
