import { AppDataSource } from "../config/database";
import { Incident } from "../entities/Incident";
import { Responder } from "../entities/Responder";
import { User } from "../entities/User";
import { Between, In, IsNull, Not } from "typeorm";

/**
 * Console Service - Business logic for Command Center Dashboard
 */
export class ConsoleService {
    private incidentRepository = AppDataSource.getRepository(Incident);
    private responderRepository = AppDataSource.getRepository(Responder);

    /**
     * Get Dashboard Statistics Summary
     */
    async getStatsSummary(): Promise<any> {
        const todayAtZero = new Date();
        todayAtZero.setHours(0, 0, 0, 0);

        const [
            totalToday,
            activeCount,
            onWayCount,
            resolvedToday,
            totalResponders,
            availableResponders
        ] = await Promise.all([
            this.incidentRepository.countBy({ created_at: Between(todayAtZero, new Date()) } as any),
            this.incidentRepository.countBy({ status: "active" }),
            this.incidentRepository.countBy({ status: "on_the_way" }),
            this.incidentRepository.countBy({
                status: "resolved",
                resolved_at: Between(todayAtZero, new Date())
            } as any),
            this.responderRepository.count(),
            this.responderRepository.countBy({ status: "available", is_active: true })
        ]);

        // Calculate Average Response Time for today
        const responseTimeResult = await this.incidentRepository
            .createQueryBuilder("incident")
            .select("AVG(incident.response_time_minutes)", "avg")
            .where("incident.status = :status", { status: "resolved" })
            .andWhere("incident.resolved_at >= :start", { start: todayAtZero })
            .getRawOne();

        // Regional Performance Breakdown
        const regionalStats = await this.incidentRepository
            .createQueryBuilder("incident")
            .select("region.name", "region_name")
            .addSelect("COUNT(*)", "total_incidents")
            .addSelect("AVG(incident.response_time_minutes)", "avg_response_time")
            .leftJoin("regions", "region", "incident.region_id = region.id")
            .where("incident.created_at >= :start", { start: todayAtZero })
            .groupBy("region.name")
            .getRawMany();

        return {
            incidents: {
                total_today: totalToday,
                active: activeCount,
                responding: onWayCount,
                resolved_today: resolvedToday
            },
            responders: {
                total: totalResponders,
                online: availableResponders,
                deployment_rate: totalResponders > 0 ? ((totalResponders - availableResponders) / totalResponders * 100).toFixed(1) + "%" : "0%"
            },
            avg_response_time: parseFloat(responseTimeResult?.avg || 0).toFixed(2) + " mins",
            regional_performance: regionalStats.map(rs => ({
                region: rs.region_name || "UNKNOWN",
                count: parseInt(rs.total_incidents),
                avg_time: parseFloat(rs.avg_response_time || 0).toFixed(2) + "m"
            }))
        };
    }

    /**
     * Get All Active Incidents for Live Map
     */
    async getLiveIncidents(): Promise<Incident[]> {
        return await this.incidentRepository.find({
            where: {
                status: In(["active", "on_the_way"])
            },
            relations: ["user", "responder"],
            order: { created_at: "DESC" }
        });
    }

    /**
     * Get All Responder Locations for Live Map
     */
    async getResponderMap(): Promise<any[]> {
        return await this.responderRepository.find({
            select: ["id", "name", "type", "status", "current_latitude", "current_longitude", "last_location_update", "department"],
            where: { is_active: true }
        });
    }

    /**
     * Get Incident Hourly Trend (Last 24 Hours)
     */
    async getHourlyTrend(): Promise<any[]> {
        return await AppDataSource.query(`
            SELECT 
                date_trunc('hour', created_at) as hour,
                COUNT(*) as count
            FROM incidents
            WHERE created_at > now() - interval '24 hours'
            GROUP BY hour
            ORDER BY hour ASC
        `);
    }

    /**
     * Manual Dispatch - Assign specific responder to incident
     */
    async manualDispatch(incidentId: string, responderId: string): Promise<void> {
        const incident = await this.incidentRepository.findOneBy({ id: incidentId });
        const responder = await this.responderRepository.findOneBy({ id: responderId });

        if (!incident || !responder) {
            throw new Error("Incident or Responder not found");
        }

        if (responder.status !== "available") {
            throw new Error("Responder is not available for dispatch");
        }

        await this.incidentRepository.update(incidentId, {
            responder_id: responderId,
            status: "on_the_way",
            dispatched_at: new Date()
        });

        await this.responderRepository.update(responderId, {
            status: "busy"
        });
    }

    /**
     * Get Incident Intelligence (Nearby Responders)
     */
    async getIncidentIntelligence(incidentId: string): Promise<any> {
        const incident = await this.incidentRepository.findOne({
            where: { id: incidentId },
            relations: ["user"]
        });

        if (!incident) throw new Error("Incident not found");

        // Find 3 nearest available responders using PostGIS for precise tactical suggestions
        const nearby = await AppDataSource.query(`
            SELECT 
                r.id, 
                r.name, 
                r.type, 
                r.badge_number, 
                r.department,
                ST_Distance(
                    r.location::geography, 
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) / 1000 AS distance_km
            FROM responders r
            WHERE r.is_active = true 
              AND r.status = 'available'
              AND r.location IS NOT NULL
            ORDER BY r.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
            LIMIT 3
        `, [incident.longitude, incident.latitude]);

        return {
            incident,
            nearby_responders: nearby.map((r: any) => ({
                ...r,
                distance_km: parseFloat(r.distance_km).toFixed(2)
            }))
        };
    }
}
