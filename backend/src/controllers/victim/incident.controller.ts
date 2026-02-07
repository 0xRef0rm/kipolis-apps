import { Request, Response } from "express";
import { IncidentService } from "../../services/incident.service";

/**
 * Victim Incident Controller
 * Handles panic button triggers and incident management for victims
 */
export class VictimIncidentController {
    private incidentService = new IncidentService();

    /**
     * POST /api/v1/victim/incidents
     * Trigger panic button - Create new incident
     */
    triggerPanicButton = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id; // From auth middleware

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized - User ID not found"
                });
                return;
            }

            const {
                latitude,
                longitude,
                breadcrumbs,
                trigger_type,
                device_info
            } = req.body;

            // Validation
            if (!latitude || !longitude) {
                res.status(400).json({
                    success: false,
                    message: "Latitude and longitude are required"
                });
                return;
            }

            // Create incident
            const incident = await this.incidentService.createIncident({
                user_id: userId,
                latitude,
                longitude,
                breadcrumbs,
                trigger_type,
                device_info
            });

            // Find nearest responder
            const nearestResponder = await this.incidentService.findNearestResponder(
                latitude,
                longitude,
                "police" // Default to police, can be configurable
            );

            res.status(201).json({
                success: true,
                message: "Panic button triggered - Help is on the way!",
                data: {
                    incident_id: incident.id,
                    status: incident.status,
                    severity: incident.severity,
                    created_at: incident.created_at,
                    nearest_responder: nearestResponder ? {
                        id: nearestResponder.id,
                        name: nearestResponder.name,
                        type: nearestResponder.type,
                        distance_km: (nearestResponder as any).distance_km
                    } : null
                }
            });
        } catch (error: any) {
            console.error("[Victim] Panic button error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to trigger panic button",
                error: error.message
            });
        }
    };

    /**
     * GET /api/v1/victim/incidents/active
     * Get user's active incident
     */
    getActiveIncident = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }

            const incident = await this.incidentService.getUserActiveIncident(userId);

            if (!incident) {
                res.status(404).json({
                    success: false,
                    message: "No active incident found"
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    incident_id: incident.id,
                    status: incident.status,
                    severity: incident.severity,
                    latitude: incident.latitude,
                    longitude: incident.longitude,
                    created_at: incident.created_at,
                    responder: incident.responder ? {
                        id: incident.responder.id,
                        name: incident.responder.name,
                        type: incident.responder.type,
                        status: incident.responder.status
                    } : null,
                    eta_minutes: incident.eta_minutes
                }
            });
        } catch (error: any) {
            console.error("[Victim] Get active incident error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get active incident",
                error: error.message
            });
        }
    };

    /**
     * GET /api/v1/victim/incidents/:id
     * Get incident details
     */
    getIncidentById = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }

            const incident = await this.incidentService.getIncidentById(id as string, userId);

            if (!incident) {
                res.status(404).json({
                    success: false,
                    message: "Incident not found"
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    incident_id: incident.id,
                    status: incident.status,
                    severity: incident.severity,
                    latitude: incident.latitude,
                    longitude: incident.longitude,
                    breadcrumbs: incident.breadcrumbs,
                    trigger_type: incident.trigger_type,
                    created_at: incident.created_at,
                    responder: incident.responder ? {
                        id: incident.responder.id,
                        name: incident.responder.name,
                        type: incident.responder.type,
                        badge_number: incident.responder.badge_number,
                        status: incident.responder.status
                    } : null,
                    eta_minutes: incident.eta_minutes,
                    acknowledged_at: incident.acknowledged_at,
                    dispatched_at: incident.dispatched_at,
                    resolved_at: incident.resolved_at
                }
            });
        } catch (error: any) {
            console.error("[Victim] Get incident error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get incident",
                error: error.message
            });
        }
    };

    /**
     * POST /api/v1/victim/incidents/:id/location
     * Update incident location (breadcrumbs)
     */
    updateLocation = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;
            const { latitude, longitude, accuracy } = req.body;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }

            if (!latitude || !longitude) {
                res.status(400).json({
                    success: false,
                    message: "Latitude and longitude are required"
                });
                return;
            }

            await this.incidentService.updateBreadcrumbs(id as string, userId, {
                latitude,
                longitude,
                timestamp: new Date().toISOString(),
                accuracy
            });

            res.json({
                success: true,
                message: "Location updated successfully"
            });
        } catch (error: any) {
            console.error("[Victim] Update location error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update location",
                error: error.message
            });
        }
    };

    /**
     * PATCH /api/v1/victim/incidents/:id/cancel
     * Cancel incident (false alarm)
     */
    cancelIncident = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }

            await this.incidentService.cancelIncident(id as string, userId);

            res.json({
                success: true,
                message: "Incident cancelled successfully"
            });
        } catch (error: any) {
            console.error("[Victim] Cancel incident error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to cancel incident",
                error: error.message
            });
        }
    };

    /**
     * GET /api/v1/victim/incidents/history
     * Get incident history
     */
    getIncidentHistory = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = parseInt(req.query.offset as string) || 0;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }

            const { incidents, total } = await this.incidentService.getUserIncidentHistory(
                userId,
                limit,
                offset
            );

            res.json({
                success: true,
                data: {
                    incidents: incidents.map(incident => ({
                        incident_id: incident.id,
                        status: incident.status,
                        severity: incident.severity,
                        latitude: incident.latitude,
                        longitude: incident.longitude,
                        created_at: incident.created_at,
                        resolved_at: incident.resolved_at,
                        responder: incident.responder ? {
                            name: incident.responder.name,
                            type: incident.responder.type
                        } : null
                    })),
                    total,
                    limit,
                    offset
                }
            });
        } catch (error: any) {
            console.error("[Victim] Get history error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get incident history",
                error: error.message
            });
        }
    };

    /**
     * GET /api/v1/victim/incidents/:id/responder
     * Get assigned responder info and ETA
     */
    getResponderInfo = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id;
            const { id } = req.params;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
                return;
            }

            const responderInfo = await this.incidentService.getIncidentResponder(id as string, userId);

            res.json({
                success: true,
                data: responderInfo
            });
        } catch (error: any) {
            console.error("[Victim] Get responder info error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get responder info",
                error: error.message
            });
        }
    };
}
