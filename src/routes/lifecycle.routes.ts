import { Router, Request, Response } from "express";
import { proxmoxClient } from "../proxmox-api";
import { getAuthUser } from "../middleware/auth.middleware";
import { checkVmPermission } from "../middleware/rbac.middleware";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog } from "../services/log-stream.service";

export const lifecycleRouter = Router();

// 1. Thao tác nguồn VM (start, stop, shutdown, reset, reboot)
lifecycleRouter.post("/nodes/:node/vms/:vmid/power", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const userRole = authUser.role;
    const userName = authUser.username;
    const { node, vmid } = req.params;
    const { action } = req.body;

    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        recordAuditLog({
            username: userName,
            role: userRole,
            action: `POWER_${action?.toUpperCase()}_DENIED`,
            target: `VM #${vmid} (@${node})`,
            status: "DENIED",
            details: permCheck.reason
        });
        return res.status(403).json({
            success: false,
            error: `[RBAC DENIED] ${permCheck.reason}`
        });
    }

    if (!["start", "stop", "shutdown", "reset", "reboot"].includes(action)) {
        return res.status(400).json({ success: false, error: "Hành động nguồn không hợp lệ." });
    }

    try {
        let task: any = null;
        let actionLabel = "";

        switch (action) {
            case "start":
                actionLabel = "Khởi động (Start)";
                task = await proxmoxClient.vmStart(node, vmid);
                break;
            case "stop":
                actionLabel = "Tắt nóng / Force Stop";
                task = await proxmoxClient.vmStop(node, vmid);
                break;
            case "shutdown":
                actionLabel = "Tắt nguồn an toàn (ACPI Shutdown)";
                task = await proxmoxClient.vmShutdown(node, vmid);
                break;
            case "reset":
                actionLabel = "Reset cưỡng bức (Force Reset)";
                task = await proxmoxClient.vmReset(node, vmid);
                break;
            case "reboot":
                actionLabel = "Khởi động lại (Reboot)";
                task = await proxmoxClient.vmReboot(node, vmid);
                break;
        }

        recordAuditLog({
            username: userName,
            role: userRole,
            action: `POWER_${action.toUpperCase()}`,
            target: `VM #${vmid} (@${node})`,
            status: "SUCCESS",
            details: `Gửi lệnh ${actionLabel} tới VM #${vmid}`
        });

        broadcastLog(`⚡ [POWER] [User: ${userName}] Sent ${actionLabel} command to VM #${vmid} on Node '${node}' (Task ID: ${task || 'OK'})`);
        res.json({ success: true, message: `Lệnh ${actionLabel} đã được gửi thành công.`, data: task });
    } catch (error: any) {
        broadcastLog(`❌ [POWER ERROR] Failed executing power action '${action}' for VM #${vmid}: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Lấy Web Console URL & noVNC ticket
lifecycleRouter.get("/nodes/:node/vms/:vmid/console", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({
            success: false,
            error: `[RBAC DENIED] ${permCheck.reason}`
        });
    }

    try {
        const consoleUrl = proxmoxClient.getDirectConsoleUrl(node, vmid);
        let vncData = null;
        let authTicket = null;

        try {
            [vncData, authTicket] = await Promise.all([
                proxmoxClient.getVncTicket(node, vmid),
                proxmoxClient.createAuthTicket()
            ]);
        } catch {
            // fallback
        }

        const proxmoxHost = (process.env.PROXMOX_VE_ENDPOINT || "").replace(/\/$/, "");

        res.json({
            success: true,
            data: {
                consoleUrl,
                proxmoxHost,
                vncData,
                authTicket: authTicket ? { ticket: authTicket.ticket, CSRFPreventionToken: authTicket.CSRFPreventionToken } : null
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
