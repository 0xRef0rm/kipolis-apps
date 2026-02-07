import { Router } from "express";
import victimRouter from "./victim";
import responderRouter from "./responder";
import consoleRouter from "./console";

const router = Router();

/**
 * API v1 Routes
 * Base path: /api/v1
 */

// Victim App Routes
router.use("/victim", victimRouter);

// Responder App Routes
router.use("/responder", responderRouter);

// Console Dashboard Routes
router.use("/console", consoleRouter);

// TODO: Add more API routes
// router.use("/operator", operatorRouter);
// router.use("/webhook", webhookRouter);
// router.use("/integration", integrationRouter);

export default router;
