import fetch from "node-fetch";
import https from "https";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { proxmoxClient } from "./proxmox-api";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

export interface AlertThresholds {
    storagePercent: number; // Mặc định 85%
    cpuPercent: number;     // Mặc định 85%
    ramPercent: number;     // Mặc định 85%
    checkIntervalSec: number; // Mặc định 30s
    enabled: boolean;
    telegramEnabled: boolean;
    telegramBotToken: string;
    telegramChatId: string;
    webhookEnabled: boolean;
    webhookUrl: string;
}

export interface ClusterAlert {
    id: string;
    type: "STORAGE_HIGH" | "CPU_HIGH" | "RAM_HIGH";
    severity: "WARNING" | "CRITICAL";
    title: string;
    message: string;
    node: string;
    resourceName: string;
    currentValue: number;
    thresholdValue: number;
    unit: string;
    timestamp: string;
    status: "ACTIVE" | "RESOLVED" | "DISMISSED";
    resolvedAt?: string;
}

class AlertService {
    private configPath = path.resolve(process.cwd(), "data", "alert-config.json");
    private historyPath = path.resolve(process.cwd(), "data", "alert-history.json");

    private thresholds: AlertThresholds = {
        storagePercent: 85,
        cpuPercent: 85,
        ramPercent: 85,
        checkIntervalSec: 30,
        enabled: true,
        telegramEnabled: false,
        telegramBotToken: process.env.ALERT_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "",
        telegramChatId: process.env.ALERT_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "",
        webhookEnabled: false,
        webhookUrl: process.env.ALERT_WEBHOOK_URL || "",
    };

    private activeAlerts: Map<string, ClusterAlert> = new Map();
    private alertHistory: ClusterAlert[] = [];
    private lastNotified: Map<string, number> = new Map();
    private checkTimer: NodeJS.Timeout | null = null;
    private logBroadcastCallback: ((log: string) => void) | null = null;
    private auditLoggerCallback: ((entry: any) => void) | null = null;

    constructor() {
        this.ensureDataDir();
        this.loadConfig();
        this.loadHistory();
    }

