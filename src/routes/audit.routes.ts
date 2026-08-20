import { Router, Request, Response } from "express";
import { getAuditLogs } from "../services/audit.service";

export const auditRouter = Router();

auditRouter.get("/", (req: Request, res: Response) => {
    res.json({ success: true, data: getAuditLogs() });
});
