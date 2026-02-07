import { Router } from "express";
import { ResponderIncidentController } from "../../../controllers/responder/incident.controller";
import { AuthController } from "../../../controllers/auth/auth.controller";
import { authMiddleware, authorize } from "../../../middleware/auth.middleware";

const router = Router();
const controller = new ResponderIncidentController();
const authController = new AuthController();

/**
 * Public Responder Auth Routes
 */
router.post("/auth/login", authController.responderLogin);
router.post("/auth/register", authController.responderRegister); // Note: Should be limited in production

// All following routes require JWT and must be a 'responder' type
router.use(authMiddleware);
router.use(authorize(['responder']));

/**
 * GET /api/v1/responder/incidents/nearby
 * Get incidents near current location
 */
router.get("/nearby", controller.getNearbyIncidents);

/**
 * POST /api/v1/responder/incidents/:id/accept
 * Accept an incident
 */
router.post("/:id/accept", controller.acceptIncident);

/**
 * POST /api/v1/responder/location
 * Update responder's real-time location
 */
router.post("/location", controller.updateLocation);

/**
 * POST /api/v1/responder/incidents/:id/resolve
 * Mark incident as resolved
 */
router.post("/:id/resolve", controller.resolveIncident);

export default router;
