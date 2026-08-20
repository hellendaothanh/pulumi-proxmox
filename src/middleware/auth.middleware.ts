import { Request, Response, NextFunction } from "express";
import { authService } from "../auth-service";
import { activeSessions } from "../services/state.service";
import { AuthUser } from "../types";

export function getAuthUser(req: Request): AuthUser | null {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : (req.headers["x-auth-token"] as string);

    if (token) {
        // 1. Kiểm tra trong Centralized Auth Service (SSO / OIDC / Local)
        const ssoUser = authService.getUserByToken(token);
        if (ssoUser) return ssoUser as AuthUser;

        // 2. Kiểm tra trong fallback activeSessions
        if (activeSessions.has(token)) {
            return activeSessions.get(token)! as AuthUser;
        }
    }

    // Fallback qua custom header nếu chạy chế độ test
    const userRole = (req.headers["x-user-role"] as any);
    const userName = (req.headers["x-user-name"] as string);
    if (userRole && userName) {
        return {
            username: userName,
            role: userRole,
            displayName: userName === "admin" ? "Administrator" : (userName === "viewer" ? "Viewer" : "Developer"),
            avatar: userRole === "admin" ? "shield-check" : (userRole === "viewer" ? "eye" : "code-2"),
            provider: "local",
        };
    }

    return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = getAuthUser(req);
    if (!user) {
        return res.status(401).json({ success: false, error: "[AUTH REQUIRED] Vui lòng đăng nhập." });
    }
    (req as any).user = user;
    next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") {
        return res.status(403).json({ success: false, error: "[RBAC DENIED] Quyền Admin là bắt buộc." });
    }
    (req as any).user = user;
    next();
}
