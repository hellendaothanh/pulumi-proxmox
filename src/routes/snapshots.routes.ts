import { Router, Request, Response } from "express";
import { proxmoxClient } from "../proxmox-api";
import { getAuthUser } from "../middleware/auth.middleware";
import { checkVmPermission } from "../middleware/rbac.middleware";
import { broadcastLog } from "../services/log-stream.service";

export const snapshotsRouter = Router();

// 1. Danh sách Snapshot của VM
snapshotsRouter.get("/nodes/:node/vms/:vmid/snapshots", async (req: Request, res: Response) => {
    const { node, vmid } = req.params;
    try {
        const snapshots = await proxmoxClient.getVmSnapshots(node, vmid);
        res.json({ success: true, data: snapshots });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Tạo Snapshot mới cho VM
snapshotsRouter.post("/nodes/:node/vms/:vmid/snapshots", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const userName = authUser.username;
    const { node, vmid } = req.params;
    const { snapname, description, vmstate } = req.body;

    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({
            success: false,
            error: `[RBAC DENIED] ${permCheck.reason}`
        });
    }

    if (!snapname) {
        return res.status(400).json({ success: false, error: "Tên Snapshot là bắt buộc." });
    }

    try {
        broadcastLog(`📸 [SNAPSHOT] [User: ${userName}] Creating snapshot '${snapname}' for VM #${vmid} on Node '${node}'...`);
        const result = await proxmoxClient.createVmSnapshot(node, vmid, snapname, description, !!vmstate);
        broadcastLog(`✅ [SNAPSHOT] Created snapshot '${snapname}' for VM #${vmid} successfully!`);
        res.json({ success: true, message: `Đã tạo snapshot '${snapname}' thành công.`, data: result });
    } catch (error: any) {
        broadcastLog(`❌ [SNAPSHOT ERROR] Failed creating snapshot '${snapname}': ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Khôi phục (Rollback) Snapshot
snapshotsRouter.post("/nodes/:node/vms/:vmid/snapshots/:snapname/rollback", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid, snapname } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({
            success: false,
            error: `[RBAC DENIED] ${permCheck.reason}`
        });
    }

    try {
        broadcastLog(`🔄 [SNAPSHOT] Restoring VM #${vmid} to snapshot '${snapname}'...`);
        const result = await proxmoxClient.rollbackVmSnapshot(node, vmid, snapname);
        broadcastLog(`✅ [SNAPSHOT] Restored VM #${vmid} to snapshot '${snapname}' successfully!`);
        res.json({ success: true, message: `Đã khôi phục về snapshot '${snapname}' thành công.`, data: result });
    } catch (error: any) {
        broadcastLog(`❌ [SNAPSHOT ERROR] Failed rolling back snapshot '${snapname}': ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Xóa Snapshot
snapshotsRouter.delete("/nodes/:node/vms/:vmid/snapshots/:snapname", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid, snapname } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({
            success: false,
            error: `[RBAC DENIED] ${permCheck.reason}`
        });
    }

    try {
        broadcastLog(`🗑️ [SNAPSHOT] Deleting snapshot '${snapname}' of VM #${vmid}...`);
        const result = await proxmoxClient.deleteVmSnapshot(node, vmid, snapname);
        broadcastLog(`✅ [SNAPSHOT] Deleted snapshot '${snapname}' of VM #${vmid} successfully!`);
        res.json({ success: true, message: `Đã xóa snapshot '${snapname}' thành công.`, data: result });
    } catch (error: any) {
        broadcastLog(`❌ [SNAPSHOT ERROR] Failed deleting snapshot '${snapname}': ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});
