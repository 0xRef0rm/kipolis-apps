import { Request, Response } from "express";
import { IncidentService } from "../../services/incident.service";
import { AppDataSource } from "../../config/database";
import { Incident } from "../../entities/Incident";
import { Responder } from "../../entities/Responder";

/**
 * Responder Incident Controller
 * Handles incident response and tracking for police/medics
 */
export class ResponderIncidentController {
    private incidentService = new IncidentService();
    private incidentRepository = AppDataSource.getRepository(Incident);
    private responderRepository = AppDataSource.getRepository(Responder);

    /**
     * GET /api/v1/responder/incidents/nearby
     * Find active incidents near the responder's current location
     */
    getNearbyIncidents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { latitude, longitude, radius = 5000 } = req.query; // radius in meters

            if (!latitude || !longitude) {
                res.status(400).json({
                    success: false,
                    message: "Current latitude and longitude are required"
                });
                return;
            }

            const lat = parseFloat(latitude as string);
            const lon = parseFloat(longitude as string);
            const rad = parseFloat(radius as string);

            // Using PostGIS to find active incidents within radius
            const incidents = await AppDataSource.query(`
                SELECT 
                    i.id, i.user_id, i.latitude, i.longitude, i.severity, i.status, i.trigger_type, i.created_at,
                    ST_Distance(
                        i.location::geography,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                    ) AS distance_meters
                FROM incidents i
                WHERE i.status = 'active'
                  AND ST_DWithin(
                        i.location::geography,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                        $3
                  )
                ORDER BY distance_meters ASC
            `, [lon, lat, rad]);

            res.json({
                success: true,
                count: incidents.length,
                data: incidents
            });
        } catch (error: any) {
            console.error("[Responder] Get nearby incidents error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch nearby incidents",
                error: error.message
            });
        }
    };

    /**
     * POST /api/v1/responder/incidents/:id/accept
     * Accept a pending incident
     */
    acceptIncident = async (req: Request, res: Response): Promise<void> => {
        try {
            const responderId = (req as any).user?.id; // From auth middleware
            const incidentId = req.params.id;

            if (!responderId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }

            // Check if incident exists and is still active
            const incident = await this.incidentRepository.findOne({
                where: { id: incidentId as string, status: "active" }
            });

            if (!incident) {
                res.status(404).json({
                    success: false,
                    message: "Incident not found or already handled"
                });
                return;
            }

            // Update incident
            incident.status = "on_the_way";
            incident.responder_id = responderId;
            incident.responder_accepted_at = new Date();

            await this.incidentRepository.save(incident);

            // Update responder status
            await this.responderRepository.update(responderId, {
                status: "on_the_way"
            });

            res.json({
                success: true,
                message: "Incident accepted. Proceed to location.",
                data: {
                    incident_id: incident.id,
                    status: incident.status,
                    victim_latitude: incident.latitude,
                    victim_longitude: incident.longitude
                }
            });
        } catch (error: any) {
            console.error("[Responder] Accept incident error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to accept incident",
                error: error.message
            });
        }
    };

    /**
     * POST /api/v1/responder/location
     * Update responder's current location and track route in incident trail
     */
    updateLocation = async (req: Request, res: Response): Promise<void> => {
        try {
            const responderId = (req as any).user?.id;
            const { latitude, longitude, speed } = req.body;

            if (!responderId || !latitude || !longitude) {
                res.status(400).json({ success: false, message: "Invalid request data" });
                return;
            }

            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);

            // Update current location in Responder table
            await this.responderRepository.update(responderId, {
                current_latitude: lat,
                current_longitude: lon,
                last_location_update: new Date()
            });

            // Update PostGIS location column for spatial queries
            await AppDataSource.query(`
                UPDATE responders 
                SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
                WHERE id = $3
            `, [lon, lat, responderId]);

            // If responder is handling an incident, add to responder_trail
            const activeIncident = await this.incidentRepository.findOne({
                where: { responder_id: responderId, status: "on_the_way" }
            });

            if (activeIncident) {
                const trail = activeIncident.responder_trail || [];
                trail.push({
                    latitude: lat,
                    longitude: lon,
                    timestamp: new Date().toISOString(),
                    speed: speed || 0
                });

                // Limit trail size to last 50 points
                await this.incidentRepository.update(activeIncident.id, {
                    responder_trail: trail.slice(-50)
                });
            }

            res.json({ success: true, message: "Location updated" });
        } catch (error: any) {
            console.error("[Responder] Update location error:", error);
            res.status(500).json({ success: false, message: "Failed to update location" });
        }
    };

    /**
     * POST /api/v1/responder/incidents/:id/resolve
     * Mark an incident as resolved
     */
    resolveIncident = async (req: Request, res: Response): Promise<void> => {
        try {
            const responderId = (req as any).user?.id;
            const incidentId = req.params.id;
            const { notes } = req.body;

            const incident = await this.incidentRepository.findOne({
                where: { id: incidentId as string, responder_id: responderId }
            });

            if (!incident) {
                res.status(404).json({ success: false, message: "Incident not found" });
                return;
            }

            const now = new Date();
            let responseTime = 0;
            if (incident.created_at) {
                responseTime = (now.getTime() - new Date(incident.created_at).getTime()) / 60000;
            }

            await this.incidentRepository.update(incidentId, {
                status: "resolved",
                resolved_at: now,
                resolution_notes: notes || "Resolved by responder",
                response_time_minutes: responseTime
            });

            // Set responder back to available
            await this.responderRepository.update(responderId, {
                status: "available",
                total_incidents_handled: (await this.responderRepository.findOneBy({ id: responderId }))?.total_incidents_handled! + 1
            });

            res.json({
                success: true,
                message: "Incident resolved",
                response_time_minutes: responseTime.toFixed(2)
            });
        } catch (error: any) {
            console.error("[Responder] Resolve incident error:", error);
            res.status(500).json({ success: false, message: "Failed to resolve incident" });
        }
    };
}
