import { Router } from "express";
import consoleRoutes from "./console.routes";

const router = Router();

// Mounting Console Routes
router.use("/", consoleRoutes);

export default router;
