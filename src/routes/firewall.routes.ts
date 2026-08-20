import { Router, Request, Response } from "express";
import { proxmoxClient } from "../proxmox-api";
import { getAuthUser } from "../middleware/auth.middleware";
import { checkVmPermission } from "../middleware/rbac.middleware";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog } from "../services/log-stream.service";

export const firewallRouter = Router();

// 1. Lấy danh sách Firewall Rules & Options của VM
firewallRouter.get("/nodes/:node/vms/:vmid/firewall", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    try {
        const [rules, options] = await Promise.all([
            proxmoxClient.getVmFirewallRules(node, vmid),
            proxmoxClient.getVmFirewallOptions(node, vmid),
        ]);
        res.json({
            success: true,
            data: {
                rules: rules || [],
                options: options || { enable: 1, policy_in: "DROP", policy_out: "ACCEPT" },
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Cập nhật Firewall Options (Bật/Tắt Firewall VM, Đổi Policy)
firewallRouter.put("/nodes/:node/vms/:vmid/firewall/options", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    try {
        const result = await proxmoxClient.setVmFirewallOptions(node, vmid, req.body);
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "UPDATE_FIREWALL_OPTIONS",
            target: `VM #${vmid} (@${node})`,
            status: "SUCCESS",
            details: `Cập nhật cấu hình Firewall tổng thể cho VM #${vmid}`,
        });
        res.json({ success: true, message: "Đã cập nhật tùy chọn Firewall thành công!", data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Thêm Firewall Rule mới (Mở port / Chặn IP)
firewallRouter.post("/nodes/:node/vms/:vmid/firewall/rules", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    const { action, type, proto, dport, sport, source, dest, comment, enable } = req.body;

    try {
        const result = await proxmoxClient.addVmFirewallRule(node, vmid, {
            action: action || "ACCEPT",
            type: type || "in",
            proto: proto || "tcp",
            dport,
            sport,
            source,
            dest,
            comment,
            enable: enable !== undefined ? enable : 1,
        });

        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "ADD_FIREWALL_RULE",
            target: `VM #${vmid} (@${node})`,
            status: "SUCCESS",
            details: `Thêm Rule Firewall: [${action || 'ACCEPT'} ${type || 'IN'} ${proto || 'TCP'} Port:${dport || 'ANY'}] - ${comment || ''}`,
        });

        broadcastLog(`🛡️ [FIREWALL] [User: ${authUser.username}] Added Firewall Rule for VM #${vmid}: ${action || 'ACCEPT'} ${proto || 'TCP'} port ${dport || 'ANY'}`);
        res.json({ success: true, message: "Đã thêm Firewall Rule thành công!", data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Chỉnh sửa hoặc Toggle Bật/Tắt Firewall Rule
firewallRouter.put("/nodes/:node/vms/:vmid/firewall/rules/:pos", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid, pos } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    try {
        const result = await proxmoxClient.updateVmFirewallRule(node, vmid, Number(pos), req.body);
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "UPDATE_FIREWALL_RULE",
            target: `VM #${vmid} (@${node})`,
            status: "SUCCESS",
            details: `Cập nhật Firewall Rule #${pos} cho VM #${vmid}`,
        });
        res.json({ success: true, message: "Đã cập nhật Firewall Rule thành công!", data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Xóa Firewall Rule
firewallRouter.delete("/nodes/:node/vms/:vmid/firewall/rules/:pos", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const { node, vmid, pos } = req.params;
    const permCheck = await checkVmPermission(node, vmid, authUser);
    if (!permCheck.allowed) {
        return res.status(403).json({ success: false, error: `[RBAC DENIED] ${permCheck.reason}` });
    }

    try {
        const result = await proxmoxClient.deleteVmFirewallRule(node, vmid, Number(pos));
        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "DELETE_FIREWALL_RULE",
            target: `VM #${vmid} (@${node})`,
            status: "SUCCESS",
            details: `Xóa Firewall Rule #${pos} của VM #${vmid}`,
        });
        broadcastLog(`🛡️ [FIREWALL] [User: ${authUser.username}] Deleted Firewall Rule #${pos} of VM #${vmid}`);
        res.json({ success: true, message: "Đã xóa Firewall Rule thành công!", data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
