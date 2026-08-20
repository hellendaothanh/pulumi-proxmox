import { Router, Request, Response } from "express";
import { proxmoxClient } from "../proxmox-api";
import { alertService } from "../alert-service";

export const resourcesRouter = Router();

resourcesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const clusterData = await proxmoxClient.getClusterOverview();
        alertService.checkClusterMetrics().catch(() => {});
        res.json({ success: true, data: clusterData });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
