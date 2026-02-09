import { AppDataSource } from "../config/database";
import { Incident } from "../entities/Incident";
import { User } from "../entities/User";
import { Responder } from "../entities/Responder";

/**
 * Incident Service - Business logic for incident management
 */
export class IncidentService {
    private incidentRepository = AppDataSource.getRepository(Incident);
    private userRepository = AppDataSource.getRepository(User);
    private responderRepository = AppDataSource.getRepository(Responder);

    /**
     * Create new incident (Panic Button Trigger)
     */
    async createIncident(data: {
        user_id: string;
        latitude: number;
        longitude: number;
        breadcrumbs?: Array<{
            latitude: number;
            longitude: number;
            timestamp: string;
            accuracy?: number;
        }>;
        trigger_type?: string;
        device_info?: any;
    }): Promise<Incident> {
        // Verify user exists
        const user = await this.userRepository.findOne({
            where: { id: data.user_id }
        });

        if (!user) {
            throw new Error("User not found");
        }

        // ENFORCE PROFILING SYSTEM: Command Center requires valid data to handle incidents
        if (!user.nik || !user.blood_type || !user.address) {
            throw new Error("SECURITY_ERROR: Profiling incomplete. Command Center cannot authorize dispatch without valid NIK/Blood Type.");
        }

        // Create incident
        const incident = this.incidentRepository.create({
            user_id: data.user_id,
            latitude: data.latitude,
            longitude: data.longitude,
            breadcrumbs: data.breadcrumbs || [],
            trigger_type: data.trigger_type || "manual",
            device_info: data.device_info,
            status: "active",
            severity: "high", // Default to high for panic button
        });

        // Save incident
        const savedIncident = await this.incidentRepository.save(incident);

        // Update PostGIS geometry column
        await this.updateIncidentLocation(savedIncident.id, data.latitude, data.longitude);

        // TODO: Find and assign nearest responder
        // TODO: Send push notification to responder
        // TODO: Notify emergency contact

        return savedIncident;
    }

    /**
     * Update incident location (PostGIS geometry)
     */
    private async updateIncidentLocation(
        incidentId: string,
        latitude: number,
        longitude: number
    ): Promise<void> {
        try {
            console.log(`[Database] Updating location for incident ${incidentId}: ${latitude}, ${longitude}`);

            // Explicitly ensure parameters are correct types
            const params = [
                Number(longitude),
                Number(latitude),
                String(incidentId)
            ];

            await AppDataSource.query(
                `UPDATE incidents 
                 SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
                 WHERE id = $3`,
                params
            );

            console.log(`[Database] PostGIS location updated for ${incidentId}`);
        } catch (error) {
            console.error(`[Database] Failed to update PostGIS location for ${incidentId}:`, error);
            // Don't throw here to avoid failing the whole request just because of PostGIS update
            // although ideally it should work.
        }
    }

    /**
     * Get incident by ID
     */
    async getIncidentById(incidentId: string, userId?: string): Promise<Incident | null> {
        const where: any = { id: incidentId };

        // If userId provided, ensure incident belongs to user
        if (userId) {
            where.user_id = userId;
        }

        const incident = await this.incidentRepository.findOne({
            where,
            relations: ["user", "responder"]
        });

        return incident;
    }

    /**
     * Get user's active incident
     */
    async getUserActiveIncident(userId: string): Promise<Incident | null> {
        const incident = await this.incidentRepository.findOne({
            where: {
                user_id: userId,
                status: "active"
            },
            relations: ["responder"],
            order: {
                created_at: "DESC"
            }
        });

        return incident;
    }

