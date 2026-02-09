import { Router } from "express";
import { ConsoleController } from "../../../controllers/console/console.controller";
import { AuthController } from "../../../controllers/auth/auth.controller";
import { authMiddleware, authorize } from "../../../middleware/auth.middleware";

const router = Router();
const controller = new ConsoleController();
const authController = new AuthController();

/**
 * Console API Routes - For Dashboard App
 * Base Path: /api/v1/console
 */

// PUBLIC ROUTES: Console Authentication
router.post("/auth/login", authController.responderLogin);

// PROTECTED ROUTES: Require JWT and 'admin'/'responder' type
router.use(authMiddleware);
router.use(authorize(['admin', 'responder']));

// Monitoring
router.get("/dashboard/summary", controller.getSummary);
router.get("/monitoring/incidents", controller.getLiveIncidents);
router.get("/monitoring/responders", controller.getResponderMap);
router.get("/monitoring/intel-feed", controller.getAuditLogs);

// Incident Management
router.post("/incidents/:id/dispatch", controller.dispatchResponder);
router.get("/incidents/:id/intelligence", controller.getIncidentIntelligence);

// Analytics
router.get("/analytics/trend", controller.getTrend);

export default router;
