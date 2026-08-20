import { Router, Request, Response } from "express";
import { proxmoxClient } from "../proxmox-api";
import { getAuthUser } from "../middleware/auth.middleware";
import { checkVmPermission } from "../middleware/rbac.middleware";
import { ROLE_QUOTAS } from "../config/constants";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog } from "../services/log-stream.service";

export const hardwareRouter = Router();

// 1. Lấy chi tiết phần cứng & danh sách ổ đĩa VM
hardwareRouter.get("/nodes/:node/vms/:vmid/hardware", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    try {
        const hardware = await proxmoxClient.getVmHardwareDetails(node, vmid);
        res.json({ success: true, data: hardware });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Thay đổi Cấu hình Nóng CPU / RAM (Hotplug CPU & Memory)
hardwareRouter.put("/nodes/:node/vms/:vmid/hardware/hotplug", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    const { cores, memoryMb } = req.body;
    if (cores === undefined && memoryMb === undefined) {
        return res.status(400).json({ success: false, error: "Vui lòng cung cấp cores hoặc memoryMb cần điều chỉnh." });
    }

    if (authUser.role === "developer") {
        const userQuota = ROLE_QUOTAS.developer;
        if (cores && cores > userQuota.maxCores) {
            return res.status(403).json({ success: false, error: `[QUOTA DENIED] Số vCPU vượt quá hạn mức Developer (${userQuota.maxCores} vCPU).` });
        }
        if (memoryMb && memoryMb > userQuota.maxMemoryMb) {
            return res.status(403).json({ success: false, error: `[QUOTA DENIED] RAM vượt quá hạn mức Developer (${userQuota.maxMemoryMb} MB).` });
        }
    }

    try {
        const result = await proxmoxClient.updateVmHardware(node, vmid, { cores, memoryMb });
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "HOTPLUG_HARDWARE",
            target: `VM #${vmid} (@${node})`,
            status: "SUCCESS",
            details: `Thay đổi cấu hình nóng: ${cores ? `${cores} vCPU ` : ''}${memoryMb ? `${memoryMb} MB RAM` : ''}`,
        });
        broadcastLog(`⚡ [HOTPLUG] [User: ${authUser.username}] Hotplugged hardware on VM #${vmid}: ${cores ? `${cores} vCPU, ` : ''}${memoryMb ? `${memoryMb} MB RAM` : ''}`);
        res.json({ success: true, message: "Đã cập nhật cấu hình phần cứng thành công!", data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Mở rộng dung lượng đĩa trực tuyến (Online Disk Resize)
hardwareRouter.post("/nodes/:node/vms/:vmid/disks/resize", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    const { diskSlot, size } = req.body;
    if (!diskSlot || !size) {
        return res.status(400).json({ success: false, error: "Vui lòng cung cấp diskSlot (vd: scsi0) và size (vd: +10G)." });
    }

    try {
        const result = await proxmoxClient.resizeVmDisk(node, vmid, diskSlot, size);
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "RESIZE_DISK",
            target: `VM #${vmid} (@${node}) [${diskSlot}]`,
            status: "SUCCESS",
            details: `Mở rộng đĩa ${diskSlot} thêm ${size}`,
        });
        broadcastLog(`💾 [DISK RESIZE] [User: ${authUser.username}] Resized disk ${diskSlot} of VM #${vmid} (Size: ${size})`);
        res.json({ success: true, message: `Đã mở rộng đĩa ${diskSlot} thành công!`, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Gắn thêm Đĩa phụ mới (Hot-attach Secondary Virtual Disk)
hardwareRouter.post("/nodes/:node/vms/:vmid/disks/attach", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    const { storage, sizeGb, slot, discard, cache } = req.body;
    if (!storage || !sizeGb) {
        return res.status(400).json({ success: false, error: "Vui lòng cung cấp storage pool và dung lượng đĩa sizeGb." });
    }

    try {
        const result = await proxmoxClient.attachSecondaryDisk(node, vmid, {
            storage,
            sizeGb: Number(sizeGb),
            slot: slot || "scsi1",
            discard: discard !== false,
            cache: cache || "none",
        });
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "ATTACH_SECONDARY_DISK",
            target: `VM #${vmid} (@${node}) [${slot || 'scsi1'}]`,
            status: "SUCCESS",
            details: `Gắn đĩa phụ ${slot || 'scsi1'} (${sizeGb} GB) tại Storage Pool '${storage}'`,
        });
        broadcastLog(`💾 [MULTI-DISK] [User: ${authUser.username}] Attached secondary disk ${slot || 'scsi1'} (${sizeGb} GB on ${storage}) to VM #${vmid}`);
        res.json({ success: true, message: `Đã gắn đĩa phụ ${slot || 'scsi1'} (${sizeGb} GB) thành công!`, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Gỡ bỏ Đĩa phụ (Detach Secondary Disk)
hardwareRouter.delete("/nodes/:node/vms/:vmid/disks/:slot", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid, slot } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    if (slot === "scsi0" || slot === "bootdisk") {
        return res.status(400).json({ success: false, error: "Không thể gỡ ổ đĩa hệ điều hành chính (scsi0)!" });
    }

    try {
        const result = await proxmoxClient.detachVmDisk(node, vmid, slot);
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "DETACH_DISK",
            target: `VM #${vmid} (@${node}) [${slot}]`,
            status: "SUCCESS",
            details: `Gỡ ổ đĩa phụ ${slot} của VM #${vmid}`,
        });
        broadcastLog(`💾 [MULTI-DISK] [User: ${authUser.username}] Detached secondary disk ${slot} of VM #${vmid}`);
        res.json({ success: true, message: `Đã gỡ bỏ đĩa ${slot} thành công!`, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
