import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { createVmProgram, VmConfig } from "./pulumi-program";
import { proxmoxClient } from "./proxmox-api";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ==========================================
// AUDIT LOGS & RBAC GOVERNANCE
// ==========================================
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    username: string;
    role: "admin" | "developer" | "viewer" | string;
    action: string;
    target: string;
    environment?: string;
    status: "SUCCESS" | "DENIED" | "FAILED";
    details?: string;
    ip?: string;
}

const auditLogs: AuditLogEntry[] = [
    {
        id: "audit-init",
        timestamp: new Date().toISOString(),
        username: "system",
        role: "admin",
        action: "SYSTEM_INIT",
        target: "Proxmox Cluster",
        status: "SUCCESS",
        details: "Hệ thống Governance & Audit Logs khởi động thành công"
    }
];

function recordAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
    const newLog: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        ...entry
    };
    auditLogs.unshift(newLog);
    if (auditLogs.length > 500) auditLogs.pop(); // Giới hạn 500 bản ghi gần nhất
    return newLog;
}

// Quản lý SSE clients để stream logs theo thời gian thực
type LogListener = (data: string) => void;
const logListeners = new Set<LogListener>();

function broadcastLog(message: string) {
    for (const listener of logListeners) {
        listener(message);
    }
}

// Endpoint lấy danh sách Audit Logs
app.get("/api/audit-logs", (req, res) => {
    res.json({ success: true, data: auditLogs });
});

// Endpoint SSE stream logs
app.get("/api/logs/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data: string) => {
        res.write(`data: ${JSON.stringify({ message: data, time: new Date().toISOString() })}\n\n`);
    };

    logListeners.add(sendEvent);
    sendEvent("[System] Connected to Pulumi Automation Log Stream");

    req.on("close", () => {
        logListeners.delete(sendEvent);
    });
});

