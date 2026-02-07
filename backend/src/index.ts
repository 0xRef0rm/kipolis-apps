import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { AppDataSource } from "./config/database";
import apiV1Router from "./api/v1";

import cors from "cors";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
    try {
        // Check database connection
        const isConnected = AppDataSource.isInitialized;

        if (!isConnected) {
            return res.status(503).json({
                status: "unhealthy",
                message: "Database not connected",
                timestamp: new Date().toISOString()
            });
        }

        // Test database query
        await AppDataSource.query("SELECT 1");

        res.json({
            status: "healthy",
            message: "KIPOLIS Backend is running",
            database: "connected",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development"
        });
    } catch (error) {
        console.error("[Health Check Error]:", error);
        res.status(503).json({
            status: "unhealthy",
            message: "Database query failed",
            timestamp: new Date().toISOString()
        });
    }
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
    res.json({
        message: "KIPOLIS Emergency Response System API",
        version: "1.0.0",
        tagline: "Speed, Security, Survival",
        timestamp: new Date().toISOString(),
        endpoints: {
            health: "/health",
            api: "/api/v1"
        }
    });
});

// API v1 Routes
app.use("/api/v1", apiV1Router);

// API routes redirect/info
app.get("/api", (req: Request, res: Response) => {
    res.redirect("/api/v1");
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("[Global Error Handler]:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
        timestamp: new Date().toISOString()
    });
});

// ============================================
// DATABASE INITIALIZATION & SERVER STARTUP
// ============================================

async function initializeDatabase() {
    try {
        console.log("[Database]: Initializing connection...");
        console.log(`[Database]: Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

        await AppDataSource.initialize();

        console.log("✅ [Database]: Connection established successfully");
        console.log(`[Database]: Running with synchronize=${AppDataSource.options.synchronize}`);

        // Verify PostGIS extension
        try {
            const result = await AppDataSource.query("SELECT PostGIS_Version()");
            console.log(`✅ [PostGIS]: Extension loaded - Version ${result[0].postgis_version}`);
        } catch (error) {
            console.warn("⚠️  [PostGIS]: Extension not found. Run: CREATE EXTENSION IF NOT EXISTS postgis;");
        }

        return true;
    } catch (error) {
        console.error("❌ [Database]: Connection failed");
        console.error("[Database Error]:", error);
        return false;
    }
}

async function startServer() {
    // Initialize database first
    const dbInitialized = await initializeDatabase();

    if (!dbInitialized) {
        console.error("❌ [Server]: Cannot start without database connection");
        console.error("[Server]: Please check your database configuration in .env file");
        console.error("[Server]: Ensure PostgreSQL is running and credentials are correct");
        process.exit(1);
    }

    // Start Express server
    const server = app.listen(PORT, () => {
        console.log("=".repeat(60));
        console.log("🚨 KIPOLIS Emergency Response System");
        console.log("=".repeat(60));
        console.log(`✅ [Server]: Running at http://localhost:${PORT}`);
        console.log(`[Server]: Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`[Server]: Health check: http://localhost:${PORT}/health`);
        console.log("=".repeat(60));
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
        console.log(`\n[Server]: Received ${signal}, starting graceful shutdown...`);

        // Close HTTP server
        server.close(async () => {
            console.log("[Server]: HTTP server closed");

            // Close database connection
            if (AppDataSource.isInitialized) {
                try {
                    await AppDataSource.destroy();
                    console.log("[Database]: Connection closed");
                } catch (error) {
                    console.error("[Database]: Error closing connection:", error);
                }
            }

            console.log("✅ [Server]: Graceful shutdown complete");
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            console.error("[Server]: Forced shutdown after timeout");
            process.exit(1);
        }, 10000);
    };

    // Register shutdown handlers
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
        console.error("[Uncaught Exception]:", error);
        gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
        console.error("[Unhandled Rejection] at:", promise, "reason:", reason);
        gracefulShutdown("unhandledRejection");
    });
}

// Start the application
startServer().catch((error) => {
    console.error("[Startup Error]:", error);
    process.exit(1);
});
