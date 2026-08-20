import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { authService, AuthProviderType } from "../auth-service";
import { activeSessions } from "../services/state.service";
import { recordAuditLog } from "../services/audit.service";
import { broadcastLog } from "../services/log-stream.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { UserRole } from "../types";

export const authRouter = Router();

interface UserAccount {
    username: string;
    password?: string;
    role: UserRole;
    displayName: string;
    avatar: string;
}

export function getUserAccounts(): Record<string, UserAccount> {
    const envPaths = [
        path.join(process.cwd(), ".env"),
        path.join(__dirname, "../../.env"),
        path.join(__dirname, "../.env"),
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

// 1. Lấy danh sách các Identity Providers (Google, GitHub, Keycloak, Local) đang bật
authRouter.get("/providers", (req: Request, res: Response) => {
    try {
        const providers = authService.getEnabledProviders();
        res.json({ success: true, data: providers });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Khởi tạo luồng OAuth2 / OIDC Authorization Code Flow
authRouter.get("/login/:provider", async (req: Request, res: Response) => {
    const provider = req.params.provider as AuthProviderType;
    const returnUrl = (req.query.returnUrl as string) || "/";

    try {
        const authUrl = await authService.generateLoginUrl(provider, returnUrl);
        if (req.headers.accept?.includes("application/json")) {
            return res.json({ success: true, authUrl });
        }
        res.redirect(authUrl);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 3. Tiếp nhận OAuth2 / OIDC Callback & Trao đổi Token
authRouter.get("/callback/:provider", async (req: Request, res: Response) => {
    const provider = req.params.provider as AuthProviderType;
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;
    const errorDesc = req.query.error_description as string;

    if (error) {
        return res.redirect(`/?auth_error=${encodeURIComponent(errorDesc || error)}`);
    }

    if (!code || !state) {
        return res.redirect(`/?auth_error=${encodeURIComponent("Thiếu mã ủy quyền (Code) hoặc State CSRF.")}`);
    }

    try {
        const { token, user, returnUrl } = await authService.handleCallback(provider, code, state);

        recordAuditLog({
            username: user.username,
            role: user.role,
            action: "SSO_LOGIN",
            target: `IdP: ${user.providerName || provider}`,
            status: "SUCCESS",
            details: `Đăng nhập thành công qua ${user.providerName} (${user.email || user.username}) với vai trò ${user.role.toUpperCase()}`,
        });

        broadcastLog(`🔑 [SSO LOGIN] User '${user.displayName}' (${user.email || user.username}) signed in via ${user.providerName} [${user.role.toUpperCase()}]`);

        const cleanReturnUrl = returnUrl.startsWith("/") ? returnUrl : "/";
        const redirectUrl = `${cleanReturnUrl}${cleanReturnUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`;
        res.redirect(redirectUrl);
    } catch (err: any) {
        recordAuditLog({
            username: "unknown",
            role: "viewer",
            action: "SSO_LOGIN_FAILED",
            target: `IdP: ${provider}`,
            status: "FAILED",
            details: `Thất bại khi đăng nhập qua ${provider}: ${err.message}`,
        });
        res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
    }
});

// 4. Đăng nhập người dùng (Local Break-glass Login)
authRouter.post("/login", (req: Request, res: Response) => {
    const rawUsername = String(req.body.username || "").trim();
    const rawPassword = String(req.body.password || "").trim();

    try {
        const result = authService.loginLocal(rawUsername, rawPassword);
        recordAuditLog({
            username: result.user.username,
            role: result.user.role,
            action: "USER_LOGIN",
            target: "Portal Local",
            status: "SUCCESS",
            details: `Đăng nhập thành công qua tài khoản nội bộ: ${result.user.role.toUpperCase()}`
        });
        broadcastLog(`🔑 [LOCAL LOGIN] User '${result.user.username}' (${result.user.role.toUpperCase()}) signed in successfully.`);
        return res.json({ success: true, data: result });
    } catch (errAuth: any) {
        const users = getUserAccounts();
        const user = users[rawUsername];
        const expectedPassword = user ? String(user.password || "").trim().replace(/^["']|["']$/g, "") : "";
        const cleanRawPassword = rawPassword.replace(/^["']|["']$/g, "");

        if (user && expectedPassword === cleanRawPassword) {
            const token = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
                target: "Portal Local",
                status: "SUCCESS",
                details: `Đăng nhập thành công với vai trò ${user.role.toUpperCase()}`
            });

            return res.json({
                success: true,
                data: {
                    token,
                    user: {
                        username: user.username,
                        role: user.role,
                        displayName: user.displayName,
                        avatar: user.avatar,
                        provider: "local",
                    }
                }
            });
        }

        recordAuditLog({
            username: rawUsername || "unknown",
            role: "viewer",
            action: "LOGIN_FAILED",
            target: "Auth Service",
            status: "FAILED",
            details: `Thất bại khi đăng nhập với tài khoản '${rawUsername}'. Sai tên đăng nhập hoặc mật khẩu.`
        });

        return res.status(401).json({
            success: false,
            error: `Tên đăng nhập hoặc mật khẩu không chính xác.`
        });
    }
});

// 5. Lấy thông tin user hiện tại qua Session Token
authRouter.get("/me", (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
        return res.status(401).json({ success: false, error: "Chưa đăng nhập hoặc phiên làm việc đã hết hạn." });
    }

    res.json({
        success: true,
        data: {
            id: (authUser as any).id,
            username: authUser.username,
            email: (authUser as any).email,
            role: authUser.role,
            displayName: authUser.displayName,
            avatar: authUser.avatar,
            provider: (authUser as any).provider || "local",
            providerName: (authUser as any).providerName,
            groups: (authUser as any).groups || [],
        }
    });
});

// 6. Đăng xuất (Logout)
authRouter.post("/logout", (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : (req.headers["x-auth-token"] as string);

    if (token) {
        const user = authService.getUserByToken(token) || activeSessions.get(token);
        authService.invalidateSession(token);
        activeSessions.delete(token);

        if (user) {
            recordAuditLog({
                username: user.username,
                role: user.role as UserRole,
                action: "USER_LOGOUT",
                target: "Portal UI",
                status: "SUCCESS",
                details: `Người dùng '${user.username}' đã đăng xuất an toàn khỏi hệ thống.`
            });
        }
    }

    res.json({ success: true, message: "Signed out successfully." });
});

// 7. Đổi mật khẩu phiên hiện tại
authRouter.post("/change-password", (req: Request, res: Response) => {
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

    try {
        const envPath = path.join(process.cwd(), ".env");
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

    res.json({ success: true, message: "Password changed successfully! New password saved to .env." });
});
