import { Router, Request, Response } from "express";
import { alertService } from "../alert-service";
import { getAuthUser } from "../middleware/auth.middleware";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog } from "../services/log-stream.service";

export const alertsRouter = Router();

// 1. Lấy thông tin cảnh báo, ngưỡng và lịch sử cảnh báo
alertsRouter.get("/", (req: Request, res: Response) => {
    const status = alertService.getStatus();
    res.json({ success: true, data: status });
});

// 2. Cập nhật cấu hình ngưỡng và các kênh thông báo (Telegram / Webhook)
alertsRouter.post("/config", (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
        return res.status(403).json({ success: false, error: "[RBAC DENIED] Chỉ Admin mới có quyền cập nhật cấu hình Cảnh Báo Ngưỡng!" });
    }

    try {
        const updated = alertService.updateConfig(req.body);
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "UPDATE_ALERT_CONFIG",
            target: `Alert Thresholds (Storage: ${updated.storagePercent}%, CPU: ${updated.cpuPercent}%, RAM: ${updated.ramPercent}%)`,
            status: "SUCCESS",
            details: `Cập nhật cấu hình cảnh báo tài nguyên cụm Proxmox`,
        });
        broadcastLog(`⚙️ [Alert Engine] [User: ${authUser.username}] Alert thresholds updated (Storage: ${updated.storagePercent}%, CPU: ${updated.cpuPercent}%, RAM: ${updated.ramPercent}%)`);
        res.json({ success: true, message: "Alert configuration updated successfully!", data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Gửi thông báo thử nghiệm (Test Alert) tới Telegram / Webhook
alertsRouter.post("/test", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role === "viewer") {
        return res.status(403).json({ success: false, error: "[RBAC DENIED] Viewer account is not permitted to send test alerts." });
    }

    try {
        const result = await alertService.sendTestAlert();
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "SEND_TEST_ALERT",
            target: "Telegram & Webhook Notification Channels",
            status: (result.telegramSuccess || result.webhookSuccess) ? "SUCCESS" : "FAILED",
            details: result.details,
        });
        res.json({ success: true, message: "Test notification sent successfully!", data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Kích hoạt quét tức thời toàn bộ tài nguyên cụm
alertsRouter.post("/check", async (req: Request, res: Response) => {
    try {
        await alertService.checkClusterMetrics();
        const status = alertService.getStatus();
        res.json({ success: true, message: `Cluster scan completed. Detected ${status.activeCount} active alert(s).`, data: status });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Tạm ẩn / Đánh dấu đã xem cảnh báo
alertsRouter.post("/dismiss", (req: Request, res: Response) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "Missing alert id." });
    const success = alertService.dismissAlert(id);
    res.json({ success, message: success ? "Alert dismissed." : "Alert not found." });
});
