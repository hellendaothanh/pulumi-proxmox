import { proxmoxClient } from "../proxmox-api";
import { AuthUser } from "../types";

export async function checkVmPermission(
    node: string, 
    vmid: string | number, 
    authUser: AuthUser
): Promise<{ allowed: boolean; reason?: string }> {
    if (authUser.role === "admin") return { allowed: true };
    if (authUser.role === "viewer") {
        return { 
            allowed: false, 
            reason: "Tài khoản Viewer chỉ có quyền xem, không được phép thay đổi trạng thái hoặc điều khiển máy ảo." 
        };
    }

    if (authUser.role === "developer") {
        try {
            const config = await proxmoxClient.getVmConfig(node, Number(vmid));
            const tags = (config?.tags || "").toLowerCase();
            const description = (config?.description || "").toLowerCase();
            
            // Nếu VM gắn tag PROD hoặc STAGING thì cấm Developer can thiệp
            if (tags.includes("pro") || tags.includes("prod") || tags.includes("stag") || tags.includes("staging") ||
                description.includes("env: pro") || description.includes("env: stag")) {
                return { 
                    allowed: false, 
                    reason: `Máy ảo #${vmid} thuộc môi trường STAGING/PROD. Quyền Developer không được phép can thiệp máy chủ này.` 
                };
            }
        } catch {}
    }

    return { allowed: true };
}
