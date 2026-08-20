import { AuditLogEntry } from "../types";

export const auditLogs: AuditLogEntry[] = [
    {
        id: "init-0",
        timestamp: new Date().toISOString(),
        username: "system",
        role: "admin",
        action: "SYSTEM_INIT",
        target: "Core Subsystems",
        environment: "dev",
        status: "SUCCESS",
        details: "Authentication, Governance & Audit Logs subsystems initialized successfully."
    }
];

export function recordAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const log: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry
    };
    auditLogs.unshift(log);
    if (auditLogs.length > 500) {
        auditLogs.pop();
    }
    return log;
}

export function getAuditLogs(): AuditLogEntry[] {
    return auditLogs;
}
