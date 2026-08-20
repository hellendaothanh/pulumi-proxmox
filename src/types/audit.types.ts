import { UserRole } from "./auth.types";
import { VmConfig } from "./vm.types";

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    username: string;
    role: UserRole;
    action: string;
    target?: string;
    environment?: string;
    status: "SUCCESS" | "DENIED" | "FAILED" | "PENDING_APPROVAL";
    details?: string;
}

export interface ApprovalRequest {
    id: string;
    createdAt: string;
    requestedBy: {
        username: string;
        role: UserRole;
        displayName: string;
    };
    reason: string;
    reasonDetails: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    resolvedAt?: string;
    resolvedBy?: string;
    rejectionReason?: string;
    vms: VmConfig[];
}
