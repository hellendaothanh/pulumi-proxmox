import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import * as fs from "fs";
import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { createVmProgram, VmConfig } from "./pulumi-program";
import { proxmoxClient } from "./proxmox-api";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ==========================================
// USER AUTHENTICATION & RBAC CONFIGURATION
// ==========================================
export interface UserAccount {
    username: string;
    password: string;
    role: "admin" | "developer" | "viewer";
    displayName: string;
    avatar: string;
}

// Lấy danh sách tài khoản từ biến môi trường .env (luôn nạp mới từ file .env nếu có thay đổi)
function getUserAccounts(): Record<string, UserAccount> {
    const envPaths = [
        path.resolve(process.cwd(), ".env"),
        path.join(__dirname, "../.env"),
        path.join(__dirname, "../../.env")
    ];

    for (const envPath of envPaths) {
        try {
            if (fs.existsSync(envPath)) {
                const parsed = dotenv.parse(fs.readFileSync(envPath, "utf-8"));
                Object.assign(process.env, parsed);
                break;
            }
        } catch {}
    }

    const accounts: Record<string, UserAccount> = {};

    const adminUser = process.env.AUTH_ADMIN_USERNAME ? String(process.env.AUTH_ADMIN_USERNAME).trim().replace(/^["']|["']$/g, "") : "";
    const adminPass = process.env.AUTH_ADMIN_PASSWORD ? String(process.env.AUTH_ADMIN_PASSWORD).trim().replace(/^["']|["']$/g, "") : "";

    const devUser = process.env.AUTH_DEV_USERNAME ? String(process.env.AUTH_DEV_USERNAME).trim().replace(/^["']|["']$/g, "") : "";
    const devPass = process.env.AUTH_DEV_PASSWORD ? String(process.env.AUTH_DEV_PASSWORD).trim().replace(/^["']|["']$/g, "") : "";

    const viewerUser = process.env.AUTH_VIEWER_USERNAME ? String(process.env.AUTH_VIEWER_USERNAME).trim().replace(/^["']|["']$/g, "") : "";
    const viewerPass = process.env.AUTH_VIEWER_PASSWORD ? String(process.env.AUTH_VIEWER_PASSWORD).trim().replace(/^["']|["']$/g, "") : "";

    if (adminUser && adminPass) {
        accounts[adminUser] = {
            username: adminUser,
            password: adminPass,
            role: "admin",
            displayName: "Administrator",
            avatar: "shield-check"
        };
    }

    if (devUser && devPass) {
        accounts[devUser] = {
            username: devUser,
            password: devPass,
            role: "developer",
            displayName: "DevSecOps Engineer",
            avatar: "code-2"
        };
    }

    if (viewerUser && viewerPass) {
        accounts[viewerUser] = {
            username: viewerUser,
            password: viewerPass,
            role: "viewer",
            displayName: "Cloud Monitor / Viewer",
            avatar: "eye"
        };
    }

    return accounts;
}

// In-memory runtime session store
const activeSessions = new Map<string, { username: string; role: string; displayName: string; avatar: string; loginTime: number }>();

// Auth Middleware: Trích xuất thông tin người dùng từ Session Token hoặc Authorization Header
function getAuthUser(req: express.Request) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : (req.headers["x-auth-token"] as string);

    if (token && activeSessions.has(token)) {
        return activeSessions.get(token)!;
    }

    // Fallback qua custom header nếu chạy chế độ test
    const userRole = (req.headers["x-user-role"] as string);
    const userName = (req.headers["x-user-name"] as string);
    if (userRole && userName) {
        return {
            username: userName,
            role: userRole,
            displayName: userName === "admin" ? "Administrator" : (userName === "viewer" ? "Viewer" : "Developer"),
            avatar: userRole === "admin" ? "shield-check" : (userRole === "viewer" ? "eye" : "code-2"),
            loginTime: Date.now()
        };
    }

    return null;
}

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
    status: "SUCCESS" | "DENIED" | "FAILED" | "PENDING_APPROVAL";
    details?: string;
    ip?: string;
}

// ==========================================
// RESOURCE QUOTAS & APPROVAL WORKFLOW
// ==========================================
export interface ResourceQuota {
    maxVms: number;       // Số VM tối đa cùng chạy/sở hữu (ví dụ: 2)
    maxCores: number;     // Số vCPU tối đa (ví dụ: 4)
    maxMemoryMb: number;  // Số RAM MB tối đa (ví dụ: 8192 MB = 8GB)
}

export const ROLE_QUOTAS: Record<string, ResourceQuota> = {
    developer: {
        maxVms: 2,
        maxCores: 4,
        maxMemoryMb: 8192, // 8GB RAM
    },
    viewer: {
        maxVms: 0,
        maxCores: 0,
        maxMemoryMb: 0,
    }
};

export interface ApprovalRequest {
    id: string;
    createdAt: string;
    requestedBy: {
        username: string;
        role: string;
        displayName: string;
    };
    reason: string; // "ENV_RESTRICTION" (STAGING/PROD) | "QUOTA_EXCEEDED"
    reasonDetails: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    resolvedAt?: string;
    resolvedBy?: string;
    rejectionReason?: string;
    vms: VmConfig[];
}

const approvalRequests: ApprovalRequest[] = [];

// Hàm tính tổng tài nguyên hiện tại của 1 user
async function calculateUserResourceUsage(username: string) {
    let currentVms = 0;
    let currentCores = 0;
    let currentMemoryMb = 0;

    try {
        const clusterOverview = await proxmoxClient.getClusterOverview();
        for (const node of clusterOverview) {
            for (const vm of node.vms || []) {
                // Kiểm tra xem VM có thuộc sở hữu của username qua tags hoặc tên không
                const tags: string[] = Array.isArray(vm.tags) ? vm.tags : (typeof vm.tags === 'string' ? vm.tags.split(',') : []);
                const isOwner = tags.some((t: string) => t.toLowerCase() === `user:${username.toLowerCase()}`) ||
                                tags.some((t: string) => t.toLowerCase() === username.toLowerCase()) ||
                                (vm.name && vm.name.toLowerCase().startsWith(username.toLowerCase()));

                if (isOwner) {
                    currentVms += 1;
                    currentCores += Number(vm.cpus || vm.cores || 1);
                    currentMemoryMb += Number(vm.maxmem ? Math.round(vm.maxmem / (1024 * 1024)) : (vm.memory || 0));
                }
            }
        }
    } catch (e) {
        console.warn("[QUOTA] Không thể quét chi tiết cluster resources cho quota check:", e);
    }

    return {
        vms: currentVms,
        cores: currentCores,
        memoryMb: currentMemoryMb,
    };
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
        details: "Hệ thống Authentication, Governance & Audit Logs khởi động thành công"
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

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// 1. Đăng nhập người dùng (User Login)
app.post("/api/auth/login", (req, res) => {
    const rawUsername = String(req.body.username || "").trim();
    const rawPassword = String(req.body.password || "").trim();
    const users = getUserAccounts();

    const user = users[rawUsername];
    const expectedPassword = user ? String(user.password || "").trim().replace(/^["']|["']$/g, "") : "";
    const cleanRawPassword = rawPassword.replace(/^["']|["']$/g, "");

    const isMatched = user && (expectedPassword === cleanRawPassword);

    if (!isMatched) {
        console.warn(`[AUTH FAILED] User: '${rawUsername}' | Expected: '${expectedPassword}' | Received: '${cleanRawPassword}'`);
        recordAuditLog({
            username: rawUsername || "unknown",
            role: "unknown",
            action: "LOGIN_FAILED",
            target: "Auth Service",
            status: "FAILED",
            details: `Thất bại khi đăng nhập với tài khoản '${rawUsername}'. Sai tên đăng nhập hoặc mật khẩu.`
        });
        return res.status(401).json({ 
            success: false, 
            error: `Tên đăng nhập hoặc mật khẩu không chính xác. (Mật khẩu tài khoản '${rawUsername}' đang được cấu hình trong .env)` 
        });
    }

    console.log(`[AUTH SUCCESS] User '${user.username}' (${user.role}) đăng nhập thành công!`);

    // Tạo token session ngẫu nhiên
    const token = `session_${user.username}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    activeSessions.set(token, {
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        avatar: user.avatar,
        loginTime: Date.now()
    });

    recordAuditLog({
        username: user.username,
        role: user.role,
        action: "USER_LOGIN",
        target: "Portal UI",
        status: "SUCCESS",
        details: `Đăng nhập thành công với vai trò ${user.role.toUpperCase()} (${user.displayName})`
    });

    res.json({
        success: true,
        data: {
            token,
            user: {
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                avatar: user.avatar
            }
        }
    });
});

// Endpoint kiểm tra nhanh trạng thái tài khoản đang được nạp
app.get("/api/auth/status", (req, res) => {
    const users = getUserAccounts();
    const safeUsers = Object.keys(users).map(k => ({
        username: users[k].username,
        role: users[k].role,
        displayName: users[k].displayName,
        passwordLength: users[k].password.length,
        passwordPreview: users[k].password.substring(0, 2) + "***"
    }));
    res.json({ success: true, loadedAccounts: safeUsers });
});

// 2. Lấy thông tin user hiện tại qua Session Token
app.get("/api/auth/me", (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Chưa đăng nhập hoặc phiên làm việc đã hết hạn." });
    }

    res.json({
        success: true,
        data: {
            username: authUser.username,
            role: authUser.role,
            displayName: authUser.displayName,
            avatar: authUser.avatar
        }
    });
});

// 3. Đăng xuất (Logout)
app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : (req.headers["x-auth-token"] as string);

    if (token && activeSessions.has(token)) {
        const user = activeSessions.get(token);
        activeSessions.delete(token);
        if (user) {
            recordAuditLog({
                username: user.username,
                role: user.role,
                action: "USER_LOGOUT",
                target: "Portal UI",
                status: "SUCCESS",
                details: `Người dùng '${user.username}' đã đăng xuất an toàn khỏi hệ thống.`
            });
        }
    }

    res.json({ success: true, message: "Đăng xuất thành công." });
});

// 4. Đổi mật khẩu phiên hiện tại (Runtime Password Change & Persist to .env)
app.post("/api/auth/change-password", (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Vui lòng đăng nhập trước khi đổi mật khẩu." });
    }

    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ success: false, error: "Mật khẩu mới phải có ít nhất 4 ký tự." });
    }

    const users = getUserAccounts();
    const user = users[authUser.username];
    if (!user || user.password !== oldPassword) {
        return res.status(400).json({ success: false, error: "Mật khẩu cũ không đúng." });
    }

    let envKey = "AUTH_ADMIN_PASSWORD";
    if (authUser.role === "admin") {
        process.env.AUTH_ADMIN_PASSWORD = newPassword;
        envKey = "AUTH_ADMIN_PASSWORD";
    } else if (authUser.role === "developer") {
        process.env.AUTH_DEV_PASSWORD = newPassword;
        envKey = "AUTH_DEV_PASSWORD";
    } else if (authUser.role === "viewer") {
        process.env.AUTH_VIEWER_PASSWORD = newPassword;
        envKey = "AUTH_VIEWER_PASSWORD";
    }

    // Ghi đè mật khẩu mới vào trực tiếp file .env để không bị mất khi restart server
    try {
        const envPath = path.join(__dirname, "../.env");
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, "utf-8");
            const regex = new RegExp(`^${envKey}=.*$`, "m");
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${envKey}="${newPassword}"`);
            } else {
                envContent += `\n${envKey}="${newPassword}"\n`;
            }
            fs.writeFileSync(envPath, envContent, "utf-8");
        }
    } catch (err: any) {
        console.error(`[AUTH] Không thể ghi file .env:`, err.message);
    }

    recordAuditLog({
        username: authUser.username,
        role: authUser.role,
        action: "CHANGE_PASSWORD",
        target: "Account Security",
        status: "SUCCESS",
        details: `Người dùng '${authUser.username}' đã đổi mật khẩu thành công và lưu vào .env.`
    });

    res.json({ success: true, message: "Đã đổi mật khẩu thành công! Mật khẩu mới đã được lưu vào file .env và có hiệu lực vĩnh viễn." });
});

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

// Helper thực thi tiến trình triển khai Pulumi cho danh sách VMs
async function executeVmDeployment(vms: VmConfig[], executor: { username: string; role: string }) {
    const isBatch = vms.length > 1;
    const stackNames = vms.map(v => `vm-${v.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")}`);

    if (isBatch) {
        broadcastLog(`\n[CLUSTER] [User: ${executor.username} (${executor.role.toUpperCase()})] Bắt đầu khởi tạo cụm ${vms.length} máy ảo: ${vms.map(v => `${v.name} (@${v.nodeName})`).join(", ")}...`);
    } else {
        broadcastLog(`\n[CREATE] [User: ${executor.username} (${executor.role.toUpperCase()})] Bắt đầu khởi tạo stack '${stackNames[0]}' cho máy ảo ${vms[0].name}...`);
    }

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
}

// Endpoint lấy hạn mức Quota & Mức sử dụng tài nguyên hiện tại
app.get("/api/quotas/me", async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Chưa đăng nhập." });
    }

    const quota = ROLE_QUOTAS[authUser.role] || { maxVms: 999, maxCores: 999, maxMemoryMb: 999999 };
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
app.get("/api/approvals", (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Chưa đăng nhập." });
    }

    // Admin thấy tất cả, Developer chỉ thấy yêu cầu do chính mình tạo
    let list = approvalRequests;
    if (authUser.role !== "admin") {
        list = approvalRequests.filter(r => r.requestedBy.username === authUser.username);
    }

    res.json({
        success: true,
        data: list
    });
});

// Endpoint Admin Phê duyệt (Approve) hoặc Từ chối (Reject) yêu cầu
app.post("/api/approvals/:id/:action", async (req, res) => {
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
            details: `Admin '${authUser.username}' đã PHÊ DUYỆT yêu cầu khởi tạo cho Developer '${request.requestedBy.username}'. Bắt đầu kích hoạt Pulumi Engine.`
        });

        broadcastLog(`\n[APPROVAL] ✅ Yêu cầu '${request.id}' của '${request.requestedBy.username}' đã được Admin '${authUser.username}' phê duyệt! Kích hoạt tiến trình khởi tạo...`);

        // Kích hoạt Pulumi Runner chạy ngầm
        executeVmDeployment(request.vms, { username: request.requestedBy.username, role: request.requestedBy.role });

        return res.json({ success: true, message: `Đã phê duyệt yêu cầu thành công! Tiến trình Pulumi đang khởi tạo máy ảo ngầm.` });
    } else if (action === "reject") {
        request.status = "REJECTED";
        request.resolvedAt = new Date().toISOString();
        request.resolvedBy = authUser.username;
        request.rejectionReason = rejectionReason || "Không được phê duyệt bởi Quản trị viên.";

        recordAuditLog({
            username: authUser.username,
            role: authUser.role,
            action: "REJECT_VM_REQUEST",
            target: request.vms.map(v => v.name).join(", "),
            environment: request.vms[0].environment || "dev",
            status: "DENIED",
            details: `Admin '${authUser.username}' đã TỪ CHỐI yêu cầu khởi tạo của '${request.requestedBy.username}'. Lý do: ${request.rejectionReason}`
        });

        broadcastLog(`\n[APPROVAL] ❌ Yêu cầu '${request.id}' của '${request.requestedBy.username}' đã bị Admin '${authUser.username}' từ chối. Lý do: ${request.rejectionReason}`);

        return res.json({ success: true, message: "Đã từ chối yêu cầu khởi tạo." });
    } else {
        return res.status(400).json({ success: false, error: "Hành động không hợp lệ. Chỉ chấp nhận 'approve' hoặc 'reject'." });
    }
});

// Endpoint tạo 1 VM hoặc Cụm nhiều VM (kèm Quota Check & Approval Gate)
app.post("/api/vms", async (req, res) => {
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

    // RBAC Check: Viewer chỉ được xem, không được tạo VM
    if (userRole === "viewer") {
        recordAuditLog({
            username: userName,
            role: userRole,
            action: "CREATE_VM_DENIED",
            target: vms.map(v => v.name).join(", "),
            status: "DENIED",
            details: `Tài khoản Viewer '${userName}' bị chặn quyền tạo máy ảo.`
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
        // Gắn tag người sở hữu để tính quota chính xác
        const currentTags: string[] = Array.isArray(vm.tags) ? vm.tags : (typeof vm.tags === 'string' ? (vm.tags as string).split(',') : []);
        if (!currentTags.some((t: string) => t.toLowerCase() === `user:${userName.toLowerCase()}`)) {
            currentTags.push(`user:${userName}`);
        }
        vm.tags = currentTags;
    }

    // ==========================================
    // RESOURCE QUOTAS & APPROVAL GATE LOGIC
    // ==========================================
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

        // 1. Kiểm tra môi trường STAGING / PROD
        const restrictedEnvVm = vms.find(v => (v.environment || "dev").toLowerCase() !== "dev");
        if (restrictedEnvVm) {
            needsApproval = true;
            approvalReason = "ENV_RESTRICTION";
            approvalDetails = `Developer '${userName}' yêu cầu triển khai trên môi trường ${restrictedEnvVm.environment?.toUpperCase()}. Môi trường STAGING/PROD bắt buộc phải qua Admin phê duyệt.`;
        }

        // 2. Kiểm tra vượt Quota
        if (totalVms > quota.maxVms || totalCores > quota.maxCores || totalMemoryMb > quota.maxMemoryMb) {
            needsApproval = true;
            approvalReason = "QUOTA_EXCEEDED";
            const quotaDetailsArr = [];
            if (totalVms > quota.maxVms) quotaDetailsArr.push(`VMs: ${totalVms}/${quota.maxVms}`);
            if (totalCores > quota.maxCores) quotaDetailsArr.push(`vCPUs: ${totalCores}/${quota.maxCores}`);
            if (totalMemoryMb > quota.maxMemoryMb) quotaDetailsArr.push(`RAM: ${Math.round(totalMemoryMb/1024)}GB/${Math.round(quota.maxMemoryMb/1024)}GB`);
            
            approvalDetails = `Yêu cầu vượt hạn mức Quota cho phép của Developer (${quotaDetailsArr.join(", ")}). Cần Admin xem xét và cấp phép.`;
        }
    }

    // Nếu cần phê duyệt ➔ Đưa vào Hàng Đợi Chờ Duyệt (Approval Queue)
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
            details: `Yêu cầu tạo ${vms.length} VM được gửi vào hàng đợi chờ Admin duyệt. Lý do: ${approvalDetails}`
        });

        broadcastLog(`\n[APPROVAL QUEUE] ⏳ Người dùng '${userName}' đã gửi yêu cầu khởi tạo ${vms.length} VM [${vms.map(v => v.name).join(", ")}]. Trạng thái: Chờ Admin phê duyệt.`);

        return res.json({
            success: true,
            requiresApproval: true,
            message: `⏳ Yêu cầu khởi tạo đã được gửi đến Quản Trị Viên (Admin) để phê duyệt do ${approvalReason === "ENV_RESTRICTION" ? "triển khai trên STAGING/PROD" : "vượt định mức tài nguyên (Quota)"}.`,
            data: {
                requestId: newRequest.id,
                status: "PENDING",
                reason: approvalReason,
                details: approvalDetails,
                vms: vms.map(v => v.name)
            }
        });
    }

    // Nếu không cần duyệt (Admin hoặc Developer hợp lệ trong quota & DEV env) ➔ Khởi tạo ngay
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

    // Chạy tiến trình triển khai bất đồng bộ tuần tự
    executeVmDeployment(vms, { username: userName, role: userRole });

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
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập để thực hiện xóa máy ảo." });
    }
    const userRole = authUser.role;
    const userName = authUser.username;
    const { stackName } = req.params;
    const force = req.query.force === "true";

    // RBAC Check: Viewer chỉ được xem, không được xóa
    if (userRole === "viewer") {
        recordAuditLog({
            username: userName,
            role: userRole,
            action: "DELETE_VM_DENIED",
            target: stackName,
            status: "DENIED",
            details: `Viewer '${userName}' bị chặn quyền xóa stack '${stackName}'.`
        });
        return res.status(403).json({
            success: false,
            error: "[RBAC DENIED] Tài khoản Viewer không có quyền xóa máy ảo."
        });
    }

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

// Helper kiểm tra quyền thao tác trên VM (Developer chỉ được thao tác VM DEV)
async function checkVmPermission(node: string, vmid: string | number, authUser: { username: string; role: string }): Promise<{ allowed: boolean; reason?: string }> {
    if (authUser.role === "admin") return { allowed: true };
    if (authUser.role === "viewer") return { allowed: false, reason: "Tài khoản Viewer chỉ có quyền xem, không được phép thay đổi trạng thái hoặc điều khiển máy ảo." };

    if (authUser.role === "developer") {
        try {
            const config = await proxmoxClient.getVmConfig(node, Number(vmid));
            const tags = (config?.tags || "").toLowerCase();
            const description = (config?.description || "").toLowerCase();
            
            // Nếu VM gắn tag PROD hoặc STAGING thì cấm Developer can thiệp
            if (tags.includes("pro") || tags.includes("prod") || tags.includes("stag") || tags.includes("staging") ||
                description.includes("env: pro") || description.includes("env: stag")) {
                return { allowed: false, reason: `Máy ảo #${vmid} thuộc môi trường STAGING/PROD. Quyền Developer không được phép can thiệp máy chủ này.` };
            }
        } catch {}
    }

    return { allowed: true };
}

// 1. Thao tác nguồn VM (start, stop, shutdown, reset, reboot)
app.post("/api/nodes/:node/vms/:vmid/power", async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const userRole = authUser.role;
    const userName = authUser.username;
    const { node, vmid } = req.params;
    const { action } = req.body; // "start" | "stop" | "shutdown" | "reset" | "reboot"

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

        broadcastLog(`⚡ [POWER] [User: ${userName}] Đã gửi lệnh ${actionLabel} tới VM #${vmid} trên Node '${node}' (Task ID: ${task || 'OK'})`);
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
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    const userRole = authUser.role;
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
        broadcastLog(`📸 [SNAPSHOT] [User: ${userName}] Đang tạo snapshot '${snapname}' cho VM #${vmid} trên Node '${node}'...`);
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
