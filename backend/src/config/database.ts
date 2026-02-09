import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "../entities/User";
import { Incident } from "../entities/Incident";
import { Responder } from "../entities/Responder";
import { AuditLog } from "../entities/AuditLog";
import { Region } from "../entities/Region";


dotenv.config();

// Database Configuration with PostGIS Support
export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "kipolis_core",

    // Synchronize schema (auto-create tables) - ONLY for development
    synchronize: process.env.NODE_ENV !== "production",

    // Logging configuration
    logging: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],

    // Entity registration (explicit import for better type safety)
    entities: [User, Incident, Responder, AuditLog, Region],

    // Migrations (for production deployments)
    migrations: ["src/migrations/**/*.ts"],

    // Subscribers (for entity lifecycle events)
    subscribers: ["src/subscribers/**/*.ts"],

    // Connection pool settings
    extra: {
        max: 20, // Maximum number of connections in pool
        min: 5,  // Minimum number of connections in pool
        idleTimeoutMillis: 30000, // Close idle connections after 30s
        connectionTimeoutMillis: 5000, // Timeout for acquiring connection
    },

    // Enable PostGIS extension support
    // Note: PostGIS must be installed in the database first
    // Run: CREATE EXTENSION IF NOT EXISTS postgis;
});
