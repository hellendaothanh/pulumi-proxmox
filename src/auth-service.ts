import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export type UserRole = "admin" | "developer" | "viewer";
export type AuthProviderType = "oidc" | "google" | "github" | "local";

export interface AuthenticatedUser {
    id: string;
    username: string;
    email?: string;
    displayName: string;
    role: UserRole;
    avatar: string;
    provider: AuthProviderType;
    providerName?: string;
    groups?: string[];
    loginTime: number;
}

export interface AuthProviderInfo {
    id: AuthProviderType;
    name: string;
    enabled: boolean;
    icon: string;
    description: string;
    loginUrl?: string;
}

export interface SsoConfig {
    // General
    portalBaseUrl: string;
    sessionSecret: string;

    // OIDC / Keycloak / Authelia
    oidcEnabled: boolean;
    oidcName: string;
    oidcIssuerUrl: string;
    oidcClientId: string;
    oidcClientSecret: string;
    oidcScopes: string;
    oidcGroupClaim: string;
    oidcAdminGroups: string[];
    oidcDevGroups: string[];

    // Google Workspace OAuth
    googleEnabled: boolean;
    googleClientId: string;
    googleClientSecret: string;
    googleAllowedDomains: string[];
    googleAdminEmails: string[];
    googleDevEmails: string[];

    // GitHub OAuth
    githubEnabled: boolean;
    githubClientId: string;
    githubClientSecret: string;
    githubAllowedOrgs: string[];
    githubAdminTeams: string[];
    githubDevTeams: string[];

    // Local Break-Glass
    localEnabled: boolean;
    adminUsername: string;
    adminPassword: string;
    devUsername?: string;
    devPassword?: string;
    viewerUsername?: string;
    viewerPassword?: string;
}

class AuthService {
    private config: SsoConfig;
    private activeSessions = new Map<string, AuthenticatedUser>();
    private pendingStates = new Map<string, { provider: AuthProviderType; timestamp: number; returnUrl?: string }>();
    private oidcMetadataCache: Record<string, any> = {};

    constructor() {
        this.config = this.loadConfig();
        // Dọn dẹp session và state cũ định kỳ mỗi 15 phút
        setInterval(() => this.cleanupExpiredStates(), 15 * 60 * 1000);
    }

    public reloadConfig() {
        this.config = this.loadConfig();
    }

    private loadConfig(): SsoConfig {
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

        const parseList = (val?: string): string[] => {
            if (!val) return [];
            return val.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
        };

        return {
            portalBaseUrl: process.env.PORTAL_BASE_URL || "http://localhost:3000",
            sessionSecret: process.env.SESSION_SECRET || "proxmox-portal-sso-secret-2026",

            // OIDC
            oidcEnabled: process.env.OIDC_ENABLED === "true" || process.env.OIDC_ENABLED === "1",
            oidcName: process.env.OIDC_NAME || "Keycloak / OIDC SSO",
            oidcIssuerUrl: (process.env.OIDC_ISSUER_URL || "").replace(/\/+$/, ""),
            oidcClientId: process.env.OIDC_CLIENT_ID || "",
            oidcClientSecret: process.env.OIDC_CLIENT_SECRET || "",
            oidcScopes: process.env.OIDC_SCOPES || "openid profile email groups",
            oidcGroupClaim: process.env.OIDC_GROUP_CLAIM || "groups",
            oidcAdminGroups: parseList(process.env.OIDC_ADMIN_GROUPS),
            oidcDevGroups: parseList(process.env.OIDC_DEV_GROUPS),

            // Google
            googleEnabled: process.env.GOOGLE_OAUTH_ENABLED === "true" || process.env.GOOGLE_OAUTH_ENABLED === "1",
            googleClientId: process.env.GOOGLE_CLIENT_ID || "",
            googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            googleAllowedDomains: parseList(process.env.GOOGLE_ALLOWED_DOMAINS),
            googleAdminEmails: parseList(process.env.GOOGLE_ADMIN_EMAILS).map(e => e.toLowerCase()),
            googleDevEmails: parseList(process.env.GOOGLE_DEV_EMAILS).map(e => e.toLowerCase()),

            // GitHub
            githubEnabled: process.env.GITHUB_OAUTH_ENABLED === "true" || process.env.GITHUB_OAUTH_ENABLED === "1",
            githubClientId: process.env.GITHUB_CLIENT_ID || "",
            githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            githubAllowedOrgs: parseList(process.env.GITHUB_ALLOWED_ORGS),
            githubAdminTeams: parseList(process.env.GITHUB_ADMIN_TEAMS),
            githubDevTeams: parseList(process.env.GITHUB_DEV_TEAMS),

            // Local Break-Glass
            localEnabled: process.env.AUTH_LOCAL_ENABLED !== "false",
            adminUsername: process.env.AUTH_ADMIN_USERNAME || "admin",
            adminPassword: process.env.AUTH_ADMIN_PASSWORD || "admin123",
            devUsername: process.env.AUTH_DEV_USERNAME || "dev",
            devPassword: process.env.AUTH_DEV_PASSWORD || "dev123",
            viewerUsername: process.env.AUTH_VIEWER_USERNAME || "viewer",
            viewerPassword: process.env.AUTH_VIEWER_PASSWORD || "viewer123",
        };
    }

