import { Request, Response } from "express";
import { ConsoleService } from "../../services/console.service";

/**
 * Console Controller - For Command Center Web Dashboard
 */
export class ConsoleController {
    private consoleService = new ConsoleService();

    /**
     * GET /api/v1/console/dashboard/summary
     */
    getSummary = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.consoleService.getStatsSummary();
            res.json({ success: true, data: stats });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * GET /api/v1/console/monitoring/incidents
     */
    getLiveIncidents = async (req: Request, res: Response): Promise<void> => {
        try {
            const incidents = await this.consoleService.getLiveIncidents();
            res.json({ success: true, count: incidents.length, data: incidents });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * GET /api/v1/console/monitoring/responders
     */
    getResponderMap = async (req: Request, res: Response): Promise<void> => {
        try {
            const map = await this.consoleService.getResponderMap();
            res.json({ success: true, count: map.length, data: map });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * POST /api/v1/console/incidents/:id/dispatch
     */
    dispatchResponder = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { responder_id } = req.body;

            if (!responder_id) {
                res.status(400).json({ success: false, message: "Responder ID is required" });
                return;
            }

            await this.consoleService.manualDispatch(id as string, responder_id);
            res.json({ success: true, message: "Responder dispatched manually" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * GET /api/v1/console/analytics/trend
     */
    getTrend = async (req: Request, res: Response): Promise<void> => {
        try {
            const trend = await this.consoleService.getHourlyTrend();
            res.json({ success: true, data: trend });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * GET /api/v1/console/incidents/:id/intelligence
     */
    getIncidentIntelligence = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id as string;
            const intel = await this.consoleService.getIncidentIntelligence(id);
            res.json({ success: true, data: intel });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
