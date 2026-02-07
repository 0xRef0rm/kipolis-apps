import { Router } from "express";
import { VictimIncidentController } from "../../../controllers/victim/incident.controller";
import { AuthController } from "../../../controllers/auth/auth.controller";
import { authMiddleware, authorize } from "../../../middleware/auth.middleware";

const router = Router();
const controller = new VictimIncidentController();
const authController = new AuthController();

/**
 * Public Auth Routes
 */
router.post("/auth/login", authController.victimLogin);

// All following routes require JWT and must be a 'victim' type
router.use(authMiddleware);
router.use(authorize(['victim']));

/**
 * POST /api/v1/victim/incidents
 * Trigger panic button - Create new incident
 * 
 * Body: {
 *   latitude: number,
 *   longitude: number,
 *   breadcrumbs?: Array<{ latitude, longitude, timestamp, accuracy }>,
 *   trigger_type?: string,
 *   device_info?: object
 * }
 */
router.post("/", controller.triggerPanicButton);

/**
 * GET /api/v1/victim/incidents/active
 * Get user's active incident
 */
router.get("/active", controller.getActiveIncident);

/**
 * GET /api/v1/victim/incidents/history
 * Get incident history
 * Query params: limit, offset
 */
router.get("/history", controller.getIncidentHistory);

/**
 * GET /api/v1/victim/incidents/:id
 * Get incident details by ID
 */
router.get("/:id", controller.getIncidentById);

/**
 * POST /api/v1/victim/incidents/:id/location
 * Update incident location (add breadcrumb)
 * 
 * Body: {
 *   latitude: number,
 *   longitude: number,
 *   accuracy?: number
 * }
 */
router.post("/:id/location", controller.updateLocation);

/**
 * PATCH /api/v1/victim/incidents/:id/cancel
 * Cancel incident (false alarm)
 */
router.patch("/:id/cancel", controller.cancelIncident);

/**
 * GET /api/v1/victim/incidents/:id/responder
 * Get assigned responder info and ETA
 */
router.get("/:id/responder", controller.getResponderInfo);

export default router;