    private cleanupExpiredStates() {
        const now = Date.now();
        const stateTtl = 10 * 60 * 1000; // 10 minutes
        for (const [state, info] of this.pendingStates.entries()) {
            if (now - info.timestamp > stateTtl) {
                this.pendingStates.delete(state);
            }
        }
    }

    // ==========================================
    // PROVIDER LIST & DISCOVERY
    // ==========================================
    public getEnabledProviders(): AuthProviderInfo[] {
        const providers: AuthProviderInfo[] = [];

        if (this.config.googleEnabled && this.config.googleClientId) {
            providers.push({
                id: "google",
                name: "Google Workspace",
                enabled: true,
                icon: "google",
                description: "Đăng nhập bằng tài khoản Google Workspace công ty",
                loginUrl: "/api/auth/login/google"
            });
        }

        if (this.config.githubEnabled && this.config.githubClientId) {
            providers.push({
                id: "github",
                name: "GitHub Enterprise / SSO",
                enabled: true,
                icon: "github",
                description: "Đăng nhập bằng tài khoản GitHub qua Tổ chức (Organization)",
                loginUrl: "/api/auth/login/github"
            });
        }

        if (this.config.oidcEnabled && this.config.oidcIssuerUrl && this.config.oidcClientId) {
            providers.push({
                id: "oidc",
                name: this.config.oidcName || "Keycloak / OIDC",
                enabled: true,
                icon: "keycloak",
                description: "Xác thực tập trung qua OpenID Connect (Keycloak, Authelia, Okta)",
                loginUrl: "/api/auth/login/oidc"
            });
        }

        // Local Break-Glass
        if (this.config.localEnabled) {
            providers.push({
                id: "local",
                name: "Tài Khoản Nội Bộ (Break-glass)",
                enabled: true,
                icon: "shield",
                description: "Đăng nhập trực tiếp bằng tài khoản quản trị cục bộ"
            });
        }

        return providers;
    }

    // ==========================================
    // OIDC DISCOVERY & HELPERS
    // ==========================================
    private async getOidcEndpoints() {
        if (this.oidcMetadataCache[this.config.oidcIssuerUrl]) {
            return this.oidcMetadataCache[this.config.oidcIssuerUrl];
        }

        const wellKnownUrl = `${this.config.oidcIssuerUrl}/.well-known/openid-configuration`;
        try {
            const res = await fetch(wellKnownUrl, { signal: AbortSignal.timeout(6000) });
            if (!res.ok) throw new Error(`OIDC Discovery failed with status ${res.status}`);
            const data = await res.json();
            this.oidcMetadataCache[this.config.oidcIssuerUrl] = data;
            return data;
        } catch (e: any) {
            // Fallback endpoints chuẩn của Keycloak / Authelia
            return {
                authorization_endpoint: `${this.config.oidcIssuerUrl}/protocol/openid-connect/auth`,
                token_endpoint: `${this.config.oidcIssuerUrl}/protocol/openid-connect/token`,
                userinfo_endpoint: `${this.config.oidcIssuerUrl}/protocol/openid-connect/userinfo`,
            };
        }
    }

