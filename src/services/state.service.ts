import { SessionData, ApprovalRequest } from "../types";

export const activeSessions = new Map<string, SessionData>();
export const approvalRequests: ApprovalRequest[] = [];
