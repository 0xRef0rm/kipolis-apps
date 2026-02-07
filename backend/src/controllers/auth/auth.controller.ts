import { Request, Response } from "express";
import { AuthService } from "../../services/auth.service";

/**
 * Auth Controller - Entry point for Central Identity Management
 */
export class AuthController {
    private authService = new AuthService();

    /**
     * POST /api/v1/victim/auth/login
     */
    victimLogin = async (req: Request, res: Response): Promise<void> => {
        try {
            const { phone, otp, device_id } = req.body;
            if (!phone || !otp) {
                res.status(400).json({ success: false, message: "Phone and OTP are required" });
                return;
            }

            const result = await this.authService.victimLogin({
                phone,
                otp,
                device_id,
                ip: req.ip
            });

            res.json({ success: true, message: "Login successful", data: result });
        } catch (error: any) {
            res.status(401).json({ success: false, message: error.message });
        }
    };

    /**
     * POST /api/v1/responder/auth/register
     */
    responderRegister = async (req: Request, res: Response): Promise<void> => {
        try {
            // In real app, adminId comes from auth token
            const adminId = (req as any).user?.id || "SYSTEM_ADMIN";

            const responder = await this.authService.registerResponder(adminId, req.body);
            res.status(201).json({
                success: true,
                message: "Responder registered successfully",
                data: { id: responder.id, badge: responder.badge_number }
            });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    };

    /**
     * POST /api/v1/responder/auth/login
     */
    responderLogin = async (req: Request, res: Response): Promise<void> => {
        try {
            const { identifier, password, device_id } = req.body;

            if (!identifier || !password || !device_id) {
                res.status(400).json({
                    success: false,
                    message: "Identifier, Password, and Device ID are required for hardware binding"
                });
                return;
            }

            const result = await this.authService.responderLogin({
                identifier,
                password,
                device_id,
                ip: req.ip
            });

            res.json({ success: true, message: "Access Granted", data: result });
        } catch (error: any) {
            res.status(401).json({ success: false, message: error.message });
        }
    };
}