    // ==========================================
    // LOGIN URL GENERATOR (AUTHORIZATION CODE FLOW)
    // ==========================================
    public async generateLoginUrl(provider: AuthProviderType, returnUrl: string = "/"): Promise<string> {
        const state = crypto.randomBytes(24).toString("hex");
        this.pendingStates.set(state, {
            provider,
            timestamp: Date.now(),
            returnUrl,
        });

        const redirectUri = `${this.config.portalBaseUrl.replace(/\/+$/, "")}/api/auth/callback/${provider}`;

        if (provider === "google") {
            if (!this.config.googleEnabled || !this.config.googleClientId) {
                throw new Error("Google Workspace OAuth chưa được bật hoặc thiếu Client ID.");
            }
            const params = new URLSearchParams({
                client_id: this.config.googleClientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: "openid profile email",
                state,
                access_type: "online",
                prompt: "select_account",
            });
            if (this.config.googleAllowedDomains.length === 1) {
                params.set("hd", this.config.googleAllowedDomains[0]);
            }
            return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        }

        if (provider === "github") {
            if (!this.config.githubEnabled || !this.config.githubClientId) {
                throw new Error("GitHub OAuth chưa được bật hoặc thiếu Client ID.");
            }
            const params = new URLSearchParams({
                client_id: this.config.githubClientId,
                redirect_uri: redirectUri,
                scope: "read:user user:email read:org",
                state,
            });
            return `https://github.com/login/oauth/authorize?${params.toString()}`;
        }

        if (provider === "oidc") {
            if (!this.config.oidcEnabled || !this.config.oidcIssuerUrl || !this.config.oidcClientId) {
                throw new Error("OIDC / Keycloak chưa được bật hoặc thiếu Issuer / Client ID.");
            }
            const endpoints = await this.getOidcEndpoints();
            const authEndpoint = endpoints.authorization_endpoint || `${this.config.oidcIssuerUrl}/protocol/openid-connect/auth`;
            const params = new URLSearchParams({
                client_id: this.config.oidcClientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: this.config.oidcScopes,
                state,
            });
            return `${authEndpoint}?${params.toString()}`;
        }

        throw new Error(`Nhà cung cấp xác thực '${provider}' không hỗ trợ luồng OAuth2.`);
    }

    // ==========================================
    // CALLBACK & TOKEN EXCHANGE HANDLER
    // ==========================================
    public async handleCallback(provider: AuthProviderType, code: string, state: string): Promise<{ token: string; user: AuthenticatedUser; returnUrl: string }> {
        const stateInfo = this.pendingStates.get(state);
        if (!stateInfo || stateInfo.provider !== provider) {
            throw new Error("Mã trạng thái bảo mật (State CSRF) không hợp lệ hoặc đã hết hạn.");
        }
        this.pendingStates.delete(state);

        const redirectUri = `${this.config.portalBaseUrl.replace(/\/+$/, "")}/api/auth/callback/${provider}`;
        let user: AuthenticatedUser;

        if (provider === "google") {
            user = await this.handleGoogleCallback(code, redirectUri);
        } else if (provider === "github") {
            user = await this.handleGitHubCallback(code, redirectUri);
        } else if (provider === "oidc") {
            user = await this.handleOidcCallback(code, redirectUri);
        } else {
            throw new Error(`Provider ${provider} không hỗ trợ callback.`);
        }

        // Tạo Session Token
        const sessionToken = `sso_${crypto.randomBytes(32).toString("hex")}`;
        this.activeSessions.set(sessionToken, user);

        return {
            token: sessionToken,
            user,
            returnUrl: stateInfo.returnUrl || "/",
        };
    }

    // 1. Google OAuth2 Callback
    private async handleGoogleCallback(code: string, redirectUri: string): Promise<AuthenticatedUser> {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: this.config.googleClientId,
                client_secret: this.config.googleClientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new Error(`Google Token Exchange thất bại: ${err}`);
        }