    /**
     * Update incident breadcrumbs (victim's location trail)
     */
    async updateBreadcrumbs(
        incidentId: string,
        userId: string,
        breadcrumb: {
            latitude: number;
            longitude: number;
            timestamp: string;
            accuracy?: number;
        }
    ): Promise<void> {
        const incident = await this.getIncidentById(incidentId, userId);

        if (!incident) {
            throw new Error("Incident not found or access denied");
        }

        if (incident.status !== "active") {
            throw new Error("Cannot update breadcrumbs for non-active incident");
        }

        // Add new breadcrumb to array
        const breadcrumbs = incident.breadcrumbs || [];
        breadcrumbs.push(breadcrumb);

        // Keep only last 15 minutes of breadcrumbs (assuming 1 update per 30s = max 30 points)
        const maxBreadcrumbs = 30;
        const updatedBreadcrumbs = breadcrumbs.slice(-maxBreadcrumbs);

        await this.incidentRepository.update(incidentId, {
            breadcrumbs: updatedBreadcrumbs,
            latitude: breadcrumb.latitude,
            longitude: breadcrumb.longitude
        });
    }

    /**
     * Cancel incident (false alarm)
     */
    async cancelIncident(incidentId: string, userId: string): Promise<void> {
        const incident = await this.getIncidentById(incidentId, userId);

        if (!incident) {
            throw new Error("Incident not found or access denied");
        }

        if (incident.status !== "active") {
            throw new Error("Can only cancel active incidents");
        }

        await this.incidentRepository.update(incidentId, {
            status: "false_alarm",
            resolved_at: new Date(),
            resolution_notes: "Cancelled by user (false alarm)"
        });

        // TODO: Notify responder if assigned
    }

    /**
     * Get incident history for user
     */
    async getUserIncidentHistory(
        userId: string,
        limit: number = 10,
        offset: number = 0
    ): Promise<{ incidents: Incident[]; total: number }> {
        const [incidents, total] = await this.incidentRepository.findAndCount({
            where: { user_id: userId },
            relations: ["responder"],
            order: { created_at: "DESC" },
            take: limit,
            skip: offset
        });

        return { incidents, total };
    }

    /**
     * Get responder info for incident
     */
    async getIncidentResponder(incidentId: string, userId: string): Promise<{
        responder: Responder | null;
        eta_minutes: number | null;
        distance_km: number | null;
        status: string;
    }> {
        const incident = await this.getIncidentById(incidentId, userId);

        if (!incident) {
            throw new Error("Incident not found or access denied");
        }

        if (!incident.responder_id) {
            return {
                responder: null,
                eta_minutes: null,
                distance_km: null,
                status: "searching"
            };
        }

        const responder = await this.responderRepository.findOne({
            where: { id: incident.responder_id }
        });

        if (!responder) {
            return {
                responder: null,
                eta_minutes: incident.eta_minutes || null,
                distance_km: null,
                status: incident.status
            };
        }

        // Calculate current distance if responder has location
        let distance_km: number | null = null;
        if (responder.current_latitude && responder.current_longitude) {
            const result = await AppDataSource.query(
                `SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
                ) / 1000 AS distance_km`,
                [
                    incident.longitude,
                    incident.latitude,
                    responder.current_longitude,
                    responder.current_latitude
                ]
            );
            distance_km = parseFloat(result[0].distance_km);
        }

        return {
            responder: {
                id: responder.id,
                name: responder.name,
                phone: responder.phone,
                type: responder.type,
                badge_number: responder.badge_number,
                status: responder.status,
                current_latitude: responder.current_latitude,
                current_longitude: responder.current_longitude
            } as any,
            eta_minutes: incident.eta_minutes || null,
            distance_km,
            status: incident.status
        };
    }

    /**
     * Find nearest available responder (using PostGIS)
     */
    async findNearestResponder(
        latitude: number,
        longitude: number,
        type?: string,
        maxDistanceKm: number = 50
    ): Promise<Responder | null> {
        let query = `
            SELECT 
                r.*,
                ST_Distance(
                    r.location::geography,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) / 1000 AS distance_km
            FROM responders r
            WHERE r.status = 'available'
              AND r.is_active = true
              AND r.location IS NOT NULL
        `;

        const params: any[] = [longitude, latitude];

        if (type) {
            query += ` AND r.type = $3`;
            params.push(type);
        }

        query += `
            AND ST_DWithin(
                r.location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $${params.length + 1}
            )
            ORDER BY r.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
            LIMIT 1
        `;

        params.push(maxDistanceKm * 1000); // Convert km to meters

        const result = await AppDataSource.query(query, params);

        return result.length > 0 ? result[0] : null;
    }
}