// Endpoint lấy toàn bộ tài nguyên cụm Proxmox (Node IP, CPU, RAM, Storages, Images, VM list)
app.get("/api/resources", async (req, res) => {
    try {
        const clusterData = await proxmoxClient.getClusterOverview();
        res.json({ success: true, data: clusterData });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint lấy danh sách Stacks / VMs
app.get("/api/vms", async (req, res) => {
    try {
        const ws = await LocalWorkspace.create({
            workDir: path.join(__dirname, ".."),
        });
        const stacks = await ws.listStacks();
        
        const vmStacks = stacks.filter(s => s.name !== "dev"); // "dev" là stack ban đầu
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

function createLogStreamHandler(defaultAction: "Updating" | "Destroying") {
    let progressStartTime = Date.now();
    let inProgress = false;
    let currentAction = defaultAction;

    return (rawChunk: string) => {
        const lines = rawChunk.split(/\r?\n/);
        for (const rawLine of lines) {
            const clean = rawLine.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
            if (!clean) continue;

            // Nếu chỉ chứa dấu chấm (.)
            if (clean.replace(/\./g, '').trim() === '') {
                if (!inProgress) {
                    inProgress = true;
                    progressStartTime = Date.now();
                    broadcastLog(`PROGRESS_START:${currentAction}`);
                } else {
                    const elapsed = Math.floor((Date.now() - progressStartTime) / 1000);
                    broadcastLog(`PROGRESS_TICK:${currentAction}:${elapsed}`);
                }
                continue;
            }

            const match = clean.match(/^@?\s*(updating|destroying|deleting|refreshing|previewing)/i);
            if (match) {
                currentAction = (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()) as any;
                if ((currentAction as string) === "Deleting") currentAction = "Destroying";
                inProgress = true;
                progressStartTime = Date.now();
                broadcastLog(`PROGRESS_START:${currentAction}`);
                continue;
            }

            broadcastLog(clean);
        }
    };
}

async function resolveDatastoreForNode(nodeName: string, preferredDatastore?: string): Promise<string> {
    try {
        const storages = await proxmoxClient.getNodeStorages(nodeName);
        if (!storages || storages.length === 0) return "local-lvm";

        // Lọc bỏ hoàn toàn 'local' vì 'local' chỉ dùng cho ISO/Template/Backup
        const valid = storages.filter((s: any) => s.active !== 0 && s.storage !== "local");
        if (valid.length === 0) return "local-lvm";

        // Nếu người dùng chọn storage cụ thể (và khác local) tồn tại trên node này
        if (preferredDatastore && preferredDatastore !== "local" && valid.some((s: any) => s.storage === preferredDatastore)) {
            return preferredDatastore;
        }

        // Tự động tìm storage hợp lệ cho VM Disk trên node này (ưu tiên zfs-storage, zfs, local-lvm)
        const match = valid.find((s: any) => s.storage === "zfs-storage") ||
                      valid.find((s: any) => s.storage === "zfs") ||
                      valid.find((s: any) => s.storage.includes("zfs")) ||
                      valid.find((s: any) => s.storage.includes("lvm")) ||
                      valid[0];

        return match ? match.storage : "local-lvm";
    } catch {
        return preferredDatastore && preferredDatastore !== "local" ? preferredDatastore : "local-lvm";
    }
}

// Endpoint tạo 1 VM hoặc Cụm nhiều VM
app.post("/api/vms", async (req, res) => {
    const userRole = (req.headers["x-user-role"] as string) || "admin";
    const userName = (req.headers["x-user-name"] as string) || (userRole === "admin" ? "admin" : "developer");
    const body = req.body;
    const vms: VmConfig[] = Array.isArray(body.vms) ? body.vms : [body];

    if (!vms || vms.length === 0) {
        return res.status(400).json({ success: false, error: "Danh sách VM rỗng." });
    }

    // RBAC Check: Developer chỉ được phép tạo trên môi trường DEV
    if (userRole === "developer") {
        for (const vm of vms) {
            const env = (vm.environment || "dev").toLowerCase();
            if (env !== "dev") {
                recordAuditLog({
                    username: userName,
                    role: userRole,
                    action: "CREATE_VM_DENIED",
                    target: vm.name,
                    environment: env,
                    status: "DENIED",
                    details: `Developer '${userName}' bị từ chối tạo VM trên môi trường '${env.toUpperCase()}'. Chỉ Admin mới có quyền thao tác trên STAGING/PROD.`
                });
                return res.status(403).json({
                    success: false,
                    error: `[RBAC DENIED] Bạn đang đăng nhập với quyền Developer. Developer chỉ được phép triển khai máy ảo trên môi trường DEV (Môi trường yêu cầu: ${env.toUpperCase()}).`
                });
            }
        }
    }

    for (const vm of vms) {
        if (!vm.name || !vm.nodeName) {
            return res.status(400).json({ success: false, error: "Tên VM và Node Name là bắt buộc cho tất cả máy ảo." });
        }
    }

    const isBatch = vms.length > 1;
    const stackNames = vms.map(v => `vm-${v.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")}`);

    // Ghi Audit Log bắt đầu tạo VM
    recordAuditLog({
        username: userName,
        role: userRole,
        action: isBatch ? "BATCH_CREATE_VM" : "CREATE_VM",
        target: vms.map(v => v.name).join(", "),
        environment: vms[0].environment || "dev",
        status: "SUCCESS",
        details: `Khởi tạo ${vms.length} máy ảo trên Node [${Array.from(new Set(vms.map(v => v.nodeName))).join(", ")}]`
    });

    if (isBatch) {
        broadcastLog(`\n[CLUSTER] [User: ${userName} (${userRole.toUpperCase()})] Bắt đầu khởi tạo cụm ${vms.length} máy ảo: ${vms.map(v => `${v.name} (@${v.nodeName})`).join(", ")}...`);
    } else {
        broadcastLog(`\n[CREATE] [User: ${userName} (${userRole.toUpperCase()})] Bắt đầu khởi tạo stack '${stackNames[0]}' cho máy ảo ${vms[0].name}...`);
    }

    // Chạy tiến trình triển khai bất đồng bộ tuần tự
    (async () => {
        for (let i = 0; i < vms.length; i++) {
            const config = vms[i];
            const stackName = stackNames[i];
            const prefix = isBatch ? `[${i + 1}/${vms.length} - ${config.name}]` : `[${config.name}]`;

            // Tự động phân giải datastore phù hợp với từng Node
            config.datastoreId = await resolveDatastoreForNode(config.nodeName, config.datastoreId);

            broadcastLog(`\n[PULUMI] ${prefix} Đang khởi tạo stack '${stackName}' trên Node '${config.nodeName}' (Storage: ${config.datastoreId})...`);

            try {
                const program = createVmProgram(config);
                const stack = await LocalWorkspace.createOrSelectStack({
                    stackName,
                    projectName: "pulumi-proxmox",
                    program,
                });

                await stack.setConfig("proxmox:endpoint", { value: process.env.PROXMOX_VE_ENDPOINT || "" });
                await stack.setConfig("proxmox:apiToken", { value: process.env.PROXMOX_VE_API_TOKEN || "", secret: true });
                await stack.setConfig("proxmox:insecure", { value: process.env.PROXMOX_VE_INSECURE || "true" });

                const logHandler = createLogStreamHandler("Updating");

                const upResult = await stack.up({
                    onOutput: logHandler,
                });

                broadcastLog(`PROGRESS_END:Updating`);
                broadcastLog(`✅ ${prefix} Triển khai thành công! VM ID: ${upResult.outputs.vmId?.value || 'N/A'}`);
            } catch (err: any) {
                broadcastLog(`PROGRESS_END:Updating`);
                broadcastLog(`❌ [ERROR] ${prefix} Thất bại: ${err.message}`);
            }
        }
    })();

    res.json({
        success: true,
        message: isBatch 
            ? `Đã nhận yêu cầu khởi tạo cụm ${vms.length} máy ảo. Tiến trình đang chạy ngầm...` 
            : `Đã nhận yêu cầu khởi tạo stack '${stackNames[0]}'. Tiến trình đang chạy ngầm...`,
        data: {
            stacks: stackNames,
            vms: vms.map(v => v.name),
        }
    });
});

// Endpoint xóa VM (kiểm tra protection)
app.delete("/api/vms/:stackName", async (req, res) => {
    const userRole = (req.headers["x-user-role"] as string) || "admin";
    const userName = (req.headers["x-user-name"] as string) || (userRole === "admin" ? "admin" : "developer");
    const { stackName } = req.params;
    const force = req.query.force === "true";

    broadcastLog(`\n[DESTROY] [User: ${userName} (${userRole.toUpperCase()})] Bắt đầu xử lý xóa stack '${stackName}'...`);

    try {
        const stack = await LocalWorkspace.selectStack({
            stackName,
            projectName: "pulumi-proxmox",
            program: async () => {},
        });

        // Kiểm tra outputs của VM
        const outputs = await stack.outputs();
        const nodeName = outputs.nodeName?.value;
        const vmId = outputs.vmId?.value;
        const environment = (outputs.environment?.value || "dev").toLowerCase();

        // RBAC Check: Developer chỉ được phép xóa trên môi trường DEV
        if (userRole === "developer" && environment !== "dev") {
            recordAuditLog({
                username: userName,
                role: userRole,
                action: "DELETE_VM_DENIED",
                target: stackName,
                environment: environment,
                status: "DENIED",
                details: `Developer '${userName}' bị từ chối xóa stack '${stackName}' trên môi trường '${environment.toUpperCase()}'. Chỉ Admin mới có quyền xóa tài nguyên STAGING/PROD.`
            });
            return res.status(403).json({
                success: false,
                error: `[RBAC DENIED] Bạn đang đăng nhập với quyền Developer. Không được phép xóa máy ảo trên môi trường '${environment.toUpperCase()}'.`
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
            const warningMsg = `[WARNING] VM '${stackName}' (VM ID: ${vmId || 'N/A'}) đang BẬT chế độ Protection trên Proxmox. Hãy vào Proxmox VE -> VM -> Options -> Tắt Protection hoặc xác nhận Force Destroy!`;
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
            details: `Tiến hành hủy hoàn toàn VM và stack '${stackName}' (VM ID: ${vmId || 'N/A'})`
        });

        const logHandler = createLogStreamHandler("Destroying");

        stack.destroy({
            onOutput: logHandler,
        }).then(async () => {
            broadcastLog(`PROGRESS_END:Destroying`);
            await stack.workspace.removeStack(stackName);
            broadcastLog(`[DESTROYED] Đã xóa hoàn toàn VM và stack '${stackName}'!`);
        }).catch((err) => {
            broadcastLog(`PROGRESS_END:Destroying`);
            if (err.message && err.message.includes("protection mode enabled")) {
                broadcastLog(`[PROTECTED] Proxmox từ chối xóa: VM ${vmId} vẫn đang bật Protection Mode trên Proxmox VE. Hãy vào Proxmox VE -> VM ${vmId} -> Options -> Tắt Protection trước khi xóa.`);
            } else {
                broadcastLog(`[ERROR] Lỗi khi hủy VM ${stackName}: ${err.message}`);
            }
        });

        res.json({
            success: true,
            message: `Đang tiến hành hủy máy ảo thuộc stack '${stackName}'...`,
        });
    } catch (error: any) {
        broadcastLog(`❌ [ERROR] Không tìm thấy stack ${stackName}: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// VM LIFECYCLE MANAGEMENT API (Power, Snapshots, Console)
// ==========================================

// 1. Thao tác nguồn VM (start, stop, shutdown, reset, reboot)
app.post("/api/nodes/:node/vms/:vmid/power", async (req, res) => {
    const { node, vmid } = req.params;
    const { action } = req.body; // "start" | "stop" | "shutdown" | "reset" | "reboot"

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

        broadcastLog(`⚡ [POWER] Đã gửi lệnh ${actionLabel} tới VM #${vmid} trên Node '${node}' (Task ID: ${task || 'OK'})`);
        res.json({ success: true, message: `Lệnh ${actionLabel} đã được gửi thành công.`, data: task });
    } catch (error: any) {
        broadcastLog(`❌ [POWER ERROR] Lỗi khi thực hiện lệnh nguồn '${action}' cho VM #${vmid}: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Danh sách Snapshot của VM
app.get("/api/nodes/:node/vms/:vmid/snapshots", async (req, res) => {
    const { node, vmid } = req.params;
    try {
        const snapshots = await proxmoxClient.getVmSnapshots(node, vmid);
        res.json({ success: true, data: snapshots });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Tạo Snapshot mới cho VM
app.post("/api/nodes/:node/vms/:vmid/snapshots", async (req, res) => {
    const { node, vmid } = req.params;
    const { snapname, description, vmstate } = req.body;

    if (!snapname) {
        return res.status(400).json({ success: false, error: "Tên Snapshot là bắt buộc." });
    }

    try {
        broadcastLog(`📸 [SNAPSHOT] Đang tạo snapshot '${snapname}' cho VM #${vmid} trên Node '${node}'...`);
        const result = await proxmoxClient.createVmSnapshot(node, vmid, snapname, description, !!vmstate);
        broadcastLog(`✅ [SNAPSHOT] Tạo snapshot '${snapname}' cho VM #${vmid} hoàn tất!`);
        res.json({ success: true, message: `Đã tạo snapshot '${snapname}' thành công.`, data: result });
    } catch (error: any) {
        broadcastLog(`❌ [SNAPSHOT ERROR] Lỗi khi tạo snapshot '${snapname}': ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Khôi phục (Rollback) Snapshot
app.post("/api/nodes/:node/vms/:vmid/snapshots/:snapname/rollback", async (req, res) => {
    const { node, vmid, snapname } = req.params;
    try {
        broadcastLog(`🔄 [SNAPSHOT] Đang khôi phục VM #${vmid} về snapshot '${snapname}'...`);
        const result = await proxmoxClient.rollbackVmSnapshot(node, vmid, snapname);
        broadcastLog(`✅ [SNAPSHOT] Đã khôi phục VM #${vmid} về snapshot '${snapname}' thành công!`);
        res.json({ success: true, message: `Đã khôi phục về snapshot '${snapname}' thành công.`, data: result });
    } catch (error: any) {
        broadcastLog(`❌ [SNAPSHOT ERROR] Lỗi khi rollback snapshot '${snapname}': ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Xóa Snapshot
app.delete("/api/nodes/:node/vms/:vmid/snapshots/:snapname", async (req, res) => {
    const { node, vmid, snapname } = req.params;
    try {
        broadcastLog(`🗑️ [SNAPSHOT] Đang xóa snapshot '${snapname}' của VM #${vmid}...`);
        const result = await proxmoxClient.deleteVmSnapshot(node, vmid, snapname);
        broadcastLog(`✅ [SNAPSHOT] Đã xóa snapshot '${snapname}' của VM #${vmid} hoàn tất!`);
        res.json({ success: true, message: `Đã xóa snapshot '${snapname}' thành công.`, data: result });
    } catch (error: any) {
        broadcastLog(`❌ [SNAPSHOT ERROR] Lỗi khi xóa snapshot '${snapname}': ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Lấy Web Console URL & noVNC ticket
app.get("/api/nodes/:node/vms/:vmid/console", async (req, res) => {
    const { node, vmid } = req.params;
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

        // Endpoint Proxmox VE gốc
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

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌐 Proxmox VM Self-Service Portal đang chạy tại:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