        const tokenData = await tokenRes.json();
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userRes.ok) throw new Error("Không thể lấy thông tin UserInfo từ Google.");
        const profile = await userRes.json();

        const email = (profile.email || "").toLowerCase();
        const domain = email.includes("@") ? email.split("@")[1] : "";

        // Kiểm tra Allowed Domains nếu có
        if (this.config.googleAllowedDomains.length > 0 && !this.config.googleAllowedDomains.includes(domain)) {
            throw new Error(`[TRUY CẬP BỊ TỪ CHỐI] Miền email '@${domain}' không nằm trong danh sách cho phép.`);
        }

        // Role Mapping
        let role: UserRole = "viewer";
        if (this.config.googleAdminEmails.includes(email)) {
            role = "admin";
        } else if (this.config.googleDevEmails.includes(email)) {
            role = "developer";
        } else if (this.config.googleAllowedDomains.includes(domain)) {
            // Mặc định nhân viên cùng domain là Developer nếu không có cấu hình chặt
            role = "developer";
        }

        return {
            id: `google_${profile.sub}`,
            username: email.split("@")[0] || profile.name || "google_user",
            email,
            displayName: profile.name || email,
            role,
            avatar: profile.picture || "user",
            provider: "google",
            providerName: "Google Workspace",
            loginTime: Date.now(),
        };
    }

    // 2. GitHub OAuth Callback
    private async handleGitHubCallback(code: string, redirectUri: string): Promise<AuthenticatedUser> {
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: this.config.githubClientId,
                client_secret: this.config.githubClientSecret,
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`GitHub OAuth Error: ${tokenData.error_description || tokenData.error}`);

        const accessToken = tokenData.access_token;
        const [userRes, orgsRes] = await Promise.all([
            fetch("https://api.github.com/user", {
                headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Proxmox-Portal-SSO" },
            }),
            fetch("https://api.github.com/user/orgs", {
                headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Proxmox-Portal-SSO" },
            }),
        ]);

        if (!userRes.ok) throw new Error("Không thể lấy thông tin người dùng từ GitHub.");
        const profile = await userRes.json();
        const userOrgs = orgsRes.ok ? (await orgsRes.json()).map((o: any) => o.login) : [];

        // Kiểm tra Allowed Organizations
        if (this.config.githubAllowedOrgs.length > 0) {
            const hasOrg = this.config.githubAllowedOrgs.some(reqOrg => userOrgs.includes(reqOrg));
            if (!hasOrg) {
                throw new Error(`[TRUY CẬP BỊ TỪ CHỐI] Bạn không thuộc Organization được cấp phép (${this.config.githubAllowedOrgs.join(", ")}).`);
            }
        }

        // Role Mapping
        let role: UserRole = "viewer";
        const loginName = profile.login.toLowerCase();
        if (this.config.githubAdminTeams.includes(loginName) || this.config.githubAdminTeams.some(t => userOrgs.includes(t))) {
            role = "admin";
        } else if (this.config.githubDevTeams.includes(loginName) || this.config.githubDevTeams.some(t => userOrgs.includes(t)) || userOrgs.length > 0) {
            role = "developer";
        }

        return {
            id: `github_${profile.id}`,
            username: profile.login,
            email: profile.email || `${profile.login}@users.noreply.github.com`,
            displayName: profile.name || profile.login,
            role,
            avatar: profile.avatar_url || "github",
            provider: "github",
            providerName: "GitHub Enterprise",
            groups: userOrgs,
            loginTime: Date.now(),
        };
    }

    // 3. Generic OIDC (Keycloak / Authelia) Callback
    private async handleOidcCallback(code: string, redirectUri: string): Promise<AuthenticatedUser> {
        const endpoints = await this.getOidcEndpoints();
        const tokenEndpoint = endpoints.token_endpoint || `${this.config.oidcIssuerUrl}/protocol/openid-connect/token`;

        const bodyParams = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: this.config.oidcClientId,
            client_secret: this.config.oidcClientSecret,
        });

        const tokenRes = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: bodyParams,
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new Error(`OIDC Token Exchange thất bại: ${err}`);
        }

        const tokenData = await tokenRes.json();
        const userinfoEndpoint = endpoints.userinfo_endpoint || `${this.config.oidcIssuerUrl}/protocol/openid-connect/userinfo`;

        const userinfoRes = await fetch(userinfoEndpoint, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userinfoRes.ok) throw new Error("Không thể lấy UserInfo từ OIDC Provider.");
        const profile = await userinfoRes.json();

        // Trích xuất Groups / Roles claim từ Keycloak hoặc Authelia
        let groups: string[] = [];
        const groupClaimKey = this.config.oidcGroupClaim || "groups";
        if (Array.isArray(profile[groupClaimKey])) {
            groups = profile[groupClaimKey];
        } else if (profile.realm_access?.roles && Array.isArray(profile.realm_access.roles)) {
            groups = profile.realm_access.roles;
        } else if (typeof profile[groupClaimKey] === "string") {
            groups = profile[groupClaimKey].split(/[,;\s]+/);
        }

        // Role Mapping
        let role: UserRole = "viewer";
        const isAdmin = this.config.oidcAdminGroups.some(g => groups.includes(g));
        const isDev = this.config.oidcDevGroups.some(g => groups.includes(g));

        if (isAdmin) {
            role = "admin";
        } else if (isDev) {
            role = "developer";
        } else {
            // Kiểm tra claim role trực tiếp
            if (profile.role === "admin" || groups.includes("admin")) role = "admin";
            else if (profile.role === "developer" || groups.includes("developer")) role = "developer";
        }

        return {
            id: `oidc_${profile.sub}`,
            username: profile.preferred_username || profile.nickname || profile.email?.split("@")[0] || "oidc_user",
            email: profile.email,
            displayName: profile.name || profile.preferred_username || profile.email || "OIDC User",
            role,
            avatar: profile.picture || "keycloak",
            provider: "oidc",
            providerName: this.config.oidcName || "Keycloak SSO",
            groups,
            loginTime: Date.now(),
        };
    }

    // ==========================================
    // LOCAL BREAK-GLASS LOGIN
    // ==========================================
    public loginLocal(username: string, password: string): { token: string; user: AuthenticatedUser } {
        const cleanUser = username.trim();
        const cleanPass = password.trim();

        if (this.config.adminUsername && cleanUser === this.config.adminUsername && cleanPass === this.config.adminPassword) {
            const user: AuthenticatedUser = {
                id: "local_admin",
                username: cleanUser,
                displayName: "System Administrator (Break-glass)",
                role: "admin",
                avatar: "shield-check",
                provider: "local",
                providerName: "Local Break-glass",
                loginTime: Date.now(),
            };
            const token = `local_${crypto.randomBytes(32).toString("hex")}`;
            this.activeSessions.set(token, user);
            return { token, user };
        }

        if (this.config.devUsername && cleanUser === this.config.devUsername && cleanPass === this.config.devPassword) {
            const user: AuthenticatedUser = {
                id: "local_dev",
                username: cleanUser,
                displayName: "DevSecOps Engineer",
                role: "developer",
                avatar: "code-2",
                provider: "local",
                providerName: "Local Dev",
                loginTime: Date.now(),
            };
            const token = `local_${crypto.randomBytes(32).toString("hex")}`;
            this.activeSessions.set(token, user);
            return { token, user };
        }

        if (this.config.viewerUsername && cleanUser === this.config.viewerUsername && cleanPass === this.config.viewerPassword) {
            const user: AuthenticatedUser = {
                id: "local_viewer",
                username: cleanUser,
                displayName: "Cloud Monitor / Viewer",
                role: "viewer",
                avatar: "eye",
                provider: "local",
                providerName: "Local Viewer",
                loginTime: Date.now(),
            };
            const token = `local_${crypto.randomBytes(32).toString("hex")}`;
            this.activeSessions.set(token, user);
            return { token, user };
        }

        throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác.");
    }

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================
    public getUserByToken(token?: string): AuthenticatedUser | null {
        if (!token) return null;
        return this.activeSessions.get(token) || null;
    }

    public invalidateSession(token?: string): boolean {
        if (!token) return false;
        return this.activeSessions.delete(token);
    }
}

export const authService = new AuthService();
