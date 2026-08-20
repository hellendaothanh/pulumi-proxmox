export type UserRole = "admin" | "developer" | "viewer";

export interface AuthUser {
    username: string;
    role: UserRole;
    displayName?: string;
    avatar?: string;
    provider?: string;
}

export interface SessionData {
    username: string;
    role: UserRole;
    displayName?: string;
    avatar?: string;
    loginTime: number;
}
