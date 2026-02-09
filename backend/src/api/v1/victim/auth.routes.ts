import { Router } from "express";
import { AuthController } from "../../../controllers/auth/auth.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const router = Router();
const authController = new AuthController();

/**
 * Victim Authentication Routes
 * Base Path: /api/v1/victim/auth
 */

router.post("/login", authController.victimLogin);
router.post("/register", authMiddleware, authController.victimRegister);

export default router;
