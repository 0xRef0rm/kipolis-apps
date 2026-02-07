import { Router } from "express";
import incidentsRouter from "./incidents.routes";

const router = Router();

/**
 * Responder API Routes
 * Base path: /api/v1/responder
 */

router.use("/incidents", incidentsRouter);

/**
 * Expose auth routes directly at /api/v1/responder/auth/
 * (incidentsRouter already contains the auth routes)
 */
router.use("/", incidentsRouter);

export default router;
