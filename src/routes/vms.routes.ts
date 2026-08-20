import { Router, Request, Response } from "express";
import path from "path";
import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { proxmoxClient } from "../proxmox-api";
import { getAuthUser } from "../middleware/auth.middleware";
import { VmConfig, ApprovalRequest } from "../types";
import { ROLE_QUOTAS } from "../config/constants";
import { calculateUserResourceUsage } from "../services/quota.service";
import { approvalRequests } from "../services/state.service";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog, createLogStreamHandler } from "../services/log-stream.service";
import { executeVmDeployment } from "../services/deployment.service";

export const vmsRouter = Router();

// 1. Lấy danh sách Stacks / VMs
vmsRouter.get("/", async (req: Request, res: Response) => {
    try {
        const ws = await LocalWorkspace.create({
            workDir: path.join(process.cwd()),
        });
        const stacks = await ws.listStacks();
        
        const vmStacks = stacks.filter(s => s.name !== "dev");
        const results = [];

        for (const s of vmStacks) {
            try {
                const stack = await LocalWorkspace.selectStack({
                    stackName: s.name,
                    projectName: "pulumi-proxmox",
                    program: async () => {},
                });
                const outputs = await stack.outputs();
                const nodeName = outputs.nodeName?.value;
                const vmId = outputs.vmId?.value;

                let environment = outputs.environment?.value || "dev";
                let tags: string[] = outputs.tags?.value || [];

                let isProtected = outputs.protection?.value ?? false;
                let ips: string[] = [];
                if (nodeName && vmId) {
                    try {
                        const [liveConfig, agentNet] = await Promise.all([
                            proxmoxClient.getVmConfig(nodeName, vmId),
                            proxmoxClient.getVmAgentNetwork(nodeName, vmId),
                        ]);
                        if (liveConfig) {
                            isProtected = !!(liveConfig.protection === 1 || liveConfig.protection === true || liveConfig.protection === "1");
                            if (liveConfig.tags) {
                                const parsedTags = typeof liveConfig.tags === "string" 
                                    ? liveConfig.tags.split(/[,;\s]+/).filter(Boolean)
                                    : Array.isArray(liveConfig.tags) ? liveConfig.tags : [];
                                if (parsedTags.length > 0) {
                                    tags = Array.from(new Set([...tags, ...parsedTags]));
                                    if (parsedTags.includes("pro") || parsedTags.includes("prod") || parsedTags.includes("production")) {
                                        environment = "pro";
                                    } else if (parsedTags.includes("stag") || parsedTags.includes("staging")) {
                                        environment = "stag";
                                    } else if (parsedTags.includes("dev")) {
                                        environment = "dev";
                                    }
                                }
                            }
                        }
                        if (agentNet && agentNet.result) {
                            for (const iface of agentNet.result) {
                                if (iface["ip-addresses"]) {
                                    for (const ip of iface["ip-addresses"]) {
                                        if (ip["ip-address-type"] === "ipv4" && ip["ip-address"] !== "127.0.0.1") {
                                            ips.push(ip["ip-address"]);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // ignore if VM was removed
                    }
                }

                results.push({
                    stackName: s.name,
                    current: s.current,
                    lastUpdate: s.lastUpdate,
                    vmId: vmId,
                    vmName: outputs.vmName?.value || s.name,
                    nodeName: nodeName,
                    environment: environment,
                    tags: tags,
                    protection: isProtected,
                    ips: ips,
                    status: s.resourceCount ? "Deployed" : "Destroyed",
                });
            } catch (err) {
                results.push({
                    stackName: s.name,
                    status: "Unknown",
                });
            }
        }

        res.json({ success: true, data: results });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Tạo 1 VM hoặc Cụm nhiều VM (kèm Quota Check & Approval Gate)
vmsRouter.post("/", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập để thực hiện tạo máy ảo." });
    }
    const userRole = authUser.role;
    const userName = authUser.username;
    const body = req.body;
    const vms: VmConfig[] = Array.isArray(body.vms) ? body.vms : [body];

    if (!vms || vms.length === 0) {
        return res.status(400).json({ success: false, error: "Danh sách VM rỗng." });
    }

    if (userRole === "viewer") {
        recordAuditLog({
            username: userName,
            role: userRole,
            action: "CREATE_VM_DENIED",
            target: vms.map(v => v.name).join(", "),
            status: "DENIED",
            details: `Viewer account '${userName}' denied permission to create VM.`
        });
        return res.status(403).json({
            success: false,
            error: "[RBAC DENIED] Tài khoản của bạn có vai trò 'Viewer' (Chỉ xem). Bạn không có quyền khởi tạo máy ảo mới."
        });
    }

    for (const vm of vms) {
        if (!vm.name || !vm.nodeName) {
            return res.status(400).json({ success: false, error: "Tên VM và Node Name là bắt buộc cho tất cả máy ảo." });
        }
        const currentTags: string[] = Array.isArray(vm.tags) ? vm.tags : (typeof vm.tags === 'string' ? (vm.tags as string).split(',') : []);
        if (!currentTags.some((t: string) => t.toLowerCase() === `user:${userName.toLowerCase()}`)) {
            currentTags.push(`user:${userName}`);
        }
        vm.tags = currentTags;
    }

    let needsApproval = false;
    let approvalReason = "";
    let approvalDetails = "";

    if (userRole === "developer") {
        const quota = ROLE_QUOTAS.developer;
        const currentUsage = await calculateUserResourceUsage(userName);

        const requestedVms = vms.length;
        const requestedCores = vms.reduce((sum, v) => sum + (Number(v.cores) || 1), 0);
        const requestedMemoryMb = vms.reduce((sum, v) => sum + (Number(v.memoryMb) || 1024), 0);

        const totalVms = currentUsage.vms + requestedVms;
        const totalCores = currentUsage.cores + requestedCores;
        const totalMemoryMb = currentUsage.memoryMb + requestedMemoryMb;

        const restrictedEnvVm = vms.find(v => (v.environment || "dev").toLowerCase() !== "dev");
        if (restrictedEnvVm) {
            needsApproval = true;
            approvalReason = "ENV_RESTRICTION";
            approvalDetails = `Developer '${userName}' requested deployment on ${restrictedEnvVm.environment?.toUpperCase()} environment. STAGING/PROD environments require Admin approval.`;
        }

        if (totalVms > quota.maxVms || totalCores > quota.maxCores || totalMemoryMb > quota.maxMemoryMb) {
            needsApproval = true;
            approvalReason = "QUOTA_EXCEEDED";
            const quotaDetailsArr = [];
            if (totalVms > quota.maxVms) quotaDetailsArr.push(`VMs: ${totalVms}/${quota.maxVms}`);
            if (totalCores > quota.maxCores) quotaDetailsArr.push(`vCPUs: ${totalCores}/${quota.maxCores}`);
            if (totalMemoryMb > quota.maxMemoryMb) quotaDetailsArr.push(`RAM: ${Math.round(totalMemoryMb/1024)}GB/${Math.round(quota.maxMemoryMb/1024)}GB`);
            
            approvalDetails = `Request exceeds Developer quota limits (${quotaDetailsArr.join(", ")}). Admin review and authorization required.`;
        }
    }

    if (needsApproval) {
        const requestId = `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const newRequest: ApprovalRequest = {
            id: requestId,
            createdAt: new Date().toISOString(),
            requestedBy: {
                username: userName,
                role: userRole,
                displayName: authUser.displayName || userName
            },
            reason: approvalReason,
            reasonDetails: approvalDetails,
            status: "PENDING",
            vms: vms
        };

        approvalRequests.unshift(newRequest);

        recordAuditLog({
            username: userName,
            role: userRole,
            action: "CREATE_VM_PENDING_APPROVAL",
            target: vms.map(v => v.name).join(", "),
            environment: vms[0].environment || "dev",
            status: "PENDING_APPROVAL",
            details: `Provisioning request for ${vms.length} VM(s) submitted to approval queue. Reason: ${approvalDetails}`
        });

        broadcastLog(`\n[APPROVAL QUEUE] ⏳ User '${userName}' submitted a request for ${vms.length} VM(s) [${vms.map(v => v.name).join(", ")}]. Status: Pending Admin approval.`);

        return res.json({
            success: true,
            requiresApproval: true,
            message: `⏳ Provisioning request has been submitted to Administrator for approval due to ${approvalReason === "ENV_RESTRICTION" ? "deployment on STAGING/PROD" : "exceeding resource quota"}.`,
            data: {
                requestId: newRequest.id,
                status: "PENDING",
                reason: approvalReason,
                details: approvalDetails,
                vms: vms.map(v => v.name)
            }
        });
    }

    const isBatch = vms.length > 1;
    const stackNames = vms.map(v => `vm-${v.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")}`);

    recordAuditLog({
        username: userName,
        role: userRole,
        action: isBatch ? "BATCH_CREATE_VM" : "CREATE_VM",
        target: vms.map(v => v.name).join(", "),
        environment: vms[0].environment || "dev",
        status: "SUCCESS",
        details: `Provisioning ${vms.length} VM(s) on Node [${Array.from(new Set(vms.map(v => v.nodeName))).join(", ")}]`
    });

    executeVmDeployment(vms, { username: userName, role: userRole });

    res.json({
        success: true,
        message: isBatch 
            ? `Received provisioning request for cluster of ${vms.length} VMs. Background task running...` 
            : `Received provisioning request for stack '${stackNames[0]}'. Background task running...`,
        data: {
            stacks: stackNames,
            vms: vms.map(v => v.name),
        }
    });
});

// 3. Xóa VM
vmsRouter.delete("/:stackName", async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập để thực hiện xóa máy ảo." });
    }
    const userRole = authUser.role;
    const userName = authUser.username;
    const { stackName } = req.params;
    const force = req.query.force === "true";

    if (userRole === "viewer") {
        recordAuditLog({
            username: userName,
            role: userRole,
            action: "DELETE_VM_DENIED",
            target: stackName,
            status: "DENIED",
            details: `Viewer account '${userName}' denied permission to delete stack '${stackName}'.`
        });
        return res.status(403).json({
            success: false,
            error: "[RBAC DENIED] Viewer account is not permitted to delete virtual machines."
        });
    }

    broadcastLog(`\n[DESTROY] [User: ${userName} (${userRole.toUpperCase()})] Initiating deletion for stack '${stackName}'...`);

    try {
        const stack = await LocalWorkspace.selectStack({
            stackName,
            projectName: "pulumi-proxmox",
            program: async () => {},
        });

        const outputs = await stack.outputs();
        const nodeName = outputs.nodeName?.value;
        const vmId = outputs.vmId?.value;
        const environment = (outputs.environment?.value || "dev").toLowerCase();

        if (userRole === "developer" && environment !== "dev") {
            recordAuditLog({
                username: userName,
                role: userRole,
                action: "DELETE_VM_DENIED",
                target: stackName,
                environment: environment,
                status: "DENIED",
                details: `Developer account '${userName}' denied permission to delete stack '${stackName}' on '${environment.toUpperCase()}'. Only Admin can delete STAGING/PROD resources.`
            });
            return res.status(403).json({
                success: false,
                error: `[RBAC DENIED] Bạn đang đăng nhập với quyền Developer. Không được phép xóa máy ảo trên môi trường '${environment.toUpperCase()}'. Chỉ Admin mới có quyền này.`
            });
        }

        let isProtected = false;
        if (nodeName && vmId) {
            try {
                const liveConfig = await proxmoxClient.getVmConfig(nodeName, vmId);
                if (liveConfig) {
                    isProtected = !!(liveConfig.protection === 1 || liveConfig.protection === true || liveConfig.protection === "1");
                }
            } catch (e) {
                // ignore
            }
        } else {
            isProtected = outputs.protection?.value ?? false;
        }

        if (isProtected && !force) {
            const warningMsg = `[WARNING] VM '${stackName}' (VM ID: ${vmId || 'N/A'}) has Protection Mode enabled in Proxmox. Please go to Proxmox VE -> VM -> Options -> Disable Protection or confirm Force Destroy!`;
            broadcastLog(warningMsg);
            return res.status(400).json({
                success: false,
                isProtected: true,
                error: warningMsg,
            });
        }

        recordAuditLog({
            username: userName,
            role: userRole,
            action: "DELETE_VM",
            target: stackName,
            environment: environment,
            status: "SUCCESS",
            details: `Permanently destroying VM and stack '${stackName}' (VM ID: ${vmId || 'N/A'})`
        });

        const logHandler = createLogStreamHandler("Destroying");

        stack.destroy({
            onOutput: logHandler,
        }).then(async () => {
            broadcastLog(`PROGRESS_END:Destroying`);
            await stack.workspace.removeStack(stackName);
            broadcastLog(`[DESTROYED] Successfully deleted VM and stack '${stackName}'!`);
        }).catch((err) => {
            broadcastLog(`PROGRESS_END:Destroying`);
            if (err.message && err.message.includes("protection mode enabled")) {
                broadcastLog(`[PROTECTED] Proxmox VE rejected delete: VM ${vmId} has Protection Mode enabled. Please disable Protection in Proxmox VE before deleting.`);
            } else {
                broadcastLog(`[ERROR] Error destroying VM ${stackName}: ${err.message}`);
            }
        });

        res.json({
            success: true,
            message: `Destroying virtual machines for stack '${stackName}'...`,
        });
    } catch (error: any) {
        broadcastLog(`❌ [ERROR] Stack ${stackName} not found: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});