    private ensureDataDir() {
        const dataDir = path.dirname(this.configPath);
        if (!fs.existsSync(dataDir)) {
            try {
                fs.mkdirSync(dataDir, { recursive: true });
            } catch (err) {
                console.error("[AlertService] Không thể tạo thư mục data:", err);
            }
        }
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
                this.thresholds = { ...this.thresholds, ...data };
            }
            if (process.env.ALERT_STORAGE_THRESHOLD) {
                this.thresholds.storagePercent = Number(process.env.ALERT_STORAGE_THRESHOLD) || 85;
            }
            if (process.env.ALERT_CPU_THRESHOLD) {
                this.thresholds.cpuPercent = Number(process.env.ALERT_CPU_THRESHOLD) || 85;
            }
            if (process.env.ALERT_RAM_THRESHOLD) {
                this.thresholds.ramPercent = Number(process.env.ALERT_RAM_THRESHOLD) || 85;
            }
            if (process.env.ALERT_TELEGRAM_BOT_TOKEN) {
                this.thresholds.telegramBotToken = process.env.ALERT_TELEGRAM_BOT_TOKEN;
                this.thresholds.telegramEnabled = true;
            }
            if (process.env.ALERT_TELEGRAM_CHAT_ID) {
                this.thresholds.telegramChatId = process.env.ALERT_TELEGRAM_CHAT_ID;
            }
            if (process.env.ALERT_WEBHOOK_URL) {
                this.thresholds.webhookUrl = process.env.ALERT_WEBHOOK_URL;
                this.thresholds.webhookEnabled = true;
            }
        } catch (e) {
            console.warn("[AlertService] Không thể đọc alert-config.json, dùng cấu hình mặc định:", e);
        }
    }

    private saveConfig() {
        try {
            this.ensureDataDir();
            fs.writeFileSync(this.configPath, JSON.stringify(this.thresholds, null, 2), "utf-8");
        } catch (e) {
            console.error("[AlertService] Lỗi lưu alert-config.json:", e);
        }
    }

    private loadHistory() {
        try {
            if (fs.existsSync(this.historyPath)) {
                const data = JSON.parse(fs.readFileSync(this.historyPath, "utf-8"));
                if (Array.isArray(data)) {
                    this.alertHistory = data.slice(0, 100); // Giữ tối đa 100 sự kiện gần nhất
                }
            }
        } catch (e) {
            this.alertHistory = [];
        }
    }

    private saveHistory() {
        try {
            this.ensureDataDir();
            fs.writeFileSync(this.historyPath, JSON.stringify(this.alertHistory.slice(0, 100), null, 2), "utf-8");
        } catch (e) {
            console.error("[AlertService] Error saving alert-history.json:", e);
        }
    }

    public init(logCallback: (log: string) => void, auditCallback: (entry: any) => void) {
        this.logBroadcastCallback = logCallback;
        this.auditLoggerCallback = auditCallback;
        this.startBackgroundMonitoring();
    }

    public startBackgroundMonitoring() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }

        if (!this.thresholds.enabled) {
            console.log("[AlertService] Cluster Alerting is DISABLED.");
            return;
        }

        const intervalMs = Math.max(10, this.thresholds.checkIntervalSec || 30) * 1000;
        console.log(`[AlertService] Starting cluster resource monitoring (interval: ${intervalMs / 1000}s)...`);

        // Initial scan after 5 seconds
        setTimeout(() => {
            this.checkClusterMetrics().catch(() => {});
        }, 5000);

        this.checkTimer = setInterval(() => {
            this.checkClusterMetrics().catch(() => {});
        }, intervalMs);
    }

    public async checkClusterMetrics(): Promise<ClusterAlert[]> {
        if (!this.thresholds.enabled) return [];

        try {
            const nodes = await proxmoxClient.getClusterOverview();
            if (!Array.isArray(nodes) || nodes.length === 0) return [];

            const detectedAlertIds = new Set<string>();
            const newlyTriggered: ClusterAlert[] = [];

            for (const node of nodes) {
                const nodeName = node.node || "unknown";

                // 1. Kiểm tra CPU của Node
                const cpuUsage = Number(node.cpu ? (node.cpu * 100).toFixed(1) : 0);
                if (cpuUsage >= this.thresholds.cpuPercent) {
                    const alertKey = `cpu_${nodeName}`;
                    detectedAlertIds.add(alertKey);
                    const alert = this.registerAlert({
                        id: alertKey,
                        type: "CPU_HIGH",
                        severity: cpuUsage >= 95 ? "CRITICAL" : "WARNING",
                        title: `⚠️ Node '${nodeName}' CPU overload (${cpuUsage}%)`,
                        message: `CPU on node '${nodeName}' reached ${cpuUsage}%, exceeding threshold ${this.thresholds.cpuPercent}%. Please check workloads or scale horizontally!`,
                        node: nodeName,
                        resourceName: `CPU ${nodeName}`,
                        currentValue: cpuUsage,
                        thresholdValue: this.thresholds.cpuPercent,
                        unit: "%",
                    });
                    if (alert) newlyTriggered.push(alert);
                }

                // 2. Kiểm tra RAM của Node
                if (node.maxmem && node.mem) {
                    const ramUsage = Number(((node.mem / node.maxmem) * 100).toFixed(1));
                    if (ramUsage >= this.thresholds.ramPercent) {
                        const alertKey = `ram_${nodeName}`;
                        detectedAlertIds.add(alertKey);
                        const alert = this.registerAlert({
                            id: alertKey,
                            type: "RAM_HIGH",
                            severity: ramUsage >= 95 ? "CRITICAL" : "WARNING",
                            title: `🚨 Node '${nodeName}' RAM capacity critical (${ramUsage}%)`,
                            message: `RAM capacity on node '${nodeName}' is at ${ramUsage}%, exceeding threshold ${this.thresholds.ramPercent}%. Risk of Out-Of-Memory (OOM Killer)!`,
                            node: nodeName,
                            resourceName: `RAM ${nodeName}`,
                            currentValue: ramUsage,
                            thresholdValue: this.thresholds.ramPercent,
                            unit: "%",
                        });
                        if (alert) newlyTriggered.push(alert);
                    }
                }

                // 3. Kiểm tra các Storage Pools trên Node
                if (Array.isArray(node.storages)) {
                    for (const st of node.storages) {
                        if (st.total && st.used !== undefined) {
                            const storageUsage = Number(((st.used / st.total) * 100).toFixed(1));
                            if (storageUsage >= this.thresholds.storagePercent) {
                                const alertKey = `storage_${nodeName}_${st.storage}`;
                                detectedAlertIds.add(alertKey);
                                const alert = this.registerAlert({
                                    id: alertKey,
                                    type: "STORAGE_HIGH",
                                    severity: storageUsage >= 95 ? "CRITICAL" : "WARNING",
                                    title: `💾 Storage Pool '${st.storage}' (${nodeName}) exceeds threshold (${storageUsage}%)`,
                                    message: `Storage pool '${st.storage}' on node '${nodeName}' is at ${storageUsage}%, exceeding threshold of ${this.thresholds.storagePercent}%. Recommended to clean up old snapshots or expand LUN/ZFS storage!`,
                                    node: nodeName,
                                    resourceName: `${st.storage} (${st.type})`,
                                    currentValue: storageUsage,
                                    thresholdValue: this.thresholds.storagePercent,
                                    unit: "%",
                                });
                                if (alert) newlyTriggered.push(alert);
                            }
                        }
                    }
                }
            }

            // 4. Giải phóng các alert đã hồi phục (Resolved)
            for (const [alertId, alert] of this.activeAlerts.entries()) {
                if (!detectedAlertIds.has(alertId) && alert.status === "ACTIVE") {
                    this.resolveAlert(alertId);
                }
            }

            return newlyTriggered;
        } catch (e: any) {
            console.error("[AlertService] Error scanning cluster resources:", e.message);
            return [];
        }
    }

    private registerAlert(data: Omit<ClusterAlert, "timestamp" | "status">): ClusterAlert | null {
        const now = new Date().toISOString();
        const existing = this.activeAlerts.get(data.id);

        if (existing) {
            // Cập nhật giá trị runtime mới nhất
            existing.currentValue = data.currentValue;
            existing.severity = data.severity;

            // Kiểm tra cooldown thông báo (không spam quá 10 phút/lần cho cùng 1 cảnh báo chưa giải quyết)
            const lastTime = this.lastNotified.get(data.id) || 0;
            const cooldownMs = 10 * 60 * 1000;
            if (Date.now() - lastTime > cooldownMs) {
                this.dispatchNotification(existing, false);
                this.lastNotified.set(data.id, Date.now());
            }
            return null;
        }

        const newAlert: ClusterAlert = {
            ...data,
            timestamp: now,
            status: "ACTIVE",
        };

        this.activeAlerts.set(data.id, newAlert);
        this.alertHistory.unshift(newAlert);
        this.saveHistory();

        this.lastNotified.set(data.id, Date.now());
        this.dispatchNotification(newAlert, false);

        // Ghi Audit Log
        if (this.auditLoggerCallback) {
            this.auditLoggerCallback({
                id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: now,
                username: "System-Alert-Engine",
                role: "admin",
                action: "CLUSTER_RESOURCE_ALERT",
                target: `${data.resourceName} (${data.currentValue}${data.unit})`,
                status: data.severity === "CRITICAL" ? "DENIED" : "FAILED",
                details: `[VƯỢT NGƯỠNG] ${data.title} - ${data.message}`,
            });
        }

        return newAlert;
    }

    private resolveAlert(alertId: string) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) return;

        alert.status = "RESOLVED";
        alert.resolvedAt = new Date().toISOString();
        this.activeAlerts.delete(alertId);

        // Cập nhật lại trong history
        const histItem = this.alertHistory.find(h => h.id === alertId && h.status === "ACTIVE");
        if (histItem) {
            histItem.status = "RESOLVED";
            histItem.resolvedAt = alert.resolvedAt;
        }
        this.saveHistory();

        this.dispatchNotification(alert, true);

        // Ghi Audit Log phục hồi
        if (this.auditLoggerCallback) {
            this.auditLoggerCallback({
                id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: alert.resolvedAt,
                username: "System-Alert-Engine",
                role: "admin",
                action: "CLUSTER_RESOURCE_RESOLVED",
                target: `${alert.resourceName}`,
                status: "SUCCESS",
                details: `[ĐÃ PHỤC HỒI] Tài nguyên ${alert.resourceName} trên node ${alert.node} đã trở lại mức bình thường.`,
            });
        }
    }

    public async dispatchNotification(alert: ClusterAlert, isResolved: boolean = false) {
        const title = isResolved ? `✅ [RESOLVED] ${alert.title.replace(/^[⚠️🚨💾\s]+/, "")}` : alert.title;
        const logMsg = `[Cluster Alert] ${title} | Value: ${alert.currentValue}${alert.unit} (Threshold: ${alert.thresholdValue}${alert.unit})`;

        if (this.logBroadcastCallback) {
            this.logBroadcastCallback(logMsg);
        }

        // Gửi Telegram Bot
        if (this.thresholds.telegramEnabled && this.thresholds.telegramBotToken && this.thresholds.telegramChatId) {
            await this.sendTelegramMessage(alert, isResolved);
        }

        // Gửi Webhook (Discord / Slack / Generic)
        if (this.thresholds.webhookEnabled && this.thresholds.webhookUrl) {
            await this.sendWebhookPayload(alert, isResolved);
        }
    }

    public async sendTelegramMessage(alert: ClusterAlert, isResolved: boolean): Promise<boolean> {
        try {
            const botToken = this.thresholds.telegramBotToken;
            const chatId = this.thresholds.telegramChatId;
            if (!botToken || !chatId) return false;

            const icon = isResolved ? "✅" : (alert.severity === "CRITICAL" ? "🚨" : "⚠️");
            const header = isResolved 
                ? `<b>${icon} [PROXMOX ALERT RESOLVED]</b>` 
                : `<b>${icon} [PROXMOX CLUSTER ALERT] - ${alert.severity}</b>`;

            const text = `${header}\n\n`
                + `<b>Tài nguyên:</b> <code>${alert.resourceName}</code>\n`
                + `<b>Node:</b> <code>${alert.node}</code>\n`
                + `<b>Mức sử dụng:</b> <code>${alert.currentValue}${alert.unit}</code> (Ngưỡng: ${alert.thresholdValue}${alert.unit})\n`
                + `<b>Chi tiết:</b> ${alert.message}\n`
                + `<b>Thời gian:</b> ${new Date().toLocaleString("vi-VN")}\n\n`
                + `<i>Proxmox Cluster Explorer & DevSecOps Platform</i>`;

            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: "HTML",
                }),
                agent: httpsAgent as any,
            });

            const data: any = await res.json();
            return !!data.ok;
        } catch (e: any) {
            console.error("[AlertService] Error sending Telegram message:", e.message);
            return false;
        }
    }

    public async sendWebhookPayload(alert: ClusterAlert, isResolved: boolean): Promise<boolean> {
        try {
            const webhookUrl = this.thresholds.webhookUrl;
            if (!webhookUrl) return false;

            const color = isResolved ? 0x22c55e : (alert.severity === "CRITICAL" ? 0xef4444 : 0xf59e0b);
            const title = isResolved ? `✅ [RESOLVED] ${alert.title}` : `🚨 [CLUSTER ALERT] ${alert.title}`;

            // Discord / Slack compatible payload
            const payload: any = {
                content: `${title} - Node: ${alert.node} (${alert.currentValue}${alert.unit})`,
                username: "Proxmox Cluster AlertBot",
                embeds: [
                    {
                        title: title,
                        description: alert.message,
                        color: color,
                        fields: [
                            { name: "Node", value: alert.node, inline: true },
                            { name: "Resource", value: alert.resourceName, inline: true },
                            { name: "Current Value", value: `${alert.currentValue}${alert.unit}`, inline: true },
                            { name: "Threshold", value: `${alert.thresholdValue}${alert.unit}`, inline: true },
                            { name: "Status", value: isResolved ? "RESOLVED" : alert.status, inline: true },
                            { name: "Timestamp", value: new Date().toLocaleString("en-US"), inline: true },
                        ],
                        footer: { text: "Proxmox Cluster Explorer & Pulumi IaC Platform" },
                        timestamp: new Date().toISOString(),
                    }
                ]
            };

            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                agent: httpsAgent as any,
            });

            return res.ok;
        } catch (e: any) {
            console.error("[AlertService] Error sending Webhook payload:", e.message);
            return false;
        }
    }

    public async sendTestAlert(): Promise<{ telegramSuccess: boolean; webhookSuccess: boolean; details: string }> {
        const testAlert: ClusterAlert = {
            id: `test_${Date.now()}`,
            type: "STORAGE_HIGH",
            severity: "WARNING",
            title: "🔔 [TEST] Test Notification from Proxmox Alert Engine",
            message: "This is a test notification verifying that Telegram Bot and Webhook channels are configured and operating properly.",
            node: "pve-node01",
            resourceName: "local-lvm (Storage Pool)",
            currentValue: 88.5,
            thresholdValue: 85.0,
            unit: "%",
            timestamp: new Date().toISOString(),
            status: "ACTIVE",
        };

        let telegramSuccess = false;
        let webhookSuccess = false;
        if (this.thresholds.telegramBotToken && this.thresholds.telegramChatId) {
            telegramSuccess = await this.sendTelegramMessage(testAlert, false);
        }

        if (this.thresholds.webhookUrl) {
            webhookSuccess = await this.sendWebhookPayload(testAlert, false);
        }

        if (this.logBroadcastCallback) {
            this.logBroadcastCallback(`[Cluster Alert] 🔔 Sent Test Alert to ${telegramSuccess ? 'Telegram (OK)' : 'Telegram (N/A)'} | ${webhookSuccess ? 'Webhook (OK)' : 'Webhook (N/A)'}`);
        }

        return {
            telegramSuccess,
            webhookSuccess,
            details: `Telegram: ${telegramSuccess ? 'Thành công' : 'Chưa cấu hình hoặc lỗi'} | Webhook: ${webhookSuccess ? 'Thành công' : 'Chưa cấu hình hoặc lỗi'}`
        };
    }

    public getStatus() {
        return {
            thresholds: this.thresholds,
            activeAlerts: Array.from(this.activeAlerts.values()),
            recentHistory: this.alertHistory.slice(0, 30),
            activeCount: this.activeAlerts.size,
        };
    }

    public updateConfig(newConfig: Partial<AlertThresholds>) {
        this.thresholds = {
            ...this.thresholds,
            ...newConfig,
        };
        this.saveConfig();
        this.startBackgroundMonitoring();
        return this.thresholds;
    }

    public dismissAlert(alertId: string) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.status = "DISMISSED";
            this.activeAlerts.delete(alertId);
            this.saveHistory();
            return true;
        }
        return false;
    }
}

export const alertService = new AlertService();
