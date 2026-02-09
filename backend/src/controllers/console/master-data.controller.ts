import { Request, Response } from "express";
import { AppDataSource } from "../../config/database";
import { EmergencyOrganization } from "../../entities/EmergencyOrganization";
import { Region } from "../../entities/Region";
import { auditLogger } from "../../utils/logger";

/**
 * MasterDataController - Handles configuration of critical regional infrastructure
 * Allows supervisors to manage Police Stations, Hospitals, etc. per City
 */
export class MasterDataController {
    private orgRepository = AppDataSource.getRepository(EmergencyOrganization);
    private regionRepository = AppDataSource.getRepository(Region);

    /**
     * Get All Organizations with filtering
     */
    async getOrganizations(req: Request, res: Response) {
        try {
            const { type, region_id } = req.query;
            const where: any = {};
            if (type) where.type = type as string;
            if (region_id) where.region_id = region_id as string;

            const orgs = await this.orgRepository.find({
                where,
                relations: ["region"],
                order: { created_at: "DESC" }
            });

            res.json({ success: true, data: orgs });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Create New Emergency Organization Unit
     */
    async createOrganization(req: Request, res: Response) {
        try {
            const data = req.body;

            // Basic validation
            if (!data.name || !data.type || !data.phone || !data.region_id) {
                return res.status(400).json({ success: false, message: "Missing required fields" });
            }

            const org = this.orgRepository.create({
                ...data,
                location: data.latitude && data.longitude ?
                    `POINT(${data.longitude} ${data.latitude})` : null
            });

            const saved = await this.orgRepository.save(org) as unknown as EmergencyOrganization;

            auditLogger.info(`New unit registered: ${saved.name} [Type: ${saved.type}]`, {
                action: 'CREATE_ORG',
                org_id: saved.id,
                region_id: saved.region_id,
                operator: (req as any).user?.username || 'SYSTEM'
            });

            res.status(201).json({ success: true, data: saved });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Update Organization Details
     */
    async updateOrganization(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = req.body;

            const org = await this.orgRepository.findOneBy({ id: id as any });
            if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

            if (data.latitude && data.longitude) {
                data.location = `POINT(${data.longitude} ${data.latitude})`;
            }

            Object.assign(org, data);
            const updated = await this.orgRepository.save(org) as unknown as EmergencyOrganization;

            auditLogger.info(`Unit modified: ${updated.name}`, {
                action: 'UPDATE_ORG',
                org_id: updated.id,
                changes: data,
                operator: (req as any).user?.username || 'SYSTEM'
            });

            res.json({ success: true, data: updated });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Delete Organization Unit
     */
    async deleteOrganization(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.orgRepository.delete(id);

            auditLogger.info(`Unit decommissioned/deleted`, {
                action: 'DELETE_ORG',
                org_id: id,
                operator: (req as any).user?.username || 'SYSTEM'
            });

            res.json({ success: true, message: "Organization deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get All Cities/Regions for Supervisor Settings
     */
    async getRegions(req: Request, res: Response) {
        try {
            const regions = await this.regionRepository.find({
                where: { is_active: true }
            });
            res.json({ success: true, data: regions });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
