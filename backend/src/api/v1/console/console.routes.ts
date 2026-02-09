import { Router } from "express";
import { ConsoleController } from "../../../controllers/console/console.controller";
import { MasterDataController } from "../../../controllers/console/master-data.controller";
import { AuthController } from "../../../controllers/auth/auth.controller";
import { authMiddleware, authorize } from "../../../middleware/auth.middleware";

const router = Router();
const controller = new ConsoleController();
const masterController = new MasterDataController();
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

// Master Data Management (Config for Police, Hospital, etc. per City)
router.get("/master-data/organizations", masterController.getOrganizations);
router.post("/master-data/organizations", masterController.createOrganization);
router.patch("/master-data/organizations/:id", masterController.updateOrganization);
router.delete("/master-data/organizations/:id", masterController.deleteOrganization);
router.get("/master-data/regions", masterController.getRegions);

// Analytics
router.get("/analytics/trend", controller.getTrend);

export default router;
