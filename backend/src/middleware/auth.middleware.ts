import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "kipolis-super-secret-key-2026";

/**
 * JWT Verification Middleware
 * Validates the tamper-proof token issued by Central Auth
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Unauthorized - Bearer token required"
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        // Verify Token
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Attach user data to request
        (req as any).user = {
            id: decoded.id,
            type: decoded.type,
            role: decoded.role
        };

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures only authorized client types can access specific endpoints
 */
export const authorize = (allowedTypes: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user || !allowedTypes.includes(user.type)) {
            res.status(403).json({
                success: false,
                message: "Forbidden - Insufficient permissions for this client type"
            });
            return;
        }

        next();
    };
};
