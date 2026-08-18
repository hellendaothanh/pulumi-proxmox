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

// Quản lý SSE clients để stream logs theo thời gian thực
type LogListener = (data: string) => void;
const logListeners = new Set<LogListener>();

function broadcastLog(message: string) {
    for (const listener of logListeners) {
        listener(message);
    }
}

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
    const body = req.body;
    const vms: VmConfig[] = Array.isArray(body.vms) ? body.vms : [body];

    if (!vms || vms.length === 0) {
        return res.status(400).json({ success: false, error: "Danh sách VM rỗng." });
    }

    for (const vm of vms) {
        if (!vm.name || !vm.nodeName) {
            return res.status(400).json({ success: false, error: "Tên VM và Node Name là bắt buộc cho tất cả máy ảo." });
        }
    }

    const isBatch = vms.length > 1;
    const stackNames = vms.map(v => `vm-${v.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")}`);

    if (isBatch) {
        broadcastLog(`\n[CLUSTER] Bắt đầu khởi tạo cụm ${vms.length} máy ảo: ${vms.map(v => `${v.name} (@${v.nodeName})`).join(", ")}...`);
    } else {
        broadcastLog(`\n[CREATE] Bắt đầu khởi tạo stack '${stackNames[0]}' cho máy ảo ${vms[0].name}...`);
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

                const logHandler = createLogStreamHandler("Updating");

                const result = await stack.up({ onOutput: logHandler });
                broadcastLog(`PROGRESS_END:Updating`);
                broadcastLog(`[SUCCESS] ${prefix} Triển khai thành công VM ${config.name} trên Node ${config.nodeName}! Outputs: ${JSON.stringify(result.outputs)}`);
            } catch (err: any) {
                broadcastLog(`PROGRESS_END:Updating`);
                broadcastLog(`[ERROR] ${prefix} Lỗi khi tạo VM ${config.name}: ${err.message}`);
            }
        }

        if (isBatch) {
            broadcastLog(`\n[DONE] Đã hoàn tất chu trình triển khai cho toàn bộ cụm ${vms.length} máy ảo!`);
        }
    })();

    res.json({
        success: true,
        message: isBatch 
            ? `Đã tiếp nhận yêu cầu khởi tạo cụm ${vms.length} máy ảo. Quá trình đang diễn ra...`
            : `Đã tiếp nhận yêu cầu tạo VM '${vms[0].name}'. Quá trình đang diễn ra...`,
        count: vms.length,
        stackNames,
    });
});

// Endpoint xóa VM (kiểm tra protection)
app.delete("/api/vms/:stackName", async (req, res) => {
    const { stackName } = req.params;
    const force = req.query.force === "true";

    broadcastLog(`\n[DESTROY] Bắt đầu xử lý xóa stack '${stackName}'...`);

    try {
        const stack = await LocalWorkspace.selectStack({
            stackName,
            projectName: "pulumi-proxmox",
            program: async () => {},
        });

        // Kiểm tra xem VM có đang bật Protection không
        const outputs = await stack.outputs();
        const nodeName = outputs.nodeName?.value;
        const vmId = outputs.vmId?.value;

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

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌐 Proxmox VM Self-Service Portal đang chạy tại:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
