import { Router } from "express";
import authRouter from "./auth.routes";
import incidentsRouter from "./incidents.routes";

const router = Router();

/**
 * Victim API Routes
 * Base path: /api/v1/victim
 */

// Authentication
router.use("/auth", authRouter);

// Incidents (Panic Button)
router.use("/incidents", incidentsRouter);

// TODO: Add more victim routes
// router.use("/auth", authRouter);
// router.use("/profile", profileRouter);

export default router;
