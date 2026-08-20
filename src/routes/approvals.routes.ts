import { Router, Request, Response } from "express";
import { getAuthUser } from "../middleware/auth.middleware";
import { ROLE_QUOTAS } from "../config/constants";
import { calculateUserResourceUsage } from "../services/quota.service";
import { approvalRequests } from "../services/state.service";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog } from "../services/log-stream.service";
import { executeVmDeployment } from "../services/deployment.service";

export const approvalsRouter = Router();

// Endpoint lấy hạn mức Quota & Mức sử dụng tài nguyên hiện tại
approvalsRouter.get("/quotas/me", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Chưa đăng nhập." });
    }

    const quota = (ROLE_QUOTAS as any)[authUser.role] || { maxVms: 999, maxCores: 999, maxMemoryMb: 999999 };
    const usage = await calculateUserResourceUsage(authUser.username);

    res.json({
        success: true,
        data: {
            username: authUser.username,
            role: authUser.role,
            quota,
            usage,
            isAdmin: authUser.role === "admin"
        }
    });
});

// Endpoint lấy danh sách yêu cầu phê duyệt (Approval Requests)
approvalsRouter.get("/approvals", (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Chưa đăng nhập." });
    }

    let list = approvalRequests;
    if (authUser.role === "developer") {
        list = approvalRequests.filter(r => r.requestedBy.username === authUser.username);
    }

    res.json({
        success: true,
        data: list
    });
});

// Endpoint Admin Phê duyệt (Approve) hoặc Từ chối (Reject) yêu cầu
approvalsRouter.post("/approvals/:id/:action", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
        return res.status(403).json({ success: false, error: "[RBAC DENIED] Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền phê duyệt hoặc từ chối yêu cầu." });
    }

    const { id, action } = req.params;
    const { rejectionReason } = req.body;
    const request = approvalRequests.find(r => r.id === id);

    if (!request) {
        return res.status(404).json({ success: false, error: "Không tìm thấy yêu cầu phê duyệt này." });
    }

    if (request.status !== "PENDING") {
        return res.status(400).json({ success: false, error: `Yêu cầu này đã được xử lý trước đó (Trạng thái: ${request.status}).` });
    }

    if (action === "approve") {
        request.status = "APPROVED";
        request.resolvedAt = new Date().toISOString();
        request.resolvedBy = authUser.username;

        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "APPROVE_VM_REQUEST",
            target: request.vms.map(v => v.name).join(", "),
            environment: request.vms[0].environment || "dev",
            status: "SUCCESS",
            details: `Admin '${authUser.username}' APPROVED provisioning request for Developer '${request.requestedBy.username}'. Triggering Pulumi Engine.`
        });

        broadcastLog(`\n[APPROVAL] ✅ Request '${request.id}' from '${request.requestedBy.username}' has been approved by Admin '${authUser.username}'! Triggering provisioning...`);

        // Kích hoạt Pulumi Runner chạy ngầm
        executeVmDeployment(request.vms, { username: request.requestedBy.username, role: request.requestedBy.role });

        return res.json({ success: true, message: `Approval request approved successfully! Pulumi background provisioning started.` });
    } else if (action === "reject") {
        request.status = "REJECTED";
        request.resolvedAt = new Date().toISOString();
        request.resolvedBy = authUser.username;
        request.rejectionReason = rejectionReason || "Not approved by Administrator.";

        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "REJECT_VM_REQUEST",
            target: request.vms.map(v => v.name).join(", "),
            environment: request.vms[0].environment || "dev",
            status: "DENIED",
            details: `Admin '${authUser.username}' REJECTED provisioning request from '${request.requestedBy.username}'. Reason: ${request.rejectionReason}`
        });

        broadcastLog(`\n[APPROVAL] ❌ Request '${request.id}' from '${request.requestedBy.username}' was rejected by Admin '${authUser.username}'. Reason: ${request.rejectionReason}`);

        return res.json({ success: true, message: "Approval request rejected." });
    } else {
        return res.status(400).json({ success: false, error: "Invalid action. Only 'approve' or 'reject' allowed." });
    }
});
